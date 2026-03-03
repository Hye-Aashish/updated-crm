import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '@/lib/api-client'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select'
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog'
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table'
import { useToast } from '@/hooks/use-toast'
import {
    Globe, Plus, AlertTriangle, CheckCircle2, XCircle,
    IndianRupee, Eye, Trash2, Server, FileText
} from 'lucide-react'
import { format, differenceInDays } from 'date-fns'

interface DomainRecord {
    _id: string
    domainName: string
    type: 'domain' | 'hosting' | 'ssl' | 'both' | 'other'
    provider: string
    projectId: { _id: string; name: string; status: string }
    clientId: { _id: string; name: string; email: string; company: string }
    purchaseDate: string
    expiryDate: string
    amount: number
    status: 'active' | 'expired' | 'expiring-soon' | 'suspended' | 'cancelled'
    autoRenew: boolean
    notes?: string
    invoices?: { _id: string; invoiceNumber: string; total: number; status: string; date: string }[]
    renewals?: {
        renewedAt: string
        newExpiryDate: string
        amount: number
        note?: string
        invoiceId?: string
    }[]
}

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
    active: { label: 'Active', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
    'expiring-soon': { label: 'Expiring Soon', color: 'bg-amber-100 text-amber-700 border-amber-200', icon: AlertTriangle },
    expired: { label: 'Expired', color: 'bg-red-100 text-red-700 border-red-200', icon: XCircle },
    suspended: { label: 'Suspended', color: 'bg-red-100 text-red-700 border-red-200', icon: XCircle },
    cancelled: { label: 'Cancelled', color: 'bg-gray-100 text-gray-600 border-gray-200', icon: XCircle }
}

const typeLabel: Record<string, string> = {
    domain: 'Domain', hosting: 'Hosting', ssl: 'SSL', both: 'Domain + Hosting', other: 'Other'
}

