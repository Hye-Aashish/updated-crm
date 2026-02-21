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
    const [fileData, setFileData] = useState({
        name: '',
        url: '',
        type: 'pdf'
    })

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        try {
            const response = await api.post('/files', {
                ...fileData,
                projectId: project.id,
                size: Math.floor(Math.random() * 5000000) + 1000000, // Mock size 1-6MB
            })

            addFile({
                id: response.data._id || response.data.id,
                ...response.data,
                uploadedAt: new Date(),
            })

            toast({
                title: "File Added",
                description: "The important file has been associated with this project.",
            })
            setFileData({ name: '', url: '', type: 'pdf' })
            onOpenChange(false)
        } catch (error) {
            console.error(error)
            toast({
                title: "Error",
                description: "Failed to add file.",
                variant: "destructive"
            })
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <form onSubmit={handleSave}>
                    <DialogHeader>
                        <DialogTitle>Add Important Project File</DialogTitle>
                        <DialogDescription>
                            Upload or link essential documents for {project.name}.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="name">File Name</Label>
                            <Input
                                id="name"
                                placeholder="e.g. Project Specs, Contract..."
                                value={fileData.name}
                                onChange={(e) => setFileData(prev => ({ ...prev, name: e.target.value }))}
                                required
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="url">File URL / Source</Label>
                            <Input
                                id="url"
                                placeholder="https://docs.google.com/..."
                                value={fileData.url}
                                onChange={(e) => setFileData(prev => ({ ...prev, url: e.target.value }))}
                                required
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="type">File Type</Label>
                            <Input
                                id="type"
                                placeholder="pdf, docx, link..."
                                value={fileData.type}
                                onChange={(e) => setFileData(prev => ({ ...prev, type: e.target.value }))}
                                required
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? 'Saving...' : 'Add File'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
