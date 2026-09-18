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
import { formatCurrency, getInitials } from '@/lib/utils'
import api from '@/lib/api-client'
import { VisitorSessionsTimeline } from '@/components/contacts/visitor-sessions-timeline'
import { ClientProductForm } from '@/components/clients/client-product-dialog'
import { ClientProductManagerDialog } from '@/components/clients/client-product-manager-dialog'
import { usePermissions } from '@/hooks/use-permissions'
import { Progress } from '@/components/ui/progress'
import { Package, Plus, FolderOpen } from 'lucide-react'
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

export function ClientDetailPage() {
    const { id } = useParams()
    const navigate = useNavigate()
    const { toast } = useToast()
    const { clients, projects, invoices, setClients, deleteClient, users, setUsers, currentUser } = useAppStore()
    const { canView, canCreate } = usePermissions()
    const canViewFinances = currentUser?.role === 'owner' || currentUser?.role === 'admin' || canView('invoices')

    const client = clients.find((c) => c.id === id)

    // Portal Access State
    const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false)
    const [isCreatePortalDialogOpen, setIsCreatePortalDialogOpen] = useState(false)
    const [portalPassword, setPortalPassword] = useState('')
    const [portalEmail, setPortalEmail] = useState('')

    // Client Products State
    const [clientProducts, setClientProducts] = useState<ClientProduct[]>([])
    const [isProductDialogOpen, setIsProductDialogOpen] = useState(false)
    const [editingClientProduct, setEditingClientProduct] = useState<ClientProduct | undefined>(undefined)
    const [selectedManagerCP, setSelectedManagerCP] = useState<ClientProduct | null>(null)
    const [isManagerOpen, setIsManagerOpen] = useState(false)

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

    const clientUser = users.find(u => u.clientId === client?.id || (u.role === 'client' && u.email?.toLowerCase() === client?.email?.toLowerCase()))

    const handleCreatePortal = async () => {
        if (!client) return
        if (!portalEmail || !portalPassword) {
            toast({ variant: "destructive", title: "Validation Error", description: "Email and password are required" })
            return
        }
        try {
            const payload = {
                name: client.name,
                email: portalEmail,
                password: portalPassword,
                role: 'client',
                clientId: client.id
            }
            const res = await api.post('/users', payload)
            const created = { id: res.data._id, ...res.data }
            setUsers([...users, created])
            setIsCreatePortalDialogOpen(false)
            setPortalPassword('')
            toast({ title: "Portal Access Enabled", description: `Login account created for ${client.name}.` })
        } catch (error: any) {
            const msg = error.response?.data?.message || "Failed to create portal user"
            toast({ variant: "destructive", title: "Error", description: msg })
        }
    }

    const handleResetPassword = async () => {
        if (!clientUser) return
        if (!portalPassword) {
            toast({ variant: "destructive", title: "Validation Error", description: "Password cannot be empty" })
            return
        }
        try {
            await api.put(`/users/${clientUser.id}`, { password: portalPassword })
            setIsPasswordDialogOpen(false)
            setPortalPassword('')
            toast({ title: "Password Updated", description: "Client's password has been successfully updated." })
        } catch (error: any) {
            const msg = error.response?.data?.message || "Failed to update password"
            toast({ variant: "destructive", title: "Error", description: msg })
        }
    }

    const handleDisablePortal = async () => {
        if (!clientUser) return
        if (!window.confirm("Are you sure you want to disable login portal access for this client? This will delete their login user account.")) {
            return
        }
        try {
            await api.delete(`/users/${clientUser.id}`)
            setUsers(users.filter(u => u.id !== clientUser.id))
            toast({ title: "Portal Access Disabled", description: "The login account has been removed." })
        } catch (error: any) {
            const msg = error.response?.data?.message || "Failed to delete portal user"
            toast({ variant: "destructive", title: "Error", description: msg })
        }
    }

    const handleDelete = async () => {
        if (!client) return
        if (window.confirm("Are you sure you want to delete this client? This action cannot be undone.")) {
            try {
                await api.delete(`/clients/${client.id}`)
                deleteClient(client.id)
                navigate('/clients')
            } catch (error) {
                console.error("Delete failed", error)
                navigate('/clients') // Redirect anyway if 404
            }
        }
    }

    // Fetch clients if store is empty (Handle Refresh)
    useEffect(() => {
        if (!client && clients.length === 0) {
            const fetchClients = async () => {
                try {
                    const response = await api.get('/clients')
                    const backendClients = response.data.map((c: any) => ({
                        id: c._id,
                        name: c.name,
                        company: c.company,
                        email: c.email,
                        phone: c.phone,
                        address: c.address,
                        type: c.type,
                        status: c.status,
                        industry: c.industry,
                        city: c.city,
                        website: c.website,
                        gstNumber: c.gstNumber,
                        leadSource: c.leadSource,
                        notes: c.notes,
                        services: c.services || [],
                        budget: c.budget,
                        paymentModel: c.paymentModel,
                        deadline: c.expectedDeadline ? new Date(c.expectedDeadline) : undefined,
                        assignedTo: c.assignedTo,
                        followUpDate: c.followUpDate ? new Date(c.followUpDate) : undefined,
                        createdAt: new Date(c.createdAt),
                        updatedAt: new Date(c.updatedAt)
                    }))
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
        if (!window.confirm("Are you sure you want to remove this product from the client?")) return
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
                <Button onClick={() => navigate('/clients')}>Back to Clients</Button>
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

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col gap-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <button onClick={() => navigate('/clients')} className="hover:text-primary transition-colors">Clients</button>
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

                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => navigate(`/clients/${client.id}/edit`)}>
                            <Edit className="mr-2 h-4 w-4" /> Edit Profile
                        </Button>
                        <Button variant="destructive" size="icon" className="w-9 h-9" onClick={handleDelete}>
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
                <TabsList>
                    <TabsTrigger value="overview">Overview</TabsTrigger>
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
                                            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => { setPortalPassword(''); setIsPasswordDialogOpen(true); }}>
                                                <Key className="h-3.5 w-3.5" /> Reset Password
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
                                        <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5" onClick={() => { setPortalPassword(''); setIsCreatePortalDialogOpen(true); }}>
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
                                    <Button variant="link" onClick={() => navigate('/projects/new')}>Create Project</Button>
                                </div>
                            ) : (
                                <div className="divide-y">
                                    {clientProjects.map(project => (
                                        <div key={project.id} className="p-4 flex items-center justify-between hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => navigate(`/projects/${project.id}`)}>
                                            <div>
                                                <h4 className="font-semibold text-sm">{project.name}</h4>
                                                <p className="text-xs text-muted-foreground mt-1">Due: {new Date(project.deadline).toLocaleDateString()}</p>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <Badge variant="secondary">{project.status}</Badge>
                                                <span className="font-medium text-sm">{formatCurrency(project.budget)}</span>
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
                                <div className={`p-3.5 rounded-xl border shadow-xs ${
                                    totalPending === 0
                                        ? 'bg-emerald-50/30 dark:bg-emerald-950/10 border-emerald-200'
                                        : 'bg-rose-50/60 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/40'
                                }`}>
                                    <div className={`text-xs font-medium uppercase flex items-center gap-1.5 ${
                                        totalPending === 0 ? 'text-emerald-700' : 'text-rose-700 dark:text-rose-400'
                                    }`}>
                                        <AlertTriangle className="h-3.5 w-3.5" /> Pending Balance
                                    </div>
                                    <div className={`text-xl font-bold mt-1 ${
                                        totalPending === 0 ? 'text-emerald-700' : 'text-rose-700 dark:text-rose-400'
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
                                                        className={`text-[10px] ${
                                                            cp.workStatus === 'completed'
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
                                                            className={`text-[10px] ${
                                                                cp.paymentStatus === 'paid'
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
                                                        onClick={() => navigate(`/projects/${cp.projectId}`)}
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
            </Tabs>

            {/* Create Portal Access Dialog */}
            <Dialog open={isCreatePortalDialogOpen} onOpenChange={setIsCreatePortalDialogOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Setup Client Portal Login</DialogTitle>
                        <DialogDescription>
                            Create login credentials for {client.name} to access their CRM portal.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="portal-email">Login Email</Label>
                            <Input
                                id="portal-email"
                                type="email"
                                value={portalEmail}
                                onChange={(e) => setPortalEmail(e.target.value)}
                                placeholder="client@example.com"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="portal-password">Password</Label>
                            <Input
                                id="portal-password"
                                type="text"
                                value={portalPassword}
                                onChange={(e) => setPortalPassword(e.target.value)}
                                placeholder="Set password (min 6 characters)"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCreatePortalDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleCreatePortal} className="bg-blue-600 hover:bg-blue-700 text-white">Enable Access</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Reset Password Dialog */}
            <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Reset Client Password</DialogTitle>
                        <DialogDescription>
                            Set a new login password for {client.name}.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="reset-password">New Password</Label>
                            <Input
                                id="reset-password"
                                type="text"
                                value={portalPassword}
                                onChange={(e) => setPortalPassword(e.target.value)}
                                placeholder="Enter new password (min 6 characters)"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsPasswordDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleResetPassword} className="bg-blue-600 hover:bg-blue-700 text-white">Save Password</Button>
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
        </div>
    )
}

