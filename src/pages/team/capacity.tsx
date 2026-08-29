import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '@/lib/api-client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import {
    Users, ShieldAlert, CheckCircle2, AlertTriangle, Search,
    Flame, Sparkles, Filter, ArrowUpRight, CheckSquare, Clock, Calendar, BarChart3, RefreshCw
} from 'lucide-react'
import { getInitials } from '@/lib/utils'

interface MemberCapacity {
    user: {
        id: string
        name: string
        email: string
        role: string
        avatar?: string
        designation?: string
        department?: string
    }
    stats: {
        totalTasks: number
        activeTasks: number
        todo: number
        inProgress: number
        review: number
        done: number
        overdue: number
        loadScore: number
        status: 'available' | 'optimal' | 'healthy' | 'overloaded'
    }
    tasks: Array<{
        id: string
        title: string
        status: string
        priority: string
        dueDate?: string
        projectName: string
    }>
}

export function ResourceCapacityPage() {
    const navigate = useNavigate()
    const [data, setData] = useState<MemberCapacity[]>([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')
    const [statusFilter, setStatusFilter] = useState<string>('all')

    const fetchCapacity = async () => {
        setLoading(true)
        try {
            const res = await api.get('/tasks/capacity')
            setData(res.data || [])
        } catch (err) {
            console.error('Failed to load capacity data', err)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchCapacity()
    }, [])

    const filteredData = data.filter(item => {
        const matchesSearch = item.user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (item.user.designation || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (item.user.department || '').toLowerCase().includes(searchQuery.toLowerCase())

        if (statusFilter === 'all') return matchesSearch
        return matchesSearch && item.stats.status === statusFilter
    })

    const totalMembers = data.length
    const overloadedCount = data.filter(d => d.stats.status === 'overloaded').length
    const optimalCount = data.filter(d => d.stats.status === 'optimal' || d.stats.status === 'healthy').length
    const availableCount = data.filter(d => d.stats.status === 'available').length
    const totalOverdue = data.reduce((sum, d) => sum + d.stats.overdue, 0)

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'overloaded':
                return <Badge className="bg-rose-500/10 text-rose-600 border-rose-200 hover:bg-rose-500/20 font-black uppercase text-[10px]"><Flame className="w-3 h-3 mr-1" /> Overloaded</Badge>
            case 'optimal':
            case 'healthy':
                return <Badge className="bg-blue-500/10 text-blue-600 border-blue-200 hover:bg-blue-500/20 font-black uppercase text-[10px]"><CheckCircle2 className="w-3 h-3 mr-1" /> Optimal</Badge>
            case 'available':
            default:
                return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-200 hover:bg-emerald-500/20 font-black uppercase text-[10px]"><Sparkles className="w-3 h-3 mr-1" /> Available</Badge>
        }
    }

    const getProgressBarColor = (loadScore: number, status: string) => {
        if (status === 'overloaded' || loadScore >= 85) return 'bg-rose-500'
        if (loadScore >= 50) return 'bg-blue-600'
        return 'bg-emerald-500'
    }

    return (
        <div className="space-y-6 pb-12">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground flex items-center gap-3">
                        <div className="p-2.5 bg-primary/10 rounded-2xl text-primary">
                            <BarChart3 className="h-6 w-6" />
                        </div>
                        Resource Capacity & Workload
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Monitor team workload balance, identify bottlenecks, and reassign tasks in real-time.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Button variant="outline" size="sm" onClick={fetchCapacity} disabled={loading} className="rounded-xl">
                        <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> Refresh
                    </Button>
                    <Button onClick={() => navigate('/tasks')} className="rounded-xl font-bold">
                        <CheckSquare className="h-4 w-4 mr-2" /> Task Board
                    </Button>
                </div>
            </div>

            {/* KPI Metric Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <Card className="rounded-2xl border bg-card/60 backdrop-blur-sm">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Total Team</p>
                            <h3 className="text-2xl font-black mt-1 text-foreground">{totalMembers}</h3>
                        </div>
                        <div className="p-3 bg-primary/10 rounded-xl text-primary">
                            <Users className="h-5 w-5" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="rounded-2xl border bg-card/60 backdrop-blur-sm">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Optimal Load</p>
                            <h3 className="text-2xl font-black mt-1 text-blue-600">{optimalCount}</h3>
                        </div>
                        <div className="p-3 bg-blue-500/10 rounded-xl text-blue-600">
                            <CheckCircle2 className="h-5 w-5" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="rounded-2xl border bg-card/60 backdrop-blur-sm">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Available Capacity</p>
                            <h3 className="text-2xl font-black mt-1 text-emerald-600">{availableCount}</h3>
                        </div>
                        <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-600">
                            <Sparkles className="h-5 w-5" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="rounded-2xl border bg-card/60 backdrop-blur-sm">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Overloaded</p>
                            <h3 className="text-2xl font-black mt-1 text-rose-600">{overloadedCount}</h3>
                        </div>
                        <div className="p-3 bg-rose-500/10 rounded-xl text-rose-600">
                            <Flame className="h-5 w-5" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="rounded-2xl border bg-card/60 backdrop-blur-sm">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Total Overdue</p>
                            <h3 className="text-2xl font-black mt-1 text-amber-600">{totalOverdue}</h3>
                        </div>
                        <div className="p-3 bg-amber-500/10 rounded-xl text-amber-600">
                            <AlertTriangle className="h-5 w-5" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Filter & Search Toolbar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-muted/40 p-3 rounded-2xl border">
                <div className="relative w-full sm:w-80">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search member, role, department..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 bg-background/80 rounded-xl border-none text-xs sm:text-sm"
                    />
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
                    {['all', 'overloaded', 'optimal', 'available'].map((f) => (
                        <button
                            key={f}
                            onClick={() => setStatusFilter(f)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition-all whitespace-nowrap ${statusFilter === f
                                ? 'bg-primary text-primary-foreground shadow-sm'
                                : 'bg-background hover:bg-muted text-muted-foreground'
                                }`}
                        >
                            {f}
                        </button>
                    ))}
                </div>
            </div>

            {/* Team Capacity List */}
            {loading ? (
                <div className="p-12 text-center text-muted-foreground animate-pulse">
                    Calculating team capacity metrics...
                </div>
            ) : filteredData.length === 0 ? (
                <Card className="p-12 text-center text-muted-foreground rounded-2xl">
                    <Users className="h-10 w-10 mx-auto mb-3 opacity-30" />
                    <p className="font-bold">No team members match your criteria</p>
                </Card>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {filteredData.map(item => (
                        <Card key={item.user.id} className="rounded-2xl border bg-card/60 backdrop-blur-sm hover:shadow-lg transition-all duration-300">
                            <CardHeader className="pb-3">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex items-center gap-3">
                                        <Avatar className="h-12 w-12 border-2 border-primary/20">
                                            <AvatarImage src={item.user.avatar} />
                                            <AvatarFallback className="font-bold">{getInitials(item.user.name)}</AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                                                {item.user.name}
                                                <Badge variant="outline" className="text-[10px] capitalize font-medium">{item.user.role}</Badge>
                                            </h3>
                                            <p className="text-xs text-muted-foreground">{item.user.designation || 'Specialist'} {item.user.department ? `• ${item.user.department}` : ''}</p>
                                        </div>
                                    </div>
                                    <div>
                                        {getStatusBadge(item.stats.status)}
                                    </div>
                                </div>
                            </CardHeader>

                            <CardContent className="space-y-4">
                                {/* Load Score Bar */}
                                <div className="space-y-1.5">
                                    <div className="flex items-center justify-between text-xs font-bold">
                                        <span className="text-muted-foreground uppercase text-[10px] tracking-wider">Capacity Load</span>
                                        <span className={item.stats.loadScore > 85 ? 'text-rose-600' : item.stats.loadScore >= 50 ? 'text-blue-600' : 'text-emerald-600'}>
                                            {item.stats.loadScore}% ({item.stats.activeTasks} active tasks)
                                        </span>
                                    </div>
                                    <div className="h-2.5 w-full bg-muted rounded-full overflow-hidden">
                                        <div
                                            className={`h-full rounded-full transition-all duration-500 ${getProgressBarColor(item.stats.loadScore, item.stats.status)}`}
                                            style={{ width: `${Math.min(100, Math.max(5, item.stats.loadScore))}%` }}
                                        />
                                    </div>
                                </div>

                                {/* Task Micro Stats */}
                                <div className="grid grid-cols-4 gap-2 pt-2 border-t border-dashed">
                                    <div className="p-2 rounded-xl bg-muted/40 text-center">
                                        <p className="text-[10px] font-bold text-muted-foreground uppercase">To Do</p>
                                        <p className="text-sm font-black mt-0.5">{item.stats.todo}</p>
                                    </div>
                                    <div className="p-2 rounded-xl bg-blue-500/10 text-center text-blue-600">
                                        <p className="text-[10px] font-bold uppercase">In Progress</p>
                                        <p className="text-sm font-black mt-0.5">{item.stats.inProgress}</p>
                                    </div>
                                    <div className="p-2 rounded-xl bg-amber-500/10 text-center text-amber-600">
                                        <p className="text-[10px] font-bold uppercase">Review</p>
                                        <p className="text-sm font-black mt-0.5">{item.stats.review}</p>
                                    </div>
                                    <div className="p-2 rounded-xl bg-emerald-500/10 text-center text-emerald-600">
                                        <p className="text-[10px] font-bold uppercase">Done</p>
                                        <p className="text-sm font-black mt-0.5">{item.stats.done}</p>
                                    </div>
                                </div>

                                {/* Active Assigned Task Preview */}
                                {item.tasks.length > 0 && (
                                    <div className="space-y-1.5 pt-2 border-t border-dashed">
                                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                                            <span>Current Active Queue</span>
                                            <span>{item.tasks.length} tasks</span>
                                        </p>
                                        <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                                            {item.tasks.slice(0, 4).map(task => (
                                                <div key={task.id} className="p-2 rounded-xl bg-background/80 border text-xs flex items-center justify-between gap-2 hover:border-primary/40 transition-colors">
                                                    <div className="truncate flex-1">
                                                        <span className="font-semibold text-foreground">{task.title}</span>
                                                        <span className="text-[10px] text-muted-foreground ml-2">({task.projectName})</span>
                                                    </div>
                                                    {task.dueDate && (
                                                        <span className={`text-[10px] font-bold flex items-center gap-1 ${new Date(task.dueDate) < new Date() ? 'text-rose-600' : 'text-muted-foreground'}`}>
                                                            <Clock className="w-2.5 h-2.5" />
                                                            {new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                                        </span>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    )
}
