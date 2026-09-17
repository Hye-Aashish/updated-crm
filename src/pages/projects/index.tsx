import { useState, useEffect } from 'react'
import { Plus, Search, LayoutGrid, List as ListIcon, Briefcase, CheckSquare, AlertTriangle, Layers, Globe, Smartphone, Clock, FileCode, ArrowUpRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '@/store'
import { usePermissions } from '@/hooks/use-permissions'
import { formatCurrency, formatDate } from '@/lib/utils'
import { ProjectService } from '@/lib/services/project.service'
import { ClientService } from '@/lib/services/client.service'
import { StatsCard } from '@/components/stats-card'
import { PageSkeleton } from '@/components/ui/page-skeleton'

export function ProjectsPage() {
    const navigate = useNavigate()
    const { canCreate } = usePermissions()
    const [view, setView] = useState<'grid' | 'list'>('grid')
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')
    const [healthFilter, setHealthFilter] = useState<string>('all')
    const [typeFilter, setTypeFilter] = useState<string>('all')
    const { projects, clients, setProjects, setClients } = useAppStore()

    // Fetch Projects & Clients from API
    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true)
                const [backendProjects, backendClients] = await Promise.all([
                    ProjectService.getAll(),
                    ClientService.getAll()
                ])
                setProjects(backendProjects)
                setClients(backendClients)
            } catch (error) {
                console.error("Failed to fetch data from API:", error)
            } finally {
                setLoading(false)
            }
        }
        fetchData()
    }, [setProjects, setClients])

    // Metrics Calculations
    const totalProjects = projects.length
    const activeProjects = projects.filter(p => ['in-progress', 'planning', 'on-hold'].includes(p.status)).length
    const completedProjects = projects.filter(p => p.status === 'completed').length
    const delayedProjects = projects.filter(p => p.health === 'red' || (p.dueDate && new Date(p.dueDate) < new Date() && p.status !== 'completed')).length
    const atRiskProjects = projects.filter(p => p.health === 'yellow').length
    
    const websitesLive = projects.filter(p => p.websiteStatus === 'live' || !!p.websiteUrl).length

    // Filter Logic
    const filteredProjects = projects.filter(p => {
        const matchesSearch = !searchQuery || 
            p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
            p.type?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            clients.find(c => c.id === p.clientId)?.company.toLowerCase().includes(searchQuery.toLowerCase())
        
        const matchesHealth = healthFilter === 'all' || p.health === healthFilter
        const matchesType = typeFilter === 'all' || p.type === typeFilter

        return matchesSearch && matchesHealth && matchesType
    })

    if (loading && projects.length === 0) {
        return <PageSkeleton />
    }

    return (
        <div className="space-y-6 font-sans pb-10">
            {/* Page Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">Project Management Dashboard</h1>
                    <p className="text-sm text-muted-foreground mt-1 font-medium">Track development progress, automated checkpoints, health indicators, and live deliverables.</p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => navigate('/projects/developer-dashboard')} className="h-9 font-bold text-xs">
                        <FileCode className="mr-1.5 h-4 w-4 text-primary" /> Developer Workspace
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => navigate('/projects/templates')} className="h-9 font-bold text-xs">
                        <Layers className="mr-1.5 h-4 w-4 text-primary" /> Templates Engine
                    </Button>
                    {canCreate('projects') && (
                        <Button onClick={() => navigate('/projects/new')} className="h-9 font-bold text-xs">
                            <Plus className="mr-1.5 h-4 w-4" /> New Project
                        </Button>
                    )}
                </div>
            </div>

            {/* Comprehensive SaaS Dashboard KPIs */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <StatsCard title="Total Projects" value={totalProjects} icon={Briefcase} color="#8b5cf6" bg="bg-purple-50 dark:bg-purple-950/20" />
                <StatsCard title="Active Projects" value={activeProjects} icon={Layers} color="#0ea5e9" bg="bg-sky-50 dark:bg-sky-950/20" />
                <StatsCard title="Completed" value={completedProjects} icon={CheckSquare} color="#22c55e" bg="bg-green-50 dark:bg-green-950/20" />
                <StatsCard title="Delayed (Red)" value={delayedProjects} icon={AlertTriangle} color="#ef4444" bg="bg-red-50 dark:bg-red-950/20" />
                <StatsCard title="At Risk (Yellow)" value={atRiskProjects} icon={Clock} color="#eab308" bg="bg-amber-50 dark:bg-amber-950/20" />
                <StatsCard title="Websites Live" value={websitesLive} icon={Globe} color="#3b82f6" bg="bg-blue-50 dark:bg-blue-950/20" />
            </div>

            {/* Filters & Search Toolbar */}
            <div className="flex flex-col sm:flex-row items-center gap-3">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search by project name, type, or client..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 h-9 text-xs rounded-lg bg-card"
                    />
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Select value={healthFilter} onValueChange={setHealthFilter}>
                        <SelectTrigger className="h-9 w-[140px] text-xs font-semibold bg-card">
                            <SelectValue placeholder="Health Filter" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all" className="text-xs font-semibold">All Health</SelectItem>
                            <SelectItem value="green" className="text-xs font-semibold text-emerald-600">🟢 On Track</SelectItem>
                            <SelectItem value="yellow" className="text-xs font-semibold text-amber-600">🟡 At Risk</SelectItem>
                            <SelectItem value="red" className="text-xs font-semibold text-red-600">🔴 Delayed</SelectItem>
                            <SelectItem value="blue" className="text-xs font-semibold text-blue-600">🔵 On Hold</SelectItem>
                            <SelectItem value="completed" className="text-xs font-semibold text-gray-600">🏁 Completed</SelectItem>
                        </SelectContent>
                    </Select>

                    <Select value={typeFilter} onValueChange={setTypeFilter}>
                        <SelectTrigger className="h-9 w-[140px] text-xs font-semibold bg-card">
                            <SelectValue placeholder="Type Filter" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all" className="text-xs font-semibold">All Types</SelectItem>
                            <SelectItem value="website" className="text-xs font-semibold">Website</SelectItem>
                            <SelectItem value="mobile-app" className="text-xs font-semibold">Mobile App</SelectItem>
                            <SelectItem value="lms" className="text-xs font-semibold">LMS</SelectItem>
                            <SelectItem value="crm-erp" className="text-xs font-semibold">CRM / ERP</SelectItem>
                            <SelectItem value="ecommerce" className="text-xs font-semibold">E-Commerce</SelectItem>
                            <SelectItem value="custom" className="text-xs font-semibold">Custom</SelectItem>
                        </SelectContent>
                    </Select>

                    <div className="flex bg-muted rounded-lg p-1 border">
                        <Button
                            variant={view === 'grid' ? 'secondary' : 'ghost'}
                            size="sm"
                            onClick={() => setView('grid')}
                            className="h-7 w-7 p-0"
                        >
                            <LayoutGrid className="h-4 w-4" />
                        </Button>
                        <Button
                            variant={view === 'list' ? 'secondary' : 'ghost'}
                            size="sm"
                            onClick={() => setView('list')}
                            className="h-7 w-7 p-0"
                        >
                            <ListIcon className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </div>

            {/* Projects Presentation */}
            {view === 'grid' ? (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {filteredProjects.map((project) => {
                        const client = clients.find((c) => c.id === project.clientId)
                        const health = project.health || 'green'

                        return (
                            <Card 
                                key={project.id || project._id} 
                                className="hover:shadow-md transition-all cursor-pointer border-border/60 bg-card hover:border-primary/50 flex flex-col justify-between"
                                onClick={() => navigate(`/projects/${project.id || project._id}`)}
                            >
                                <CardHeader className="pb-3">
                                    <div className="flex justify-between items-start gap-2">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                                                    health === 'green' ? 'bg-emerald-500' :
                                                    health === 'yellow' ? 'bg-amber-500 animate-pulse' :
                                                    health === 'red' ? 'bg-red-500 animate-pulse' :
                                                    health === 'blue' ? 'bg-blue-500' : 'bg-gray-400'
                                                }`} title={`Health: ${health}`} />
                                                <CardTitle className="text-base font-bold text-foreground hover:text-primary transition-colors line-clamp-1">
                                                    {project.name}
                                                </CardTitle>
                                            </div>
                                            <p className="text-xs text-muted-foreground font-semibold">{client?.company || client?.name || 'Client'}</p>
                                        </div>

                                        <Badge variant="outline" className="text-[9px] font-black uppercase tracking-wider text-primary border-primary/30">
                                            {project.type || 'Custom'}
                                        </Badge>
                                    </div>
                                </CardHeader>

                                <CardContent className="space-y-4 pt-0">
                                    {/* Progress Bar */}
                                    <div>
                                        <div className="flex justify-between text-xs mb-1.5 font-bold">
                                            <span className="text-muted-foreground">Completion</span>
                                            <span className="text-primary">{project.progress || 0}%</span>
                                        </div>
                                        <Progress value={project.progress || 0} className="h-2 rounded-full" />
                                    </div>

                                    {/* Deliverable Status Pills */}
                                    <div className="flex flex-wrap gap-1.5">
                                        {project.websiteRequired && (
                                            <Badge variant="secondary" className="text-[9px] font-bold flex items-center gap-1 bg-blue-500/10 text-blue-700 dark:text-blue-300">
                                                <Globe className="h-3 w-3" /> Web: {project.websiteStatus || 'Dev'}
                                            </Badge>
                                        )}
                                        {project.androidRequired && (
                                            <Badge variant="secondary" className="text-[9px] font-bold flex items-center gap-1 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                                                <Smartphone className="h-3 w-3" /> Android: {project.androidStatus || 'Dev'}
                                            </Badge>
                                        )}
                                        {project.iosRequired && (
                                            <Badge variant="secondary" className="text-[9px] font-bold flex items-center gap-1 bg-purple-500/10 text-purple-700 dark:text-purple-300">
                                                <Smartphone className="h-3 w-3" /> iOS: {project.iosStatus || 'Dev'}
                                            </Badge>
                                        )}
                                    </div>

                                    {/* Budget & Due Date */}
                                    <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-border/20 font-medium">
                                        <div>
                                            <p className="text-muted-foreground text-[10px] uppercase font-bold">Budget</p>
                                            <p className="font-bold text-foreground">{formatCurrency(project.budget)}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-muted-foreground text-[10px] uppercase font-bold">Deadline</p>
                                            <p className="font-bold text-foreground">{formatDate(project.dueDate || project.deadline)}</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )
                    })}
                </div>
            ) : (
                /* List View Table */
                <div className="bg-card border border-border/60 rounded-xl overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-muted/40 text-[11px] uppercase font-bold tracking-wider text-muted-foreground border-b border-border/40">
                                <tr>
                                    <th className="px-6 py-3.5">Project & Client</th>
                                    <th className="px-6 py-3.5">Health</th>
                                    <th className="px-6 py-3.5">Progress</th>
                                    <th className="px-6 py-3.5">Deliverables</th>
                                    <th className="px-6 py-3.5">Budget</th>
                                    <th className="px-6 py-3.5 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/30 text-xs font-medium">
                                {filteredProjects.map((p) => {
                                    const client = clients.find(c => c.id === p.clientId)
                                    const health = p.health || 'green'

                                    return (
                                        <tr key={p.id || p._id} className="hover:bg-accent/5 transition-colors cursor-pointer" onClick={() => navigate(`/projects/${p.id || p._id}`)}>
                                            <td className="px-6 py-3.5">
                                                <div className="font-bold text-sm text-foreground">{p.name}</div>
                                                <div className="text-muted-foreground">{client?.company || client?.name || 'Client'} • {p.type || 'Custom'}</div>
                                            </td>
                                            <td className="px-6 py-3.5">
                                                <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                                                    health === 'green' ? 'bg-emerald-500/10 text-emerald-600' :
                                                    health === 'yellow' ? 'bg-amber-500/10 text-amber-600' :
                                                    health === 'red' ? 'bg-red-500/10 text-red-600' : 'bg-gray-100 text-gray-600'
                                                }`}>
                                                    ● {health}
                                                </span>
                                            </td>
                                            <td className="px-6 py-3.5">
                                                <div className="w-32 space-y-1">
                                                    <div className="flex justify-between text-[10px] font-bold">
                                                        <span>{p.progress || 0}%</span>
                                                    </div>
                                                    <Progress value={p.progress || 0} className="h-1.5" />
                                                </div>
                                            </td>
                                            <td className="px-6 py-3.5">
                                                <div className="flex items-center gap-1">
                                                     {p.websiteRequired && <span title="Website"><Globe className="h-3.5 w-3.5 text-blue-500" /></span>}
                                                     {p.androidRequired && <span title="Android"><Smartphone className="h-3.5 w-3.5 text-emerald-500" /></span>}
                                                     {p.iosRequired && <span title="iOS"><Smartphone className="h-3.5 w-3.5 text-purple-500" /></span>}
                                                 </div>
                                            </td>
                                            <td className="px-6 py-3.5 font-bold text-foreground">
                                                {formatCurrency(p.budget)}
                                            </td>
                                            <td className="px-6 py-3.5 text-right">
                                                <Button size="sm" variant="ghost" className="h-7 w-7 p-0">
                                                    <ArrowUpRight className="h-4 w-4" />
                                                </Button>
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
