import { useState, useEffect } from 'react'
import { useAppStore } from '@/store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Plus, Search, FileText, Image, FileIcon, User, HardDrive } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import api from '@/lib/api-client'
import { useToast } from '@/hooks/use-toast'
import { ProjectService } from '@/lib/services/project.service'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'

export function FilesPage() {
    const { files, setFiles, users, projects, setProjects, currentUser, addFile } = useAppStore()
    const { toast } = useToast()

    const [isUploadOpen, setIsUploadOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [file, setFile] = useState<File | null>(null)
    const [selectedProjectId, setSelectedProjectId] = useState('')
    const [fileName, setFileName] = useState('')
    const [searchQuery, setSearchQuery] = useState('')

    useEffect(() => {
        const fetchFilesAndProjects = async () => {
            try {
                if (files.length === 0) {
                    const res = await api.get('/files')
                    setFiles(res.data.map((f: any) => ({
                        id: f._id,
                        name: f.name,
                        type: f.type,
                        size: f.size,
                        url: f.url,
                        projectId: f.projectId,
                        clientId: f.clientId,
                        uploadedBy: f.uploadedBy,
                        uploadedAt: new Date(f.uploadedAt),
                    })))
                }
                if (projects.length === 0) {
                    const backendProjects = await ProjectService.getAll()
                    setProjects(backendProjects)
                }
            } catch (error) {
                console.error("Failed to fetch files/projects", error)
            }
        }
        fetchFilesAndProjects()
    }, [files.length, projects.length, setFiles, setProjects])

    const getFileIcon = (type: string) => {
        if (type.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(type.toLowerCase())) return Image
        if (type === 'pdf') return FileText
        return FileIcon
    }

    const formatSize = (bytes: number) => {
        if (!bytes || bytes === 0) return '0 B'
        const k = 1024
        const sizes = ['B', 'KB', 'MB', 'GB']
        const i = Math.floor(Math.log(bytes) / Math.log(k))
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
    }

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const selectedFile = e.target.files[0]
            setFile(selectedFile)
            if (!fileName) {
                setFileName(selectedFile.name)
            }
        }
    }

    const handleUploadSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!file) {
            toast({
                title: "No file selected",
                description: "Please choose a file to upload first.",
                variant: "destructive"
            })
            return
        }

        setLoading(true)
        try {
            const formData = new FormData()
            formData.append('file', file)

            // 1. Upload file binary
            const uploadRes = await api.post('/files/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            })

            // 2. Create file record (metadata)
            const fileData = {
                name: fileName || file.name,
                url: uploadRes.data.url,
                type: file.name.split('.').pop() || 'unknown',
                size: uploadRes.data.size,
                projectId: selectedProjectId || undefined,
            }

            const response = await api.post('/files', fileData)

            addFile({
                id: response.data._id || response.data.id,
                name: response.data.name,
                type: response.data.type,
                size: response.data.size,
                url: response.data.url,
                projectId: response.data.projectId,
                clientId: response.data.clientId,
                uploadedBy: response.data.uploadedBy,
                uploadedAt: response.data.uploadedAt ? new Date(response.data.uploadedAt) : new Date(),
            })

            toast({
                title: "File Uploaded",
                description: "File has been uploaded successfully.",
                variant: "success"
            })

            setIsUploadOpen(false)
            setFile(null)
            setFileName('')
            setSelectedProjectId('')
        } catch (error) {
            console.error(error)
            toast({
                title: "Upload Failed",
                description: "Failed to upload the file.",
                variant: "destructive"
            })
        } finally {
            setLoading(false)
        }
    }

    const allowedProjects = currentUser?.role === 'client'
        ? projects.filter(p => p.clientId === currentUser.clientId)
        : projects;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Files</h1>
                    <p className="text-muted-foreground mt-1">Manage project assets and documents</p>
                </div>
                <Button onClick={() => setIsUploadOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Upload File
                </Button>
            </div>

            <div className="flex items-center gap-4">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input 
                        placeholder="Search files..." 
                        className="pl-10" 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            {files.length === 0 ? (
                <div className="text-center py-12 bg-muted/20 rounded-lg border-2 border-dashed">
                    <HardDrive className="mx-auto h-12 w-12 text-muted-foreground/50" />
                    <h3 className="mt-4 text-lg font-semibold">No files uploaded</h3>
                    <p className="text-muted-foreground">Upload files to share with your team</p>
                </div>
            ) : (
                <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
                    {files
                        .filter(file => {
                            if (['owner', 'admin'].includes(currentUser?.role || '')) return true;
                            if (currentUser?.role === 'client') {
                                const isClientProject = file.projectId ? projects.some(p => p.id === file.projectId && p.clientId === currentUser.clientId) : false;
                                return file.clientId === currentUser.clientId || isClientProject;
                            }
                            return true; // Other roles
                        })
                        .filter(file => {
                            if (!searchQuery) return true;
                            return file.name.toLowerCase().includes(searchQuery.toLowerCase());
                        })
                        .map((file) => {
                            const Icon = getFileIcon(file.type)
                            const uploader = users.find(u => u.id === file.uploadedBy)
                            const project = projects.find(p => p.id === file.projectId)

                            return (
                                <Card 
                                    key={file.id} 
                                    className="cursor-pointer hover:shadow-md transition-all group"
                                    onClick={() => window.open(file.url, '_blank')}
                                >
                                    <CardContent className="p-4 space-y-3">
                                        <div className="aspect-square bg-muted/30 rounded-lg flex items-center justify-center relative overflow-hidden">
                                            {file.type.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(file.type.toLowerCase()) ? (
                                                <img 
                                                    src={file.url} 
                                                    alt={file.name} 
                                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform" 
                                                />
                                            ) : (
                                                <Icon className="h-12 w-12 text-muted-foreground group-hover:scale-110 transition-transform" />
                                            )}
                                        </div>

                                        <div>
                                            <h4 className="font-semibold truncate" title={file.name}>{file.name}</h4>
                                            <p className="text-xs text-muted-foreground truncate">{project?.name || 'General'}</p>
                                        </div>

                                        <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
                                            <span>{formatSize(file.size)}</span>
                                            <span>{formatDate(file.uploadedAt)}</span>
                                        </div>

                                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                            <User className="h-3 w-3" />
                                            <span>{uploader?.name || 'Unknown User'}</span>
                                        </div>
                                    </CardContent>
                                </Card>
                            )
                        })}
                </div>
            )}

            {/* Upload File Dialog */}
            <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <form onSubmit={handleUploadSubmit}>
                        <DialogHeader>
                            <DialogTitle>Upload File</DialogTitle>
                            <DialogDescription>
                                Upload a document or image to share with the team and clients.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label htmlFor="fileInput" className="font-semibold">Select File *</Label>
                                <Input
                                    id="fileInput"
                                    type="file"
                                    onChange={handleFileChange}
                                    required
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="fileName" className="font-semibold">Display Name</Label>
                                <Input
                                    id="fileName"
                                    placeholder="Enter custom file name"
                                    value={fileName}
                                    onChange={(e) => setFileName(e.target.value)}
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="projectSelect" className="font-semibold">Associate with Project *</Label>
                                <select
                                    id="projectSelect"
                                    className="w-full h-10 px-3 rounded-md border border-input bg-background"
                                    value={selectedProjectId}
                                    onChange={(e) => setSelectedProjectId(e.target.value)}
                                    required
                                >
                                    <option value="">Select Project</option>
                                    {allowedProjects.map(p => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsUploadOpen(false)}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" disabled={loading}>
                                {loading ? 'Uploading...' : 'Upload'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    )
}

export default FilesPage
