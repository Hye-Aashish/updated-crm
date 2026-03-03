import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { FileText, Trash2 } from 'lucide-react'
import { useAppStore } from '@/store'
import { useToast } from '@/hooks/use-toast'
import api from '@/lib/api-client'
import { Task, TaskPriority, TaskStatus } from '@/types'
import { mapTask } from '@/lib/mappers'

interface ProjectTaskDialogProps {
    projectId: string
    open: boolean
    onOpenChange: (open: boolean) => void
    task?: Task | null
}

export function ProjectTaskDialog({ projectId, open, onOpenChange, task }: ProjectTaskDialogProps) {
    const { toast } = useToast()
    const { users, addTask, updateTask: updateStoreTask } = useAppStore()
    const [loading, setLoading] = useState(false)

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        priority: 'medium' as TaskPriority,
        assigneeId: '',
        dueDate: '',
        attachments: [] as { name: string, fileType: string, data: string }[]
    })

    useEffect(() => {
        if (task) {
            setFormData({
                title: task.title,
                description: task.description || '',
                priority: task.priority,
                assigneeId: task.assigneeId,
                dueDate: task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '',
                attachments: task.attachments || []
            })
        } else {
            setFormData({
                title: '',
                description: '',
                priority: 'medium',
                assigneeId: users[0]?.id || '',
                dueDate: new Date().toISOString().split('T')[0],
                attachments: []
            })
        }
    }, [task, open, users])

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        if (file.size > 5 * 1024 * 1024) {
            toast({ variant: "destructive", title: "File too large", description: "File size must be less than 5MB" })
            return
        }

        const reader = new FileReader()
        reader.onloadend = () => {
            setFormData(prev => ({
                ...prev,
                attachments: [...prev.attachments, {
                    name: file.name,
                    fileType: file.type.startsWith('image/') ? 'image' : file.type.startsWith('video/') ? 'video' : 'other',
                    data: reader.result as string
                }]
            }))
        }
        reader.readAsDataURL(file)
    }

    const handleRemoveAttachment = (index: number) => {
        setFormData(prev => ({
            ...prev,
            attachments: prev.attachments.filter((_, i) => i !== index)
        }))
    }

    const handleSubmit = async () => {
        if (!formData.title) {
            toast({ variant: "destructive", title: "Error", description: "Task title is required" })
            return
        }

        setLoading(true)
        try {
            const taskData = {
                ...formData,
                projectId,
                dueDate: new Date(formData.dueDate),
                status: task ? task.status : 'todo' as TaskStatus
            }

            if (task) {
                const response = await api.put(`/tasks/${task.id}`, taskData)
                updateStoreTask(task.id, mapTask(response.data))
                toast({ title: "Task Updated", description: "Task has been updated successfully." })
            } else {
                const response = await api.post('/tasks', taskData)
                addTask(mapTask(response.data))
                toast({ title: "Task Created", description: "New task has been added to the project." })
            }
            onOpenChange(false)
        } catch (error: any) {
            console.error("Failed to save task", error)
            toast({
                variant: "destructive",
                title: "Error",
                description: error.response?.data?.message || "Failed to save task"
            })
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-xl">
                <DialogHeader>
                    <DialogTitle>{task ? 'Edit Task' : 'Add New Task'}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="task-title">Task Title *</Label>
                        <Input
                            id="task-title"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            placeholder="e.g., Design Homepage"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="task-description">Description</Label>
                        <textarea
                            id="task-description"
                            className="w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            placeholder="Describe what needs to be done..."
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="task-priority">Priority</Label>
                            <select
                                id="task-priority"
                                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                                value={formData.priority}
                                onChange={(e) => setFormData({ ...formData, priority: e.target.value as TaskPriority })}
                            >
                                <option value="low">Low</option>
                                <option value="medium">Medium</option>
                                <option value="high">High</option>
                                <option value="urgent">Urgent</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="task-dueDate">Due Date</Label>
                            <Input
                                id="task-dueDate"
                                type="date"
                                value={formData.dueDate}
                                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="task-assignee">Assignee</Label>
                        <select
                            id="task-assignee"
                            className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                            value={formData.assigneeId}
                            onChange={(e) => setFormData({ ...formData, assigneeId: e.target.value })}
                        >
                            <option value="">Select Assignee</option>
                            {users.map(u => (
                                <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-2">
                        <Label>Attachments</Label>
                        <div className="flex flex-col gap-3">
                            <Input
                                type="file"
                                onChange={handleFileChange}
                                className="cursor-pointer"
                                accept="image/*, application/pdf"
                            />

                            {formData.attachments.length > 0 && (
                                <div className="grid grid-cols-2 gap-2">
                                    {formData.attachments.map((att, idx) => (
                                        <div key={idx} className="flex items-center justify-between p-2 rounded-md border bg-muted/40 text-sm">
                                            <div className="flex items-center gap-2 overflow-hidden">
                                                <div className="w-8 h-8 rounded bg-background flex items-center justify-center flex-shrink-0">
                                                    {att.fileType === 'image' ? (
                                                        <img src={att.data} alt="preview" className="w-full h-full object-cover rounded" />
                                                    ) : (
                                                        <FileText className="h-4 w-4" />
                                                    )}
                                                </div>
                                                <span className="truncate max-w-[120px]" title={att.name}>{att.name}</span>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-6 w-6 text-destructive hover:bg-destructive/10"
                                                onClick={() => handleRemoveAttachment(idx)}
                                            >
                                                <Trash2 className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={loading}>
                        {loading ? 'Saving...' : task ? 'Update Task' : 'Add Task'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
