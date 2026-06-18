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
    DollarSign, Clock, Edit, Trash2, ExternalLink, Shield, Key, UserCheck, UserX, Lock
} from 'lucide-react'
import { formatCurrency, getInitials } from '@/lib/utils'
import api from '@/lib/api-client'
import { VisitorSessionsTimeline } from '@/components/contacts/visitor-sessions-timeline'
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
    const { clients, projects, invoices, setClients, deleteClient, users, setUsers } = useAppStore()

    const client = clients.find((c) => c.id === id)

    // Portal Access State
    const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false)
    const [isCreatePortalDialogOpen, setIsCreatePortalDialogOpen] = useState(false)
    const [portalPassword, setPortalPassword] = useState('')
    const [portalEmail, setPortalEmail] = useState('')

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
        </div>
    )
}
