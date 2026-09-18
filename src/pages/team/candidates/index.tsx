import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Avatar } from '@/components/ui/avatar'
import {
    Plus, Search, Settings, FileText, Send, CheckCircle2,
    Clock, ShieldCheck, Download, UserPlus, Copy, Eye,
    MoreHorizontal, Trash2, Mail, ExternalLink, Loader2,
    UserCheck, Users
} from 'lucide-react'
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem,
    DropdownMenuTrigger, DropdownMenuSeparator
} from '@/components/ui/dropdown-menu'
import {
    Dialog, DialogContent, DialogHeader, DialogTitle,
    DialogDescription, DialogFooter
} from '@/components/ui/dialog'
import api from '@/lib/api-client'
import { useToast } from '@/hooks/use-toast'
import { useAppStore } from '@/store'
import { getInitials } from '@/lib/utils'

import OnboardingFormCustomizer from './form-customizer'
import OfferLetterDialog from './offer-letter-dialog'
import OfferApprovalDialog from './offer-approval-dialog'

export function OfferLettersPage() {
    const { toast } = useToast()
    const { currentUser } = useAppStore()

    const [loading, setLoading] = useState(true)
    const [candidates, setCandidates] = useState<any[]>([])
    const [statusFilter, setStatusFilter] = useState('all')
    const [searchQuery, setSearchQuery] = useState('')

    // Modals state
    const [isCustomizerOpen, setIsCustomizerOpen] = useState(false)
    const [isInviteOpen, setIsInviteOpen] = useState(false)
    const [isOfferDialogOpen, setIsOfferDialogOpen] = useState(false)
    const [isApprovalDialogOpen, setIsApprovalDialogOpen] = useState(false)
    const [isDetailsDrawerOpen, setIsDetailsDrawerOpen] = useState(false)
    const [selectedCandidate, setSelectedCandidate] = useState<any>(null)

    // Invite Candidate Form State
    const [inviteForm, setInviteForm] = useState({
        name: '',
        email: '',
        phone: '',
        designation: '',
        department: 'Engineering',
        ctcAnnual: '',
        joiningDate: '',
        sendEmailInvite: true
    })
    const [inviting, setInviting] = useState(false)
    const [generatedLink, setGeneratedLink] = useState<string | null>(null)

    const isAdminOrOwner = currentUser?.role === 'admin' || currentUser?.role === 'owner'

    useEffect(() => {
        fetchCandidates()
    }, [statusFilter, searchQuery])

    const fetchCandidates = async () => {
        try {
            setLoading(true)
            const params: any = {}
            if (statusFilter !== 'all') params.status = statusFilter
            if (searchQuery) params.search = searchQuery

            const res = await api.get('/candidates', { params })
            setCandidates(res.data)
        } catch (err: any) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: err.response?.data?.message || 'Failed to fetch candidate list'
            })
        } finally {
            setLoading(false)
        }
    }

    const handleInviteCandidate = async (e: React.FormEvent) => {
        e.preventDefault()
        try {
            setInviting(true)
            const res = await api.post('/candidates/invite', inviteForm)
            toast({
                title: 'Candidate Invited!',
                description: `Invitation generated for ${inviteForm.name}`
            })
            setGeneratedLink(res.data.inviteLink)
            fetchCandidates()
        } catch (err: any) {
            toast({
                variant: 'destructive',
                title: 'Invitation Failed',
                description: err.response?.data?.message || err.message
            })
        } finally {
            setInviting(false)
        }
    }

    const handleSendOfferEmail = async (candidateId: string) => {
        try {
            const res = await api.post(`/candidates/${candidateId}/send-offer`)
            toast({
                title: 'Offer Dispatched',
                description: res.data.message
            })
            fetchCandidates()
        } catch (err: any) {
            toast({
                variant: 'destructive',
                title: 'Failed to Send Offer',
                description: err.response?.data?.message || err.message
            })
        }
    }

    const handleConvertToEmployee = async (candidateId: string) => {
        if (!confirm('Are you sure you want to convert this candidate into an active CRM Employee account?')) return
        try {
            const res = await api.post(`/candidates/${candidateId}/convert-to-employee`)
            toast({
                title: 'Employee Account Created!',
                description: 'Candidate is now registered in the CRM Team list.'
            })
            fetchCandidates()
        } catch (err: any) {
            toast({
                variant: 'destructive',
                title: 'Conversion Failed',
                description: err.response?.data?.message || err.message
            })
        }
    }

    const handleDeleteCandidate = async (candidateId: string) => {
        if (!confirm('Are you sure you want to delete this candidate record?')) return
        try {
            await api.delete(`/candidates/${candidateId}`)
            toast({ title: 'Deleted', description: 'Candidate record removed' })
            fetchCandidates()
        } catch (err: any) {
            toast({ variant: 'destructive', title: 'Error', description: err.message })
        }
    }

    const copyToClipboard = (text: string, label = 'Link') => {
        navigator.clipboard.writeText(text)
        toast({ title: 'Copied!', description: `${label} copied to clipboard` })
    }

    const handleDownloadCandidatePDF = async (cand: any) => {
        try {
            toast({ title: 'Downloading PDF...', description: `Fetching offer letter for ${cand.name}` })
            const res = await api.get(`/candidates/${cand._id}/pdf`, { responseType: 'blob' })
            const blob = new Blob([res.data], { type: 'application/pdf' })
            const url = window.URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `Offer_Letter_${(cand.name || 'Candidate').replace(/\s+/g, '_')}.pdf`
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
            toast({ title: 'Download Complete', description: 'PDF saved successfully.' })
        } catch (err: any) {
            toast({
                variant: 'destructive',
                title: 'Download Failed',
                description: err.response?.data?.message || err.message || 'Could not download PDF'
            })
        }
    }

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'invited':
                return <Badge variant="outline" className="bg-slate-100 text-slate-700 border-slate-300 text-[11px]">Form Sent</Badge>
            case 'submitted':
                return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300 text-[11px]">Details Submitted</Badge>
            case 'offer_drafted':
                return <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-300 text-[11px]">Offer Drafted</Badge>
            case 'pending_approval':
                return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300 text-[11px] animate-pulse">Pending Approval</Badge>
            case 'approved':
                return <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300 text-[11px]">Approved</Badge>
            case 'rejected':
                return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300 text-[11px]">Rejected</Badge>
            case 'offer_sent':
                return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-300 text-[11px]">Offer Sent</Badge>
            case 'accepted':
                return <Badge variant="outline" className="bg-green-100 text-green-800 border-green-400 text-[11px]">Offer Accepted</Badge>
            case 'declined':
                return <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-300 text-[11px]">Declined</Badge>
            case 'converted':
                return <Badge variant="outline" className="bg-teal-100 text-teal-800 border-teal-400 text-[11px]">Employee Created</Badge>
            default:
                return <Badge variant="outline" className="text-[11px]">{status}</Badge>
        }
    }

    // Counts for stat cards
    const totalCount = candidates.length
    const submittedCount = candidates.filter(c => ['submitted', 'offer_drafted'].includes(c.status)).length
    const pendingApprovalCount = candidates.filter(c => c.status === 'pending_approval').length
    const approvedCount = candidates.filter(c => ['approved', 'offer_sent', 'accepted', 'converted'].includes(c.status)).length

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
                        <FileText className="h-6 w-6 text-primary" /> Offer Letters & Candidate Onboarding
                    </h1>
                    <p className="text-xs text-slate-500 mt-1">
                        Send customizable onboarding forms, collect verified documents, draft CTC offer letters & get admin approval.
                    </p>
                </div>
                <div className="flex items-center gap-2.5">
                    {isAdminOrOwner && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setIsCustomizerOpen(true)}
                            className="text-xs"
                        >
                            <Settings className="h-3.5 w-3.5 mr-1.5" /> Customize Form
                        </Button>
                    )}
                    <Button
                        size="sm"
                        onClick={() => {
                            setGeneratedLink(null)
                            setInviteForm({
                                name: '', email: '', phone: '', designation: '',
                                department: 'Engineering', ctcAnnual: '', joiningDate: '',
                                sendEmailInvite: true
                            })
                            setIsInviteOpen(true)
                        }}
                        className="bg-primary text-white font-semibold text-xs shadow-sm"
                    >
                        <Plus className="h-3.5 w-3.5 mr-1.5" /> Invite Candidate
                    </Button>
                </div>
            </div>

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="shadow-sm border-slate-200">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-xs text-slate-500 font-medium">Total Candidates</p>
                            <h3 className="text-2xl font-bold text-slate-900 mt-0.5">{totalCount}</h3>
                        </div>
                        <div className="h-10 w-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                            <Users className="h-5 w-5" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="shadow-sm border-slate-200">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-xs text-slate-500 font-medium">Details & Docs Submitted</p>
                            <h3 className="text-2xl font-bold text-blue-600 mt-0.5">{submittedCount}</h3>
                        </div>
                        <div className="h-10 w-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                            <CheckCircle2 className="h-5 w-5" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="shadow-sm border-slate-200">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-xs text-slate-500 font-medium">Pending Admin Approval</p>
                            <h3 className="text-2xl font-bold text-amber-600 mt-0.5">{pendingApprovalCount}</h3>
                        </div>
                        <div className="h-10 w-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                            <Clock className="h-5 w-5" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="shadow-sm border-slate-200">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-xs text-slate-500 font-medium">Approved / Active</p>
                            <h3 className="text-2xl font-bold text-emerald-600 mt-0.5">{approvedCount}</h3>
                        </div>
                        <div className="h-10 w-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                            <ShieldCheck className="h-5 w-5" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Filter & Search Bar */}
            <Card className="shadow-sm border-slate-200">
                <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                        <div className="relative w-full sm:w-80">
                            <Search className="h-4 w-4 absolute left-3 top-2.5 text-slate-400" />
                            <Input
                                placeholder="Search by name, email, role..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="pl-9 text-xs h-9"
                            />
                        </div>

                        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto no-scrollbar">
                            {[
                                { id: 'all', label: 'All' },
                                { id: 'invited', label: 'Invited' },
                                { id: 'submitted', label: 'Submitted' },
                                { id: 'pending_approval', label: 'Pending Approval' },
                                { id: 'approved', label: 'Approved' },
                                { id: 'offer_sent', label: 'Offer Sent' },
                                { id: 'accepted', label: 'Accepted' },
                                { id: 'converted', label: 'Converted' }
                            ].map(filter => (
                                <Button
                                    key={filter.id}
                                    variant={statusFilter === filter.id ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => setStatusFilter(filter.id)}
                                    className="text-xs h-8 px-3 whitespace-nowrap"
                                >
                                    {filter.label}
                                </Button>
                            ))}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Candidates Table */}
            <Card className="shadow-sm border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                        <thead className="bg-slate-50 border-b text-slate-600 font-semibold">
                            <tr>
                                <th className="py-3 px-4">Candidate</th>
                                <th className="py-3 px-4">Role & Department</th>
                                <th className="py-3 px-4">Status</th>
                                <th className="py-3 px-4">Docs Uploaded</th>
                                <th className="py-3 px-4">Annual CTC</th>
                                <th className="py-3 px-4">Joining Date</th>
                                <th className="py-3 px-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={7} className="py-12 text-center text-slate-500">
                                        <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto mb-2" />
                                        Loading candidates...
                                    </td>
                                </tr>
                            ) : candidates.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="py-12 text-center text-slate-500">
                                        <FileText className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                                        <p className="font-semibold text-slate-700">No candidates found</p>
                                        <p className="text-xs text-slate-400 mt-0.5">Click "Invite Candidate" to start the onboarding flow.</p>
                                    </td>
                                </tr>
                            ) : (
                                candidates.map(cand => {
                                    const docsCount = cand.documents?.length || 0
                                    const ctc = cand.offerLetter?.ctcAnnual
                                    const joiningDate = cand.offerLetter?.joiningDate
                                    const publicFormUrl = `${window.location.origin}/#/candidate-form/${cand.token}`
                                    const publicOfferUrl = `${window.location.origin}/#/offer/${cand.token}`

                                    return (
                                        <tr key={cand._id} className="hover:bg-slate-50/70 transition-colors">
                                            <td className="py-3.5 px-4">
                                                <div className="flex items-center gap-3">
                                                    <Avatar className="h-9 w-9 bg-primary/10 text-primary font-bold text-xs flex items-center justify-center">
                                                        {getInitials(cand.name)}
                                                    </Avatar>
                                                    <div>
                                                        <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                                                            {cand.name}
                                                        </div>
                                                        <div className="text-[11px] text-slate-500">{cand.email}</div>
                                                    </div>
                                                </div>
                                            </td>

                                            <td className="py-3.5 px-4">
                                                <div className="font-medium text-slate-800">{cand.designation || 'N/A'}</div>
                                                <div className="text-[11px] text-slate-400">{cand.department || 'General'}</div>
                                            </td>

                                            <td className="py-3.5 px-4">
                                                {getStatusBadge(cand.status)}
                                            </td>

                                            <td className="py-3.5 px-4">
                                                <button
                                                    onClick={() => {
                                                        setSelectedCandidate(cand)
                                                        setIsDetailsDrawerOpen(true)
                                                    }}
                                                    className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded border transition-colors ${
                                                        docsCount > 0
                                                            ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                                                            : 'bg-slate-50 text-slate-500 border-slate-200'
                                                    }`}
                                                >
                                                    <FileText className="h-3 w-3" />
                                                    {docsCount} Uploaded
                                                </button>
                                            </td>

                                            <td className="py-3.5 px-4">
                                                {ctc ? (
                                                    <span className="font-semibold text-slate-800">₹{ctc.toLocaleString('en-IN')}</span>
                                                ) : (
                                                    <span className="text-slate-400">-</span>
                                                )}
                                            </td>

                                            <td className="py-3.5 px-4 text-slate-600">
                                                {joiningDate ? (
                                                    new Date(joiningDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                                                ) : (
                                                    <span className="text-slate-400">-</span>
                                                )}
                                            </td>

                                            <td className="py-3.5 px-4 text-right">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    {/* Primary CTA based on status */}
                                                    {['invited', 'submitted'].includes(cand.status) && (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => {
                                                                setSelectedCandidate(cand)
                                                                setIsOfferDialogOpen(true)
                                                            }}
                                                            className="text-xs h-7 px-2.5 text-primary border-primary/30 hover:bg-primary/5"
                                                        >
                                                            Generate Offer
                                                        </Button>
                                                    )}

                                                    {cand.status === 'pending_approval' && isAdminOrOwner && (
                                                        <Button
                                                            size="sm"
                                                            onClick={() => {
                                                                setSelectedCandidate(cand)
                                                                setIsApprovalDialogOpen(true)
                                                            }}
                                                            className="text-xs h-7 px-2.5 bg-amber-600 hover:bg-amber-700 text-white shadow-sm"
                                                        >
                                                            <ShieldCheck className="h-3 w-3 mr-1" /> Review & Approve
                                                        </Button>
                                                    )}

                                                    {cand.status === 'approved' && (
                                                        <Button
                                                            size="sm"
                                                            onClick={() => handleSendOfferEmail(cand._id)}
                                                            className="text-xs h-7 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                                                        >
                                                            <Send className="h-3 w-3 mr-1" /> Send Offer
                                                        </Button>
                                                    )}

                                                    {cand.status === 'accepted' && isAdminOrOwner && (
                                                        <Button
                                                            size="sm"
                                                            onClick={() => handleConvertToEmployee(cand._id)}
                                                            className="text-xs h-7 px-2.5 bg-teal-600 hover:bg-teal-700 text-white shadow-sm"
                                                        >
                                                            <UserCheck className="h-3 w-3 mr-1" /> Convert to Employee
                                                        </Button>
                                                    )}

                                                    {/* Dropdown Options */}
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                                                                <MoreHorizontal className="h-4 w-4 text-slate-500" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end" className="text-xs w-48">
                                                            <DropdownMenuItem onClick={() => copyToClipboard(publicFormUrl, 'Candidate Form Link')}>
                                                                <Copy className="h-3.5 w-3.5 mr-2" /> Copy Form Link
                                                            </DropdownMenuItem>

                                                            <DropdownMenuItem onClick={() => {
                                                                setSelectedCandidate(cand)
                                                                setIsDetailsDrawerOpen(true)
                                                            }}>
                                                                <Eye className="h-3.5 w-3.5 mr-2" /> View Submitted Profile
                                                            </DropdownMenuItem>

                                                            <DropdownMenuItem onClick={() => {
                                                                setSelectedCandidate(cand)
                                                                setIsOfferDialogOpen(true)
                                                            }}>
                                                                <FileText className="h-3.5 w-3.5 mr-2" /> Edit / Draft Offer
                                                            </DropdownMenuItem>

                                                            {cand.offerLetter?.ctcAnnual && (
                                                                <DropdownMenuItem onClick={() => handleDownloadCandidatePDF(cand)}>
                                                                    <Download className="h-3.5 w-3.5 mr-2" /> Download PDF
                                                                </DropdownMenuItem>
                                                            )}

                                                            {['approved', 'offer_sent', 'accepted'].includes(cand.status) && (
                                                                <DropdownMenuItem onClick={() => copyToClipboard(publicOfferUrl, 'Candidate Offer Portal Link')}>
                                                                    <ExternalLink className="h-3.5 w-3.5 mr-2" /> Copy Offer Portal Link
                                                                </DropdownMenuItem>
                                                            )}

                                                            {['approved', 'offer_sent'].includes(cand.status) && (
                                                                <DropdownMenuItem onClick={() => handleSendOfferEmail(cand._id)}>
                                                                    <Mail className="h-3.5 w-3.5 mr-2" /> Resend Offer Email
                                                                </DropdownMenuItem>
                                                            )}

                                                            {isAdminOrOwner && cand.status !== 'converted' && (
                                                                <DropdownMenuItem onClick={() => handleConvertToEmployee(cand._id)}>
                                                                    <UserPlus className="h-3.5 w-3.5 mr-2 text-teal-600" /> Create Employee Account
                                                                </DropdownMenuItem>
                                                            )}

                                                            {isAdminOrOwner && (
                                                                <>
                                                                    <DropdownMenuSeparator />
                                                                    <DropdownMenuItem
                                                                        onClick={() => handleDeleteCandidate(cand._id)}
                                                                        className="text-red-600 focus:text-red-600"
                                                                    >
                                                                        <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete Record
                                                                    </DropdownMenuItem>
                                                                </>
                                                            )}
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* INVITE CANDIDATE MODAL */}
            <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-base flex items-center gap-2">
                            <UserPlus className="h-5 w-5 text-primary" /> Invite Candidate for Onboarding
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            Generate a customized onboarding link for the candidate to submit their personal info and required documents.
                        </DialogDescription>
                    </DialogHeader>

                    {generatedLink ? (
                        <div className="space-y-4 py-2">
                            <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-xs space-y-2">
                                <div className="font-semibold text-green-900 flex items-center gap-1.5">
                                    <CheckCircle2 className="h-4 w-4 text-green-600" /> Candidate Link Ready!
                                </div>
                                <p className="text-green-800">
                                    Share this secure link with the candidate. They can fill out their details and upload verification documents without needing an account.
                                </p>
                                <div className="flex items-center gap-2 bg-white p-2 rounded border border-green-200 mt-2">
                                    <input
                                        readOnly
                                        value={generatedLink}
                                        className="w-full text-xs bg-transparent border-none outline-none text-slate-700 select-all"
                                    />
                                    <Button
                                        size="sm"
                                        onClick={() => copyToClipboard(generatedLink, 'Candidate Onboarding Link')}
                                        className="h-7 text-xs px-2.5 shrink-0"
                                    >
                                        <Copy className="h-3 w-3 mr-1" /> Copy
                                    </Button>
                                </div>
                            </div>

                            <DialogFooter>
                                <Button size="sm" onClick={() => setIsInviteOpen(false)} className="w-full">
                                    Done
                                </Button>
                            </DialogFooter>
                        </div>
                    ) : (
                        <form onSubmit={handleInviteCandidate} className="space-y-3.5 py-1">
                            <div>
                                <Label className="text-xs font-semibold">Candidate Full Name *</Label>
                                <Input
                                    required
                                    value={inviteForm.name}
                                    onChange={e => setInviteForm({ ...inviteForm, name: e.target.value })}
                                    placeholder="e.g. John Doe"
                                    className="text-xs mt-1"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <Label className="text-xs font-semibold">Email Address *</Label>
                                    <Input
                                        type="email"
                                        required
                                        value={inviteForm.email}
                                        onChange={e => setInviteForm({ ...inviteForm, email: e.target.value })}
                                        placeholder="candidate@example.com"
                                        className="text-xs mt-1"
                                    />
                                </div>
                                <div>
                                    <Label className="text-xs font-semibold">Phone Number</Label>
                                    <Input
                                        value={inviteForm.phone}
                                        onChange={e => setInviteForm({ ...inviteForm, phone: e.target.value })}
                                        placeholder="+91 98765 43210"
                                        className="text-xs mt-1"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <Label className="text-xs font-semibold">Target Designation</Label>
                                    <Input
                                        value={inviteForm.designation}
                                        onChange={e => setInviteForm({ ...inviteForm, designation: e.target.value })}
                                        placeholder="e.g. Frontend Developer"
                                        className="text-xs mt-1"
                                    />
                                </div>
                                <div>
                                    <Label className="text-xs font-semibold">Department</Label>
                                    <Input
                                        value={inviteForm.department}
                                        onChange={e => setInviteForm({ ...inviteForm, department: e.target.value })}
                                        placeholder="Engineering"
                                        className="text-xs mt-1"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <Label className="text-xs font-semibold">Proposed Annual CTC (INR)</Label>
                                    <Input
                                        type="number"
                                        value={inviteForm.ctcAnnual}
                                        onChange={e => setInviteForm({ ...inviteForm, ctcAnnual: e.target.value })}
                                        placeholder="e.g. 600000"
                                        className="text-xs mt-1"
                                    />
                                </div>
                                <div>
                                    <Label className="text-xs font-semibold">Target Joining Date</Label>
                                    <Input
                                        type="date"
                                        value={inviteForm.joiningDate}
                                        onChange={e => setInviteForm({ ...inviteForm, joiningDate: e.target.value })}
                                        className="text-xs mt-1"
                                    />
                                </div>
                            </div>

                            <div className="bg-slate-50 p-2.5 rounded border flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="sendEmailInvite"
                                    checked={inviteForm.sendEmailInvite}
                                    onChange={e => setInviteForm({ ...inviteForm, sendEmailInvite: e.target.checked })}
                                    className="rounded border-slate-300 text-primary"
                                />
                                <label htmlFor="sendEmailInvite" className="text-xs text-slate-700 cursor-pointer">
                                    Send invitation link via Email directly to candidate
                                </label>
                            </div>

                            <DialogFooter className="pt-2">
                                <Button type="button" variant="outline" size="sm" onClick={() => setIsInviteOpen(false)}>
                                    Cancel
                                </Button>
                                <Button type="submit" size="sm" disabled={inviting} className="bg-primary text-white text-xs">
                                    {inviting ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
                                    Generate Invitation Link
                                </Button>
                            </DialogFooter>
                        </form>
                    )}
                </DialogContent>
            </Dialog>

            {/* CANDIDATE DETAILS & DOCUMENTS DRAWER */}
            {selectedCandidate && isDetailsDrawerOpen && (
                <Dialog open={isDetailsDrawerOpen} onOpenChange={setIsDetailsDrawerOpen}>
                    <DialogContent className="max-w-2xl max-h-[88vh] flex flex-col p-0 overflow-hidden">
                        <DialogHeader className="px-6 pt-6 pb-3 border-b bg-slate-50">
                            <div className="flex items-center justify-between">
                                <div>
                                    <DialogTitle className="text-base text-slate-900">
                                        Candidate Profile: {selectedCandidate.name}
                                    </DialogTitle>
                                    <DialogDescription className="text-xs">
                                        Email: {selectedCandidate.email} | Phone: {selectedCandidate.phone || 'N/A'}
                                    </DialogDescription>
                                </div>
                                {getStatusBadge(selectedCandidate.status)}
                            </div>
                        </DialogHeader>

                        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5 text-xs">
                            {/* Uploaded Documents List */}
                            <div className="space-y-2">
                                <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
                                    <FileText className="h-4 w-4 text-primary" /> Uploaded Verification Documents
                                </h4>
                                {(!selectedCandidate.documents || selectedCandidate.documents.length === 0) ? (
                                    <p className="text-slate-400 italic">No documents uploaded yet.</p>
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        {selectedCandidate.documents.map((d: any, idx: number) => (
                                            <div key={idx} className="p-2.5 bg-slate-50 border rounded-lg flex items-center justify-between">
                                                <div className="truncate mr-2">
                                                    <span className="font-semibold block truncate text-slate-800">{d.name}</span>
                                                    <span className="text-[10px] text-slate-400">{d.fileName}</span>
                                                </div>
                                                <a
                                                    href={d.fileUrl}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="px-2 py-1 bg-white border rounded text-primary hover:underline text-[11px] font-medium flex items-center gap-1 shrink-0"
                                                >
                                                    <Eye className="h-3 w-3" /> View
                                                </a>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Submitted Personal Details */}
                            {selectedCandidate.submittedData && (
                                <div className="space-y-4 pt-2 border-t">
                                    {selectedCandidate.submittedData.personal && (
                                        <div>
                                            <h4 className="font-bold text-slate-900 mb-2">Personal Information</h4>
                                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 bg-slate-50 p-3 rounded border">
                                                <div><span className="text-slate-400 block text-[10px]">Gender</span>{selectedCandidate.submittedData.personal.gender || 'N/A'}</div>
                                                <div><span className="text-slate-400 block text-[10px]">DOB</span>{selectedCandidate.submittedData.personal.dateOfBirth ? new Date(selectedCandidate.submittedData.personal.dateOfBirth).toLocaleDateString() : 'N/A'}</div>
                                                <div><span className="text-slate-400 block text-[10px]">Father's Name</span>{selectedCandidate.submittedData.personal.fatherName || 'N/A'}</div>
                                                <div><span className="text-slate-400 block text-[10px]">Marital Status</span>{selectedCandidate.submittedData.personal.maritalStatus || 'N/A'}</div>
                                                <div><span className="text-slate-400 block text-[10px]">Blood Group</span>{selectedCandidate.submittedData.personal.bloodGroup || 'N/A'}</div>
                                                <div><span className="text-slate-400 block text-[10px]">Emergency Contact</span>{selectedCandidate.submittedData.personal.emergencyContactName} ({selectedCandidate.submittedData.personal.emergencyContactPhone})</div>
                                            </div>
                                        </div>
                                    )}

                                    {selectedCandidate.submittedData.address && (
                                        <div>
                                            <h4 className="font-bold text-slate-900 mb-2">Address</h4>
                                            <div className="bg-slate-50 p-3 rounded border space-y-1">
                                                <div><strong>Current:</strong> {selectedCandidate.submittedData.address.currentAddress}, {selectedCandidate.submittedData.address.currentCity}, {selectedCandidate.submittedData.address.currentState} - {selectedCandidate.submittedData.address.currentPincode}</div>
                                            </div>
                                        </div>
                                    )}

                                    {selectedCandidate.submittedData.bank && (
                                        <div>
                                            <h4 className="font-bold text-slate-900 mb-2">Bank & Statutory Details</h4>
                                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 bg-slate-50 p-3 rounded border">
                                                <div><span className="text-slate-400 block text-[10px]">Bank Name</span>{selectedCandidate.submittedData.bank.bankName || 'N/A'}</div>
                                                <div><span className="text-slate-400 block text-[10px]">Account No</span>{selectedCandidate.submittedData.bank.accountNumber || 'N/A'}</div>
                                                <div><span className="text-slate-400 block text-[10px]">IFSC Code</span>{selectedCandidate.submittedData.bank.ifscCode || 'N/A'}</div>
                                                <div><span className="text-slate-400 block text-[10px]">PAN Card</span>{selectedCandidate.submittedData.bank.panNumber || 'N/A'}</div>
                                                <div><span className="text-slate-400 block text-[10px]">Aadhar No</span>{selectedCandidate.submittedData.bank.aadharNumber || 'N/A'}</div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <DialogFooter className="px-6 py-3 border-t bg-slate-50">
                            <Button size="sm" onClick={() => setIsDetailsDrawerOpen(false)}>
                                Close
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            )}

            {/* FORM CUSTOMIZER MODAL */}
            <OnboardingFormCustomizer
                open={isCustomizerOpen}
                onOpenChange={setIsCustomizerOpen}
                onSaved={fetchCandidates}
            />

            {/* OFFER LETTER GENERATOR DIALOG */}
            <OfferLetterDialog
                open={isOfferDialogOpen}
                onOpenChange={setIsOfferDialogOpen}
                candidate={selectedCandidate}
                onSaved={fetchCandidates}
            />

            {/* ADMIN APPROVAL DIALOG */}
            <OfferApprovalDialog
                open={isApprovalDialogOpen}
                onOpenChange={setIsApprovalDialogOpen}
                candidate={selectedCandidate}
                onDecision={fetchCandidates}
            />
        </div>
    )
}
export default OfferLettersPage
