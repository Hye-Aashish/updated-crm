import { useState, useEffect, useMemo } from 'react'
import { 
    Plus, Search, LayoutGrid, List as ListIcon, Briefcase, CheckSquare, 
    AlertTriangle, Layers, Globe, Smartphone, Clock, FileCode, ArrowUpRight, 
    Kanban, MoreVertical, Edit, Trash2, Eye, ShieldAlert, 
    ArrowUpDown, Play, Pause, CheckCircle2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, 
    DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuSub,
    DropdownMenuSubTrigger, DropdownMenuSubContent
} from '@/components/ui/dropdown-menu'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '@/store'
import { usePermissions } from '@/hooks/use-permissions'
import { formatCurrency, formatDate } from '@/lib/utils'
import { ProjectService } from '@/lib/services/project.service'
import { ClientService } from '@/lib/services/client.service'
import { PageSkeleton } from '@/components/ui/page-skeleton'
import { useToast } from '@/hooks/use-toast'
import { handleApiError } from '@/lib/error-handler'
import { Project, ProjectStatus, ProjectHealth } from '@/types'

// Quick Status Options
const STATUS_OPTIONS: { value: ProjectStatus; label: string; color: string; icon: any }[] = [
    { value: 'planning', label: 'Planning', color: 'bg-purple-500/10 text-purple-700 border-purple-500/30', icon: Clock },
    { value: 'in-progress', label: 'In Progress', color: 'bg-blue-500/10 text-blue-700 border-blue-500/30', icon: Play },
    { value: 'review', label: 'Review / Testing', color: 'bg-amber-500/10 text-amber-700 border-amber-500/30', icon: CheckSquare },
    { value: 'on-hold', label: 'On Hold', color: 'bg-gray-500/10 text-gray-700 border-gray-500/30', icon: Pause },
    { value: 'completed', label: 'Completed', color: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30', icon: CheckCircle2 },
]

// Health Options
const HEALTH_OPTIONS: { value: ProjectHealth; label: string; dotClass: string }[] = [
    { value: 'green', label: '🟢 On Track', dotClass: 'bg-emerald-500' },
    { value: 'yellow', label: '🟡 At Risk', dotClass: 'bg-amber-500' },
    { value: 'red', label: '🔴 Overdue / Delayed', dotClass: 'bg-red-500' },
    { value: 'blue', label: '🔵 Paused', dotClass: 'bg-blue-500' },
]

export function ProjectsPage() {
    const navigate = useNavigate()
    const { toast } = useToast()
    const { canCreate, canDelete } = usePermissions()
    const [view, setView] = useState<'grid' | 'kanban' | 'list'>('grid')
    const [loading, setLoading] = useState(true)
    const [updatingId, setUpdatingId] = useState<string | null>(null)
    
    // Search & Filter state
    const [searchQuery, setSearchQuery] = useState('')
    const [activeKpiFilter, setActiveKpiFilter] = useState<'all' | 'active' | 'planning' | 'delayed' | 'on-hold' | 'completed'>('all')
    const [statusFilter, setStatusFilter] = useState<string>('all')
    const [healthFilter, setHealthFilter] = useState<string>('all')
    const [typeFilter, setTypeFilter] = useState<string>('all')
    const [sortBy, setSortBy] = useState<'deadline' | 'budget' | 'progress' | 'name'>('deadline')

    const { projects, clients, setProjects, setClients } = useAppStore()

    // Fetch Data
    const loadData = async () => {
        try {
            setLoading(true)
            const [backendProjects, backendClients] = await Promise.all([
                ProjectService.getAll(),
                ClientService.getAll().catch(() => [])
            ])
            setProjects(backendProjects)
            setClients(backendClients)
        } catch (error) {
            console.error("Failed to fetch projects data:", error)
            handleApiError(error, toast, "Failed to load projects")
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadData()
    }, [])

    // Quick Update Project Status or Health
    const handleQuickUpdate = async (projectId: string, updates: Partial<Project>) => {
        try {
            setUpdatingId(projectId)
            const updated = await ProjectService.update(projectId, updates)
            setProjects(projects.map(p => (p.id === projectId || p._id === projectId) ? updated : p))
            toast({
                title: "Project updated",
                description: `Successfully updated project settings.`
            })
        } catch (err) {
            console.error("Failed to update project:", err)
            handleApiError(err, toast, "Update failed")
        } finally {
            setUpdatingId(null)
        }
    }

    // Quick Delete
    const handleDeleteProject = async (projectId: string, name: string) => {
        if (!confirm(`Are you sure you want to delete "${name}"?`)) return
        try {
            await ProjectService.delete(projectId)
            setProjects(projects.filter(p => (p.id !== projectId && p._id !== projectId)))
            toast({
                title: "Project deleted",
                description: `${name} has been deleted.`
            })
        } catch (err) {
            handleApiError(err, toast, "Delete failed")
        }
    }

    // KPI Summary Metrics
    const metrics = useMemo(() => {
        const total = projects.length
        const active = projects.filter(p => ['in-progress', 'review'].includes(p.status)).length
        const planning = projects.filter(p => p.status === 'planning').length
        const completed = projects.filter(p => p.status === 'completed').length
        const onHold = projects.filter(p => p.status === 'on-hold').length
        const delayed = projects.filter(p => 
            p.health === 'red' || p.health === 'yellow' || 
            (p.dueDate && new Date(p.dueDate) < new Date() && p.status !== 'completed')
        ).length

        const totalBudgetSum = projects.reduce((acc, p) => acc + (p.budget || 0), 0)

        return { total, active, planning, completed, onHold, delayed, totalBudgetSum }
    }, [projects])

    // Filtered & Sorted Projects
    const filteredProjects = useMemo(() => {
        return projects.filter(p => {
            // Dropdown Status Filter
            if (statusFilter !== 'all' && p.status !== statusFilter) return false

            // KPI Tab Filter
            if (activeKpiFilter === 'active' && !['in-progress', 'review'].includes(p.status)) return false
            if (activeKpiFilter === 'planning' && p.status !== 'planning') return false
            if (activeKpiFilter === 'completed' && p.status !== 'completed') return false
            if (activeKpiFilter === 'on-hold' && p.status !== 'on-hold') return false
            if (activeKpiFilter === 'delayed') {
                const isOverdue = p.health === 'red' || p.health === 'yellow' || (p.dueDate && new Date(p.dueDate) < new Date() && p.status !== 'completed')
                if (!isOverdue) return false
            }

            // Dropdown Health Filter
            if (healthFilter !== 'all' && p.health !== healthFilter) return false

            // Dropdown Type Filter
            if (typeFilter !== 'all' && p.type !== typeFilter) return false

            // Search Query Filter
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase()
                const client = clients.find(c => c.id === p.clientId)
                const clientName = (client?.company || client?.name || '').toLowerCase()
                const nameMatches = p.name.toLowerCase().includes(q)
                const typeMatches = p.type?.toLowerCase().includes(q)
                const clientMatches = clientName.includes(q)

                if (!nameMatches && !typeMatches && !clientMatches) return false
            }

            return true
        }).sort((a, b) => {
            if (sortBy === 'deadline') {
                const dateA = a.dueDate ? new Date(a.dueDate).getTime() : Infinity
                const dateB = b.dueDate ? new Date(b.dueDate).getTime() : Infinity
                return dateA - dateB
            }
            if (sortBy === 'budget') return (b.budget || 0) - (a.budget || 0)
            if (sortBy === 'progress') return (b.progress || 0) - (a.progress || 0)
            if (sortBy === 'name') return a.name.localeCompare(b.name)
            return 0
        })
    }, [projects, activeKpiFilter, statusFilter, healthFilter, typeFilter, searchQuery, sortBy, clients])

    if (loading && projects.length === 0) {
        return <PageSkeleton />
    }

    return (
        <div className="space-y-6 font-sans pb-10">
            {/* Header Section */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-card p-5 rounded-2xl border border-border/60 shadow-sm">
                <div className="space-y-1">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                            <Briefcase className="h-6 w-6" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-2xl font-bold tracking-tight text-foreground">Projects Hub</h1>
                                <Badge variant="secondary" className="font-bold text-xs bg-primary/10 text-primary border-primary/20">
                                    {projects.length} Total
                                </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground font-medium mt-0.5">
                                Manage project pipelines, track milestones, monitor health status, and live deliverables.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Quick Action Navigation Buttons */}
                <div className="flex flex-wrap items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => navigate('/projects/developer-dashboard')} className="h-9 font-semibold text-xs border-border/80 hover:bg-accent">
                        <FileCode className="mr-1.5 h-4 w-4 text-purple-600 dark:text-purple-400" /> Dev Workspace
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => navigate('/projects/templates')} className="h-9 font-semibold text-xs border-border/80 hover:bg-accent">
                        <Layers className="mr-1.5 h-4 w-4 text-blue-600 dark:text-blue-400" /> Templates
                    </Button>
                    {canCreate('projects') && (
                        <Button onClick={() => navigate('/projects/new')} className="h-9 font-bold text-xs bg-gradient-to-r from-primary to-indigo-600 text-white shadow-md hover:opacity-90">
                            <Plus className="mr-1.5 h-4 w-4" /> New Project
                        </Button>
                    )}
                </div>
            </div>

            {/* Interactive KPI Filter Cards (1-Click Filtering) */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {/* ALL PROJECTS */}
                <button
                    onClick={() => { setActiveKpiFilter('all'); setStatusFilter('all') }}
                    className={`text-left p-3.5 rounded-xl border transition-all ${
                        activeKpiFilter === 'all' && statusFilter === 'all'
                            ? 'bg-purple-500/10 border-purple-500 shadow-sm ring-1 ring-purple-500/50'
                            : 'bg-card border-border/60 hover:border-purple-300 dark:hover:border-purple-800'
                    }`}
                >
                    <div className="flex items-center justify-between text-purple-600 dark:text-purple-400 mb-2">
                        <span className="text-xs font-bold uppercase tracking-wider">All Projects</span>
                        <Briefcase className="h-4 w-4" />
                    </div>
                    <div className="text-2xl font-black text-foreground">{metrics.total}</div>
                    <div className="text-[10px] text-muted-foreground font-semibold mt-1 truncate">
                        Sum: {formatCurrency(metrics.totalBudgetSum)}
                    </div>
                </button>

                {/* IN PROGRESS */}
                <button
                    onClick={() => { setActiveKpiFilter('active'); setStatusFilter('in-progress') }}
                    className={`text-left p-3.5 rounded-xl border transition-all ${
                        activeKpiFilter === 'active' || statusFilter === 'in-progress'
                            ? 'bg-sky-500/10 border-sky-500 shadow-sm ring-1 ring-sky-500/50'
                            : 'bg-card border-border/60 hover:border-sky-300 dark:hover:border-sky-800'
                    }`}
                >
                    <div className="flex items-center justify-between text-sky-600 dark:text-sky-400 mb-2">
                        <span className="text-xs font-bold uppercase tracking-wider">In Progress</span>
                        <Play className="h-4 w-4 fill-current" />
                    </div>
                    <div className="text-2xl font-black text-foreground">{metrics.active}</div>
                    <div className="text-[10px] text-sky-600 dark:text-sky-400 font-semibold mt-1">
                        Active building
                    </div>
                </button>

                {/* PLANNING */}
                <button
                    onClick={() => { setActiveKpiFilter('planning'); setStatusFilter('planning') }}
                    className={`text-left p-3.5 rounded-xl border transition-all ${
                        activeKpiFilter === 'planning' || statusFilter === 'planning'
                            ? 'bg-indigo-500/10 border-indigo-500 shadow-sm ring-1 ring-indigo-500/50'
                            : 'bg-card border-border/60 hover:border-indigo-300 dark:hover:border-indigo-800'
                    }`}
                >
                    <div className="flex items-center justify-between text-indigo-600 dark:text-indigo-400 mb-2">
                        <span className="text-xs font-bold uppercase tracking-wider">Planning</span>
                        <Clock className="h-4 w-4" />
                    </div>
                    <div className="text-2xl font-black text-foreground">{metrics.planning}</div>
                    <div className="text-[10px] text-muted-foreground font-semibold mt-1">
                        Onboarding & Scope
                    </div>
                </button>

                {/* AT RISK / OVERDUE */}
                <button
                    onClick={() => { setActiveKpiFilter('delayed'); setStatusFilter('all') }}
                    className={`text-left p-3.5 rounded-xl border transition-all ${
                        activeKpiFilter === 'delayed'
                            ? 'bg-red-500/10 border-red-500 shadow-sm ring-1 ring-red-500/50'
                            : 'bg-card border-border/60 hover:border-red-300 dark:hover:border-red-800'
                    }`}
                >
                    <div className="flex items-center justify-between text-red-600 dark:text-red-400 mb-2">
                        <span className="text-xs font-bold uppercase tracking-wider">Delayed / Risk</span>
                        <AlertTriangle className="h-4 w-4" />
                    </div>
                    <div className="text-2xl font-black text-red-600 dark:text-red-400">{metrics.delayed}</div>
                    <div className="text-[10px] text-red-600 dark:text-red-400 font-semibold mt-1">
                        Needs attention
                    </div>
                </button>

                {/* ON HOLD */}
                <button
                    onClick={() => { setActiveKpiFilter('on-hold'); setStatusFilter('on-hold') }}
                    className={`text-left p-3.5 rounded-xl border transition-all ${
                        activeKpiFilter === 'on-hold' || statusFilter === 'on-hold'
                            ? 'bg-gray-500/10 border-gray-500 shadow-sm ring-1 ring-gray-500/50'
                            : 'bg-card border-border/60 hover:border-gray-400'
                    }`}
                >
                    <div className="flex items-center justify-between text-gray-600 dark:text-gray-400 mb-2">
                        <span className="text-xs font-bold uppercase tracking-wider">On Hold</span>
                        <Pause className="h-4 w-4" />
                    </div>
                    <div className="text-2xl font-black text-foreground">{metrics.onHold}</div>
                    <div className="text-[10px] text-muted-foreground font-semibold mt-1">
                        Paused projects
                    </div>
                </button>

                {/* COMPLETED */}
                <button
                    onClick={() => { setActiveKpiFilter('completed'); setStatusFilter('completed') }}
                    className={`text-left p-3.5 rounded-xl border transition-all ${
                        activeKpiFilter === 'completed' || statusFilter === 'completed'
                            ? 'bg-emerald-500/10 border-emerald-500 shadow-sm ring-1 ring-emerald-500/50'
                            : 'bg-card border-border/60 hover:border-emerald-300 dark:hover:border-emerald-800'
                    }`}
                >
                    <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 mb-2">
                        <span className="text-xs font-bold uppercase tracking-wider">Completed</span>
                        <CheckCircle2 className="h-4 w-4" />
                    </div>
                    <div className="text-2xl font-black text-foreground">{metrics.completed}</div>
                    <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold mt-1">
                        Live & Delivered
                    </div>
                </button>
            </div>

            {/* Filter & Toolbar Controls */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-3 bg-card p-3.5 rounded-xl border border-border/60">
                {/* Search */}
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search project name, client company, type..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 h-9 text-xs rounded-lg bg-background"
                    />
                </div>

                {/* Filters & View Switchers */}
                <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-between md:justify-end">
                    {/* Status Filter */}
                    <Select value={statusFilter} onValueChange={(val) => { setStatusFilter(val); if (val !== 'all') setActiveKpiFilter('all') }}>
                        <SelectTrigger className="h-9 w-[135px] text-xs font-semibold bg-background">
                            <SelectValue placeholder="Status Filter" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all" className="text-xs font-semibold">All Statuses</SelectItem>
                            <SelectItem value="planning" className="text-xs font-semibold text-purple-600">📋 Planning</SelectItem>
                            <SelectItem value="in-progress" className="text-xs font-semibold text-blue-600">▶️ In Progress</SelectItem>
                            <SelectItem value="review" className="text-xs font-semibold text-amber-600">🔍 Review / Testing</SelectItem>
                            <SelectItem value="on-hold" className="text-xs font-semibold text-gray-600">⏸️ On Hold</SelectItem>
                            <SelectItem value="completed" className="text-xs font-semibold text-emerald-600">🏁 Completed</SelectItem>
                        </SelectContent>
                    </Select>

                    {/* Health Filter */}
                    <Select value={healthFilter} onValueChange={setHealthFilter}>
                        <SelectTrigger className="h-9 w-[130px] text-xs font-semibold bg-background">
                            <SelectValue placeholder="Health" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all" className="text-xs font-semibold">All Health</SelectItem>
                            <SelectItem value="green" className="text-xs font-semibold text-emerald-600">🟢 On Track</SelectItem>
                            <SelectItem value="yellow" className="text-xs font-semibold text-amber-600">🟡 At Risk</SelectItem>
                            <SelectItem value="red" className="text-xs font-semibold text-red-600">🔴 Overdue</SelectItem>
                            <SelectItem value="blue" className="text-xs font-semibold text-blue-600">🔵 Paused</SelectItem>
                        </SelectContent>
                    </Select>

                    {/* Type Filter */}
                    <Select value={typeFilter} onValueChange={setTypeFilter}>
                        <SelectTrigger className="h-9 w-[130px] text-xs font-semibold bg-background">
                            <SelectValue placeholder="Type" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all" className="text-xs font-semibold">All Types</SelectItem>
                            <SelectItem value="website" className="text-xs font-semibold">Website</SelectItem>
                            <SelectItem value="web-app" className="text-xs font-semibold">Web App</SelectItem>
                            <SelectItem value="mobile-app" className="text-xs font-semibold">Mobile App</SelectItem>
                            <SelectItem value="lms" className="text-xs font-semibold">LMS</SelectItem>
                            <SelectItem value="crm-erp" className="text-xs font-semibold">CRM / ERP</SelectItem>
                            <SelectItem value="ecommerce" className="text-xs font-semibold">E-Commerce</SelectItem>
                            <SelectItem value="custom" className="text-xs font-semibold">Custom</SelectItem>
                        </SelectContent>
                    </Select>

                    {/* Sort By */}
                    <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
                        <SelectTrigger className="h-9 w-[130px] text-xs font-semibold bg-background">
                            <div className="flex items-center gap-1.5">
                                <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
                                <SelectValue placeholder="Sort" />
                            </div>
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="deadline" className="text-xs font-semibold">Sort: Deadline</SelectItem>
                            <SelectItem value="budget" className="text-xs font-semibold">Sort: Budget</SelectItem>
                            <SelectItem value="progress" className="text-xs font-semibold">Sort: Progress</SelectItem>
                            <SelectItem value="name" className="text-xs font-semibold">Sort: Name</SelectItem>
                        </SelectContent>
                    </Select>

                    {/* Reset Filters button if any active */}
                    {(searchQuery || statusFilter !== 'all' || healthFilter !== 'all' || typeFilter !== 'all' || activeKpiFilter !== 'all') && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                                setSearchQuery('')
                                setStatusFilter('all')
                                setHealthFilter('all')
                                setTypeFilter('all')
                                setActiveKpiFilter('all')
                            }}
                            className="h-9 text-xs font-bold text-muted-foreground hover:text-foreground"
                        >
                            Reset
                        </Button>
                    )}

                    {/* View Switcher (Grid | Kanban | List) */}
                    <div className="flex bg-muted rounded-lg p-1 border border-border/40">
                        <Button
                            variant={view === 'grid' ? 'secondary' : 'ghost'}
                            size="sm"
                            onClick={() => setView('grid')}
                            className="h-7 px-2 text-xs font-semibold gap-1"
                            title="Grid View"
                        >
                            <LayoutGrid className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">Grid</span>
                        </Button>
                        <Button
                            variant={view === 'kanban' ? 'secondary' : 'ghost'}
                            size="sm"
                            onClick={() => setView('kanban')}
                            className="h-7 px-2 text-xs font-semibold gap-1"
                            title="Kanban Board View"
                        >
                            <Kanban className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">Kanban</span>
                        </Button>
                        <Button
                            variant={view === 'list' ? 'secondary' : 'ghost'}
                            size="sm"
                            onClick={() => setView('list')}
                            className="h-7 px-2 text-xs font-semibold gap-1"
                            title="List View"
                        >
                            <ListIcon className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">List</span>
                        </Button>
                    </div>
                </div>
            </div>

            {/* Empty State */}
            {filteredProjects.length === 0 && (
                <div className="text-center py-16 bg-card rounded-2xl border border-dashed border-border/80">
                    <Briefcase className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
                    <h3 className="text-base font-bold text-foreground">No projects found</h3>
                    <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto font-medium">
                        Try adjusting your search terms or filters to find what you are looking for.
                    </p>
                    <Button 
                        variant="outline" 
                        size="sm" 
                        className="mt-4 text-xs font-bold"
                        onClick={() => {
                            setSearchQuery('')
                            setHealthFilter('all')
                            setTypeFilter('all')
                            setActiveKpiFilter('all')
                        }}
                    >
                        Clear All Filters
                    </Button>
                </div>
            )}

            {/* VIEW 1: GRID CARDS VIEW */}
            {view === 'grid' && filteredProjects.length > 0 && (
                <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                    {filteredProjects.map((project) => {
                        const projectId = project.id || project._id || ''
                        const client = clients.find(c => c.id === project.clientId)
                        const health = project.health || 'green'
                        const isUpdating = updatingId === projectId

                        // Deadline calculation
                        const dueDate = project.dueDate || project.deadline
                        const isPastDue = dueDate && new Date(dueDate) < new Date() && project.status !== 'completed'

                        return (
                            <Card 
                                key={projectId} 
                                className={`group hover:shadow-lg transition-all border-border/60 bg-card hover:border-primary/40 flex flex-col justify-between relative overflow-hidden ${
                                    isUpdating ? 'opacity-50 pointer-events-none' : ''
                                }`}
                            >
                                {/* Top Color Strip based on Health */}
                                <div className={`h-1.5 w-full ${
                                    health === 'green' ? 'bg-emerald-500' :
                                    health === 'yellow' ? 'bg-amber-500' :
                                    health === 'red' ? 'bg-red-500' : 'bg-blue-500'
                                }`} />

                                <CardHeader className="pb-3 pt-4">
                                    <div className="flex justify-between items-start gap-2">
                                        <div className="space-y-1 pr-2">
                                            <div className="flex items-center gap-2">
                                                {/* Health Dot */}
                                                <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                                                    health === 'green' ? 'bg-emerald-500 shadow-sm shadow-emerald-500' :
                                                    health === 'yellow' ? 'bg-amber-500 animate-pulse' :
                                                    health === 'red' ? 'bg-red-500 animate-pulse' : 'bg-blue-500'
                                                }`} title={`Health: ${health}`} />

                                                <CardTitle 
                                                    className="text-base font-bold text-foreground group-hover:text-primary transition-colors line-clamp-1 cursor-pointer"
                                                    onClick={() => navigate(`/projects/${projectId}`)}
                                                >
                                                    {project.name}
                                                </CardTitle>
                                            </div>
                                            <p className="text-xs text-muted-foreground font-semibold line-clamp-1">
                                                Client: {client?.company || client?.name || 'Unassigned'}
                                            </p>
                                        </div>

                                        {/* Actions Menu */}
                                        <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                                            <Badge variant="outline" className="text-[10px] font-black uppercase tracking-wider text-primary border-primary/30">
                                                {project.type || 'Custom'}
                                            </Badge>

                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 rounded-lg hover:bg-accent">
                                                        <MoreVertical className="h-4 w-4 text-muted-foreground" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="w-48 text-xs font-semibold">
                                                    <DropdownMenuItem onClick={() => navigate(`/projects/${projectId}`)}>
                                                        <Eye className="mr-2 h-3.5 w-3.5 text-primary" /> View Details
                                                    </DropdownMenuItem>

                                                    <DropdownMenuSub>
                                                        <DropdownMenuSubTrigger>
                                                            <Play className="mr-2 h-3.5 w-3.5 text-blue-500" /> Change Status
                                                        </DropdownMenuSubTrigger>
                                                        <DropdownMenuSubContent>
                                                            {STATUS_OPTIONS.map(st => (
                                                                <DropdownMenuItem key={st.value} onClick={() => handleQuickUpdate(projectId, { status: st.value })}>
                                                                    <st.icon className="mr-2 h-3.5 w-3.5 text-muted-foreground" /> {st.label}
                                                                </DropdownMenuItem>
                                                            ))}
                                                        </DropdownMenuSubContent>
                                                    </DropdownMenuSub>

                                                    <DropdownMenuSub>
                                                        <DropdownMenuSubTrigger>
                                                            <ShieldAlert className="mr-2 h-3.5 w-3.5 text-amber-500" /> Set Health
                                                        </DropdownMenuSubTrigger>
                                                        <DropdownMenuSubContent>
                                                            {HEALTH_OPTIONS.map(h => (
                                                                <DropdownMenuItem key={h.value} onClick={() => handleQuickUpdate(projectId, { health: h.value })}>
                                                                    {h.label}
                                                                </DropdownMenuItem>
                                                            ))}
                                                        </DropdownMenuSubContent>
                                                    </DropdownMenuSub>

                                                    <DropdownMenuItem onClick={() => navigate(`/projects/${projectId}/edit`)}>
                                                        <Edit className="mr-2 h-3.5 w-3.5 text-muted-foreground" /> Edit Project
                                                    </DropdownMenuItem>

                                                    {canDelete('projects') && (
                                                        <>
                                                            <DropdownMenuSeparator />
                                                            <DropdownMenuItem onClick={() => handleDeleteProject(projectId, project.name)} className="text-red-600 focus:text-red-600">
                                                                <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete Project
                                                            </DropdownMenuItem>
                                                        </>
                                                    )}
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    </div>
                                </CardHeader>

                                <CardContent className="space-y-4 pt-0">
                                    {/* Progress */}
                                    <div>
                                        <div className="flex justify-between text-xs mb-1.5 font-bold">
                                            <span className="text-muted-foreground">Progress</span>
                                            <span className="text-primary">{project.progress || 0}%</span>
                                        </div>
                                        <Progress value={project.progress || 0} className="h-2 rounded-full" />
                                    </div>

                                    {/* Status Badge & Milestone indicator */}
                                    <div className="flex items-center justify-between text-xs font-semibold gap-2">
                                        <Badge variant="secondary" className={`text-[10px] font-bold uppercase border ${
                                            STATUS_OPTIONS.find(s => s.value === project.status)?.color || 'bg-muted'
                                        }`}>
                                            {STATUS_OPTIONS.find(s => s.value === project.status)?.label || project.status}
                                        </Badge>

                                        {project.milestones && project.milestones.length > 0 && (
                                            <span className="text-[10px] text-muted-foreground font-semibold">
                                                {project.milestones.filter(m => m.completed).length} / {project.milestones.length} Milestones
                                            </span>
                                        )}
                                    </div>

                                    {/* Deliverable Pills */}
                                    <div className="flex flex-wrap gap-1.5">
                                        {project.websiteRequired && (
                                            <Badge variant="outline" className="text-[9px] font-bold flex items-center gap-1 bg-blue-500/5 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-950">
                                                <Globe className="h-3 w-3" /> Web: {project.websiteStatus || 'Dev'}
                                            </Badge>
                                        )}
                                        {project.androidRequired && (
                                            <Badge variant="outline" className="text-[9px] font-bold flex items-center gap-1 bg-emerald-500/5 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-950">
                                                <Smartphone className="h-3 w-3" /> Android: {project.androidStatus || 'Dev'}
                                            </Badge>
                                        )}
                                        {project.iosRequired && (
                                            <Badge variant="outline" className="text-[9px] font-bold flex items-center gap-1 bg-purple-500/5 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-950">
                                                <Smartphone className="h-3 w-3" /> iOS: {project.iosStatus || 'Dev'}
                                            </Badge>
                                        )}
                                    </div>

                                    {/* Footer Details */}
                                    <div className="grid grid-cols-2 gap-2 text-xs pt-3 border-t border-border/40 font-medium">
                                        <div>
                                            <p className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider">Budget</p>
                                            <p className="font-extrabold text-foreground">{formatCurrency(project.budget)}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider">Deadline</p>
                                            <p className={`font-bold ${isPastDue ? 'text-red-600 dark:text-red-400' : 'text-foreground'}`}>
                                                {formatDate(dueDate)}
                                                {isPastDue && <span className="text-[9px] block text-red-500 font-bold">Overdue</span>}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Open Details Button */}
                                    <Button 
                                        variant="outline" 
                                        size="sm" 
                                        onClick={() => navigate(`/projects/${projectId}`)} 
                                        className="w-full text-xs font-bold h-8 border-border/60 hover:bg-primary hover:text-white transition-colors gap-1 mt-1"
                                    >
                                        Open Project Dashboard <ArrowUpRight className="h-3.5 w-3.5" />
                                    </Button>
                                </CardContent>
                            </Card>
                        )
                    })}
                </div>
            )}

            {/* VIEW 2: KANBAN BOARD VIEW */}
            {view === 'kanban' && filteredProjects.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 overflow-x-auto pb-4">
                    {STATUS_OPTIONS.map((col) => {
                        const colProjects = filteredProjects.filter(p => p.status === col.value)
                        const ColIcon = col.icon

                        return (
                            <div key={col.value} className="bg-muted/40 p-3 rounded-2xl border border-border/60 flex flex-col min-w-[260px]">
                                {/* Column Header */}
                                <div className="flex items-center justify-between mb-3 px-1">
                                    <div className="flex items-center gap-2">
                                        <div className="p-1.5 rounded-lg bg-card text-foreground shadow-xs">
                                            <ColIcon className="h-4 w-4 text-primary" />
                                        </div>
                                        <span className="font-bold text-xs text-foreground uppercase tracking-wider">{col.label}</span>
                                    </div>
                                    <Badge variant="secondary" className="font-bold text-[10px]">
                                        {colProjects.length}
                                    </Badge>
                                </div>

                                {/* Column Cards */}
                                <div className="space-y-3 flex-1 overflow-y-auto max-h-[70vh] pr-1">
                                    {colProjects.length === 0 ? (
                                        <div className="text-center py-8 border border-dashed border-border/40 rounded-xl text-muted-foreground text-xs font-medium">
                                            No projects
                                        </div>
                                    ) : (
                                        colProjects.map(p => {
                                            const pid = p.id || p._id || ''
                                            const client = clients.find(c => c.id === p.clientId)
                                            return (
                                                <div 
                                                    key={pid}
                                                    onClick={() => navigate(`/projects/${pid}`)}
                                                    className="bg-card p-3.5 rounded-xl border border-border/60 hover:border-primary/50 shadow-xs hover:shadow-md transition-all cursor-pointer space-y-2.5"
                                                >
                                                    <div className="flex justify-between items-start gap-1">
                                                        <h4 className="font-bold text-xs text-foreground hover:text-primary transition-colors line-clamp-1">
                                                            {p.name}
                                                        </h4>
                                                        <span className={`w-2 h-2 rounded-full shrink-0 ${
                                                            p.health === 'green' ? 'bg-emerald-500' :
                                                            p.health === 'yellow' ? 'bg-amber-500' :
                                                            p.health === 'red' ? 'bg-red-500' : 'bg-blue-500'
                                                        }`} />
                                                    </div>

                                                    <p className="text-[10px] text-muted-foreground font-semibold truncate">
                                                        {client?.company || client?.name || 'Client'}
                                                    </p>

                                                    <div className="space-y-1">
                                                        <div className="flex justify-between text-[10px] font-bold text-muted-foreground">
                                                            <span>Progress</span>
                                                            <span>{p.progress || 0}%</span>
                                                        </div>
                                                        <Progress value={p.progress || 0} className="h-1.5" />
                                                    </div>

                                                    <div className="flex items-center justify-between text-[10px] pt-1 font-bold">
                                                        <span className="text-foreground">{formatCurrency(p.budget)}</span>
                                                        <span className="text-muted-foreground">{formatDate(p.dueDate || p.deadline)}</span>
                                                    </div>
                                                </div>
                                            )
                                        })
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}

            {/* VIEW 3: LIST TABLE VIEW */}
            {view === 'list' && filteredProjects.length > 0 && (
                <div className="bg-card border border-border/60 rounded-2xl overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-muted/40 text-[11px] uppercase font-bold tracking-wider text-muted-foreground border-b border-border/40">
                                <tr>
                                    <th className="px-5 py-3.5">Project & Client</th>
                                    <th className="px-5 py-3.5">Status</th>
                                    <th className="px-5 py-3.5">Health</th>
                                    <th className="px-5 py-3.5">Progress</th>
                                    <th className="px-5 py-3.5">Deliverables</th>
                                    <th className="px-5 py-3.5">Budget</th>
                                    <th className="px-5 py-3.5 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/30 text-xs font-medium">
                                {filteredProjects.map((p) => {
                                    const pid = p.id || p._id || ''
                                    const client = clients.find(c => c.id === p.clientId)
                                    const health = p.health || 'green'

                                    return (
                                        <tr 
                                            key={pid} 
                                            className="hover:bg-muted/30 transition-colors cursor-pointer" 
                                            onClick={() => navigate(`/projects/${pid}`)}
                                        >
                                            <td className="px-5 py-3.5">
                                                <div className="font-bold text-sm text-foreground hover:text-primary transition-colors">
                                                    {p.name}
                                                </div>
                                                <div className="text-muted-foreground text-[11px]">
                                                    {client?.company || client?.name || 'Client'} • <span className="font-semibold text-primary">{p.type || 'Custom'}</span>
                                                </div>
                                            </td>
                                            
                                            {/* Status Dropdown / Badge */}
                                            <td className="px-5 py-3.5" onClick={(e) => e.stopPropagation()}>
                                                <Select value={p.status} onValueChange={(val: any) => handleQuickUpdate(pid, { status: val })}>
                                                    <SelectTrigger className="h-7 w-[130px] text-[11px] font-bold border-border/60 bg-card">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {STATUS_OPTIONS.map(s => (
                                                            <SelectItem key={s.value} value={s.value} className="text-xs font-semibold">
                                                                {s.label}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </td>

                                            {/* Health Badge */}
                                            <td className="px-5 py-3.5" onClick={(e) => e.stopPropagation()}>
                                                <Select value={health} onValueChange={(val: any) => handleQuickUpdate(pid, { health: val })}>
                                                    <SelectTrigger className="h-7 w-[120px] text-[11px] font-bold border-border/60 bg-card">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {HEALTH_OPTIONS.map(h => (
                                                            <SelectItem key={h.value} value={h.value} className="text-xs font-semibold">
                                                                {h.label}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </td>

                                            {/* Progress */}
                                            <td className="px-5 py-3.5">
                                                <div className="w-32 space-y-1">
                                                    <div className="flex justify-between text-[10px] font-bold">
                                                        <span className="text-primary">{p.progress || 0}%</span>
                                                    </div>
                                                    <Progress value={p.progress || 0} className="h-1.5" />
                                                </div>
                                            </td>

                                            {/* Deliverables Icons */}
                                            <td className="px-5 py-3.5">
                                                <div className="flex items-center gap-1.5">
                                                    {p.websiteRequired && (
                                                        <span title={`Web: ${p.websiteStatus || 'Dev'}`} className="p-1 rounded bg-blue-500/10 text-blue-600">
                                                            <Globe className="h-3.5 w-3.5" />
                                                        </span>
                                                    )}
                                                    {p.androidRequired && (
                                                        <span title={`Android: ${p.androidStatus || 'Dev'}`} className="p-1 rounded bg-emerald-500/10 text-emerald-600">
                                                            <Smartphone className="h-3.5 w-3.5" />
                                                        </span>
                                                    )}
                                                    {p.iosRequired && (
                                                        <span title={`iOS: ${p.iosStatus || 'Dev'}`} className="p-1 rounded bg-purple-500/10 text-purple-600">
                                                            <Smartphone className="h-3.5 w-3.5" />
                                                        </span>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Budget */}
                                            <td className="px-5 py-3.5 font-bold text-foreground">
                                                {formatCurrency(p.budget)}
                                            </td>

                                            {/* Actions */}
                                            <td className="px-5 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                                                <div className="flex items-center justify-end gap-1">
                                                    <Button 
                                                        size="sm" 
                                                        variant="ghost" 
                                                        onClick={() => navigate(`/projects/${pid}`)}
                                                        className="h-7 w-7 p-0"
                                                        title="View Project"
                                                    >
                                                        <ArrowUpRight className="h-4 w-4" />
                                                    </Button>
                                                    {canDelete('projects') && (
                                                        <Button 
                                                            size="sm" 
                                                            variant="ghost" 
                                                            onClick={() => handleDeleteProject(pid, p.name)}
                                                            className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                                            title="Delete Project"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    )
}

export default ProjectsPage
