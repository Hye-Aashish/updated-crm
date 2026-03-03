import { useState } from 'react'
import { useAppStore } from '@/store'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import api from '@/lib/api-client'
import { useToast } from '@/hooks/use-toast'
import { Project } from '@/types'

interface ProjectFileDialogProps {
    project: Project
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function ProjectFileDialog({ project, open, onOpenChange }: ProjectFileDialogProps) {
    const { addFile } = useAppStore()
    const { toast } = useToast()
    const [loading, setLoading] = useState(false)
    const [mode, setMode] = useState<'upload' | 'link'>('upload')
    const [file, setFile] = useState<File | null>(null)
    const [fileData, setFileData] = useState({
        name: '',
        url: '',
        type: 'pdf'
    })

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const selectedFile = e.target.files[0]
            setFile(selectedFile)
            setFileData(prev => ({
                ...prev,
                name: selectedFile.name,
                type: selectedFile.name.split('.').pop() || 'pdf'
            }))
        }
    }

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        try {
            let finalUrl = fileData.url;
            let finalSize = Math.floor(Math.random() * 5000000) + 1000000;

            if (mode === 'upload' && file) {
                const formData = new FormData();
                formData.append('file', file);

                const uploadRes = await api.post('/files/upload', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });

                finalUrl = uploadRes.data.url;
                finalSize = uploadRes.data.size;
            }

            const response = await api.post('/files', {
                ...fileData,
                url: finalUrl,
                projectId: project.id,
                size: finalSize,
            })

            addFile({
                id: response.data._id || response.data.id,
                ...response.data,
                uploadedAt: new Date(),
            })

            toast({
                title: "File Added",
                description: mode === 'upload' ? "File uploaded and saved successfully." : "The external link has been associated with this project.",
            })
            setFileData({ name: '', url: '', type: 'pdf' })
            setFile(null)
            onOpenChange(false)
        } catch (error) {
            console.error(error)
            toast({
                title: "Error",
                description: "Failed to save file.",
                variant: "destructive"
            })
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px] rounded-[2rem] border-none shadow-2xl">
                <form onSubmit={handleSave}>
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-black text-gray-900 leading-tight">Add Project Document</DialogTitle>
                        <DialogDescription className="text-gray-500 font-medium">
                            Choose how you want to add this resource to <span className="text-blue-600 font-bold">{project.name}</span>.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex p-1 bg-gray-100 rounded-2xl mt-6 mb-6">
                        <button
                            type="button"
                            onClick={() => setMode('upload')}
                            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${mode === 'upload' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            Direct Upload
                        </button>
                        <button
                            type="button"
                            onClick={() => setMode('link')}
                            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${mode === 'link' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            External Link
                        </button>
                    </div>

                    <div className="grid gap-5 py-2">
                        <div className="grid gap-2">
                            <Label htmlFor="name" className="text-[10px] uppercase tracking-widest font-black text-gray-400 px-1">Display Name</Label>
                            <Input
                                id="name"
                                placeholder="e.g. Final Design Proposal"
                                className="h-12 rounded-2xl border-gray-100 bg-gray-50/50 focus-visible:ring-blue-600 focus-visible:bg-white transition-all shadow-none"
                                value={fileData.name}
                                onChange={(e) => setFileData(prev => ({ ...prev, name: e.target.value }))}
                                required
                            />
                        </div>

                        {mode === 'upload' ? (
                            <div className="grid gap-2">
                                <Label className="text-[10px] uppercase tracking-widest font-black text-gray-400 px-1">Select File</Label>
                                <div className="relative group">
                                    <Input
                                        type="file"
                                        className="h-20 rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50/50 hover:bg-white hover:border-blue-300 transition-all cursor-pointer file:hidden text-transparent"
                                        onChange={handleFileChange}
                                        required={!file}
                                    />
                                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none group-hover:scale-105 transition-transform">
                                        <p className="text-xs font-bold text-gray-600">{file ? file.name : 'Click to browse or drag & drop'}</p>
                                        <p className="text-[9px] text-gray-400 uppercase font-black mt-1">{file ? `${(file.size / 1024 / 1024).toFixed(2)} MB` : 'Max 50MB'}</p>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className="grid gap-2">
                                    <Label htmlFor="url" className="text-[10px] uppercase tracking-widest font-black text-gray-400 px-1">Source URL</Label>
                                    <Input
                                        id="url"
                                        placeholder="https://docs.google.com/..."
                                        className="h-12 rounded-2xl border-gray-100 bg-gray-50/50 focus-visible:ring-blue-600 focus-visible:bg-white transition-all shadow-none"
                                        value={fileData.url}
                                        onChange={(e) => setFileData(prev => ({ ...prev, url: e.target.value }))}
                                        required
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="type" className="text-[10px] uppercase tracking-widest font-black text-gray-400 px-1">Extension / Category</Label>
                                    <Input
                                        id="type"
                                        placeholder="pdf, docx, gdrive..."
                                        className="h-12 rounded-2xl border-gray-100 bg-gray-50/50 focus-visible:ring-blue-600 focus-visible:bg-white transition-all shadow-none capitalize"
                                        value={fileData.type}
                                        onChange={(e) => setFileData(prev => ({ ...prev, type: e.target.value }))}
                                        required
                                    />
                                </div>
                            </>
                        )}
                    </div>

                    <DialogFooter className="mt-8">
                        <Button
                            type="button"
                            variant="ghost"
                            className="rounded-xl font-bold text-gray-500 hover:bg-gray-100 shadow-none"
                            onClick={() => onOpenChange(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={loading}
                            className="h-12 px-8 rounded-xl bg-blue-600 hover:bg-blue-700 font-bold shadow-lg shadow-blue-500/20"
                        >
                            {loading ? (
                                <div className="flex items-center gap-2">
                                    <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    <span>{mode === 'upload' ? 'Uploading...' : 'Saving...'}</span>
                                </div>
                            ) : (
                                mode === 'upload' ? 'Upload Document' : 'Add Link'
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
