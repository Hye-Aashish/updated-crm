import { useState, useEffect, useMemo } from 'react'
import api from '@/lib/api-client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
    Target, Trophy, AlertTriangle, Plus, CheckCircle2, RefreshCw,
    Calendar, Trash2, Edit, Building2, User, Search, RotateCcw,
    Clock, TrendingUp, Sparkles, DollarSign, Briefcase, CheckSquare, Layers
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { formatCurrency } from '@/lib/utils'

export function GoalsPage() {
    const { toast } = useToast()
    const [goals, setGoals] = useState<any[]>([])
    const [users, setUsers] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [syncing, setSyncing] = useState(false)
    const [createModalOpen, setCreateModalOpen] = useState(false)
    const [editModalOpen, setEditModalOpen] = useState(false)
    const [editingGoal, setEditingGoal] = useState<any>(null)

    // Filter states
    const [categoryFilter, setCategoryFilter] = useState<string>('all')
    const [statusFilter, setStatusFilter] = useState<string>('all')
    const [searchQuery, setSearchQuery] = useState<string>('')

    // Helpers for dates
    const getFirstDayOfMonth = () => {
        const d = new Date()
        return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0]
    }
    const getLastDayOfMonth = () => {
        const d = new Date()
        return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0]
    }

    // Form state (Create)
    const [title, setTitle] = useState('')
    const [description, setDescription] = useState('')
    const [category, setCategory] = useState('revenue')
    const [targetValue, setTargetValue] = useState('')
    const [currentValue, setCurrentValue] = useState('0')
    const [unit, setUnit] = useState('₹')
    const [startDate, setStartDate] = useState(getFirstDayOfMonth())
    const [endDate, setEndDate] = useState(getLastDayOfMonth())
    const [assignedTo, setAssignedTo] = useState('all')

    const fetchGoals = async (isManualSync = false) => {
        if (isManualSync) setSyncing(true)
        else setLoading(true)
        try {
            const [goalsRes, usersRes] = await Promise.all([
                api.get('/goals'),
                api.get('/users').catch(() => ({ data: [] }))
            ])
            setGoals(goalsRes.data || [])
            setUsers(usersRes.data || [])
            if (isManualSync) {
                toast({ title: 'Metrics Synced', description: 'Live CRM metrics and goal progress updated.' })
            }
        } catch (err: any) {
            console.error('Failed to load goals', err)
            toast({
                title: 'Sync Warning',
                description: err.response?.data?.message || 'Could not refresh goal progress.',
                variant: 'destructive'
            })
        } finally {
            setLoading(false)
            setSyncing(false)
        }
    }

    useEffect(() => {
        fetchGoals()
    }, [])

    // Handle category change in create modal to auto-adjust unit
    const handleCategoryChange = (newCat: string) => {
        setCategory(newCat)
        if (newCat === 'revenue') setUnit('₹')
        else if (newCat === 'leads') setUnit('Leads')
        else if (newCat === 'projects') setUnit('Projects')
        else if (newCat === 'tasks') setUnit('Tasks')
        else if (newCat === 'custom') setUnit('Milestones')
    }

    const handleCreateGoal = async (e: any) => {
        e.preventDefault()
        try {
            await api.post('/goals', {
                title,
                description,
                category,
                targetValue: Number(targetValue),
                currentValue: category === 'custom' ? Number(currentValue) || 0 : 0,
                unit,
                startDate,
                endDate,
                assignedTo: assignedTo === 'all' ? undefined : assignedTo
            })
            toast({ title: 'Goal Established', description: 'New OKR target added to tracking.' })
            setCreateModalOpen(false)
            setTitle('')
            setDescription('')
            setTargetValue('')
            setCurrentValue('0')
            setAssignedTo('all')
            fetchGoals()
        } catch (err: any) {
            toast({
                title: 'Error',
                description: err.response?.data?.message || 'Failed to create goal',
                variant: 'destructive'
            })
        }
    }

    const handleOpenEdit = (goal: any) => {
        setEditingGoal({
            _id: goal._id,
            title: goal.title || '',
            description: goal.description || '',
            category: goal.category || 'revenue',
            targetValue: goal.targetValue?.toString() || '',
            currentValue: goal.currentValue?.toString() || '0',
            unit: goal.unit || '₹',
            startDate: goal.startDate ? new Date(goal.startDate).toISOString().split('T')[0] : getFirstDayOfMonth(),
            endDate: goal.endDate ? new Date(goal.endDate).toISOString().split('T')[0] : getLastDayOfMonth(),
            assignedTo: goal.assignedTo || 'all',
            status: goal.status === 'in-progress' ? 'in_progress' : (goal.status || 'in_progress')
        })
        setEditModalOpen(true)
    }

    const handleUpdateGoal = async (e: any) => {
        e.preventDefault()
        if (!editingGoal) return
        try {
            await api.put(`/goals/${editingGoal._id}`, {
                title: editingGoal.title,
                description: editingGoal.description,
                category: editingGoal.category,
                targetValue: Number(editingGoal.targetValue),
                currentValue: Number(editingGoal.currentValue) || 0,
                unit: editingGoal.unit,
                startDate: editingGoal.startDate,
                endDate: editingGoal.endDate,
                assignedTo: editingGoal.assignedTo === 'all' ? undefined : editingGoal.assignedTo,
                status: editingGoal.status === 'in-progress' ? 'in_progress' : editingGoal.status
            })
            toast({ title: 'Goal Updated', description: 'Target details updated successfully.' })
            setEditModalOpen(false)
            setEditingGoal(null)
            fetchGoals()
        } catch (err: any) {
            toast({
                title: 'Error',
                description: err.response?.data?.message || 'Failed to update goal',
                variant: 'destructive'
            })
        }
    }

    const handleDeleteGoal = async (id: string) => {
        if (!window.confirm('Are you sure you want to delete this OKR target goal?')) return
        try {
            await api.delete(`/goals/${id}`)
            toast({ title: 'Goal Removed', description: 'Target deleted from system.' })
            fetchGoals()
        } catch (err: any) {
            toast({
                title: 'Error',
                description: err.response?.data?.message || 'Failed to delete goal',
                variant: 'destructive'
            })
        }
    }

    // Filtered goals
    const filteredGoals = useMemo(() => {
        return goals.filter(goal => {
            if (categoryFilter !== 'all' && goal.category !== categoryFilter) return false
            if (statusFilter !== 'all') {
                const normStatus = goal.status === 'in-progress' ? 'in_progress' : goal.status
                if (normStatus !== statusFilter) return false
            }
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase()
                const matchTitle = (goal.title || '').toLowerCase().includes(q)
                const matchDesc = (goal.description || '').toLowerCase().includes(q)
                const matchScope = (goal.assignedToName || '').toLowerCase().includes(q)
                if (!matchTitle && !matchDesc && !matchScope) return false
            }
            return true
        })
    }, [goals, categoryFilter, statusFilter, searchQuery])

    // Executive Metrics
    const stats = useMemo(() => {
        const total = goals.length
        const achieved = goals.filter(g => g.status === 'achieved').length
        const inProgress = goals.filter(g => g.status === 'in_progress' || g.status === 'in-progress').length
        const atRisk = goals.filter(g => g.status === 'at_risk').length
        const missed = goals.filter(g => g.status === 'missed').length

        let sumPct = 0
        goals.forEach(g => {
            const pct = Math.min(100, Math.round(((g.currentValue || 0) / (g.targetValue || 1)) * 100))
            sumPct += pct
        })
        const avgProgress = total > 0 ? Math.round(sumPct / total) : 0

        return { total, achieved, inProgress, atRisk, missed, avgProgress }
    }, [goals])

    // Relative date helper
    const getDeadlineStatus = (endDateStr: string) => {
        if (!endDateStr) return null
        const end = new Date(endDateStr)
        end.setHours(23, 59, 59, 999)
        const diffMs = end.getTime() - Date.now()
        const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

        if (diffDays < 0) {
            return { text: `Expired ${Math.abs(diffDays)}d ago`, isExpired: true, isUrgent: false }
        }
        if (diffDays === 0) {
            return { text: 'Due Today', isExpired: false, isUrgent: true }
        }
        if (diffDays <= 7) {
            return { text: `${diffDays}d left`, isExpired: false, isUrgent: true }
        }
        return { text: `${diffDays}d left`, isExpired: false, isUrgent: false }
    }

    const getCategoryIcon = (cat: string) => {
        switch (cat) {
            case 'revenue': return <DollarSign className="h-3.5 w-3.5 text-blue-500" />
            case 'leads': return <Target className="h-3.5 w-3.5 text-emerald-500" />
            case 'projects': return <Briefcase className="h-3.5 w-3.5 text-purple-500" />
            case 'tasks': return <CheckSquare className="h-3.5 w-3.5 text-amber-500" />
            default: return <Sparkles className="h-3.5 w-3.5 text-pink-500" />
        }
    }

    return (
        <div className="space-y-6 pb-12">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground flex items-center gap-3">
                        <div className="p-2.5 bg-primary/10 rounded-2xl text-primary">
                            <Target className="h-6 w-6" />
                        </div>
                        OKRs & Company Goals
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Dynamic revenue benchmarks, pipeline milestones, and automated KPI tracking.
                    </p>
                </div>
                <div className="flex items-center gap-2.5">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fetchGoals(true)}
                        disabled={loading || syncing}
                        className="rounded-xl h-10 px-3 text-xs font-semibold border-border/60"
                    >
                        <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin text-primary' : ''}`} />
                        {syncing ? 'Syncing...' : 'Sync Live Metrics'}
                    </Button>
                    <Button onClick={() => setCreateModalOpen(true)} className="rounded-xl font-bold h-10 px-4 text-xs gap-2">
                        <Plus className="h-4 w-4" /> Add Target Goal
                    </Button>
                </div>
            </div>

            {/* Executive Metric Cards Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
                <Card className="border border-border/60 shadow-sm bg-card/80">
                    <CardContent className="p-4 space-y-1">
                        <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                            <span>Total OKRs</span>
                            <Layers className="h-4 w-4 text-primary" />
                        </div>
                        <div className="text-2xl font-black text-foreground">{stats.total}</div>
                        <div className="text-[11px] text-muted-foreground">Active strategic targets</div>
                    </CardContent>
                </Card>

                <Card className="border border-border/60 shadow-sm bg-card/80">
                    <CardContent className="p-4 space-y-1">
                        <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center justify-between">
                            <span>Achieved</span>
                            <Trophy className="h-4 w-4 text-emerald-500" />
                        </div>
                        <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{stats.achieved}</div>
                        <div className="text-[11px] text-muted-foreground">Targets completed 100%+</div>
                    </CardContent>
                </Card>

                <Card className="border border-border/60 shadow-sm bg-card/80">
                    <CardContent className="p-4 space-y-1">
                        <div className="text-[11px] font-bold uppercase tracking-wider text-blue-500 flex items-center justify-between">
                            <span>In Progress</span>
                            <Clock className="h-4 w-4 text-blue-500" />
                        </div>
                        <div className="text-2xl font-black text-foreground">{stats.inProgress}</div>
                        <div className="text-[11px] text-muted-foreground">On-track for deadline</div>
                    </CardContent>
                </Card>

                <Card className="border border-border/60 shadow-sm bg-card/80">
                    <CardContent className="p-4 space-y-1">
                        <div className="text-[11px] font-bold uppercase tracking-wider text-amber-500 flex items-center justify-between">
                            <span>At Risk / Missed</span>
                            <AlertTriangle className="h-4 w-4 text-amber-500" />
                        </div>
                        <div className={`text-2xl font-black ${stats.atRisk + stats.missed > 0 ? 'text-amber-500' : 'text-foreground'}`}>
                            {stats.atRisk + stats.missed}
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                            {stats.atRisk} at-risk • {stats.missed} missed
                        </div>
                    </CardContent>
                </Card>

                <Card className="border border-border/60 shadow-sm bg-card/80">
                    <CardContent className="p-4 space-y-1">
                        <div className="text-[11px] font-bold uppercase tracking-wider text-purple-500 flex items-center justify-between">
                            <span>Avg Pace</span>
                            <TrendingUp className="h-4 w-4 text-purple-500" />
                        </div>
                        <div className="text-2xl font-black text-foreground">{stats.avgProgress}%</div>
                        <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden mt-1.5">
                            <div
                                className="bg-purple-500 h-full rounded-full transition-all duration-500"
                                style={{ width: `${stats.avgProgress}%` }}
                            />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Filter Ribbon */}
            <Card className="border border-border/60 shadow-sm bg-card/60 backdrop-blur-md">
                <CardContent className="p-3.5 sm:p-4">
                    <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                        {/* Search Input */}
                        <div className="relative flex-1 min-w-[200px]">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                            <Input
                                placeholder="Search goals by title, description, assignee..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="pl-9 h-9 text-xs rounded-xl border-border/60 bg-background/80"
                            />
                        </div>

                        {/* Category & Status Filters */}
                        <div className="flex flex-wrap items-center gap-2">
                            {/* Category Filter */}
                            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                                <SelectTrigger className="h-9 w-[150px] text-xs font-semibold rounded-xl bg-background/80 border-border/60">
                                    <SelectValue placeholder="All Categories" />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl text-xs">
                                    <SelectItem value="all" className="text-xs font-bold">All Categories</SelectItem>
                                    <SelectItem value="revenue" className="text-xs">💰 Revenue</SelectItem>
                                    <SelectItem value="leads" className="text-xs">🎯 Won Leads</SelectItem>
                                    <SelectItem value="projects" className="text-xs">💼 Projects</SelectItem>
                                    <SelectItem value="tasks" className="text-xs">✅ Tasks</SelectItem>
                                    <SelectItem value="custom" className="text-xs">✨ Custom</SelectItem>
                                </SelectContent>
                            </Select>

                            {/* Status Filter */}
                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                                <SelectTrigger className="h-9 w-[140px] text-xs font-semibold rounded-xl bg-background/80 border-border/60">
                                    <SelectValue placeholder="All Status" />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl text-xs">
                                    <SelectItem value="all" className="text-xs font-bold">All Status</SelectItem>
                                    <SelectItem value="in_progress" className="text-xs">In Progress</SelectItem>
                                    <SelectItem value="achieved" className="text-xs">Achieved</SelectItem>
                                    <SelectItem value="at_risk" className="text-xs">At Risk</SelectItem>
                                    <SelectItem value="missed" className="text-xs">Missed</SelectItem>
                                </SelectContent>
                            </Select>

                            {/* Reset Button */}
                            {(categoryFilter !== 'all' || statusFilter !== 'all' || searchQuery.trim().length > 0) && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                        setCategoryFilter('all')
                                        setStatusFilter('all')
                                        setSearchQuery('')
                                    }}
                                    className="h-9 px-2.5 text-xs text-muted-foreground hover:text-foreground gap-1 rounded-xl"
                                >
                                    <RotateCcw className="h-3 w-3" /> Reset
                                </Button>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Goals Grid */}
            {loading ? (
                <div className="p-16 text-center text-muted-foreground animate-pulse flex flex-col items-center justify-center">
                    <RefreshCw className="h-8 w-8 animate-spin text-primary mb-3 opacity-60" />
                    <p className="font-semibold text-sm">Syncing live database metrics and company targets...</p>
                </div>
            ) : filteredGoals.length === 0 ? (
                <Card className="p-12 text-center text-muted-foreground rounded-2xl border-dashed">
                    <Trophy className="h-10 w-10 mx-auto mb-3 opacity-30" />
                    <p className="font-bold text-foreground">No matching company goals found</p>
                    <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                        Create quarterly revenue goals, won lead targets, or project delivery benchmarks.
                    </p>
                    <Button onClick={() => setCreateModalOpen(true)} className="mt-4 rounded-xl text-xs font-bold gap-2">
                        <Plus className="h-3.5 w-3.5" /> Establish First Goal
                    </Button>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {filteredGoals.map(goal => {
                        const target = Number(goal.targetValue) || 1
                        const current = Number(goal.currentValue) || 0
                        const pct = Math.min(100, Math.round((current / target) * 100))
                        const normStatus = goal.status === 'in-progress' ? 'in_progress' : (goal.status || 'in_progress')
                        const deadlineInfo = getDeadlineStatus(goal.endDate)

                        return (
                            <Card
                                key={goal._id}
                                className="rounded-2xl border border-border/60 bg-card/70 backdrop-blur-sm hover:shadow-lg transition-all duration-300 relative overflow-hidden flex flex-col justify-between"
                            >
                                <CardHeader className="pb-2.5 flex flex-row items-start justify-between gap-2">
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                                            <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-wider gap-1 py-0.5 px-2 bg-muted/40">
                                                {getCategoryIcon(goal.category)}
                                                {goal.category}
                                            </Badge>
                                            <Badge variant="secondary" className="text-[10px] font-semibold gap-1 py-0.5 px-2 bg-primary/10 text-primary border-none">
                                                {goal.assignedTo ? <User className="h-3 w-3" /> : <Building2 className="h-3 w-3" />}
                                                {goal.assignedToName || 'Company Wide'}
                                            </Badge>
                                        </div>
                                        <h3 className="font-bold text-base text-foreground leading-snug line-clamp-1" title={goal.title}>
                                            {goal.title}
                                        </h3>
                                        {goal.description && (
                                            <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{goal.description}</p>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7 text-muted-foreground hover:text-foreground rounded-lg"
                                            onClick={() => handleOpenEdit(goal)}
                                            title="Edit Goal"
                                        >
                                            <Edit className="h-3.5 w-3.5" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7 text-muted-foreground hover:text-rose-600 rounded-lg"
                                            onClick={() => handleDeleteGoal(goal._id)}
                                            title="Delete Goal"
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>
                                </CardHeader>

                                <CardContent className="space-y-4 pt-1">
                                    {/* Current vs Target Value */}
                                    <div className="flex items-baseline justify-between pt-1">
                                        <div className="space-y-0.5">
                                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                                                Current Progress
                                            </p>
                                            <h4 className="text-xl font-black text-foreground">
                                                {goal.unit === '₹' ? formatCurrency(current) : `${current} ${goal.unit}`}
                                            </h4>
                                        </div>
                                        <div className="text-right space-y-0.5">
                                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                                                Target Goal
                                            </p>
                                            <p className="text-sm font-bold text-muted-foreground">
                                                {goal.unit === '₹' ? formatCurrency(target) : `${target} ${goal.unit}`}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Progress Bar */}
                                    <div className="space-y-1.5">
                                        <div className="flex justify-between text-xs font-bold">
                                            <span className="text-muted-foreground">Achievement Pace</span>
                                            <span className={
                                                normStatus === 'achieved'
                                                    ? 'text-emerald-600 dark:text-emerald-400'
                                                    : normStatus === 'at_risk'
                                                    ? 'text-amber-500'
                                                    : normStatus === 'missed'
                                                    ? 'text-rose-500'
                                                    : 'text-primary'
                                            }>
                                                {pct}%
                                            </span>
                                        </div>
                                        <div className="h-2.5 w-full bg-muted rounded-full overflow-hidden">
                                            <div
                                                className={`h-full rounded-full transition-all duration-700 ${
                                                    normStatus === 'achieved'
                                                        ? 'bg-emerald-500'
                                                        : normStatus === 'at_risk'
                                                        ? 'bg-amber-500'
                                                        : normStatus === 'missed'
                                                        ? 'bg-rose-500'
                                                        : 'bg-primary'
                                                }`}
                                                style={{ width: `${pct}%` }}
                                            />
                                        </div>
                                    </div>

                                    {/* Footer: Dates & Status */}
                                    <div className="flex items-center justify-between text-xs text-muted-foreground pt-3 border-t border-border/40">
                                        <div className="flex items-center gap-1.5 text-[11px]">
                                            <Calendar className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                            <span>Due {new Date(goal.endDate).toLocaleDateString()}</span>
                                            {deadlineInfo && (
                                                <span className={`font-semibold ${deadlineInfo.isExpired ? 'text-rose-500' : deadlineInfo.isUrgent ? 'text-amber-500' : 'text-muted-foreground'}`}>
                                                    • {deadlineInfo.text}
                                                </span>
                                            )}
                                        </div>

                                        {/* Status Badge */}
                                        {normStatus === 'achieved' && (
                                            <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800 font-bold text-[10px] gap-1">
                                                <Trophy className="w-3 h-3" /> Achieved
                                            </Badge>
                                        )}
                                        {normStatus === 'at_risk' && (
                                            <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-300 dark:border-amber-800 font-bold text-[10px] gap-1">
                                                <AlertTriangle className="w-3 h-3" /> At Risk
                                            </Badge>
                                        )}
                                        {normStatus === 'missed' && (
                                            <Badge className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-300 dark:border-rose-800 font-bold text-[10px] gap-1">
                                                <AlertTriangle className="w-3 h-3" /> Missed
                                            </Badge>
                                        )}
                                        {normStatus === 'in_progress' && (
                                            <Badge variant="outline" className="font-bold text-[10px] text-primary border-primary/30 bg-primary/5">
                                                In Progress
                                            </Badge>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        )
                    })}
                </div>
            )}

            {/* Create Goal Modal */}
            <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
                <DialogContent className="sm:max-w-md rounded-2xl">
                    <DialogHeader>
                        <DialogTitle className="font-black text-xl flex items-center gap-2">
                            <Target className="h-5 w-5 text-primary" />
                            Establish New OKR Target Goal
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            Define a measurable target for revenue, closed leads, project deliverables, or custom KPIs.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleCreateGoal} className="space-y-3.5">
                        <div className="space-y-1">
                            <label className="text-xs font-bold uppercase text-muted-foreground">Goal Title</label>
                            <Input
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                                required
                                placeholder="e.g. Q4 Company Revenue Milestone"
                                className="rounded-xl h-10 text-xs"
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-bold uppercase text-muted-foreground">Description (Optional)</label>
                            <Input
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                placeholder="e.g. Total closed invoice target for Q4"
                                className="rounded-xl h-9 text-xs"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <label className="text-xs font-bold uppercase text-muted-foreground">Category</label>
                                <Select value={category} onValueChange={handleCategoryChange}>
                                    <SelectTrigger className="rounded-xl h-10 text-xs font-semibold">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl text-xs">
                                        <SelectItem value="revenue">💰 Revenue Benchmark</SelectItem>
                                        <SelectItem value="leads">🎯 Closed Won Leads</SelectItem>
                                        <SelectItem value="projects">💼 Completed Projects</SelectItem>
                                        <SelectItem value="tasks">✅ Done Tasks</SelectItem>
                                        <SelectItem value="custom">✨ Custom Milestone / KPI</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-bold uppercase text-muted-foreground">Scope / Assignee</label>
                                <Select value={assignedTo} onValueChange={setAssignedTo}>
                                    <SelectTrigger className="rounded-xl h-10 text-xs font-semibold">
                                        <SelectValue placeholder="Company Wide" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl text-xs">
                                        <SelectItem value="all" className="text-xs font-bold">🏢 Company Wide</SelectItem>
                                        {users.map((u: any) => (
                                            <SelectItem key={u._id} value={u._id} className="text-xs">
                                                👤 {u.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <label className="text-xs font-bold uppercase text-muted-foreground">Target Value</label>
                                <Input
                                    type="number"
                                    value={targetValue}
                                    onChange={e => setTargetValue(e.target.value)}
                                    required
                                    placeholder="e.g. 500000"
                                    className="rounded-xl h-10 text-xs font-bold"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold uppercase text-muted-foreground">Unit Symbol</label>
                                <Input
                                    value={unit}
                                    onChange={e => setUnit(e.target.value)}
                                    placeholder="e.g. ₹, Leads, %"
                                    className="rounded-xl h-10 text-xs"
                                />
                            </div>
                        </div>

                        {category === 'custom' && (
                            <div className="space-y-1">
                                <label className="text-xs font-bold uppercase text-muted-foreground">Initial Progress / Current Value</label>
                                <Input
                                    type="number"
                                    value={currentValue}
                                    onChange={e => setCurrentValue(e.target.value)}
                                    placeholder="e.g. 0"
                                    className="rounded-xl h-10 text-xs"
                                />
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <label className="text-xs font-bold uppercase text-muted-foreground">Start Date</label>
                                <Input
                                    type="date"
                                    value={startDate}
                                    onChange={e => setStartDate(e.target.value)}
                                    className="rounded-xl h-10 text-xs"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold uppercase text-muted-foreground">Target Deadline</label>
                                <Input
                                    type="date"
                                    value={endDate}
                                    onChange={e => setEndDate(e.target.value)}
                                    required
                                    className="rounded-xl h-10 text-xs"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-2.5 pt-3 border-t border-border/40">
                            <Button type="button" variant="outline" onClick={() => setCreateModalOpen(false)} className="rounded-xl text-xs h-9">
                                Cancel
                            </Button>
                            <Button type="submit" className="rounded-xl font-bold text-xs h-9">
                                Establish Goal
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Edit Goal Modal */}
            <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
                <DialogContent className="sm:max-w-md rounded-2xl">
                    <DialogHeader>
                        <DialogTitle className="font-black text-xl flex items-center gap-2">
                            <Edit className="h-5 w-5 text-primary" />
                            Edit OKR Target Goal
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            Update benchmark targets, achievement status, scope, and target deadline.
                        </DialogDescription>
                    </DialogHeader>
                    {editingGoal && (
                        <form onSubmit={handleUpdateGoal} className="space-y-3.5">
                            <div className="space-y-1">
                                <label className="text-xs font-bold uppercase text-muted-foreground">Goal Title</label>
                                <Input
                                    value={editingGoal.title}
                                    onChange={e => setEditingGoal({ ...editingGoal, title: e.target.value })}
                                    required
                                    className="rounded-xl h-10 text-xs"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-bold uppercase text-muted-foreground">Description (Optional)</label>
                                <Input
                                    value={editingGoal.description}
                                    onChange={e => setEditingGoal({ ...editingGoal, description: e.target.value })}
                                    className="rounded-xl h-9 text-xs"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold uppercase text-muted-foreground">Category</label>
                                    <Select
                                        value={editingGoal.category}
                                        onValueChange={v => setEditingGoal({ ...editingGoal, category: v })}
                                    >
                                        <SelectTrigger className="rounded-xl h-10 text-xs font-semibold">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-xl text-xs">
                                            <SelectItem value="revenue">💰 Revenue Benchmark</SelectItem>
                                            <SelectItem value="leads">🎯 Closed Won Leads</SelectItem>
                                            <SelectItem value="projects">💼 Completed Projects</SelectItem>
                                            <SelectItem value="tasks">✅ Done Tasks</SelectItem>
                                            <SelectItem value="custom">✨ Custom Milestone / KPI</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-bold uppercase text-muted-foreground">Scope / Assignee</label>
                                    <Select
                                        value={editingGoal.assignedTo}
                                        onValueChange={v => setEditingGoal({ ...editingGoal, assignedTo: v })}
                                    >
                                        <SelectTrigger className="rounded-xl h-10 text-xs font-semibold">
                                            <SelectValue placeholder="Company Wide" />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-xl text-xs">
                                            <SelectItem value="all" className="text-xs font-bold">🏢 Company Wide</SelectItem>
                                            {users.map((u: any) => (
                                                <SelectItem key={u._id} value={u._id} className="text-xs">
                                                    👤 {u.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold uppercase text-muted-foreground">Target Value</label>
                                    <Input
                                        type="number"
                                        value={editingGoal.targetValue}
                                        onChange={e => setEditingGoal({ ...editingGoal, targetValue: e.target.value })}
                                        required
                                        className="rounded-xl h-10 text-xs font-bold"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold uppercase text-muted-foreground">Unit Symbol</label>
                                    <Input
                                        value={editingGoal.unit}
                                        onChange={e => setEditingGoal({ ...editingGoal, unit: e.target.value })}
                                        className="rounded-xl h-10 text-xs"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold uppercase text-muted-foreground">Current Achievement</label>
                                    <Input
                                        type="number"
                                        value={editingGoal.currentValue}
                                        onChange={e => setEditingGoal({ ...editingGoal, currentValue: e.target.value })}
                                        className="rounded-xl h-10 text-xs"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold uppercase text-muted-foreground">Status</label>
                                    <Select
                                        value={editingGoal.status}
                                        onValueChange={v => setEditingGoal({ ...editingGoal, status: v })}
                                    >
                                        <SelectTrigger className="rounded-xl h-10 text-xs font-semibold">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-xl text-xs">
                                            <SelectItem value="in_progress">⏳ In Progress</SelectItem>
                                            <SelectItem value="achieved">🏆 Achieved</SelectItem>
                                            <SelectItem value="at_risk">⚠️ At Risk</SelectItem>
                                            <SelectItem value="missed">❌ Missed</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold uppercase text-muted-foreground">Start Date</label>
                                    <Input
                                        type="date"
                                        value={editingGoal.startDate}
                                        onChange={e => setEditingGoal({ ...editingGoal, startDate: e.target.value })}
                                        className="rounded-xl h-10 text-xs"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold uppercase text-muted-foreground">Target Deadline</label>
                                    <Input
                                        type="date"
                                        value={editingGoal.endDate}
                                        onChange={e => setEditingGoal({ ...editingGoal, endDate: e.target.value })}
                                        required
                                        className="rounded-xl h-10 text-xs"
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end gap-2.5 pt-3 border-t border-border/40">
                                <Button type="button" variant="outline" onClick={() => setEditModalOpen(false)} className="rounded-xl text-xs h-9">
                                    Cancel
                                </Button>
                                <Button type="submit" className="rounded-xl font-bold text-xs h-9">
                                    Save Changes
                                </Button>
                            </div>
                        </form>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    )
}
