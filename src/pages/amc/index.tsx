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
    Shield, Plus, RefreshCw, FileText, AlertTriangle,
    CheckCircle2, Clock, XCircle,
    IndianRupee, Eye, Trash2
} from 'lucide-react'
import { format, differenceInDays } from 'date-fns'

interface AmcRecord {
    _id: string
    name: string
    projectId: { _id: string; name: string; status: string }
    clientId: { _id: string; name: string; email: string; company: string }
    startDate: string
    endDate: string
    amount: number
    frequency: string
    status: 'active' | 'expired' | 'expiring-soon' | 'cancelled' | 'pending'
    services: string[]
    description?: string
    invoices: { _id: string; invoiceNumber: string; total: number; status: string; date: string }[]
    notes?: string
    autoInvoice: boolean
    renewalHistory: { renewedAt: string; newEndDate: string; amount: number; note?: string }[]
}

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
    active: { label: 'Active', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
    'expiring-soon': { label: 'Expiring Soon', color: 'bg-amber-100 text-amber-700 border-amber-200', icon: AlertTriangle },
    expired: { label: 'Expired', color: 'bg-red-100 text-red-700 border-red-200', icon: XCircle },
    cancelled: { label: 'Cancelled', color: 'bg-gray-100 text-gray-600 border-gray-200', icon: XCircle },
    pending: { label: 'Pending', color: 'bg-blue-100 text-blue-700 border-blue-200', icon: Clock },
}

const freqLabel: Record<string, string> = {
    monthly: 'Monthly', quarterly: 'Quarterly',
    'half-yearly': 'Half-Yearly', annually: 'Annually'
}

