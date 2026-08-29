import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import axios from 'axios'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { SignaturePad } from '@/components/approvals/signature-pad'
import {
    FileSignature, CheckCircle2, XCircle, Clock, ShieldCheck,
    ExternalLink, FileText, Calendar, Building2, User, Lock, AlertTriangle
} from 'lucide-react'

const API_BASE = (import.meta as any).env?.VITE_API_URL || 'http://localhost:5000/api';

export default function PublicApprovalSignPage() {
    const { token } = useParams<{ token: string }>()
    const [approval, setApproval] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [signedName, setSignedName] = useState('')
    const [signerEmail, setSignerEmail] = useState('')
    const [signing, setSigning] = useState(false)
    const [rejecting, setRejecting] = useState(false)
    const [rejectModalOpen, setRejectModalOpen] = useState(false)
    const [rejectionReason, setRejectionReason] = useState('')

    const fetchApproval = async () => {
        if (!token) return
        setLoading(true)
        try {
            const res = await axios.get(`${API_BASE}/approvals/public/${token}`)
            setApproval(res.data)
            if (res.data.clientId?.name) {
                setSignedName(res.data.clientId.name)
            }
            if (res.data.clientId?.email) {
                setSignerEmail(res.data.clientId.email)
            }
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to load approval request or link invalid.')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchApproval()
    }, [token])

    const handleSignSubmit = async (data: { signatureData: string; signatureType: 'drawn' | 'typed' | 'uploaded'; typedFont?: string; legalConsent: boolean }) => {
        if (!token) return
        setSigning(true)
        try {
            const res = await axios.post(`${API_BASE}/approvals/public/${token}/sign`, {
                signatureData: data.signatureData,
                signatureType: data.signatureType,
                typedFont: data.typedFont,
                signedBy: signedName || approval?.signedBy || 'Authorized Client',
                signedByEmail: signerEmail
            })
            setApproval(res.data.approval)
        } catch (err: any) {
            alert(err.response?.data?.message || 'Failed to submit signature')
        } finally {
            setSigning(false)
        }
    }

    const handleRejectSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!token || !rejectionReason.trim()) return
        setRejecting(true)
        try {
            const res = await axios.post(`${API_BASE}/approvals/public/${token}/reject`, {
                rejectionReason,
                actorName: signedName || 'Client'
            })
            setApproval(res.data.approval)
            setRejectModalOpen(false)
        } catch (err: any) {
            alert(err.response?.data?.message || 'Failed to reject request')
        } finally {
            setRejecting(false)
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 font-sans">
                <div className="flex items-center gap-3 animate-pulse">
                    <FileSignature className="w-8 h-8 text-primary" />
                    <span className="text-lg font-bold">Loading Approval Portal...</span>
                </div>
            </div>
        )
    }

    if (error || !approval) {
        return (
            <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 font-sans">
                <Card className="max-w-md w-full bg-slate-900 border-slate-800 text-center p-8 rounded-3xl space-y-4">
                    <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto" />
                    <h2 className="text-xl font-black text-white">Invalid or Expired Approval Link</h2>
                    <p className="text-xs text-slate-400">{error || 'This document approval request could not be located.'}</p>
                </Card>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-primary selection:text-white pb-16">
            {/* Top Security Header */}
            <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md sticky top-0 z-50">
                <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <div className="p-2 bg-primary/20 rounded-xl text-primary">
                            <ShieldCheck className="w-5 h-5" />
                        </div>
                        <div>
                            <span className="text-xs font-black uppercase tracking-wider text-slate-300 block">NEXPRISM CLIENT PORTAL</span>
                            <span className="text-[10px] text-slate-500 font-medium">Secure Encrypted Sign-off Portal</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-semibold bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                        <Lock className="w-3 h-3" /> 256-bit SSL Secure
                    </div>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-4 pt-8 space-y-6">
                {/* Status Header Banner */}
                <Card className="bg-slate-900/90 border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
                    <CardHeader className="p-6 sm:p-8 space-y-4 border-b border-slate-800/60">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <Badge className="bg-primary/20 text-primary border-primary/30 uppercase text-[10px] font-black tracking-widest px-3 py-1 rounded-lg">
                                {approval.category ? approval.category.replace('_', ' ') : 'APPROVAL REQUEST'}
                            </Badge>

                            {approval.status === 'approved' && (
                                <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 uppercase font-black text-xs px-3 py-1 rounded-full">
                                    <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" /> Approved & Signed
                                </Badge>
                            )}
                            {approval.status === 'pending' && (
                                <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 uppercase font-black text-xs px-3 py-1 rounded-full">
                                    <Clock className="w-3.5 h-3.5 mr-1.5" /> Signature Required
                                </Badge>
                            )}
                            {approval.status === 'rejected' && (
                                <Badge className="bg-rose-500/20 text-rose-400 border-rose-500/30 uppercase font-black text-xs px-3 py-1 rounded-full">
                                    <XCircle className="w-3.5 h-3.5 mr-1.5" /> Request Rejected
                                </Badge>
                            )}
                        </div>

                        <div className="space-y-1">
                            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">{approval.title}</h1>
                            {approval.description && (
                                <p className="text-sm text-slate-400 leading-relaxed pt-1">{approval.description}</p>
                            )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-800/60 text-xs">
                            <div className="flex items-center gap-2 text-slate-300">
                                <Building2 className="w-4 h-4 text-slate-500" />
                                <div>
                                    <span className="text-[10px] text-slate-500 block uppercase font-bold">Project</span>
                                    <span className="font-semibold text-slate-200">{approval.projectId?.name || 'General Project'}</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 text-slate-300">
                                <User className="w-4 h-4 text-slate-500" />
                                <div>
                                    <span className="text-[10px] text-slate-500 block uppercase font-bold">Requested By</span>
                                    <span className="font-semibold text-slate-200">{approval.requestedByName || 'Agency Team'}</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 text-slate-300">
                                <Calendar className="w-4 h-4 text-slate-500" />
                                <div>
                                    <span className="text-[10px] text-slate-500 block uppercase font-bold">Requested Date</span>
                                    <span className="font-semibold text-slate-200">{new Date(approval.createdAt).toLocaleDateString()}</span>
                                </div>
                            </div>
                        </div>
                    </CardHeader>

                    {/* Document Preview / Download Section */}
                    <CardContent className="p-6 sm:p-8 space-y-6">
                        <div className="space-y-3">
                            <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider flex items-center gap-2">
                                <FileText className="w-4 h-4 text-primary" /> Associated Document / Deliverable
                            </h3>
                            {approval.fileUrl ? (
                                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-3 overflow-hidden">
                                        <div className="p-3 bg-primary/10 rounded-xl text-primary shrink-0">
                                            <FileText className="w-6 h-6" />
                                        </div>
                                        <div className="truncate">
                                            <p className="text-sm font-bold text-white truncate">{approval.title} Document</p>
                                            <p className="text-xs text-slate-400 truncate">{approval.fileUrl}</p>
                                        </div>
                                    </div>
                                    <a
                                        href={approval.fileUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white text-xs font-bold rounded-xl hover:bg-primary/90 transition-colors shrink-0 shadow-lg"
                                    >
                                        <ExternalLink className="w-4 h-4" /> View / Download Document
                                    </a>
                                </div>
                            ) : (
                                <p className="text-xs text-slate-500 italic bg-slate-950 p-4 rounded-2xl border border-slate-800/60">
                                    No external document link attached. Please review the details above.
                                </p>
                            )}
                        </div>

                        {/* SIGNED STATE CERTIFICATE */}
                        {approval.status === 'approved' && (
                            <div className="p-6 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 space-y-4">
                                <div className="flex items-center justify-between border-b border-emerald-500/20 pb-3">
                                    <div className="flex items-center gap-2 text-emerald-400">
                                        <ShieldCheck className="w-5 h-5" />
                                        <span className="font-black text-sm uppercase tracking-wider">Official Digital Verification Seal</span>
                                    </div>
                                    <Badge className="bg-emerald-500/20 text-emerald-400 text-[10px] font-mono border-emerald-500/30">
                                        {approval.signatureMetadata?.signatureHash || 'VERIFIED'}
                                    </Badge>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                                    <div className="p-3 bg-white rounded-xl border border-slate-200 inline-block w-fit">
                                        <img src={approval.signatureData} alt="Digital Signature" className="h-14 object-contain" />
                                    </div>

                                    <div className="space-y-1 text-xs text-slate-300">
                                        <p><span className="text-slate-500">Signer Name:</span> <strong className="text-white">{approval.signedBy}</strong></p>
                                        <p><span className="text-slate-500">Signed At:</span> <strong className="text-white">{new Date(approval.signedAt).toLocaleString()}</strong></p>
                                        <p><span className="text-slate-500">IP Address:</span> <span className="font-mono text-slate-400">{approval.signatureMetadata?.ipAddress || 'Captured'}</span></p>
                                        <p><span className="text-slate-500">Method:</span> <span className="capitalize text-slate-400">{approval.signatureMetadata?.type || 'Drawn'} Signature</span></p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* REJECTED STATE */}
                        {approval.status === 'rejected' && (
                            <div className="p-6 rounded-2xl bg-rose-950/20 border border-rose-500/30 space-y-2">
                                <div className="flex items-center gap-2 text-rose-400 font-bold text-sm uppercase">
                                    <XCircle className="w-5 h-5" /> Rejection Details
                                </div>
                                <p className="text-xs text-slate-300">Reason: {approval.rejectionReason || 'No reason provided.'}</p>
                            </div>
                        )}

                        {/* PENDING SIGNING SECTION */}
                        {approval.status === 'pending' && (
                            <div className="pt-6 border-t border-slate-800 space-y-6">
                                <div className="space-y-1">
                                    <h3 className="text-lg font-black text-white flex items-center gap-2">
                                        <FileSignature className="w-5 h-5 text-primary" /> Sign & Authorize Approval
                                    </h3>
                                    <p className="text-xs text-slate-400">
                                        Provide your full name and draw, type, or upload your electronic signature below.
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold uppercase text-slate-400">Your Full Legal Name *</label>
                                        <Input
                                            value={signedName}
                                            onChange={(e) => setSignedName(e.target.value)}
                                            placeholder="e.g. John Doe"
                                            className="bg-slate-950 border-slate-800 text-white rounded-xl"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold uppercase text-slate-400">Email Address (Optional)</label>
                                        <Input
                                            value={signerEmail}
                                            onChange={(e) => setSignerEmail(e.target.value)}
                                            placeholder="john@company.com"
                                            className="bg-slate-950 border-slate-800 text-white rounded-xl"
                                        />
                                    </div>
                                </div>

                                <SignaturePad
                                    onSave={handleSignSubmit}
                                    saving={signing}
                                    defaultSignerName={signedName}
                                />

                                <div className="flex justify-center pt-2">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        onClick={() => setRejectModalOpen(true)}
                                        className="text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-xl"
                                    >
                                        Reject Approval Request
                                    </Button>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </main>

            {/* Rejection Modal */}
            <Dialog open={rejectModalOpen} onOpenChange={setRejectModalOpen}>
                <DialogContent className="bg-slate-900 border-slate-800 text-slate-100 rounded-3xl">
                    <DialogHeader>
                        <DialogTitle className="font-black text-xl text-rose-400 flex items-center gap-2">
                            <XCircle className="w-5 h-5" /> Reject Approval Request
                        </DialogTitle>
                        <DialogDescription className="text-xs text-slate-400">
                            Please state the reason for rejecting this sign-off request so the team can address your feedback.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleRejectSubmit} className="space-y-4 pt-2">
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold uppercase text-slate-400">Rejection Reason *</label>
                            <textarea
                                value={rejectionReason}
                                onChange={(e) => setRejectionReason(e.target.value)}
                                placeholder="Explain what changes or revisions are needed..."
                                required
                                rows={4}
                                className="w-full bg-slate-950 border border-slate-800 text-white rounded-2xl p-3 text-xs focus:ring-2 focus:ring-rose-500 outline-none"
                            />
                        </div>

                        <div className="flex justify-end gap-3 pt-2">
                            <Button type="button" variant="outline" onClick={() => setRejectModalOpen(false)} className="rounded-xl border-slate-700 text-slate-300">
                                Cancel
                            </Button>
                            <Button type="submit" disabled={rejecting} className="rounded-xl font-bold bg-rose-600 hover:bg-rose-700 text-white">
                                {rejecting ? 'Submitting...' : 'Confirm Rejection'}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    )
}
