import { useState, useEffect, useMemo } from 'react'
import api from '@/lib/api-client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { SignaturePad } from '@/components/approvals/signature-pad'
import {
    FileSignature, CheckCircle2, XCircle, Clock, Plus, ExternalLink, ShieldCheck,
    RefreshCw, Copy, Check, Search, Filter, Share2, Award, Calendar, AlertTriangle,
    Eye, FileText, Lock
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useAppStore } from '@/store'

const CATEGORY_CONFIG: Record<string, { label: string; color: string }> = {
    milestone: { label: 'Milestone Sign-off', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-200' },
    design: { label: 'Design Approval', color: 'bg-purple-500/10 text-purple-600 border-purple-200' },
    proposal: { label: 'Proposal / Quote', color: 'bg-blue-500/10 text-blue-600 border-blue-200' },
    contract: { label: 'Contract / NDA', color: 'bg-indigo-500/10 text-indigo-600 border-indigo-200' },
    scope_change: { label: 'Scope Change', color: 'bg-amber-500/10 text-amber-600 border-amber-200' },
    general: { label: 'General Approval', color: 'bg-slate-500/10 text-slate-600 border-slate-200' }
}

export function ApprovalsPage() {
    const { toast } = useToast()
    const { currentUser, projects, clients } = useAppStore()
    const [approvals, setApprovals] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedApproval, setSelectedApproval] = useState<any>(null)
    const [certificateModalOpen, setCertificateModalOpen] = useState(false)
    const [signingModalOpen, setSigningModalOpen] = useState(false)
    const [rejectModalOpen, setRejectModalOpen] = useState(false)
    const [createModalOpen, setCreateModalOpen] = useState(false)
    const [signing, setSigning] = useState(false)
    const [rejecting, setRejecting] = useState(false)
    const [rejectionReason, setRejectionReason] = useState('')
    const [copiedId, setCopiedId] = useState<string | null>(null)

    // Filters
    const [searchQuery, setSearchQuery] = useState('')
    const [statusFilter, setStatusFilter] = useState('all')
    const [categoryFilter, setCategoryFilter] = useState('all')

    // Create Form state
    const [title, setTitle] = useState('')
    const [description, setDescription] = useState('')
    const [category, setCategory] = useState('general')
    const [projectId, setProjectId] = useState('')
    const [clientId, setClientId] = useState('')
    const [fileUrl, setFileUrl] = useState('')
    const [dueDate, setDueDate] = useState('')

    const copyToClipboard = (text: string, idKey: string, label: string) => {
        navigator.clipboard.writeText(text)
        setCopiedId(idKey)
        toast({ title: `${label} Copied!`, description: 'Link copied to clipboard.' })
        setTimeout(() => setCopiedId(null), 2000)
    }

    const fetchApprovals = async () => {
        setLoading(true)
        try {
            const res = await api.get('/approvals')
            setApprovals(res.data || [])
        } catch (err) {
            console.error('Failed to load approvals', err)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchApprovals()
    }, [])

    // KPI Metrics
    const stats = useMemo(() => {
        const total = approvals.length
        const pending = approvals.filter(a => a.status === 'pending').length
        const approved = approvals.filter(a => a.status === 'approved').length
        const rejected = approvals.filter(a => a.status === 'rejected').length
        return { total, pending, approved, rejected }
    }, [approvals])

    // Filtered Approvals
    const filteredApprovals = useMemo(() => {
        return approvals.filter(item => {
            const matchesSearch =
                item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (item.projectId?.name && item.projectId.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
                (item.clientId?.name && item.clientId.name.toLowerCase().includes(searchQuery.toLowerCase()))
            
            const matchesStatus = statusFilter === 'all' || item.status === statusFilter
            const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter

            return matchesSearch && matchesStatus && matchesCategory
        })
    }, [approvals, searchQuery, statusFilter, categoryFilter])

    const handleCreateApproval = async (e: React.FormEvent) => {
        e.preventDefault()
        try {
            await api.post('/approvals', {
                title,
                description,
                category,
                projectId: (projectId && projectId !== 'none') ? projectId : undefined,
                clientId: (clientId && clientId !== 'none') ? clientId : undefined,
                fileUrl,
                dueDate: dueDate || undefined
            })
            toast({ title: 'Approval Request Created', description: 'Public client shareable link generated.' })
            setCreateModalOpen(false)
            setTitle('')
            setDescription('')
            setCategory('general')
            setProjectId('')
            setClientId('')
            setFileUrl('')
            setDueDate('')
            fetchApprovals()
        } catch (err: any) {
            toast({ title: 'Error', description: err.response?.data?.message || 'Failed to create approval', variant: 'destructive' })
        }
    }

    const handleSignSubmit = async (data: { signatureData: string; signatureType: 'drawn' | 'typed' | 'uploaded'; typedFont?: string; legalConsent: boolean }) => {
        if (!selectedApproval) return
        setSigning(true)
        try {
            await api.post(`/approvals/${selectedApproval._id}/sign`, {
                signatureData: data.signatureData,
                signatureType: data.signatureType,
                typedFont: data.typedFont,
                signedBy: currentUser?.name || 'Authorized Client',
                signedByEmail: currentUser?.email
            })
            toast({ title: 'Approved & Signed!', description: 'The document has been officially approved with your signature & audit hash.' })
            setSigningModalOpen(false)
            setSelectedApproval(null)
            fetchApprovals()
        } catch (err: any) {
            toast({ title: 'Signing Error', description: err.response?.data?.message || 'Failed to submit signature', variant: 'destructive' })
        } finally {
            setSigning(false)
        }
    }

    const handleRejectSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!selectedApproval || !rejectionReason.trim()) return
        setRejecting(true)
        try {
            await api.post(`/approvals/${selectedApproval._id}/reject`, {
                rejectionReason
            })
            toast({ title: 'Approval Rejected', description: 'Request status updated to rejected.' })
            setRejectModalOpen(false)
            setSelectedApproval(null)
            setRejectionReason('')
            fetchApprovals()
        } catch (err: any) {
            toast({ title: 'Rejection Error', description: err.response?.data?.message || 'Failed to reject approval', variant: 'destructive' })
        } finally {
            setRejecting(false)
        }
    }

    const getPublicShareUrl = (token: string) => {
        const baseUrl = window.location.origin
        return `${baseUrl}/public/approval/${token}`
    }

    return (
        <div className="space-y-6 pb-16">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground flex items-center gap-3">
                        <div className="p-2.5 bg-primary/10 rounded-2xl text-primary">
                            <FileSignature className="h-6 w-6" />
                        </div>
                        Client Approvals & Signatures
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Enterprise multi-mode e-signatures, audit trail stamps, and shareable client sign-off portals.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Button variant="outline" size="sm" onClick={fetchApprovals} disabled={loading} className="rounded-xl">
                        <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> Refresh
                    </Button>
                    {currentUser?.role !== 'client' && (
                        <Button onClick={() => setCreateModalOpen(true)} className="rounded-xl font-bold shadow-md hover:shadow-lg">
                            <Plus className="h-4 w-4 mr-2" /> Request Approval
                        </Button>
                    )}
                </div>
            </div>

            {/* Metrics KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="rounded-2xl border bg-card/60 backdrop-blur-sm p-4 space-y-1">
                    <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Total Requests</p>
                    <div className="text-2xl font-black text-foreground">{stats.total}</div>
                </Card>
                <Card className="rounded-2xl border bg-amber-500/5 border-amber-500/20 p-4 space-y-1">
                    <p className="text-xs text-amber-600 font-bold uppercase tracking-wider flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" /> Pending Signatures
                    </p>
                    <div className="text-2xl font-black text-amber-600">{stats.pending}</div>
                </Card>
                <Card className="rounded-2xl border bg-emerald-500/5 border-emerald-500/20 p-4 space-y-1">
                    <p className="text-xs text-emerald-600 font-bold uppercase tracking-wider flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Approved & Signed
                    </p>
                    <div className="text-2xl font-black text-emerald-600">{stats.approved}</div>
                </Card>
                <Card className="rounded-2xl border bg-rose-500/5 border-rose-500/20 p-4 space-y-1">
                    <p className="text-xs text-rose-600 font-bold uppercase tracking-wider flex items-center gap-1">
                        <XCircle className="w-3.5 h-3.5" /> Rejected
                    </p>
                    <div className="text-2xl font-black text-rose-600">{stats.rejected}</div>
                </Card>
            </div>

            {/* Filter Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-card/80 p-3 rounded-2xl border">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder="Search by title, project, or client..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 rounded-xl text-xs bg-background"
                    />
                </div>

                <div className="flex items-center gap-3">
                    <Tabs value={statusFilter} onValueChange={setStatusFilter} className="shrink-0">
                        <TabsList className="rounded-xl p-1 bg-muted/60 h-9">
                            <TabsTrigger value="all" className="rounded-lg text-xs font-bold px-3">All</TabsTrigger>
                            <TabsTrigger value="pending" className="rounded-lg text-xs font-bold px-3">Pending</TabsTrigger>
                            <TabsTrigger value="approved" className="rounded-lg text-xs font-bold px-3">Approved</TabsTrigger>
                            <TabsTrigger value="rejected" className="rounded-lg text-xs font-bold px-3">Rejected</TabsTrigger>
                        </TabsList>
                    </Tabs>

                    <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                        <SelectTrigger className="w-[160px] rounded-xl text-xs h-9">
                            <SelectValue placeholder="Category" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Categories</SelectItem>
                            {Object.entries(CATEGORY_CONFIG).map(([key, cfg]) => (
                                <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Approvals Grid */}
            {loading ? (
                <div className="p-16 text-center text-muted-foreground animate-pulse font-medium">
                    Loading digital approval requests...
                </div>
            ) : filteredApprovals.length === 0 ? (
                <Card className="p-16 text-center text-muted-foreground rounded-2xl border-dashed">
                    <ShieldCheck className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p className="font-bold text-base text-foreground">No approval requests found</p>
                    <p className="text-xs text-muted-foreground mt-1">
                        {searchQuery ? 'Try adjusting your search query or filters.' : 'Click "Request Approval" to issue a sign-off to a client.'}
                    </p>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {filteredApprovals.map(item => {
                        const catCfg = CATEGORY_CONFIG[item.category || 'general'] || CATEGORY_CONFIG.general
                        const shareUrl = item.publicToken ? getPublicShareUrl(item.publicToken) : ''

                        return (
                            <Card key={item._id} className="rounded-2xl border bg-card hover:shadow-xl transition-all duration-300 flex flex-col justify-between overflow-hidden">
                                <div>
                                    <CardHeader className="pb-3 space-y-2">
                                        <div className="flex items-start justify-between gap-2">
                                            <Badge className={`${catCfg.color} uppercase font-black text-[9px] tracking-wider`}>
                                                {catCfg.label}
                                            </Badge>
                                            <div>
                                                {item.status === 'approved' && (
                                                    <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-200 uppercase font-black text-[10px]">
                                                        <CheckCircle2 className="w-3 h-3 mr-1" /> Approved
                                                    </Badge>
                                                )}
                                                {item.status === 'pending' && (
                                                    <Badge className="bg-amber-500/10 text-amber-600 border-amber-200 uppercase font-black text-[10px]">
                                                        <Clock className="w-3 h-3 mr-1" /> Pending Sign
                                                    </Badge>
                                                )}
                                                {item.status === 'rejected' && (
                                                    <Badge className="bg-rose-500/10 text-rose-600 border-rose-200 uppercase font-black text-[10px]">
                                                        <XCircle className="w-3 h-3 mr-1" /> Rejected
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>

                                        <h3 className="font-black text-lg text-foreground leading-snug">
                                            {item.title}
                                        </h3>

                                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                                            <span>Project: <strong className="text-foreground">{item.projectId?.name || 'General'}</strong></span>
                                            {item.clientId?.name && (
                                                <span>Client: <strong className="text-foreground">{item.clientId.name}</strong></span>
                                            )}
                                        </div>
                                    </CardHeader>

                                    <CardContent className="space-y-4">
                                        {item.description && (
                                            <p className="text-xs text-muted-foreground bg-muted/40 p-3 rounded-xl leading-relaxed">
                                                {item.description}
                                            </p>
                                        )}

                                        {/* Links & Attachments */}
                                        <div className="flex items-center justify-between gap-2 pt-1 border-t border-border/50">
                                            {item.fileUrl ? (
                                                <a
                                                    href={item.fileUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-xs font-bold text-primary flex items-center gap-1.5 hover:underline truncate"
                                                >
                                                    <ExternalLink className="w-3.5 h-3.5 shrink-0" /> View Deliverable File
                                                </a>
                                            ) : (
                                                <span className="text-xs text-muted-foreground italic">No document link</span>
                                            )}

                                            {shareUrl && (
                                                <Button
                                                    variant="secondary"
                                                    size="sm"
                                                    className="h-7 text-[11px] rounded-lg gap-1.5 font-bold shrink-0 bg-primary/10 text-primary hover:bg-primary/20"
                                                    onClick={() => copyToClipboard(shareUrl, item._id + '-share', 'Public Client Link')}
                                                >
                                                    <Share2 className="w-3.5 h-3.5" />
                                                    {copiedId === item._id + '-share' ? 'Link Copied!' : 'Share Client Portal Link'}
                                                </Button>
                                            )}
                                        </div>

                                        {/* APPROVED DISPLAY SEAL */}
                                        {item.status === 'approved' && item.signatureData && (
                                            <div className="pt-3 border-t border-dashed space-y-2 bg-emerald-50/50 dark:bg-emerald-950/20 p-3 rounded-xl border-emerald-200/50">
                                                <div className="flex items-center justify-between">
                                                    <p className="text-[10px] font-black text-emerald-600 uppercase flex items-center gap-1">
                                                        <ShieldCheck className="w-3.5 h-3.5" /> Digital Verification Seal
                                                    </p>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-6 text-[10px] text-emerald-700 font-bold px-2 rounded-lg"
                                                        onClick={() => {
                                                            setSelectedApproval(item)
                                                            setCertificateModalOpen(true)
                                                        }}
                                                    >
                                                        <Award className="w-3 h-3 mr-1" /> View Verification Certificate
                                                    </Button>
                                                </div>

                                                <div className="flex items-center justify-between gap-4">
                                                    <div className="p-2 bg-white rounded-xl border border-slate-200 inline-block shadow-sm">
                                                        <img src={item.signatureData} alt="Signature Seal" className="h-10 object-contain" />
                                                    </div>

                                                    <div className="text-[10px] text-muted-foreground text-right">
                                                        <p>Signed by <strong className="text-foreground">{item.signedBy}</strong></p>
                                                        <p>{new Date(item.signedAt).toLocaleDateString()}</p>
                                                        {item.signatureMetadata?.signatureHash && (
                                                            <p className="font-mono text-[9px] text-primary">{item.signatureMetadata.signatureHash}</p>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* REJECTED DISPLAY */}
                                        {item.status === 'rejected' && item.rejectionReason && (
                                            <div className="pt-2 border-t border-dashed text-xs text-rose-600 bg-rose-50 dark:bg-rose-950/20 p-3 rounded-xl border-rose-200">
                                                <p className="font-bold flex items-center gap-1 mb-0.5">
                                                    <AlertTriangle className="w-3.5 h-3.5" /> Rejection Reason:
                                                </p>
                                                <p className="text-muted-foreground">{item.rejectionReason}</p>
                                            </div>
                                        )}
                                    </CardContent>
                                </div>

                                {/* Bottom Actions for Pending */}
                                {item.status === 'pending' && (
                                    <div className="p-4 bg-muted/20 border-t flex items-center justify-between gap-3">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="text-xs text-rose-500 hover:text-rose-600 rounded-xl"
                                            onClick={() => {
                                                setSelectedApproval(item)
                                                setRejectModalOpen(true)
                                            }}
                                        >
                                            Reject
                                        </Button>

                                        <Button
                                            size="sm"
                                            onClick={() => {
                                                setSelectedApproval(item)
                                                setSigningModalOpen(true)
                                            }}
                                            className="rounded-xl font-bold gap-1.5 shadow-sm"
                                        >
                                            <FileSignature className="w-4 h-4" /> Sign & Approve Now
                                        </Button>
                                    </div>
                                )}
                            </Card>
                        )
                    })}
                </div>
            )}

            {/* Certificate Modal */}
            <Dialog open={certificateModalOpen} onOpenChange={setCertificateModalOpen}>
                <DialogContent className="sm:max-w-lg rounded-3xl p-6">
                    <DialogHeader>
                        <DialogTitle className="font-black text-xl flex items-center gap-2 text-emerald-600">
                            <Award className="h-6 w-6" /> Official Digital Signature Certificate
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            Legal proof of electronic signature and audit log hash for "{selectedApproval?.title}".
                        </DialogDescription>
                    </DialogHeader>

                    {selectedApproval && (
                        <div className="space-y-4 pt-2">
                            <div className="p-6 rounded-2xl bg-slate-950 text-slate-100 border border-slate-800 space-y-4">
                                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">VERIFICATION HASH</p>
                                        <p className="text-xs font-mono font-bold text-emerald-400">{selectedApproval.signatureMetadata?.signatureHash || 'SIG-VERIFIED'}</p>
                                    </div>
                                    <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[10px]">
                                        LEGALLY BINDING
                                    </Badge>
                                </div>

                                <div className="space-y-2 text-xs">
                                    <div className="flex justify-between py-1 border-b border-slate-900">
                                        <span className="text-slate-400">Document Title:</span>
                                        <span className="font-bold text-white">{selectedApproval.title}</span>
                                    </div>
                                    <div className="flex justify-between py-1 border-b border-slate-900">
                                        <span className="text-slate-400">Signer Legal Name:</span>
                                        <span className="font-bold text-white">{selectedApproval.signedBy}</span>
                                    </div>
                                    <div className="flex justify-between py-1 border-b border-slate-900">
                                        <span className="text-slate-400">Signed Timestamp:</span>
                                        <span className="text-white">{new Date(selectedApproval.signedAt).toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between py-1 border-b border-slate-900">
                                        <span className="text-slate-400">Captured IP Address:</span>
                                        <span className="font-mono text-emerald-400">{selectedApproval.signatureMetadata?.ipAddress || 'Recorded'}</span>
                                    </div>
                                    <div className="flex justify-between py-1">
                                        <span className="text-slate-400">Signature Method:</span>
                                        <span className="capitalize text-white">{selectedApproval.signatureMetadata?.type || 'Drawn'} Signature</span>
                                    </div>
                                </div>

                                <div className="pt-2 flex flex-col items-center justify-center space-y-2">
                                    <p className="text-[10px] text-slate-400 uppercase font-bold">DIGITAL SIGNATURE STAMP</p>
                                    <div className="p-3 bg-white rounded-xl border border-slate-200">
                                        <img src={selectedApproval.signatureData} alt="Signature" className="h-14 object-contain" />
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-2">
                                <Button variant="outline" onClick={() => window.print()} className="rounded-xl text-xs font-bold">
                                    Print Certificate
                                </Button>
                                <Button onClick={() => setCertificateModalOpen(false)} className="rounded-xl font-bold">
                                    Close
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Signing Modal */}
            <Dialog open={signingModalOpen} onOpenChange={setSigningModalOpen}>
                <DialogContent className="sm:max-w-lg rounded-3xl">
                    <DialogHeader>
                        <DialogTitle className="font-black text-xl flex items-center gap-2">
                            <FileSignature className="h-5 w-5 text-primary" /> Sign Document
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            Select signature style (Draw, Type cursive, or Upload) to officially approve "{selectedApproval?.title}".
                        </DialogDescription>
                    </DialogHeader>

                    <SignaturePad
                        onSave={handleSignSubmit}
                        onCancel={() => setSigningModalOpen(false)}
                        saving={signing}
                        defaultSignerName={currentUser?.name || ''}
                    />
                </DialogContent>
            </Dialog>

            {/* Rejection Modal */}
            <Dialog open={rejectModalOpen} onOpenChange={setRejectModalOpen}>
                <DialogContent className="sm:max-w-md rounded-3xl">
                    <DialogHeader>
                        <DialogTitle className="font-black text-xl text-rose-600 flex items-center gap-2">
                            <XCircle className="h-5 w-5" /> Reject Request
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            State the rejection reason for "{selectedApproval?.title}".
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleRejectSubmit} className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold uppercase text-muted-foreground">Rejection Reason *</label>
                            <textarea
                                value={rejectionReason}
                                onChange={(e) => setRejectionReason(e.target.value)}
                                placeholder="Explain why this approval request is being rejected..."
                                required
                                rows={3}
                                className="w-full bg-background border rounded-xl p-3 text-xs focus:ring-2 focus:ring-rose-500 outline-none"
                            />
                        </div>

                        <div className="flex justify-end gap-3 pt-2">
                            <Button type="button" variant="outline" onClick={() => setRejectModalOpen(false)} className="rounded-xl">
                                Cancel
                            </Button>
                            <Button type="submit" disabled={rejecting} className="rounded-xl font-bold bg-rose-600 hover:bg-rose-700 text-white">
                                {rejecting ? 'Submitting...' : 'Reject Request'}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Create Approval Modal */}
            <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
                <DialogContent className="sm:max-w-lg rounded-3xl">
                    <DialogHeader>
                        <DialogTitle className="font-black text-xl">Create Approval Request</DialogTitle>
                        <DialogDescription className="text-xs">
                            Send a sign-off request to a client with shareable link generation.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleCreateApproval} className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold uppercase text-muted-foreground">Title *</label>
                            <Input value={title} onChange={e => setTitle(e.target.value)} required placeholder="e.g. Website Homepage Design Approval" className="rounded-xl" />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold uppercase text-muted-foreground">Category</label>
                                <Select value={category} onValueChange={setCategory}>
                                    <SelectTrigger className="rounded-xl">
                                        <SelectValue placeholder="Select Category" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {Object.entries(CATEGORY_CONFIG).map(([key, cfg]) => (
                                            <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold uppercase text-muted-foreground">Due Date (Optional)</label>
                                <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="rounded-xl" />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-bold uppercase text-muted-foreground">Description / Instructions</label>
                            <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Provide instructions for the client..." className="rounded-xl" />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-bold uppercase text-muted-foreground">Document / Proof File URL</label>
                            <Input value={fileUrl} onChange={e => setFileUrl(e.target.value)} placeholder="https://..." className="rounded-xl" />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold uppercase text-muted-foreground">Associated Project (Optional)</label>
                                <Select value={projectId} onValueChange={setProjectId}>
                                    <SelectTrigger className="rounded-xl">
                                        <SelectValue placeholder="Select Project" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">None</SelectItem>
                                        {projects.map((p: any) => (
                                            <SelectItem key={p.id || p._id} value={p.id || p._id}>{p.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold uppercase text-muted-foreground">Target Client (Optional)</label>
                                <Select value={clientId} onValueChange={setClientId}>
                                    <SelectTrigger className="rounded-xl">
                                        <SelectValue placeholder="Select Client" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">None</SelectItem>
                                        {clients.map((c: any) => (
                                            <SelectItem key={c.id || c._id} value={c.id || c._id}>{c.name} {c.company ? `(${c.company})` : ''}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-3">
                            <Button type="button" variant="outline" onClick={() => setCreateModalOpen(false)} className="rounded-xl">Cancel</Button>
                            <Button type="submit" className="rounded-xl font-bold">Send Approval Request</Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    )
}
