import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Checkbox } from '@/components/ui/checkbox'
import {
    Plus, Flag, Calendar, DollarSign, CheckCircle2, Clock,
    AlertCircle, Edit2, Trash2, FileText, TrendingUp,
    CreditCard, CheckCheck, AlertTriangle,
    Sparkles, Zap, ChevronRight, Layers
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { ProjectMilestoneDialog } from './project-milestone-dialog'
import { ProjectMilestonePaymentDialog } from './project-milestone-payment-dialog'
import { ProjectBulkMilestonesDialog } from './project-bulk-milestones-dialog'
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
    const [isBulkDialogOpen, setIsBulkDialogOpen] = useState(false)
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

    // Save multiple milestones at once (Bulk Add)
    const handleSaveBulkMilestones = async (newMilestones: Partial<Milestone>[]) => {
        const projectId = project.id || (project as any)._id
        setIsSaving(true)
        try {
            const formattedNew: Milestone[] = newMilestones.map((m, i) => ({
                id: 'm_' + (Date.now() + i),
                name: m.name || `Milestone ${i + 1}`,
                amount: m.amount || 0,
                paymentStatus: 'unpaid',
                paidAmount: 0,
                status: 'pending',
                completed: false,
                ...m
            } as Milestone))
            const updatedMilestones: Milestone[] = [...milestones, ...formattedNew]

            const completedCount = updatedMilestones.filter(m => m.completed || m.status === 'completed').length
            const newProgress = updatedMilestones.length > 0 ? Math.round((completedCount / updatedMilestones.length) * 100) : project.progress

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
                title: 'Success! 🚀',
                description: `${newMilestones.length} milestones created successfully.`
            })
        } catch (error: any) {
            console.error('Failed to save bulk milestones', error)
            toast({
                title: 'Error',
                description: error.response?.data?.message || 'Failed to save milestones.',
                variant: 'destructive'
            })
        } finally {
            setIsSaving(false)
        }
    }

    // 1-Click Preset Setup
    const handleApplyPreset = async (presetType: 'standard' | 'web' | 'app') => {
        const budget = project.budget || 100000
        const projectId = project.id || (project as any)._id

        let presetMilestones: Milestone[] = []

        if (presetType === 'standard') {
            presetMilestones = [
                { id: 'm_1', name: 'Milestone 1: Project Setup & Advance Payment', amount: Math.round(budget * 0.30), completed: false, status: 'in-progress', paymentStatus: 'unpaid' },
                { id: 'm_2', name: 'Milestone 2: Beta Development & Feature Demo', amount: Math.round(budget * 0.40), completed: false, status: 'pending', paymentStatus: 'unpaid' },
                { id: 'm_3', name: 'Milestone 3: Final Delivery & Live Launch', amount: Math.round(budget * 0.30), completed: false, status: 'pending', paymentStatus: 'unpaid' }
            ]
        } else if (presetType === 'web') {
            presetMilestones = [
                { id: 'm_1', name: 'Milestone 1: UI/UX Wireframes & Design Approval', amount: Math.round(budget * 0.25), completed: false, status: 'in-progress', paymentStatus: 'unpaid' },
                { id: 'm_2', name: 'Milestone 2: Frontend & Backend Coding', amount: Math.round(budget * 0.50), completed: false, status: 'pending', paymentStatus: 'unpaid' },
                { id: 'm_3', name: 'Milestone 3: Deployment & Go-Live', amount: Math.round(budget * 0.25), completed: false, status: 'pending', paymentStatus: 'unpaid' }
            ]
        } else if (presetType === 'app') {
            presetMilestones = [
                { id: 'm_1', name: 'Milestone 1: App Architecture & API Contracts', amount: Math.round(budget * 0.20), completed: false, status: 'in-progress', paymentStatus: 'unpaid' },
                { id: 'm_2', name: 'Milestone 2: Core App Features & Integrations', amount: Math.round(budget * 0.50), completed: false, status: 'pending', paymentStatus: 'unpaid' },
                { id: 'm_3', name: 'Milestone 3: PlayStore & AppStore Submission', amount: Math.round(budget * 0.30), completed: false, status: 'pending', paymentStatus: 'unpaid' }
            ]
        }

        try {
            await api.put(`/projects/${projectId}`, { milestones: presetMilestones, progress: 0 })
            updateProject(projectId, { milestones: presetMilestones, progress: 0 })
            if (onProjectUpdate) onProjectUpdate({ ...project, milestones: presetMilestones, progress: 0 })
            toast({
                title: 'Preset Loaded! ⚡',
                description: `3-stage milestone workflow has been configured for this project.`
            })
        } catch (err) {
            toast({ title: 'Failed to load preset', variant: 'destructive' })
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

        updateProject(projectId, { milestones: updatedMilestones })
        if (onProjectUpdate) onProjectUpdate({ ...project, milestones: updatedMilestones })

        try {
            const response = await api.put(`/projects/${projectId}`, { milestones: updatedMilestones })
            const savedMilestones = response.data?.milestones || updatedMilestones
            updateProject(projectId, { milestones: savedMilestones })
            if (onProjectUpdate) onProjectUpdate({ ...project, milestones: savedMilestones })

            toast({
                title: 'Payment Status Updated! 💳',
                description: `Payment for "${updatedMilestones[targetIndex].name}" recorded as ${paymentData.paymentStatus.toUpperCase()}.`
            })
        } catch (error: any) {
            toast({
                title: 'Payment Status Updated! 💳',
                description: `Payment recorded successfully.`
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
                description: `"${updatedMilestones[index].name}" marked as ${completed ? 'completed' : 'in-progress'}.`
            })
        } catch (error: any) {
            console.error('Failed to update milestone status', error)
            toast({ title: 'Error', description: 'Could not update milestone status', variant: 'destructive' })
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
            toast({ title: 'Error', description: 'Could not remove milestone', variant: 'destructive' })
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

    // Warning Count: Work done but payment pending
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
                <div className="flex items-center justify-between p-4 rounded-2xl border border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 text-amber-900 dark:text-amber-200 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-amber-500/20 rounded-xl text-amber-700 dark:text-amber-400">
                            <AlertTriangle className="h-5 w-5" />
                        </div>
                        <div>
                            <h4 className="text-sm font-bold">
                                {currentUser?.role === 'client'
                                    ? `Payment Pending for ${workDonePaymentPendingCount} Delivered Milestone(s)`
                                    : `${workDonePaymentPendingCount} Milestone(s) Delivered - Payment Pending`}
                            </h4>
                            <p className="text-xs text-amber-700/80 dark:text-amber-300/80 mt-0.5 font-medium">
                                {currentUser?.role === 'client'
                                    ? "Work for this milestone is complete. Please complete the pending payment."
                                    : "Work is completed. Pending payment collection from client."}
                            </p>
                        </div>
                    </div>
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setFilterStatus('payment_pending')}
                        className="border-amber-400 text-amber-800 dark:text-amber-200 hover:bg-amber-100 text-xs font-bold"
                    >
                        View Pending ({workDonePaymentPendingCount})
                    </Button>
                </div>
            )}

            {/* Visual Milestone Pipeline Stepper (Horizontal Progress Flow) */}
            {milestones.length > 0 && (
                <Card className="border border-border/60 bg-gradient-to-r from-card via-card to-primary/5 shadow-sm overflow-hidden">
                    <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Zap className="h-4 w-4 text-primary" />
                                <CardTitle className="text-sm font-bold tracking-tight">Milestone Delivery Pipeline</CardTitle>
                            </div>
                            <span className="text-xs font-bold text-primary bg-primary/10 px-2.5 py-0.5 rounded-full">
                                {completedMilestones} of {totalMilestones} Delivered ({milestoneProgress}%)
                            </span>
                        </div>
                    </CardHeader>
                    <CardContent className="pt-2 pb-4 overflow-x-auto">
                        <div className="flex items-center gap-2 min-w-[500px]">
                            {milestones.map((m, idx) => {
                                const isDone = m.completed || m.status === 'completed'
                                const isInProgress = m.status === 'in-progress'

                                return (
                                    <div key={idx} className="flex-1 flex items-center gap-2">
                                        <div className={`flex items-center gap-2 p-2.5 rounded-xl border flex-1 transition-all ${
                                            isDone 
                                                ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-700 dark:text-emerald-300' 
                                                : isInProgress 
                                                ? 'bg-blue-500/10 border-blue-500/40 text-blue-700 dark:text-blue-300 shadow-sm ring-1 ring-blue-400/40' 
                                                : 'bg-muted/40 border-border/60 text-muted-foreground'
                                        }`}>
                                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${
                                                isDone 
                                                    ? 'bg-emerald-500 text-white' 
                                                    : isInProgress 
                                                    ? 'bg-blue-500 text-white animate-pulse' 
                                                    : 'bg-muted-foreground/20 text-muted-foreground'
                                            }`}>
                                                {isDone ? <CheckCircle2 className="h-3.5 w-3.5" /> : idx + 1}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="text-xs font-bold truncate">{m.name}</p>
                                                <p className="text-[10px] opacity-80 font-semibold">{formatCurrency(m.amount || 0)}</p>
                                            </div>
                                        </div>
                                        {idx < milestones.length - 1 && (
                                            <ChevronRight className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* KPI Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="bg-card border border-border/60 shadow-xs">
                    <CardContent className="p-4">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Work Progress</p>
                                <h3 className="text-xl font-black mt-1 text-foreground">
                                    {completedMilestones} <span className="text-xs font-semibold text-muted-foreground">/ {totalMilestones} Done</span>
                                </h3>
                                <div className="flex items-center gap-2 mt-2">
                                    <Progress value={milestoneProgress} className="h-1.5 flex-1" />
                                    <span className="text-xs font-bold text-primary">{milestoneProgress}%</span>
                                </div>
                            </div>
                            <div className="p-2.5 bg-primary/10 rounded-xl text-primary">
                                <Flag className="h-5 w-5" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {canViewFinances && (
                    <>
                        <Card className="bg-card border border-border/60 shadow-xs">
                            <CardContent className="p-4">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Total Budget</p>
                                        <h3 className="text-xl font-black mt-1 text-foreground">
                                            {formatCurrency(project.budget || totalMilestoneAmount)}
                                        </h3>
                                        <p className="text-[10px] text-muted-foreground mt-1 font-semibold">
                                            Milestones Total: {formatCurrency(totalMilestoneAmount)}
                                        </p>
                                    </div>
                                    <div className="p-2.5 bg-blue-500/10 rounded-xl text-blue-600">
                                        <DollarSign className="h-5 w-5" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-card border border-border/60 shadow-xs">
                            <CardContent className="p-4">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                                            {currentUser?.role === 'client' ? 'Total Paid' : 'Payment Received'}
                                        </p>
                                        <h3 className="text-xl font-black mt-1 text-emerald-600 dark:text-emerald-400">
                                            {formatCurrency(totalPaidAmount)}
                                        </h3>
                                        <p className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-1 font-semibold">
                                            {currentUser?.role === 'client' ? 'Paid to date' : 'Collected from client'}
                                        </p>
                                    </div>
                                    <div className="p-2.5 bg-emerald-500/10 rounded-xl text-emerald-600">
                                        <TrendingUp className="h-5 w-5" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-card border border-border/60 shadow-xs">
                            <CardContent className="p-4">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                                            {currentUser?.role === 'client' ? 'Outstanding Balance' : 'Payment Due'}
                                        </p>
                                        <h3 className={`text-xl font-black mt-1 ${totalDueAmount > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600'}`}>
                                            {formatCurrency(totalDueAmount)}
                                        </h3>
                                        <p className="text-[10px] text-muted-foreground mt-1 font-semibold">
                                            {totalDueAmount === 0
                                                ? '✓ Fully Cleared'
                                                : (currentUser?.role === 'client' ? 'Payment remaining' : 'Pending collection')}
                                        </p>
                                    </div>
                                    <div className="p-2.5 bg-amber-500/10 rounded-xl text-amber-600">
                                        <AlertCircle className="h-5 w-5" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </>
                )}
            </div>

            {/* Quick Setup Presets Bar (If Milestones List is Empty or Low) */}
            {canManageMilestones && milestones.length === 0 && (
                <div className="p-4 rounded-2xl bg-gradient-to-r from-primary/10 via-purple-500/10 to-blue-500/10 border border-primary/30 space-y-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Sparkles className="h-4 w-4 text-primary" />
                            <h4 className="text-xs font-bold uppercase tracking-wider text-primary">1-Click Quick Preset Setup</h4>
                        </div>
                        <span className="text-[10px] text-muted-foreground font-semibold">Auto-calculate percentage & stages</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                        <button
                            onClick={() => handleApplyPreset('standard')}
                            className="p-3 bg-card hover:bg-primary/5 rounded-xl border border-border/60 hover:border-primary/40 text-left transition-all group"
                        >
                            <div className="font-bold text-xs text-foreground group-hover:text-primary">🚀 Standard 3-Stage Workflow</div>
                            <div className="text-[10px] text-muted-foreground mt-0.5">30% Advance • 40% Beta Demo • 30% Launch</div>
                        </button>

                        <button
                            onClick={() => handleApplyPreset('web')}
                            className="p-3 bg-card hover:bg-primary/5 rounded-xl border border-border/60 hover:border-primary/40 text-left transition-all group"
                        >
                            <div className="font-bold text-xs text-foreground group-hover:text-primary">🌐 Web Redesign Project</div>
                            <div className="text-[10px] text-muted-foreground mt-0.5">25% UI Wireframes • 50% Coding • 25% Go-Live</div>
                        </button>

                        <button
                            onClick={() => handleApplyPreset('app')}
                            className="p-3 bg-card hover:bg-primary/5 rounded-xl border border-border/60 hover:border-primary/40 text-left transition-all group"
                        >
                            <div className="font-bold text-xs text-foreground group-hover:text-primary">📱 Mobile App Build</div>
                            <div className="text-[10px] text-muted-foreground mt-0.5">20% Architecture • 50% Features • 30% Store Launch</div>
                        </button>
                    </div>
                </div>
            )}

            {/* Milestones Card List */}
            <Card className="border border-border/60 shadow-sm">
                <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4">
                    <div>
                        <CardTitle className="text-lg font-bold">
                            {currentUser?.role === 'client' ? 'Project Milestones & Payment Schedule' : 'Project Milestones & Delivery Checklist'}
                        </CardTitle>
                        <CardDescription className="text-xs font-medium">
                            {currentUser?.role === 'client'
                                ? 'Track project delivery milestones and invoice payment status.'
                                : 'Manage work delivery checkpoints and client payment collection for each stage.'}
                        </CardDescription>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Filter Tabs */}
                        <div className="flex items-center p-1 bg-muted rounded-xl text-xs border border-border/40">
                            <button
                                onClick={() => setFilterStatus('all')}
                                className={`px-2.5 py-1 rounded-lg transition-colors font-semibold ${filterStatus === 'all' ? 'bg-background shadow-xs text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                            >
                                All ({milestones.length})
                            </button>
                            <button
                                onClick={() => setFilterStatus('payment_pending')}
                                className={`px-2.5 py-1 rounded-lg transition-colors font-semibold ${filterStatus === 'payment_pending' ? 'bg-background shadow-xs text-amber-600' : 'text-muted-foreground hover:text-foreground'}`}
                            >
                                Due
                            </button>
                            <button
                                onClick={() => setFilterStatus('work_done')}
                                className={`px-2.5 py-1 rounded-lg transition-colors font-semibold ${filterStatus === 'work_done' ? 'bg-background shadow-xs text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                            >
                                Done ({completedMilestones})
                            </button>
                            <button
                                onClick={() => setFilterStatus('paid')}
                                className={`px-2.5 py-1 rounded-lg transition-colors font-semibold ${filterStatus === 'paid' ? 'bg-background shadow-xs text-emerald-600' : 'text-muted-foreground hover:text-foreground'}`}
                            >
                                Paid
                            </button>
                        </div>

                        {canManageMilestones && (
                            <div className="flex items-center gap-2">
                                <Button
                                    onClick={() => setIsBulkDialogOpen(true)}
                                    variant="outline"
                                    className="h-8 text-xs font-bold border-primary/30 text-primary hover:bg-primary/5 gap-1"
                                >
                                    <Layers className="h-3.5 w-3.5" /> Bulk Create
                                </Button>
                                <Button
                                    onClick={() => {
                                        setSelectedMilestone(null)
                                        setMilestoneIndex(null)
                                        setIsDialogOpen(true)
                                    }}
                                    className="h-8 text-xs font-bold bg-primary text-primary-foreground shadow-xs gap-1"
                                >
                                    <Plus className="h-3.5 w-3.5" /> Add Milestone
                                </Button>
                            </div>
                        )}
                    </div>
                </CardHeader>

                <CardContent className="space-y-4">
                    {milestones.length === 0 ? (
                        <div className="p-10 text-center border-2 border-dashed rounded-2xl bg-muted/20">
                            <div className="mx-auto w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-3 text-primary">
                                <Flag className="h-6 w-6" />
                            </div>
                            <h3 className="text-base font-bold text-foreground">No Milestones Configured</h3>
                            <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1 mb-4 font-medium">
                                Create your first milestone or pick a 1-click preset above to organize deliverables & payment stages.
                            </p>
                            {canManageMilestones && (
                                <Button
                                    onClick={() => {
                                        setSelectedMilestone(null)
                                        setMilestoneIndex(null)
                                        setIsDialogOpen(true)
                                    }}
                                    className="font-bold text-xs"
                                >
                                    <Plus className="mr-1.5 h-4 w-4" /> Add Custom Milestone
                                </Button>
                            )}
                        </div>
                    ) : filteredMilestones.length === 0 ? (
                        <div className="p-8 text-center text-muted-foreground text-xs font-semibold">
                            No milestones matching this filter.
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {filteredMilestones.map((milestone, idx) => {
                                const realIndex = milestones.findIndex(m => (m.id && m.id === milestone.id) || m.name === milestone.name)
                                const isWorkCompleted = milestone.completed || milestone.status === 'completed'
                                const inv = getMilestoneInvoice(milestone, realIndex >= 0 ? realIndex : idx)

                                // Payment calculation
                                const isExplicitlyPaid = milestone.paymentStatus === 'paid' || (inv && inv.status === 'paid')
                                const isPartiallyPaid = milestone.paymentStatus === 'partial'
                                const paidAmount = milestone.paidAmount !== undefined ? milestone.paidAmount : (isExplicitlyPaid ? milestone.amount : 0)
                                const dueAmount = Math.max(0, (milestone.amount || 0) - paidAmount)

                                const dueDateObj = milestone.dueDate ? new Date(milestone.dueDate) : null
                                const isOverdue = dueDateObj && dueDateObj < new Date() && !isWorkCompleted

                                return (
                                    <div
                                        key={idx}
                                        className={`group relative flex flex-col p-4 rounded-2xl border transition-all ${
                                            isWorkCompleted && isExplicitlyPaid
                                                ? 'bg-emerald-500/5 border-emerald-500/40'
                                                : isWorkCompleted && !isExplicitlyPaid
                                                ? 'bg-amber-500/5 border-amber-500/40 shadow-xs'
                                                : isOverdue
                                                ? 'bg-red-500/5 border-red-500/40'
                                                : 'bg-card hover:bg-muted/30 border-border/60'
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
                                                        className="h-5 w-5 rounded-lg data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600 cursor-pointer"
                                                    />
                                                </div>

                                                <div className="space-y-1.5 min-w-0 flex-1">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground bg-muted px-2 py-0.5 rounded-md">
                                                            Stage {realIndex + 1}
                                                        </span>
                                                        <h4 className={`text-sm font-bold ${isWorkCompleted ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                                                            {milestone.name}
                                                        </h4>

                                                        {/* Work Status Badge */}
                                                        {isWorkCompleted ? (
                                                            <Badge className="bg-emerald-600 text-white text-[10px] font-bold gap-1">
                                                                <CheckCircle2 className="h-3 w-3" /> Work Completed
                                                            </Badge>
                                                        ) : milestone.status === 'in-progress' ? (
                                                            <Badge className="bg-blue-600 text-white text-[10px] font-bold gap-1">
                                                                <Clock className="h-3 w-3" /> In Progress
                                                            </Badge>
                                                        ) : (
                                                            <Badge variant="outline" className="text-muted-foreground text-[10px] font-bold">
                                                                Pending
                                                            </Badge>
                                                        )}

                                                        {/* Payment Status Badge */}
                                                        {canViewFinances && (
                                                            <>
                                                                {isExplicitlyPaid ? (
                                                                    <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-300 text-[10px] font-bold gap-1">
                                                                        <CheckCheck className="h-3.5 w-3.5" />
                                                                        Paid ({formatCurrency(paidAmount)})
                                                                    </Badge>
                                                                ) : isPartiallyPaid ? (
                                                                    <Badge className="bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-300 text-[10px] font-bold gap-1">
                                                                        <Clock className="h-3.5 w-3.5" />
                                                                        Partial ({formatCurrency(paidAmount)} / {formatCurrency(dueAmount)} Due)
                                                                    </Badge>
                                                                ) : isWorkCompleted ? (
                                                                    <Badge className="bg-amber-500 text-white text-[10px] font-bold gap-1 animate-pulse">
                                                                        <AlertTriangle className="h-3.5 w-3.5" />
                                                                        Work Done • Payment Due ({formatCurrency(dueAmount || milestone.amount)})
                                                                    </Badge>
                                                                ) : (
                                                                    <Badge variant="outline" className="text-amber-600 border-amber-300 text-[10px] font-bold">
                                                                        Payment Due ({formatCurrency(milestone.amount)})
                                                                    </Badge>
                                                                )}
                                                            </>
                                                        )}
                                                    </div>

                                                    {milestone.description && (
                                                        <p className="text-xs text-muted-foreground font-medium line-clamp-2">
                                                            {milestone.description}
                                                        </p>
                                                    )}

                                                    <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground pt-0.5 font-medium">
                                                        <div className={`flex items-center gap-1.5 ${isOverdue ? 'text-red-600 font-bold' : ''}`}>
                                                            <Calendar className="h-3.5 w-3.5" />
                                                            <span>Target Due: {dueDateObj ? dueDateObj.toLocaleDateString() : 'No date'}</span>
                                                            {isOverdue && (
                                                                <span className="text-[9px] bg-red-500/10 text-red-600 px-1.5 py-0.5 rounded-md font-extrabold uppercase">
                                                                    Overdue
                                                                </span>
                                                            )}
                                                        </div>

                                                        {milestone.completedAt && (
                                                            <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                                                                <CheckCircle2 className="h-3.5 w-3.5" />
                                                                <span>Delivered on {new Date(milestone.completedAt).toLocaleDateString()}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Right: Milestone Amount & Action Buttons */}
                                            <div className="flex items-center justify-between md:justify-end gap-3 pt-2 md:pt-0 border-t md:border-t-0 border-border/40">
                                                {canViewFinances && (
                                                    <div className="text-right pr-2">
                                                        <div className="text-base font-black text-foreground">
                                                            {formatCurrency(milestone.amount || 0)}
                                                        </div>
                                                        {project.budget > 0 && milestone.amount > 0 && (
                                                            <div className="text-[10px] text-muted-foreground font-semibold">
                                                                {Math.round((milestone.amount / project.budget) * 100)}% of budget
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                <div className="flex items-center gap-1.5">
                                                    {/* 1-Click Work Done Toggle Button */}
                                                    {canManageMilestones && (
                                                        <Button
                                                            variant={isWorkCompleted ? 'outline' : 'secondary'}
                                                            size="sm"
                                                            onClick={() => handleToggleComplete(realIndex, !isWorkCompleted)}
                                                            className={`h-8 text-xs font-bold gap-1 ${
                                                                isWorkCompleted 
                                                                    ? 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border-emerald-300' 
                                                                    : 'bg-primary/10 text-primary hover:bg-primary/20 border-primary/20'
                                                            }`}
                                                            title={isWorkCompleted ? "Click to reopen work" : "Click to mark work completed"}
                                                        >
                                                            <CheckCircle2 className="h-3.5 w-3.5" />
                                                            {isWorkCompleted ? 'Work Done ✓' : 'Mark Done'}
                                                        </Button>
                                                    )}

                                                    {/* Quick Record Payment Button */}
                                                    {canManageMilestones && (
                                                        <Button
                                                            variant={isExplicitlyPaid ? 'outline' : 'default'}
                                                            size="sm"
                                                            onClick={() => {
                                                                setSelectedMilestone(milestone)
                                                                setMilestoneIndex(realIndex)
                                                                setIsPaymentDialogOpen(true)
                                                            }}
                                                            className={`h-8 text-xs font-bold gap-1 ${
                                                                isExplicitlyPaid
                                                                    ? 'text-emerald-600 border-emerald-300 bg-emerald-50/50 hover:bg-emerald-100'
                                                                    : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                                                            }`}
                                                            title="Record Client Payment for this Milestone"
                                                        >
                                                            <CreditCard className="h-3.5 w-3.5" />
                                                            {isExplicitlyPaid ? 'Paid ✓' : isPartiallyPaid ? 'Update Pay' : 'Record Pay'}
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
                                                            className="h-8 text-xs font-bold border-primary/30 text-primary hover:bg-primary/10 gap-1"
                                                            title="Generate milestone invoice"
                                                        >
                                                            <FileText className="h-3.5 w-3.5" />
                                                            Invoice
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

            {/* Bulk Create Milestones Dialog */}
            <ProjectBulkMilestonesDialog
                open={isBulkDialogOpen}
                onOpenChange={setIsBulkDialogOpen}
                projectBudget={project.budget || 0}
                projectDeadline={project.deadline ? new Date(project.deadline).toISOString().split('T')[0] : ''}
                onSave={handleSaveBulkMilestones}
            />
        </div>
    )
}
