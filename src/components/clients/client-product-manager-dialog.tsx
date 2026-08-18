import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
    CheckCircle2, Clock, Calendar, DollarSign, Plus, Trash2,
    Check, User as UserIcon, FileText,
    TrendingUp, CreditCard
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatCurrency } from '@/lib/utils'
import api from '@/lib/api-client'
import { useToast } from '@/hooks/use-toast'
import { useAppStore } from '@/store'
import { usePermissions } from '@/hooks/use-permissions'
import type { ClientProduct, ClientProductTask } from '@/types'

interface ClientProductManagerDialogProps {
    clientProduct: ClientProduct
    onUpdate: (updated: ClientProduct) => void
    onClose: () => void
}

export function ClientProductManagerDialog({ clientProduct, onUpdate, onClose }: ClientProductManagerDialogProps) {
    const navigate = useNavigate()
    const { toast } = useToast()
    const { users, currentUser } = useAppStore()
    const { canView } = usePermissions()
    const [activeTab, setActiveTab] = useState('tasks')
    const [cp, setCp] = useState<ClientProduct>(clientProduct)
    const [isLoading, setIsLoading] = useState(false)

    // Check financial access (only owner, admin, or user with invoices permission)
    const canViewFinances = currentUser?.role === 'owner' || currentUser?.role === 'admin' || canView('invoices')

    // Task filter & creation state
    const [taskFilter, setTaskFilter] = useState<'all' | 'pending' | 'completed'>('all')
    const [newTaskTitle, setNewTaskTitle] = useState('')
    const [newTaskDueDate, setNewTaskDueDate] = useState('')
    const [newTaskAssignee, setNewTaskAssignee] = useState('')
    const [isAddingTask, setIsAddingTask] = useState(false)

    // Payment recording state
    const [isRecordingPayment, setIsRecordingPayment] = useState(false)
    const [paymentAmount, setPaymentAmount] = useState<number | ''>('')
    const [paymentMethod, setPaymentMethod] = useState('Bank Transfer')
    const [paymentRef, setPaymentRef] = useState('')
    const [paymentNotes, setPaymentNotes] = useState('')
    const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0])

    // Status & Timeline editing state
    const [editWorkStatus, setEditWorkStatus] = useState(cp.workStatus || 'not_started')
    const [editProgress, setEditProgress] = useState(cp.progress || 0)
    const [editStartDate, setEditStartDate] = useState(
        cp.startDate ? new Date(cp.startDate).toISOString().split('T')[0] : ''
    )
    const [editDueDate, setEditDueDate] = useState(
        cp.dueDate ? new Date(cp.dueDate).toISOString().split('T')[0] : ''
    )
    const [editCustomizations, setEditCustomizations] = useState(cp.customizations || '')

    const id = cp.id || cp._id

    // Calculations
    const customPrice = Number(cp.customPrice) || 0
    const paidAmount = Number(cp.paidAmount) || 0
    const pendingAmount = Math.max(0, customPrice - paidAmount)
    const tasks = cp.tasks || []
    const completedTasks = tasks.filter(t => t.status === 'completed')
    const pendingTasks = tasks.filter(t => t.status !== 'completed')
    const totalTasksCount = tasks.length
    const progressPercent = cp.progress !== undefined ? cp.progress : (
        totalTasksCount > 0 ? Math.round((completedTasks.length / totalTasksCount) * 100) : 0
    )

    // Due date countdown calculation
    const getDueDateStatus = () => {
        if (!cp.dueDate) return { label: 'No due date set', color: 'text-muted-foreground', isOverdue: false }
        const due = new Date(cp.dueDate)
        const now = new Date()
        const diffMs = due.getTime() - now.getTime()
        const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

        if (cp.workStatus === 'completed') {
            return { label: 'Delivered / Completed', color: 'text-emerald-600 dark:text-emerald-400 font-semibold', isOverdue: false }
        }
        if (diffDays < 0) {
            return { label: `Overdue by ${Math.abs(diffDays)} day${Math.abs(diffDays) > 1 ? 's' : ''}`, color: 'text-red-600 dark:text-red-400 font-semibold', isOverdue: true }
        }
        if (diffDays === 0) {
            return { label: 'Due Today', color: 'text-amber-600 dark:text-amber-400 font-semibold', isOverdue: false }
        }
        return { label: `${diffDays} days left`, color: 'text-blue-600 dark:text-blue-400 font-semibold', isOverdue: false }
    }

    const dueDateStatus = getDueDateStatus()

    // ── Task Actions ─────────────────────────────────────────────────────────────
    const handleToggleTask = async (task: ClientProductTask) => {
        const taskId = task.id || (task as any)._id
        if (!taskId) return
        const newStatus = task.status === 'completed' ? 'pending' : 'completed'
        try {
            const res = await api.patch(`/client-products/${id}/tasks/${taskId}`, { status: newStatus })
            setCp(res.data)
            onUpdate(res.data)
            toast({
                title: newStatus === 'completed' ? 'Task Completed' : 'Task Marked Pending',
                description: `"${task.title}" updated`
            })
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error.response?.data?.message || 'Failed to update task' })
        }
    }

    const handleAddTask = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newTaskTitle.trim()) {
            toast({ variant: 'destructive', title: 'Validation Error', description: 'Task title is required' })
            return
        }
        setIsAddingTask(true)
        try {
            const res = await api.post(`/client-products/${id}/tasks`, {
                title: newTaskTitle.trim(),
                dueDate: newTaskDueDate || undefined,
                assignedTo: newTaskAssignee || undefined
            })
            setCp(res.data)
            onUpdate(res.data)
            setNewTaskTitle('')
            setNewTaskDueDate('')
            setNewTaskAssignee('')
            toast({ title: 'Task Added', description: 'New deliverable task created' })
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error.response?.data?.message || 'Failed to add task' })
        } finally {
            setIsAddingTask(false)
        }
    }

    const handleDeleteTask = async (taskId: string) => {
        if (!window.confirm('Are you sure you want to delete this task?')) return
        try {
            const res = await api.delete(`/client-products/${id}/tasks/${taskId}`)
            setCp(res.data)
            onUpdate(res.data)
            toast({ title: 'Task Deleted' })
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete task' })
        }
    }

    // ── Payment Actions ──────────────────────────────────────────────────────────
    const handleRecordPayment = async (e: React.FormEvent) => {
        e.preventDefault()
        const amountNum = Number(paymentAmount)
        if (!amountNum || amountNum <= 0) {
            toast({ variant: 'destructive', title: 'Validation Error', description: 'Enter a valid payment amount' })
            return
        }
        setIsRecordingPayment(true)
        try {
            const res = await api.post(`/client-products/${id}/payments`, {
                amount: amountNum,
                date: paymentDate,
                paymentMethod,
                reference: paymentRef,
                notes: paymentNotes
            })
            setCp(res.data)
            onUpdate(res.data)
            setPaymentAmount('')
            setPaymentRef('')
            setPaymentNotes('')
            toast({ title: 'Payment Recorded', description: `Recorded payment of ₹${amountNum.toLocaleString('en-IN')}` })
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error.response?.data?.message || 'Failed to record payment' })
        } finally {
            setIsRecordingPayment(false)
        }
    }

    const handleDeletePayment = async (paymentId: string) => {
        if (!window.confirm('Are you sure you want to remove this payment entry? This will adjust the balance.')) return
        try {
            const res = await api.delete(`/client-products/${id}/payments/${paymentId}`)
            setCp(res.data)
            onUpdate(res.data)
            toast({ title: 'Payment Removed', description: 'Balance has been updated' })
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete payment' })
        }
    }

    // ── Status & Timeline Updates ────────────────────────────────────────────────
    const handleSaveTimelineAndStatus = async () => {
        setIsLoading(true)
        try {
            const res = await api.put(`/client-products/${id}`, {
                workStatus: editWorkStatus,
                progress: editProgress,
                startDate: editStartDate || undefined,
                dueDate: editDueDate || undefined,
                customizations: editCustomizations
            })
            setCp(res.data)
            onUpdate(res.data)
            toast({ title: 'Success', description: 'Timeline and work status updated' })
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error.response?.data?.message || 'Failed to update' })
        } finally {
            setIsLoading(false)
        }
    }

    const filteredTasks = tasks.filter(t => {
        if (taskFilter === 'pending') return t.status !== 'completed'
        if (taskFilter === 'completed') return t.status === 'completed'
        return true
    })

    const prodName = typeof cp.product === 'object' ? (cp.product as any)?.name : 'Digital Product'
    const clientName = typeof cp.client === 'object' ? (cp.client as any)?.name : 'Client'

    return (
        <div className="space-y-6 max-h-[82vh] overflow-y-auto pr-1">
            {/* Top Banner & Quick Metrics */}
            <div className="rounded-2xl p-5 bg-gradient-to-br from-card via-card to-muted/50 border shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <h2 className="text-xl font-bold tracking-tight text-foreground">{prodName}</h2>
                            <Badge variant="outline" className="text-xs bg-muted/60 font-medium">
                                Client: {clientName}
                            </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1.5 flex-wrap">
                            <span className="flex items-center gap-1">
                                <Calendar className="h-3.5 w-3.5 text-blue-500" />
                                Start: {cp.startDate ? new Date(cp.startDate).toLocaleDateString() : 'N/A'}
                            </span>
                            <span className="flex items-center gap-1">
                                <Clock className="h-3.5 w-3.5 text-amber-500" />
                                Due: {cp.dueDate ? new Date(cp.dueDate).toLocaleDateString() : 'No deadline'}
                            </span>
                            <span className={`px-2 py-0.5 rounded-full text-xs bg-muted border ${dueDateStatus.color}`}>
                                {dueDateStatus.label}
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                        {/* Work Status Badge */}
                        <Badge
                            className={`text-xs px-2.5 py-1 ${
                                cp.workStatus === 'completed'
                                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300'
                                    : cp.workStatus === 'in_progress'
                                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-300'
                                    : cp.workStatus === 'review'
                                    ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border-purple-300'
                                    : cp.workStatus === 'on_hold'
                                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300'
                                    : 'bg-muted text-muted-foreground'
                            }`}
                        >
                            {cp.workStatus === 'completed' && '✅ Completed'}
                            {cp.workStatus === 'in_progress' && '⚙️ In Progress'}
                            {cp.workStatus === 'review' && '🔍 Review & Testing'}
                            {cp.workStatus === 'on_hold' && '⏸️ On Hold'}
                            {(!cp.workStatus || cp.workStatus === 'not_started') && '⏳ Not Started'}
                        </Badge>

                        {/* Payment Status Badge (Only for users with financial permissions) */}
                        {canViewFinances && (
                            <Badge
                                className={`text-xs px-2.5 py-1 ${
                                    cp.paymentStatus === 'paid'
                                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300'
                                        : cp.paymentStatus === 'partial'
                                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300'
                                        : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-300'
                                }`}
                            >
                                {cp.paymentStatus === 'paid' && '💳 Paid in Full'}
                                {cp.paymentStatus === 'partial' && '⚡ Partially Paid'}
                                {(!cp.paymentStatus || cp.paymentStatus === 'unpaid') && '⚠️ Payment Pending'}
                            </Badge>
                        )}
                    </div>
                </div>

                {/* Progress Bar & Summary */}
                <div className="space-y-1.5 pt-2 border-t">
                    <div className="flex justify-between items-center text-xs">
                        <span className="font-semibold text-foreground flex items-center gap-1.5">
                            <TrendingUp className="h-3.5 w-3.5 text-primary" />
                            Work Progress ({progressPercent}%)
                        </span>
                        <span className="text-muted-foreground">
                            {completedTasks.length} of {totalTasksCount} tasks completed ({pendingTasks.length} pending)
                        </span>
                    </div>
                    <Progress value={progressPercent} className="h-2.5" />
                </div>
            </div>

            {/* Main Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className={`grid ${canViewFinances ? 'grid-cols-3' : 'grid-cols-2'} mb-4 h-11 bg-muted/60 p-1 rounded-xl`}>
                    <TabsTrigger value="tasks" className="rounded-lg font-medium text-xs sm:text-sm flex items-center gap-1.5">
                        <CheckCircle2 className="h-4 w-4 text-purple-500" />
                        Tasks & Deliverables ({tasks.length})
                    </TabsTrigger>
                    {canViewFinances && (
                        <TabsTrigger value="payments" className="rounded-lg font-medium text-xs sm:text-sm flex items-center gap-1.5">
                            <CreditCard className="h-4 w-4 text-emerald-500" />
                            Payments & Balance
                        </TabsTrigger>
                    )}
                    <TabsTrigger value="timeline" className="rounded-lg font-medium text-xs sm:text-sm flex items-center gap-1.5">
                        <Calendar className="h-4 w-4 text-blue-500" />
                        Status & Timeline
                    </TabsTrigger>
                </TabsList>

                {/* ── TAB 1: TASKS & DELIVERABLES ────────────────────────────────────────── */}
                <TabsContent value="tasks" className="space-y-4">
                    {/* Add New Task Form */}
                    <form onSubmit={handleAddTask} className="p-3.5 bg-muted/30 rounded-xl border space-y-3">
                        <div className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                            <Plus className="h-3.5 w-3.5 text-primary" /> Add Task / Milestone for this Product
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                            <div className="sm:col-span-6">
                                <Input
                                    placeholder="Task title (e.g., Setup database, Integrate payment gateway, QA testing)..."
                                    value={newTaskTitle}
                                    onChange={e => setNewTaskTitle(e.target.value)}
                                    className="text-xs h-9 bg-background"
                                />
                            </div>
                            <div className="sm:col-span-3">
                                <Input
                                    type="date"
                                    value={newTaskDueDate}
                                    onChange={e => setNewTaskDueDate(e.target.value)}
                                    className="text-xs h-9 bg-background"
                                />
                            </div>
                            <div className="sm:col-span-3 flex gap-2">
                                <Select value={newTaskAssignee} onValueChange={setNewTaskAssignee}>
                                    <SelectTrigger className="text-xs h-9 bg-background">
                                        <SelectValue placeholder="Assignee" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {users.filter(u => u.role !== 'client').map(u => (
                                            <SelectItem key={u.id || (u as any)._id} value={u.id || (u as any)._id as string}>
                                                {u.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <Button type="submit" size="sm" disabled={isAddingTask} className="h-9 px-3">
                                    <Plus className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </form>

                    {/* Filter Buttons */}
                    <div className="flex items-center justify-between gap-2 pt-1">
                        <div className="flex items-center gap-1.5">
                            <button
                                type="button"
                                onClick={() => setTaskFilter('all')}
                                className={`text-xs px-3 py-1 rounded-full border transition-all ${
                                    taskFilter === 'all' ? 'bg-primary text-primary-foreground font-semibold' : 'bg-muted/50 text-muted-foreground'
                                }`}
                            >
                                All ({tasks.length})
                            </button>
                            <button
                                type="button"
                                onClick={() => setTaskFilter('pending')}
                                className={`text-xs px-3 py-1 rounded-full border transition-all ${
                                    taskFilter === 'pending' ? 'bg-amber-600 text-white font-semibold' : 'bg-muted/50 text-muted-foreground'
                                }`}
                            >
                                Pending ({pendingTasks.length})
                            </button>
                            <button
                                type="button"
                                onClick={() => setTaskFilter('completed')}
                                className={`text-xs px-3 py-1 rounded-full border transition-all ${
                                    taskFilter === 'completed' ? 'bg-emerald-600 text-white font-semibold' : 'bg-muted/50 text-muted-foreground'
                                }`}
                            >
                                Completed ({completedTasks.length})
                            </button>
                        </div>
                        <span className="text-xs text-muted-foreground">Click checkbox to mark done/pending</span>
                    </div>

                    {/* Tasks List */}
                    {filteredTasks.length === 0 ? (
                        <div className="text-center py-10 border border-dashed rounded-xl bg-muted/20 text-muted-foreground text-sm">
                            No {taskFilter !== 'all' ? taskFilter : ''} tasks found. Add a task above to track pending work.
                        </div>
                    ) : (
                        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                            {filteredTasks.map((t, idx) => {
                                const isDone = t.status === 'completed'
                                const taskId = t.id || (t as any)._id
                                const assigneeName = t.assignedTo?.name || (typeof t.assignedTo === 'string' ? users.find(u => u.id === t.assignedTo)?.name : null)
                                return (
                                    <div
                                        key={taskId || idx}
                                        className={`flex items-center justify-between gap-3 p-3 rounded-xl border transition-all group ${
                                            isDone
                                                ? 'bg-emerald-50/40 dark:bg-emerald-950/15 border-emerald-200 dark:border-emerald-900/30'
                                                : 'bg-card hover:bg-muted/40 border-border shadow-xs'
                                        }`}
                                    >
                                        <div className="flex items-center gap-3 flex-1 min-w-0">
                                            <button
                                                type="button"
                                                onClick={() => handleToggleTask(t)}
                                                className={`h-5 w-5 rounded-md flex items-center justify-center border transition-colors cursor-pointer shrink-0 ${
                                                    isDone
                                                        ? 'bg-emerald-600 border-emerald-600 text-white'
                                                        : 'border-muted-foreground/40 hover:border-primary'
                                                }`}
                                            >
                                                {isDone && <Check className="h-3.5 w-3.5" />}
                                            </button>
                                            <div className="min-w-0 flex-1">
                                                <p className={`text-sm font-medium leading-tight truncate ${isDone ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                                                    {t.title}
                                                </p>
                                                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1 flex-wrap">
                                                    {t.dueDate && (
                                                        <span className="flex items-center gap-1">
                                                            <Calendar className="h-3 w-3" />
                                                            Due: {new Date(t.dueDate).toLocaleDateString()}
                                                        </span>
                                                    )}
                                                    {assigneeName && (
                                                        <span className="flex items-center gap-1">
                                                            <UserIcon className="h-3 w-3 text-primary" />
                                                            {assigneeName}
                                                        </span>
                                                    )}
                                                    {isDone && t.completedAt && (
                                                        <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                                                            Completed on {new Date(t.completedAt).toLocaleDateString()}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 shrink-0">
                                            <Badge variant={isDone ? 'default' : 'secondary'} className={`text-[10px] ${isDone ? 'bg-emerald-600 text-white' : 'bg-muted'}`}>
                                                {isDone ? 'Done' : 'Pending'}
                                            </Badge>
                                            <button
                                                type="button"
                                                onClick={() => handleDeleteTask(taskId)}
                                                className="text-muted-foreground hover:text-destructive p-1 rounded-md transition-colors"
                                                title="Delete task"
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </TabsContent>

                {/* ── TAB 2: PAYMENTS & BALANCE (Strictly only for admin/owner/billing) ──────── */}
                {canViewFinances && (
                    <TabsContent value="payments" className="space-y-4">
                        {/* Financial Summary Cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="p-4 rounded-xl border bg-card shadow-xs">
                                <span className="text-xs font-semibold text-muted-foreground uppercase">Total Contract Value</span>
                                <div className="text-2xl font-bold text-foreground mt-1">{formatCurrency(customPrice)}</div>
                                <span className="text-xs text-muted-foreground mt-0.5 block">Full product price</span>
                            </div>

                            <div className="p-4 rounded-xl border bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/40">
                                <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-300 uppercase">Received / Paid Amount</span>
                                <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-400 mt-1">{formatCurrency(paidAmount)}</div>
                                <span className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5 block">
                                    {customPrice > 0 ? `${Math.round((paidAmount / customPrice) * 100)}% Collected` : 'Collected'}
                                </span>
                            </div>

                            <div className={`p-4 rounded-xl border shadow-xs ${
                                pendingAmount === 0
                                    ? 'bg-emerald-50/30 dark:bg-emerald-950/10 border-emerald-200'
                                    : 'bg-rose-50/60 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/40'
                            }`}>
                                <span className={`text-xs font-semibold uppercase ${pendingAmount === 0 ? 'text-emerald-700' : 'text-rose-700 dark:text-rose-400'}`}>
                                    Pending Balance / Due
                                </span>
                                <div className={`text-2xl font-bold mt-1 ${pendingAmount === 0 ? 'text-emerald-700' : 'text-rose-700 dark:text-rose-400'}`}>
                                    {formatCurrency(pendingAmount)}
                                </div>
                                <span className="text-xs text-muted-foreground mt-0.5 block">
                                    {pendingAmount === 0 ? 'No outstanding balance' : 'Pending payment'}
                                </span>
                            </div>
                        </div>

                        {/* Record New Payment Form */}
                        <form onSubmit={handleRecordPayment} className="p-4 rounded-xl bg-muted/40 border space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="text-xs font-bold text-foreground flex items-center gap-1.5 uppercase tracking-wide">
                                    <DollarSign className="h-3.5 w-3.5 text-emerald-500" />
                                    Record Payment Installment
                                </div>
                                {pendingAmount > 0 && (
                                    <button
                                        type="button"
                                        onClick={() => setPaymentAmount(pendingAmount)}
                                        className="text-xs text-primary font-medium hover:underline"
                                    >
                                        Pay Full Pending (₹{pendingAmount.toLocaleString('en-IN')})
                                    </button>
                                )}
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                                <div>
                                    <Label htmlFor="pay-amount" className="text-xs text-muted-foreground">Amount (₹) *</Label>
                                    <Input
                                        id="pay-amount"
                                        type="number"
                                        min="1"
                                        placeholder="Amount"
                                        value={paymentAmount}
                                        onChange={e => setPaymentAmount(e.target.value === '' ? '' : Number(e.target.value))}
                                        className="text-xs h-9 bg-background"
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="pay-date" className="text-xs text-muted-foreground">Payment Date</Label>
                                    <Input
                                        id="pay-date"
                                        type="date"
                                        value={paymentDate}
                                        onChange={e => setPaymentDate(e.target.value)}
                                        className="text-xs h-9 bg-background"
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="pay-method" className="text-xs text-muted-foreground">Method</Label>
                                    <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                                        <SelectTrigger id="pay-method" className="text-xs h-9 bg-background">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Bank Transfer">Bank Transfer (NEFT/IMPS)</SelectItem>
                                            <SelectItem value="UPI">UPI / GPay / PhonePe</SelectItem>
                                            <SelectItem value="Cash">Cash</SelectItem>
                                            <SelectItem value="Cheque">Cheque</SelectItem>
                                            <SelectItem value="Card">Credit/Debit Card</SelectItem>
                                            <SelectItem value="Stripe">Stripe / Online</SelectItem>
                                            <SelectItem value="Cashfree">Cashfree</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label htmlFor="pay-ref" className="text-xs text-muted-foreground">Ref / Transaction ID</Label>
                                    <Input
                                        id="pay-ref"
                                        placeholder="UTR / Transaction #"
                                        value={paymentRef}
                                        onChange={e => setPaymentRef(e.target.value)}
                                        className="text-xs h-9 bg-background"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-2 items-center">
                                <Input
                                    placeholder="Payment notes (e.g. 50% advance received, milestone 1 payment)..."
                                    value={paymentNotes}
                                    onChange={e => setPaymentNotes(e.target.value)}
                                    className="text-xs h-9 bg-background flex-1"
                                />
                                <Button type="submit" size="sm" disabled={isRecordingPayment} className="h-9 px-4 shrink-0 bg-emerald-600 hover:bg-emerald-700 text-white">
                                    <DollarSign className="h-4 w-4 mr-1" />
                                    {isRecordingPayment ? 'Saving...' : 'Add Payment'}
                                </Button>
                            </div>
                        </form>

                        {/* Payment History List */}
                        <div className="space-y-2">
                            <div className="text-xs font-semibold text-foreground flex items-center justify-between">
                                <span>Payment History ({cp.paymentHistory?.length || 0} installments)</span>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-7 text-xs gap-1.5"
                                    onClick={() => {
                                        onClose()
                                        navigate('/invoices/new')
                                    }}
                                >
                                    <FileText className="h-3.5 w-3.5 text-primary" /> Create Invoice
                                </Button>
                            </div>

                            {!cp.paymentHistory || cp.paymentHistory.length === 0 ? (
                                <div className="text-center py-6 text-xs text-muted-foreground border rounded-xl bg-muted/20">
                                    No payment logs recorded yet. Use the form above to record payments.
                                </div>
                            ) : (
                                <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                                    {cp.paymentHistory.map((item, idx) => {
                                        const paymentId = item.id || (item as any)._id
                                        return (
                                            <div key={paymentId || idx} className="flex items-center justify-between p-2.5 rounded-xl border bg-card text-xs">
                                                <div className="space-y-0.5">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                                                            ₹{item.amount?.toLocaleString('en-IN')}
                                                        </span>
                                                        <Badge variant="outline" className="text-[10px] py-0">
                                                            {item.paymentMethod || 'Bank Transfer'}
                                                        </Badge>
                                                        {item.reference && (
                                                            <span className="text-muted-foreground text-[11px] font-mono">
                                                                Ref: {item.reference}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="text-muted-foreground text-[11px]">
                                                        Date: {new Date(item.date).toLocaleDateString()} {item.notes && `• ${item.notes}`}
                                                    </div>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => handleDeletePayment(paymentId)}
                                                    className="text-muted-foreground hover:text-destructive p-1 rounded-md"
                                                    title="Delete payment entry"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </button>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </div>
                    </TabsContent>
                )}

                {/* ── TAB 3: STATUS & TIMELINE ────────────────────────────────────────────── */}
                <TabsContent value="timeline" className="space-y-4">
                    <div className="p-4 rounded-xl border bg-card space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="edit-status" className="text-xs font-semibold">Work Status</Label>
                                <Select value={editWorkStatus} onValueChange={(v: any) => setEditWorkStatus(v)}>
                                    <SelectTrigger id="edit-status">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="not_started">⏳ Not Started (शुरू नहीं हुआ)</SelectItem>
                                        <SelectItem value="in_progress">⚙️ In Progress (काम चालू है)</SelectItem>
                                        <SelectItem value="review">🔍 Review / Testing (जांच में है)</SelectItem>
                                        <SelectItem value="completed">✅ Completed (पूर्ण हो गया)</SelectItem>
                                        <SelectItem value="on_hold">⏸️ On Hold (रुका हुआ)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between items-center text-xs font-semibold">
                                    <Label htmlFor="edit-prog">Progress ({editProgress}%)</Label>
                                </div>
                                <div className="flex items-center gap-3">
                                    <input
                                        id="edit-prog"
                                        type="range"
                                        min="0"
                                        max="100"
                                        step="5"
                                        value={editProgress}
                                        onChange={e => setEditProgress(Number(e.target.value))}
                                        className="w-full accent-primary h-2 bg-muted rounded-lg cursor-pointer"
                                    />
                                    <Input
                                        type="number"
                                        min="0"
                                        max="100"
                                        value={editProgress}
                                        onChange={e => setEditProgress(Math.min(100, Math.max(0, Number(e.target.value))))}
                                        className="w-16 text-center text-xs font-mono h-9"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label htmlFor="edit-start" className="text-xs font-semibold">Start Date</Label>
                                <Input
                                    id="edit-start"
                                    type="date"
                                    value={editStartDate}
                                    onChange={e => setEditStartDate(e.target.value)}
                                    className="text-xs"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="edit-due" className="text-xs font-semibold">Due / Delivery Date</Label>
                                <Input
                                    id="edit-due"
                                    type="date"
                                    value={editDueDate}
                                    onChange={e => setEditDueDate(e.target.value)}
                                    className="text-xs"
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="edit-custom" className="text-xs font-semibold">Customizations & Client Requirements</Label>
                            <Textarea
                                id="edit-custom"
                                rows={3}
                                value={editCustomizations}
                                onChange={e => setEditCustomizations(e.target.value)}
                                placeholder="Module specifications, client credentials, preferences..."
                                className="text-xs"
                            />
                        </div>

                        <div className="flex justify-end pt-2">
                            <Button onClick={handleSaveTimelineAndStatus} disabled={isLoading} size="sm">
                                {isLoading ? 'Saving...' : 'Save Status & Timeline'}
                            </Button>
                        </div>
                    </div>
                </TabsContent>
            </Tabs>

            <div className="flex justify-end gap-2 pt-3 border-t">
                <Button variant="outline" onClick={onClose}>Close</Button>
            </div>
        </div>
    )
}
