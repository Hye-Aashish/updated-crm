import { useState, useEffect } from 'react'
import { Plus, Search, LayoutGrid, List as ListIcon, Briefcase, CheckSquare, AlertTriangle, Layers, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '@/store'
import { formatCurrency, formatDate } from '@/lib/utils'
import { ProjectService } from '@/lib/services/project.service'
import { ClientService } from '@/lib/services/client.service'
import { StatsCard } from '@/components/stats-card'

export function ProjectsPage() {
    const navigate = useNavigate()
    const [view, setView] = useState<'grid' | 'list'>('grid')
    const [loading, setLoading] = useState(true)
    const { projects, clients, invoices, currentUser, setProjects, setClients } = useAppStore()

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

    // --- Date Filter Logic ---
    const today = new Date()
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0)

    const formatDateForInput = (d: Date) => d.toISOString().split('T')[0]

    const [dateRange, setDateRange] = useState({
        start: formatDateForInput(startOfMonth),
        end: formatDateForInput(endOfMonth)
    })

    const handleDateChange = (key: 'start' | 'end', value: string) => {
        setDateRange(prev => ({ ...prev, [key]: value }))
    }

    const isDateInFilter = (dateStr: Date) => {
        if (!dateStr) return false
        const date = new Date(dateStr)
        const start = new Date(dateRange.start)
        const end = new Date(dateRange.end)
        end.setHours(23, 59, 59, 999)
        return date >= start && date <= end
    }

    // --- KPI Calculations (Filtered) ---
    const filteredProjects = projects.filter(p => isDateInFilter(p.startDate))
    const totalProjects = filteredProjects.length
    const activeProjects = filteredProjects.filter(p => p.status === 'in-progress').length
    const completedProjects = filteredProjects.filter(p => p.status === 'completed').length
    const delayedProjects = filteredProjects.filter(p => {
        if (p.status === 'completed') return false
        return new Date(p.dueDate) < new Date()
    }).length

    if (loading && projects.length === 0) {
        return <div className="flex items-center justify-center h-full">Loading...</div>
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Projects</h1>
                    <p className="text-sm text-muted-foreground mt-1">Manage and track all ongoing projects.</p>
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <div className="flex items-center gap-2 bg-muted/40 p-2 rounded-lg border overflow-x-auto whitespace-nowrap">
                        <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                        <Input
                            type="date"
                            className="h-8 w-[130px] bg-background border-none shadow-none text-xs md:text-sm p-1"
                            value={dateRange.start}
                            onChange={(e) => handleDateChange('start', e.target.value)}
                        />
                        <span className="text-muted-foreground text-xs">-</span>
                        <Input
                            type="date"
                            className="h-8 w-[130px] bg-background border-none shadow-none text-xs md:text-sm p-1"
                            value={dateRange.end}
                            onChange={(e) => handleDateChange('end', e.target.value)}
                        />
                    </div>
                    {['owner', 'admin', 'pm'].includes(currentUser?.role || '') && (
                        <Button onClick={() => navigate('/projects/new')} className="h-10">
                            <Plus className="mr-1 h-4 w-4" /> New Project
                        </Button>
                    )}
                </div>
            </div>

            {/* --- Module Specific KPIs --- */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatsCard title="Total Projects" value={totalProjects} icon={Briefcase} color="#8b5cf6" bg="bg-purple-50" />
                <StatsCard title="Active" value={activeProjects} icon={Layers} color="#0ea5e9" bg="bg-sky-50" />
                <StatsCard title="Completed" value={completedProjects} icon={CheckSquare} color="#22c55e" bg="bg-green-50" />
                <StatsCard title="Delayed" value={delayedProjects} icon={AlertTriangle} color="#ef4444" bg="bg-red-50" />
            </div>

            {/* --- Filters & Search --- */}
            <div className="flex items-center gap-4">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input placeholder="Search projects..." className="pl-10" />
                </div>
                <div className="flex bg-muted rounded-md p-1">
                    <Button
                        variant={view === 'grid' ? 'secondary' : 'ghost'}
                        size="sm"
                        onClick={() => setView('grid')}
                    >
                        <LayoutGrid className="h-4 w-4" />
                    </Button>
                    <Button
                        variant={view === 'list' ? 'secondary' : 'ghost'}
                        size="sm"
                        onClick={() => setView('list')}
                    >
                        <ListIcon className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* --- Projects Grid --- */}
            <div className={view === 'grid' ? 'grid gap-6 md:grid-cols-2 lg:grid-cols-3' : 'space-y-4'}>
                {projects.map((project) => {
                    const client = clients.find((c) => c.id === project.clientId)
                    return (
                        <Card key={project.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate(`/projects/${project.id}`)}>
                            <CardHeader className="pb-3">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <CardTitle className="text-base font-semibold">{project.name}</CardTitle>
                                        <p className="text-sm text-muted-foreground mt-1">{client?.company || 'Unknown Client'}</p>
                                    </div>
                                    <Badge variant={project.status === 'completed' ? 'default' : 'secondary'} className="capitalize">
                                        {project.status}
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    <div>
                                        <div className="flex justify-between text-sm mb-2">
                                            <span className="text-muted-foreground">Progress</span>
                                            <span className="font-medium">{project.progress || 0}%</span>
                                        </div>
                                        <Progress value={project.progress || 0} className="h-2" />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        {['owner', 'pm', 'client'].includes(currentUser?.role) ? (
                                            <>
                                                <div>
                                                    <p className="text-muted-foreground text-xs">Budget</p>
                                                    <p className="font-medium">{formatCurrency(project.budget)}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-muted-foreground text-xs">Paid</p>
                                                    <p className="font-medium text-emerald-600">
                                                        {formatCurrency((invoices || []).filter(i => i.projectId === project.id && i.status === 'paid').reduce((sum, i) => sum + (i.total || 0), 0))}
                                                    </p>
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <div>
                                                    <p className="text-muted-foreground text-xs">Start Date</p>
                                                    <p className="font-medium">{formatDate(project.startDate)}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-muted-foreground text-xs">Deadline</p>
                                                    <p className="font-medium">{formatDate(project.dueDate)}</p>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )
                })}
            </div>
        </div>
    )
}