export default function AmcPage() {
    const { toast } = useToast()
    const [amcs, setAmcs] = useState<AmcRecord[]>([])
    const [projects, setProjects] = useState<any[]>([])
    const [clients, setClients] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [filterStatus, setFilterStatus] = useState('all')
    const [stats, setStats] = useState<any>(null)

    // Dialogs
    const [showCreate, setShowCreate] = useState(false)
    const [showRenew, setShowRenew] = useState<AmcRecord | null>(null)
    const [showInvoice, setShowInvoice] = useState<AmcRecord | null>(null)
    const [showDetail, setShowDetail] = useState<AmcRecord | null>(null)
    const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null)

    // Form states
    const [form, setForm] = useState({
        name: '', projectId: '', clientId: '', startDate: '',
        endDate: '', amount: '', frequency: 'annually',
        services: '', description: '', notes: '', autoInvoice: false
    })
    const [renewForm, setRenewForm] = useState({
        newEndDate: '', amount: '', note: '', generateInvoice: true, taxPercentage: '0'
    })
    const [invoiceForm, setInvoiceForm] = useState({ dueDate: '', note: '', taxPercentage: '0' })
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        fetchAll()
    }, [])

    const fetchAll = async () => {
        setLoading(true)
        try {
            const [amcRes, projRes, clientRes] = await Promise.all([
                api.get('/amc'),
                api.get('/projects'),
                api.get('/clients')
            ])
            setAmcs(amcRes.data)
            // Normalize: ensure both _id fields are present
            setProjects(projRes.data.map((p: any) => ({ ...p, _id: p._id || p.id })))
            setClients(clientRes.data.map((c: any) => ({ ...c, _id: c._id || c.id })))
            // stats
            try {
                const statsRes = await api.get('/amc/stats/summary')
                setStats(statsRes.data)
            } catch { /* non-critical */ }
        } catch (err) {
            toast({ title: 'Error', description: 'Failed to load AMC data', variant: 'destructive' })
        } finally {
            setLoading(false)
        }
    }

    const handleCreate = async () => {
        if (!form.name || !form.projectId || !form.clientId || !form.startDate || !form.endDate || !form.amount) {
            toast({ title: 'Validation Error', description: 'Please fill all required fields', variant: 'destructive' })
            return
        }
        setSaving(true)
        try {
            await api.post('/amc', {
                name: form.name,
                clientId: form.clientId,
                projectId: form.projectId,
                startDate: form.startDate,
                endDate: form.endDate,
                amount: parseFloat(form.amount),
                frequency: form.frequency,
                services: form.services.split(',').map((s: string) => s.trim()).filter(Boolean),
                description: form.description,
                notes: form.notes,
                autoInvoice: form.autoInvoice
            })
            toast({ title: '✅ AMC Created', description: 'New AMC contract added successfully' })
            setShowCreate(false)
            resetForm()
            fetchAll()
        } catch (err: any) {
            const msg = err.response?.data?.message || err.message || 'Failed to create AMC'
            toast({ title: 'Error creating AMC', description: msg, variant: 'destructive' })
        } finally {
            setSaving(false)
        }
    }

    const handleRenew = async () => {
        if (!renewForm.newEndDate) {
            toast({ title: 'Validation Error', description: 'New end date is required', variant: 'destructive' })
            return
        }
        setSaving(true)
        try {
            await api.post(`/amc/${showRenew!._id}/renew`, {
                ...renewForm,
                amount: renewForm.amount ? parseFloat(renewForm.amount) : undefined,
                taxPercentage: parseFloat(renewForm.taxPercentage)
            })
            toast({ title: '🔄 AMC Renewed', description: 'Contract renewed successfully!' })
            setShowRenew(null)
            fetchAll()
        } catch (err: any) {
            toast({ title: 'Error', description: err.response?.data?.message || 'Renewal failed', variant: 'destructive' })
        } finally {
            setSaving(false)
        }
    }

    const handleGenerateInvoice = async () => {
        setSaving(true)
        try {
            const res = await api.post(`/amc/${showInvoice!._id}/generate-invoice`, {
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

    const handleDelete = async (id: string) => {
        try {
            await api.delete(`/amc/${id}`)
            toast({ title: 'Deleted', description: 'AMC removed successfully' })
            setShowDeleteConfirm(null)
            fetchAll()
        } catch {
            toast({ title: 'Error', description: 'Failed to delete AMC', variant: 'destructive' })
        }
    }

    const resetForm = () => {
        setForm({ name: '', projectId: '', clientId: '', startDate: '', endDate: '', amount: '', frequency: 'annually', services: '', description: '', notes: '', autoInvoice: false })
    }

    const filtered = amcs.filter(a => {
        const matchSearch = a.name.toLowerCase().includes(search.toLowerCase()) ||
            a.clientId?.name?.toLowerCase().includes(search.toLowerCase()) ||
            a.projectId?.name?.toLowerCase().includes(search.toLowerCase())
        const matchStatus = filterStatus === 'all' || a.status === filterStatus
        return matchSearch && matchStatus
    })

    const getDaysLeft = (endDate: string) => {
        const days = differenceInDays(new Date(endDate), new Date())
        return days
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
            </div>
        )
    }

    return (
        <div className="space-y-6 p-1 animate-in fade-in duration-300">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-blue-100 rounded-xl flex items-center justify-center">
                        <Shield className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">AMC Management</h1>
                        <p className="text-sm text-gray-500">Annual Maintenance Contracts — project-wise tracking</p>
                    </div>
                </div>
                <Button onClick={() => setShowCreate(true)} className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="h-4 w-4 mr-2" /> New AMC
                </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {[
                    { label: 'Total AMCs', value: stats?.total ?? amcs.length, icon: Shield, color: 'text-blue-600', bg: 'bg-blue-50' },
                    { label: 'Active', value: stats?.active ?? amcs.filter(a => a.status === 'active').length, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                    { label: 'Expiring Soon', value: stats?.expiringSoon ?? amcs.filter(a => a.status === 'expiring-soon').length, icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50' },
                    { label: 'Expired', value: stats?.expired ?? amcs.filter(a => a.status === 'expired').length, icon: XCircle, color: 'text-red-600', bg: 'bg-red-50' },
                    { label: 'Total Revenue', value: `₹${((stats?.totalRevenue ?? amcs.reduce((s, a) => s + a.amount, 0)) / 1000).toFixed(0)}K`, icon: IndianRupee, color: 'text-violet-600', bg: 'bg-violet-50' },
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
                    placeholder="Search AMC, client, project..."
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
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Table */}
            <Card className="border-0 shadow-sm">
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-gray-50">
                                <TableHead className="pl-5">AMC Name</TableHead>
                                <TableHead>Client</TableHead>
                                <TableHead>Project</TableHead>
                                <TableHead>Amount</TableHead>
                                <TableHead>Frequency</TableHead>
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
                                        <Shield className="h-10 w-10 mx-auto mb-2 opacity-30" />
                                        No AMC contracts found
                                    </TableCell>
                                </TableRow>
                            )}
                            {filtered.map(amc => {
                                const sc = statusConfig[amc.status] || statusConfig['active']
                                const daysLeft = getDaysLeft(amc.endDate)
                                return (
                                    <TableRow key={amc._id} className="hover:bg-gray-50/50 transition-colors">
                                        <TableCell className="pl-5 font-medium text-gray-900">
                                            <div>{amc.name}</div>
                                            {amc.services?.length > 0 && (
                                                <div className="text-xs text-gray-400 mt-0.5">{amc.services.slice(0, 2).join(', ')}</div>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <div className="h-7 w-7 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                                                    {amc.clientId?.name?.charAt(0) ?? 'C'}
                                                </div>
                                                <div>
                                                    <div className="text-sm font-medium">{amc.clientId?.name}</div>
                                                    <div className="text-xs text-gray-400">{amc.clientId?.company}</div>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Link to={`/projects/${amc.projectId?._id}`} className="text-sm text-blue-600 hover:underline font-medium">
                                                {amc.projectId?.name}
                                            </Link>
                                        </TableCell>
                                        <TableCell className="font-semibold">
                                            ₹{amc.amount?.toLocaleString('en-IN')}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className="text-xs capitalize">
                                                {freqLabel[amc.frequency] || amc.frequency}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="text-sm">{format(new Date(amc.endDate), 'dd MMM yyyy')}</div>
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
                                                <span className="text-sm font-semibold text-gray-700">{amc.invoices?.length ?? 0}</span>
                                                <FileText className="h-3.5 w-3.5 text-gray-400" />
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right pr-5">
                                            <div className="flex items-center justify-end gap-1">
                                                <Button size="icon" variant="ghost" className="h-8 w-8" title="View Details" onClick={() => setShowDetail(amc)}>
                                                    <Eye className="h-4 w-4" />
                                                </Button>
                                                <Button size="icon" variant="ghost" className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50" title="Generate Invoice" onClick={() => setShowInvoice(amc)}>
                                                    <FileText className="h-4 w-4" />
                                                </Button>
                                                <Button size="icon" variant="ghost" className="h-8 w-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50" title="Renew AMC" onClick={() => { setShowRenew(amc); setRenewForm({ newEndDate: '', amount: '', note: '', generateInvoice: true, taxPercentage: '0' }) }}>
                                                    <RefreshCw className="h-4 w-4" />
                                                </Button>
                                                <Button size="icon" variant="ghost" className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50" title="Delete" onClick={() => setShowDeleteConfirm(amc._id)}>
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

            {/* ─── Create AMC Dialog ─── */}
            <Dialog open={showCreate} onOpenChange={setShowCreate}>
                <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Shield className="h-5 w-5 text-blue-600" /> Create New AMC
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="grid grid-cols-1 gap-4">
                            <div>
                                <Label htmlFor="amc-name">AMC Name *</Label>
                                <Input id="amc-name" placeholder="e.g., Website Maintenance 2025" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="mt-1" />
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
                                    <Label>Project *</Label>
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
                                            {projects
                                                .filter(p => !form.clientId || (typeof p.clientId === 'object' ? p.clientId?._id : p.clientId) === form.clientId)
                                                .map(p => <SelectItem key={p._id} value={p._id}>{p.name}</SelectItem>)
                                            }
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <Label>Start Date *</Label>
                                    <Input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} className="mt-1" />
                                </div>
                                <div>
                                    <Label>End Date *</Label>
                                    <Input type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} className="mt-1" />
                                </div>
                                <div>
                                    <Label>Amount (₹) *</Label>
                                    <Input type="number" placeholder="e.g. 24000" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} className="mt-1" />
                                </div>
                            </div>
                            <div>
                                <Label>Frequency</Label>
                                <Select value={form.frequency} onValueChange={v => setForm(f => ({ ...f, frequency: v }))}>
                                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="monthly">Monthly</SelectItem>
                                        <SelectItem value="quarterly">Quarterly</SelectItem>
                                        <SelectItem value="half-yearly">Half-Yearly</SelectItem>
                                        <SelectItem value="annually">Annually</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label>Services Covered</Label>
                                <Input placeholder="e.g. Bug fixes, Hosting, SSL, Updates (comma-separated)" value={form.services} onChange={e => setForm(f => ({ ...f, services: e.target.value }))} className="mt-1" />
                            </div>
                            <div>
                                <Label>Description / Notes</Label>
                                <Textarea placeholder="Any additional notes..." value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="mt-1 h-20 resize-none" />
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
                        <Button onClick={handleCreate} disabled={saving} className="bg-blue-600 hover:bg-blue-700">
                            {saving ? 'Creating...' : 'Create AMC'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ─── Renew Dialog ─── */}
            <Dialog open={!!showRenew} onOpenChange={() => setShowRenew(null)}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <RefreshCw className="h-5 w-5 text-emerald-600" /> Renew AMC
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="bg-gray-50 rounded-lg p-3 text-sm">
                            <div className="font-medium text-gray-800">{showRenew?.name}</div>
                            <div className="text-gray-500 mt-1">Current end: {showRenew?.endDate ? format(new Date(showRenew.endDate), 'dd MMM yyyy') : '—'}</div>
                        </div>
                        <div>
                            <Label>New End Date *</Label>
                            <Input type="date" value={renewForm.newEndDate} onChange={e => setRenewForm(f => ({ ...f, newEndDate: e.target.value }))} className="mt-1" />
                        </div>
                        <div>
                            <Label>New Amount (₹) — leave blank to keep current</Label>
                            <Input type="number" placeholder={`Current: ₹${showRenew?.amount}`} value={renewForm.amount} onChange={e => setRenewForm(f => ({ ...f, amount: e.target.value }))} className="mt-1" />
                        </div>
                        <div>
                            <Label>Note</Label>
                            <Input placeholder="e.g. Renewed for 2026" value={renewForm.note} onChange={e => setRenewForm(f => ({ ...f, note: e.target.value }))} className="mt-1" />
                        </div>
                        <div className="flex items-center gap-2">
                            <input type="checkbox" id="genInv" checked={renewForm.generateInvoice} onChange={e => setRenewForm(f => ({ ...f, generateInvoice: e.target.checked }))} className="h-4 w-4 accent-blue-600" />
                            <label htmlFor="genInv" className="text-sm text-gray-700">Generate invoice on renewal</label>
                        </div>
                        {renewForm.generateInvoice && (
                            <div>
                                <Label>Tax % on Invoice</Label>
                                <Input type="number" placeholder="e.g. 18" value={renewForm.taxPercentage} onChange={e => setRenewForm(f => ({ ...f, taxPercentage: e.target.value }))} className="mt-1 w-32" />
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowRenew(null)}>Cancel</Button>
                        <Button onClick={handleRenew} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
                            {saving ? 'Renewing...' : 'Renew Contract'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ─── Generate Invoice Dialog ─── */}
            <Dialog open={!!showInvoice} onOpenChange={() => setShowInvoice(null)}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <FileText className="h-5 w-5 text-blue-600" /> Generate AMC Invoice
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="bg-blue-50 rounded-lg p-3 text-sm">
                            <div className="font-medium text-blue-900">{showInvoice?.name}</div>
                            <div className="text-blue-700 mt-1 text-base font-bold">₹{showInvoice?.amount?.toLocaleString('en-IN')}</div>
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
                            <Input placeholder="e.g. For Q1 2025" value={invoiceForm.note} onChange={e => setInvoiceForm(f => ({ ...f, note: e.target.value }))} className="mt-1" />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowInvoice(null)}>Cancel</Button>
                        <Button onClick={handleGenerateInvoice} disabled={saving} className="bg-blue-600 hover:bg-blue-700">
                            {saving ? 'Generating...' : 'Generate Invoice'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ─── Detail Dialog ─── */}
            <Dialog open={!!showDetail} onOpenChange={() => setShowDetail(null)}>
                <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Shield className="h-5 w-5 text-blue-600" /> {showDetail?.name}
                        </DialogTitle>
                    </DialogHeader>
                    {showDetail && (
                        <div className="space-y-5">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div className="space-y-2">
                                    <div><span className="text-gray-500">Client:</span> <span className="font-medium ml-1">{showDetail.clientId?.name}</span></div>
                                    <div><span className="text-gray-500">Project:</span> <Link to={`/projects/${showDetail.projectId?._id}`} className="text-blue-600 hover:underline ml-1">{showDetail.projectId?.name}</Link></div>
                                    <div><span className="text-gray-500">Amount:</span> <span className="font-semibold ml-1">₹{showDetail.amount?.toLocaleString('en-IN')}</span></div>
                                    <div><span className="text-gray-500">Frequency:</span> <span className="ml-1">{freqLabel[showDetail.frequency]}</span></div>
                                </div>
                                <div className="space-y-2">
                                    <div><span className="text-gray-500">Start:</span> <span className="ml-1">{format(new Date(showDetail.startDate), 'dd MMM yyyy')}</span></div>
                                    <div><span className="text-gray-500">End:</span> <span className="ml-1">{format(new Date(showDetail.endDate), 'dd MMM yyyy')}</span></div>
                                    <div><span className="text-gray-500">Status:</span>
                                        <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-medium border ${statusConfig[showDetail.status]?.color}`}>{statusConfig[showDetail.status]?.label}</span>
                                    </div>
                                </div>
                            </div>

                            {showDetail.services?.length > 0 && (
                                <div>
                                    <p className="text-sm font-medium text-gray-700 mb-2">Services Covered</p>
                                    <div className="flex flex-wrap gap-2">
                                        {showDetail.services.map((s, i) => (
                                            <Badge key={i} variant="secondary" className="text-xs">{s}</Badge>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {showDetail.invoices?.length > 0 && (
                                <div>
                                    <p className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                                        <FileText className="h-4 w-4" /> Linked Invoices
                                    </p>
                                    <div className="space-y-2">
                                        {showDetail.invoices.map((inv: any) => (
                                            <div key={inv._id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 text-sm">
                                                <div className="flex items-center gap-3">
                                                    <span className="font-medium text-blue-600">#{inv.invoiceNumber}</span>
                                                    <span className="text-gray-500">{format(new Date(inv.date), 'dd MMM yyyy')}</span>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <span className="font-semibold">₹{inv.total?.toLocaleString('en-IN')}</span>
                                                    <Badge className={`text-xs ${inv.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : inv.status === 'overdue' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>{inv.status}</Badge>
                                                    <Link to={`/invoices/${inv._id}`} className="text-blue-600 hover:text-blue-700">
                                                        <Eye className="h-4 w-4" />
                                                    </Link>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {showDetail.renewalHistory?.length > 0 && (
                                <div>
                                    <p className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                                        <RefreshCw className="h-4 w-4" /> Renewal History
                                    </p>
                                    <div className="space-y-2">
                                        {showDetail.renewalHistory.map((r: any, i: number) => (
                                            <div key={i} className="bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2 text-sm">
                                                <div className="flex justify-between">
                                                    <span className="text-gray-600">Renewed on {format(new Date(r.renewedAt), 'dd MMM yyyy')}</span>
                                                    <span className="font-medium text-emerald-700">→ {format(new Date(r.newEndDate), 'dd MMM yyyy')}</span>
                                                </div>
                                                {r.amount && <div className="text-gray-500 mt-1">₹{r.amount?.toLocaleString('en-IN')}{r.note ? ` — ${r.note}` : ''}</div>}
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

            {/* ─── Delete Confirm ─── */}
            <Dialog open={!!showDeleteConfirm} onOpenChange={() => setShowDeleteConfirm(null)}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="text-red-600 flex items-center gap-2">
                            <Trash2 className="h-5 w-5" /> Confirm Delete
                        </DialogTitle>
                    </DialogHeader>
                    <p className="text-sm text-gray-600 py-2">Are you sure you want to delete this AMC? This action cannot be undone.</p>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowDeleteConfirm(null)}>Cancel</Button>
                        <Button variant="destructive" onClick={() => handleDelete(showDeleteConfirm!)}>Delete</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
