import { useState } from 'react'
import {
    Dialog, DialogContent, DialogHeader, DialogTitle,
    DialogDescription, DialogFooter
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
    CheckCircle2, XCircle, FileText, Download, Eye,
    ShieldCheck, AlertCircle, Loader2, User, Landmark, GraduationCap
} from 'lucide-react'
import api from '@/lib/api-client'
import { useToast } from '@/hooks/use-toast'

interface OfferApprovalDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    candidate: any
    onDecision?: () => void
}

export function OfferApprovalDialog({ open, onOpenChange, candidate, onDecision }: OfferApprovalDialogProps) {
    const { toast } = useToast()
    const [actionLoading, setActionLoading] = useState(false)
    const [notes, setNotes] = useState('')

    if (!candidate) return null

    const handleApproval = async (action: 'approve' | 'reject') => {
        try {
            setActionLoading(true)
            const res = await api.post(`/candidates/${candidate._id}/approve`, {
                action,
                notes
            })
            toast({
                title: action === 'approve' ? 'Offer Approved' : 'Offer Rejected',
                description: res.data.message
            })
            if (onDecision) onDecision()
            onOpenChange(false)
        } catch (err: any) {
            toast({
                variant: 'destructive',
                title: 'Action Failed',
                description: err.response?.data?.message || err.message
            })
        } finally {
            setActionLoading(false)
        }
    }

    const downloadPdf = () => {
        window.open(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/candidates/${candidate._id}/pdf`, '_blank')
    }

    const offer = candidate.offerLetter || {}
    const ctc = offer.ctcAnnual || 0
    const formatINR = (val: number) => `₹${(val || 0).toLocaleString('en-IN')}`

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
                <DialogHeader className="px-6 pt-6 pb-3 border-b bg-slate-50/80">
                    <div className="flex items-center justify-between">
                        <div>
                            <DialogTitle className="text-base flex items-center gap-2 text-slate-900">
                                <ShieldCheck className="h-5 w-5 text-blue-600" /> Admin Review & Approval
                            </DialogTitle>
                            <DialogDescription className="text-xs">
                                Review submitted documents and proposed CTC for <strong>{candidate.name}</strong>
                            </DialogDescription>
                        </div>
                        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300 text-xs">
                            Pending Approval
                        </Badge>
                    </div>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
                    {/* Candidate Info Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-lg border text-xs">
                        <div>
                            <span className="text-slate-400 block text-[11px]">Candidate</span>
                            <span className="font-bold text-slate-800">{candidate.name}</span>
                        </div>
                        <div>
                            <span className="text-slate-400 block text-[11px]">Proposed Designation</span>
                            <span className="font-bold text-slate-800">{candidate.designation || 'Specialist'}</span>
                        </div>
                        <div>
                            <span className="text-slate-400 block text-[11px]">Joining Date</span>
                            <span className="font-bold text-blue-700">
                                {offer.joiningDate ? new Date(offer.joiningDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }) : 'Not set'}
                            </span>
                        </div>
                        <div>
                            <span className="text-slate-400 block text-[11px]">Proposed CTC</span>
                            <span className="font-bold text-green-700 text-sm">{formatINR(ctc)}</span>
                        </div>
                    </div>

                    {/* Uploaded Documents Review */}
                    <div className="space-y-2.5">
                        <div className="flex items-center justify-between">
                            <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                                <FileText className="h-4 w-4 text-blue-600" /> Candidate Uploaded Documents ({candidate.documents?.length || 0})
                            </h4>
                            <span className="text-[11px] text-slate-500">Click to preview before approving</span>
                        </div>

                        {(!candidate.documents || candidate.documents.length === 0) ? (
                            <div className="p-4 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800 flex items-center gap-2">
                                <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
                                No verification documents have been uploaded by the candidate yet.
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                                {candidate.documents.map((doc: any, i: number) => (
                                    <div key={i} className="p-2.5 border rounded-lg bg-white flex items-center justify-between text-xs hover:border-blue-300 transition-all">
                                        <div className="flex items-center gap-2 truncate">
                                            <FileText className="h-4 w-4 text-primary shrink-0" />
                                            <div className="truncate">
                                                <div className="font-medium text-slate-800 truncate">{doc.name}</div>
                                                <div className="text-[10px] text-slate-400 truncate">{doc.fileName}</div>
                                            </div>
                                        </div>
                                        <a
                                            href={doc.fileUrl}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="px-2 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded text-[11px] font-medium flex items-center gap-1 shrink-0 ml-2"
                                        >
                                            <Eye className="h-3 w-3" /> View
                                        </a>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Financial Summary */}
                    <div className="border rounded-lg p-4 bg-slate-50/60 space-y-3">
                        <div className="flex items-center justify-between">
                            <h4 className="text-xs font-bold text-slate-900">Salary & Compensation Breakdown</h4>
                            <Button variant="ghost" size="sm" onClick={downloadPdf} className="h-7 text-xs text-blue-600 hover:text-blue-700">
                                <Download className="h-3 w-3 mr-1" /> View Full Drafted PDF
                            </Button>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                            <div className="bg-white p-2 rounded border">
                                <span className="text-[10px] text-slate-400 block">Basic Salary</span>
                                <span className="font-semibold text-slate-800">{formatINR(offer.basicSalary)}/mo</span>
                            </div>
                            <div className="bg-white p-2 rounded border">
                                <span className="text-[10px] text-slate-400 block">HRA</span>
                                <span className="font-semibold text-slate-800">{formatINR(offer.hra)}/mo</span>
                            </div>
                            <div className="bg-white p-2 rounded border">
                                <span className="text-[10px] text-slate-400 block">Special Allowance</span>
                                <span className="font-semibold text-slate-800">{formatINR(offer.specialAllowance)}/mo</span>
                            </div>
                            <div className="bg-blue-50 p-2 rounded border border-blue-200">
                                <span className="text-[10px] text-blue-600 block">Monthly Gross</span>
                                <span className="font-bold text-blue-900">{formatINR(offer.monthlyGross)}/mo</span>
                            </div>
                        </div>
                    </div>

                    {/* Admin Notes */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-slate-700 block">Approval / Rejection Notes</label>
                        <Textarea
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                            placeholder="Optional comments regarding document verification, CTC approval, or requested revisions..."
                            rows={2}
                            className="text-xs"
                        />
                    </div>
                </div>

                <DialogFooter className="px-6 py-3 border-t bg-slate-50 flex items-center justify-between">
                    <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleApproval('reject')}
                            disabled={actionLoading}
                            className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                            <XCircle className="h-3.5 w-3.5 mr-1" /> Reject / Request Revision
                        </Button>
                        <Button
                            size="sm"
                            onClick={() => handleApproval('approve')}
                            disabled={actionLoading}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs px-5 shadow-sm"
                        >
                            {actionLoading ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                            ) : (
                                <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                            )}
                            Approve Offer Letter
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
export default OfferApprovalDialog
