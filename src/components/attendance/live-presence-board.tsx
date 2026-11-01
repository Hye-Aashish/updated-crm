import { useState, useEffect, useMemo } from 'react'
import {
    Users,
    Clock,
    Coffee,
    CheckCircle2,
    XCircle,
    Search,
    RefreshCw,
    Play,
    LayoutGrid,
    Table as TableIcon,
    Phone,
    Mail,
    Sparkles,
    AlertCircle,
    Activity,
    Briefcase
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/ui/table'
import { getInitials } from '@/lib/utils'
import api from '@/lib/api-client'
import { format } from 'date-fns'

export interface LivePresenceMember {
    id: string
    _id: string
    name: string
    email: string
    role: string
    avatar?: string
    designation?: string
    department?: string
    phone?: string
    employeeId?: string
    status: 'working' | 'on-break' | 'completed' | 'not-joined' | string
    rawStatus: string
    checkIn?: string | null
    checkOut?: string | null
    breaks?: Array<{ start?: string; end?: string }>
    currentBreakStart?: string | null
    currentBreakMinutes?: number
    totalBreakMinutes?: number
    totalWorkMinutes?: number
    activeTask?: {
        taskTitle?: string
        projectName?: string
        startTime?: string
        timerDurationMinutes?: number
    } | null
}

interface LivePresenceData {
    date?: string
    summary: {
        totalStaff: number
        working: number
        onBreak: number
        completed: number
        notJoined: number
    }
    members: LivePresenceMember[]
}

interface LivePresenceBoardProps {
    className?: string
    title?: string
    description?: string
    compact?: boolean
    defaultView?: 'cards' | 'table'
}

export function LivePresenceBoard({
    className = '',
    title = 'Real-Time Team Activity & Break Monitor',
    description = 'Live tracking of who has joined, active working time, who is on break, and break durations.',
    compact = false,
    defaultView = 'cards'
}: LivePresenceBoardProps) {
    const [data, setData] = useState<LivePresenceData | null>(null)
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const [statusFilter, setStatusFilter] = useState<'all' | 'working' | 'on-break' | 'completed' | 'not-joined'>('all')
    const [viewMode, setViewMode] = useState<'cards' | 'table'>(defaultView)
    const [currentTime, setCurrentTime] = useState(new Date())

    // Fetch live presence from API
    const fetchLivePresence = async (isManual = false) => {
        if (isManual) setRefreshing(true)
        try {
            const localDate = format(new Date(), 'yyyy-MM-dd')
            const res = await api.get(`/attendance/live-presence?date=${localDate}`)
            setData(res.data)
        } catch (err) {
            console.error('Failed to fetch live presence:', err)
        } finally {
            setLoading(false)
            if (isManual) setRefreshing(false)
        }
    }

    // Initial fetch and 30-sec polling
    useEffect(() => {
        fetchLivePresence()
        const interval = setInterval(() => {
            fetchLivePresence()
        }, 30000)
        return () => clearInterval(interval)
    }, [])

    // 1-second timer tick to update live counters in UI
    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date())
        }, 1000)
        return () => clearInterval(timer)
    }, [])

    // Format helper for timestamps (e.g. 09:30 AM)
    const formatTimeStr = (isoDate?: string | null) => {
        if (!isoDate) return '--:--'
        try {
            return format(new Date(isoDate), 'hh:mm a')
        } catch {
            return '--:--'
        }
    }

    // Calculate dynamic live break minutes
    const getLiveBreakMinutes = (member: LivePresenceMember) => {
        if (member.status !== 'on-break' || !member.currentBreakStart) {
            return member.currentBreakMinutes || 0
        }
        try {
            const startTime = new Date(member.currentBreakStart).getTime()
            const diffMs = currentTime.getTime() - startTime
            return Math.max(0, Math.floor(diffMs / 60000))
        } catch {
            return member.currentBreakMinutes || 0
        }
    }

    // Calculate dynamic live work minutes
    const getLiveWorkMinutes = (member: LivePresenceMember) => {
        if (member.status === 'completed') {
            return member.totalWorkMinutes || 0
        }
        if (!member.checkIn) return 0
        try {
            const checkInTime = new Date(member.checkIn).getTime()
            const totalElapsed = Math.max(0, Math.floor((currentTime.getTime() - checkInTime) / 60000))
            const breakMins = (member.totalBreakMinutes || 0) + (member.status === 'on-break' ? getLiveBreakMinutes(member) : 0)
            return Math.max(0, totalElapsed - breakMins)
        } catch {
            return member.totalWorkMinutes || 0
        }
    }

    // Duration formatting helper (e.g. "4h 25m" or "18m")
    const formatDuration = (mins: number) => {
        if (!mins || mins <= 0) return '0m'
        const h = Math.floor(mins / 60)
        const m = mins % 60
        if (h > 0) return `${h}h ${m}m`
        return `${m}m`
    }

    // Filtered members list
    const filteredMembers = useMemo(() => {
        if (!data?.members) return []
        return data.members.filter(member => {
            const matchesSearch =
                member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (member.email && member.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
                (member.designation && member.designation.toLowerCase().includes(searchQuery.toLowerCase())) ||
                (member.department && member.department.toLowerCase().includes(searchQuery.toLowerCase())) ||
                (member.employeeId && member.employeeId.toLowerCase().includes(searchQuery.toLowerCase()))

            const matchesStatus = statusFilter === 'all' || member.status === statusFilter

            return matchesSearch && matchesStatus
        })
    }, [data?.members, searchQuery, statusFilter])

    const summary = data?.summary || {
        totalStaff: 0,
        working: 0,
        onBreak: 0,
        completed: 0,
        notJoined: 0
    }

    return (
        <div className={`space-y-5 w-full ${className}`}>
            {/* Header with Title and Quick Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-3">
                        <div className="clay-icon h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                            <Activity className="h-5 w-5 animate-pulse" />
                        </div>
                        <div>
                            <h2 className="text-lg sm:text-xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
                                {title}
                            </h2>
                            <p className="text-xs text-muted-foreground mt-0.5 font-medium">{description}</p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2.5 self-end sm:self-auto flex-wrap">
                    <div className="clay-inset px-3 py-1.5 bg-muted/40 hidden md:flex items-center gap-2 mr-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                            Live Time (IST):
                        </span>
                        <span className="text-xs font-mono font-extrabold text-foreground">
                            {format(currentTime, 'hh:mm:ss a')}
                        </span>
                    </div>

                    {/* View Switcher */}
                    <div className="clay-inset p-1 bg-muted/40 flex items-center gap-1">
                        <Button
                            variant={viewMode === 'cards' ? 'secondary' : 'ghost'}
                            size="sm"
                            className={`h-8 px-3 text-xs font-bold rounded-xl transition-all ${
                                viewMode === 'cards'
                                    ? 'clay-card bg-card text-primary shadow-xs'
                                    : 'text-muted-foreground hover:text-foreground'
                            }`}
                            onClick={() => setViewMode('cards')}
                            title="Grid Card View"
                        >
                            <LayoutGrid className="h-3.5 w-3.5 mr-1.5" /> Cards
                        </Button>
                        <Button
                            variant={viewMode === 'table' ? 'secondary' : 'ghost'}
                            size="sm"
                            className={`h-8 px-3 text-xs font-bold rounded-xl transition-all ${
                                viewMode === 'table'
                                    ? 'clay-card bg-card text-primary shadow-xs'
                                    : 'text-muted-foreground hover:text-foreground'
                            }`}
                            onClick={() => setViewMode('table')}
                            title="Table View"
                        >
                            <TableIcon className="h-3.5 w-3.5 mr-1.5" /> Table
                        </Button>
                    </div>

                    <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs font-bold rounded-xl clay-card"
                        onClick={() => fetchLivePresence(true)}
                        disabled={refreshing}
                    >
                        <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${refreshing ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                </div>
            </div>

            {/* 4 Interactive Summary Status KPI Cards - Spans full 100% width */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 w-full">
                {/* 1. Working Now */}
                <div
                    onClick={() => setStatusFilter(statusFilter === 'working' ? 'all' : 'working')}
                    className={`clay-card p-4 sm:p-5 rounded-2xl transition-all cursor-pointer ${
                        statusFilter === 'working'
                            ? 'ring-2 ring-emerald-500 bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-400/80 shadow-md'
                            : 'hover:border-emerald-300/80'
                    }`}
                >
                    <div className="flex items-center justify-between gap-1.5">
                        <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5 whitespace-nowrap shrink-0">
                            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping shrink-0" />
                            Working Now
                        </span>
                        <Badge className="clay-badge bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[10px] px-2 py-0.5 font-bold whitespace-nowrap shrink-0">
                            Active
                        </Badge>
                    </div>
                    <div className="text-2xl sm:text-3xl font-extrabold text-foreground mt-2 tabular-nums whitespace-nowrap">
                        {summary.working}
                    </div>
                    <p className="text-[11px] text-muted-foreground font-medium mt-0.5 whitespace-nowrap truncate">
                        Clocked in & active on shift
                    </p>
                </div>

                {/* 2. On Break */}
                <div
                    onClick={() => setStatusFilter(statusFilter === 'on-break' ? 'all' : 'on-break')}
                    className={`clay-card p-4 sm:p-5 rounded-2xl transition-all cursor-pointer ${
                        statusFilter === 'on-break'
                            ? 'ring-2 ring-amber-500 bg-amber-50/80 dark:bg-amber-950/40 border-amber-400/80 shadow-md'
                            : 'hover:border-amber-300/80'
                    }`}
                >
                    <div className="flex items-center justify-between gap-1.5">
                        <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-700 dark:text-amber-300 flex items-center gap-1.5 whitespace-nowrap shrink-0">
                            <Coffee className="h-3.5 w-3.5 text-amber-600 animate-bounce shrink-0" />
                            On Break
                        </span>
                        <Badge className="clay-badge bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 text-[10px] px-2 py-0.5 font-bold whitespace-nowrap shrink-0">
                            Away
                        </Badge>
                    </div>
                    <div className="text-2xl sm:text-3xl font-extrabold text-amber-700 dark:text-amber-400 mt-2 tabular-nums whitespace-nowrap">
                        {summary.onBreak}
                    </div>
                    <p className="text-[11px] text-muted-foreground font-medium mt-0.5 whitespace-nowrap truncate">
                        Currently paused on break
                    </p>
                </div>

                {/* 3. Shift Completed */}
                <div
                    onClick={() => setStatusFilter(statusFilter === 'completed' ? 'all' : 'completed')}
                    className={`clay-card p-4 sm:p-5 rounded-2xl transition-all cursor-pointer ${
                        statusFilter === 'completed'
                            ? 'ring-2 ring-blue-500 bg-blue-50/80 dark:bg-blue-950/40 border-blue-400/80 shadow-md'
                            : 'hover:border-blue-300/80'
                    }`}
                >
                    <div className="flex items-center justify-between gap-1.5">
                        <span className="text-[11px] font-extrabold uppercase tracking-wider text-blue-700 dark:text-blue-300 flex items-center gap-1.5 whitespace-nowrap shrink-0">
                            <CheckCircle2 className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                            Shift Done
                        </span>
                        <Badge className="clay-badge bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 text-[10px] px-2 py-0.5 font-bold whitespace-nowrap shrink-0">
                            Out
                        </Badge>
                    </div>
                    <div className="text-2xl sm:text-3xl font-extrabold text-blue-700 dark:text-blue-400 mt-2 tabular-nums whitespace-nowrap">
                        {summary.completed}
                    </div>
                    <p className="text-[11px] text-muted-foreground font-medium mt-0.5 whitespace-nowrap truncate">
                        Clocked out today
                    </p>
                </div>

                {/* 4. Not Joined Yet */}
                <div
                    onClick={() => setStatusFilter(statusFilter === 'not-joined' ? 'all' : 'not-joined')}
                    className={`clay-card p-4 sm:p-5 rounded-2xl transition-all cursor-pointer ${
                        statusFilter === 'not-joined'
                            ? 'ring-2 ring-rose-500 bg-rose-50/80 dark:bg-rose-950/40 border-rose-400/80 shadow-md'
                            : 'hover:border-slate-300/80'
                    }`}
                >
                    <div className="flex items-center justify-between gap-1.5">
                        <span className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 whitespace-nowrap shrink-0">
                            <XCircle className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                            Not Joined
                        </span>
                        <Badge className="clay-badge bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-400 text-[10px] px-2 py-0.5 font-bold whitespace-nowrap shrink-0">
                            Offline
                        </Badge>
                    </div>
                    <div className="text-2xl sm:text-3xl font-extrabold text-foreground mt-2 tabular-nums whitespace-nowrap">
                        {summary.notJoined}
                    </div>
                    <p className="text-[11px] text-muted-foreground font-medium mt-0.5 whitespace-nowrap truncate">
                        No clock-in recorded yet
                    </p>
                </div>
            </div>

            {/* Filter Bar & Search */}
            <div className="flex flex-col sm:flex-row gap-3 items-center justify-between clay-card p-3 sm:p-4 rounded-2xl w-full">
                <div className="relative w-full sm:w-80">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search employee, designation, dept..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="pl-9 text-xs h-9 bg-muted/30 rounded-xl font-medium border-border/60"
                    />
                </div>

                <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
                    <Button
                        variant={statusFilter === 'all' ? 'default' : 'ghost'}
                        size="sm"
                        className={`h-8 text-xs font-bold px-3 rounded-xl transition-all ${
                            statusFilter === 'all'
                                ? 'clay-btn bg-primary text-white shadow-xs'
                                : 'text-foreground hover:bg-muted/60'
                        }`}
                        onClick={() => setStatusFilter('all')}
                    >
                        All Staff ({summary.totalStaff})
                    </Button>
                    <Button
                        variant={statusFilter === 'working' ? 'default' : 'ghost'}
                        size="sm"
                        className={`h-8 text-xs font-bold px-2.5 rounded-xl transition-all ${
                            statusFilter === 'working'
                                ? 'clay-btn bg-emerald-600 text-white shadow-xs'
                                : 'text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/50'
                        }`}
                        onClick={() => setStatusFilter('working')}
                    >
                        🟢 Working ({summary.working})
                    </Button>
                    <Button
                        variant={statusFilter === 'on-break' ? 'default' : 'ghost'}
                        size="sm"
                        className={`h-8 text-xs font-bold px-2.5 rounded-xl transition-all ${
                            statusFilter === 'on-break'
                                ? 'clay-btn bg-amber-500 text-white shadow-xs'
                                : 'text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/50'
                        }`}
                        onClick={() => setStatusFilter('on-break')}
                    >
                        🟡 On Break ({summary.onBreak})
                    </Button>
                    <Button
                        variant={statusFilter === 'completed' ? 'default' : 'ghost'}
                        size="sm"
                        className={`h-8 text-xs font-bold px-2.5 rounded-xl transition-all ${
                            statusFilter === 'completed'
                                ? 'clay-btn bg-blue-600 text-white shadow-xs'
                                : 'text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50'
                        }`}
                        onClick={() => setStatusFilter('completed')}
                    >
                        🔵 Done ({summary.completed})
                    </Button>
                    <Button
                        variant={statusFilter === 'not-joined' ? 'default' : 'ghost'}
                        size="sm"
                        className={`h-8 text-xs font-bold px-2.5 rounded-xl transition-all ${
                            statusFilter === 'not-joined'
                                ? 'clay-btn bg-rose-600 text-white shadow-xs'
                                : 'text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50'
                        }`}
                        onClick={() => setStatusFilter('not-joined')}
                    >
                        ⚪ Not Joined ({summary.notJoined})
                    </Button>
                </div>
            </div>

            {/* Content View: Card Grid or Table */}
            {loading ? (
                <div className="text-center py-16 text-muted-foreground animate-pulse">
                    <Activity className="h-8 w-8 mx-auto mb-2 opacity-50 animate-spin" />
                    Loading real-time presence data...
                </div>
            ) : filteredMembers.length === 0 ? (
                <div className="text-center py-14 bg-card rounded-xl border border-dashed text-muted-foreground">
                    <Users className="h-10 w-10 mx-auto mb-2 opacity-30 text-primary" />
                    <p className="font-semibold text-foreground">No employees match your filter criteria.</p>
                    <p className="text-xs mt-1">Try selecting another status tab or clearing the search query.</p>
                </div>
            ) : viewMode === 'cards' ? (
                /* ── CARDS VIEW ────────────────────────────────────────────── */
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 w-full">
                    {filteredMembers.map(member => {
                        const isWorking = member.status === 'working'
                        const isOnBreak = member.status === 'on-break'
                        const isDone = member.status === 'completed'
                        const isNotJoined = member.status === 'not-joined'

                        const liveBreakMins = getLiveBreakMinutes(member)
                        const liveWorkMins = getLiveWorkMinutes(member)

                        return (
                            <Card
                                key={member.id}
                                className={`clay-card rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-lg ${
                                    isOnBreak
                                        ? 'border-amber-400/60 bg-amber-50/20 dark:bg-amber-950/10'
                                        : isWorking
                                        ? 'border-emerald-400/50 bg-card hover:border-emerald-500'
                                        : isDone
                                        ? 'border-blue-400/40 bg-card'
                                        : 'border-border/60 bg-muted/10 opacity-80 hover:opacity-100'
                                }`}
                            >
                                <CardContent className="p-4 space-y-3.5">
                                    {/* Top Profile Row */}
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="relative">
                                                <Avatar className="h-11 w-11 border shadow-xs">
                                                    <AvatarImage src={member.avatar} />
                                                    <AvatarFallback className="font-bold text-xs bg-primary/10 text-primary">
                                                        {getInitials(member.name)}
                                                    </AvatarFallback>
                                                </Avatar>
                                                {/* Live Status indicator dot */}
                                                <span
                                                    className={`absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-background ${
                                                        isWorking
                                                            ? 'bg-emerald-500 animate-pulse'
                                                            : isOnBreak
                                                            ? 'bg-amber-500 animate-bounce'
                                                            : isDone
                                                            ? 'bg-blue-500'
                                                            : 'bg-slate-300 dark:bg-slate-600'
                                                    }`}
                                                />
                                            </div>

                                            <div className="min-w-0">
                                                <h4 className="font-bold text-sm text-foreground truncate leading-tight" title={member.name}>
                                                    {member.name}
                                                </h4>
                                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5 truncate">
                                                    <span className="capitalize">{member.designation || member.role}</span>
                                                    {member.department && (
                                                        <>
                                                            <span>•</span>
                                                            <span className="text-[11px] truncate">{member.department}</span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Status Badge */}
                                        <div className="shrink-0">
                                            {isWorking && (
                                                <Badge className="bg-emerald-600 text-white text-[10px] px-2 py-0.5 shadow-xs whitespace-nowrap shrink-0">
                                                    🟢 Working
                                                </Badge>
                                            )}
                                            {isOnBreak && (
                                                <Badge className="bg-amber-500 hover:bg-amber-600 text-white text-[10px] px-2 py-0.5 shadow-xs font-bold animate-pulse whitespace-nowrap shrink-0">
                                                    ☕ On Break
                                                </Badge>
                                            )}
                                            {isDone && (
                                                <Badge className="bg-blue-600 text-white text-[10px] px-2 py-0.5 shadow-xs whitespace-nowrap shrink-0">
                                                    ✅ Shift Done
                                                </Badge>
                                            )}
                                            {isNotJoined && (
                                                <Badge variant="outline" className="text-muted-foreground text-[10px] px-2 py-0.5 whitespace-nowrap shrink-0">
                                                    ⚪ Not Joined
                                                </Badge>
                                            )}
                                        </div>
                                    </div>

                                    {/* Metrics Grid */}
                                    {isNotJoined ? (
                                        <div className="p-3 bg-muted/40 rounded-xl text-center space-y-1">
                                            <p className="text-xs font-medium text-muted-foreground">
                                                Has not clocked in for today's shift yet.
                                            </p>
                                            <div className="flex items-center justify-center gap-3 pt-1 text-[11px] text-primary">
                                                {member.email && (
                                                    <a href={`mailto:${member.email}`} className="flex items-center gap-1 hover:underline">
                                                        <Mail className="h-3 w-3" /> Email
                                                    </a>
                                                )}
                                                {member.phone && (
                                                    <a href={`tel:${member.phone}`} className="flex items-center gap-1 hover:underline">
                                                        <Phone className="h-3 w-3" /> Call
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            {/* Work & Join Timings */}
                                            <div className="grid grid-cols-2 gap-2 text-xs">
                                                <div className="p-2.5 bg-muted/30 dark:bg-muted/10 rounded-lg border border-border/40">
                                                    <div className="text-[10px] font-semibold text-muted-foreground uppercase flex items-center gap-1">
                                                        <Clock className="h-3 w-3 text-emerald-500" /> Check In
                                                    </div>
                                                    <div className="font-bold text-foreground mt-0.5">
                                                        {formatTimeStr(member.checkIn)}
                                                    </div>
                                                    <span className="text-[10px] text-muted-foreground block">
                                                        {formatDuration(liveWorkMins)} worked
                                                    </span>
                                                </div>

                                                <div className="p-2.5 bg-muted/30 dark:bg-muted/10 rounded-lg border border-border/40">
                                                    <div className="text-[10px] font-semibold text-muted-foreground uppercase flex items-center gap-1">
                                                        <CheckCircle2 className="h-3 w-3 text-blue-500" /> Check Out
                                                    </div>
                                                    <div className="font-bold text-foreground mt-0.5">
                                                        {isDone ? formatTimeStr(member.checkOut) : 'In Progress'}
                                                    </div>
                                                    <span className="text-[10px] text-muted-foreground block">
                                                        {isDone ? 'Shift ended' : 'Active shift'}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* BREAK DETAILS (Crucial Requirement) */}
                                            {isOnBreak ? (
                                                <div className="p-2.5 rounded-lg bg-amber-100/70 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs space-y-1">
                                                    <div className="flex items-center justify-between font-bold">
                                                        <span className="flex items-center gap-1">
                                                            <Coffee className="h-3.5 w-3.5 text-amber-600 animate-pulse" />
                                                            Current Break:
                                                        </span>
                                                        <span className="text-sm font-extrabold tabular-nums text-amber-700 dark:text-amber-300">
                                                            {formatDuration(liveBreakMins)}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center justify-between text-[11px] text-amber-800/80 dark:text-amber-300/80">
                                                        <span>Break Started: {formatTimeStr(member.currentBreakStart)}</span>
                                                        <span>Total Breaks: {formatDuration(member.totalBreakMinutes || 0)}</span>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-muted/20 text-xs border border-border/30">
                                                    <span className="text-muted-foreground text-[11px] flex items-center gap-1">
                                                        <Coffee className="h-3 w-3 text-muted-foreground" /> Total Breaks Taken:
                                                    </span>
                                                    <span className="font-bold text-foreground">
                                                        {formatDuration(member.totalBreakMinutes || 0)}
                                                        {member.breaks && member.breaks.length > 0 && (
                                                            <span className="text-[10px] font-normal text-muted-foreground ml-1">
                                                                ({member.breaks.length} session{member.breaks.length > 1 ? 's' : ''})
                                                            </span>
                                                        )}
                                                    </span>
                                                </div>
                                            )}

                                            {/* Active Task (If running timer) */}
                                            {member.activeTask && (
                                                <div className="p-2 rounded-lg bg-primary/5 border border-primary/20 text-xs">
                                                    <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-primary">
                                                        <Briefcase className="h-3 w-3" /> Working on Task:
                                                    </div>
                                                    <div className="font-semibold text-foreground truncate mt-0.5" title={member.activeTask.taskTitle}>
                                                        {member.activeTask.taskTitle}
                                                    </div>
                                                    {member.activeTask.projectName && (
                                                        <span className="text-[10px] text-muted-foreground block truncate">
                                                            Project: {member.activeTask.projectName} • ⏱️ {formatDuration(member.activeTask.timerDurationMinutes || 0)}
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        )
                    })}
                </div>
            ) : (
                /* ── TABLE VIEW ────────────────────────────────────────────── */
                <Card className="clay-card rounded-2xl overflow-hidden border">
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader className="bg-muted/40">
                                    <TableRow>
                                        <TableHead>Employee</TableHead>
                                        <TableHead>Role / Dept</TableHead>
                                        <TableHead>Current Status</TableHead>
                                        <TableHead>Check In Time</TableHead>
                                        <TableHead>Active Work Time</TableHead>
                                        <TableHead>Break Status & Duration</TableHead>
                                        <TableHead>Check Out</TableHead>
                                        <TableHead>Active Task</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredMembers.map(member => {
                                        const isWorking = member.status === 'working'
                                        const isOnBreak = member.status === 'on-break'
                                        const isDone = member.status === 'completed'
                                        const isNotJoined = member.status === 'not-joined'

                                        const liveBreakMins = getLiveBreakMinutes(member)
                                        const liveWorkMins = getLiveWorkMinutes(member)

                                        return (
                                            <TableRow key={member.id} className="hover:bg-muted/30">
                                                {/* Employee */}
                                                <TableCell>
                                                    <div className="flex items-center gap-2.5">
                                                        <Avatar className="h-8 w-8">
                                                            <AvatarImage src={member.avatar} />
                                                            <AvatarFallback className="text-[10px] font-bold bg-primary/10 text-primary">
                                                                {getInitials(member.name)}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                        <div>
                                                            <div className="font-bold text-sm text-foreground">{member.name}</div>
                                                            <div className="text-[11px] text-muted-foreground">{member.email}</div>
                                                        </div>
                                                    </div>
                                                </TableCell>

                                                {/* Role / Dept */}
                                                <TableCell>
                                                    <div className="text-xs">
                                                        <div className="font-medium capitalize">{member.designation || member.role}</div>
                                                        <div className="text-[11px] text-muted-foreground">{member.department || 'General'}</div>
                                                    </div>
                                                </TableCell>

                                                {/* Current Status */}
                                                <TableCell>
                                                    {isWorking && (
                                                        <Badge className="bg-emerald-600 text-white text-[10px] px-2 py-0.5">
                                                            🟢 Working
                                                        </Badge>
                                                    )}
                                                    {isOnBreak && (
                                                        <Badge className="bg-amber-500 text-white text-[10px] px-2 py-0.5 font-bold animate-pulse">
                                                            ☕ On Break
                                                        </Badge>
                                                    )}
                                                    {isDone && (
                                                        <Badge className="bg-blue-600 text-white text-[10px] px-2 py-0.5">
                                                            ✅ Completed
                                                        </Badge>
                                                    )}
                                                    {isNotJoined && (
                                                        <Badge variant="outline" className="text-muted-foreground text-[10px] px-2 py-0.5">
                                                            ⚪ Not Joined
                                                        </Badge>
                                                    )}
                                                </TableCell>

                                                {/* Check In Time */}
                                                <TableCell>
                                                    <div className="text-xs font-semibold">
                                                        {member.checkIn ? formatTimeStr(member.checkIn) : <span className="text-muted-foreground italic font-normal">Not Joined</span>}
                                                    </div>
                                                </TableCell>

                                                {/* Active Work Time */}
                                                <TableCell>
                                                    <div className="text-xs font-bold text-foreground">
                                                        {member.checkIn ? formatDuration(liveWorkMins) : '--'}
                                                    </div>
                                                </TableCell>

                                                {/* Break Status & Duration */}
                                                <TableCell>
                                                    {isOnBreak ? (
                                                        <div className="text-xs text-amber-700 dark:text-amber-300">
                                                            <div className="font-extrabold flex items-center gap-1">
                                                                <Coffee className="h-3 w-3" />
                                                                On Break ({formatDuration(liveBreakMins)})
                                                            </div>
                                                            <div className="text-[11px] text-muted-foreground">
                                                                Started at {formatTimeStr(member.currentBreakStart)}
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="text-xs">
                                                            <div className="text-muted-foreground">
                                                                Total: {formatDuration(member.totalBreakMinutes || 0)}
                                                            </div>
                                                            {member.breaks && member.breaks.length > 0 && (
                                                                <div className="text-[10px] text-muted-foreground">
                                                                    {member.breaks.length} break session{member.breaks.length > 1 ? 's' : ''}
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </TableCell>

                                                {/* Check Out */}
                                                <TableCell>
                                                    <div className="text-xs">
                                                        {isDone ? (
                                                            <span className="font-semibold text-foreground">{formatTimeStr(member.checkOut)}</span>
                                                        ) : member.checkIn ? (
                                                            <span className="text-emerald-600 font-medium">In Shift</span>
                                                        ) : (
                                                            <span className="text-muted-foreground">--</span>
                                                        )}
                                                    </div>
                                                </TableCell>

                                                {/* Active Task */}
                                                <TableCell>
                                                    {member.activeTask ? (
                                                        <div className="text-xs max-w-[180px]">
                                                            <div className="font-medium text-foreground truncate" title={member.activeTask.taskTitle}>
                                                                {member.activeTask.taskTitle}
                                                            </div>
                                                            <div className="text-[10px] text-muted-foreground truncate">
                                                                {member.activeTask.projectName}
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <span className="text-xs text-muted-foreground italic">None</span>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        )
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
