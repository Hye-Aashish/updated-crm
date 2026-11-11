import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAppStore } from '@/store'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
    ChevronLeft, Mail, Phone, MapPin, FileText,
    DollarSign, Clock, Edit, Trash2, ExternalLink, Shield, Key, UserCheck, UserX, Lock,
    ListTodo, CreditCard, TrendingUp, Check, AlertTriangle, Sparkles, Calendar
} from 'lucide-react'
import { formatCurrency, getInitials, generatePortalPassword } from '@/lib/utils'
import api from '@/lib/api-client'
import { VisitorSessionsTimeline } from '@/components/contacts/visitor-sessions-timeline'
import { ClientProductForm } from '@/components/clients/client-product-dialog'
import { ClientProductManagerDialog } from '@/components/clients/client-product-manager-dialog'
import { ClientOnboardingDialog } from '@/components/clients/client-onboarding-dialog'
import { mapClient } from '@/lib/mappers'
import { usePermissions } from '@/hooks/use-permissions'
import { isAdminOrOwnerRole, usePortalPrefix } from '@/lib/nav-utils'
import { Progress } from '@/components/ui/progress'
import { Package, Plus, FolderOpen, Copy, Share2, MessageCircle, Download, CheckCircle2, FileCheck, RefreshCw, Globe, Send, User, Building2, Eye, EyeOff, Loader2 } from 'lucide-react'
import type { ClientProduct } from '@/types'
import { useToast } from '@/hooks/use-toast'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'

import { appConfirm } from '@/lib/app-dialog'

