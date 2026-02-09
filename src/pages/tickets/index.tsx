import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { MessageSquare, Plus, Search, Trash2, Clock, CheckCircle, AlertCircle, User, Upload } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import api from '@/lib/api-client'
import { useToast } from '@/hooks/use-toast'
import { formatDate } from '@/lib/utils'

type Ticket = {
    _id: string
    subject: string
    description: string
    priority: 'low' | 'medium' | 'high' | 'critical'
    status: 'open' | 'in-progress' | 'resolved' | 'closed'
    clientName: string
    assignedTo: string
    createdAt: string
    screenshot?: string
}

export function TicketsPage() {
    const { toast } = useToast()
    const [tickets, setTickets] = useState<Ticket[]>([])
    const [clients, setClients] = useState<{ _id: string, name: string }[]>([])
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [viewTicketDialogOpen, setViewTicketDialogOpen] = useState(false)
    const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null)
    const [searchQuery, setSearchQuery] = useState('')
    const [statusFilter, setStatusFilter] = useState('all')

    const fileInputRef = useRef<HTMLInputElement>(null)

    const [newTicket, setNewTicket] = useState({
        subject: '',
        description: '',
        priority: 'medium',
        clientName: '',
        assignedTo: '',
        screenshot: ''
    })

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            const reader = new FileReader()
            reader.onloadend = () => {
                setNewTicket({ ...newTicket, screenshot: reader.result as string })
                toast({ description: "Screenshot attached" })
            }
            reader.readAsDataURL(file)
        }
    }

    // Fetch Tickets
    const fetchTickets = async () => {
        try {
            const res = await api.get('/tickets')
            setTickets(res.data)
        } catch (error) {
            console.error("Failed to fetch tickets", error)
            toast({ title: "Error", description: "Failed to load tickets", variant: "destructive" })
        }
    }

    useEffect(() => {
        const fetchData = async () => {
            fetchTickets()
            try {
                const res = await api.get('/clients')
                setClients(res.data)
            } catch (error) {
                console.error("Failed to fetch clients", error)
            }
        }
        fetchData()
    }, [])

    // Create Ticket
    const handleCreateTicket = async () => {
        if (!newTicket.subject) return
        try {
            await api.post('/tickets', newTicket)
            fetchTickets()
            setIsDialogOpen(false)
            setNewTicket({ subject: '', description: '', priority: 'medium', clientName: '', assignedTo: '', screenshot: '' })
            toast({ description: "Ticket created successfully" })
        } catch (error) {
            toast({ title: "Error", description: "Failed to create ticket", variant: "destructive" })
        }
    }

    // Update Status
    const handleStatusChange = async (id: string, newStatus: string) => {
        try {
            await api.put(`/tickets/${id}`, { status: newStatus })
            setTickets(tickets.map(t => t._id === id ? { ...t, status: newStatus as any } : t))
            toast({ description: "Status updated" })
        } catch (error) {
            toast({ title: "Error", description: "Failed to update status", variant: "destructive" })
        }
    }

    // Delete Ticket
    const handleDeleteTicket = async (id: string) => {
        try {
            await api.delete(`/tickets/${id}`)
            setTickets(tickets.filter(t => t._id !== id))
            toast({ description: "Ticket deleted" })
            if (selectedTicket?._id === id) setViewTicketDialogOpen(false)
        } catch (error) {
            toast({ title: "Error", description: "Failed to delete ticket", variant: "destructive" })
        }
    }

    // Styles for Priority/Status
    const getPriorityColor = (p: string) => {
        switch (p) {
            case 'critical': return 'bg-red-500 hover:bg-red-600'
            case 'high': return 'bg-orange-500 hover:bg-orange-600'
            case 'medium': return 'bg-yellow-500 hover:bg-yellow-600'
            default: return 'bg-blue-500 hover:bg-blue-600'
        }
    }

    const getStatusColor = (s: string) => {
        switch (s) {
            case 'open': return 'text-blue-600 bg-blue-50'
            case 'in-progress': return 'text-orange-600 bg-orange-50'
            case 'resolved': return 'text-green-600 bg-green-50'
            case 'closed': return 'text-gray-600 bg-gray-50'
            default: return 'text-gray-600 bg-gray-50'
        }
    }

    const filteredTickets = tickets.filter(t => {
        const matchesSearch = t.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (t.clientName || '').toLowerCase().includes(searchQuery.toLowerCase())
        const matchesStatus = statusFilter === 'all' || t.status === statusFilter
        return matchesSearch && matchesStatus
    })

    const openCount = tickets.filter(t => t.status === 'open').length
    const resolvedCount = tickets.filter(t => t.status === 'resolved' || t.status === 'closed').length
    const criticalCount = tickets.filter(t => t.priority === 'critical' || t.priority === 'high').length

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold">Support Tickets</h1>
                    <p className="text-muted-foreground mt-1">Manage client issues and support requests</p>
                </div>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="mr-2 h-4 w-4" />
                            Create Ticket
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Create Support Ticket</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label>Subject *</Label>
                                <Input
                                    value={newTicket.subject}
                                    onChange={(e) => setNewTicket({ ...newTicket, subject: e.target.value })}
                                    placeholder="e.g., Login issue"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Client Name</Label>
                                    <select
                                        className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                        value={newTicket.clientName}
                                        onChange={(e) => setNewTicket({ ...newTicket, clientName: e.target.value })}
                                    >
                                        <option value="">Select Client</option>
                                        {clients.map(client => (
                                            <option key={client._id} value={client.name}>{client.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Priority</Label>
                                    <select
                                        className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                        value={newTicket.priority}
                                        onChange={(e) => setNewTicket({ ...newTicket, priority: e.target.value })}
                                    >
                                        <option value="low">Low</option>
                                        <option value="medium">Medium</option>
                                        <option value="high">High</option>
                                        <option value="critical">Critical</option>
                                    </select>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Description</Label>
                                <Textarea
                                    value={newTicket.description}
                                    onChange={(e) => setNewTicket({ ...newTicket, description: e.target.value })}
                                    placeholder="Describe the issue..."
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Screenshot (Optional)</Label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="file"
                                        hidden
                                        ref={fileInputRef}
                                        onChange={handleFileChange}
                                        accept="image/*"
                                    />
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="w-full"
                                        onClick={() => fileInputRef.current?.click()}
                                    >
                                        <Upload className="mr-2 h-4 w-4" />
                                        {newTicket.screenshot ? 'Screenshot Attached (Change)' : 'Upload Screenshot'}
                                    </Button>
                                </div>
                            </div>
                            <Button className="w-full" onClick={handleCreateTicket}>Create Ticket</Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-sm text-muted-foreground">Open Tickets</p>
                            <h3 className="text-2xl font-bold">{openCount}</h3>
                        </div>
                        <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                            <AlertCircle className="h-5 w-5" />
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-sm text-muted-foreground">Critical/High</p>
                            <h3 className="text-2xl font-bold">{criticalCount}</h3>
                        </div>
                        <div className="h-10 w-10 bg-orange-100 rounded-full flex items-center justify-center text-orange-600">
                            <Clock className="h-5 w-5" />
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-sm text-muted-foreground">Resolved</p>
                            <h3 className="text-2xl font-bold">{resolvedCount}</h3>
                        </div>
                        <div className="h-10 w-10 bg-green-100 rounded-full flex items-center justify-center text-green-600">
                            <CheckCircle className="h-5 w-5" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-4">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        placeholder="Search tickets..."
                        className="pl-10"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <select
                    className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm min-w-[150px]"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                >
                    <option value="all">All Status</option>
                    <option value="open">Open</option>
                    <option value="in-progress">In Progress</option>
                    <option value="resolved">Resolved</option>
                    <option value="closed">Closed</option>
                </select>
            </div>

            {/* Ticket List */}
            <div className="space-y-4">
                {filteredTickets.length === 0 ? (
                    <div className="text-center py-12 bg-muted/20 rounded-lg border-2 border-dashed">
                        <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground/50" />
                        <h3 className="mt-4 text-lg font-semibold">No tickets found</h3>
                    </div>
                ) : (
                    filteredTickets.map(ticket => (
                        <Card
                            key={ticket._id}
                            className="hover:shadow-md transition-shadow cursor-pointer group"
                            onClick={() => { setSelectedTicket(ticket); setViewTicketDialogOpen(true); }}
                        >
                            <CardContent className="p-4">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <Badge className={`${getPriorityColor(ticket.priority)} border-none`}>
                                                {ticket.priority}
                                            </Badge>
                                            <span className="text-xs text-muted-foreground">ID: {ticket._id.slice(-6).toUpperCase()}</span>
                                            <span className="text-xs text-muted-foreground">• {formatDate(new Date(ticket.createdAt))}</span>
                                        </div>
                                        <h3 className="font-semibold text-lg">{ticket.subject}</h3>
                                        <p className="text-sm text-muted-foreground line-clamp-1">{ticket.description || 'No description provided'}</p>

                                        <div className="flex items-center gap-4 mt-2 text-sm">
                                            {ticket.clientName && (
                                                <div className="flex items-center text-muted-foreground">
                                                    <User className="h-3 w-3 mr-1" />
                                                    {ticket.clientName}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4">
                                        <select
                                            className={`h-8 rounded-md border text-sm px-2 font-medium ${getStatusColor(ticket.status)}`}
                                            value={ticket.status}
                                            onClick={(e) => e.stopPropagation()}
                                            onChange={(e) => {
                                                e.stopPropagation(); // prevent card click
                                                handleStatusChange(ticket._id, e.target.value);
                                            }}
                                        >
                                            <option value="open">Open</option>
                                            <option value="in-progress">In Progress</option>
                                            <option value="resolved">Resolved</option>
                                            <option value="closed">Closed</option>
                                        </select>

                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="text-muted-foreground hover:text-destructive opacity-50 group-hover:opacity-100 transition-opacity"
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                handleDeleteTicket(ticket._id)
                                            }}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>

            {/* Ticket Details Dialog */}
            <Dialog open={viewTicketDialogOpen} onOpenChange={setViewTicketDialogOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Ticket Details</DialogTitle>
                    </DialogHeader>
                    {selectedTicket && (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between border-b pb-4">
                                <div>
                                    <h2 className="text-xl font-bold">{selectedTicket.subject}</h2>
                                    <p className="text-xs text-muted-foreground mt-1">ID: {selectedTicket._id}</p>
                                </div>
                                <Badge className={`${getPriorityColor(selectedTicket.priority)} text-base px-3 py-1`}>
                                    {selectedTicket.priority}
                                </Badge>
                            </div>

                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <p className="text-muted-foreground text-xs">Client</p>
                                    <p className="font-medium mt-1 flex items-center">
                                        <User className="h-3 w-3 mr-1" />
                                        {selectedTicket.clientName || 'N/A'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground text-xs">Created At</p>
                                    <p className="font-medium mt-1">{new Date(selectedTicket.createdAt).toLocaleString()}</p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground text-xs">Status</p>
                                    <select
                                        className={`mt-1 h-8 rounded-md border text-sm px-2 font-medium w-full ${getStatusColor(selectedTicket.status)}`}
                                        value={selectedTicket.status}
                                        onChange={(e) => handleStatusChange(selectedTicket._id, e.target.value)}
                                    >
                                        <option value="open">Open</option>
                                        <option value="in-progress">In Progress</option>
                                        <option value="resolved">Resolved</option>
                                        <option value="closed">Closed</option>
                                    </select>
                                </div>
                            </div>

                            <div className="pt-2">
                                <p className="text-sm font-medium mb-2">Description</p>
                                <div className="p-4 bg-muted/50 rounded-md text-sm whitespace-pre-wrap border min-h-[100px]">
                                    {selectedTicket.description || 'No description provided.'}
                                </div>
                            </div>

                            {selectedTicket.screenshot && (
                                <div className="pt-2">
                                    <p className="text-sm font-medium mb-2">Screenshot</p>
                                    <div className="border rounded-lg overflow-hidden bg-muted/10 p-2">
                                        <img
                                            src={selectedTicket.screenshot}
                                            alt="Screenshot"
                                            className="w-full max-h-[300px] object-contain rounded"
                                        />
                                    </div>
                                    <a
                                        href={selectedTicket.screenshot}
                                        download={`screenshot-${selectedTicket._id}`}
                                        className="text-xs text-primary hover:underline mt-1 block text-center"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        Download Image
                                    </a>
                                </div>
                            )}

                            <div className="flex justify-end pt-4 border-t gap-2">
                                <Button variant="outline" onClick={() => setViewTicketDialogOpen(false)}>Close</Button>
                                <Button
                                    variant="destructive"
                                    onClick={() => handleDeleteTicket(selectedTicket._id)}
                                >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Delete Ticket
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    )
}
