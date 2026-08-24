import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatCurrency, getCurrencySymbol } from '@/lib/utils'
import { CreditCard, CheckCircle2, AlertCircle } from 'lucide-react'
import type { Milestone } from '@/types'

interface ProjectMilestonePaymentDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    milestone: Milestone | null
    onSavePayment: (paymentData: {
        paymentStatus: 'unpaid' | 'partial' | 'paid'
        paidAmount: number
        paidDate?: Date
        paymentMethod?: string
        paymentReference?: string
        paymentNotes?: string
    }) => Promise<void>
}

export function ProjectMilestonePaymentDialog({
    open,
    onOpenChange,
    milestone,
    onSavePayment
}: ProjectMilestonePaymentDialogProps) {
    const [paymentStatus, setPaymentStatus] = useState<'unpaid' | 'partial' | 'paid'>('paid')
    const [paidAmount, setPaidAmount] = useState('')
    const [paidDate, setPaidDate] = useState('')
    const [paymentMethod, setPaymentMethod] = useState('Bank Transfer')
    const [paymentReference, setPaymentReference] = useState('')
    const [paymentNotes, setPaymentNotes] = useState('')
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        if (milestone && open) {
            const currentPaid = milestone.paidAmount !== undefined ? milestone.paidAmount : (milestone.paymentStatus === 'paid' ? milestone.amount : 0)
            const targetAmount = milestone.amount || 0

            setPaymentStatus(milestone.paymentStatus || (currentPaid >= targetAmount && targetAmount > 0 ? 'paid' : currentPaid > 0 ? 'partial' : 'paid'))
            setPaidAmount(currentPaid > 0 ? currentPaid.toString() : targetAmount.toString())
            setPaidDate(
                milestone.paidDate && !isNaN(new Date(milestone.paidDate).getTime())
                    ? new Date(milestone.paidDate).toISOString().split('T')[0]
                    : new Date().toISOString().split('T')[0]
            )
            setPaymentMethod(milestone.paymentMethod || 'Bank Transfer')
            setPaymentReference(milestone.paymentReference || '')
            setPaymentNotes(milestone.paymentNotes || '')
        }
    }, [milestone, open])

    if (!milestone) return null

    const numPaid = parseFloat(paidAmount) || 0
    const milestoneTotal = milestone.amount || 0
    const balanceDue = Math.max(0, milestoneTotal - numPaid)

    const handleStatusChange = (val: 'unpaid' | 'partial' | 'paid') => {
        setPaymentStatus(val)
        if (val === 'paid') {
            setPaidAmount(milestoneTotal.toString())
        } else if (val === 'unpaid') {
            setPaidAmount('0')
        }
    }

    const handleSubmit = async (e?: React.FormEvent) => {
        if (e) e.preventDefault()
        if (loading) return
        setLoading(true)
        try {
            const finalDate = paidDate && !isNaN(new Date(paidDate).getTime()) ? new Date(paidDate) : new Date()
            await onSavePayment({
                paymentStatus,
                paidAmount: paymentStatus === 'unpaid' ? 0 : numPaid,
                paidDate: finalDate,
                paymentMethod,
                paymentReference: paymentReference.trim(),
                paymentNotes: paymentNotes.trim()
            })
        } catch (error) {
            console.error('Payment saving error:', error)
        } finally {
            setLoading(false)
            onOpenChange(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <div>
                    <DialogHeader>
                        <div className="flex items-center gap-2">
                            <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-600">
                                <CreditCard className="h-5 w-5" />
                            </div>
                            <div>
                                <DialogTitle>Record Client Payment for Milestone</DialogTitle>
                                <DialogDescription className="truncate max-w-[360px]">
                                    {milestone.name}
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>

                    <div className="grid gap-4 py-4">
                        {/* Milestone Amount Info Banner */}
                        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/60 border text-xs">
                            <div>
                                <span className="text-muted-foreground">Milestone Value:</span>
                                <div className="text-sm font-bold text-foreground mt-0.5">
                                    {formatCurrency(milestoneTotal)}
                                </div>
                            </div>
                            <div>
                                <span className="text-muted-foreground">Work Status:</span>
                                <div className="text-xs font-semibold mt-0.5 capitalize">
                                    {milestone.completed || milestone.status === 'completed' ? (
                                        <span className="text-emerald-600">✓ Work Completed</span>
                                    ) : (
                                        <span className="text-amber-600">⏳ In Progress / Pending</span>
                                    )}
                                </div>
                            </div>
                            <div>
                                <span className="text-muted-foreground">Remaining Due:</span>
                                <div className={`text-sm font-bold mt-0.5 ${balanceDue > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                                    {formatCurrency(balanceDue)}
                                </div>
                            </div>
                        </div>

                        {/* Payment Status Selector */}
                        <div className="space-y-2">
                            <Label htmlFor="pay-status">Payment Status</Label>
                            <Select value={paymentStatus} onValueChange={handleStatusChange}>
                                <SelectTrigger id="pay-status">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="paid">✅ Fully Paid (100% Payment Received)</SelectItem>
                                    <SelectItem value="partial">🟡 Partially Paid (Advance / Part Payment)</SelectItem>
                                    <SelectItem value="unpaid">❌ Unpaid (Payment Due from Client)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {paymentStatus !== 'unpaid' && (
                            <>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="paid-amount">Amount Received ({getCurrencySymbol()})</Label>
                                        <Input
                                            id="paid-amount"
                                            type="number"
                                            value={paidAmount}
                                            onChange={(e) => {
                                                setPaidAmount(e.target.value)
                                                const val = parseFloat(e.target.value) || 0
                                                if (val >= milestoneTotal && milestoneTotal > 0) {
                                                    setPaymentStatus('paid')
                                                } else if (val > 0) {
                                                    setPaymentStatus('partial')
                                                }
                                            }}
                                            min="0"
                                            step="any"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="pay-date">Payment Date</Label>
                                        <Input
                                            id="pay-date"
                                            type="date"
                                            value={paidDate}
                                            onChange={(e) => setPaidDate(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="pay-mode">Payment Method</Label>
                                        <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                                            <SelectTrigger id="pay-mode">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Bank Transfer">Bank Transfer (NEFT/IMPS)</SelectItem>
                                                <SelectItem value="UPI">UPI (GPay / PhonePe / Paytm)</SelectItem>
                                                <SelectItem value="Cash">Cash</SelectItem>
                                                <SelectItem value="Cheque">Cheque</SelectItem>
                                                <SelectItem value="Credit Card">Credit / Debit Card</SelectItem>
                                                <SelectItem value="Online Gateway">Online Gateway (Razorpay/Stripe)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="pay-ref">Transaction / UTR ID</Label>
                                        <Input
                                            id="pay-ref"
                                            placeholder="e.g. UTR892341203"
                                            value={paymentReference}
                                            onChange={(e) => setPaymentReference(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="pay-notes">Payment Notes / Remark (Optional)</Label>
                                    <Textarea
                                        id="pay-notes"
                                        placeholder="e.g. Received via NEFT from client company account..."
                                        value={paymentNotes}
                                        onChange={(e) => setPaymentNotes(e.target.value)}
                                        rows={2}
                                    />
                                </div>
                            </>
                        )}
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            onClick={() => handleSubmit()}
                            disabled={loading}
                            className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
                        >
                            {loading ? 'Saving...' : 'Save Payment Status'}
                        </Button>
                    </DialogFooter>
                </div>
            </DialogContent>
        </Dialog>
    )
}
