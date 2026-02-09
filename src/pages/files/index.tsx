import { useEffect } from 'react'
import { useAppStore } from '@/store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Plus, Search, FileText, Image, FileIcon, User, HardDrive } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import api from '@/lib/api-client'

export function FilesPage() {
    const { files, setFiles, users, projects } = useAppStore()

    useEffect(() => {
        const fetchFiles = async () => {
            if (files.length === 0) {
                try {
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
                } catch (error) {
                    console.error("Failed to fetch files", error)
                }
            }
        }
        fetchFiles()
    }, [files.length, setFiles])

    const getFileIcon = (type: string) => {
        if (type.startsWith('image/')) return Image
        if (type === 'pdf') return FileText
        return FileIcon
    }

    const formatSize = (bytes: number) => {
        if (bytes === 0) return '0 B'
        const k = 1024
        const sizes = ['B', 'KB', 'MB', 'GB']
        const i = Math.floor(Math.log(bytes) / Math.log(k))
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Files</h1>
                    <p className="text-muted-foreground mt-1">Manage project assets and documents</p>
                </div>
                <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Upload File
                </Button>
            </div>

            <div className="flex items-center gap-4">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input placeholder="Search files..." className="pl-10" />
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
                    {files.map((file) => {
                        const Icon = getFileIcon(file.type)
                        const uploader = users.find(u => u.id === file.uploadedBy)
                        const project = projects.find(p => p.id === file.projectId)

                        return (
                            <Card key={file.id} className="cursor-pointer hover:shadow-md transition-all group">
                                <CardContent className="p-4 space-y-3">
                                    <div className="aspect-square bg-muted/30 rounded-lg flex items-center justify-center relative overflow-hidden">
                                        <Icon className="h-12 w-12 text-muted-foreground group-hover:scale-110 transition-transform" />
                                    </div>

                                    <div>
                                        <h4 className="font-semibold truncate" title={file.name}>{file.name}</h4>
                                        <p className="text-xs text-muted-foreground truncate">{project?.name}</p>
                                    </div>

                                    <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
                                        <span>{formatSize(file.size)}</span>
                                        <span>{formatDate(file.uploadedAt)}</span>
                                    </div>

                                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                        <User className="h-3 w-3" />
                                        <span>{uploader?.name}</span>
                                    </div>
                                </CardContent>
                            </Card>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
