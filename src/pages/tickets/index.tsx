import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { 
    MessageSquare, Plus, Search, Trash2, User, Upload, Briefcase, 
    MessageCircle, RefreshCw
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import api from '@/lib/api-client'
import { useToast } from '@/hooks/use-toast'
import { useAppStore } from '@/store'

type Ticket = {
    _id: string
    subject: string
    description: string
    priority: 'low' | 'medium' | 'high' | 'critical'
    status: 'open' | 'in-progress' | 'resolved' | 'closed' | 'declined' | 'live' | 'need-discussion'
    discussionNote?: string
    clientName: string
    assignedTo: string
    createdAt: string
    screenshot?: string
    projectId?: string
    createdBy?: string
}

export function TicketsPage() {
    const { users, currentUser, projects } = useAppStore()
    const { toast } = useToast()
    const [tickets, setTickets] = useState<Ticket[]>([])
    const [clients, setClients] = useState<{ _id: string, name: string }[]>([])
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [viewTicketDialogOpen, setViewTicketDialogOpen] = useState(false)
    const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null)
    
    // Simple Filter States
    const [activeTab, setActiveTab] = useState<'all' | 'open' | 'in-progress' | 'need-discussion' | 'resolved'>('all')
    const [searchQuery, setSearchQuery] = useState('')
    const [priorityFilter, setPriorityFilter] = useState('all')
    const [selectedProjectFilter, setSelectedProjectFilter] = useState('all')

    const fileInputRef = useRef<HTMLInputElement>(null)

    const [newTicket, setNewTicket] = useState({
        subject: '',
        description: '',
        priority: 'medium',
        clientName: '',
        projectId: '',
        assignedTo: '',
        screenshot: ''
    })

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            const reader = new FileReader()
            reader.onloadend = () => {
                setNewTicket({ ...newTicket, screenshot: reader.result as string })
                toast({ description: "Screenshot attached successfully" })
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
            toast({ title: "Error", description: "Failed to load support tickets", variant: "destructive" })
        }
    }

    useEffect(() => {
        const fetchData = async () => {
            fetchTickets()
            try {
                const [clientsRes, usersRes, projectsRes] = await Promise.all([
                    api.get('/clients').catch(() => ({ data: [] })),
                    api.get('/users').catch(() => ({ data: [] })),
                    api.get('/projects').catch(() => ({ data: [] })),
                ])
                setClients(clientsRes.data || [])
                useAppStore.getState().setUsers(usersRes.data || [])
                useAppStore.getState().setProjects(projectsRes.data || [])
            } catch (error) {
                console.error("Failed to fetch ancillary data", error)
            }
        }
        fetchData()
    }, [])

    // Create Ticket
    const handleCreateTicket = async () => {
        if (!newTicket.subject) {
            toast({ title: "Required", description: "Please enter a ticket title/subject", variant: "destructive" })
            return
        }
        try {
            const selectedClientObj = clients.find(c => c.name === newTicket.clientName)
            const ticketData = {
                ...newTicket,
                clientName: currentUser?.role === 'client' ? currentUser.name : newTicket.clientName,
                clientId: currentUser?.role === 'client'
                    ? currentUser.clientId || currentUser.id || (currentUser as any)?._id
                    : (selectedClientObj ? selectedClientObj._id : undefined),
            }
            await api.post('/tickets', ticketData)
            fetchTickets()
            setIsDialogOpen(false)
            setNewTicket({ subject: '', description: '', priority: 'medium', clientName: '', projectId: '', assignedTo: '', screenshot: '' })
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
            if (selectedTicket && selectedTicket._id === id) {
                setSelectedTicket({ ...selectedTicket, status: newStatus as any })
            }
            toast({ description: `Status changed to ${newStatus}` })
        } catch (error) {
            toast({ title: "Error", description: "Failed to update status", variant: "destructive" })
        }
    }

    // Delete Ticket
    const handleDeleteTicket = async (id: string) => {
        if (!window.confirm("Are you sure you want to delete this ticket?")) return
        try {
            await api.delete(`/tickets/${id}`)
            setTickets(tickets.filter(t => t._id !== id))
            toast({ description: "Ticket deleted" })
            if (selectedTicket?._id === id) setViewTicketDialogOpen(false)
        } catch (error) {
            toast({ title: "Error", description: "Failed to delete ticket", variant: "destructive" })
        }
    }

    // Easy Priority Badges
    const getPriorityDisplay = (p: string) => {
        switch (p) {
            case 'critical':
                return { label: '🚨 CRITICAL', bg: 'bg-red-500 text-white' }
            case 'high':
                return { label: '🔥 HIGH', bg: 'bg-orange-500 text-white' }
            case 'medium':
                return { label: '⚡ MEDIUM', bg: 'bg-amber-500 text-white' }
            default:
                return { label: '🌱 LOW', bg: 'bg-blue-500 text-white' }
        }
    }

    const getStatusStyle = (s: string) => {
        switch (s) {
            case 'open':
                return 'text-blue-700 bg-blue-50 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300'
            case 'in-progress':
                return 'text-amber-700 bg-amber-50 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300'
            case 'resolved':
            case 'live':
                return 'text-emerald-700 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300'
            case 'closed':
                return 'text-gray-700 bg-gray-100 border-gray-200 dark:bg-gray-800 dark:text-gray-300'
            case 'declined':
                return 'text-rose-700 bg-rose-50 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300'
            case 'need-discussion':
                return 'text-purple-700 bg-purple-50 border-purple-200 dark:bg-purple-950/50 dark:text-purple-300'
            default:
                return 'text-gray-700 bg-gray-50 border-gray-200'
        }
    }

    // Filter Logic
    const filteredTickets = tickets.filter(t => {
        const query = searchQuery.toLowerCase()
        const matchesSearch = t.subject.toLowerCase().includes(query) ||
            (t.clientName || '').toLowerCase().includes(query) ||
            t._id.toLowerCase().includes(query)
        
        let matchesTab = true
        if (activeTab === 'open') matchesTab = t.status === 'open'
        else if (activeTab === 'in-progress') matchesTab = t.status === 'in-progress'
        else if (activeTab === 'need-discussion') matchesTab = t.status === 'need-discussion'
        else if (activeTab === 'resolved') matchesTab = ['resolved', 'live', 'closed'].includes(t.status)

        const matchesPriority = priorityFilter === 'all' || t.priority === priorityFilter
        const matchesProject = selectedProjectFilter === 'all' || (t.projectId || 'unassigned') === selectedProjectFilter

        // Role based filtering
        const role = currentUser?.role?.toLowerCase()
        const isOwner = role === 'owner' || role === 'admin'

        const currentName = (currentUser?.name || '').toLowerCase().trim()
        const currentId = currentUser?.id || (currentUser as any)?._id
        const assignedVal = (t.assignedTo || '').toLowerCase().trim()

        const matchesAssignment = isOwner ||
            role === 'client' ||
            assignedVal === currentName ||
            assignedVal === currentId?.toString().toLowerCase() ||
            (t.createdBy && t.createdBy.toLowerCase() === currentId?.toString().toLowerCase())

        return matchesSearch && matchesTab && matchesPriority && matchesProject && matchesAssignment
    })

    // Counts for Tabs
    const allCount = tickets.length
    const openCount = tickets.filter(t => t.status === 'open').length
    const inProgressCount = tickets.filter(t => t.status === 'in-progress').length
    const discussionCount = tickets.filter(t => t.status === 'need-discussion').length
    const resolvedCount = tickets.filter(t => ['resolved', 'live', 'closed'].includes(t.status)).length

    const getProjectName = (pId?: string) => {
        if (!pId || pId === 'unassigned') return 'General Support'
        const project = projects.find(p => p.id === pId || (p as any)._id === pId)
        return project ? project.name : 'Project Support'
    }

    return (
        <div className="space-y-6 font-sans pb-12 max-w-7xl mx-auto">
            {/* 1. Header Row */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card p-5 rounded-2xl border shadow-sm">
                <div>
                    <div className="flex items-center gap-2">
                        <MessageSquare className="h-6 w-6 text-primary" />
                        <h1 className="text-2xl font-bold text-foreground">Support Tickets</h1>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                        View client issues, change requests, and update status with 1 click.
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={fetchTickets} className="h-9 font-bold text-xs">
                        <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Refresh
                    </Button>

                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                        <DialogTrigger asChild>
                            <Button size="sm" className="h-9 font-bold text-xs bg-primary hover:bg-primary/90">
                                <Plus className="mr-1.5 h-4 w-4" /> + Create New Ticket
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl">
                            <DialogHeader>
                                <DialogTitle className="text-lg font-bold">Create Support Ticket</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 py-3 text-xs font-semibold">
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-bold">Ticket Title / Subject *</Label>
                                    <Input
                                        value={newTicket.subject}
                                        onChange={(e) => setNewTicket({ ...newTicket, subject: e.target.value })}
                                        placeholder="e.g. Mobile view responsive bug"
                                        className="h-10 text-xs"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    {currentUser?.role !== 'client' && (
                                        <div className="space-y-1.5">
                                            <Label className="text-xs font-bold">Client Name</Label>
                                            <select
                                                className="h-10 w-full rounded-xl border border-input bg-background px-3 text-xs font-semibold"
                                                value={newTicket.clientName}
                                                onChange={(e) => setNewTicket({ ...newTicket, clientName: e.target.value })}
                                            >
                                                <option value="">Select Client</option>
                                                {clients.map(client => (
                                                    <option key={client._id} value={client.name}>{client.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    )}
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-bold">Priority</Label>
                                        <select
                                            className="h-10 w-full rounded-xl border border-input bg-background px-3 text-xs font-semibold"
                                            value={newTicket.priority}
                                            onChange={(e) => setNewTicket({ ...newTicket, priority: e.target.value as any })}
                                        >
                                            <option value="low">Low Priority</option>
                                            <option value="medium">Medium Priority</option>
                                            <option value="high">High Priority</option>
                                            <option value="critical">🚨 Critical Priority</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="text-xs font-bold">Related Project</Label>
                                    <select
                                        className="h-10 w-full rounded-xl border border-input bg-background px-3 text-xs font-semibold"
                                        value={newTicket.projectId}
                                        onChange={(e) => setNewTicket({ ...newTicket, projectId: e.target.value })}
                                    >
                                        <option value="">Select Project</option>
                                        {(currentUser?.role === 'client'
                                            ? projects.filter(p => p.clientId === currentUser?.clientId || p.clientId === currentUser?.id || p.clientId === (currentUser as any)?._id)
                                            : projects
                                        ).map(project => (
                                            <option key={project.id || (project as any)._id} value={project.id || (project as any)._id}>
                                                {project.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {currentUser?.role !== 'client' && (
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-bold">Assigned Developer</Label>
                                        <select
                                            className="h-10 w-full rounded-xl border border-input bg-background px-3 text-xs font-semibold"
                                            value={newTicket.assignedTo}
                                            onChange={(e) => setNewTicket({ ...newTicket, assignedTo: e.target.value })}
                                        >
                                            <option value="">Unassigned</option>
                                            {users.map(user => (
                                                <option key={user.id || (user as any)._id} value={user.name}>{user.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                <div className="space-y-1.5">
                                    <Label className="text-xs font-bold">Description</Label>
                                    <Textarea
                                        value={newTicket.description}
                                        onChange={(e) => setNewTicket({ ...newTicket, description: e.target.value })}
                                        placeholder="Describe the issue..."
                                        className="min-h-[80px] text-xs font-normal"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="text-xs font-bold">Screenshot Attachment (Optional)</Label>
                                    <input
                                        type="file"
                                        hidden
                                        ref={fileInputRef}
                                        onChange={handleFileChange}
                                        accept="image/*"
                                    />
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="w-full h-9 font-bold text-xs"
                                        onClick={() => fileInputRef.current?.click()}
                                    >
                                        <Upload className="mr-2 h-3.5 w-3.5 text-primary" />
                                        {newTicket.screenshot ? '✓ Screenshot Attached' : 'Upload Image / Screenshot'}
                                    </Button>
                                </div>

                                <Button className="w-full h-10 text-xs font-bold mt-2" onClick={handleCreateTicket}>
                                    Submit Ticket
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {/* 2. Large Easy Status Filter Tabs */}
            <div className="flex overflow-x-auto gap-2 p-1.5 bg-muted/40 rounded-2xl border border-border/60 custom-scrollbar">
                <button
                    onClick={() => setActiveTab('all')}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all whitespace-nowrap ${
                        activeTab === 'all' 
                            ? 'bg-primary text-primary-foreground shadow-sm' 
                            : 'hover:bg-muted text-muted-foreground'
                    }`}
                >
                    <span>All Tickets</span>
                    <span className="px-2 py-0.5 rounded-full bg-background/20 text-[11px]">{allCount}</span>
                </button>

                <button
                    onClick={() => setActiveTab('open')}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all whitespace-nowrap ${
                        activeTab === 'open' 
                            ? 'bg-blue-600 text-white shadow-sm' 
                            : 'hover:bg-muted text-blue-600 dark:text-blue-400'
                    }`}
                >
                    <span>🔵 Open (Needs Action)</span>
                    <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-[11px]">{openCount}</span>
                </button>

                <button
                    onClick={() => setActiveTab('in-progress')}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all whitespace-nowrap ${
                        activeTab === 'in-progress' 
                            ? 'bg-amber-600 text-white shadow-sm' 
                            : 'hover:bg-muted text-amber-600 dark:text-amber-400'
                    }`}
                >
                    <span>🟡 In Progress</span>
                    <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-[11px]">{inProgressCount}</span>
                </button>

                <button
                    onClick={() => setActiveTab('need-discussion')}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all whitespace-nowrap ${
                        activeTab === 'need-discussion' 
                            ? 'bg-purple-600 text-white shadow-sm' 
                            : 'hover:bg-muted text-purple-600 dark:text-purple-400'
                    }`}
                >
                    <span>🟣 Need Discussion</span>
                    <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-[11px]">{discussionCount}</span>
                </button>

                <button
                    onClick={() => setActiveTab('resolved')}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all whitespace-nowrap ${
                        activeTab === 'resolved' 
                            ? 'bg-emerald-600 text-white shadow-sm' 
                            : 'hover:bg-muted text-emerald-600 dark:text-emerald-400'
                    }`}
                >
                    <span>🟢 Resolved & Live</span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-[11px]">{resolvedCount}</span>
                </button>
            </div>

            {/* 3. Easy Search & Dropdown Controls */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="relative">
                    <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        placeholder="🔍 Search ticket title, client name..."
                        className="pl-10 h-10 text-xs font-medium rounded-xl bg-card"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                <select
                    className="h-10 rounded-xl border border-input bg-card px-3 text-xs font-semibold"
                    value={selectedProjectFilter}
                    onChange={(e) => setSelectedProjectFilter(e.target.value)}
                >
                    <option value="all">📁 Filter by Project: All Projects</option>
                    {projects.map(p => (
                        <option key={p.id || (p as any)._id} value={p.id || (p as any)._id}>{p.name}</option>
                    ))}
                </select>

                <select
                    className="h-10 rounded-xl border border-input bg-card px-3 text-xs font-semibold"
                    value={priorityFilter}
                    onChange={(e) => setPriorityFilter(e.target.value)}
                >
                    <option value="all">🚨 Filter by Priority: All Priorities</option>
                    <option value="critical">🚨 Critical Only</option>
                    <option value="high">🔥 High Only</option>
                    <option value="medium">⚡ Medium Only</option>
                    <option value="low">🌱 Low Only</option>
                </select>
            </div>

            {/* 4. Ultra-Clean Ticket Cards Grid */}
            {filteredTickets.length === 0 ? (
                <div className="w-full text-center py-16 bg-card rounded-2xl border-2 border-dashed space-y-3">
                    <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground/30" />
                    <h3 className="text-base font-bold text-foreground">No tickets found in this view</h3>
                    <p className="text-xs text-muted-foreground">Select another tab or clear search parameters.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredTickets.map(ticket => {
                        const prio = getPriorityDisplay(ticket.priority)
                        return (
                            <Card
                                key={ticket._id}
                                className="hover:shadow-md transition-all cursor-pointer bg-card rounded-2xl border hover:border-primary/50 flex flex-col justify-between overflow-hidden"
                                onClick={() => { setSelectedTicket(ticket); setViewTicketDialogOpen(true); }}
                            >
                                <CardContent className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                                    <div className="space-y-2.5">
                                        {/* Top Row: Priority Badge & Ticket Code */}
                                        <div className="flex items-center justify-between">
                                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${prio.bg}`}>
                                                {prio.label}
                                            </span>
                                            <span className="text-[11px] font-bold font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded-md">
                                                #{ticket._id.slice(-5).toUpperCase()}
                                            </span>
                                        </div>

                                        {/* Subject Title */}
                                        <h3 className="font-bold text-base text-foreground leading-snug line-clamp-2 hover:text-primary transition-colors" title={ticket.subject}>
                                            {ticket.subject}
                                        </h3>

                                        {/* Project Tag */}
                                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-semibold">
                                            <Briefcase className="h-3.5 w-3.5 text-primary shrink-0" />
                                            <span className="truncate">{getProjectName(ticket.projectId)}</span>
                                        </div>
                                    </div>

                                    {/* Bottom Info & Easy Status Switcher */}
                                    <div className="pt-3 border-t space-y-3">
                                        <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
                                            <div className="flex items-center gap-1.5 truncate max-w-[140px]">
                                                <User className="h-3.5 w-3.5 text-muted-foreground" />
                                                <span className="truncate">{ticket.clientName || 'Client'}</span>
                                            </div>

                                            <div className="flex items-center gap-1 text-[11px] text-primary font-bold">
                                                <span>{ticket.assignedTo ? `👨‍💻 ${ticket.assignedTo}` : 'Unassigned'}</span>
                                            </div>
                                        </div>

                                        {/* 1-Click Status Dropdown Selector */}
                                        <div className="flex items-center justify-between gap-2" onClick={(e) => e.stopPropagation()}>
                                            <span className="text-[11px] font-bold text-muted-foreground uppercase">Status:</span>
                                            <select
                                                className={`h-8 rounded-xl border text-xs px-3 font-bold cursor-pointer outline-none ${getStatusStyle(ticket.status)}`}
                                                value={ticket.status}
                                                onChange={(e) => handleStatusChange(ticket._id, e.target.value)}
                                                disabled={currentUser?.role === 'client'}
                                            >
                                                <option value="open">🔵 Open</option>
                                                <option value="in-progress">🟡 In Progress</option>
                                                <option value="need-discussion">🟣 Need Discussion</option>
                                                <option value="resolved">🟢 Resolved</option>
                                                <option value="live">🚀 Live</option>
                                                <option value="closed">⚪ Closed</option>
                                                <option value="declined">🔴 Declined</option>
                                            </select>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )
                    })}
                </div>
            )}

            {/* 5. Easy Ticket Details & Discussion Workspace Modal */}
            <Dialog open={viewTicketDialogOpen} onOpenChange={setViewTicketDialogOpen}>
                <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-bold flex items-center gap-2">
                            <MessageSquare className="h-5 w-5 text-primary" /> Ticket Details
                        </DialogTitle>
                    </DialogHeader>

                    {selectedTicket && (
                        <div className="space-y-5 pt-2 text-xs font-semibold">
                            {/* Title & Priority Header */}
                            <div className="p-4 bg-muted/40 rounded-xl border space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${getPriorityDisplay(selectedTicket.priority).bg}`}>
                                        {getPriorityDisplay(selectedTicket.priority).label}
                                    </span>
                                    <span className="font-mono text-xs font-bold text-muted-foreground">ID: #{selectedTicket._id}</span>
                                </div>
                                <h2 className="text-lg font-extrabold text-foreground">{selectedTicket.subject}</h2>
                                <p className="text-[11px] text-muted-foreground">Created: {new Date(selectedTicket.createdAt).toLocaleString()}</p>
                            </div>

                            {/* Easy Controls */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1 p-3 rounded-xl border bg-card">
                                    <Label className="text-[10px] uppercase font-bold text-muted-foreground">Change Status</Label>
                                    <select
                                        className={`w-full h-8 rounded-lg border text-xs font-bold px-2 ${getStatusStyle(selectedTicket.status)}`}
                                        value={selectedTicket.status}
                                        onChange={(e) => handleStatusChange(selectedTicket._id, e.target.value)}
                                    >
                                        <option value="open">🔵 Open</option>
                                        <option value="in-progress">🟡 In Progress</option>
                                        <option value="need-discussion">🟣 Need Discussion</option>
                                        <option value="resolved">🟢 Resolved</option>
                                        <option value="live">🚀 Live</option>
                                        <option value="closed">⚪ Closed</option>
                                    </select>
                                </div>

                                <div className="space-y-1 p-3 rounded-xl border bg-card">
                                    <Label className="text-[10px] uppercase font-bold text-muted-foreground">Assigned Developer</Label>
                                    <select
                                        className="w-full h-8 rounded-lg border text-xs font-bold px-2 bg-background"
                                        value={selectedTicket.assignedTo || ''}
                                        onChange={async (e) => {
                                            const newName = e.target.value;
                                            try {
                                                await api.put(`/tickets/${selectedTicket._id}`, { assignedTo: newName });
                                                setTickets(tickets.map(t => t._id === selectedTicket._id ? { ...t, assignedTo: newName } : t));
                                                setSelectedTicket({ ...selectedTicket, assignedTo: newName });
                                                toast({ description: "Assignment updated" });
                                            } catch (err) {
                                                toast({ title: "Error", description: "Failed to update assignment", variant: "destructive" });
                                            }
                                        }}
                                    >
                                        <option value="">Unassigned</option>
                                        {users.map(u => (
                                            <option key={u.id || (u as any)._id} value={u.name}>{u.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Project & Client Details */}
                            <div className="grid grid-cols-2 gap-3 p-3 bg-muted/20 rounded-xl border">
                                <div>
                                    <span className="text-[10px] text-muted-foreground uppercase font-bold">Client</span>
                                    <p className="font-bold text-foreground text-sm pt-0.5">{selectedTicket.clientName || 'Client'}</p>
                                </div>
                                <div>
                                    <span className="text-[10px] text-muted-foreground uppercase font-bold">Project</span>
                                    <p className="font-bold text-primary text-sm pt-0.5">{getProjectName(selectedTicket.projectId)}</p>
                                </div>
                            </div>

                            {/* Description */}
                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold uppercase text-muted-foreground">Description</Label>
                                <div className="p-3.5 bg-muted/20 rounded-xl text-xs font-normal leading-relaxed whitespace-pre-wrap border min-h-[70px]">
                                    {selectedTicket.description || 'No description specified.'}
                                </div>
                            </div>

                            {/* Discussion Notes */}
                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold uppercase text-purple-600 dark:text-purple-400 flex items-center gap-1.5">
                                    <MessageCircle className="h-4 w-4" /> Discussion & Resolution Notes
                                </Label>
                                <Textarea
                                    placeholder="Enter discussion points, client updates, or resolution notes..."
                                    defaultValue={selectedTicket.discussionNote || ''}
                                    className="text-xs font-medium min-h-[80px] rounded-xl"
                                    onBlur={async (e) => {
                                        const value = e.target.value;
                                        if (value !== (selectedTicket.discussionNote || '')) {
                                            try {
                                                await api.put(`/tickets/${selectedTicket._id}`, { discussionNote: value });
                                                setTickets(tickets.map(t => t._id === selectedTicket._id ? { ...t, discussionNote: value } : t));
                                                setSelectedTicket({ ...selectedTicket, discussionNote: value });
                                                toast({ description: "Discussion note saved" });
                                            } catch (err) {
                                                toast({ title: "Error", description: "Failed to save note", variant: "destructive" });
                                            }
                                        }
                                    }}
                                />
                            </div>

                            {/* Screenshot Preview */}
                            {selectedTicket.screenshot && (
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-bold uppercase text-muted-foreground">Attached Image</Label>
                                    <div className="border rounded-xl p-2 bg-muted/10 space-y-2">
                                        <img
                                            src={selectedTicket.screenshot}
                                            alt="Screenshot"
                                            className="w-full max-h-[300px] object-contain rounded-lg border shadow-xs"
                                        />
                                        <a
                                            href={selectedTicket.screenshot}
                                            download={`screenshot-${selectedTicket._id}`}
                                            className="text-xs font-bold text-primary hover:underline block text-center pt-1"
                                        >
                                            Download Image
                                        </a>
                                    </div>
                                </div>
                            )}

                            {/* Footer Actions */}
                            <div className="flex items-center justify-between pt-4 border-t">
                                {currentUser?.role !== 'client' ? (
                                    <Button
                                        variant="destructive"
                                        size="sm"
                                        className="h-8 text-xs font-bold"
                                        onClick={() => handleDeleteTicket(selectedTicket._id)}
                                    >
                                        <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Delete
                                    </Button>
                                ) : <div />}

                                <Button variant="outline" size="sm" className="h-8 text-xs font-bold" onClick={() => setViewTicketDialogOpen(false)}>
                                    Close
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    )
}

export default TicketsPage
