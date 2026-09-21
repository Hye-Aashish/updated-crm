import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Calendar } from 'lucide-react'
import api from '@/lib/api-client'
import { useToast } from '@/hooks/use-toast'
import { mapProject } from '@/lib/mappers'
import type { Project } from '@/types'

interface ProjectTimelineDatesDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    project: Project
    onSuccess: (updatedProject: Project) => void
}

export function ProjectTimelineDatesDialog({
    open,
    onOpenChange,
    project,
    onSuccess
}: ProjectTimelineDatesDialogProps) {
    const { toast } = useToast()
    const [loading, setLoading] = useState(false)

    const [startDate, setStartDate] = useState('')
    const [deadline, setDeadline] = useState('')

    useEffect(() => {
        if (open) {
            setStartDate(
                project.startDate && !isNaN(new Date(project.startDate).getTime())
                    ? new Date(project.startDate).toISOString().split('T')[0]
                    : ''
            )
            setDeadline(
                project.deadline && !isNaN(new Date(project.deadline).getTime())
                    ? new Date(project.deadline).toISOString().split('T')[0]
                    : ''
            )
        }
    }, [open, project])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!deadline) return

        setLoading(true)
        const pId = project.id || (project as any)._id

        try {
            const res = await api.put(`/projects/${pId}`, {
                startDate: startDate ? new Date(startDate) : undefined,
                deadline: new Date(deadline),
                dueDate: new Date(deadline)
            })

            const updated = mapProject(res.data)

            toast({
                title: 'Timeline Dates Updated! 📅',
                description: `Project deadline set to ${new Date(deadline).toLocaleDateString()}.`
            })

            onOpenChange(false)
            onSuccess(updated)
        } catch (error: any) {
            console.error('Failed to update timeline dates', error)
            toast({
                title: 'Error',
                description: error.response?.data?.message || 'Failed to update timeline dates.',
                variant: 'destructive'
            })
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[450px] font-sans">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle className="text-lg font-bold flex items-center gap-2">
                            <Calendar className="h-5 w-5 text-primary" /> Manage Project Timeline Dates
                        </DialogTitle>
                        <DialogDescription className="text-xs font-medium">
                            Set or extend the overall project start date and target completion deadline.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 py-4 text-xs font-medium">
                        <div className="space-y-1.5">
                            <Label className="font-bold">Project Start Date</Label>
                            <Input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="h-9 text-xs font-semibold"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label className="font-bold">Project Completion Deadline <span className="text-red-500">*</span></Label>
                            <Input
                                type="date"
                                value={deadline}
                                onChange={(e) => setDeadline(e.target.value)}
                                required
                                className="h-9 text-xs font-bold"
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="h-9 text-xs font-bold">
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading || !deadline} className="h-9 text-xs font-bold">
                            {loading ? 'Updating Dates...' : 'Update Timeline'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
