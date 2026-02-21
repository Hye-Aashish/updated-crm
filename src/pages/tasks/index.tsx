import { useState, useEffect } from 'react'
import { Plus, CheckCircle2, Circle, Clock, AlertTriangle, Calendar, CheckSquare, Settings, Trash2, LayoutGrid, List as ListIcon, ArrowUp, ArrowDown, Upload, FileText, User as UserIcon, Briefcase } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { useAppStore } from '@/store'
import { formatDate } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'
import api from '@/lib/api-client'
import { timeEntryService } from '@/lib/timeEntryService'

// Task Status Type
type TaskStatus = {
    id: string
    label: string
    color: string
}

// Initial Task Statuses
const INITIAL_STATUSES: TaskStatus[] = [
    { id: 'todo', label: 'To Do', color: 'bg-gray-500' },
    { id: 'in-progress', label: 'In Progress', color: 'bg-blue-500' },
    { id: 'review', label: 'Review', color: 'bg-yellow-500' },
    { id: 'client-approval', label: 'Client Approval', color: 'bg-indigo-500' },
    { id: 'done', label: 'Done', color: 'bg-green-500' },
]

// Color Options
const COLOR_OPTIONS = [
    { value: 'bg-gray-500', label: 'Gray' },
    { value: 'bg-blue-500', label: 'Blue' },
    { value: 'bg-green-500', label: 'Green' },
    { value: 'bg-yellow-500', label: 'Yellow' },
    { value: 'bg-red-500', label: 'Red' },
    { value: 'bg-purple-500', label: 'Purple' },
    { value: 'bg-pink-500', label: 'Pink' },
    { value: 'bg-orange-500', label: 'Orange' },
    { value: 'bg-indigo-500', label: 'Indigo' },
]

import { TaskBoardCardV2 } from '@/components/tasks/task-board-card-v2'

import { useSearchParams } from 'react-router-dom'