export function ClientDetailPage() {
    const { id } = useParams()
    const navigate = useNavigate()
    const portalPrefix = usePortalPrefix()
    const { toast } = useToast()
    const { clients, projects, invoices, setClients, deleteClient, users, setUsers, currentUser } = useAppStore()
    const { canView, canCreate } = usePermissions()
    const canViewFinances = currentUser?.role === 'owner' || currentUser?.role === 'admin' || canView('invoices')

    const client = clients.find((c) => c.id === id)

    // Portal Access State
    const [isManagePortalOpen, setIsManagePortalOpen] = useState(false)
    const [portalPassword, setPortalPassword] = useState('')
    const [portalEmail, setPortalEmail] = useState('')
    const [showPortalPassword, setShowPortalPassword] = useState(false)
    const [savingPortal, setSavingPortal] = useState(false)
    const [copiedPortalCreds, setCopiedPortalCreds] = useState(false)
    const [portalUser, setPortalUser] = useState<any>(null)
    const [portalAccessChecked, setPortalAccessChecked] = useState(false)

    // Client Products State
    const [clientProducts, setClientProducts] = useState<ClientProduct[]>([])
    const [isProductDialogOpen, setIsProductDialogOpen] = useState(false)
    const [editingClientProduct, setEditingClientProduct] = useState<ClientProduct | undefined>(undefined)
    const [selectedManagerCP, setSelectedManagerCP] = useState<ClientProduct | null>(null)
    const [isManagerOpen, setIsManagerOpen] = useState(false)

    // Client Onboarding State
    const [isOnboardingDialogOpen, setIsOnboardingDialogOpen] = useState(false)
    const [copiedOnboardingLink, setCopiedOnboardingLink] = useState(false)

    // Always fetch latest client data and portal access status on load
    useEffect(() => {
        if (id) {
            api.get(`/clients/${id}`).then(res => {
                const fetched = mapClient(res.data)
                setClients(clients.map(c => c.id === id ? { ...c, ...fetched } : c))
            }).catch(err => console.error("Client fetch error", err))

            api.get(`/clients/${id}/portal-access`).then(res => {
                setPortalUser(res.data?.hasAccess ? res.data.user : null)
                setPortalAccessChecked(true)
            }).catch(() => {
                setPortalAccessChecked(false)
            })
        }
    }, [id])

    // Fetch users if store is empty
    useEffect(() => {
        const fetchUsers = async () => {
            if (users.length === 0) {
                try {
                    const res = await api.get('/users')
                    setUsers(res.data.map((u: any) => ({ id: u._id, ...u })))
                } catch (error) {
                    console.error("Failed to fetch users", error)
                }
            }
        }
        fetchUsers()
    }, [users.length, setUsers])

    useEffect(() => {
        if (client) {
            setPortalEmail(client.email || '')
        }
    }, [client])

    const storeClientUser = users.find(u => u.clientId === client?.id || (u.role === 'client' && u.email?.toLowerCase() === client?.email?.toLowerCase()))
    const clientUser = portalAccessChecked ? portalUser : (portalUser || storeClientUser)

    const generateRandomPassword = () => generatePortalPassword(client?.name)

    const handleSavePortalCredentials = async () => {
        if (!client) return
        const trimmedEmail = portalEmail.trim()
        const trimmedPassword = portalPassword.trim()
        if (!trimmedEmail) {
            toast({ variant: "destructive", title: "Validation Error", description: "Login email is required" })
            return
        }
        if (trimmedPassword && trimmedPassword.length < 6) {
            toast({ variant: "destructive", title: "Validation Error", description: "Portal password must be at least 6 characters" })
            return
        }
        setSavingPortal(true)
        try {
            const res = await api.post(`/clients/${client.id}/portal-access`, {
                email: trimmedEmail,
                password: trimmedPassword || undefined,
                name: client.name
            })
            const savedCreds = res.data?.credentials
            if (savedCreds) {
                setPortalUser({ id: savedCreds.id, _id: savedCreds.id, ...savedCreds })
                setPortalAccessChecked(true)
            }
            // Refresh users list if accessible so UI store stays synced
            api.get('/users').then(usersRes => {
                setUsers(usersRes.data.map((u: any) => ({ id: u._id, ...u })))
            }).catch(() => { })

            toast({
                title: clientUser && trimmedPassword ? "Client Password Reset" : "Client Portal Access Saved",
                description: clientUser && trimmedPassword
                    ? `Password updated for ${trimmedEmail}.`
                    : `Login account configured for ${trimmedEmail}.`
            })
            setPortalPassword('')
            setShowPortalPassword(false)
            setIsManagePortalOpen(false)
        } catch (error: any) {
            const msg = error.response?.data?.message || "Failed to save client portal credentials"
            toast({ variant: "destructive", title: "Error", description: msg })
        } finally {
            setSavingPortal(false)
        }
    }

    const handleDisablePortal = async () => {
        if (!client) return
        if (!await appConfirm("Are you sure you want to disable login portal access for this client? This will delete their login user account.")) {
            return
        }
        try {
            await api.delete(`/clients/${client.id}/portal-access`)
            setPortalUser(null)
            setPortalAccessChecked(true)
            api.get('/users').then(usersRes => {
                setUsers(usersRes.data.map((u: any) => ({ id: u._id, ...u })))
            }).catch(() => { })
            setPortalPassword('')
            setIsManagePortalOpen(false)
            toast({ title: "Portal Access Disabled", description: "The login account has been removed." })
        } catch (error: any) {
            const msg = error.response?.data?.message || "Failed to disable portal user"
            toast({ variant: "destructive", title: "Error", description: msg })
        }
    }

    const handleWhatsAppCredentials = () => {
        if (!client) return
        const phone = (client.phone || '').replace(/[^0-9]/g, '')
        const text = `Hello ${client.name},\n\nHere are your Client Portal login details:\n🌐 Portal URL: ${window.location.origin}/login\n📧 Login Email: ${portalEmail || client.email}\n🔑 Password: ${portalPassword || '(Existing password)'}\n\nYou can log in anytime to track your project deliverables, view invoices, and communicate directly with our team.\n\nThank you!`
        window.open(`https://api.whatsapp.com/send?${phone ? `phone=${phone}&` : ''}text=${encodeURIComponent(text)}`, '_blank')
    }

    const handleDelete = async () => {
        if (!client) return
        if (await appConfirm("Are you sure you want to delete this client? This action cannot be undone.")) {
            try {
                await api.delete(`/clients/${client.id}`)
                deleteClient(client.id)
                navigate(`${portalPrefix}/clients`)
            } catch (error) {
                console.error("Delete failed", error)
                navigate(`${portalPrefix}/clients`) // Redirect anyway if 404
            }
        }
    }

    // Fetch clients if store is empty (Handle Refresh)
    useEffect(() => {
        if (!client && clients.length === 0) {
            const fetchClients = async () => {
                try {
                    const response = await api.get('/clients')
                    const backendClients = response.data.map(mapClient)
                    setClients(backendClients)
                } catch (error) {
                    console.error("Failed to fetch clients", error)
                }
            }
            fetchClients()
        }
    }, [client, clients.length, setClients])

    // Fetch Client Products
    useEffect(() => {
        if (client) {
            fetchClientProducts()
        }
    }, [client])

    const fetchClientProducts = async () => {
        if (!client) return
        try {
            const res = await api.get(`/client-products/client/${client.id}`)
            setClientProducts(res.data.map((cp: any) => ({ ...cp, id: cp._id })))
        } catch (error) {
            console.error("Failed to fetch client products", error)
        }
    }

    const handleDeleteProduct = async (cpId: string) => {
        if (!await appConfirm("Are you sure you want to remove this product from the client?")) return
        try {
            await api.delete(`/client-products/${cpId}`)
            setClientProducts(clientProducts.filter(cp => cp.id !== cpId))
            toast({ title: 'Success', description: 'Assigned product removed' })
        } catch (error) {
            console.error("Failed to delete client product", error)
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to remove product' })
        }
    }

    const handleQuickToggleTask = async (cpId: string, task: any) => {
        const taskId = task.id || task._id
        if (!taskId) return
        const newStatus = task.status === 'completed' ? 'pending' : 'completed'
        try {
            const res = await api.patch(`/client-products/${cpId}/tasks/${taskId}`, { status: newStatus })
            const updated = { ...res.data, id: res.data._id }
            setClientProducts(clientProducts.map(cp => (cp.id === cpId || (cp as any)._id === cpId) ? updated : cp))
            if (selectedManagerCP && (selectedManagerCP.id === cpId || selectedManagerCP._id === cpId)) {
                setSelectedManagerCP(updated)
            }
            toast({ title: newStatus === 'completed' ? 'Task Completed' : 'Task Pending' })
        } catch (err: any) {
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to update task' })
        }
    }

    const handleManagerUpdate = (updated: ClientProduct) => {
        const cpId = updated.id || updated._id
        const mapped = { ...updated, id: updated._id || updated.id }
        setClientProducts(clientProducts.map(cp => (cp.id === cpId || (cp as any)._id === cpId) ? mapped : cp))
        setSelectedManagerCP(mapped)
    }

    const openManager = (cp: ClientProduct) => {
        setSelectedManagerCP(cp)
        setIsManagerOpen(true)
    }

    if (!client && clients.length > 0) {
        return (
            <div className="flex flex-col items-center justify-center h-[50vh]">
                <h2 className="text-2xl font-bold mb-2">Client Not Found</h2>
                <p className="text-muted-foreground mb-4">The client you are looking for does not exist.</p>
                <Button onClick={() => navigate(`${portalPrefix}/clients`)}>Back to Clients</Button>
            </div>
        )
    }

    if (!client) {
        return <div className="p-8 text-center">Loading client details...</div>
    }

    // Derived Data
    const clientProjects = projects.filter(p => p.clientId === client.id)
    const clientInvoices = invoices.filter(i => i.clientId === client.id)
    const totalRevenue = clientInvoices.reduce((sum, inv) => sum + (inv.status === 'paid' ? inv.total : 0), 0)
    const pendingRevenue = clientInvoices.reduce((sum, inv) => sum + (inv.status !== 'paid' ? inv.total : 0), 0)

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active': return 'bg-green-500 hover:bg-green-600'
            case 'inactive': return 'bg-gray-500 hover:bg-gray-600'
            case 'new': return 'bg-blue-500 hover:bg-blue-600'
            default: return 'bg-blue-500 hover:bg-blue-600'
        }
    }

    const onboardingPublicUrl = client?.onboardingToken
        ? `${window.location.origin}/client-onboarding/${client.onboardingToken}`
        : ''

    const handleCopyOnboardingLink = () => {
        if (!onboardingPublicUrl) return
        navigator.clipboard.writeText(onboardingPublicUrl)
        setCopiedOnboardingLink(true)
        toast({ title: 'Link Copied', description: onboardingPublicUrl })
        setTimeout(() => setCopiedOnboardingLink(false), 2500)
    }

    const handleWhatsAppInvite = () => {
        if (!onboardingPublicUrl || !client) return
        const text = `Hello ${client.name},\n\nPlease fill out your onboarding form so we can configure your account and begin your project:\n${onboardingPublicUrl}\n\nThank you!`
        const waUrl = `https://wa.me/${(client.phone || '').replace(/[^0-9]/g, '')}?text=${encodeURIComponent(text)}`
        window.open(waUrl, '_blank')
    }

    const handleResetOnboarding = async () => {
        if (!client) return
        if (!await appConfirm("Reopen onboarding form for this client? They will be able to resubmit their details.")) return
        try {
            const res = await api.post(`/clients/${client.id}/onboarding/reset`, { status: 'sent' })
            const updated = res.data.client || { ...client, onboardingStatus: 'sent' }
            setClients(clients.map(c => c.id === client.id ? { ...c, ...updated } : c))
            toast({ title: 'Onboarding Reopened', description: 'Client can now resubmit their form.' })
        } catch (err) {
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to reset onboarding.' })
        }
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col gap-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <button onClick={() => navigate(`${portalPrefix}/clients`)} className="hover:text-primary transition-colors">Clients</button>
                    <ChevronLeft className="h-4 w-4 rotate-180" />
                    <span className="text-foreground font-medium truncate">{client.name}</span>
                </div>

                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                        <Avatar className="h-16 w-16 border-2 border-muted">
                            <AvatarFallback className="text-xl">{getInitials(client.name)}</AvatarFallback>
                        </Avatar>
                        <div>
                            <h1 className="text-3xl font-bold">{client.name}</h1>
                            <div className="flex items-center gap-3 mt-1">
                                {client.company && <span className="text-muted-foreground font-medium">{client.company}</span>}
                                <Badge className={getStatusColor(client.status)}>
                                    {client.status}
                                </Badge>
                                <Badge variant="outline" className="capitalize">{client.type}</Badge>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-2 flex-wrap items-center">
                        {clientUser ? (
                            <Button
                                variant="outline"
                                size="sm"
                                className="clay-btn gap-1.5 font-bold border-emerald-500/40 text-emerald-600 bg-emerald-500/10 hover:bg-emerald-500/20 shadow-xs h-9 rounded-xl"
                                onClick={() => {
                                    setPortalEmail(clientUser.email || client.email || '')
                                    setPortalPassword('')
                                    setIsManagePortalOpen(true)
                                }}
                                title="Manage or Reset Client Portal Login & Password"
                            >
                                <Key className="h-3.5 w-3.5 text-emerald-600" /> Login Active / Reset Password
                            </Button>
                        ) : (
                            <Button
                                size="sm"
                                className="clay-btn gap-1.5 font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs h-9 rounded-xl"
                                onClick={() => {
                                    setPortalEmail(client.email || '')
                                    setPortalPassword(generateRandomPassword())
                                    setIsManagePortalOpen(true)
                                }}
                                title="Setup Client ID and Password for Client Portal"
                            >
                                <Lock className="h-3.5 w-3.5" /> Setup Client Login
                            </Button>
                        )}
                        <Button
                            variant="outline"
                            size="sm"
                            className="clay-btn gap-1.5 font-bold border-primary/40 text-primary hover:bg-primary/10 shadow-xs h-9 rounded-xl"
                            onClick={() => setIsOnboardingDialogOpen(true)}
                        >
                            <Sparkles className="h-4 w-4 text-primary" /> Onboarding Form Builder
                        </Button>
                        <Button variant="outline" size="sm" className="clay-btn font-bold h-9 rounded-xl" onClick={() => navigate(`${portalPrefix}/clients/${client.id}/edit`)}>
                            <Edit className="mr-1.5 h-3.5 w-3.5" /> Edit Profile
                        </Button>
                        <Button variant="destructive" size="icon" className="w-9 h-9 rounded-xl" onClick={handleDelete}>
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="p-6">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
                                <h3 className="text-2xl font-bold mt-2">{formatCurrency(totalRevenue)}</h3>
                            </div>
                            <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                                <DollarSign className="h-5 w-5 text-green-600 dark:text-green-400" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-6">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Active Projects</p>
                                <h3 className="text-2xl font-bold mt-2">{clientProjects.filter(p => p.status === 'in-progress').length}</h3>
                            </div>
                            <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                                <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-6">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Pending Invoices</p>
                                <h3 className="text-2xl font-bold mt-2">{formatCurrency(pendingRevenue)}</h3>
                            </div>
                            <div className="p-2 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
                                <FileText className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Main Content Tabs */}
            <Tabs defaultValue="overview" className="space-y-4">
                <TabsList className="flex flex-wrap h-auto gap-1">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="onboarding" className="gap-1.5">
                        <Sparkles className="h-3.5 w-3.5 text-primary" />
                        Onboarding
                        {client.onboardingStatus === 'completed' && (
                            <Badge className="clay-badge ml-1 bg-emerald-500/15 text-emerald-600 border-0 text-[10px] px-1.5 py-0 h-4">
                                Done
                            </Badge>
                        )}
                        {client.onboardingStatus === 'sent' && (
                            <Badge className="clay-badge ml-1 bg-blue-500/15 text-blue-600 border-0 text-[10px] px-1.5 py-0 h-4">
                                Sent
                            </Badge>
                        )}
                    </TabsTrigger>
                    <TabsTrigger value="projects">Projects ({clientProjects.length})</TabsTrigger>
                    <TabsTrigger value="invoices">Invoices ({clientInvoices.length})</TabsTrigger>
                    <TabsTrigger value="products">Products</TabsTrigger>
                    <TabsTrigger value="activity">Web Activity</TabsTrigger>
                    <TabsTrigger value="notes">Notes</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Contact Info */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Contact Information</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-center gap-3">
                                    <Mail className="h-4 w-4 text-muted-foreground" />
                                    <a href={`mailto:${client.email}`} className="text-sm hover:underline">{client.email}</a>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Phone className="h-4 w-4 text-muted-foreground" />
                                    <a href={`tel:${client.phone}`} className="text-sm hover:underline">{client.phone}</a>
                                </div>
                                <div className="flex items-start gap-3">
                                    <MapPin className="h-4 w-4 text-muted-foreground mt-1" />
                                    <p className="text-sm text-muted-foreground">{client.address || "No address provided"}</p>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Business Details */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Business Details</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-center justify-between border-b pb-2">
                                    <span className="text-sm text-muted-foreground">Industry</span>
                                    <span className="text-sm font-medium">{client.industry || "N/A"}</span>
                                </div>
                                <div className="flex items-center justify-between border-b pb-2">
                                    <span className="text-sm text-muted-foreground">GST Number</span>
                                    <span className="text-sm font-medium">{client.gstNumber || "N/A"}</span>
                                </div>
                                <div className="flex items-center justify-between border-b pb-2">
                                    <span className="text-sm text-muted-foreground">Lead Source</span>
                                    <span className="text-sm font-medium">{client.leadSource || "N/A"}</span>
                                </div>
                                <div className="flex items-center justify-between pt-2">
                                    <span className="text-sm text-muted-foreground">Website</span>
                                    {client.website ? (
                                        <a href={client.website} target="_blank" rel="noreferrer" className="text-sm text-primary hover:underline flex items-center gap-1">
                                            {client.website} <ExternalLink className="h-3 w-3" />
                                        </a>
                                    ) : (
                                        <span className="text-sm text-muted-foreground">N/A</span>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Portal Access Card */}
                    <Card className="mt-6 border-l-4 border-l-blue-500 shadow-sm">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <Shield className="h-5 w-5 text-blue-500" />
                                Client Portal Login Access
                            </CardTitle>
                            <CardDescription>
                                Enable or manage login access for the client's dashboard.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {clientUser ? (
                                <div className="space-y-4">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/30">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/40 rounded-lg text-emerald-600 dark:text-emerald-400">
                                                <UserCheck className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <div className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">Portal Access Active</div>
                                                <div className="text-xs text-muted-foreground mt-0.5">
                                                    Logged in with: <span className="font-semibold text-emerald-700 dark:text-emerald-400">{clientUser.email}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="gap-1.5 font-bold"
                                                onClick={() => {
                                                    setPortalEmail(clientUser.email || client.email || '')
                                                    setPortalPassword('')
                                                    setIsManagePortalOpen(true)
                                                }}
                                            >
                                                <Key className="h-3.5 w-3.5" /> Manage Credentials / Reset
                                            </Button>
                                            <Button variant="destructive" size="sm" className="gap-1.5" onClick={handleDisablePortal}>
                                                <UserX className="h-3.5 w-3.5" /> Disable Access
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-amber-100 dark:bg-amber-900/40 rounded-lg text-amber-600 dark:text-amber-400">
                                                <UserX className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <div className="text-sm font-semibold text-amber-800 dark:text-amber-300">No Login Account Enabled</div>
                                                <div className="text-xs text-muted-foreground mt-0.5">
                                                    This client does not currently have login access to the CRM dashboard.
                                                </div>
                                            </div>
                                        </div>
                                        <Button
                                            size="sm"
                                            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 font-bold"
                                            onClick={() => {
                                                setPortalEmail(client.email || '')
                                                setPortalPassword(generateRandomPassword())
                                                setIsManagePortalOpen(true)
                                            }}
                                        >
                                            <Lock className="h-3.5 w-3.5" /> Setup Client Login
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="projects">
                    <Card>
                        <CardContent className="p-0">
                            {clientProjects.length === 0 ? (
                                <div className="p-8 text-center text-muted-foreground">
                                    <p>No projects found for this client.</p>
                                    <Button variant="link" onClick={() => navigate(`${portalPrefix}/projects/new`)}>Create Project</Button>
                                </div>
                            ) : (
                                <div className="divide-y">
                                    {clientProjects.map(project => (
                                        <div key={project.id} className="p-4 flex items-center justify-between hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => navigate(`${portalPrefix}/projects/${project.id}`)}>
                                            <div>
                                                <h4 className="font-semibold text-sm">{project.name}</h4>
                                                <p className="text-xs text-muted-foreground mt-1">Due: {new Date(project.deadline).toLocaleDateString()}</p>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <Badge variant="secondary">{project.status}</Badge>
                                                {isAdminOrOwnerRole(currentUser?.role) && (
                                                    <span className="font-medium text-sm">{formatCurrency(project.budget)}</span>
                                                )}
                                                <ChevronLeft className="h-4 w-4 rotate-180 text-muted-foreground" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="invoices">
                    <Card>
                        <CardContent className="p-0">
                            {clientInvoices.length === 0 ? (
                                <div className="p-8 text-center text-muted-foreground">No invoices history.</div>
                            ) : (
                                <div className="divide-y">
                                    {clientInvoices.map(inv => (
                                        <div key={inv.id} className="p-4 flex justify-between items-center hover:bg-muted/50">
                                            <div>
                                                <p className="font-medium text-sm">{inv.invoiceNumber}</p>
                                                <p className="text-xs text-muted-foreground">{new Date(inv.date).toLocaleDateString()}</p>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <Badge variant={inv.status === 'paid' ? 'default' : 'secondary'}>{inv.status}</Badge>
                                                <span className="font-bold text-sm">{formatCurrency(inv.total)}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="products" className="space-y-6">
                    {/* Header Controls */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                            <h3 className="text-lg font-bold tracking-tight">Assigned Digital Products</h3>
                            <p className="text-xs text-muted-foreground">
                                {canViewFinances
                                    ? "Track progress, milestones, pending tasks, and payment collections for this client."
                                    : "Track progress, deliverables, milestones, and pending tasks for this client."}
                            </p>
                        </div>
                        {canCreate('projects') && (
                            <Button onClick={() => { setEditingClientProduct(undefined); setIsProductDialogOpen(true); }} size="sm" className="shadow-xs">
                                <Plus className="h-4 w-4 mr-1.5" /> Assign Digital Product
                            </Button>
                        )}
                    </div>

                    {/* Summary Cards */}
                    {clientProducts.length > 0 && (() => {
                        const totalValue = clientProducts.reduce((sum, cp) => sum + (Number(cp.customPrice) || 0), 0)
                        const totalPaid = clientProducts.reduce((sum, cp) => sum + (Number(cp.paidAmount) || 0), 0)
                        const totalPending = Math.max(0, totalValue - totalPaid)
                        const totalTasks = clientProducts.reduce((sum, cp) => sum + (cp.tasks?.length || 0), 0)
                        const pendingTasksCount = clientProducts.reduce((sum, cp) => sum + (cp.tasks?.filter(t => t.status !== 'completed').length || 0), 0)
                        const activeDeliveries = clientProducts.filter(cp => cp.workStatus === 'in_progress' || cp.workStatus === 'review').length

                        if (!canViewFinances) {
                            return (
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                    <div className="p-3.5 rounded-xl border bg-card shadow-xs">
                                        <div className="text-xs font-medium text-muted-foreground uppercase flex items-center gap-1.5">
                                            <Package className="h-3.5 w-3.5 text-blue-500" /> Products
                                        </div>
                                        <div className="text-xl font-bold text-foreground mt-1">{clientProducts.length} Assigned</div>
                                        <span className="text-[11px] text-muted-foreground block mt-0.5">Assigned to client</span>
                                    </div>
                                    <div className="p-3.5 rounded-xl border bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900/40">
                                        <div className="text-xs font-medium text-blue-700 dark:text-blue-300 uppercase flex items-center gap-1.5">
                                            <TrendingUp className="h-3.5 w-3.5 text-blue-600" /> Active Work
                                        </div>
                                        <div className="text-xl font-bold text-blue-700 dark:text-blue-400 mt-1">{activeDeliveries} In Progress</div>
                                        <span className="text-[11px] text-muted-foreground block mt-0.5">Currently active</span>
                                    </div>
                                    <div className="p-3.5 rounded-xl border bg-purple-50/50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-900/40">
                                        <div className="text-xs font-medium text-purple-700 dark:text-purple-300 uppercase flex items-center gap-1.5">
                                            <ListTodo className="h-3.5 w-3.5 text-purple-600" /> Total Tasks
                                        </div>
                                        <div className="text-xl font-bold text-purple-700 dark:text-purple-400 mt-1">{totalTasks} Deliverables</div>
                                        <span className="text-[11px] text-muted-foreground block mt-0.5">Milestone items</span>
                                    </div>
                                    <div className="p-3.5 rounded-xl border bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/40">
                                        <div className="text-xs font-medium text-amber-700 dark:text-amber-300 uppercase flex items-center gap-1.5">
                                            <Clock className="h-3.5 w-3.5 text-amber-600" /> Pending Tasks
                                        </div>
                                        <div className="text-xl font-bold text-amber-700 dark:text-amber-400 mt-1">{pendingTasksCount} Pending</div>
                                        <span className="text-[11px] text-muted-foreground block mt-0.5">Awaiting completion</span>
                                    </div>
                                </div>
                            )
                        }

                        return (
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                <div className="p-3.5 rounded-xl border bg-card shadow-xs">
                                    <div className="text-xs font-medium text-muted-foreground uppercase flex items-center gap-1.5">
                                        <Package className="h-3.5 w-3.5 text-blue-500" /> Products
                                    </div>
                                    <div className="text-xl font-bold text-foreground mt-1">{clientProducts.length} Assigned</div>
                                    <span className="text-[11px] text-muted-foreground block mt-0.5">
                                        {totalTasks > 0 ? `${pendingTasksCount} of ${totalTasks} tasks pending` : 'No tasks created'}
                                    </span>
                                </div>
                                <div className="p-3.5 rounded-xl border bg-card shadow-xs">
                                    <div className="text-xs font-medium text-muted-foreground uppercase flex items-center gap-1.5">
                                        <DollarSign className="h-3.5 w-3.5 text-foreground" /> Total Value
                                    </div>
                                    <div className="text-xl font-bold text-foreground mt-1">{formatCurrency(totalValue)}</div>
                                </div>
                                <div className="p-3.5 rounded-xl border bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/40">
                                    <div className="text-xs font-medium text-emerald-700 dark:text-emerald-300 uppercase flex items-center gap-1.5">
                                        <CreditCard className="h-3.5 w-3.5 text-emerald-600" /> Collected
                                    </div>
                                    <div className="text-xl font-bold text-emerald-700 dark:text-emerald-400 mt-1">{formatCurrency(totalPaid)}</div>
                                </div>
                                <div className={`p-3.5 rounded-xl border shadow-xs ${totalPending === 0
                                        ? 'bg-emerald-50/30 dark:bg-emerald-950/10 border-emerald-200'
                                        : 'bg-rose-50/60 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/40'
                                    }`}>
                                    <div className={`text-xs font-medium uppercase flex items-center gap-1.5 ${totalPending === 0 ? 'text-emerald-700' : 'text-rose-700 dark:text-rose-400'
                                        }`}>
                                        <AlertTriangle className="h-3.5 w-3.5" /> Pending Balance
                                    </div>
                                    <div className={`text-xl font-bold mt-1 ${totalPending === 0 ? 'text-emerald-700' : 'text-rose-700 dark:text-rose-400'
                                        }`}>
                                        {formatCurrency(totalPending)}
                                    </div>
                                </div>
                            </div>
                        )
                    })()}

                    {/* Products Grid */}
                    {clientProducts.length === 0 ? (
                        <Card className="border-dashed">
                            <CardContent className="p-12 text-center text-muted-foreground">
                                <Package className="h-12 w-12 mx-auto mb-3 opacity-40 text-primary" />
                                <h4 className="text-base font-semibold text-foreground">No digital products assigned</h4>
                                <p className="text-sm mt-1 max-w-sm mx-auto">
                                    {canViewFinances
                                        ? 'Assign a digital product from your catalog to track deliverables, start/due dates, tasks, and payment installments.'
                                        : 'No digital products currently assigned to this client.'}
                                </p>
                                {canCreate('projects') && (
                                    <Button onClick={() => { setEditingClientProduct(undefined); setIsProductDialogOpen(true); }} size="sm" className="mt-4">
                                        <Plus className="h-4 w-4 mr-1.5" /> Assign First Product
                                    </Button>
                                )}
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {clientProducts.map(cp => {
                                const prod: any = cp.product
                                const cpId = cp.id || (cp as any)._id
                                const customPrice = Number(cp.customPrice) || 0
                                const paidAmount = Number(cp.paidAmount) || 0
                                const pendingAmount = Math.max(0, customPrice - paidAmount)
                                const tasks = cp.tasks || []
                                const completedTasks = tasks.filter(t => t.status === 'completed')
                                const pendingTasks = tasks.filter(t => t.status !== 'completed')
                                const progressPercent = cp.progress !== undefined ? cp.progress : (
                                    tasks.length > 0 ? Math.round((completedTasks.length / tasks.length) * 100) : 0
                                )

                                // Countdown status
                                let dueBadge = null
                                if (cp.dueDate) {
                                    const due = new Date(cp.dueDate)
                                    const now = new Date()
                                    const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
                                    if (cp.workStatus === 'completed') {
                                        dueBadge = <span className="text-[11px] text-emerald-600 font-medium">Delivered</span>
                                    } else if (diffDays < 0) {
                                        dueBadge = <span className="text-[11px] text-red-600 font-bold bg-red-50 dark:bg-red-950/30 px-2 py-0.5 rounded-full">Overdue {Math.abs(diffDays)}d</span>
                                    } else if (diffDays === 0) {
                                        dueBadge = <span className="text-[11px] text-amber-600 font-bold bg-amber-50 px-2 py-0.5 rounded-full">Due Today</span>
                                    } else {
                                        dueBadge = <span className="text-[11px] text-blue-600 font-medium bg-blue-50 dark:bg-blue-950/30 px-2 py-0.5 rounded-full">{diffDays}d left</span>
                                    }
                                }

                                return (
                                    <Card key={cpId} className="hover:shadow-md transition-all flex flex-col justify-between border">
                                        <CardHeader className="pb-3 border-b bg-muted/20">
                                            <div className="flex justify-between items-start gap-2">
                                                <div>
                                                    <CardTitle className="text-base font-bold text-foreground">
                                                        {prod?.name || 'Digital Product'}
                                                    </CardTitle>
                                                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1 flex-wrap">
                                                        {cp.startDate && (
                                                            <span className="flex items-center gap-1">
                                                                <Calendar className="h-3 w-3 text-blue-500" />
                                                                Start: {new Date(cp.startDate).toLocaleDateString()}
                                                            </span>
                                                        )}
                                                        {cp.dueDate && (
                                                            <span className="flex items-center gap-1">
                                                                <Clock className="h-3 w-3 text-amber-500" />
                                                                Due: {new Date(cp.dueDate).toLocaleDateString()}
                                                            </span>
                                                        )}
                                                        {dueBadge}
                                                    </div>
                                                </div>
                                                <div className="flex flex-col items-end gap-1">
                                                    {/* Work status */}
                                                    <Badge
                                                        variant="secondary"
                                                        className={`text-[10px] ${cp.workStatus === 'completed'
                                                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                                                : cp.workStatus === 'in_progress'
                                                                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                                                                    : cp.workStatus === 'review'
                                                                        ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300'
                                                                        : cp.workStatus === 'on_hold'
                                                                            ? 'bg-amber-100 text-amber-800'
                                                                            : 'bg-muted'
                                                            }`}
                                                    >
                                                        {cp.workStatus === 'completed' && '✅ Completed'}
                                                        {cp.workStatus === 'in_progress' && '⚙️ In Progress'}
                                                        {cp.workStatus === 'review' && '🔍 Review'}
                                                        {cp.workStatus === 'on_hold' && '⏸️ On Hold'}
                                                        {(!cp.workStatus || cp.workStatus === 'not_started') && '⏳ Not Started'}
                                                    </Badge>
                                                    {/* Payment status (Only for managers) */}
                                                    {canViewFinances && (
                                                        <Badge
                                                            variant="outline"
                                                            className={`text-[10px] ${cp.paymentStatus === 'paid'
                                                                    ? 'text-emerald-700 border-emerald-300'
                                                                    : cp.paymentStatus === 'partial'
                                                                        ? 'text-amber-700 border-amber-300'
                                                                        : 'text-rose-700 border-rose-300'
                                                                }`}
                                                        >
                                                            {cp.paymentStatus === 'paid' && 'Paid'}
                                                            {cp.paymentStatus === 'partial' && 'Partial'}
                                                            {(!cp.paymentStatus || cp.paymentStatus === 'unpaid') && 'Unpaid'}
                                                        </Badge>
                                                    )}
                                                </div>
                                            </div>
                                        </CardHeader>

                                        <CardContent className="pt-4 space-y-4 flex-1">
                                            {/* Progress Section */}
                                            <div className="space-y-1.5">
                                                <div className="flex justify-between items-center text-xs">
                                                    <span className="font-semibold text-foreground flex items-center gap-1">
                                                        <TrendingUp className="h-3.5 w-3.5 text-primary" /> Work Progress ({progressPercent}%)
                                                    </span>
                                                    <span className="text-muted-foreground text-[11px]">
                                                        {completedTasks.length}/{tasks.length} tasks done
                                                    </span>
                                                </div>
                                                <Progress value={progressPercent} className="h-2" />
                                            </div>

                                            {/* Financials Row (Only for users with financial permissions) */}
                                            {canViewFinances && (
                                                <div className="grid grid-cols-3 gap-2 p-2.5 rounded-lg bg-muted/40 text-center border">
                                                    <div>
                                                        <span className="text-[10px] text-muted-foreground uppercase block">Price</span>
                                                        <span className="text-xs font-bold text-foreground">{formatCurrency(customPrice)}</span>
                                                    </div>
                                                    <div>
                                                        <span className="text-[10px] text-emerald-700 dark:text-emerald-400 uppercase block">Paid</span>
                                                        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(paidAmount)}</span>
                                                    </div>
                                                    <div>
                                                        <span className="text-[10px] text-rose-700 dark:text-rose-400 uppercase block">Pending</span>
                                                        <span className={`text-xs font-bold ${pendingAmount === 0 ? 'text-emerald-600' : 'text-rose-600 dark:text-rose-400'}`}>
                                                            {formatCurrency(pendingAmount)}
                                                        </span>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Deliverables / Tasks Preview */}
                                            <div className="space-y-1.5">
                                                <div className="text-xs font-semibold text-foreground flex items-center justify-between">
                                                    <span className="flex items-center gap-1.5">
                                                        <ListTodo className="h-3.5 w-3.5 text-purple-500" />
                                                        Pending Deliverables ({pendingTasks.length})
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={() => openManager(cp)}
                                                        className="text-[11px] text-primary hover:underline"
                                                    >
                                                        View all ({tasks.length})
                                                    </button>
                                                </div>

                                                {tasks.length === 0 ? (
                                                    <div className="text-[11px] text-muted-foreground italic py-1">
                                                        No tasks defined. Click "Manage & Track" to add tasks.
                                                    </div>
                                                ) : pendingTasks.length === 0 ? (
                                                    <div className="text-[11px] text-emerald-600 font-medium py-1 flex items-center gap-1">
                                                        <Check className="h-3.5 w-3.5" /> All {tasks.length} tasks completed!
                                                    </div>
                                                ) : (
                                                    <div className="space-y-1 max-h-24 overflow-y-auto">
                                                        {pendingTasks.slice(0, 3).map((t, idx) => {
                                                            const taskId = t.id || (t as any)._id
                                                            return (
                                                                <div key={taskId || idx} className="flex items-center gap-2 text-xs p-1.5 rounded-md bg-background border hover:bg-muted/50 transition-colors">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleQuickToggleTask(cpId, t)}
                                                                        className="h-4 w-4 rounded border flex items-center justify-center hover:border-primary shrink-0"
                                                                        title="Mark complete"
                                                                    />
                                                                    <span className="truncate flex-1 font-medium">{t.title}</span>
                                                                    {t.dueDate && (
                                                                        <span className="text-[10px] text-muted-foreground shrink-0">
                                                                            {new Date(t.dueDate).toLocaleDateString()}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            )
                                                        })}
                                                        {pendingTasks.length > 3 && (
                                                            <div className="text-[10px] text-muted-foreground text-center pt-0.5">
                                                                +{pendingTasks.length - 3} more pending tasks
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Action Buttons */}
                                            <div className="flex items-center gap-2 pt-3 border-t">
                                                {cp.projectId && (
                                                    <Button
                                                        size="sm"
                                                        variant="default"
                                                        className="flex-1 text-xs gap-1.5 shadow-xs bg-indigo-600 hover:bg-indigo-700"
                                                        onClick={() => navigate(`${portalPrefix}/projects/${cp.projectId}`)}
                                                    >
                                                        <FolderOpen className="h-3.5 w-3.5" /> Project Workspace
                                                    </Button>
                                                )}
                                                <Button
                                                    size="sm"
                                                    variant={cp.projectId ? "secondary" : "default"}
                                                    className="flex-1 text-xs gap-1.5 shadow-xs"
                                                    onClick={() => openManager(cp)}
                                                >
                                                    <Sparkles className="h-3.5 w-3.5 text-amber-500" /> Manage
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="text-xs px-2.5"
                                                    onClick={() => { setEditingClientProduct(cp); setIsProductDialogOpen(true); }}
                                                    title="Edit configuration"
                                                >
                                                    <Edit className="h-3.5 w-3.5" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="text-xs px-2.5 text-destructive hover:text-destructive hover:bg-destructive/10"
                                                    onClick={() => handleDeleteProduct(cpId)}
                                                    title="Delete product"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                )
                            })}
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="activity">
                    <VisitorSessionsTimeline email={client.email} />
                </TabsContent>

                <TabsContent value="notes">
                    <Card>
                        <CardHeader>
                            <CardTitle>Internal Notes</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                                {client.notes || "No notes added for this client."}
                            </p>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="onboarding" className="space-y-6">
                    {/* Hero Status Banner */}
                    <Card className="p-6 rounded-3xl border border-border/40 space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <div className={`clay-icon h-12 w-12 rounded-2xl flex items-center justify-center ${client.onboardingStatus === 'completed'
                                        ? 'bg-emerald-500/15 text-emerald-600'
                                        : client.onboardingStatus === 'sent'
                                            ? 'bg-blue-500/15 text-blue-600'
                                            : 'bg-primary/10 text-primary'
                                    }`}>
                                    {client.onboardingStatus === 'completed' ? (
                                        <CheckCircle2 className="h-6 w-6" />
                                    ) : client.onboardingStatus === 'sent' ? (
                                        <Clock className="h-6 w-6" />
                                    ) : (
                                        <Sparkles className="h-6 w-6" />
                                    )}
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h2 className="text-lg font-black text-foreground">
                                            {client.onboardingStatus === 'completed'
                                                ? 'Client Onboarding Completed'
                                                : client.onboardingStatus === 'sent'
                                                    ? 'Onboarding Form Sent - Awaiting Client Response'
                                                    : 'Client Onboarding Not Initiated'}
                                        </h2>
                                        {client.onboardingStatus === 'completed' ? (
                                            <Badge className="clay-badge bg-emerald-500/15 text-emerald-600 font-bold px-2 py-0.5">
                                                Active / Synced
                                            </Badge>
                                        ) : client.onboardingStatus === 'sent' ? (
                                            <Badge className="clay-badge bg-blue-500/15 text-blue-600 font-bold px-2 py-0.5">
                                                Link Active
                                            </Badge>
                                        ) : (
                                            <Badge className="clay-badge bg-muted text-muted-foreground font-bold px-2 py-0.5">
                                                Pending Form
                                            </Badge>
                                        )}
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-0.5 font-medium">
                                        {client.onboardingStatus === 'completed'
                                            ? `Form successfully submitted by client on ${client.onboardingCompletedAt ? new Date(client.onboardingCompletedAt).toLocaleString() : 'recently'}. All details synced below.`
                                            : client.onboardingStatus === 'sent'
                                                ? `Form generated and link issued on ${client.onboardingSentAt ? new Date(client.onboardingSentAt).toLocaleDateString() : 'recently'}. Client can fill it anytime.`
                                                : 'Create a tailored onboarding questionnaire for this client to collect brand assets, business details, and technical scope.'}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 flex-wrap">
                                <Button
                                    onClick={() => setIsOnboardingDialogOpen(true)}
                                    className="clay-btn bg-primary hover:bg-primary/95 text-white font-extrabold text-xs h-9 px-4 rounded-xl shadow-md gap-1.5"
                                >
                                    <Sparkles className="h-3.5 w-3.5" />
                                    {client.onboardingToken ? 'Configure Questions' : 'Generate Onboarding Form'}
                                </Button>
                                {client.onboardingStatus === 'completed' && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handleResetOnboarding}
                                        className="clay-btn text-xs font-bold h-9 rounded-xl gap-1.5"
                                        title="Allow client to resubmit"
                                    >
                                        <RefreshCw className="h-3.5 w-3.5" /> Re-open Form
                                    </Button>
                                )}
                            </div>
                        </div>

                        {/* Shareable Link Bar (if token exists) */}
                        {onboardingPublicUrl && (
                            <div className="clay-inset p-3 rounded-2xl bg-muted/30 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                                <div className="flex items-center gap-2 min-w-0 flex-1">
                                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground shrink-0 flex items-center gap-1">
                                        <Globe className="h-3.5 w-3.5 text-primary" /> Public URL:
                                    </span>
                                    <Input
                                        readOnly
                                        value={onboardingPublicUrl}
                                        className="text-xs font-mono h-8 bg-card select-all rounded-lg flex-1"
                                    />
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={handleCopyOnboardingLink}
                                        className="clay-btn h-8 px-3 text-xs font-bold gap-1 rounded-xl"
                                    >
                                        {copiedOnboardingLink ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                                        {copiedOnboardingLink ? 'Copied' : 'Copy'}
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => window.open(onboardingPublicUrl, '_blank')}
                                        className="clay-btn h-8 px-3 text-xs font-bold gap-1 rounded-xl"
                                    >
                                        <ExternalLink className="h-3.5 w-3.5" /> Preview
                                    </Button>
                                    <Button
                                        size="sm"
                                        onClick={handleWhatsAppInvite}
                                        className="clay-btn bg-emerald-600 hover:bg-emerald-700 text-white h-8 px-3 text-xs font-bold gap-1 rounded-xl"
                                    >
                                        <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                                    </Button>
                                </div>
                            </div>
                        )}
                    </Card>

                    {/* Standard Client Business Details Sync View */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Legal & Business */}
                        <Card className="p-5 rounded-3xl space-y-4">
                            <div className="flex items-center gap-2 pb-2 border-b border-border/40">
                                <Building2 className="h-4 w-4 text-primary" />
                                <h3 className="text-sm font-extrabold text-foreground uppercase tracking-wider">Business & Tax Profile</h3>
                            </div>
                            <div className="space-y-3 text-xs">
                                <div className="flex items-center justify-between pb-2 border-b border-border/30">
                                    <span className="text-muted-foreground font-semibold">Company / Brand</span>
                                    <span className="font-extrabold text-foreground">{client.company || client.name}</span>
                                </div>
                                <div className="flex items-center justify-between pb-2 border-b border-border/30">
                                    <span className="text-muted-foreground font-semibold">Industry</span>
                                    <span className="font-extrabold text-foreground">{client.industry || 'N/A'}</span>
                                </div>
                                <div className="flex items-center justify-between pb-2 border-b border-border/30">
                                    <span className="text-muted-foreground font-semibold">Official Website</span>
                                    {client.website ? (
                                        <a href={client.website} target="_blank" rel="noreferrer" className="text-primary hover:underline font-bold flex items-center gap-1">
                                            {client.website} <ExternalLink className="h-3 w-3" />
                                        </a>
                                    ) : (
                                        <span className="text-muted-foreground">Not Provided</span>
                                    )}
                                </div>
                                <div className="flex items-center justify-between pb-2 border-b border-border/30">
                                    <span className="text-muted-foreground font-semibold">GSTIN / Tax ID</span>
                                    <span className="font-mono font-extrabold text-foreground">{client.gstNumber || 'N/A'}</span>
                                </div>
                                <div className="flex items-start justify-between">
                                    <span className="text-muted-foreground font-semibold shrink-0 pr-3">Billing Address</span>
                                    <span className="text-right text-foreground font-medium">{client.address ? `${client.address}, ${client.city || ''}` : 'N/A'}</span>
                                </div>
                            </div>
                        </Card>

                        {/* Project Scope & Investment */}
                        <Card className="p-5 rounded-3xl space-y-4">
                            <div className="flex items-center gap-2 pb-2 border-b border-border/40">
                                <Sparkles className="h-4 w-4 text-primary" />
                                <h3 className="text-sm font-extrabold text-foreground uppercase tracking-wider">Project Scope & Timeline</h3>
                            </div>
                            <div className="space-y-3 text-xs">
                                <div className="pb-2 border-b border-border/30 space-y-1.5">
                                    <span className="text-muted-foreground font-semibold block">Requested Services</span>
                                    <div className="flex flex-wrap gap-1.5">
                                        {client.services && client.services.length > 0 ? (
                                            client.services.map((s, i) => (
                                                <Badge key={i} className="clay-badge bg-primary/10 text-primary font-bold text-[11px] px-2.5 py-0.5">
                                                    {s}
                                                </Badge>
                                            ))
                                        ) : (
                                            <span className="text-muted-foreground italic">None specified yet</span>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center justify-between pb-2 border-b border-border/30">
                                    <span className="text-muted-foreground font-semibold">Estimated Budget</span>
                                    <span className="font-black text-foreground text-sm">{client.budget || 'N/A'}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-muted-foreground font-semibold">Target Completion Date</span>
                                    <span className="font-bold text-foreground">
                                        {client.expectedDeadline ? new Date(client.expectedDeadline).toLocaleDateString() : 'Flexible / TBD'}
                                    </span>
                                </div>
                            </div>
                        </Card>
                    </div>

                    {/* Custom Tailored Questionnaire Answers */}
                    <Card className="p-6 rounded-3xl space-y-4">
                        <div className="flex items-center justify-between pb-3 border-b border-border/40">
                            <div className="flex items-center gap-2.5">
                                <div className="clay-icon h-8 w-8 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center">
                                    <FileText className="h-4 w-4" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-extrabold uppercase tracking-wider text-foreground">
                                        Client Intake Questionnaire Responses
                                    </h3>
                                    <p className="text-[11px] text-muted-foreground">Detailed responses submitted by {client.name}</p>
                                </div>
                            </div>
                            <Badge className="clay-badge text-[10px] font-bold px-2 py-0.5">
                                {client.onboardingData ? Object.keys(client.onboardingData).length : 0} Questions Answered
                            </Badge>
                        </div>

                        {client.onboardingData && Object.keys(client.onboardingData).length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                                {Object.entries(client.onboardingData).map(([key, value]) => {
                                    // Try to match field label from config if available
                                    const fieldConfig = client.customOnboardingConfig?.customFields?.find((f: any) => f.id === key)
                                    const label = fieldConfig?.label || key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())

                                    // Don't show file URLs as raw text here if already in files section
                                    const isFileUrl = typeof value === 'string' && (value.startsWith('/public/uploads') || value.startsWith('/api/files/secure') || value.startsWith('http'))

                                    return (
                                        <div key={key} className="clay-inset p-3.5 rounded-2xl bg-card/60 space-y-1.5 border border-border/30">
                                            <span className="text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider block">
                                                {label}
                                            </span>
                                            {isFileUrl ? (
                                                <a
                                                    href={value}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline"
                                                >
                                                    <Download className="h-3.5 w-3.5" /> View Uploaded Attachment
                                                </a>
                                            ) : (
                                                <p className="text-xs font-semibold text-foreground whitespace-pre-wrap leading-relaxed">
                                                    {String(value) || <span className="text-muted-foreground italic">No response</span>}
                                                </p>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        ) : (
                            <div className="text-center py-8 space-y-2">
                                <p className="text-xs text-muted-foreground italic">
                                    {client.onboardingStatus === 'sent'
                                        ? 'Waiting for client to submit the questionnaire responses.'
                                        : 'No questionnaire responses yet. Configure questions and send the link to the client.'}
                                </p>
                            </div>
                        )}
                    </Card>

                    {/* Client Uploaded Files & Assets */}
                    <Card className="p-6 rounded-3xl space-y-4">
                        <div className="flex items-center justify-between pb-3 border-b border-border/40">
                            <div className="flex items-center gap-2.5">
                                <div className="clay-icon h-8 w-8 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                                    <FileCheck className="h-4 w-4" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-extrabold uppercase tracking-wider text-foreground">
                                        Client Brand Assets & Documents
                                    </h3>
                                    <p className="text-[11px] text-muted-foreground">Files, logos, and guidelines uploaded by client</p>
                                </div>
                            </div>
                            <Badge className="clay-badge text-[10px] font-bold px-2 py-0.5">
                                {client.onboardingFiles?.length || 0} Files
                            </Badge>
                        </div>

                        {client.onboardingFiles && client.onboardingFiles.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                {client.onboardingFiles.map((file, idx) => (
                                    <div
                                        key={idx}
                                        className="clay-card p-3.5 rounded-2xl bg-card border border-border/40 flex items-center justify-between gap-3 hover:shadow-sm transition-all"
                                    >
                                        <div className="min-w-0 flex-1">
                                            <p className="text-xs font-extrabold text-foreground truncate" title={file.fileName}>
                                                {file.fileName}
                                            </p>
                                            <p className="text-[10px] text-muted-foreground truncate font-medium">
                                                {file.fieldName || 'Client Attachment'}
                                            </p>
                                        </div>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => window.open(file.fileUrl, '_blank')}
                                            className="h-8 w-8 p-0 rounded-xl text-primary hover:bg-primary/10 shrink-0"
                                            title="Download / View File"
                                        >
                                            <Download className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-6 text-xs text-muted-foreground italic">
                                No files or assets uploaded by client yet.
                            </div>
                        )}
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Comprehensive Manage Client Portal Login Dialog */}
            <Dialog
                open={isManagePortalOpen}
                onOpenChange={(open) => {
                    setIsManagePortalOpen(open)
                    if (!open) {
                        setPortalPassword('')
                        setShowPortalPassword(false)
                    }
                }}
            >
                <DialogContent className="sm:max-w-[500px] p-6 rounded-3xl">
                    <DialogHeader className="space-y-1">
                        <div className="flex items-center gap-2.5">
                            <div className="clay-icon h-10 w-10 rounded-2xl bg-emerald-500/15 text-emerald-600 flex items-center justify-center">
                                <Key className="h-5 w-5" />
                            </div>
                            <div>
                                <DialogTitle className="text-lg font-black text-foreground">
                                    Client Portal Login Credentials
                                </DialogTitle>
                                <DialogDescription className="text-xs text-muted-foreground font-medium">
                                    Manage User ID and Password for {client.name} to access their dedicated Client Panel.
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>

                    <div className="space-y-4 py-3">
                        {/* Status banner */}
                        <div className={`p-3 rounded-2xl border flex items-center justify-between text-xs ${clientUser
                                ? 'bg-emerald-50/70 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-900/30 text-emerald-800 dark:text-emerald-300'
                                : 'bg-amber-50/70 border-amber-200 dark:bg-amber-950/20 dark:border-amber-900/30 text-amber-800 dark:text-amber-300'
                            }`}>
                            <div className="flex items-center gap-2 font-bold">
                                {clientUser ? <UserCheck className="h-4 w-4 text-emerald-600" /> : <UserX className="h-4 w-4 text-amber-600" />}
                                <span>{clientUser ? 'Login Account Active' : 'No Login Account Configured'}</span>
                            </div>
                            <span className="font-mono text-[11px]">Role: client</span>
                        </div>

                        {/* Login Email / User ID */}
                        <div className="space-y-1.5">
                            <Label htmlFor="portal-email" className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                <Mail className="h-3.5 w-3.5 text-muted-foreground" /> Client Login Email / User ID *
                            </Label>
                            <Input
                                id="portal-email"
                                type="email"
                                value={portalEmail}
                                onChange={(e) => setPortalEmail(e.target.value)}
                                placeholder="client@example.com"
                                className="clay-input text-xs h-10 rounded-xl"
                            />
                            <p className="text-[10px] text-muted-foreground">The client will use this email address to log in at {window.location.origin}/login</p>
                        </div>

                        {/* Password with Auto-generate & show/hide */}
                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="portal-password" className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                    <Lock className="h-3.5 w-3.5 text-muted-foreground" /> {clientUser ? 'New Password (Optional to change)' : 'Login Password *'}
                                </Label>
                                <button
                                    type="button"
                                    onClick={() => setPortalPassword(generateRandomPassword())}
                                    className="text-[11px] font-bold text-primary hover:underline flex items-center gap-1"
                                >
                                    <Sparkles className="h-3 w-3" /> Auto-Generate
                                </button>
                            </div>
                            <div className="relative">
                                <Input
                                    id="portal-password"
                                    type={showPortalPassword ? 'text' : 'password'}
                                    value={portalPassword}
                                    onChange={(e) => setPortalPassword(e.target.value)}
                                    placeholder={clientUser ? 'Leave blank to keep existing password' : 'Enter password (min 6 characters)'}
                                    className="clay-input text-xs h-10 rounded-xl pr-10 font-mono"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPortalPassword(!showPortalPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                >
                                    {showPortalPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                        </div>

                        {/* Quick Share Buttons (Copy & WhatsApp) */}
                        <div className="flex items-center gap-2 pt-1">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                    const text = `Client Portal Credentials:\nURL: ${window.location.origin}/login\nEmail: ${portalEmail || client.email}\nPassword: ${portalPassword || '(Existing password)'}`
                                    navigator.clipboard.writeText(text)
                                    setCopiedPortalCreds(true)
                                    toast({ title: 'Credentials Copied!', description: 'Saved to clipboard.' })
                                    setTimeout(() => setCopiedPortalCreds(false), 2000)
                                }}
                                className="clay-btn flex-1 text-xs font-bold gap-1.5 h-8 rounded-xl"
                            >
                                {copiedPortalCreds ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                                {copiedPortalCreds ? 'Copied' : 'Copy Credentials'}
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={handleWhatsAppCredentials}
                                className="clay-btn flex-1 text-xs font-bold gap-1.5 h-8 rounded-xl text-emerald-600 hover:text-emerald-700 bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/30"
                            >
                                <MessageCircle className="h-3.5 w-3.5" /> Send on WhatsApp
                            </Button>
                        </div>
                    </div>

                    <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-border/40">
                        {clientUser && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleDisablePortal}
                                className="text-destructive hover:bg-destructive/10 text-xs font-bold mr-auto h-9 rounded-xl"
                            >
                                <Trash2 className="h-3.5 w-3.5 mr-1" /> Disable Access
                            </Button>
                        )}
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setIsManagePortalOpen(false)}
                            className="clay-btn text-xs font-bold h-9 rounded-xl"
                        >
                            Cancel
                        </Button>
                        <Button
                            size="sm"
                            disabled={savingPortal}
                            onClick={handleSavePortalCredentials}
                            className="clay-btn bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs h-9 px-4 rounded-xl shadow-md gap-1.5"
                        >
                            {savingPortal ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                            {clientUser ? (portalPassword.trim() ? 'Save & Reset Password' : 'Update Credentials') : 'Create & Enable Login'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Product Assignment Form Dialog */}
            <Dialog open={isProductDialogOpen} onOpenChange={setIsProductDialogOpen}>
                <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                        <DialogTitle>{editingClientProduct ? 'Edit Assigned Product' : 'Assign Product to Client'}</DialogTitle>
                        <DialogDescription>
                            Configure pricing, delivery timeline, work status, and initial deliverables.
                        </DialogDescription>
                    </DialogHeader>
                    <ClientProductForm
                        clientId={client.id}
                        initialData={editingClientProduct}
                        onSuccess={() => { setIsProductDialogOpen(false); fetchClientProducts(); }}
                        onCancel={() => setIsProductDialogOpen(false)}
                    />
                </DialogContent>
            </Dialog>

            {/* Comprehensive Product Manager Dialog */}
            <Dialog open={isManagerOpen} onOpenChange={setIsManagerOpen}>
                <DialogContent className="sm:max-w-[750px] p-6">
                    {selectedManagerCP && (
                        <ClientProductManagerDialog
                            clientProduct={selectedManagerCP}
                            onUpdate={handleManagerUpdate}
                            onClose={() => setIsManagerOpen(false)}
                        />
                    )}
                </DialogContent>
            </Dialog>

            {/* Client Onboarding Form Customizer & Generator Dialog */}
            {client && (
                <ClientOnboardingDialog
                    client={client}
                    isOpen={isOnboardingDialogOpen}
                    onClose={() => setIsOnboardingDialogOpen(false)}
                    onUpdated={(updated) => {
                        setClients(clients.map(c => c.id === updated.id ? { ...c, ...updated } : c))
                    }}
                />
            )}
        </div>
    )
}

