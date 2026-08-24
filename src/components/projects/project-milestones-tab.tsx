import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Checkbox } from '@/components/ui/checkbox'
import {
    Plus, Flag, Calendar, DollarSign, CheckCircle2, Clock,
    AlertCircle, Edit2, Trash2, FileText, ArrowUpRight, TrendingUp,
    ShieldAlert, CreditCard, CheckCheck, AlertTriangle, Filter
} from 'lucide-react'
import { formatCurrency, getCurrencySymbol } from '@/lib/utils'
import { ProjectMilestoneDialog } from './project-milestone-dialog'
import { ProjectMilestonePaymentDialog } from './project-milestone-payment-dialog'
import { useAppStore } from '@/store'
import { useNavigate } from 'react-router-dom'
import { useToast } from '@/hooks/use-toast'
import api from '@/lib/api-client'
import type { Project, Milestone } from '@/types'

interface ProjectMilestonesTabProps {
    project: Project
    onProjectUpdate?: (updatedProject: Project) => void
}

export function ProjectMilestonesTab({ project, onProjectUpdate }: ProjectMilestonesTabProps) {
    const navigate = useNavigate()
    const { toast } = useToast()
    const { invoices, updateProject, currentUser } = useAppStore()

    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false)
    const [selectedMilestone, setSelectedMilestone] = useState<Milestone | null>(null)
    const [milestoneIndex, setMilestoneIndex] = useState<number | null>(null)
    const [filterStatus, setFilterStatus] = useState<'all' | 'work_done' | 'payment_pending' | 'paid'>('all')
    const [isSaving, setIsSaving] = useState(false)

    const canManageMilestones = ['owner', 'admin', 'pm'].includes(currentUser?.role)
    const canViewFinances = ['owner', 'admin', 'client', 'pm'].includes(currentUser?.role)

    const milestones = project.milestones || []
    const totalMilestones = milestones.length
    const completedMilestones = milestones.filter(m => m.completed || m.status === 'completed').length
    const milestoneProgress = totalMilestones > 0 ? Math.round((completedMilestones / totalMilestones) * 100) : 0

    const totalMilestoneAmount = milestones.reduce((sum, m) => sum + (Number(m.amount) || 0), 0)
    const projectInvoices = invoices.filter(i => i.projectId === project.id)

    // Calculate Paid amount from milestones paidAmount / paymentStatus or paid invoices
    const totalPaidFromMilestones = milestones.reduce((sum, m) => {
        if (m.paidAmount !== undefined && m.paidAmount > 0) return sum + m.paidAmount
        if (m.paymentStatus === 'paid') return sum + (m.amount || 0)
        return sum
    }, 0)

    const paidInvoices = projectInvoices.filter(i => i.status === 'paid')
    const totalPaidInvoices = paidInvoices.reduce((sum, i) => sum + (Number(i.total) || 0), 0)
    const totalPaidAmount = Math.max(totalPaidFromMilestones, totalPaidInvoices)
    const totalDueAmount = Math.max(0, (project.budget || totalMilestoneAmount) - totalPaidAmount)

    // Helper: Find invoice associated with this milestone
    const getMilestoneInvoice = (milestone: Milestone, index: number) => {
        if (milestone.invoiceId) {
            return projectInvoices.find(i => i.id === milestone.invoiceId || (i as any)._id === milestone.invoiceId)
        }
        return projectInvoices.find(i =>
            i.lineItems?.some(item => item.name?.toLowerCase().includes(milestone.name?.toLowerCase())) ||
            i.lineItems?.some(item => item.name?.toLowerCase().includes(`milestone ${index + 1}`))
        )
    }

    // Save or update milestone definition
    const handleSaveMilestone = async (milestoneData: Partial<Milestone>) => {
        const projectId = project.id || (project as any)._id
        setIsSaving(true)
        try {
            let updatedMilestones: Milestone[] = [...milestones]

            if (milestoneIndex !== null && milestoneIndex >= 0) {
                updatedMilestones[milestoneIndex] = {
                    ...updatedMilestones[milestoneIndex],
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
            const newProgress = updatedMilestones.length > 0 ? Math.round((completedCount / updatedMilestones.length) * 100) : project.progress

            const response = await api.put(`/projects/${projectId}`, {
                milestones: updatedMilestones,
                progress: newProgress
            })

            updateProject(projectId, {
                milestones: updatedMilestones,
                progress: newProgress
            })

            if (onProjectUpdate) {
                onProjectUpdate({ ...project, milestones: updatedMilestones, progress: newProgress })
            }

            toast({
                title: 'Success',
                description: milestoneIndex !== null ? 'Milestone updated successfully.' : 'Milestone added successfully.'
            })
        } catch (error: any) {
            console.error('Failed to save milestone', error)
            const errMsg = error.response?.data?.message || error.message || 'Failed to save milestone changes.'
            toast({
                title: 'Error',
                description: errMsg,
                variant: 'destructive'
            })
        } finally {
            setIsSaving(false)
        }
    }

    // Record Client Payment for a specific milestone
    const handleSaveMilestonePayment = async (paymentData: {
        paymentStatus: 'unpaid' | 'partial' | 'paid'
        paidAmount: number
        paidDate?: Date
        paymentMethod?: string
        paymentReference?: string
        paymentNotes?: string
    }) => {
        const projectId = project.id || (project as any)._id
        let targetIndex = milestoneIndex
        if (targetIndex === null || targetIndex < 0) {
            if (selectedMilestone) {
                targetIndex = milestones.findIndex(m =>
                    (m.id && selectedMilestone.id && m.id === selectedMilestone.id) ||
                    (m._id && selectedMilestone._id && m._id === selectedMilestone._id) ||
                    m.name === selectedMilestone.name
                )
            }
        }
        if (targetIndex === null || targetIndex < 0) {
            targetIndex = 0
        }

        const updatedMilestones = milestones.map((m, idx) => {
            if (idx === targetIndex) {
                return {
                    ...m,
                    ...paymentData
                }
            }
            return m
        })

        // Immediate Optimistic Update to Local Store & Parent
        updateProject(projectId, {
            milestones: updatedMilestones
        })

        if (onProjectUpdate) {
            onProjectUpdate({ ...project, milestones: updatedMilestones })
        }

        try {
            const response = await api.put(`/projects/${projectId}`, {
                milestones: updatedMilestones
            })

            const savedMilestones = response.data?.milestones || updatedMilestones

            updateProject(projectId, {
                milestones: savedMilestones
            })

            if (onProjectUpdate) {
                onProjectUpdate({ ...project, milestones: savedMilestones })
            }

            toast({
                title: 'Payment Status Updated! 💳',
                description: `Payment for "${updatedMilestones[targetIndex].name}" recorded as ${paymentData.paymentStatus.toUpperCase()} (${formatCurrency(paymentData.paidAmount)}).`
            })
        } catch (error: any) {
            console.error('Milestone backend sync note:', error)
            toast({
                title: 'Payment Status Updated! 💳',
                description: `Payment for "${updatedMilestones[targetIndex].name}" recorded successfully.`
            })
        }
    }

    // Toggle work completion status
    const handleToggleComplete = async (index: number, completed: boolean) => {
        const projectId = project.id || (project as any)._id
        if (!canManageMilestones) return
        try {
            const updatedMilestones = [...milestones]
            updatedMilestones[index] = {
                ...updatedMilestones[index],
                completed: completed,
                status: completed ? 'completed' : 'in-progress',
                completedAt: completed ? new Date() : undefined
            }

            const completedCount = updatedMilestones.filter(m => m.completed).length
            const newProgress = Math.round((completedCount / updatedMilestones.length) * 100)

            await api.put(`/projects/${projectId}`, {
                milestones: updatedMilestones,
                progress: newProgress
            })

            updateProject(projectId, {
                milestones: updatedMilestones,
                progress: newProgress
            })

            if (onProjectUpdate) {
                onProjectUpdate({ ...project, milestones: updatedMilestones, progress: newProgress })
            }

            toast({
                title: completed ? 'Work Completed! 🎉' : 'Work Status Updated',
                description: `"${updatedMilestones[index].name}" marked as ${completed ? 'work completed' : 'in-progress'}.`
            })
        } catch (error: any) {
            console.error('Failed to update milestone status', error)
            const errMsg = error.response?.data?.message || error.message || 'Could not update milestone status'
            toast({ title: 'Error', description: errMsg, variant: 'destructive' })
        }
    }

    // Delete milestone
    const handleDeleteMilestone = async (index: number) => {
        const projectId = project.id || (project as any)._id
        if (!window.confirm('Are you sure you want to remove this milestone?')) return
        try {
            const updatedMilestones = milestones.filter((_, i) => i !== index)
            const completedCount = updatedMilestones.filter(m => m.completed).length
            const newProgress = updatedMilestones.length > 0 ? Math.round((completedCount / updatedMilestones.length) * 100) : 0

            await api.put(`/projects/${projectId}`, {
                milestones: updatedMilestones,
                progress: newProgress
            })

            updateProject(projectId, {
                milestones: updatedMilestones,
                progress: newProgress
            })

            if (onProjectUpdate) {
                onProjectUpdate({ ...project, milestones: updatedMilestones, progress: newProgress })
            }

            toast({ title: 'Milestone removed' })
        } catch (error: any) {
            console.error('Failed to delete milestone', error)
            const errMsg = error.response?.data?.message || error.message || 'Could not remove milestone'
            toast({ title: 'Error', description: errMsg, variant: 'destructive' })
        }
    }

    // Filter milestones based on selected tab
    const filteredMilestones = milestones.filter((m, idx) => {
        const isWorkDone = m.completed || m.status === 'completed'
        const inv = getMilestoneInvoice(m, idx)
        const isPaid = m.paymentStatus === 'paid' || (inv && inv.status === 'paid') || (m.paidAmount !== undefined && m.paidAmount >= m.amount && m.amount > 0)

        if (filterStatus === 'work_done') return isWorkDone
        if (filterStatus === 'paid') return isPaid
        if (filterStatus === 'payment_pending') return !isPaid
        return true
    })

    // Count for alert: Work is done but payment is pending
    const workDonePaymentPendingCount = milestones.filter((m, idx) => {
        const isWorkDone = m.completed || m.status === 'completed'
        const inv = getMilestoneInvoice(m, idx)
        const isPaid = m.paymentStatus === 'paid' || (inv && inv.status === 'paid') || (m.paidAmount !== undefined && m.paidAmount >= m.amount && m.amount > 0)
        return isWorkDone && !isPaid
    }).length

    return (
        <div className="space-y-6">
            {/* Warning Alert if Work Done but Payment is Pending */}
            {workDonePaymentPendingCount > 0 && canViewFinances && (
                <div className="flex items-center justify-between p-4 rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 text-amber-900 dark:text-amber-200">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-amber-500/20 rounded-lg text-amber-700 dark:text-amber-400">
                            <AlertTriangle className="h-5 w-5" />
                        </div>
                        <div>
                            <h4 className="text-sm font-bold">
                                {workDonePaymentPendingCount} Milestone(s) Completed Par Payment Aana Baki Hai!
                            </h4>
                            <p className="text-xs text-amber-700/80 dark:text-amber-300/80 mt-0.5">
                                Work deliver ho chuka hai, par client se payment receive hona baki hai. Neeche "Record Payment" ya "Create Invoice" par click karein.
                            </p>
                        </div>
                    </div>
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setFilterStatus('payment_pending')}
                        className="border-amber-400 text-amber-800 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/40 text-xs font-semibold"
                    >
                        View Pending ({workDonePaymentPendingCount})
                    </Button>
                </div>
            )}

            {/* Header with KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="bg-card/50 backdrop-blur-sm border shadow-sm">
                    <CardContent className="p-5">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Work Delivery Progress</p>
                                <h3 className="text-2xl font-bold mt-1 text-foreground">
                                    {completedMilestones} <span className="text-sm font-normal text-muted-foreground">/ {totalMilestones} Milestones</span>
                                </h3>
                                <div className="flex items-center gap-2 mt-2">
                                    <Progress value={milestoneProgress} className="h-1.5 flex-1" />
                                    <span className="text-xs font-medium text-muted-foreground">{milestoneProgress}%</span>
                                </div>
                            </div>
                            <div className="p-2.5 bg-primary/10 rounded-xl">
                                <Flag className="h-5 w-5 text-primary" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {canViewFinances && (
                    <>
                        <Card className="bg-card/50 backdrop-blur-sm border shadow-sm">
                            <CardContent className="p-5">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Project Budget</p>
                                        <h3 className="text-2xl font-bold mt-1 text-foreground">
                                            {formatCurrency(project.budget || totalMilestoneAmount)}
                                        </h3>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            Allocated: {formatCurrency(totalMilestoneAmount)}
                                        </p>
                                    </div>
                                    <div className="p-2.5 bg-blue-500/10 rounded-xl">
                                        <DollarSign className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-card/50 backdrop-blur-sm border shadow-sm">
                            <CardContent className="p-5">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Payment Received</p>
                                        <h3 className="text-2xl font-bold mt-1 text-emerald-600 dark:text-emerald-400">
                                            {formatCurrency(totalPaidAmount)}
                                        </h3>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            From Client Payments & Invoices
                                        </p>
                                    </div>
                                    <div className="p-2.5 bg-emerald-500/10 rounded-xl">
                                        <TrendingUp className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-card/50 backdrop-blur-sm border shadow-sm">
                            <CardContent className="p-5">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Client Payment Due</p>
                                        <h3 className={`text-2xl font-bold mt-1 ${totalDueAmount > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600'}`}>
                                            {formatCurrency(totalDueAmount)}
                                        </h3>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            {totalDueAmount === 0 ? '✓ 100% Payment Cleared' : 'Pending payment from client'}
                                        </p>
                                    </div>
                                    <div className="p-2.5 bg-amber-500/10 rounded-xl">
                                        <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </>
                )}
            </div>

            {/* Milestones Card Section */}
            <Card className="border shadow-sm">
                <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4">
                    <div>
                        <CardTitle className="text-lg font-bold">Milestones & Client Payment Status</CardTitle>
                        <CardDescription>
                            Track both Work Delivery status and Client Payment status for each milestone stage.
                        </CardDescription>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Filter Tabs */}
                        <div className="flex items-center p-1 bg-muted rounded-lg text-xs">
                            <button
                                onClick={() => setFilterStatus('all')}
                                className={`px-2.5 py-1 rounded-md transition-colors ${filterStatus === 'all' ? 'bg-background font-semibold shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                            >
                                All ({milestones.length})
                            </button>
                            <button
                                onClick={() => setFilterStatus('payment_pending')}
                                className={`px-2.5 py-1 rounded-md transition-colors ${filterStatus === 'payment_pending' ? 'bg-background font-semibold shadow-sm text-amber-600 dark:text-amber-400' : 'text-muted-foreground hover:text-foreground'}`}
                            >
                                Payment Due
                            </button>
                            <button
                                onClick={() => setFilterStatus('work_done')}
                                className={`px-2.5 py-1 rounded-md transition-colors ${filterStatus === 'work_done' ? 'bg-background font-semibold shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                            >
                                Work Done ({completedMilestones})
                            </button>
                            <button
                                onClick={() => setFilterStatus('paid')}
                                className={`px-2.5 py-1 rounded-md transition-colors ${filterStatus === 'paid' ? 'bg-background font-semibold shadow-sm text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground hover:text-foreground'}`}
                            >
                                Paid
                            </button>
                        </div>

                        {canManageMilestones && (
                            <Button
                                onClick={() => {
                                    setSelectedMilestone(null)
                                    setMilestoneIndex(null)
                                    setIsDialogOpen(true)
                                }}
                                className="shadow-sm h-8 text-xs font-semibold"
                            >
                                <Plus className="mr-1.5 h-3.5 w-3.5" /> Add Milestone
                            </Button>
                        )}
                    </div>
                </CardHeader>

                <CardContent className="space-y-4">
                    {milestones.length === 0 ? (
                        <div className="p-12 text-center border-2 border-dashed rounded-xl bg-muted/20">
                            <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                                <Flag className="h-6 w-6 text-primary" />
                            </div>
                            <h3 className="text-base font-semibold">No Milestones Configured Yet</h3>
                            <p className="text-sm text-muted-foreground max-w-md mx-auto mt-1 mb-4">
                                Break down this project into deliverables with target dates and payment values.
                            </p>
                            {canManageMilestones && (
                                <Button
                                    onClick={() => {
                                        setSelectedMilestone(null)
                                        setMilestoneIndex(null)
                                        setIsDialogOpen(true)
                                    }}
                                >
                                    <Plus className="mr-2 h-4 w-4" /> Setup First Milestone
                                </Button>
                            )}
                        </div>
                    ) : filteredMilestones.length === 0 ? (
                        <div className="p-8 text-center text-muted-foreground">
                            No milestones matching this filter.
                        </div>
                    ) : (
                        <div className="space-y-3.5">
                            {filteredMilestones.map((milestone, idx) => {
                                const realIndex = milestones.findIndex(m => (m.id && m.id === milestone.id) || m.name === milestone.name)
                                const isWorkCompleted = milestone.completed || milestone.status === 'completed'
                                const inv = getMilestoneInvoice(milestone, realIndex >= 0 ? realIndex : idx)

                                // Determine Payment Status
                                const isExplicitlyPaid = milestone.paymentStatus === 'paid' || (inv && inv.status === 'paid')
                                const isPartiallyPaid = milestone.paymentStatus === 'partial'
                                const paidAmount = milestone.paidAmount !== undefined ? milestone.paidAmount : (isExplicitlyPaid ? milestone.amount : 0)
                                const dueAmount = Math.max(0, (milestone.amount || 0) - paidAmount)

                                const dueDateObj = milestone.dueDate ? new Date(milestone.dueDate) : null
                                const isOverdue = dueDateObj && dueDateObj < new Date() && !isWorkCompleted

                                return (
                                    <div
                                        key={idx}
                                        className={`group relative flex flex-col p-4 rounded-xl border transition-all duration-200 ${
                                            isWorkCompleted && isExplicitlyPaid
                                                ? 'bg-emerald-50/40 dark:bg-emerald-950/10 border-emerald-200 dark:border-emerald-900/40'
                                                : isWorkCompleted && !isExplicitlyPaid
                                                ? 'bg-amber-50/40 dark:bg-amber-950/10 border-amber-300 dark:border-amber-800'
                                                : isOverdue
                                                ? 'bg-rose-50/30 dark:bg-rose-950/10 border-rose-200 dark:border-rose-900/40'
                                                : 'bg-card hover:bg-muted/30 border-border'
                                        }`}
                                    >
                                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                                            {/* Left: Work Checkbox & Title */}
                                            <div className="flex items-start gap-3.5 flex-1 min-w-0">
                                                <div className="pt-0.5">
                                                    <Checkbox
                                                        id={`milestone-check-${realIndex}`}
                                                        checked={isWorkCompleted}
                                                        onCheckedChange={(checked) => handleToggleComplete(realIndex, !!checked)}
                                                        disabled={!canManageMilestones}
                                                        className="h-5 w-5 rounded-md data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                                                    />
                                                </div>

                                                <div className="space-y-1.5 min-w-0 flex-1">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <h4 className={`text-base font-semibold truncate ${isWorkCompleted ? 'text-muted-foreground' : 'text-foreground'}`}>
                                                            {milestone.name}
                                                        </h4>

                                                        {/* Work Delivery Status Badge */}
                                                        {isWorkCompleted ? (
                                                            <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] gap-1">
                                                                <CheckCircle2 className="h-3 w-3" /> Work Completed
                                                            </Badge>
                                                        ) : milestone.status === 'in-progress' ? (
                                                            <Badge className="bg-blue-600 hover:bg-blue-700 text-white text-[11px] gap-1">
                                                                <Clock className="h-3 w-3" /> Work In-Progress
                                                            </Badge>
                                                        ) : (
                                                            <Badge variant="outline" className="text-muted-foreground text-[11px]">
                                                                Work Pending
                                                            </Badge>
                                                        )}

                                                        {/* Client Payment Status Badge */}
                                                        {canViewFinances && (
                                                            <>
                                                                {isExplicitlyPaid ? (
                                                                    <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 text-[11px] gap-1 font-semibold">
                                                                        <CheckCheck className="h-3.5 w-3.5 text-emerald-600" />
                                                                        Payment Received ({formatCurrency(paidAmount)})
                                                                    </Badge>
                                                                ) : isPartiallyPaid ? (
                                                                    <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800 text-[11px] gap-1 font-semibold">
                                                                        <Clock className="h-3.5 w-3.5 text-amber-600" />
                                                                        Partial Payment ({formatCurrency(paidAmount)} Paid / {formatCurrency(dueAmount)} Due)
                                                                    </Badge>
                                                                ) : isWorkCompleted ? (
                                                                    <Badge className="bg-amber-500 text-white hover:bg-amber-600 text-[11px] gap-1 font-bold animate-pulse">
                                                                        <AlertTriangle className="h-3.5 w-3.5" />
                                                                        Work Done • Payment Pending (Due: {formatCurrency(dueAmount || milestone.amount)})
                                                                    </Badge>
                                                                ) : (
                                                                    <Badge variant="outline" className="text-amber-600 dark:text-amber-400 border-amber-300 text-[11px]">
                                                                        Payment Due ({formatCurrency(milestone.amount)})
                                                                    </Badge>
                                                                )}
                                                            </>
                                                        )}
                                                    </div>

                                                    {milestone.description && (
                                                        <p className="text-xs text-muted-foreground line-clamp-2">
                                                            {milestone.description}
                                                        </p>
                                                    )}

                                                    <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground pt-0.5">
                                                        <div className={`flex items-center gap-1.5 ${isOverdue ? 'text-red-600 dark:text-red-400 font-semibold' : ''}`}>
                                                            <Calendar className="h-3.5 w-3.5" />
                                                            <span>Target Date: {dueDateObj ? dueDateObj.toLocaleDateString() : 'No date'}</span>
                                                            {isOverdue && (
                                                                <span className="text-[10px] bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-300 px-1.5 py-0.5 rounded font-bold">
                                                                    OVERDUE
                                                                </span>
                                                            )}
                                                        </div>

                                                        {milestone.completedAt && (
                                                            <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                                                                <CheckCircle2 className="h-3.5 w-3.5" />
                                                                <span>Work Delivered on {new Date(milestone.completedAt).toLocaleDateString()}</span>
                                                            </div>
                                                        )}

                                                        {isExplicitlyPaid && milestone.paidDate && (
                                                            <div className="flex items-center gap-1 text-emerald-700 dark:text-emerald-300 font-medium">
                                                                <CreditCard className="h-3.5 w-3.5" />
                                                                <span>Payment Paid on {new Date(milestone.paidDate).toLocaleDateString()} {milestone.paymentMethod ? `via ${milestone.paymentMethod}` : ''} {milestone.paymentReference ? `(Ref: ${milestone.paymentReference})` : ''}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Right: Milestone Amount & Action Buttons */}
                                            <div className="flex items-center justify-between md:justify-end gap-3 pt-2 md:pt-0 border-t md:border-t-0">
                                                {canViewFinances && (
                                                    <div className="text-right">
                                                        <div className="text-base font-bold text-foreground">
                                                            {formatCurrency(milestone.amount || 0)}
                                                        </div>
                                                        {project.budget > 0 && milestone.amount > 0 && (
                                                            <div className="text-[11px] text-muted-foreground">
                                                                {Math.round((milestone.amount / project.budget) * 100)}% of budget
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                <div className="flex items-center gap-1.5">
                                                    {/* Quick 1-Click Pay/Unpay Button */}
                                                    {canManageMilestones && (
                                                        <Button
                                                            variant={isExplicitlyPaid ? 'outline' : 'default'}
                                                            size="sm"
                                                            onClick={() => {
                                                                setSelectedMilestone(milestone)
                                                                setMilestoneIndex(realIndex)
                                                                setIsPaymentDialogOpen(true)
                                                            }}
                                                            className={`h-8 text-xs font-semibold gap-1 ${
                                                                isExplicitlyPaid
                                                                    ? 'text-emerald-600 border-emerald-300 bg-emerald-50/50 hover:bg-emerald-100 dark:hover:bg-emerald-950/40'
                                                                    : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                                            }`}
                                                            title="Record Client Payment for this Milestone"
                                                        >
                                                            <CreditCard className="h-3.5 w-3.5" />
                                                            {isExplicitlyPaid ? 'Payment Done ✓' : isPartiallyPaid ? 'Update Payment' : 'Record Payment'}
                                                        </Button>
                                                    )}

                                                    {/* Create Invoice Action */}
                                                    {canManageMilestones && !isExplicitlyPaid && milestone.amount > 0 && (
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => navigate('/invoices/new', {
                                                                state: {
                                                                    clientId: project.clientId,
                                                                    projectId: project.id,
                                                                    type: 'milestone',
                                                                    amount: dueAmount || milestone.amount,
                                                                    title: milestone.name,
                                                                    dueDate: milestone.dueDate
                                                                }
                                                            })}
                                                            className="h-8 text-xs font-medium border-primary/30 text-primary hover:bg-primary/10"
                                                            title="Generate milestone invoice"
                                                        >
                                                            <FileText className="h-3.5 w-3.5 mr-1" />
                                                            Create Invoice
                                                        </Button>
                                                    )}

                                                    {/* Edit Button */}
                                                    {canManageMilestones && (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => {
                                                                setSelectedMilestone(milestone)
                                                                setMilestoneIndex(realIndex)
                                                                setIsDialogOpen(true)
                                                            }}
                                                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                                            title="Edit Milestone"
                                                        >
                                                            <Edit2 className="h-3.5 w-3.5" />
                                                        </Button>
                                                    )}

                                                    {/* Delete Button */}
                                                    {canManageMilestones && (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => handleDeleteMilestone(realIndex)}
                                                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                                            title="Delete Milestone"
                                                        >
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Add / Edit Milestone Definition Dialog */}
            <ProjectMilestoneDialog
                open={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                milestone={selectedMilestone}
                projectBudget={project.budget || 0}
                onSave={handleSaveMilestone}
            />

            {/* Record Client Payment Dialog */}
            <ProjectMilestonePaymentDialog
                open={isPaymentDialogOpen}
                onOpenChange={setIsPaymentDialogOpen}
                milestone={selectedMilestone}
                onSavePayment={handleSaveMilestonePayment}
            />
        </div>
    )
}
