import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select'
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from '@/components/ui/dialog'
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table'
import {
    Plus, Server, ShieldCheck, AlertCircle, RefreshCw, Trash2, Edit,
    Eye, Copy, Check, ExternalLink, HardDrive, Terminal, DollarSign, Calendar
} from 'lucide-react'
import api from '@/lib/api-client'
import { useToast } from '@/hooks/use-toast'
import { formatCurrency, formatDate } from '@/lib/utils'
import { format, differenceInDays } from 'date-fns'

interface HostingRecord {
    _id: string
    name: string
    serverIp: string
    provider: string
    clientId?: { _id: string; name: string; email: string; company?: string }
    projectId?: { _id: string; name: string; status: string }
    plan: string
    location: string
    cost: number
    billingCycle: 'monthly' | 'quarterly' | 'half-yearly' | 'annually'
    purchaseDate: string
    renewalDate: string
    status: 'active' | 'expiring-soon' | 'suspended' | 'terminated'
    os: string
    sshUser: string
    sshPort: number
    notes?: string
}

const PROVIDERS = ['AWS', 'DigitalOcean', 'Hetzner', 'Hostinger', 'Contabo', 'Vultr', 'Linode', 'Google Cloud', 'Azure', 'Other']
const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
    active: { label: 'Active', color: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400' },
    'expiring-soon': { label: 'Expiring Soon', color: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400' },
    suspended: { label: 'Suspended', color: 'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400' },
    terminated: { label: 'Terminated', color: 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-400' }
}

const initialForm = {
    name: '',
    serverIp: '',
    provider: 'DigitalOcean',
    clientId: 'none',
    projectId: 'none',
    plan: '',
    location: '',
    cost: '',
    billingCycle: 'monthly',
    purchaseDate: new Date().toISOString().split('T')[0],
    renewalDate: '',
    status: 'active',
    os: 'Ubuntu 22.04 LTS',
    sshUser: 'root',
    sshPort: '22',
    notes: ''
}

export default function HostingPage() {
    const { toast } = useToast()
    const [hosting, setHosting] = useState<HostingRecord[]>([])
    const [clients, setClients] = useState<any[]>([])
    const [projects, setProjects] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [stats, setStats] = useState<any>({ totalServers: 0, activeServers: 0, expiringSoon: 0, suspended: 0, totalMonthlyCost: 0 })
    const [search, setSearch] = useState('')
    const [statusFilter, setStatusFilter] = useState('all')

    // Modals
    const [showAddModal, setShowAddModal] = useState(false)
    const [showEditModal, setShowEditModal] = useState(false)
    const [showDetailModal, setShowDetailModal] = useState(false)
    const [selectedServer, setSelectedServer] = useState<HostingRecord | null>(null)
    const [serverToDelete, setServerToDelete] = useState<HostingRecord | null>(null)
    const [copiedKey, setCopiedKey] = useState<string | null>(null)

    // Form
    const [formData, setFormData] = useState<any>(initialForm)
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        fetchData()
        fetchAuxData()
    }, [])

    const fetchData = async () => {
        setLoading(true)
        try {
            const [serversRes, statsRes] = await Promise.all([
                api.get('/hosting'),
                api.get('/hosting/stats/summary').catch(() => ({ data: null }))
            ])
            setHosting(serversRes.data || [])
            if (statsRes.data) setStats(statsRes.data)
        } catch (error) {
            console.error("Failed to fetch hosting", error)
            toast({ title: 'Error', description: 'Failed to load hosting data', variant: 'destructive' })
        } finally {
            setLoading(false)
        }
    }

    const fetchAuxData = async () => {
        try {
            const [clientRes, projRes] = await Promise.all([
                api.get('/clients').catch(() => ({ data: [] })),
                api.get('/projects').catch(() => ({ data: [] }))
            ])
            setClients(clientRes.data || [])
            setProjects(projRes.data || [])
        } catch (err) {
            console.error('Aux data error', err)
        }
    }

    const handleCopy = (text: string, key: string) => {
        navigator.clipboard.writeText(text)
        setCopiedKey(key)
        toast({ title: 'Copied!', description: `${text} copied to clipboard.` })
        setTimeout(() => setCopiedKey(null), 2000)
    }

    const handleOpenAdd = () => {
        setFormData(initialForm)
        setShowAddModal(true)
    }

    const handleOpenEdit = (server: HostingRecord, e?: React.MouseEvent) => {
        if (e) e.stopPropagation()
        setSelectedServer(server)
        setFormData({
            name: server.name,
            serverIp: server.serverIp || '',
            provider: server.provider || 'DigitalOcean',
            clientId: server.clientId?._id || 'none',
            projectId: server.projectId?._id || 'none',
            plan: server.plan || '',
            location: server.location || '',
            cost: server.cost?.toString() || '0',
            billingCycle: server.billingCycle || 'monthly',
            purchaseDate: server.purchaseDate ? new Date(server.purchaseDate).toISOString().split('T')[0] : '',
            renewalDate: server.renewalDate ? new Date(server.renewalDate).toISOString().split('T')[0] : '',
            status: server.status || 'active',
            os: server.os || 'Ubuntu 22.04 LTS',
            sshUser: server.sshUser || 'root',
            sshPort: server.sshPort?.toString() || '22',
            notes: server.notes || ''
        })
        setShowEditModal(true)
    }

    const handleOpenDetail = (server: HostingRecord) => {
        setSelectedServer(server)
        setShowDetailModal(true)
    }

    const handleCreateServer = async () => {
        if (!formData.name || !formData.renewalDate) {
            toast({ title: 'Validation Error', description: 'Server name and renewal date are required', variant: 'destructive' })
            return
        }
        setSaving(true)
        try {
            await api.post('/hosting', {
                ...formData,
                cost: parseFloat(formData.cost) || 0,
                sshPort: parseInt(formData.sshPort) || 22
            })
            toast({ title: 'Success', description: 'Hosting server added successfully' })
            setShowAddModal(false)
            fetchData()
        } catch (error: any) {
            toast({ title: 'Error', description: error.response?.data?.message || 'Failed to add server', variant: 'destructive' })
        } finally {
            setSaving(false)
        }
    }

    const handleUpdateServer = async () => {
        if (!selectedServer || !formData.name || !formData.renewalDate) {
            toast({ title: 'Validation Error', description: 'Server name and renewal date are required', variant: 'destructive' })
            return
        }
        setSaving(true)
        try {
            await api.put(`/hosting/${selectedServer._id}`, {
                ...formData,
                cost: parseFloat(formData.cost) || 0,
                sshPort: parseInt(formData.sshPort) || 22
            })
            toast({ title: 'Success', description: 'Server details updated successfully' })
            setShowEditModal(false)
            fetchData()
        } catch (error: any) {
            toast({ title: 'Error', description: error.response?.data?.message || 'Failed to update server', variant: 'destructive' })
        } finally {
            setSaving(false)
        }
    }

    const handleDeleteServer = async () => {
        if (!serverToDelete) return
        try {
            await api.delete(`/hosting/${serverToDelete._id}`)
            toast({ title: 'Deleted', description: 'Server removed successfully' })
            setServerToDelete(null)
            if (selectedServer?._id === serverToDelete._id) setShowDetailModal(false)
            fetchData()
        } catch (error: any) {
            toast({ title: 'Error', description: error.response?.data?.message || 'Failed to delete server', variant: 'destructive' })
        }
    }

    const filteredHosting = hosting.filter(server => {
        const q = search.toLowerCase()
        const matchesSearch = !q ||
            server.name.toLowerCase().includes(q) ||
            server.serverIp?.toLowerCase().includes(q) ||
            server.provider?.toLowerCase().includes(q) ||
            server.clientId?.name?.toLowerCase().includes(q) ||
            server.projectId?.name?.toLowerCase().includes(q)

        const matchesStatus = statusFilter === 'all' || server.status === statusFilter
        return matchesSearch && matchesStatus
    })

    const getDaysLeft = (dateStr: string) => {
        if (!dateStr) return 0
        return differenceInDays(new Date(dateStr), new Date())
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Hosting & Infrastructure</h1>
                    <p className="text-muted-foreground mt-1">Track cloud servers, IP addresses, credentials, and renewal dates</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
                        <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> Refresh
                    </Button>
                    <Button onClick={handleOpenAdd}>
                        <Plus className="mr-2 h-4 w-4" /> Add Server
                    </Button>
                </div>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="border-l-4 border-l-blue-500 shadow-sm">
                    <CardContent className="p-6 flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Total Servers</p>
                            <h3 className="text-2xl font-bold mt-1">{stats.totalServers || hosting.length}</h3>
                            <p className="text-xs text-muted-foreground mt-1">Managed assets</p>
                        </div>
                        <div className="p-3 bg-blue-50 dark:bg-blue-950/40 rounded-xl">
                            <Server className="h-6 w-6 text-blue-500" />
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-l-4 border-l-emerald-500 shadow-sm">
                    <CardContent className="p-6 flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Active Online</p>
                            <h3 className="text-2xl font-bold mt-1">{stats.activeServers || hosting.filter(h => h.status === 'active').length}</h3>
                            <p className="text-xs text-muted-foreground mt-1">Healthy status</p>
                        </div>
                        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl">
                            <ShieldCheck className="h-6 w-6 text-emerald-500" />
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-l-4 border-l-amber-500 shadow-sm">
                    <CardContent className="p-6 flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Expiring Soon</p>
                            <h3 className="text-2xl font-bold mt-1 text-amber-600">{stats.expiringSoon || hosting.filter(h => h.status === 'expiring-soon').length}</h3>
                            <p className="text-xs text-muted-foreground mt-1">Within 30 days</p>
                        </div>
                        <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl">
                            <AlertCircle className="h-6 w-6 text-amber-500" />
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-l-4 border-l-purple-500 shadow-sm">
                    <CardContent className="p-6 flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Monthly Burn</p>
                            <h3 className="text-2xl font-bold mt-1">{formatCurrency(stats.totalMonthlyCost || 0)}</h3>
                            <p className="text-xs text-muted-foreground mt-1">Normalized infra cost</p>
                        </div>
                        <div className="p-3 bg-purple-50 dark:bg-purple-950/40 rounded-xl">
                            <DollarSign className="h-6 w-6 text-purple-500" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Filter Bar */}
            <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-card p-4 rounded-xl border">
                <div className="relative flex-1 w-full sm:w-auto">
                    <Input
                        placeholder="Search servers, IPs, providers, clients..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full sm:max-w-md"
                    />
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-[160px]">
                            <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Statuses</SelectItem>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="expiring-soon">Expiring Soon</SelectItem>
                            <SelectItem value="suspended">Suspended</SelectItem>
                            <SelectItem value="terminated">Terminated</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Table / List */}
            <Card>
                <CardHeader>
                    <CardTitle>All Infrastructure Servers</CardTitle>
                    <CardDescription>Comprehensive inventory of client instances and internal servers</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    {loading ? (
                        <div className="p-12 text-center text-muted-foreground animate-pulse">Loading servers...</div>
                    ) : filteredHosting.length === 0 ? (
                        <div className="text-center py-20 text-muted-foreground">
                            <Server className="h-12 w-12 mx-auto opacity-20 mb-4" />
                            <h3 className="font-semibold text-lg">No Servers Found</h3>
                            <p className="text-sm mt-1 max-w-sm mx-auto">
                                {search || statusFilter !== 'all' ? 'Try adjusting your search criteria.' : 'Start by adding your first cloud server or VPS.'}
                            </p>
                            <Button onClick={handleOpenAdd} className="mt-4">
                                <Plus className="mr-2 h-4 w-4" /> Add Server
                            </Button>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Server Name & IP</TableHead>
                                        <TableHead>Provider & Plan</TableHead>
                                        <TableHead>Client / Project</TableHead>
                                        <TableHead>Cost</TableHead>
                                        <TableHead>Renewal Date</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredHosting.map((server) => {
                                        const daysLeft = getDaysLeft(server.renewalDate)
                                        const statusCfg = STATUS_CONFIG[server.status] || STATUS_CONFIG.active

                                        return (
                                            <TableRow
                                                key={server._id}
                                                className="cursor-pointer hover:bg-muted/40 transition-colors"
                                                onClick={() => handleOpenDetail(server)}
                                            >
                                                <TableCell>
                                                    <div className="font-semibold text-foreground flex items-center gap-2">
                                                        <Server className="h-4 w-4 text-primary" />
                                                        {server.name}
                                                    </div>
                                                    {server.serverIp && (
                                                        <div className="flex items-center gap-1.5 mt-1">
                                                            <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono text-muted-foreground">
                                                                {server.serverIp}
                                                            </code>
                                                            <button
                                                                className="text-muted-foreground hover:text-foreground"
                                                                onClick={(e) => {
                                                                    e.stopPropagation()
                                                                    handleCopy(server.serverIp, `ip-${server._id}`)
                                                                }}
                                                                title="Copy IP"
                                                            >
                                                                {copiedKey === `ip-${server._id}` ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                                                            </button>
                                                        </div>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="font-medium">{server.provider}</div>
                                                    <div className="text-xs text-muted-foreground">{server.plan || server.os || 'N/A'}</div>
                                                </TableCell>
                                                <TableCell>
                                                    {server.clientId ? (
                                                        <div className="font-medium text-sm">{server.clientId.name}</div>
                                                    ) : (
                                                        <span className="text-xs text-muted-foreground">Internal Infrastructure</span>
                                                    )}
                                                    {server.projectId && (
                                                        <div className="text-xs text-primary">{server.projectId.name}</div>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="font-semibold">{formatCurrency(server.cost)}</div>
                                                    <div className="text-xs text-muted-foreground capitalize">/{server.billingCycle}</div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="text-sm font-medium">
                                                        {server.renewalDate ? formatDate(new Date(server.renewalDate)) : 'N/A'}
                                                    </div>
                                                    <div className="text-xs mt-0.5">
                                                        {daysLeft < 0 ? (
                                                            <span className="text-rose-500 font-medium">Overdue by {Math.abs(daysLeft)}d</span>
                                                        ) : daysLeft <= 30 ? (
                                                            <span className="text-amber-500 font-medium">In {daysLeft} days</span>
                                                        ) : (
                                                            <span className="text-muted-foreground">{daysLeft} days left</span>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className={`capitalize font-medium ${statusCfg.color}`}>
                                                        {statusCfg.label}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                                            onClick={() => handleOpenDetail(server)}
                                                            title="View Server Details"
                                                        >
                                                            <Eye className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                                            onClick={(e) => handleOpenEdit(server, e)}
                                                            title="Edit Server"
                                                        >
                                                            <Edit className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                                                            onClick={(e) => {
                                                                e.stopPropagation()
                                                                setServerToDelete(server)
                                                            }}
                                                            title="Delete Server"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        )
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Add Server Modal */}
            <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
                <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Add Hosting Server</DialogTitle>
                        <DialogDescription>Register a new VPS, cloud server, or dedicated machine</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label>Server Name *</Label>
                                <Input
                                    placeholder="e.g. Production Web VPS"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label>Server IP Address</Label>
                                <Input
                                    placeholder="e.g. 192.241.150.88"
                                    value={formData.serverIp}
                                    onChange={(e) => setFormData({ ...formData, serverIp: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label>Provider *</Label>
                                <Select value={formData.provider} onValueChange={(val) => setFormData({ ...formData, provider: val })}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {PROVIDERS.map((p) => (
                                            <SelectItem key={p} value={p}>{p}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <Label>Plan / Specs</Label>
                                <Input
                                    placeholder="e.g. 4 vCPU / 8GB RAM / 160GB SSD"
                                    value={formData.plan}
                                    onChange={(e) => setFormData({ ...formData, plan: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label>Client (Optional)</Label>
                                <Select value={formData.clientId} onValueChange={(val) => setFormData({ ...formData, clientId: val })}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Assign Client" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">Internal (No Client)</SelectItem>
                                        {clients.map((c) => (
                                            <SelectItem key={c.id || c._id} value={c.id || c._id}>
                                                {c.name} {c.company ? `(${c.company})` : ''}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <Label>Project (Optional)</Label>
                                <Select value={formData.projectId} onValueChange={(val) => setFormData({ ...formData, projectId: val })}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Assign Project" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">No Project</SelectItem>
                                        {projects.map((p) => (
                                            <SelectItem key={p.id || p._id} value={p.id || p._id}>
                                                {p.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-1.5">
                                <Label>Cost *</Label>
                                <Input
                                    type="number"
                                    placeholder="0"
                                    value={formData.cost}
                                    onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label>Billing Cycle</Label>
                                <Select value={formData.billingCycle} onValueChange={(val) => setFormData({ ...formData, billingCycle: val })}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="monthly">Monthly</SelectItem>
                                        <SelectItem value="quarterly">Quarterly</SelectItem>
                                        <SelectItem value="half-yearly">Half-Yearly</SelectItem>
                                        <SelectItem value="annually">Annually</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <Label>Status</Label>
                                <Select value={formData.status} onValueChange={(val) => setFormData({ ...formData, status: val })}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="active">Active</SelectItem>
                                        <SelectItem value="expiring-soon">Expiring Soon</SelectItem>
                                        <SelectItem value="suspended">Suspended</SelectItem>
                                        <SelectItem value="terminated">Terminated</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label>Purchase Date</Label>
                                <Input
                                    type="date"
                                    value={formData.purchaseDate}
                                    onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label>Renewal Date *</Label>
                                <Input
                                    type="date"
                                    value={formData.renewalDate}
                                    onChange={(e) => setFormData({ ...formData, renewalDate: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-1.5">
                                <Label>Operating System</Label>
                                <Input
                                    placeholder="Ubuntu 22.04 LTS"
                                    value={formData.os}
                                    onChange={(e) => setFormData({ ...formData, os: e.target.value })}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label>SSH User</Label>
                                <Input
                                    placeholder="root"
                                    value={formData.sshUser}
                                    onChange={(e) => setFormData({ ...formData, sshUser: e.target.value })}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label>SSH Port</Label>
                                <Input
                                    type="number"
                                    placeholder="22"
                                    value={formData.sshPort}
                                    onChange={(e) => setFormData({ ...formData, sshPort: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label>Notes & Instructions</Label>
                            <Textarea
                                placeholder="Credentials notes, services running, panel URLs..."
                                value={formData.notes}
                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                rows={3}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowAddModal(false)}>Cancel</Button>
                        <Button onClick={handleCreateServer} disabled={saving}>
                            {saving ? 'Adding...' : 'Add Server'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Server Modal */}
            <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
                <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Edit Hosting Server</DialogTitle>
                        <DialogDescription>Update configuration, dates, and specifications</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label>Server Name *</Label>
                                <Input
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label>Server IP Address</Label>
                                <Input
                                    value={formData.serverIp}
                                    onChange={(e) => setFormData({ ...formData, serverIp: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label>Provider *</Label>
                                <Select value={formData.provider} onValueChange={(val) => setFormData({ ...formData, provider: val })}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {PROVIDERS.map((p) => (
                                            <SelectItem key={p} value={p}>{p}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <Label>Plan / Specs</Label>
                                <Input
                                    value={formData.plan}
                                    onChange={(e) => setFormData({ ...formData, plan: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label>Client (Optional)</Label>
                                <Select value={formData.clientId} onValueChange={(val) => setFormData({ ...formData, clientId: val })}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Assign Client" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">Internal (No Client)</SelectItem>
                                        {clients.map((c) => (
                                            <SelectItem key={c.id || c._id} value={c.id || c._id}>
                                                {c.name} {c.company ? `(${c.company})` : ''}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <Label>Project (Optional)</Label>
                                <Select value={formData.projectId} onValueChange={(val) => setFormData({ ...formData, projectId: val })}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Assign Project" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">No Project</SelectItem>
                                        {projects.map((p) => (
                                            <SelectItem key={p.id || p._id} value={p.id || p._id}>
                                                {p.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-1.5">
                                <Label>Cost *</Label>
                                <Input
                                    type="number"
                                    value={formData.cost}
                                    onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label>Billing Cycle</Label>
                                <Select value={formData.billingCycle} onValueChange={(val) => setFormData({ ...formData, billingCycle: val })}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="monthly">Monthly</SelectItem>
                                        <SelectItem value="quarterly">Quarterly</SelectItem>
                                        <SelectItem value="half-yearly">Half-Yearly</SelectItem>
                                        <SelectItem value="annually">Annually</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <Label>Status</Label>
                                <Select value={formData.status} onValueChange={(val) => setFormData({ ...formData, status: val })}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="active">Active</SelectItem>
                                        <SelectItem value="expiring-soon">Expiring Soon</SelectItem>
                                        <SelectItem value="suspended">Suspended</SelectItem>
                                        <SelectItem value="terminated">Terminated</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label>Purchase Date</Label>
                                <Input
                                    type="date"
                                    value={formData.purchaseDate}
                                    onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label>Renewal Date *</Label>
                                <Input
                                    type="date"
                                    value={formData.renewalDate}
                                    onChange={(e) => setFormData({ ...formData, renewalDate: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-1.5">
                                <Label>Operating System</Label>
                                <Input
                                    value={formData.os}
                                    onChange={(e) => setFormData({ ...formData, os: e.target.value })}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label>SSH User</Label>
                                <Input
                                    value={formData.sshUser}
                                    onChange={(e) => setFormData({ ...formData, sshUser: e.target.value })}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label>SSH Port</Label>
                                <Input
                                    type="number"
                                    value={formData.sshPort}
                                    onChange={(e) => setFormData({ ...formData, sshPort: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label>Notes & Instructions</Label>
                            <Textarea
                                value={formData.notes}
                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                rows={3}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowEditModal(false)}>Cancel</Button>
                        <Button onClick={handleUpdateServer} disabled={saving}>
                            {saving ? 'Saving...' : 'Save Changes'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* View Server Details Modal */}
            <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Server className="h-5 w-5 text-primary" />
                            {selectedServer?.name}
                        </DialogTitle>
                        <DialogDescription>{selectedServer?.provider} Cloud Server</DialogDescription>
                    </DialogHeader>
                    {selectedServer && (
                        <div className="space-y-4 py-2">
                            {/* SSH Command Box */}
                            {selectedServer.serverIp && (
                                <div className="p-3 bg-slate-900 text-slate-100 rounded-lg text-xs font-mono flex items-center justify-between">
                                    <div className="truncate mr-2">
                                        ssh {selectedServer.sshUser || 'root'}@{selectedServer.serverIp} -p {selectedServer.sshPort || 22}
                                    </div>
                                    <button
                                        onClick={() => handleCopy(`ssh ${selectedServer.sshUser || 'root'}@{selectedServer.serverIp} -p ${selectedServer.sshPort || 22}`, 'ssh')}
                                        className="text-slate-400 hover:text-white flex-shrink-0"
                                    >
                                        {copiedKey === 'ssh' ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                                    </button>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-3 text-sm">
                                <div>
                                    <p className="text-muted-foreground text-xs">Provider & Plan</p>
                                    <p className="font-semibold">{selectedServer.provider}</p>
                                    <p className="text-xs text-muted-foreground">{selectedServer.plan || 'Standard'}</p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground text-xs">Status</p>
                                    <Badge variant="outline" className={`mt-1 capitalize ${STATUS_CONFIG[selectedServer.status]?.color}`}>
                                        {selectedServer.status}
                                    </Badge>
                                </div>
                                <div>
                                    <p className="text-muted-foreground text-xs">Cost</p>
                                    <p className="font-semibold">{formatCurrency(selectedServer.cost)} <span className="text-xs text-muted-foreground">/{selectedServer.billingCycle}</span></p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground text-xs">Renewal Date</p>
                                    <p className="font-semibold">{formatDate(new Date(selectedServer.renewalDate))}</p>
                                    <p className="text-xs text-muted-foreground">{getDaysLeft(selectedServer.renewalDate)} days remaining</p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground text-xs">Assigned Client</p>
                                    <p className="font-medium text-xs">{selectedServer.clientId?.name || 'Internal Agency'}</p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground text-xs">Assigned Project</p>
                                    <p className="font-medium text-xs">{selectedServer.projectId?.name || 'None'}</p>
                                </div>
                            </div>

                            {selectedServer.notes && (
                                <div className="p-3 bg-muted/40 rounded-lg border text-xs">
                                    <p className="font-semibold mb-1">Notes:</p>
                                    <p className="whitespace-pre-wrap text-muted-foreground">{selectedServer.notes}</p>
                                </div>
                            )}
                        </div>
                    )}
                    <DialogFooter className="flex justify-between items-center sm:justify-between">
                        <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => {
                                setShowDetailModal(false)
                                setServerToDelete(selectedServer)
                            }}
                        >
                            <Trash2 className="h-4 w-4 mr-1.5" /> Delete Server
                        </Button>
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => setShowDetailModal(false)}>Close</Button>
                            <Button size="sm" onClick={() => { setShowDetailModal(false); handleOpenEdit(selectedServer!); }}>
                                <Edit className="h-4 w-4 mr-1.5" /> Edit
                            </Button>
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Modal */}
            <Dialog open={!!serverToDelete} onOpenChange={(open) => !open && setServerToDelete(null)}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Delete Server</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete <span className="font-semibold text-foreground">{serverToDelete?.name}</span>? This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setServerToDelete(null)}>Cancel</Button>
                        <Button variant="destructive" onClick={handleDeleteServer}>Delete</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