export function TasksPage() {
    const { toast } = useToast()
    const [searchParams, setSearchParams] = useSearchParams()
    const initialPriority = searchParams.get('priority') || 'all'
    const initialFilter = searchParams.get('filter') || 'all'

    const { tasks: storeTasks, users, projects, setTasks: setStoreTasks, setUsers, setProjects, addTask: addStoreTask, updateTask: updateStoreTask } = useAppStore()

    const [tasks, setTasks] = useState(storeTasks)
    const [statuses, setStatuses] = useState<TaskStatus[]>(INITIAL_STATUSES)
    const [view, setView] = useState<'list' | 'kanban'>('kanban')
    const [draggedTask, setDraggedTask] = useState<any>(null)
    const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false)
    const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false)
    const [selectedTask, setSelectedTask] = useState<any>(null)
    const [taskToDelete, setTaskToDelete] = useState<string | null>(null)
    const [searchQuery, setSearchQuery] = useState('')
    const [filterPriority, setFilterPriority] = useState<string>(initialPriority)
    const [filterProject, setFilterProject] = useState<string>('all')
    const [filterType, setFilterType] = useState<string>(initialFilter)

    // Client Approval State
    const [isClientApprovalDialogOpen, setIsClientApprovalDialogOpen] = useState(false)
    const [pendingApprovalTask, setPendingApprovalTask] = useState<any>(null)
    const [approvalNote, setApprovalNote] = useState('')
    const [approvalFile, setApprovalFile] = useState<{ name: string, data: string, type: string } | null>(null)

    const [newTask, setNewTask] = useState({
        title: '',
        description: '',
        priority: 'medium',
        dueDate: '',
        assigneeId: '',
        projectId: '',
        attachments: [] as { name: string, fileType: string, data: string }[]
    })
    const [newStatus, setNewStatus] = useState({
        label: '',
        color: 'bg-blue-500'
    })

    // Sync local state with store
    useEffect(() => {
        let filtered = storeTasks
        const now = new Date()
        now.setHours(0, 0, 0, 0)

        if (searchQuery) {
            filtered = filtered.filter((t: any) =>
                t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                t.description?.toLowerCase().includes(searchQuery.toLowerCase())
            )
        }

        if (filterPriority !== 'all') {
            filtered = filtered.filter((t: any) => t.priority === filterPriority)
        }

        if (filterProject !== 'all') {
            filtered = filtered.filter((t: any) => t.projectId === filterProject)
        }

        // Advanced Filter Type
        if (filterType === 'overdue') {
            filtered = filtered.filter(t => t.status !== 'done' && new Date(t.dueDate) < now)
        } else if (filterType === 'active') {
            filtered = filtered.filter(t => t.status !== 'done')
        } else if (filterType === 'today') {
            filtered = filtered.filter(t => {
                const d = new Date(t.dueDate)
                return d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
            })
        }

        setTasks(filtered)
        // Keep searchParams in sync for refreshes if needed, but for now we just read
        if (searchParams.get('filter') !== filterType) {
            // setSearchParams({ filter: filterType, priority: filterPriority }, { replace: true })
        }
    }, [storeTasks, searchQuery, filterPriority, filterProject, filterType])

    // Fetch Data
    useEffect(() => {
        const fetchData = async () => {
            if (storeTasks.length === 0 || users.length === 0 || projects.length === 0) {
                try {
                    const [tasksRes, usersRes, projectsRes] = await Promise.all([
                        storeTasks.length === 0 ? api.get('/tasks') : Promise.resolve({ data: null }),
                        users.length === 0 ? api.get('/users') : Promise.resolve({ data: null }),
                        projects.length === 0 ? api.get('/projects') : Promise.resolve({ data: null })
                    ])

                    if (tasksRes.data) {
                        const backendTasks = tasksRes.data.map((t: any) => ({
                            id: t._id,
                            title: t.title,
                            description: t.description,
                            projectId: t.projectId,
                            status: t.status,
                            priority: t.priority,
                            assigneeId: t.assigneeId,
                            dueDate: new Date(t.dueDate),
                            estimatedHours: t.estimatedHours || 0,
                            labels: t.labels || [],
                            checklist: t.checklist || [],
                            createdAt: new Date(t.createdAt),
                            updatedAt: new Date(t.updatedAt),
                            attachments: t.attachments || [],
                            // Timer attributes
                            isTimerRunning: t.isTimerRunning,
                            lastStartTime: t.lastStartTime,
                            totalTimeSpent: t.totalTimeSpent,
                            timeEntryId: t.timeEntryId
                        }))
                        setStoreTasks(backendTasks)
                    }

                    if (usersRes?.data) {
                        setUsers(usersRes.data.map((u: any) => ({
                            id: u._id,
                            name: u.name,
                            email: u.email,
                            role: u.role,
                            phone: u.phone,
                        })))
                    }

                    if (projectsRes?.data) {
                        setProjects(projectsRes.data.map((p: any) => ({
                            id: p._id,
                            name: p.name,
                            description: p.description,
                            status: p.status,
                            dueDate: new Date(p.dueDate),
                            budget: p.budget,
                            clientId: p.clientId,
                            createdAt: new Date(p.createdAt),
                            updatedAt: new Date(p.createdAt),
                            milestones: [],
                            pmId: p.pmId || 'u2',
                            type: p.type || 'web-development',
                            paymentModel: p.paymentModel || 'milestone'
                        })))
                    }
                } catch (error) {
                    console.error("Failed to fetch task data", error)
                }
            }
        }
        fetchData()
    }, [storeTasks.length, users.length, projects.length, setStoreTasks, setUsers, setProjects])

    // --- KPI Calculations ---
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const totalTasks = tasks.length
    const pendingTasks = tasks.filter(t => t.status !== 'done').length
    const tasksDueToday = tasks.filter(t => {
        if (t.status === 'done') return false
        const d = new Date(t.dueDate)
        return d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear()
    }).length
    const overdueTasks = tasks.filter(t => {
        if (t.status === 'done') return false
        return new Date(t.dueDate) < today
    }).length

    // --- KPI Card ---
    const StatsCard = ({ title, value, icon: Icon, color, bg }: any) => (
        <Card className="border-l-4 shadow-sm" style={{ borderLeftColor: color }}>
            <CardContent className="p-4 flex items-center justify-between">
                <div>
                    <p className="text-sm font-medium text-muted-foreground">{title}</p>
                    <h3 className="text-2xl font-bold mt-1">{value}</h3>
                </div>
                <div className={`p-2 rounded-lg ${bg}`}>
                    <Icon className="h-5 w-5" style={{ color: color }} />
                </div>
            </CardContent>
        </Card>
    )

    // Drag & Drop Handlers
    const handleDragStart = (task: any) => {
        setDraggedTask(task)
    }

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault()
    }

    const handleDrop = async (targetStatus: string) => {
        if (!draggedTask) return

        // Intercept Client Approval Move
        if (targetStatus === 'client-approval' && draggedTask.status !== 'client-approval') {
            setPendingApprovalTask({ task: draggedTask, targetStatus })
            setIsClientApprovalDialogOpen(true)
            return
        }

        const now = Date.now()
        let updates: any = { status: targetStatus }
        let timeEntryId: string | null = draggedTask.timeEntryId || null

        // Timer Logic with Backend Integration
        if (targetStatus === 'in-progress' && draggedTask.status === 'todo') {
            // Start Timer - Create time entry in backend
            try {
                const userId = draggedTask.assigneeId || users[0]?.id
                const projectId = draggedTask.projectId || projects[0]?.id

                const timeEntry = await timeEntryService.startTimer(
                    userId,
                    projectId,
                    draggedTask.id,
                    `Working on: ${draggedTask.title}`
                )

                updates.isTimerRunning = true
                updates.lastStartTime = now
                updates.timeEntryId = timeEntry._id
                timeEntryId = timeEntry._id

                toast({
                    title: 'TIMER STARTED',
                    description: `Time tracking started for "${draggedTask.title}"`,
                    variant: 'success'
                })
            } catch (error: any) {
                console.error('Failed to start timer:', error)
                toast({
                    title: 'TASK ERROR',
                    description: error.response?.data?.message || error.message || "Failed to start timer",
                    variant: 'destructive'
                })
            }
        } else if (targetStatus === 'done') {
            // Stop Timer - Update time entry in backend
            if (draggedTask.isTimerRunning && timeEntryId) {
                try {
                    await timeEntryService.stopTimer(
                        timeEntryId,
                        `Completed: ${draggedTask.title}`
                    )

                    const elapsed = now - (draggedTask.lastStartTime || now)
                    updates.isTimerRunning = false
                    updates.totalTimeSpent = (draggedTask.totalTimeSpent || 0) + elapsed
                    updates.lastStartTime = null

                    toast({
                        title: 'TIMER STOPPED',
                        description: `Time entry saved for "${draggedTask.title}"`,
                        variant: 'success'
                    })
                } catch (error: any) {
                    console.error('Failed to stop timer:', error)
                    toast({
                        title: 'TASK ERROR',
                        description: error.response?.data?.message || error.message || "Failed to stop timer",
                        variant: 'destructive'
                    })
                }
            }
        } else if (draggedTask.isTimerRunning && targetStatus !== 'in-progress') {
            // Pause Timer (if moved out of in-progress to anything other than done, e.g. review)
            if (timeEntryId) {
                try {
                    await timeEntryService.stopTimer(
                        timeEntryId,
                        `Paused: ${draggedTask.title}`
                    )

                    const elapsed = now - (draggedTask.lastStartTime || now)
                    updates.isTimerRunning = false
                    updates.totalTimeSpent = (draggedTask.totalTimeSpent || 0) + elapsed
                    updates.lastStartTime = null

                    toast({
                        title: 'TIMER PAUSED',
                        description: `Time tracking paused for "${draggedTask.title}"`,
                        variant: 'success'
                    })
                } catch (error) {
                    console.error('Failed to pause timer:', error)
                }
            }
        } else if (targetStatus === 'in-progress' && !draggedTask.isTimerRunning && draggedTask.status !== 'in-progress') {
            // Resume Timer (if moved back to in-progress) - Create new time entry
            try {
                const userId = draggedTask.assigneeId || users[0]?.id
                const projectId = draggedTask.projectId || projects[0]?.id

                const timeEntry = await timeEntryService.startTimer(
                    userId,
                    projectId,
                    draggedTask.id,
                    `Resumed: ${draggedTask.title}`
                )

                updates.isTimerRunning = true
                updates.lastStartTime = now
                updates.timeEntryId = timeEntry._id

                toast({
                    title: 'TIMER RESUMED',
                    description: `Time tracking resumed for "${draggedTask.title}"`,
                    variant: 'success'
                })
            } catch (error: any) {
                console.error('Failed to resume timer:', error)
                toast({
                    title: 'TASK ERROR',
                    description: error.response?.data?.message || error.message || "Failed to resume timer",
                    variant: 'destructive'
                })
            }
        }

        // Capture original state for reversal
        const originalTasks = [...tasks];

        // Update Local immediately (Optimistic)
        const updatedTasks = tasks.map(task =>
            task.id === draggedTask.id
                ? { ...task, ...updates }
                : task
        )
        setTasks(updatedTasks)
        setStoreTasks(updatedTasks)

        // Update Backend
        try {
            await api.put(`/tasks/${draggedTask.id}`, updates)
            toast({
                title: 'UPDATE SUCCESS',
                description: 'Task status updated successfully.',
                variant: 'success'
            })
        } catch (error: any) {
            console.error("Failed to update status", error)
            toast({
                variant: 'destructive',
                title: 'UPDATE FAILED',
                description: error.response?.data?.message || error.message || "Failed to update task"
            })

            // Revert local state on failure
            setTasks(originalTasks)
            setStoreTasks(originalTasks)
        }

        setDraggedTask(null)
    }

    // Handle Client Approval Submission
    const handleApprovalFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        if (file.size > 5 * 1024 * 1024) {
            toast({ variant: "destructive", title: "File too large", description: "File size must be less than 5MB" })
            return
        }

        const reader = new FileReader()
        reader.onloadend = () => {
            setApprovalFile({
                name: file.name,
                type: file.type.startsWith('image/') ? 'image' : 'other',
                data: reader.result as string
            })
        }
        reader.readAsDataURL(file)
    }

    const submitClientApproval = async () => {
        if (!pendingApprovalTask) return

        const { task, targetStatus } = pendingApprovalTask
        const updates: any = {
            status: targetStatus,
            description: approvalNote ? `${task.description || ''}\n\n[Client Approval Note]: ${approvalNote}` : task.description
        }

        // Attach file if exists
        if (approvalFile) {
            const newAttachment = {
                name: approvalFile.name,
                fileType: approvalFile.type,
                data: approvalFile.data
            }
            updates.attachments = [...(task.attachments || []), newAttachment]
        }

        // Optimistic Update
        const updatedTasks = tasks.map(t =>
            t.id === task.id
                ? { ...t, ...updates }
                : t
        )
        setTasks(updatedTasks)
        setStoreTasks(updatedTasks)

        try {
            await api.put(`/tasks/${task.id}`, updates)
            toast({
                title: "APPROVAL SENT",
                description: "Task moved to Client Approval.",
                variant: 'success'
            })
        } catch (error: any) {
            console.error("Failed to update status", error)
            toast({
                variant: "destructive",
                title: "APPROVAL FAILED",
                description: error.response?.data?.message || error.message || "Failed to update task."
            })
        }

        // Reset
        setIsClientApprovalDialogOpen(false)
        setPendingApprovalTask(null)
        setApprovalNote('')
        setApprovalFile(null)
        setDraggedTask(null)
    }

    // Handle File Attachment
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        // Simple validation
        if (file.size > 5 * 1024 * 1024) { // 5MB limit
            toast({ variant: "destructive", title: "File too large", description: "File size must be less than 5MB" })
            return
        }

        const reader = new FileReader()
        reader.onloadend = () => {
            setNewTask(prev => ({
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
        setNewTask(prev => ({
            ...prev,
            attachments: prev.attachments.filter((_, i) => i !== index)
        }))
    }


    // Update Task
    const handleUpdateTask = async () => {
        if (!selectedTask || !selectedTask.title) return

        try {
            const taskData = {
                title: selectedTask.title,
                description: selectedTask.description,
                status: selectedTask.status,
                priority: selectedTask.priority,
                assigneeId: selectedTask.assigneeId,
                projectId: selectedTask.projectId,
                dueDate: selectedTask.dueDate,
                estimatedHours: selectedTask.estimatedHours
            }

            await api.put(`/tasks/${selectedTask.id}`, taskData)

            updateStoreTask(selectedTask.id, taskData)
            // useEffect will sync to local tasks if needed, but updateStoreTask should trigger it

            toast({
                title: 'UPDATE SUCCESS',
                description: 'Task updated successfully',
                variant: 'success'
            })
            setSelectedTask(null)
        } catch (error: any) {
            console.error("Failed to update task", error)
            toast({
                variant: 'destructive',
                title: 'UPDATE FAILED',
                description: error.response?.data?.message || error.message || 'Failed to save changes'
            })
        }
    }

    // Add New Task
    const handleAddTask = async () => {
        if (!newTask.title) return

        try {
            const taskData = {
                title: newTask.title,
                description: newTask.description,
                projectId: newTask.projectId || projects[0]?.id || '',
                status: 'todo',
                priority: newTask.priority,
                assigneeId: newTask.assigneeId || users[0]?.id || '',
                dueDate: newTask.dueDate ? new Date(newTask.dueDate) : new Date(),
                attachments: newTask.attachments
            }

            if (!taskData.projectId) {
                toast({ variant: "destructive", title: "Error", description: "Please select a project first." })
                return
            }

            const response = await api.post('/tasks', taskData)
            const savedTask = response.data

            const frontendTask = {
                id: savedTask._id,
                title: savedTask.title,
                description: savedTask.description,
                projectId: savedTask.projectId,
                status: savedTask.status as any,
                priority: savedTask.priority as any,
                assigneeId: savedTask.assigneeId,
                dueDate: new Date(savedTask.dueDate),
                estimatedHours: 0,
                labels: [],
                checklist: [],
                createdAt: new Date(savedTask.createdAt),
                updatedAt: new Date(savedTask.updatedAt),
                attachments: savedTask.attachments || []
            }

            addStoreTask(frontendTask)
            setNewTask({ title: '', description: '', priority: 'medium', dueDate: '', assigneeId: '', projectId: '', attachments: [] })
            setIsTaskDialogOpen(false)
            toast({
                title: 'CREATION SUCCESS',
                description: 'Task created successfully',
                variant: 'success'
            })
        } catch (error: any) {
            console.error("Failed to create task", error)
            toast({
                variant: 'destructive',
                title: 'CREATION FAILED',
                description: error.response?.data?.message || error.message || 'Check your fields'
            })
        }
    }

    // Delete Task
    const handleDeleteTask = (taskId: string) => {
        setTaskToDelete(taskId)
    }

    const confirmDeleteTask = async () => {
        if (!taskToDelete) return
        try {
            await api.delete(`/tasks/${taskToDelete}`)
            const updatedTasks = tasks.filter(t => t.id !== taskToDelete)
            setTasks(updatedTasks)
            setStoreTasks(updatedTasks)
            toast({ title: "Task deleted", description: "The task has been permanently removed." })
        } catch (error) {
            console.error("Failed to delete task", error)
            toast({ variant: "destructive", title: "Failed to delete task", description: "Please try again." })
        } finally {
            setTaskToDelete(null)
        }
    }

    // Add New Status
    const handleAddStatus = () => {
        if (!newStatus.label) return

        const status: TaskStatus = {
            id: newStatus.label.toLowerCase().replace(/\s+/g, '-'),
            label: newStatus.label,
            color: newStatus.color
        }

        setStatuses([...statuses, status])
        setNewStatus({ label: '', color: 'bg-blue-500' })
        setIsStatusDialogOpen(false)
    }

    const handleDeleteStatus = (statusId: string) => {
        if (statuses.length <= 1) {
            toast({ variant: "destructive", title: "Cannot delete status", description: "At least one status is required!" })
            return
        }

        setTasks(prevTasks =>
            prevTasks.map(task =>
                task.status === statusId
                    ? { ...task, status: statuses[0].id as any }
                    : task
            )
        )

        setStatuses(statuses.filter(s => s.id !== statusId))
    }

    // Move Status
    const handleMoveStatus = (index: number, direction: 'up' | 'down') => {
        if (direction === 'up' && index === 0) return
        if (direction === 'down' && index === statuses.length - 1) return

        const newStatuses = [...statuses]
        const targetIndex = direction === 'up' ? index - 1 : index + 1

        // Swap with temp variable
        const temp = newStatuses[index]
        newStatuses[index] = newStatuses[targetIndex]
        newStatuses[targetIndex] = temp

        setStatuses(newStatuses)
    }

    // Get selected task details helper


    return (
        <div className="space-y-4 h-[calc(100vh-100px)] flex flex-col w-full overflow-hidden">
            {/* Compact Header */}
            <div className="flex flex-col md:flex-row items-start md:items-center gap-4 flex-shrink-0">
                {/* Title */}
                <div className="flex-shrink-0 animate-in fade-in slide-in-from-left-4 duration-500">
                    <h1 className="text-2xl font-bold tracking-tight">Tasks</h1>
                    <p className="text-sm text-muted-foreground">Manage work with Kanban or List views.</p>
                </div>

                <div className="flex flex-wrap items-center gap-2 w-full md:w-auto md:ml-auto justify-start md:justify-end">
                    {/* Filter Type */}
                    <select
                        className={`h-9 px-3 rounded-md border text-sm flex-1 min-w-[140px] md:flex-none md:w-32 ${filterType !== 'all' ? 'border-primary bg-primary/5 font-bold' : 'border-input bg-background'}`}
                        value={filterType}
                        onChange={(e) => {
                            setFilterType(e.target.value)
                            setSearchParams({ filter: e.target.value, priority: filterPriority })
                        }}
                    >
                        <option value="all">All Tasks</option>
                        <option value="active">Active</option>
                        <option value="overdue">Overdue</option>
                        <option value="today">Due Today</option>
                    </select>

                    {/* Filters */}
                    <select
                        className="h-9 px-3 rounded-md border border-input bg-background text-sm flex-1 min-w-[140px] md:flex-none md:w-32"
                        value={filterPriority}
                        onChange={(e) => {
                            setFilterPriority(e.target.value)
                            setSearchParams({ filter: filterType, priority: e.target.value })
                        }}
                    >
                        <option value="all">All Priorities</option>
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="urgent">Urgent</option>
                    </select>

                    <select
                        className="h-9 px-3 rounded-md border border-input bg-background text-sm flex-1 min-w-[140px] md:flex-none md:w-36"
                        value={filterProject}
                        onChange={(e) => setFilterProject(e.target.value)}
                    >
                        <option value="all">All Projects</option>
                        {projects.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                    </select>

                    {(filterType !== 'all' || filterPriority !== 'all' || filterProject !== 'all' || searchQuery) && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-9 px-2 text-muted-foreground hover:text-foreground"
                            onClick={() => {
                                setFilterType('all')
                                setFilterPriority('all')
                                setFilterProject('all')
                                setSearchQuery('')
                                setSearchParams({})
                            }}
                        >
                            Clear
                        </Button>
                    )}

                    {/* View Toggle */}
                    <div className="flex bg-muted rounded-md p-0.5">
                        <Button
                            variant={view === 'kanban' ? 'secondary' : 'ghost'}
                            size="sm"
                            className="h-8 px-3"
                            onClick={() => setView('kanban')}
                        >
                            <LayoutGrid className="h-4 w-4" />
                        </Button>
                        <Button
                            variant={view === 'list' ? 'secondary' : 'ghost'}
                            size="sm"
                            className="h-8 px-3"
                            onClick={() => setView('list')}
                        >
                            <ListIcon className="h-4 w-4" />
                        </Button>
                    </div>

                    {/* Manage Statuses Button */}
                    {view === 'kanban' && (
                        <Dialog open={isStatusDialogOpen} onOpenChange={setIsStatusDialogOpen}>
                            <DialogTrigger asChild>
                                <Button variant="outline" size="sm" className="h-9">
                                    <Settings className="h-4 w-4 mr-2" />
                                    Manage Statuses
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-md">
                                <DialogHeader>
                                    <DialogTitle>Manage Task Statuses</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4 py-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="status-name">Status Name *</Label>
                                        <div className="flex gap-2">
                                            <Input
                                                id="status-name"
                                                value={newStatus.label}
                                                onChange={(e) => setNewStatus({ ...newStatus, label: e.target.value })}
                                                placeholder="e.g., Testing, Blocked"
                                            />
                                            <Button onClick={handleAddStatus}>Add</Button>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Status Color</Label>
                                        <div className="grid grid-cols-5 gap-2 pb-2 border-b">
                                            {COLOR_OPTIONS.map((color) => (
                                                <button
                                                    key={color.value}
                                                    onClick={() => setNewStatus({ ...newStatus, color: color.value })}
                                                    className={`h-8 rounded-md ${color.value} ${newStatus.color === color.value ? 'ring-2 ring-offset-2 ring-primary shadow-sm' : ''
                                                        }`}
                                                    title={color.label}
                                                />
                                            ))}
                                        </div>
                                    </div>

                                    <div className="pt-2 max-h-[300px] overflow-y-auto pr-2">
                                        <h4 className="font-medium mb-3 text-sm">Current Statuses</h4>
                                        <div className="space-y-2">
                                            {statuses.map((status, index) => (
                                                <div key={status.id} className="flex items-center justify-between p-2 rounded-md border bg-card">
                                                    <div className="flex items-center gap-2">
                                                        <div className={`w-3 h-3 rounded-full ${status.color}`} />
                                                        <span className="text-sm font-medium">{status.label}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <Button variant="ghost" size="icon" className="h-7 w-7" disabled={index === 0} onClick={() => handleMoveStatus(index, 'up')}>
                                                            <ArrowUp className="h-3 w-3" />
                                                        </Button>
                                                        <Button variant="ghost" size="icon" className="h-7 w-7" disabled={index === statuses.length - 1} onClick={() => handleMoveStatus(index, 'down')}>
                                                            <ArrowDown className="h-3 w-3" />
                                                        </Button>
                                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/10" onClick={() => handleDeleteStatus(status.id)} disabled={statuses.length <= 1}>
                                                            <Trash2 className="h-3 w-3" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </DialogContent>
                        </Dialog>
                    )}

                    {/* Add Task Button */}
                    <Dialog open={isTaskDialogOpen} onOpenChange={setIsTaskDialogOpen}>
                        <DialogTrigger asChild>
                            <Button size="sm" className="h-9">
                                <Plus className="h-4 w-4 mr-2" />
                                Add Task
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-xl">
                            <DialogHeader>
                                <DialogTitle>Add New Task</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label htmlFor="title">Task Title *</Label>
                                    <Input
                                        id="title"
                                        value={newTask.title}
                                        onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                                        placeholder="Complete homepage design"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="description">Description</Label>
                                    <Input
                                        id="description"
                                        value={newTask.description}
                                        onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                                        placeholder="Task details..."
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="priority">Priority</Label>
                                        <select
                                            id="priority"
                                            value={newTask.priority}
                                            onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
                                            className="w-full h-10 px-3 rounded-md border border-input bg-background"
                                        >
                                            <option value="low">Low</option>
                                            <option value="medium">Medium</option>
                                            <option value="high">High</option>
                                            <option value="urgent">Urgent</option>
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="dueDate">Due Date</Label>
                                        <Input
                                            id="dueDate"
                                            type="date"
                                            value={newTask.dueDate}
                                            onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="project">Project</Label>
                                        <select
                                            id="project"
                                            value={newTask.projectId}
                                            onChange={(e) => setNewTask({ ...newTask, projectId: e.target.value })}
                                            className="w-full h-10 px-3 rounded-md border border-input bg-background"
                                        >
                                            {projects.map(p => (
                                                <option key={p.id} value={p.id}>{p.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="assignee">Assignee</Label>
                                        <select
                                            id="assignee"
                                            value={newTask.assigneeId}
                                            onChange={(e) => setNewTask({ ...newTask, assigneeId: e.target.value })}
                                            className="w-full h-10 px-3 rounded-md border border-input bg-background"
                                        >
                                            {users.map(u => (
                                                <option key={u.id} value={u.id}>{u.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {/* Attachments Section */}
                                <div className="space-y-2">
                                    <Label>Attachments (Screenshots/Files)</Label>
                                    <div className="flex flex-col gap-3">
                                        <Input
                                            type="file"
                                            onChange={handleFileChange}
                                            className="cursor-pointer"
                                        />

                                        {/* Attachment Preview */}
                                        {newTask.attachments && newTask.attachments.length > 0 && (
                                            < div className="grid grid-cols-2 gap-2">
                                                {newTask.attachments.map((att: any, idx: number) => (
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

                                <Button onClick={handleAddTask} className="w-full">
                                    Add Task
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {/* Task Details Dialog */}
            <Dialog open={!!selectedTask} onOpenChange={(open) => !open && setSelectedTask(null)}>
                <DialogContent className="max-w-2xl">
                    {selectedTask && (
                        <>
                            <DialogHeader>
                                <div className="flex justify-between items-start w-full">
                                    <div className="space-y-1 flex-1 pr-8">
                                        <Input
                                            className="text-2xl font-bold border-none px-0 focus-visible:ring-0"
                                            value={selectedTask.title}
                                            onChange={(e) => setSelectedTask({ ...selectedTask, title: e.target.value })}
                                        />
                                    </div>
                                    <Badge variant="secondary" className={`capitalize ${selectedTask.priority === 'urgent' ? 'bg-red-100 text-red-700' :
                                        selectedTask.priority === 'high' ? 'bg-orange-100 text-orange-700' :
                                            'bg-blue-100 text-blue-700'
                                        }`}>
                                        {selectedTask.priority} Priority
                                    </Badge>
                                </div>
                            </DialogHeader>
                            <div className="space-y-6 py-4">
                                <div className="grid grid-cols-2 gap-6 text-sm">
                                    <div className="space-y-2">
                                        <Label className="text-muted-foreground flex items-center gap-2">
                                            <Briefcase className="h-4 w-4" /> Project
                                        </Label>
                                        <select
                                            className="w-full h-9 rounded-md border border-input bg-background px-3"
                                            value={selectedTask.projectId}
                                            onChange={(e) => setSelectedTask({ ...selectedTask, projectId: e.target.value })}
                                        >
                                            {projects.map(p => (
                                                <option key={p.id} value={p.id}>{p.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-muted-foreground flex items-center gap-2">
                                            <UserIcon className="h-4 w-4" /> Assignee
                                        </Label>
                                        <select
                                            className="w-full h-9 rounded-md border border-input bg-background px-3"
                                            value={selectedTask.assigneeId}
                                            onChange={(e) => setSelectedTask({ ...selectedTask, assigneeId: e.target.value })}
                                        >
                                            {users.map(u => (
                                                <option key={u.id} value={u.id}>{u.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-muted-foreground flex items-center gap-2">
                                            <Calendar className="h-4 w-4" /> Due Date
                                        </Label>
                                        <Input
                                            type="date"
                                            className="h-9"
                                            value={selectedTask.dueDate instanceof Date ? selectedTask.dueDate.toISOString().split('T')[0] : selectedTask.dueDate?.split('T')[0]}
                                            onChange={(e) => setSelectedTask({ ...selectedTask, dueDate: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-muted-foreground flex items-center gap-2">
                                            <CheckCircle2 className="h-4 w-4" /> Status
                                        </Label>
                                        <select
                                            className="w-full h-9 rounded-md border border-input bg-background px-3 capitalize"
                                            value={selectedTask.status}
                                            onChange={(e) => setSelectedTask({ ...selectedTask, status: e.target.value })}
                                        >
                                            {statuses.map(s => (
                                                <option key={s.id} value={s.id}>{s.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label className="font-semibold flex items-center gap-2">Description</Label>
                                    <textarea
                                        className="w-full min-h-[120px] rounded-md border border-input bg-gray-50/50 p-3 text-sm focus-visible:ring-1 focus-visible:ring-primary outline-none"
                                        value={selectedTask.description || ''}
                                        onChange={(e) => setSelectedTask({ ...selectedTask, description: e.target.value })}
                                        placeholder="Add more details about this task..."
                                    />
                                </div>

                                {selectedTask.attachments && selectedTask.attachments.length > 0 && (
                                    <div className="space-y-2">
                                        <h3 className="text-sm font-semibold text-muted-foreground">Attachments</h3>
                                        <div className="grid grid-cols-3 gap-3">
                                            {selectedTask.attachments.map((att: any, idx: number) => (
                                                <div key={idx} className="border rounded-lg overflow-hidden group relative aspect-video bg-muted">
                                                    {att.fileType === 'image' ? (
                                                        <img src={att.data} alt={att.name} className="w-full h-full object-cover" />
                                                    ) : att.fileType === 'video' ? (
                                                        <video src={att.data} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center">
                                                            <FileText className="h-8 w-8 text-muted-foreground" />
                                                        </div>
                                                    )}
                                                    <div className="absolute inset-x-0 bottom-0 p-1 text-[10px] bg-black/60 text-white truncate opacity-0 group-hover:opacity-100 transition-opacity">
                                                        {att.name}
                                                    </div>
                                                    <a href={att.data} download={att.name} className="absolute top-1 right-1 bg-white/90 p-1.5 rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <Upload className="h-3 w-3 rotate-180" />
                                                    </a>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                            <DialogFooter className="border-t pt-4">
                                <Button variant="outline" onClick={() => setSelectedTask(null)}>Cancel</Button>
                                <Button onClick={handleUpdateTask}>Save Changes</Button>
                            </DialogFooter>
                        </>
                    )}
                </DialogContent>
            </Dialog>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 flex-shrink-0">
                <StatsCard title="Total Tasks" value={totalTasks} icon={CheckSquare} color="#8b5cf6" bg="bg-purple-50" />
                <StatsCard title="Pending" value={pendingTasks} icon={Circle} color="#f59e0b" bg="bg-amber-50" />
                <StatsCard title="Due Today" value={tasksDueToday} icon={Calendar} color="#eab308" bg="bg-yellow-50" />
                <StatsCard title="Overdue" value={overdueTasks} icon={AlertTriangle} color="#ef4444" bg="bg-red-50" />
            </div>

            {/* Content Area */}
            {view === 'kanban' ? (
                <div className="flex-1 overflow-x-auto overflow-y-hidden pb-4 min-w-0">
                    <div className="flex h-full gap-4 p-1">
                        {statuses.map((status) => {
                            const statusTasks = tasks.filter(t => t.status === status.id)

                            return (
                                <div
                                    key={status.id}
                                    className="w-[280px] flex-shrink-0 flex flex-col h-full bg-muted/30 rounded-lg border"
                                    onDragOver={handleDragOver}
                                    onDrop={() => handleDrop(status.id)}
                                >
                                    <div className="p-4 border-b bg-muted/40">
                                        <div className="flex items-center justify-between mb-1">
                                            <h3 className="font-semibold">{status.label}</h3>
                                            <Badge variant="secondary" className="text-xs">{statusTasks.length}</Badge>
                                        </div>
                                        <div className={`h-1 w-full rounded-full ${status.color} opacity-50`} />
                                    </div>

                                    <div className="p-3 flex-1 overflow-y-auto space-y-3">
                                        {statusTasks.map((task) => {
                                            return (
                                                <TaskBoardCardV2
                                                    key={task.id}
                                                    task={task}
                                                    users={users}
                                                    setSelectedTask={setSelectedTask}
                                                    handleDragStart={handleDragStart}
                                                    handleDeleteTask={handleDeleteTask}
                                                />
                                            )
                                        })}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            ) : (
                <div className="flex-1 overflow-y-auto space-y-4">
                    {tasks.map((task) => {
                        const assignee = users.find((u) => u.id === task.assigneeId)
                        return (
                            <Card key={task.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelectedTask(task)}>
                                <CardContent className="p-4 flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-4">
                                        <button className="text-muted-foreground hover:text-primary">
                                            {task.status === 'done' ? (
                                                <CheckCircle2 className="h-5 w-5 text-green-500" />
                                            ) : (
                                                <Circle className="h-5 w-5" />
                                            )}
                                        </button>
                                        <div>
                                            <h3 className={`font-medium ${task.status === 'done' ? 'line-through text-muted-foreground' : ''}`}>
                                                {task.title}
                                            </h3>
                                            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                                                <span className="flex items-center gap-1">
                                                    <Clock className="h-3 w-3" /> {formatDate(task.dueDate)}
                                                </span>
                                                <span>•</span>
                                                <span className="text-xs px-2 py-0.5 rounded-full bg-muted capitalize">
                                                    {task.priority}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4">
                                        {assignee && (
                                            <Avatar className="h-8 w-8">
                                                <AvatarFallback className="text-xs bg-primary/10 text-primary">
                                                    {assignee.name.charAt(0)}
                                                </AvatarFallback>
                                            </Avatar>
                                        )}
                                        <Badge variant="outline" className="capitalize">{task.status}</Badge>
                                    </div>
                                </CardContent>
                            </Card>
                        )
                    })}
                </div>
            )
            }
            {/* Delete Confirmation Dialog */}
            <Dialog open={!!taskToDelete} onOpenChange={(open) => !open && setTaskToDelete(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Task</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete this task? This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setTaskToDelete(null)}>Cancel</Button>
                        <Button variant="destructive" onClick={confirmDeleteTask}>Delete</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Client Approval Dialog */}
            <Dialog open={isClientApprovalDialogOpen} onOpenChange={setIsClientApprovalDialogOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Submit for Client Approval</DialogTitle>
                        <DialogDescription>
                            Add a screenshot or note before moving this task to Client Approval.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Approval Note</Label>
                            <textarea
                                className="w-full min-h-[100px] rounded-md border border-input bg-background p-3 text-sm focus-visible:ring-1 focus-visible:ring-primary outline-none"
                                placeholder="Describe what has been done..."
                                value={approvalNote}
                                onChange={(e) => setApprovalNote(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Proof of Work (Screenshot)</Label>
                            <div className="flex items-center gap-2">
                                <Input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleApprovalFileChange}
                                    className="cursor-pointer"
                                />
                            </div>
                            {approvalFile && (
                                <div className="text-xs text-green-600 flex items-center gap-1 mt-1">
                                    <CheckCircle2 className="h-3 w-3" /> Selected: {approvalFile.name}
                                </div>
                            )}
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => {
                            setIsClientApprovalDialogOpen(false)
                            setPendingApprovalTask(null)
                            setDraggedTask(null)
                        }}>Cancel</Button>
                        <Button onClick={submitClientApproval}>
                            Submit for Approval
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
