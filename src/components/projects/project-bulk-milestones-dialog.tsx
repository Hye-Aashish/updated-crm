import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus, Trash2, Sparkles, Layers } from 'lucide-react'
import { getCurrencySymbol, formatCurrency } from '@/lib/utils'
import type { Milestone } from '@/types'

interface BulkMilestoneItem {
    name: string
    amount: string
    dueDate: string
    description: string
}

interface ProjectBulkMilestonesDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    projectBudget: number
    projectDeadline?: string
    onSave: (milestonesData: Partial<Milestone>[]) => Promise<void>
}

export function ProjectBulkMilestonesDialog({
    open,
    onOpenChange,
    projectBudget,
    projectDeadline,
    onSave
}: ProjectBulkMilestonesDialogProps) {
    const [items, setItems] = useState<BulkMilestoneItem[]>([
        { name: 'Milestone 1: Project Setup & Prototype', amount: '', dueDate: '', description: '' },
        { name: 'Milestone 2: Beta Features & Integration', amount: '', dueDate: '', description: '' },
        { name: 'Milestone 3: Final Delivery & Live Launch', amount: '', dueDate: '', description: '' }
    ])
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        if (open && items.length === 0) {
            setItems([
                { name: 'Milestone 1: Project Setup & Prototype', amount: '', dueDate: '', description: '' },
                { name: 'Milestone 2: Beta Features & Integration', amount: '', dueDate: '', description: '' },
                { name: 'Milestone 3: Final Delivery & Live Launch', amount: '', dueDate: '', description: '' }
            ])
        }
    }, [open])

    // Quick Split Presets
    const handleApplySplit = (splitPercentages: number[]) => {
        const budget = projectBudget || 100000
        const updated = splitPercentages.map((pct, idx) => ({
            name: `Milestone ${idx + 1}: Stage ${idx + 1} (${pct}%)`,
            amount: Math.round(budget * (pct / 100)).toString(),
            dueDate: projectDeadline || '',
            description: `Stage ${idx + 1} deliverables (${pct}% of total budget)`
        }))
        setItems(updated)
    }

    const addItem = () => {
        setItems(prev => [
            ...prev,
            { name: `Milestone ${prev.length + 1}: New Stage`, amount: '', dueDate: projectDeadline || '', description: '' }
        ])
    }

    const removeItem = (index: number) => {
        if (items.length <= 1) return
        setItems(prev => prev.filter((_, i) => i !== index))
    }

    const updateItem = (index: number, field: keyof BulkMilestoneItem, value: string) => {
        setItems(prev => {
            const next = [...prev]
            next[index] = { ...next[index], [field]: value }
            return next
        })
    }

    const totalAmount = items.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        const validItems = items.filter(i => i.name.trim().length > 0)
        if (validItems.length === 0) return

        setLoading(true)
        try {
            const formatted: Partial<Milestone>[] = validItems.map(item => ({
                name: item.name.trim(),
                amount: parseFloat(item.amount) || 0,
                dueDate: item.dueDate ? new Date(item.dueDate) : undefined,
                description: item.description.trim(),
                status: 'pending',
                completed: false,
                paymentStatus: 'unpaid',
                paidAmount: 0
            }))
            await onSave(formatted)
            onOpenChange(false)
        } catch (error) {
            console.error('Failed to save bulk milestones', error)
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl w-[95vw] max-h-[90vh] flex flex-col p-0 font-sans">
                <form onSubmit={handleSubmit} className="flex flex-col h-full overflow-hidden">
                    <DialogHeader className="p-6 border-b bg-card">
                        <DialogTitle className="text-xl font-bold flex items-center gap-2">
                            <Layers className="h-5 w-5 text-primary" /> Create Multiple Milestones (Bulk Add)
                        </DialogTitle>
                        <DialogDescription className="text-xs font-medium">
                            Add multiple milestones at once, auto-calculate budget percentages, and set delivery dates.
                        </DialogDescription>

                        {/* Quick Presets */}
                        <div className="flex flex-wrap items-center gap-2 pt-3">
                            <span className="text-[11px] font-bold text-muted-foreground uppercase">Auto Split Budget:</span>
                            <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => handleApplySplit([50, 50])}
                                className="h-7 text-xs font-bold bg-muted/40"
                            >
                                <Sparkles className="mr-1 h-3 w-3 text-amber-500" /> 2 Stages (50/50)
                            </Button>
                            <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => handleApplySplit([30, 40, 30])}
                                className="h-7 text-xs font-bold bg-muted/40"
                            >
                                <Sparkles className="mr-1 h-3 w-3 text-amber-500" /> 3 Stages (30/40/30)
                            </Button>
                            <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => handleApplySplit([25, 25, 25, 25])}
                                className="h-7 text-xs font-bold bg-muted/40"
                            >
                                <Sparkles className="mr-1 h-3 w-3 text-amber-500" /> 4 Stages (25/25/25/25)
                            </Button>
                        </div>
                    </DialogHeader>

                    {/* Form List Body */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-4">
                        {items.map((item, index) => {
                            const numAmt = parseFloat(item.amount) || 0
                            const pct = projectBudget > 0 ? Math.round((numAmt / projectBudget) * 100) : 0

                            return (
                                <div
                                    key={index}
                                    className="p-4 rounded-xl border border-border/60 bg-card hover:border-primary/40 transition-all space-y-3 relative group"
                                >
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="flex items-center gap-2">
                                            <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-black flex items-center justify-center">
                                                {index + 1}
                                            </span>
                                            <span className="text-xs font-bold text-muted-foreground uppercase">Stage {index + 1}</span>
                                        </div>

                                        {items.length > 1 && (
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => removeItem(index)}
                                                className="h-7 w-7 text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </Button>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                                        <div className="md:col-span-5 space-y-1">
                                            <Label className="text-xs font-bold">Milestone Title <span className="text-red-500">*</span></Label>
                                            <Input
                                                placeholder="e.g. Milestone 1: Design & Architecture"
                                                value={item.name}
                                                onChange={(e) => updateItem(index, 'name', e.target.value)}
                                                required
                                                className="h-9 text-xs font-semibold"
                                            />
                                        </div>

                                        <div className="md:col-span-3 space-y-1">
                                            <Label className="text-xs font-bold">Amount ({getCurrencySymbol()})</Label>
                                            <Input
                                                type="number"
                                                placeholder="e.g. 30000"
                                                value={item.amount}
                                                onChange={(e) => updateItem(index, 'amount', e.target.value)}
                                                className="h-9 text-xs font-bold"
                                            />
                                            {projectBudget > 0 && numAmt > 0 && (
                                                <p className="text-[10px] text-muted-foreground font-semibold">
                                                    ~{pct}% of budget
                                                </p>
                                            )}
                                        </div>

                                        <div className="md:col-span-4 space-y-1">
                                            <Label className="text-xs font-bold">Target Due Date</Label>
                                            <Input
                                                type="date"
                                                value={item.dueDate}
                                                onChange={(e) => updateItem(index, 'dueDate', e.target.value)}
                                                className="h-9 text-xs font-medium"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )
                        })}

                        <Button
                            type="button"
                            variant="outline"
                            onClick={addItem}
                            className="w-full py-5 border-dashed border-2 hover:bg-primary/5 text-xs font-bold gap-1.5"
                        >
                            <Plus className="h-4 w-4" /> Add Another Milestone Row
                        </Button>
                    </div>

                    {/* Summary Footer */}
                    <DialogFooter className="p-4 border-t bg-card flex-col sm:flex-row items-center justify-between gap-3">
                        <div className="flex items-center gap-4 text-xs font-bold">
                            <div>
                                <span className="text-muted-foreground">Total Created:</span>{' '}
                                <span className="text-foreground">{items.length} Milestones</span>
                            </div>
                            <div>
                                <span className="text-muted-foreground">Total Amount:</span>{' '}
                                <span className={totalAmount === projectBudget ? 'text-emerald-600' : 'text-primary'}>
                                    {formatCurrency(totalAmount)}
                                </span>
                                {projectBudget > 0 && (
                                    <span className="text-[10px] text-muted-foreground ml-1">
                                        / Budget {formatCurrency(projectBudget)}
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="h-9 text-xs font-bold">
                                Cancel
                            </Button>
                            <Button type="submit" disabled={loading || items.length === 0} className="h-9 text-xs font-bold px-5">
                                {loading ? 'Creating Milestones...' : `Create ${items.length} Milestones`}
                            </Button>
                        </div>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
