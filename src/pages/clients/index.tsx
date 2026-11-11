import { useState, useEffect } from 'react'
import {
    Plus, Users, UserCheck, UserX, Building2, Trash2, Edit, Eye,
    Sparkles, Search, Copy, Check, ExternalLink, Globe, Clock, CheckCircle2, MessageCircle,
    Phone, Mail, X, RotateCcw, Filter
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
import { usePortalPrefix } from '@/lib/nav-utils'
import api from '@/lib/api-client'
import type { Client } from '@/types'
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
    const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false)
    const [selectedClientForOnboarding, setSelectedClientForOnboarding] = useState<Client | null>(null)
    const [clientSearchQuery, setClientSearchQuery] = useState('')
    const [copiedGeneralLink, setCopiedGeneralLink] = useState(false)
    const [selectedGeneralTemplate, setSelectedGeneralTemplate] = useState('web_dev')
    const [searchQuery, setSearchQuery] = useState('')
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'retainer'>('all')

    const GENERAL_TEMPLATES = [
        { id: 'web_dev', label: 'Web Design & Dev' },
        { id: 'mobile_app', label: 'Mobile App' },
        { id: 'ecommerce', label: 'E-Commerce' },
        { id: 'marketing_seo', label: 'Marketing & SEO' },
        { id: 'corporate_general', label: 'Corporate Intake' }
    ]

    const getGeneralOnboardingUrl = () => {
        return `${window.location.origin}/client-onboarding?template=${selectedGeneralTemplate}`
    }

    // Filter clients by Name, Phone Number, Company, Email, and Status
    const filteredClients = clients.filter(client => {
        // Status filter
        if (statusFilter === 'active' && client.status !== 'active') return false
        if (statusFilter === 'inactive' && client.status !== 'inactive') return false
        if (statusFilter === 'retainer' && client.type !== 'retainer') return false

        // Search query filter
        if (!searchQuery.trim()) return true
        const q = searchQuery.toLowerCase().trim()
        const digits = searchQuery.replace(/\D/g, '')

        const matchName = client.name?.toLowerCase().includes(q)
        const matchCompany = client.company?.toLowerCase().includes(q)
        const matchEmail = client.email?.toLowerCase().includes(q)

        // Phone search: direct string match or stripped digit matching
        const clientPhoneDigits = (client.phone || '').replace(/\D/g, '')
        const matchPhone = (client.phone || '').toLowerCase().includes(q) ||
            (digits.length >= 3 && clientPhoneDigits.includes(digits))

        return matchName || matchCompany || matchEmail || matchPhone
    })

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
                        className="clay-btn bg-card hover:bg-muted text-foreground font-extrabold text-xs h-10 px-4 rounded-xl border border-primary/40 text-primary gap-1.5 shadow-xs"
                    >
                        <Sparkles className="h-4 w-4 text-primary" /> Onboarding Form Builder
                    </Button>
                    <Button
                        onClick={() => navigate(`${portalPrefix}/clients/new`)}
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

            {/* --- Search & Filters Bar --- */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-card p-3 rounded-2xl border border-border/40 shadow-xs">
                {/* Search Input: Name or Phone */}
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
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 rounded-full hover:bg-muted"
                            title="Clear search"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    )}
                </div>

                {/* Status Filter Chips */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 shrink-0">
                    {[
                        { id: 'all', label: 'All', count: totalClients },
                        { id: 'active', label: 'Active', count: activeClients },
                        { id: 'inactive', label: 'Inactive', count: inactiveClients },
                        { id: 'retainer', label: 'Retainer', count: retainerClients }
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => setStatusFilter(tab.id as any)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border shrink-0 flex items-center gap-1.5 ${
                                statusFilter === tab.id
                                    ? 'bg-primary text-white border-primary shadow-xs'
                                    : 'bg-background text-muted-foreground border-border/40 hover:border-primary/40 hover:text-foreground'
                            }`}
                        >
                            <span>{tab.label}</span>
                            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                                statusFilter === tab.id
                                    ? 'bg-white/20 text-white'
                                    : 'bg-muted text-muted-foreground'
                            }`}>
                                {tab.count}
                            </span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Results Count Info when searching/filtering */}
            {(searchQuery || statusFilter !== 'all') && (
                <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
                    <span>
                        Showing <strong className="text-foreground">{filteredClients.length}</strong> of {totalClients} clients
                        {searchQuery && <span> for &ldquo;{searchQuery}&rdquo;</span>}
                    </span>
                    <button
                        type="button"
                        onClick={() => {
                            setSearchQuery('')
                            setStatusFilter('all')
                        }}
                        className="text-primary hover:underline font-bold flex items-center gap-1"
                    >
                        <RotateCcw className="h-3 w-3" /> Reset
                    </button>
                </div>
            )}

            {clients.length === 0 && !error ? (
                <EmptyState
                    icon={Users}
                    title="No clients yet"
                    description="Get started by adding your first client"
                    action={
                        <Button onClick={() => navigate(`${portalPrefix}/clients/new`)}>
                            <Plus className="mr-2 h-4 w-4" /> Add Client
                        </Button>
                    }
                />
            ) : filteredClients.length === 0 ? (
                <div className="clay-card p-12 text-center rounded-3xl border border-dashed border-border/60 space-y-3">
                    <div className="mx-auto h-12 w-12 rounded-2xl bg-muted/60 flex items-center justify-center text-muted-foreground">
                        <Search className="h-6 w-6" />
                    </div>
                    <div className="space-y-1">
                        <h3 className="font-extrabold text-base text-foreground">No matching clients found</h3>
                        <p className="text-xs text-muted-foreground">
                            {searchQuery ? `No client found matching "${searchQuery}". Try searching with a different name or phone number.` : 'No clients match the selected status filter.'}
                        </p>
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                            setSearchQuery('')
                            setStatusFilter('all')
                        }}
                        className="clay-btn text-xs font-bold rounded-xl mt-2"
                    >
                        <RotateCcw className="h-3.5 w-3.5 mr-1.5" /> Clear Filters
                    </Button>
                </div>
            ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
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
                                        <p className="text-sm text-muted-foreground mt-1">
                                            {client.company}
                                        </p>
                                    </div>
                                    <div className="flex flex-col items-end gap-1">
                                        <Badge variant={client.status === 'active' ? 'default' : 'secondary'}>
                                            {client.status}
                                        </Badge>
                                        <ClientHealthBadge clientId={client.id} />
                                        {client.onboardingStatus === 'completed' ? (
                                            <Badge className="bg-emerald-500/15 text-emerald-600 border-0 text-[10px] font-bold px-1.5 py-0 h-4">
                                                Form Done
                                            </Badge>
                                        ) : client.onboardingStatus === 'sent' ? (
                                            <Badge className="bg-blue-500/15 text-blue-600 border-0 text-[10px] font-bold px-1.5 py-0 h-4">
                                                Link Sent
                                            </Badge>
                                        ) : null}
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2 text-sm">
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                        <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
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
                                                title="Chat on WhatsApp"
                                            >
                                                <MessageCircle className="h-3 w-3" /> WhatsApp
                                            </a>
                                        )}
                                    </div>
                                    <div className="mt-3 pt-3 border-t flex items-center justify-between">
                                        <Badge variant="outline" className="capitalize text-xs">
                                            {client.type}
                                        </Badge>
                                        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="h-8 text-[11px] font-bold gap-1 px-2.5 rounded-xl border-primary/30 text-primary hover:bg-primary/10 shadow-xs"
                                                title="Build & Share Onboarding Intake Form"
                                                onClick={() => setSelectedClientForOnboarding(client)}
                                            >
                                                <Sparkles className="h-3 w-3" />
                                                Onboarding Form
                                            </Button>
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
                                    Client Onboarding Form Builder Hub
                                </DialogTitle>
                                <DialogDescription className="text-xs text-muted-foreground font-medium">
                                    Build custom intake questions, generate branded client onboarding links, or share the public intake link.
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>

                    <div className="space-y-5 pt-3">
                        {/* Option A: General Public Intake Link (Auto-Registration) */}
                        <div className="clay-card p-4 rounded-2xl bg-primary/5 border border-primary/20 space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-extrabold uppercase tracking-wider text-primary flex items-center gap-1.5">
                                    <Globe className="h-3.5 w-3.5" /> 1. Self-Registration Onboarding Link
                                </span>
                                <Badge className="clay-badge text-[10px] font-bold bg-primary/15 text-primary border-0">
                                    Auto-Adds Client To CRM
                                </Badge>
                            </div>
                            <p className="text-[11px] text-muted-foreground font-medium leading-relaxed">
                                Naye clients ko yeh link bhejein. Form submit hote hi client profile <strong>CRM me automatically create ho jayegi</strong> (Active status &amp; Onboarding Completed ke saath). Koi details agar reh jayein toh baad me manually edit kar sakte hain.
                            </p>

                            {/* Template Selector */}
                            <div className="space-y-1.5">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Select Project Template Scope:</span>
                                <div className="flex flex-wrap gap-1.5">
                                    {GENERAL_TEMPLATES.map((tpl) => (
                                        <button
                                            key={tpl.id}
                                            type="button"
                                            onClick={() => setSelectedGeneralTemplate(tpl.id)}
                                            className={`text-[11px] font-bold px-2.5 py-1 rounded-xl transition-all border ${
                                                selectedGeneralTemplate === tpl.id
                                                    ? 'bg-primary text-white border-primary shadow-xs'
                                                    : 'bg-card text-muted-foreground border-border/50 hover:border-primary/40 hover:text-foreground'
                                            }`}
                                        >
                                            {tpl.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Link bar and action buttons */}
                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
                                <Input
                                    readOnly
                                    value={getGeneralOnboardingUrl()}
                                    className="text-xs font-mono bg-card h-8 rounded-lg select-all flex-1"
                                />
                                <div className="flex items-center gap-1.5 shrink-0">
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => {
                                            const url = getGeneralOnboardingUrl()
                                            navigator.clipboard.writeText(url)
                                            setCopiedGeneralLink(true)
                                            toast({ title: 'Link Copied', description: url })
                                            setTimeout(() => setCopiedGeneralLink(false), 2000)
                                        }}
                                        className="clay-btn h-8 px-3 text-xs font-bold gap-1 shrink-0"
                                    >
                                        {copiedGeneralLink ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                                        {copiedGeneralLink ? 'Copied' : 'Copy Link'}
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => {
                                            const url = getGeneralOnboardingUrl()
                                            const text = `Hello! Please complete your onboarding intake form here so we can register your account and kickstart your project: ${url}`
                                            window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank')
                                        }}
                                        className="clay-btn h-8 px-2.5 text-xs font-bold gap-1 text-emerald-600 hover:text-emerald-700 bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/30 shrink-0"
                                        title="Share on WhatsApp"
                                    >
                                        <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => window.open(getGeneralOnboardingUrl(), '_blank')}
                                        className="clay-btn h-8 px-2.5 text-xs font-bold gap-1 shrink-0"
                                        title="Preview Form"
                                    >
                                        <ExternalLink className="h-3.5 w-3.5" />
                                    </Button>
                                </div>
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
                                    placeholder="Search client by name, phone number, or company..."
                                    className="text-xs pl-8 h-9 rounded-xl"
                                />
                            </div>

                            {/* Client List */}
                            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                                {clients
                                    .filter(c => {
                                        if (!clientSearchQuery.trim()) return true
                                        const q = clientSearchQuery.toLowerCase().trim()
                                        const digits = clientSearchQuery.replace(/\D/g, '')
                                        const phoneDigits = (c.phone || '').replace(/\D/g, '')

                                        return (
                                            c.name?.toLowerCase().includes(q) ||
                                            c.company?.toLowerCase().includes(q) ||
                                            (c.phone || '').toLowerCase().includes(q) ||
                                            (digits.length >= 3 && phoneDigits.includes(digits))
                                        )
                                    })
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
                                                    {c.onboardingToken ? 'Manage / Send Form' : 'Build & Send Form'}
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
