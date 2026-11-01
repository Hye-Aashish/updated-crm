import { useState, useEffect } from 'react'
import {
    Plus, Users, UserCheck, UserX, Building2, Trash2, Edit, Eye,
    Sparkles, Search, Copy, Check, ExternalLink, Globe, Clock, CheckCircle2, MessageCircle
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription
} from '@/components/ui/dialog'
import { ClientOnboardingDialog } from '@/components/clients/client-onboarding-dialog'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '@/store'
import { EmptyState } from '@/components/empty-state'
import { ClientService } from '@/lib/services/client.service'
import { StatsCard } from '@/components/stats-card'
import { PageSkeleton } from '@/components/ui/page-skeleton'
import { useToast } from '@/hooks/use-toast'
import { usePermissions } from '@/hooks/use-permissions'
import api from '@/lib/api-client'
import type { Client } from '@/types'
import { ClientHealthBadge } from '@/components/clients/client-health-badge'

import { appConfirm } from '@/lib/app-dialog'

export function ClientsPage() {
    const navigate = useNavigate()
    const { toast } = useToast()
    const { clients, setClients } = useAppStore()
    const { canEdit, canDelete } = usePermissions()
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false)
    const [selectedClientForOnboarding, setSelectedClientForOnboarding] = useState<Client | null>(null)
    const [clientSearchQuery, setClientSearchQuery] = useState('')
    const [copiedGeneralLink, setCopiedGeneralLink] = useState(false)

    // Fetch Clients
    useEffect(() => {
        const fetchClients = async () => {
            try {
                setLoading(true)
                setError(null)
                const backendClients = await ClientService.getAll()
                setClients(backendClients)
            } catch (error: any) {
                console.error("Failed to fetch clients:", error)
                setError(error.message || "Failed to fetch clients from server.")
            } finally {
                setLoading(false)
            }
        }
        fetchClients()
    }, [setClients])

    const handleDeleteClient = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation()
        if (!await appConfirm("Are you sure you want to delete this client? This action cannot be undone.")) return
        try {
            await api.delete(`/clients/${id}`)
            setClients(clients.filter(c => c.id !== id))
            toast({ title: "Client deleted", description: "Client has been removed successfully." })
        } catch (error: any) {
            toast({ variant: "destructive", title: "Failed to delete client", description: error.response?.data?.message || "Please try again." })
        }
    }

    // --- KPI Calculations ---
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
                        onClick={() => setIsGenerateModalOpen(true)}
                        className="clay-btn bg-card hover:bg-muted text-foreground font-extrabold text-xs h-10 px-4 rounded-xl border border-border/60 gap-1.5 shadow-xs"
                    >
                        <Sparkles className="h-4 w-4 text-primary" /> Generate Form
                    </Button>
                    <Button
                        onClick={() => navigate('/clients/new')}
                        className="clay-btn bg-primary hover:bg-primary/95 text-white font-extrabold text-xs h-10 px-4 rounded-xl shadow-md gap-1.5"
                    >
                        <Plus className="h-4 w-4" /> Add Client
                    </Button>
                </div>
            </div>

            {/* --- Module Specific KPIs --- */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <StatsCard title="Total Clients" value={totalClients} icon={Users} color="#3b82f6" bg="bg-blue-50" />
                <StatsCard title="Active" value={activeClients} icon={UserCheck} color="#22c55e" bg="bg-green-50" />
                <StatsCard title="Inactive" value={inactiveClients} icon={UserX} color="#ef4444" bg="bg-red-50" />
                <StatsCard title="Retainer" value={retainerClients} icon={Building2} color="#8b5cf6" bg="bg-purple-50" />
            </div>

            {clients.length === 0 && !error ? (
                <EmptyState
                    icon={Users}
                    title="No clients yet"
                    description="Get started by adding your first client"
                    action={
                        <Button onClick={() => navigate('/clients/new')}>
                            <Plus className="mr-2 h-4 w-4" /> Add Client
                        </Button>
                    }
                />
            ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {clients.map((client) => (
                        <Card
                            key={client.id}
                            className="cursor-pointer hover:shadow-md transition-shadow flex flex-col justify-between"
                            onClick={() => navigate(`/clients/${client.id}`)}
                        >
                            <CardHeader>
                                <div className="flex items-start justify-between">
                                    <div>
                                        <CardTitle className="text-lg">{client.name}</CardTitle>
                                        <p className="text-sm text-muted-foreground mt-1">
                                            {client.company}
                                        </p>
                                    </div>
                                    <div className="flex flex-col items-end gap-1">
                                        <Badge variant={client.status === 'active' ? 'default' : 'secondary'}>
                                            {client.status}
                                        </Badge>
                                        <ClientHealthBadge clientId={client.id} />
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2 text-sm">
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                        <span>📧</span>
                                        <span className="truncate">{client.email}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                        <span>📞</span>
                                        <span>{client.phone}</span>
                                    </div>
                                    <div className="mt-3 pt-3 border-t flex items-center justify-between">
                                        <Badge variant="outline" className="capitalize">
                                            {client.type}
                                        </Badge>
                                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                className="h-8 w-8 text-primary hover:bg-primary/10"
                                                title="Generate / Configure Onboarding Form"
                                                onClick={() => setSelectedClientForOnboarding(client)}
                                            >
                                                <Sparkles className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                                title="View Client"
                                                onClick={() => navigate(`/clients/${client.id}`)}
                                            >
                                                <Eye className="h-4 w-4" />
                                            </Button>
                                            {canEdit('clients') && (
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="h-8 w-8 text-muted-foreground hover:text-primary"
                                                    title="Edit Client"
                                                    onClick={() => navigate(`/clients/${client.id}/edit`)}
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

            {/* Generate Onboarding Form Dialog */}
            <Dialog open={isGenerateModalOpen} onOpenChange={setIsGenerateModalOpen}>
                <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto p-6 rounded-3xl">
                    <DialogHeader className="space-y-1.5">
                        <div className="flex items-center gap-2.5">
                            <div className="clay-icon h-10 w-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                                <Sparkles className="h-5 w-5" />
                            </div>
                            <div>
                                <DialogTitle className="text-xl font-extrabold text-foreground">
                                    Generate Client Onboarding Form
                                </DialogTitle>
                                <DialogDescription className="text-xs text-muted-foreground font-medium">
                                    Select a client to create a custom tailored intake form, or share the general intake link.
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>

                    <div className="space-y-5 pt-3">
                        {/* Option A: General Public Intake Link */}
                        <div className="clay-card p-4 rounded-2xl bg-primary/5 border border-primary/20 space-y-2.5">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-extrabold uppercase tracking-wider text-primary flex items-center gap-1.5">
                                    <Globe className="h-3.5 w-3.5" /> General New Client Intake Link
                                </span>
                                <Badge className="clay-badge text-[10px] font-bold bg-primary/10 text-primary border-0">
                                    For Any New Prospect
                                </Badge>
                            </div>
                            <p className="text-[11px] text-muted-foreground font-medium leading-relaxed">
                                Share this generic link with prospective clients who haven't been added to the CRM yet. When they fill it, a new client profile is automatically registered.
                            </p>
                            <div className="flex items-center gap-2">
                                <Input
                                    readOnly
                                    value={`${window.location.origin}/client-onboarding`}
                                    className="text-xs font-mono bg-card h-8 rounded-lg select-all flex-1"
                                />
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                        const url = `${window.location.origin}/client-onboarding`
                                        navigator.clipboard.writeText(url)
                                        setCopiedGeneralLink(true)
                                        toast({ title: 'Link Copied', description: url })
                                        setTimeout(() => setCopiedGeneralLink(false), 2000)
                                    }}
                                    className="clay-btn h-8 px-3 text-xs font-bold gap-1 shrink-0"
                                >
                                    {copiedGeneralLink ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                                    {copiedGeneralLink ? 'Copied' : 'Copy'}
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => window.open(`${window.location.origin}/client-onboarding`, '_blank')}
                                    className="clay-btn h-8 px-3 text-xs font-bold gap-1 shrink-0"
                                >
                                    <ExternalLink className="h-3.5 w-3.5" /> Preview
                                </Button>
                            </div>
                        </div>

                        {/* Option B: Tailored Form for Existing Client */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                    <Users className="h-3.5 w-3.5 text-primary" /> Tailor Form for an Existing Client
                                </span>
                                <span className="text-[11px] text-muted-foreground font-medium">
                                    {clients.length} Registered Clients
                                </span>
                            </div>

                            {/* Search Client */}
                            <div className="relative">
                                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                                <Input
                                    value={clientSearchQuery}
                                    onChange={(e) => setClientSearchQuery(e.target.value)}
                                    placeholder="Search client by name or company..."
                                    className="text-xs pl-8 h-9 rounded-xl"
                                />
                            </div>

                            {/* Client List */}
                            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                                {clients
                                    .filter(c =>
                                        c.name?.toLowerCase().includes(clientSearchQuery.toLowerCase()) ||
                                        c.company?.toLowerCase().includes(clientSearchQuery.toLowerCase())
                                    )
                                    .map(c => {
                                        const isCompleted = c.onboardingStatus === 'completed'
                                        const isSent = c.onboardingStatus === 'sent'

                                        return (
                                            <div
                                                key={c.id}
                                                className="clay-card p-3 rounded-2xl bg-card border border-border/40 hover:border-border/80 transition-all flex items-center justify-between gap-3"
                                            >
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-extrabold text-xs text-foreground truncate">{c.name}</span>
                                                        {c.company && (
                                                            <span className="text-[11px] text-muted-foreground truncate">({c.company})</span>
                                                        )}
                                                        {isCompleted ? (
                                                            <Badge className="clay-badge bg-emerald-500/15 text-emerald-600 border-0 text-[10px] px-1.5 py-0 h-4">
                                                                Done
                                                            </Badge>
                                                        ) : isSent ? (
                                                            <Badge className="clay-badge bg-blue-500/15 text-blue-600 border-0 text-[10px] px-1.5 py-0 h-4">
                                                                Link Sent
                                                            </Badge>
                                                        ) : (
                                                            <Badge className="clay-badge bg-muted text-muted-foreground border-0 text-[10px] px-1.5 py-0 h-4">
                                                                Not Sent
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                                                        {c.email || c.phone || 'No direct contact'}
                                                    </p>
                                                </div>

                                                <Button
                                                    size="sm"
                                                    onClick={() => {
                                                        setIsGenerateModalOpen(false)
                                                        setSelectedClientForOnboarding(c)
                                                    }}
                                                    className="clay-btn bg-primary hover:bg-primary/95 text-white font-extrabold text-xs h-8 px-3 rounded-xl gap-1 shrink-0 shadow-xs"
                                                >
                                                    <Sparkles className="h-3 w-3" />
                                                    {c.onboardingToken ? 'Manage Form' : 'Generate Form'}
                                                </Button>
                                            </div>
                                        )
                                    })
                                }
                                {clients.length === 0 && (
                                    <p className="text-center text-xs text-muted-foreground italic py-4">No clients registered yet.</p>
                                )}
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Individual Client Onboarding Customizer Dialog */}
            {selectedClientForOnboarding && (
                <ClientOnboardingDialog
                    client={selectedClientForOnboarding}
                    isOpen={!!selectedClientForOnboarding}
                    onClose={() => setSelectedClientForOnboarding(null)}
                    onUpdated={(updated) => {
                        setClients(clients.map(c => c.id === updated.id ? { ...c, ...updated } : c))
                        setSelectedClientForOnboarding(updated)
                    }}
                />
            )}
        </div>
    )
}


export default ClientsPage
