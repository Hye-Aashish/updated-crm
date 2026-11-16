import { useState, useEffect } from 'react'
import {
    Plus, Users, UserCheck, UserX, Building2, Trash2, Edit, Eye,
    FileText, Search, MessageCircle, Phone, Mail, X, RotateCcw, Filter
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ClientFormBuilder } from '@/components/clients/client-form-builder'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '@/store'
import { EmptyState } from '@/components/empty-state'
import { ClientService } from '@/lib/services/client.service'
import { StatsCard } from '@/components/stats-card'
import { PageSkeleton } from '@/components/ui/page-skeleton'
import { useToast } from '@/hooks/use-toast'
import { usePermissions } from '@/hooks/use-permissions'
import { usePortalPrefix } from '@/lib/nav-utils'
import api from '@/lib/api-client'
import type { ClientForm } from '@/types'
import { ClientHealthBadge } from '@/components/clients/client-health-badge'
import { appConfirm } from '@/lib/app-dialog'

export function ClientsPage() {
    const navigate = useNavigate()
    const portalPrefix = usePortalPrefix()
    const { toast } = useToast()
    const { clients, setClients } = useAppStore()
    const { canEdit, canDelete } = usePermissions()
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [isFormsOpen, setIsFormsOpen] = useState(false)
    const [clientForms, setClientForms] = useState<ClientForm[]>([])
    const [searchQuery, setSearchQuery] = useState('')
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'retainer'>('all')

    const filteredClients = clients.filter(client => {
        if (statusFilter === 'active' && client.status !== 'active') return false
        if (statusFilter === 'inactive' && client.status !== 'inactive') return false
        if (statusFilter === 'retainer' && client.type !== 'retainer') return false

        if (!searchQuery.trim()) return true
        const q = searchQuery.toLowerCase().trim()
        const digits = searchQuery.replace(/\D/g, '')

        const matchName = client.name?.toLowerCase().includes(q)
        const matchCompany = client.company?.toLowerCase().includes(q)
        const matchEmail = client.email?.toLowerCase().includes(q)
        const clientPhoneDigits = (client.phone || '').replace(/\D/g, '')
        const matchPhone = (client.phone || '').toLowerCase().includes(q) ||
            (digits.length >= 3 && clientPhoneDigits.includes(digits))

        return matchName || matchCompany || matchEmail || matchPhone
    })

    useEffect(() => {
        const fetchClients = async () => {
            try {
                setLoading(true)
                setError(null)
                const backendClients = await ClientService.getAll()
                setClients(backendClients)
            } catch (err: any) {
                console.error('Failed to fetch clients:', err)
                setError(err.message || 'Failed to fetch clients from server.')
            } finally {
                setLoading(false)
            }
        }
        fetchClients()
    }, [setClients])

    const openForms = async () => {
        setIsFormsOpen(true)
        try {
            const res = await api.get('/client-forms')
            setClientForms(res.data || [])
        } catch (err: any) {
            toast({
                title: 'Error',
                description: err.response?.data?.message || 'Failed to load client forms',
                variant: 'destructive'
            })
        }
    }

    const handleDeleteClient = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation()
        if (!await appConfirm('Are you sure you want to delete this client? This action cannot be undone.')) return
        try {
            await api.delete(`/clients/${id}`)
            setClients(clients.filter(c => c.id !== id))
            toast({ title: 'Client deleted', description: 'Client has been removed successfully.' })
        } catch (err: any) {
            toast({
                variant: 'destructive',
                title: 'Failed to delete client',
                description: err.response?.data?.message || 'Please try again.'
            })
        }
    }

    const totalClients = clients.length
    const activeClients = clients.filter(c => c.status === 'active').length
    const inactiveClients = clients.filter(c => c.status === 'inactive').length
    const retainerClients = clients.filter(c => c.type === 'retainer').length

    if (loading && clients.length === 0) {
        return <PageSkeleton />
    }

    return (
        <div className="space-y-6">
            {error && (
                <div className="bg-destructive/15 text-destructive p-4 rounded-md border border-destructive/20 flex items-center gap-2">
                    <UserX className="h-4 w-4" />
                    <div>
                        <p className="font-medium">Connection Error</p>
                        <p className="text-sm">{error}</p>
                    </div>
                </div>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Clients</h1>
                    <p className="text-muted-foreground mt-1">Manage your client relationships and contacts.</p>
                </div>
                <div className="flex items-center gap-2.5 w-full sm:w-auto flex-wrap">
                    <Button
                        variant="outline"
                        onClick={openForms}
                        className="clay-btn bg-card hover:bg-muted text-foreground font-extrabold text-xs h-10 px-4 rounded-xl border border-primary/40 text-primary gap-1.5 shadow-xs"
                    >
                        <FileText className="h-4 w-4 text-primary" /> Client Forms
                    </Button>
                    <Button
                        onClick={() => navigate(`${portalPrefix}/clients/new`)}
                        className="clay-btn bg-primary hover:bg-primary/95 text-white font-extrabold text-xs h-10 px-4 rounded-xl shadow-md gap-1.5"
                    >
                        <Plus className="h-4 w-4" /> Add Client
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <StatsCard title="Total Clients" value={totalClients} icon={Users} color="#3b82f6" bg="bg-blue-50" />
                <StatsCard title="Active" value={activeClients} icon={UserCheck} color="#22c55e" bg="bg-green-50" />
                <StatsCard title="Inactive" value={inactiveClients} icon={UserX} color="#ef4444" bg="bg-red-50" />
                <StatsCard title="Retainer" value={retainerClients} icon={Building2} color="#8b5cf6" bg="bg-purple-50" />
            </div>

            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-card p-3 rounded-2xl border border-border/40 shadow-xs">
                <div className="relative flex-1">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search client by name or phone number..."
                        className="pl-10 pr-9 h-10 rounded-xl bg-background border-border/60 text-xs sm:text-sm focus-visible:ring-primary"
                    />
                    {searchQuery && (
                        <button
                            type="button"
                            onClick={() => setSearchQuery('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    )}
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                    <Filter className="h-3.5 w-3.5 text-muted-foreground ml-1" />
                    {(['all', 'active', 'inactive', 'retainer'] as const).map((f) => (
                        <Button
                            key={f}
                            size="sm"
                            variant={statusFilter === f ? 'secondary' : 'ghost'}
                            onClick={() => setStatusFilter(f)}
                            className="h-8 px-3 rounded-lg text-xs font-bold capitalize"
                        >
                            {f}
                        </Button>
                    ))}
                    {(searchQuery || statusFilter !== 'all') && (
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => { setSearchQuery(''); setStatusFilter('all') }}
                            className="h-8 px-2 text-xs font-bold gap-1"
                        >
                            <RotateCcw className="h-3 w-3" /> Reset
                        </Button>
                    )}
                </div>
            </div>

            {filteredClients.length === 0 ? (
                <EmptyState
                    icon={Users}
                    title="No clients found"
                    description={searchQuery ? 'Try a different search.' : 'Create a client form and share the link, or add a client manually.'}
                    action={
                        <Button onClick={openForms} className="font-bold gap-1.5">
                            <FileText className="h-4 w-4" /> Client Forms
                        </Button>
                    }
                />
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredClients.map((client) => (
                        <Card
                            key={client.id}
                            className="cursor-pointer hover:shadow-md transition-shadow flex flex-col justify-between"
                            onClick={() => navigate(`${portalPrefix}/clients/${client.id}`)}
                        >
                            <CardHeader>
                                <div className="flex items-start justify-between">
                                    <div>
                                        <CardTitle className="text-lg">{client.name}</CardTitle>
                                        <p className="text-sm text-muted-foreground mt-1">{client.company}</p>
                                    </div>
                                    <div className="flex flex-col items-end gap-1">
                                        <Badge variant={client.status === 'active' ? 'default' : 'secondary'}>
                                            {client.status}
                                        </Badge>
                                        <ClientHealthBadge clientId={client.id} />
                                        {client.onboardingStatus === 'completed' && (
                                            <Badge className="bg-emerald-500/15 text-emerald-600 border-0 text-[10px] font-bold px-1.5 py-0 h-4">
                                                Form Done
                                            </Badge>
                                        )}
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2 text-sm">
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                        <Mail className="h-3.5 w-3.5 shrink-0" />
                                        <span className="truncate">{client.email || 'No email provided'}</span>
                                    </div>
                                    <div className="flex items-center justify-between gap-2 text-muted-foreground">
                                        <div className="flex items-center gap-2 truncate">
                                            <Phone className="h-3.5 w-3.5 text-primary shrink-0" />
                                            <span className="font-semibold text-foreground truncate">{client.phone || 'No phone'}</span>
                                        </div>
                                        {client.phone && (
                                            <a
                                                href={`https://wa.me/${client.phone.replace(/\D/g, '')}`}
                                                target="_blank"
                                                rel="noreferrer"
                                                onClick={(e) => e.stopPropagation()}
                                                className="text-[10px] font-bold text-emerald-600 hover:text-emerald-700 bg-emerald-500/10 hover:bg-emerald-500/20 px-2 py-0.5 rounded-md inline-flex items-center gap-1 transition-colors shrink-0"
                                            >
                                                <MessageCircle className="h-3 w-3" /> WhatsApp
                                            </a>
                                        )}
                                    </div>
                                    <div className="mt-3 pt-3 border-t flex items-center justify-between">
                                        <Badge variant="outline" className="capitalize text-xs">{client.type}</Badge>
                                        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                                title="View Client"
                                                onClick={() => navigate(`${portalPrefix}/clients/${client.id}`)}
                                            >
                                                <Eye className="h-4 w-4" />
                                            </Button>
                                            {canEdit('clients') && (
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="h-8 w-8 text-muted-foreground hover:text-primary"
                                                    title="Edit Client"
                                                    onClick={() => navigate(`${portalPrefix}/clients/${client.id}/edit`)}
                                                >
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                            )}
                                            {canDelete('clients') && (
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                                    title="Delete Client"
                                                    onClick={(e) => handleDeleteClient(client.id, e)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            <ClientFormBuilder
                isOpen={isFormsOpen}
                onClose={() => setIsFormsOpen(false)}
                clientForms={clientForms}
                setClientForms={setClientForms}
            />
        </div>
    )
}

export default ClientsPage
