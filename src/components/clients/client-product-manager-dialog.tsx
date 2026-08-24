import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
    CheckCircle2, Clock, Calendar, DollarSign, Plus, Trash2,
    Check, User as UserIcon, FileText, Edit2,
    TrendingUp, CreditCard, Flag, AlertTriangle, CheckCheck
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import { Checkbox } from '@/components/ui/checkbox'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatCurrency, getCurrencySymbol } from '@/lib/utils'
import api from '@/lib/api-client'
import { useToast } from '@/hooks/use-toast'
import { useAppStore } from '@/store'
import { usePermissions } from '@/hooks/use-permissions'
import { ProjectMilestoneDialog } from '../projects/project-milestone-dialog'
import { ProjectMilestonePaymentDialog } from '../projects/project-milestone-payment-dialog'
import type { ClientProduct, ClientProductTask, Milestone } from '@/types'

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
    const [activeTab, setActiveTab] = useState('milestones')
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

    // Milestone dialog states
    const [isMilestoneDialogOpen, setIsMilestoneDialogOpen] = useState(false)
    const [isMilestonePaymentDialogOpen, setIsMilestonePaymentDialogOpen] = useState(false)
    const [selectedMilestone, setSelectedMilestone] = useState<Milestone | null>(null)
    const [selectedMilestoneIdx, setSelectedMilestoneIdx] = useState<number | null>(null)

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

    // Milestones calculations
    const milestones = cp.milestones || []
    const totalMilestones = milestones.length
    const completedMilestones = milestones.filter(m => m.completed || m.status === 'completed').length
    const totalMilestonesAmount = milestones.reduce((sum, m) => sum + (Number(m.amount) || 0), 0)

    const progressPercent = cp.progress !== undefined ? cp.progress : (
        totalMilestones > 0
            ? Math.round((completedMilestones / totalMilestones) * 100)
            : totalTasksCount > 0
            ? Math.round((completedTasks.length / totalTasksCount) * 100)
            : 0
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

    // ── Milestone Handlers ───────────────────────────────────────────────────────
    const handleSaveMilestone = async (milestoneData: Partial<Milestone>) => {
        try {
            let updatedMilestones: Milestone[] = [...milestones]
            if (selectedMilestoneIdx !== null && selectedMilestoneIdx >= 0) {
                updatedMilestones[selectedMilestoneIdx] = {
                    ...updatedMilestones[selectedMilestoneIdx],
                    ...milestoneData
                } as Milestone
            } else {
                updatedMilestones.push({
                    id: 'm_' + Date.now(),
                    paymentStatus: 'unpaid',
                    paidAmount: 0,
                    ...milestoneData
                } as Milestone)
            }

            const completedCount = updatedMilestones.filter(m => m.completed || m.status === 'completed').length
            const newProgress = Math.round((completedCount / updatedMilestones.length) * 100)

            const updatedCp = {
                ...cp,
                milestones: updatedMilestones,
                progress: newProgress,
                workStatus: (newProgress === 100 ? 'completed' : newProgress > 0 ? 'in_progress' : cp.workStatus) as any
            }

            setCp(updatedCp)
            onUpdate(updatedCp)

            const res = await api.put(`/client-products/${id}`, {
                milestones: updatedMilestones,
                progress: newProgress
            })

            if (res.data) {
                setCp(res.data)
                onUpdate(res.data)
            }

            toast({ title: 'Success', description: 'Digital product milestone saved successfully!' })
        } catch (error: any) {
            console.error('Failed to save milestone', error)
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to save milestone' })
        }
    }

    const handleSaveMilestonePayment = async (paymentData: {
        paymentStatus: 'unpaid' | 'partial' | 'paid'
        paidAmount: number
        paidDate?: Date
        paymentMethod?: string
        paymentReference?: string
        paymentNotes?: string
    }) => {
        let targetIndex = selectedMilestoneIdx
        if (targetIndex === null || targetIndex < 0) {
            if (selectedMilestone) {
                targetIndex = milestones.findIndex(m =>
                    (m.id && selectedMilestone.id && m.id === selectedMilestone.id) ||
                    (m._id && selectedMilestone._id && m._id === selectedMilestone._id) ||
                    m.name === selectedMilestone.name
                )
            }
        }
        if (targetIndex === null || targetIndex < 0) targetIndex = 0

        const updatedMilestones = milestones.map((m, idx) => {
            if (idx === targetIndex) {
                return { ...m, ...paymentData }
            }
            return m
        })

        const totalPaid = updatedMilestones.reduce((sum, m) => {
            if (m.paidAmount !== undefined && m.paidAmount > 0) return sum + m.paidAmount
            if (m.paymentStatus === 'paid') return sum + (m.amount || 0)
            return sum
        }, 0)

        const updatedCp = {
            ...cp,
            milestones: updatedMilestones,
            paidAmount: totalPaid > 0 ? totalPaid : cp.paidAmount
        }

        setCp(updatedCp)
        onUpdate(updatedCp)

        try {
            const res = await api.put(`/client-products/${id}`, {
                milestones: updatedMilestones,
                paidAmount: totalPaid > 0 ? totalPaid : cp.paidAmount
            })

            if (res.data) {
                setCp(res.data)
                onUpdate(res.data)
            }

            toast({
                title: 'Payment Status Updated! 💳',
                description: `Payment recorded as ${paymentData.paymentStatus.toUpperCase()} (${formatCurrency(paymentData.paidAmount)}).`
            })
        } catch (error) {
            console.error('Milestone payment save note:', error)
            toast({ title: 'Payment Recorded! 💳' })
        }
    }

    const handleToggleMilestoneComplete = async (index: number, completed: boolean) => {
        try {
            const updatedMilestones = [...milestones]
            updatedMilestones[index] = {
                ...updatedMilestones[index],
                completed,
                status: completed ? 'completed' : 'in-progress',
                completedAt: completed ? new Date() : undefined
            }

            const completedCount = updatedMilestones.filter(m => m.completed).length
            const newProgress = Math.round((completedCount / updatedMilestones.length) * 100)

            const updatedCp = {
                ...cp,
                milestones: updatedMilestones,
                progress: newProgress,
                workStatus: (newProgress === 100 ? 'completed' : 'in_progress') as any
            }

            setCp(updatedCp)
            onUpdate(updatedCp)

            const res = await api.put(`/client-products/${id}`, {
                milestones: updatedMilestones,
                progress: newProgress
            })

            if (res.data) {
                setCp(res.data)
                onUpdate(res.data)
            }

            toast({
                title: completed ? 'Milestone Completed! 🎉' : 'Status Updated',
                description: `"${updatedMilestones[index].name}" marked as ${completed ? 'completed' : 'in-progress'}.`
            })
        } catch (error) {
            console.error('Failed to toggle milestone', error)
        }
    }

    const handleDeleteMilestone = async (index: number) => {
        if (!window.confirm('Remove this milestone?')) return
        try {
            const updatedMilestones = milestones.filter((_, i) => i !== index)
            const completedCount = updatedMilestones.filter(m => m.completed).length
            const newProgress = updatedMilestones.length > 0 ? Math.round((completedCount / updatedMilestones.length) * 100) : 0

            const updatedCp = {
                ...cp,
                milestones: updatedMilestones,
                progress: newProgress
            }

            setCp(updatedCp)
            onUpdate(updatedCp)

            await api.put(`/client-products/${id}`, {
                milestones: updatedMilestones,
                progress: newProgress
            })

            toast({ title: 'Milestone removed' })
        } catch (error) {
            console.error('Failed to remove milestone', error)
        }
    }

    // ── Task Actions ─────────────────────────────────────────────────────────────
    const handleToggleTask = async (taskId: string, currentStatus: string) => {
        const newStatus = currentStatus === 'completed' ? 'pending' : 'completed'
        try {
            const res = await api.put(`/client-products/${id}/tasks/${taskId}`, {
                status: newStatus
            })
            setCp(res.data)
            onUpdate(res.data)
            toast({
                title: newStatus === 'completed' ? 'Task Completed 🎉' : 'Task Status Updated',
                description: `Status changed to ${newStatus}`
            })
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to update task status' })
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
            toast({ title: 'Task Added', description: 'Deliverable task added to project' })
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

    const prodName = typeof cp.product === 'object' ? (cp.product as any)?.name : 'Digital Product'
    const clientName = typeof cp.client === 'object' ? (cp.client as any)?.name : 'Client'
    const clientId = typeof cp.client === 'object' ? (cp.client as any)?._id || (cp.client as any)?.id : cp.client

    // Count for alert: Work Done but Payment Pending
    const workDonePaymentPendingCount = milestones.filter(m => {
        const isDone = m.completed || m.status === 'completed'
        const isPaid = m.paymentStatus === 'paid' || (m.paidAmount !== undefined && m.paidAmount >= m.amount && m.amount > 0)
        return isDone && !isPaid
    }).length

    return (
        <div className="space-y-6 max-h-[82vh] overflow-y-auto pr-1">
            {/* Warning Alert if Work Done but Payment is Pending */}
            {workDonePaymentPendingCount > 0 && canViewFinances && (
                <div className="flex items-center justify-between p-3.5 rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 text-xs">
                    <div className="flex items-center gap-2.5">
                        <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                        <div>
                            <span className="font-bold">{workDonePaymentPendingCount} Milestone(s) Deliver Ho Gaye Par Payment Aana Baki Hai!</span>
                            <p className="text-[11px] text-amber-700/80 dark:text-amber-300/80">
                                Client se payment lene ke liye neeche "Record Payment" ya "Create Invoice" par click karein.
                            </p>
                        </div>
                    </div>
                </div>
            )}

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

                        {/* Payment Status Badge */}
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
                            {milestones.length > 0
                                ? `${completedMilestones} of ${totalMilestones} Milestones Completed`
                                : `${completedTasks.length} of ${totalTasksCount} tasks completed`
                            }
                        </span>
                    </div>
                    <Progress value={progressPercent} className="h-2.5" />
                </div>
            </div>

            {/* Main Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className={`grid ${canViewFinances ? 'grid-cols-4' : 'grid-cols-3'} mb-4 h-11 bg-muted/60 p-1 rounded-xl`}>
                    <TabsTrigger value="milestones" className="rounded-lg font-medium text-xs sm:text-sm flex items-center gap-1.5">
                        <Flag className="h-4 w-4 text-primary" />
                        Milestones ({milestones.length})
                    </TabsTrigger>
                    <TabsTrigger value="tasks" className="rounded-lg font-medium text-xs sm:text-sm flex items-center gap-1.5">
                        <CheckCircle2 className="h-4 w-4 text-purple-500" />
                        Tasks ({tasks.length})
                    </TabsTrigger>
                    {canViewFinances && (
                        <TabsTrigger value="payments" className="rounded-lg font-medium text-xs sm:text-sm flex items-center gap-1.5">
                            <CreditCard className="h-4 w-4 text-emerald-500" />
                            Payments
                        </TabsTrigger>
                    )}
                    <TabsTrigger value="timeline" className="rounded-lg font-medium text-xs sm:text-sm flex items-center gap-1.5">
                        <Calendar className="h-4 w-4 text-blue-500" />
                        Timeline
                    </TabsTrigger>
                </TabsList>

                {/* ── TAB 1: MILESTONES ────────────────────────────────────────── */}
                <TabsContent value="milestones" className="space-y-4">
                    {/* Financial KPI Summary Cards */}
                    {canViewFinances && (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="p-3.5 rounded-xl border bg-card/60">
                                <span className="text-[11px] font-semibold text-muted-foreground uppercase">Deal Price / Milestones Sum</span>
                                <div className="text-lg font-bold text-foreground mt-0.5">{formatCurrency(customPrice)}</div>
                                <div className="text-[10px] text-muted-foreground">Milestones: {formatCurrency(totalMilestonesAmount)}</div>
                            </div>
                            <div className="p-3.5 rounded-xl border bg-card/60">
                                <span className="text-[11px] font-semibold text-muted-foreground uppercase">Received Payment</span>
                                <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">{formatCurrency(paidAmount)}</div>
                                <div className="text-[10px] text-muted-foreground">{customPrice > 0 ? Math.round((paidAmount / customPrice) * 100) : 0}% Paid</div>
                            </div>
                            <div className="p-3.5 rounded-xl border bg-card/60">
                                <span className="text-[11px] font-semibold text-muted-foreground uppercase">Outstanding Due</span>
                                <div className={`text-lg font-bold mt-0.5 ${pendingAmount > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600'}`}>
                                    {formatCurrency(pendingAmount)}
                                </div>
                                <div className="text-[10px] text-muted-foreground">{pendingAmount === 0 ? '✓ Fully Cleared' : 'Pending from client'}</div>
                            </div>
                        </div>
                    )}

                    {/* Add Milestone Header */}
                    <div className="flex items-center justify-between">
                        <div>
                            <h4 className="text-sm font-bold text-foreground">Product Deliverable Milestones & Stages</h4>
                            <p className="text-xs text-muted-foreground">Track deliverable completion & stage-wise client payments.</p>
                        </div>
                        <Button
                            size="sm"
                            onClick={() => {
                                setSelectedMilestone(null)
                                setSelectedMilestoneIdx(null)
                                setIsMilestoneDialogOpen(true)
                            }}
                            className="h-8 text-xs font-semibold"
                        >
                            <Plus className="h-3.5 w-3.5 mr-1" /> Add Milestone
                        </Button>
                    </div>

                    {/* Milestones List */}
                    {milestones.length === 0 ? (
                        <div className="p-8 text-center border-2 border-dashed rounded-xl bg-muted/20 space-y-2">
                            <Flag className="h-8 w-8 text-primary mx-auto opacity-70" />
                            <h5 className="text-sm font-semibold">No Milestones Configured Yet</h5>
                            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                                Configure milestones (e.g. Stage 1: Setup & Configuration, Stage 2: Testing & Handover) with target dates and payment amounts.
                            </p>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                    setSelectedMilestone(null)
                                    setSelectedMilestoneIdx(null)
                                    setIsMilestoneDialogOpen(true)
                                }}
                                className="mt-2 text-xs"
                            >
                                <Plus className="h-3.5 w-3.5 mr-1" /> Setup First Milestone
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {milestones.map((m, idx) => {
                                const isWorkDone = m.completed || m.status === 'completed'
                                const isPaid = m.paymentStatus === 'paid' || (m.paidAmount !== undefined && m.paidAmount >= m.amount && m.amount > 0)
                                const isPartial = m.paymentStatus === 'partial'
                                const mPaid = m.paidAmount !== undefined ? m.paidAmount : (isPaid ? m.amount : 0)
                                const mDue = Math.max(0, (m.amount || 0) - mPaid)
                                const dueDateObj = m.dueDate ? new Date(m.dueDate) : null
                                const isOverdue = dueDateObj && dueDateObj < new Date() && !isWorkDone

                                return (
                                    <div
                                        key={m.id || m._id || idx}
                                        className={`p-3.5 rounded-xl border transition-all ${
                                            isWorkDone && isPaid
                                                ? 'bg-emerald-50/40 dark:bg-emerald-950/10 border-emerald-200 dark:border-emerald-900/40'
                                                : isWorkDone && !isPaid
                                                ? 'bg-amber-50/40 dark:bg-amber-950/10 border-amber-300 dark:border-amber-800'
                                                : isOverdue
                                                ? 'bg-rose-50/30 dark:bg-rose-950/10 border-rose-200'
                                                : 'bg-card border-border'
                                        }`}
                                    >
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                            {/* Left: Checkbox & Info */}
                                            <div className="flex items-start gap-3 flex-1 min-w-0">
                                                <div className="pt-0.5">
                                                    <Checkbox
                                                        checked={isWorkDone}
                                                        onCheckedChange={(checked) => handleToggleMilestoneComplete(idx, !!checked)}
                                                        className="h-4.5 w-4.5 rounded data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                                                    />
                                                </div>

                                                <div className="space-y-1 min-w-0 flex-1">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <h5 className={`text-sm font-bold truncate ${isWorkDone ? 'text-muted-foreground' : 'text-foreground'}`}>
                                                            {m.name}
                                                        </h5>

                                                        {/* Work Badge */}
                                                        {isWorkDone ? (
                                                            <Badge className="bg-emerald-600 text-white text-[10px] py-0 gap-1">
                                                                <CheckCircle2 className="h-3 w-3" /> Work Delivered
                                                            </Badge>
                                                        ) : (
                                                            <Badge variant="outline" className="text-[10px] py-0 text-muted-foreground">
                                                                Work In-Progress
                                                            </Badge>
                                                        )}

                                                        {/* Payment Badge */}
                                                        {canViewFinances && (
                                                            <>
                                                                {isPaid ? (
                                                                    <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 text-[10px] py-0 gap-1 font-semibold">
                                                                        <CheckCheck className="h-3 w-3 text-emerald-600" />
                                                                        Payment Received ({formatCurrency(mPaid)})
                                                                    </Badge>
                                                                ) : isPartial ? (
                                                                    <Badge className="bg-amber-100 text-amber-800 border border-amber-300 text-[10px] py-0 font-semibold">
                                                                        Partial ({formatCurrency(mPaid)} Paid / {formatCurrency(mDue)} Due)
                                                                    </Badge>
                                                                ) : isWorkDone ? (
                                                                    <Badge className="bg-amber-500 text-white text-[10px] py-0 font-bold gap-1 animate-pulse">
                                                                        <AlertTriangle className="h-3 w-3" />
                                                                        Work Done • Payment Due ({formatCurrency(mDue || m.amount)})
                                                                    </Badge>
                                                                ) : (
                                                                    <Badge variant="outline" className="text-amber-600 border-amber-300 text-[10px] py-0">
                                                                        Payment Due ({formatCurrency(m.amount)})
                                                                    </Badge>
                                                                )}
                                                            </>
                                                        )}
                                                    </div>

                                                    {m.description && (
                                                        <p className="text-xs text-muted-foreground line-clamp-1">{m.description}</p>
                                                    )}

                                                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground pt-0.5">
                                                        <span className="flex items-center gap-1">
                                                            <Calendar className="h-3 w-3 text-blue-500" />
                                                            Target Date: {dueDateObj ? dueDateObj.toLocaleDateString() : 'No date'}
                                                        </span>
                                                        {isOverdue && (
                                                            <span className="text-red-600 bg-red-100 dark:bg-red-950 px-1.5 py-0.2 rounded font-bold text-[10px]">
                                                                OVERDUE
                                                            </span>
                                                        )}
                                                        {isPaid && m.paidDate && (
                                                            <span className="text-emerald-700 dark:text-emerald-300 font-medium">
                                                                Paid on {new Date(m.paidDate).toLocaleDateString()} {m.paymentMethod ? `via ${m.paymentMethod}` : ''}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Right: Milestone Amount & Actions */}
                                            <div className="flex items-center justify-between sm:justify-end gap-2.5 pt-2 sm:pt-0 border-t sm:border-t-0">
                                                {canViewFinances && (
                                                    <div className="text-right">
                                                        <div className="text-sm font-bold text-foreground">
                                                            {formatCurrency(m.amount || 0)}
                                                        </div>
                                                        {customPrice > 0 && m.amount > 0 && (
                                                            <div className="text-[10px] text-muted-foreground">
                                                                {Math.round((m.amount / customPrice) * 100)}% of price
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                <div className="flex items-center gap-1">
                                                    {/* Record Payment Button */}
                                                    {canViewFinances && (
                                                        <Button
                                                            variant={isPaid ? 'outline' : 'default'}
                                                            size="sm"
                                                            onClick={() => {
                                                                setSelectedMilestone(m)
                                                                setSelectedMilestoneIdx(idx)
                                                                setIsMilestonePaymentDialogOpen(true)
                                                            }}
                                                            className={`h-7.5 text-xs font-semibold px-2.5 gap-1 ${
                                                                isPaid
                                                                    ? 'text-emerald-600 border-emerald-300 hover:bg-emerald-50'
                                                                    : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                                            }`}
                                                        >
                                                            <CreditCard className="h-3 w-3" />
                                                            {isPaid ? 'Payment Done ✓' : isPartial ? 'Update Payment' : 'Record Payment'}
                                                        </Button>
                                                    )}

                                                    {/* Create Invoice Button */}
                                                    {canViewFinances && !isPaid && m.amount > 0 && (
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => {
                                                                onClose()
                                                                navigate('/invoices/new', {
                                                                    state: {
                                                                        clientId: clientId,
                                                                        clientProductId: id,
                                                                        type: 'product_milestone',
                                                                        amount: mDue || m.amount,
                                                                        title: `${prodName} - ${m.name}`,
                                                                        dueDate: m.dueDate
                                                                    }
                                                                })
                                                            }}
                                                            className="h-7.5 text-xs px-2 font-medium border-primary/30 text-primary hover:bg-primary/10"
                                                            title="Generate invoice for this milestone"
                                                        >
                                                            <FileText className="h-3 w-3 mr-1" />
                                                            Invoice
                                                        </Button>
                                                    )}

                                                    {/* Edit Button */}
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => {
                                                            setSelectedMilestone(m)
                                                            setSelectedMilestoneIdx(idx)
                                                            setIsMilestoneDialogOpen(true)
                                                        }}
                                                        className="h-7.5 w-7.5 text-muted-foreground hover:text-foreground"
                                                        title="Edit Milestone"
                                                    >
                                                        <Edit2 className="h-3 w-3" />
                                                    </Button>

                                                    {/* Delete Button */}
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleDeleteMilestone(idx)}
                                                        className="h-7.5 w-7.5 text-muted-foreground hover:text-destructive"
                                                        title="Delete Milestone"
                                                    >
                                                        <Trash2 className="h-3 w-3" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </TabsContent>

                {/* ── TAB 2: TASKS ────────────────────────────────────────── */}
                <TabsContent value="tasks" className="space-y-4">
                    {/* Add New Task Form */}
                    <form onSubmit={handleAddTask} className="p-3.5 bg-muted/30 rounded-xl border space-y-3">
                        <div className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                            <Plus className="h-3.5 w-3.5 text-primary" /> Add Task for this Product
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                            <div className="sm:col-span-6">
                                <Input
                                    placeholder="Task title (e.g. Setup domain, configure branding, QA testing)..."
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
                                className={`text-xs px-3 py-1 rounded-lg transition-colors ${
                                    taskFilter === 'all' ? 'bg-primary text-primary-foreground font-semibold' : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                                }`}
                            >
                                All ({tasks.length})
                            </button>
                            <button
                                type="button"
                                onClick={() => setTaskFilter('pending')}
                                className={`text-xs px-3 py-1 rounded-lg transition-colors ${
                                    taskFilter === 'pending' ? 'bg-primary text-primary-foreground font-semibold' : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                                }`}
                            >
                                Pending ({pendingTasks.length})
                            </button>
                            <button
                                type="button"
                                onClick={() => setTaskFilter('completed')}
                                className={`text-xs px-3 py-1 rounded-lg transition-colors ${
                                    taskFilter === 'completed' ? 'bg-primary text-primary-foreground font-semibold' : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                                }`}
                            >
                                Completed ({completedTasks.length})
                            </button>
                        </div>
                    </div>

                    {/* Task List */}
                    <div className="space-y-2">
                        {tasks.length === 0 ? (
                            <div className="text-center py-8 text-xs text-muted-foreground border rounded-xl bg-muted/20">
                                No tasks added yet. Add tasks above to track technical deliverables.
                            </div>
                        ) : (
                            tasks.map((task, idx) => {
                                const taskId = task.id || (task as any)._id
                                const isCompleted = task.status === 'completed'
                                return (
                                    <div
                                        key={taskId || idx}
                                        className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                                            isCompleted ? 'bg-muted/30 border-muted opacity-75' : 'bg-card hover:bg-muted/20'
                                        }`}
                                    >
                                        <div className="flex items-center gap-3 flex-1 min-w-0">
                                            <Checkbox
                                                checked={isCompleted}
                                                onCheckedChange={() => handleToggleTask(taskId, task.status)}
                                                className="h-4 w-4 rounded"
                                            />
                                            <div className="space-y-0.5 min-w-0 flex-1">
                                                <p className={`text-xs font-medium truncate ${isCompleted ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                                                    {task.title}
                                                </p>
                                                <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                                                    {task.dueDate && (
                                                        <span className="flex items-center gap-1">
                                                            <Calendar className="h-3 w-3 text-blue-500" />
                                                            Due: {new Date(task.dueDate).toLocaleDateString()}
                                                        </span>
                                                    )}
                                                    {task.assignedTo && (
                                                        <span className="flex items-center gap-1">
                                                            <UserIcon className="h-3 w-3 text-purple-500" />
                                                            {typeof task.assignedTo === 'object' ? task.assignedTo.name : 'Assigned'}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => handleDeleteTask(taskId)}
                                            className="text-muted-foreground hover:text-destructive p-1 rounded-md transition-colors"
                                            title="Delete task"
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                )
                            })
                        )}
                    </div>
                </TabsContent>

                {/* ── TAB 3: PAYMENTS ────────────────────────────────────────── */}
                {canViewFinances && (
                    <TabsContent value="payments" className="space-y-4">
                        {/* Record Payment Form */}
                        <form onSubmit={handleRecordPayment} className="p-4 bg-muted/30 rounded-xl border space-y-3">
                            <div className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                                <DollarSign className="h-3.5 w-3.5 text-emerald-600" /> Record Client Payment
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                                <div className="sm:col-span-4">
                                    <Input
                                        type="number"
                                        placeholder="Amount (₹)..."
                                        value={paymentAmount}
                                        onChange={e => setPaymentAmount(e.target.value === '' ? '' : Number(e.target.value))}
                                        className="text-xs h-9 bg-background"
                                        min="1"
                                        required
                                    />
                                </div>
                                <div className="sm:col-span-4">
                                    <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                                        <SelectTrigger className="text-xs h-9 bg-background">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Bank Transfer">Bank Transfer (NEFT/IMPS)</SelectItem>
                                            <SelectItem value="UPI">UPI (GPay/PhonePe)</SelectItem>
                                            <SelectItem value="Cash">Cash</SelectItem>
                                            <SelectItem value="Cheque">Cheque</SelectItem>
                                            <SelectItem value="Credit Card">Credit Card</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="sm:col-span-4">
                                    <Input
                                        type="date"
                                        value={paymentDate}
                                        onChange={e => setPaymentDate(e.target.value)}
                                        className="text-xs h-9 bg-background"
                                        required
                                    />
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <Input
                                    placeholder="Reference / UTR / Transaction ID..."
                                    value={paymentRef}
                                    onChange={e => setPaymentRef(e.target.value)}
                                    className="text-xs h-9 bg-background flex-1"
                                />
                                <Input
                                    placeholder="Payment notes / remarks..."
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
                                        navigate('/invoices/new', {
                                            state: {
                                                clientId: clientId,
                                                clientProductId: id,
                                                type: 'product',
                                                amount: pendingAmount || customPrice
                                            }
                                        })
                                    }}
                                >
                                    <FileText className="h-3.5 w-3.5 text-primary" /> Create Invoice
                                </Button>
                            </div>

                            {!cp.paymentHistory || cp.paymentHistory.length === 0 ? (
                                <div className="text-center py-6 text-xs text-muted-foreground border rounded-xl bg-muted/20">
                                    No direct payment logs recorded yet. Use the form above or Milestone payments to record payments.
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

                {/* ── TAB 4: TIMELINE ────────────────────────────────────────── */}
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
                                        <SelectItem value="not_started">⏳ Not Started</SelectItem>
                                        <SelectItem value="in_progress">⚙️ In Progress</SelectItem>
                                        <SelectItem value="review">🔍 Review / Testing</SelectItem>
                                        <SelectItem value="completed">✅ Completed</SelectItem>
                                        <SelectItem value="on_hold">⏸️ On Hold</SelectItem>
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
                            <Label htmlFor="edit-custom" className="text-xs font-semibold">Customizations & Requirements</Label>
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

            {/* Project Milestone Create / Edit Dialog */}
            <ProjectMilestoneDialog
                open={isMilestoneDialogOpen}
                onOpenChange={setIsMilestoneDialogOpen}
                milestone={selectedMilestone}
                projectBudget={customPrice}
                onSave={handleSaveMilestone}
            />

            {/* Project Milestone Payment Recording Dialog */}
            <ProjectMilestonePaymentDialog
                open={isMilestonePaymentDialogOpen}
                onOpenChange={setIsMilestonePaymentDialogOpen}
                milestone={selectedMilestone}
                onSavePayment={handleSaveMilestonePayment}
            />
        </div>
    )
}