export default function DomainsPage() {
    const { toast } = useToast()
    const [domains, setDomains] = useState<DomainRecord[]>([])
    const [projects, setProjects] = useState<any[]>([])
    const [clients, setClients] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [filterStatus, setFilterStatus] = useState('all')
    const [stats, setStats] = useState<any>(null)

    // Dialogs
    const [showCreate, setShowCreate] = useState(false)
    const [showDetail, setShowDetail] = useState<DomainRecord | null>(null)
    const [showInvoice, setShowInvoice] = useState<DomainRecord | null>(null)
    const [showRenew, setShowRenew] = useState<DomainRecord | null>(null)
    const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null)

    // Form state
    const [form, setForm] = useState({
        domainName: '', type: 'domain', provider: '', clientId: '', projectId: '',
        purchaseDate: '', expiryDate: '', amount: '', autoRenew: false, notes: ''
    })
    const [invoiceForm, setInvoiceForm] = useState({ dueDate: '', note: '', taxPercentage: '0' })
    const [renewForm, setRenewForm] = useState({ newExpiryDate: '', amount: '', note: '', generateInvoice: true, taxPercentage: '0' })
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        fetchAll()
    }, [])

    const fetchAll = async () => {
        setLoading(true)
        try {
            const [domainRes, projRes, clientRes] = await Promise.all([
                api.get('/domains'),
                api.get('/projects'),
                api.get('/clients')
            ])
            setDomains(domainRes.data)
            // Normalize: ensure both _id fields are present
            setProjects(projRes.data.map((p: any) => ({ ...p, _id: p._id || p.id })))
            setClients(clientRes.data.map((c: any) => ({ ...c, _id: c._id || c.id })))

            try {
                const statsRes = await api.get('/domains/stats/summary')
                setStats(statsRes.data)
            } catch { /* ignore */ }
        } catch (err) {
            toast({ title: 'Error', description: 'Failed to load data', variant: 'destructive' })
        } finally {
            setLoading(false)
        }
    }

    const handleCreate = async () => {
        if (!form.domainName || !form.provider || !form.clientId || !form.purchaseDate || !form.expiryDate || !form.amount) {
            toast({ title: 'Validation Error', description: 'Please fill all required fields', variant: 'destructive' })
            return
        }
        setSaving(true)
        try {
            await api.post('/domains', {
                ...form,
                amount: parseFloat(form.amount)
            })
            toast({ title: '✅ Created', description: 'Entry added successfully' })
            setShowCreate(false)
            resetForm()
            fetchAll()
        } catch (err: any) {
            const msg = err.response?.data?.message || err.message || 'Failed to create entry'
            toast({ title: 'Error', description: msg, variant: 'destructive' })
        } finally {
            setSaving(false)
        }
    }

    const handleGenerateInvoice = async () => {
        setSaving(true)
        try {
            const res = await api.post(`/domains/${showInvoice!._id}/generate-invoice`, {
                dueDate: invoiceForm.dueDate || undefined,
                note: invoiceForm.note,
                taxPercentage: parseFloat(invoiceForm.taxPercentage)
            })
            toast({ title: '🧾 Invoice Generated', description: `Invoice ${res.data.invoice.invoiceNumber} created` })
            setShowInvoice(null)
            fetchAll()
        } catch (err: any) {
            toast({ title: 'Error', description: err.response?.data?.message || 'Failed to generate invoice', variant: 'destructive' })
        } finally {
            setSaving(false)
        }
    }

    const handleRenew = async () => {
        if (!renewForm.newExpiryDate) {
            toast({ title: 'Validation', description: 'Please select a new expiry date', variant: 'destructive' })
            return
        }
        setSaving(true)
        try {
            await api.post(`/domains/${showRenew!._id}/renew`, {
                newExpiryDate: renewForm.newExpiryDate,
                amount: renewForm.amount || undefined,
                note: renewForm.note,
                generateInvoice: renewForm.generateInvoice,
                taxPercentage: parseFloat(renewForm.taxPercentage)
            })
            toast({ title: '✅ Renewed', description: 'Domain/Hosting renewed successfully' })
            setShowRenew(null)
            fetchAll()
        } catch (err: any) {
            toast({ title: 'Error', description: err.response?.data?.message || 'Failed to renew', variant: 'destructive' })
        } finally {
            setSaving(false)
        }
    }

    const handleDelete = async (id: string) => {
        try {
            await api.delete(`/domains/${id}`)
            toast({ title: 'Deleted', description: 'Entry removed successfully' })
            setShowDeleteConfirm(null)
            fetchAll()
        } catch {
            toast({ title: 'Error', description: 'Failed to delete entry', variant: 'destructive' })
        }
    }

    const resetForm = () => {
        setForm({ domainName: '', type: 'domain', provider: '', clientId: '', projectId: '', purchaseDate: '', expiryDate: '', amount: '', autoRenew: false, notes: '' })
    }

    const filtered = domains.filter(d => {
        const matchSearch = d.domainName.toLowerCase().includes(search.toLowerCase()) ||
            d.clientId?.name?.toLowerCase().includes(search.toLowerCase()) ||
            d.provider.toLowerCase().includes(search.toLowerCase())
        const matchStatus = filterStatus === 'all' || d.status === filterStatus
        return matchSearch && matchStatus
    })

    const getDaysLeft = (endDate: string) => differenceInDays(new Date(endDate), new Date())

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
            </div>
        )
    }

    return (
        <div className="space-y-6 p-1 animate-in fade-in duration-300">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                        <Globe className="h-5 w-5 text-indigo-600" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Domain & Hosting</h1>
                        <p className="text-sm text-gray-500">Manage digital assets and renewals</p>
                    </div>
                </div>
                <Button onClick={() => setShowCreate(true)} className="bg-indigo-600 hover:bg-indigo-700">
                    <Plus className="h-4 w-4 mr-2" /> New Entry
                </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {[
                    { label: 'Total Assets', value: stats?.total ?? domains.length, icon: Globe, color: 'text-indigo-600', bg: 'bg-indigo-50' },
                    { label: 'Active', value: stats?.active ?? domains.filter(a => a.status === 'active').length, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                    { label: 'Expiring Soon', value: stats?.expiringSoon ?? domains.filter(a => a.status === 'expiring-soon').length, icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50' },
                    { label: 'Expired', value: stats?.expired ?? domains.filter(a => a.status === 'expired').length, icon: XCircle, color: 'text-red-600', bg: 'bg-red-50' },
                    { label: 'Total Cost', value: `₹${((stats?.totalCost ?? domains.reduce((s, a) => s + a.amount, 0)) / 1000).toFixed(0)}K`, icon: IndianRupee, color: 'text-violet-600', bg: 'bg-violet-50' },
                ].map(({ label, value, icon: Icon, color, bg }) => (
                    <Card key={label} className="border-0 shadow-sm">
                        <CardContent className="p-4 flex items-center gap-3">
                            <div className={`h-9 w-9 ${bg} rounded-lg flex items-center justify-center`}>
                                <Icon className={`h-4 w-4 ${color}`} />
                            </div>
                            <div>
                                <p className="text-xs text-gray-500">{label}</p>
                                <p className="text-xl font-bold text-gray-900">{value}</p>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
                <Input
                    placeholder="Search domain, client, provider..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="max-w-sm"
                />
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="w-40">
                        <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="expiring-soon">Expiring Soon</SelectItem>
                        <SelectItem value="expired">Expired</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Table */}
            <Card className="border-0 shadow-sm">
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-gray-50">
                                <TableHead className="pl-5">Asset Name</TableHead>
                                <TableHead>Client</TableHead>
                                <TableHead>Cost</TableHead>
                                <TableHead>End Date</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Invoices</TableHead>
                                <TableHead className="text-right pr-5">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filtered.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={9} className="text-center py-12 text-gray-400">
                                        <Server className="h-10 w-10 mx-auto mb-2 opacity-30" />
                                        No entries found
                                    </TableCell>
                                </TableRow>
                            )}
                            {filtered.map(item => {
                                const sc = statusConfig[item.status] || statusConfig['active']
                                const daysLeft = getDaysLeft(item.expiryDate)
                                return (
                                    <TableRow key={item._id} className="hover:bg-gray-50/50 transition-colors">
                                        <TableCell className="pl-5 font-medium text-gray-900">
                                            <div>{item.domainName}</div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <div className="h-7 w-7 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                                                    {item.clientId?.name?.charAt(0) ?? 'C'}
                                                </div>
                                                <div>
                                                    <div className="text-sm font-medium">{item.clientId?.name}</div>
                                                    <div className="text-xs text-gray-400 truncate max-w-[120px]">{item.provider} &bull; {typeLabel[item.type] || item.type}</div>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="font-semibold">
                                            ₹{item.amount?.toLocaleString('en-IN')}
                                        </TableCell>
                                        <TableCell>
                                            <div className="text-sm">{format(new Date(item.expiryDate), 'dd MMM yyyy')}</div>
                                            {daysLeft >= 0 ? (
                                                <div className={`text-xs mt-0.5 ${daysLeft <= 30 ? 'text-amber-600 font-medium' : 'text-gray-400'}`}>
                                                    {daysLeft} days left
                                                </div>
                                            ) : (
                                                <div className="text-xs mt-0.5 text-red-500 font-medium">
                                                    Expired {Math.abs(daysLeft)} days ago
                                                </div>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${sc.color}`}>
                                                <sc.icon className="h-3 w-3" />
                                                {sc.label}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1">
                                                <span className="text-sm font-semibold text-gray-700">{item.invoices?.length ?? 0}</span>
                                                <FileText className="h-3.5 w-3.5 text-gray-400" />
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right pr-5">
                                            <div className="flex items-center justify-end gap-1">
                                                <Button size="sm" variant="outline" className="h-8 text-xs font-medium border-emerald-200 text-emerald-700 hover:bg-emerald-50 bg-emerald-50/50 mr-1" onClick={() => {
                                                    setRenewForm(f => ({ ...f, amount: item.amount.toString() }))
                                                    setShowRenew(item)
                                                }}>
                                                    Renew
                                                </Button>
                                                <Button size="icon" variant="ghost" className="h-8 w-8 text-gray-500" title="View Details" onClick={() => setShowDetail(item)}>
                                                    <Eye className="h-4 w-4" />
                                                </Button>
                                                <Button size="icon" variant="ghost" className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50" title="Generate Invoice" onClick={() => setShowInvoice(item)}>
                                                    <FileText className="h-4 w-4" />
                                                </Button>
                                                <Button size="icon" variant="ghost" className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50" title="Delete" onClick={() => setShowDeleteConfirm(item._id)}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )
                            })}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* ─── Create Dialog ─── */}
            <Dialog open={showCreate} onOpenChange={setShowCreate}>
                <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Plus className="h-5 w-5 text-indigo-600" /> New Domain / Hosting
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="grid grid-cols-1 gap-4">
                            <div>
                                <Label>Domain Name / Title *</Label>
                                <Input placeholder="e.g., example.com" value={form.domainName} onChange={e => setForm(f => ({ ...f, domainName: e.target.value }))} className="mt-1" />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <Label>Client *</Label>
                                    <Select
                                        value={form.clientId}
                                        onValueChange={v => setForm(f => ({ ...f, clientId: v, projectId: '' }))}
                                    >
                                        <SelectTrigger className="mt-1"><SelectValue placeholder="Select client" /></SelectTrigger>
                                        <SelectContent>
                                            {clients.map(c => <SelectItem key={c._id} value={c._id}>{c.name} — {c.company}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label>Project (Optional)</Label>
                                    <Select
                                        value={form.projectId}
                                        onValueChange={v => {
                                            const selectedProject = projects.find(p => p._id === v);
                                            const pClientId = typeof selectedProject?.clientId === 'object' ? selectedProject?.clientId?._id : selectedProject?.clientId;
                                            setForm(f => ({ ...f, projectId: v, ...(pClientId && !f.clientId ? { clientId: pClientId } : {}) }));
                                        }}
                                        disabled={!form.clientId && clients.length > 0 && projects.length > 0}
                                    >
                                        <SelectTrigger className="mt-1">
                                            <SelectValue placeholder={!form.clientId ? "Select client first" : "Select project"} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">None</SelectItem>
                                            {projects
                                                .filter(p => !form.clientId || (typeof p.clientId === 'object' ? p.clientId?._id : p.clientId) === form.clientId)
                                                .map(p => <SelectItem key={p._id} value={p._id}>{p.name}</SelectItem>)
                                            }
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <Label>Service Type *</Label>
                                    <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
                                        <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            {Object.entries(typeLabel).map(([k, v]) => (
                                                <SelectItem key={k} value={k}>{v}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label>Provider *</Label>
                                    <Input placeholder="GoDaddy, AWS, Hostinger..." value={form.provider} onChange={e => setForm(f => ({ ...f, provider: e.target.value }))} className="mt-1" />
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <Label>Purchase Date *</Label>
                                    <Input type="date" value={form.purchaseDate} onChange={e => setForm(f => ({ ...f, purchaseDate: e.target.value }))} className="mt-1" />
                                </div>
                                <div>
                                    <Label>Expiry Date *</Label>
                                    <Input type="date" value={form.expiryDate} onChange={e => setForm(f => ({ ...f, expiryDate: e.target.value }))} className="mt-1" />
                                </div>
                                <div>
                                    <Label>Cost (₹) *</Label>
                                    <Input type="number" placeholder="e.g. 5000" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} className="mt-1" />
                                </div>
                            </div>
                            <div>
                                <Label>Notes / Details</Label>
                                <Textarea placeholder="Hosting plan details, credentials note, etc." value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="mt-1 h-20 resize-none" />
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
                        <Button onClick={handleCreate} disabled={saving} className="bg-indigo-600 hover:bg-indigo-700">
                            {saving ? 'Creating...' : 'Create Entry'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ─── Detail Dialog ─── */}
            <Dialog open={!!showDetail} onOpenChange={() => setShowDetail(null)}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Globe className="h-5 w-5 text-indigo-600" /> {showDetail?.domainName}
                        </DialogTitle>
                    </DialogHeader>
                    {showDetail && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4 text-sm mt-3">
                                <div className="space-y-2">
                                    <div><span className="text-gray-500">Client:</span> <span className="font-medium ml-1">{showDetail.clientId?.name}</span></div>
                                    <div><span className="text-gray-500">Provider:</span> <span className="ml-1">{showDetail.provider}</span></div>
                                    <div><span className="text-gray-500">Amount:</span> <span className="font-semibold ml-1">₹{showDetail.amount?.toLocaleString('en-IN')}</span></div>
                                    <div><span className="text-gray-500">Type:</span> <span className="ml-1">{typeLabel[showDetail.type] || showDetail.type}</span></div>
                                </div>
                                <div className="space-y-2">
                                    <div><span className="text-gray-500">Start:</span> <span className="ml-1">{format(new Date(showDetail.purchaseDate), 'dd MMM yyyy')}</span></div>
                                    <div><span className="text-gray-500">End:</span> <span className="ml-1">{format(new Date(showDetail.expiryDate), 'dd MMM yyyy')}</span></div>
                                    <div><span className="text-gray-500">Status:</span>
                                        <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-medium border ${statusConfig[showDetail.status]?.color}`}>{statusConfig[showDetail.status]?.label}</span>
                                    </div>
                                </div>
                            </div>

                            {showDetail.projectId && (
                                <div className="text-sm">
                                    <span className="text-gray-500">Linked Project:</span> <Link to={`/projects/${showDetail.projectId._id}`} className="text-indigo-600 hover:underline ml-1 font-medium">{showDetail.projectId.name}</Link>
                                </div>
                            )}

                            {showDetail.invoices && showDetail.invoices.length > 0 && (
                                <div>
                                    <p className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                                        <FileText className="h-4 w-4" /> Linked Invoices
                                    </p>
                                    <div className="space-y-2">
                                        {showDetail.invoices.map((inv: any) => (
                                            <div key={inv._id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 text-sm border">
                                                <div className="flex items-center gap-3">
                                                    <span className="font-medium text-indigo-600">#{inv.invoiceNumber}</span>
                                                    <span className="text-gray-500">{format(new Date(inv.date), 'dd MMM yyyy')}</span>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <span className="font-semibold">₹{inv.total?.toLocaleString('en-IN')}</span>
                                                    <Badge className={`text-xs ${inv.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : inv.status === 'overdue' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>{inv.status}</Badge>
                                                    <Link to={`/invoices/${inv._id}`} className="text-indigo-600 hover:text-indigo-700">
                                                        <Eye className="h-4 w-4" />
                                                    </Link>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {showDetail.renewals && showDetail.renewals.length > 0 && (
                                <div>
                                    <p className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                                        <CheckCircle2 className="h-4 w-4" /> Renewal History
                                    </p>
                                    <div className="space-y-2">
                                        {showDetail.renewals.map((r: any, idx) => (
                                            <div key={idx} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 text-sm border">
                                                <div className="flex flex-col">
                                                    <span className="text-xs text-gray-500">Renewed On: {format(new Date(r.renewedAt), 'dd MMM yyyy')}</span>
                                                    <span className="font-medium">New Expiry: {format(new Date(r.newExpiryDate), 'dd MMM yyyy')}</span>
                                                    {r.note && <span className="text-xs text-gray-400 italic mt-0.5">{r.note}</span>}
                                                </div>
                                                <div className="font-semibold">₹{r.amount?.toLocaleString('en-IN')}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {showDetail.notes && (
                                <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-600">
                                    <strong>Notes:</strong> {showDetail.notes}
                                </div>
                            )}
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* ─── Generate Invoice Dialog ─── */}
            <Dialog open={!!showInvoice} onOpenChange={() => setShowInvoice(null)}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <FileText className="h-5 w-5 text-indigo-600" /> Generate Invoice
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="bg-indigo-50 rounded-lg p-3 text-sm">
                            <div className="font-medium text-indigo-900">{showInvoice?.domainName}</div>
                            <div className="text-indigo-700 mt-1 text-base font-bold">₹{showInvoice?.amount?.toLocaleString('en-IN')}</div>
                        </div>
                        <div>
                            <Label>Due Date (optional)</Label>
                            <Input type="date" value={invoiceForm.dueDate} onChange={e => setInvoiceForm(f => ({ ...f, dueDate: e.target.value }))} className="mt-1" />
                            <p className="text-xs text-gray-400 mt-1">Defaults to 15 days from today</p>
                        </div>
                        <div>
                            <Label>Tax %</Label>
                            <Input type="number" placeholder="0" value={invoiceForm.taxPercentage} onChange={e => setInvoiceForm(f => ({ ...f, taxPercentage: e.target.value }))} className="mt-1 w-24" />
                        </div>
                        <div>
                            <Label>Note (optional)</Label>
                            <Input placeholder="e.g. For 2026-2027" value={invoiceForm.note} onChange={e => setInvoiceForm(f => ({ ...f, note: e.target.value }))} className="mt-1" />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowInvoice(null)}>Cancel</Button>
                        <Button onClick={handleGenerateInvoice} disabled={saving} className="bg-indigo-600 hover:bg-indigo-700">
                            {saving ? 'Generating...' : 'Generate Invoice'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ─── Renew Dialog ─── */}
            <Dialog open={!!showRenew} onOpenChange={() => setShowRenew(null)}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <CheckCircle2 className="h-5 w-5 text-emerald-600" /> Renew {showRenew?.domainName}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="bg-emerald-50 rounded-lg p-3 text-sm text-emerald-900 border border-emerald-100">
                            <strong>Current Expiry:</strong> {showRenew?.expiryDate ? format(new Date(showRenew.expiryDate), 'dd MMM yyyy') : 'N/A'}
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>New Expiry Date *</Label>
                                <Input type="date" value={renewForm.newExpiryDate} onChange={e => setRenewForm(f => ({ ...f, newExpiryDate: e.target.value }))} className="mt-1" />
                            </div>
                            <div>
                                <Label>Renewal Cost (₹)</Label>
                                <Input type="number" placeholder="Defaults to previous" value={renewForm.amount} onChange={e => setRenewForm(f => ({ ...f, amount: e.target.value }))} className="mt-1" />
                            </div>
                        </div>
                        <div>
                            <Label>Note (optional)</Label>
                            <Input placeholder="e.g. Registered for 1 year" value={renewForm.note} onChange={e => setRenewForm(f => ({ ...f, note: e.target.value }))} className="mt-1" />
                        </div>

                        <div className="pt-2 border-t mt-4 border-gray-100">
                            <label className="flex items-center gap-2 cursor-pointer mb-3">
                                <input type="checkbox" checked={renewForm.generateInvoice} onChange={e => setRenewForm(f => ({ ...f, generateInvoice: e.target.checked }))} className="rounded text-indigo-600" />
                                <span className="text-sm font-medium">Generate Invoice Automatically</span>
                            </label>

                            {renewForm.generateInvoice && (
                                <div>
                                    <Label>Tax % for Invoice</Label>
                                    <Input type="number" placeholder="0" value={renewForm.taxPercentage} onChange={e => setRenewForm(f => ({ ...f, taxPercentage: e.target.value }))} className="mt-1 w-24" />
                                </div>
                            )}
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowRenew(null)}>Cancel</Button>
                        <Button onClick={handleRenew} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
                            {saving ? 'Renewing...' : 'Confirm Renewal'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ─── Delete Confirm ─── */}
            <Dialog open={!!showDeleteConfirm} onOpenChange={() => setShowDeleteConfirm(null)}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="text-red-600 flex items-center gap-2">
                            <Trash2 className="h-5 w-5" /> Confirm Delete
                        </DialogTitle>
                    </DialogHeader>
                    <p className="text-sm text-gray-600 py-2">Are you sure you want to delete this record? This action cannot be undone.</p>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowDeleteConfirm(null)}>Cancel</Button>
                        <Button variant="destructive" onClick={() => handleDelete(showDeleteConfirm!)}>Delete</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
