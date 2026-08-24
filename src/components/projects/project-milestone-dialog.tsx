import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { getCurrencySymbol, formatCurrency } from '@/lib/utils'
import type { Milestone } from '@/types'

interface ProjectMilestoneDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    milestone?: Milestone | null
    projectBudget: number
    onSave: (milestoneData: Partial<Milestone>) => Promise<void>
}

export function ProjectMilestoneDialog({
    open,
    onOpenChange,
    milestone,
    projectBudget,
    onSave
}: ProjectMilestoneDialogProps) {
    const [name, setName] = useState('')
    const [description, setDescription] = useState('')
    const [dueDate, setDueDate] = useState('')
    const [amount, setAmount] = useState('')
    const [status, setStatus] = useState<'pending' | 'in-progress' | 'completed'>('pending')
    const [paymentStatus, setPaymentStatus] = useState<'unpaid' | 'partial' | 'paid'>('unpaid')
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        if (milestone) {
            setName(milestone.name || '')
            setDescription(milestone.description || '')
            setDueDate(
                milestone.dueDate && !isNaN(new Date(milestone.dueDate).getTime())
                    ? new Date(milestone.dueDate).toISOString().split('T')[0]
                    : ''
            )
            setAmount(milestone.amount ? milestone.amount.toString() : '')
            setStatus(milestone.status || (milestone.completed ? 'completed' : 'pending'))
            setPaymentStatus(milestone.paymentStatus || (milestone.paidAmount && milestone.paidAmount >= milestone.amount ? 'paid' : milestone.paidAmount && milestone.paidAmount > 0 ? 'partial' : 'unpaid'))
        } else {
            setName('')
            setDescription('')
            setDueDate('')
            setAmount('')
            setStatus('pending')
            setPaymentStatus('unpaid')
        }
    }, [milestone, open])

    const numAmount = parseFloat(amount) || 0
    const percentage = projectBudget > 0 ? Math.round((numAmount / projectBudget) * 100) : 0

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!name.trim()) return

        setLoading(true)
        try {
            await onSave({
                name: name.trim(),
                description: description.trim(),
                dueDate: dueDate ? new Date(dueDate) : undefined,
                amount: numAmount,
                status: status,
                completed: status === 'completed',
                completedAt: status === 'completed' ? (milestone?.completedAt || new Date()) : undefined,
                paymentStatus: paymentStatus,
                paidAmount: paymentStatus === 'paid' ? numAmount : paymentStatus === 'unpaid' ? 0 : milestone?.paidAmount || 0,
                paidDate: paymentStatus === 'paid' ? (milestone?.paidDate || new Date()) : undefined
            })
            onOpenChange(false)
        } catch (error) {
            console.error('Failed to save milestone', error)
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>{milestone ? 'Edit Milestone' : 'Add Project Milestone'}</DialogTitle>
                        <DialogDescription>
                            Configure milestone deliverable timeline, target amount, and completion status.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="milestone-name">Milestone Title <span className="text-red-500">*</span></Label>
                            <Input
                                id="milestone-name"
                                placeholder="e.g. Milestone 1: UI/UX & High-fidelity Prototypes"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="milestone-amount">Milestone Amount ({getCurrencySymbol()})</Label>
                                <Input
                                    id="milestone-amount"
                                    type="number"
                                    placeholder="e.g. 35000"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    min="0"
                                    step="any"
                                />
                                {projectBudget > 0 && (
                                    <p className="text-[11px] text-muted-foreground">
                                        ~{percentage}% of total budget ({formatCurrency(projectBudget)})
                                    </p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="milestone-date">Target Due Date <span className="text-red-500">*</span></Label>
                                <Input
                                    id="milestone-date"
                                    type="date"
                                    value={dueDate}
                                    onChange={(e) => setDueDate(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="milestone-status">Work Delivery Status</Label>
                                <Select value={status} onValueChange={(val: any) => setStatus(val)}>
                                    <SelectTrigger id="milestone-status">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="pending">⏳ Work Pending</SelectItem>
                                        <SelectItem value="in-progress">🔄 Work In Progress</SelectItem>
                                        <SelectItem value="completed">✅ Work Completed</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="milestone-pay-status">Client Payment Status</Label>
                                <Select value={paymentStatus} onValueChange={(val: any) => setPaymentStatus(val)}>
                                    <SelectTrigger id="milestone-pay-status">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="paid">✅ Payment Received (Paid)</SelectItem>
                                        <SelectItem value="partial">🟡 Partially Paid</SelectItem>
                                        <SelectItem value="unpaid">❌ Payment Due (Unpaid)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="milestone-desc">Scope / Key Deliverables (Optional)</Label>
                            <Textarea
                                id="milestone-desc"
                                placeholder="Describe what tasks or deliverables are part of this milestone..."
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                rows={3}
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading || !name.trim()}>
                            {loading ? 'Saving...' : milestone ? 'Update Milestone' : 'Add Milestone'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
