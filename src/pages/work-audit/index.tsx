import { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { PageSkeleton } from '@/components/ui/page-skeleton'
import {
    Activity,
    AlertTriangle,
    Bug,
    Calendar as CalendarIcon,
    CheckCircle2,
    Clock,
    ClipboardList,
    Download,
    ExternalLink,
    FolderKanban,
    LifeBuoy,
    PhoneCall,
    RefreshCw,
    Search,
    UserCheck,
    UserX,
    Users,
    X,
} from 'lucide-react'
import api from '@/lib/api-client'
import { useAppStore } from '@/store'
import { isAdminOrOwnerRole } from '@/lib/nav-utils'

type PresetKey = 'today' | 'yesterday' | '7days' | 'month' | 'custom'
type CategoryKey =
    | 'all'
    | 'attendance'
    | 'tasks'
    | 'time'
    | 'projects'
    | 'sales'
    | 'bugs'
    | 'tickets'
    | 'calendar'

interface AuditSummary {
    totalEvents: number
    tasksCompleted: number
    tasksCreatedOrUpdated: number
    timeLoggedMinutes: number
    attendancePresentCount: number
    attendanceAbsentOrNoShowCount: number
    overduePendingTasksCount: number
    missedFollowUpsCount: number
}

interface EmployeeAuditSummary {
    userId: string
    name: string
    email: string
    role: string
    designation: string
    department: string
    attendanceStatus: string
    attendanceDaysPresent: number
    checkIn: string | null
    checkOut: string | null
    totalBreakMinutes: number
    timeLoggedMinutes: number
    timeSessionsCount: number
    totalEvents: number
    tasksCreated: number
    tasksCompleted: number
    taskStatusChanges: number
    salesCallsAndFollowups: number
    projectAndBugActions: number
    ticketActions: number
    calendarEventsCount: number
    overdueAssignedTasksCount: number
    pendingAssignedTasksCount: number
    hadAnyActivity: boolean
    highlights: string[]
}

interface InactiveEmployeeItem {
    userId: string
    name: string
    email: string
    role: string
    designation: string
    overdueAssignedTasksCount: number
}

interface OverdueTaskItem {
    id: string
    title: string
    projectName: string
    status: string
    priority: string
    dueDate: string | null
    assigneeId: string
    assigneeName: string
    assigneeRole: string
}

interface MissedFollowUpItem {
    id: string
    leadName: string
    company?: string
    stage?: string
    reminderDate?: string
    assignedTo: string
    assignedToName: string
}

interface TimelineEventItem {
    id: string
    timestamp: string
    category: string
    action: string
    title: string
    description: string
    userId: string
    userName: string
    userRole: string
    projectName?: string
    badge: string
    tone: 'emerald' | 'green' | 'blue' | 'amber' | 'rose' | 'red' | 'purple' | 'slate'
    link?: string
}

interface WorkAuditPayload {
    range: {
        startDate: string
        endDate: string
        preset: string
    }
    summary: AuditSummary
    employeeSummaries: EmployeeAuditSummary[]
    missedOrInactive: {
        noActivityEmployees: InactiveEmployeeItem[]
        overdueOrStuckTasks: OverdueTaskItem[]
        missedFollowUps: MissedFollowUpItem[]
    }
    timeline: TimelineEventItem[]
}

interface StaffOption {
    userId: string
    name: string
    role: string
    designation?: string
}

function formatYmdLocal(date: Date): string {
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
}

function getPresetRange(preset: Exclude<PresetKey, 'custom'>): { startDate: string; endDate: string } {
    const now = new Date()
    if (preset === 'yesterday') {
        const y = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)
        const str = formatYmdLocal(y)
        return { startDate: str, endDate: str }
    }
    if (preset === '7days') {
        const s = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6)
        return { startDate: formatYmdLocal(s), endDate: formatYmdLocal(now) }
    }
    if (preset === 'month') {
        const s = new Date(now.getFullYear(), now.getMonth(), 1)
        const e = new Date(now.getFullYear(), now.getMonth() + 1, 0)
        return { startDate: formatYmdLocal(s), endDate: formatYmdLocal(e) }
    }
    const todayStr = formatYmdLocal(now)
    return { startDate: todayStr, endDate: todayStr }
}

function formatMinutes(minutes: number): string {
    const m = Math.max(0, Math.round(Number(minutes) || 0))
    const h = Math.floor(m / 60)
    const rem = m % 60
    if (h === 0) return `${rem}m`
    return `${h}h ${rem}m`
}

function formatTime(iso?: string | null): string {
    if (!iso) return '—'
    const dt = new Date(iso)
    if (Number.isNaN(dt.getTime())) return '—'
    return dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function formatDateLabel(dateStr?: string | null): string {
    if (!dateStr) return '—'
    const dt = new Date(dateStr)
    if (Number.isNaN(dt.getTime())) return String(dateStr)
    return dt.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })
}

function formatTimelineDateHeader(ymd: string): string {
    const todayStr = formatYmdLocal(new Date())
    const yesterdayDate = new Date()
    yesterdayDate.setDate(yesterdayDate.getDate() - 1)
    const yesterdayStr = formatYmdLocal(yesterdayDate)

    const [y, m, d] = ymd.split('-').map(Number)
    const dt = new Date(y, (m || 1) - 1, d || 1)
    const full = dt.toLocaleDateString(undefined, {
        weekday: 'short',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    })

    if (ymd === todayStr) return `Today — ${full}`
    if (ymd === yesterdayStr) return `Yesterday (Kal) — ${full}`
    return full
}

function getToneClasses(tone: TimelineEventItem['tone']): string {
    switch (tone) {
        case 'emerald':
        case 'green':
            return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
        case 'blue':
            return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800'
        case 'amber':
            return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
        case 'rose':
        case 'red':
            return 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
        case 'purple':
            return 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800'
        default:
            return 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
    }
}

function getCategoryIcon(category: string) {
    switch (category) {
        case 'attendance':
            return <UserCheck className="h-4 w-4 text-emerald-600" />
        case 'tasks':
            return <CheckCircle2 className="h-4 w-4 text-blue-600" />
        case 'time':
            return <Clock className="h-4 w-4 text-indigo-600" />
        case 'projects':
            return <FolderKanban className="h-4 w-4 text-purple-600" />
        case 'bugs':
            return <Bug className="h-4 w-4 text-rose-600" />
        case 'sales':
            return <PhoneCall className="h-4 w-4 text-amber-600" />
        case 'tickets':
            return <LifeBuoy className="h-4 w-4 text-cyan-600" />
        case 'calendar':
            return <CalendarIcon className="h-4 w-4 text-violet-600" />
        default:
            return <Activity className="h-4 w-4 text-slate-600" />
    }
}

const CATEGORY_OPTIONS: Array<{ value: CategoryKey; label: string }> = [
    { value: 'all', label: 'All Categories' },
    { value: 'tasks', label: 'Tasks & Status' },
    { value: 'time', label: 'Time Tracker' },
    { value: 'attendance', label: 'Attendance & Breaks' },
    { value: 'projects', label: 'Projects & Checkpoints' },
    { value: 'bugs', label: 'Bugs & QA' },
    { value: 'sales', label: 'Sales Leads & Follow-ups' },
    { value: 'tickets', label: 'Support Tickets' },
    { value: 'calendar', label: 'Calendar & Meetings' },
]

export function WorkAuditPage() {
    const navigate = useNavigate()
    const { currentUser } = useAppStore()
    const isAdminOrOwner = isAdminOrOwnerRole(currentUser?.role)

    const initialToday = useMemo(() => getPresetRange('today'), [])
    const [preset, setPreset] = useState<PresetKey>('today')
    const [startDate, setStartDate] = useState<string>(initialToday.startDate)
    const [endDate, setEndDate] = useState<string>(initialToday.endDate)
    const [selectedUserId, setSelectedUserId] = useState<string>('all')
    const [category, setCategory] = useState<CategoryKey>('all')
    const [searchQuery, setSearchQuery] = useState<string>('')
    const [activeTab, setActiveTab] = useState<'timeline' | 'employees' | 'missed'>('timeline')

    const [data, setData] = useState<WorkAuditPayload | null>(null)
    const [staffOptions, setStaffOptions] = useState<StaffOption[]>([])
    const [loading, setLoading] = useState<boolean>(true)
    const [refreshing, setRefreshing] = useState<boolean>(false)
    const [error, setError] = useState<string | null>(null)

    const fetchAudit = useCallback(
        async (isManualRefresh = false) => {
            if (!isAdminOrOwner) return
            if (isManualRefresh) {
                setRefreshing(true)
            } else {
                setLoading(true)
            }
            setError(null)
            try {
                const params: Record<string, string> = {
                    preset,
                    startDate,
                    endDate,
                    userId: selectedUserId,
                    category,
                }
                const response = await api.get('/work-audit', { params })
                const payload = response.data as WorkAuditPayload
                setData(payload)

                if (selectedUserId === 'all' && Array.isArray(payload?.employeeSummaries)) {
                    const opts: StaffOption[] = payload.employeeSummaries
                        .map((emp) => ({
                            userId: emp.userId,
                            name: emp.name,
                            role: emp.role,
                            designation: emp.designation,
                        }))
                        .sort((a, b) => a.name.localeCompare(b.name))
                    setStaffOptions(opts)
                }
            } catch (err: any) {
                const message =
                    err?.response?.data?.message || err?.message || 'Failed to load activity log'
                setError(message)
            } finally {
                setLoading(false)
                setRefreshing(false)
            }
        },
        [isAdminOrOwner, preset, startDate, endDate, selectedUserId, category]
    )

    useEffect(() => {
        fetchAudit(false)
    }, [fetchAudit])

    // Populate full staff selector even if initial URL or interaction selected a single employee
    useEffect(() => {
        if (!isAdminOrOwner || staffOptions.length > 0) return
        api.get('/users')
            .then((res) => {
                const list = Array.isArray(res.data) ? res.data : res.data?.users || []
                const filtered: StaffOption[] = list
                    .filter((u: any) => String(u?.role || '').toLowerCase() !== 'client')
                    .map((u: any) => ({
                        userId: String(u._id || u.id),
                        name: u.name || 'Unknown',
                        role: u.role || 'employee',
                        designation: u.designation || '',
                    }))
                    .sort((a: StaffOption, b: StaffOption) => a.name.localeCompare(b.name))
                if (filtered.length > 0) {
                    setStaffOptions(filtered)
                }
            })
            .catch(() => {
                // Fallback handled by initial unfiltered work-audit fetch
            })
    }, [isAdminOrOwner, staffOptions.length])

    const handlePresetSelect = (nextPreset: Exclude<PresetKey, 'custom'>) => {
        const range = getPresetRange(nextPreset)
        setPreset(nextPreset)
        setStartDate(range.startDate)
        setEndDate(range.endDate)
    }

    const handleStartDateChange = (val: string) => {
        if (!val) return
        setPreset('custom')
        setStartDate(val)
        if (!endDate || endDate < val) {
            setEndDate(val)
        }
    }

    const handleEndDateChange = (val: string) => {
        if (!val) return
        setPreset('custom')
        if (val < startDate) {
            setStartDate(val)
        }
        setEndDate(val)
    }

    const handleSingleDatePick = (val: string) => {
        if (!val) return
        setPreset('custom')
        setStartDate(val)
        setEndDate(val)
    }

    const normalizedSearch = searchQuery.trim().toLowerCase()

    const filteredTimeline = useMemo(() => {
        const list = data?.timeline || []
        if (!normalizedSearch) return list
        return list.filter((item) =>
            [item.title, item.description, item.userName, item.userRole, item.projectName, item.badge, item.category]
                .filter(Boolean)
                .some((val) => String(val).toLowerCase().includes(normalizedSearch))
        )
    }, [data?.timeline, normalizedSearch])

    const groupedTimeline = useMemo(() => {
        const groups = new Map<string, TimelineEventItem[]>()
        filteredTimeline.forEach((evt) => {
            const dt = new Date(evt.timestamp)
            const key = Number.isNaN(dt.getTime()) ? startDate : formatYmdLocal(dt)
            if (!groups.has(key)) groups.set(key, [])
            groups.get(key)!.push(evt)
        })
        return Array.from(groups.entries()).sort((a, b) => b[0].localeCompare(a[0]))
    }, [filteredTimeline, startDate])

    const filteredEmployees = useMemo(() => {
        const list = data?.employeeSummaries || []
        if (!normalizedSearch) return list
        return list.filter((emp) =>
            [emp.name, emp.email, emp.role, emp.designation, emp.department, ...emp.highlights]
                .filter(Boolean)
                .some((val) => String(val).toLowerCase().includes(normalizedSearch))
        )
    }, [data?.employeeSummaries, normalizedSearch])

    const filteredInactiveEmployees = useMemo(() => {
        const list = data?.missedOrInactive?.noActivityEmployees || []
        if (!normalizedSearch) return list
        return list.filter((emp) =>
            [emp.name, emp.email, emp.role, emp.designation]
                .filter(Boolean)
                .some((val) => String(val).toLowerCase().includes(normalizedSearch))
        )
    }, [data?.missedOrInactive?.noActivityEmployees, normalizedSearch])

    const filteredOverdueTasks = useMemo(() => {
        const list = data?.missedOrInactive?.overdueOrStuckTasks || []
        if (!normalizedSearch) return list
        return list.filter((t) =>
            [t.title, t.projectName, t.assigneeName, t.status, t.priority]
                .filter(Boolean)
                .some((val) => String(val).toLowerCase().includes(normalizedSearch))
        )
    }, [data?.missedOrInactive?.overdueOrStuckTasks, normalizedSearch])

    const filteredMissedFollowUps = useMemo(() => {
        const list = data?.missedOrInactive?.missedFollowUps || []
        if (!normalizedSearch) return list
        return list.filter((f) =>
            [f.leadName, f.company, f.stage, f.assignedToName]
                .filter(Boolean)
                .some((val) => String(val).toLowerCase().includes(normalizedSearch))
        )
    }, [data?.missedOrInactive?.missedFollowUps, normalizedSearch])

    const totalMissedItems =
        filteredInactiveEmployees.length + filteredOverdueTasks.length + filteredMissedFollowUps.length

    const handleExportCsv = () => {
        const escapeCsv = (val: unknown) => `"${String(val ?? '').replace(/"/g, '""')}"`

        if (activeTab === 'employees') {
            const headers = [
                'Employee',
                'Role',
                'Department',
                'Status',
                'Attendance Status',
                'Check In',
                'Check Out',
                'Time Logged',
                'Total Events',
                'Tasks Completed',
                'Tasks Created/Updated',
                'Sales Actions',
                'Project & Bug Actions',
                'Tickets',
                'Calendar Events',
                'Overdue Tasks',
            ]
            const rows = filteredEmployees.map((e) => [
                e.name,
                e.role,
                e.department || '',
                e.hadAnyActivity ? 'Active' : 'No Activity',
                e.attendanceStatus,
                formatTime(e.checkIn),
                formatTime(e.checkOut),
                formatMinutes(e.timeLoggedMinutes),
                e.totalEvents,
                e.tasksCompleted,
                e.tasksCreated + e.taskStatusChanges,
                e.salesCallsAndFollowups,
                e.projectAndBugActions,
                e.ticketActions,
                e.calendarEventsCount,
                e.overdueAssignedTasksCount,
            ])
            const csv = [headers.map(escapeCsv).join(','), ...rows.map((r) => r.map(escapeCsv).join(','))].join('\n')
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `employee-summary-${startDate}-to-${endDate}.csv`
            a.click()
            URL.revokeObjectURL(url)
            return
        }

        const headers = ['Date & Time', 'Employee', 'Role', 'Category', 'Badge', 'Title', 'Project', 'Details']
        const rows = filteredTimeline.map((evt) => [
            new Date(evt.timestamp).toLocaleString(),
            evt.userName,
            evt.userRole,
            evt.category,
            evt.badge,
            evt.title,
            evt.projectName || '',
            evt.description,
        ])
        const csv = [headers.map(escapeCsv).join(','), ...rows.map((r) => r.map(escapeCsv).join(','))].join('\n')
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `work-audit-timeline-${startDate}-to-${endDate}.csv`
        a.click()
        URL.revokeObjectURL(url)
    }

    if (!isAdminOrOwner) {
        return (
            <div className="p-6">
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                        <AlertTriangle className="mb-3 h-10 w-10 text-amber-500" />
                        <h2 className="text-lg font-semibold">Admin Access Required</h2>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Employee Activity Log is restricted to Workspace Owners and Administrators.
                        </p>
                    </CardContent>
                </Card>
            </div>
        )
    }

    if (loading && !data) {
        return <PageSkeleton />
    }

    const summary = data?.summary || {
        totalEvents: 0,
        tasksCompleted: 0,
        tasksCreatedOrUpdated: 0,
        timeLoggedMinutes: 0,
        attendancePresentCount: 0,
        attendanceAbsentOrNoShowCount: 0,
        overduePendingTasksCount: 0,
        missedFollowUpsCount: 0,
    }

    const selectedStaffName =
        selectedUserId === 'all'
            ? null
            : staffOptions.find((s) => s.userId === selectedUserId)?.name || 'Selected Employee'

    return (
        <div className="space-y-6 p-4 md:p-6 min-w-0">
            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                        <ClipboardList className="h-6 w-6 text-primary shrink-0" />
                        <h1 className="text-2xl font-bold tracking-tight">Employee Activity Log</h1>
                        <Badge variant="outline" className="text-xs font-medium">
                            Admin Only
                        </Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Track what every employee did or missed across Attendance, Tasks, Time Logs, Projects, Bugs, Sales & Tickets for any date.
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fetchAudit(true)}
                        disabled={refreshing}
                    >
                        <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleExportCsv}
                        disabled={!data}
                    >
                        <Download className="mr-2 h-4 w-4" />
                        Export CSV
                    </Button>
                </div>
            </div>

            {/* Filters Bar */}
            <Card>
                <CardContent className="p-4 space-y-4">
                    <div className="flex flex-wrap items-center gap-2">
                        <Button
                            size="sm"
                            variant={preset === 'today' ? 'default' : 'outline'}
                            onClick={() => handlePresetSelect('today')}
                        >
                            Today
                        </Button>
                        <Button
                            size="sm"
                            variant={preset === 'yesterday' ? 'default' : 'outline'}
                            onClick={() => handlePresetSelect('yesterday')}
                        >
                            Yesterday (Kal)
                        </Button>
                        <Button
                            size="sm"
                            variant={preset === '7days' ? 'default' : 'outline'}
                            onClick={() => handlePresetSelect('7days')}
                        >
                            Last 7 Days
                        </Button>
                        <Button
                            size="sm"
                            variant={preset === 'month' ? 'default' : 'outline'}
                            onClick={() => handlePresetSelect('month')}
                        >
                            This Month
                        </Button>
                        <div className="ml-auto flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            <span>Range:</span>
                            <Badge variant="secondary" className="font-mono">
                                {startDate === endDate ? startDate : `${startDate} → ${endDate}`}
                            </Badge>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-12">
                        <div className="lg:col-span-2 min-w-0">
                            <label className="mb-1 block text-xs font-medium text-muted-foreground">
                                Exact Single Date
                            </label>
                            <Input
                                type="date"
                                value={startDate === endDate ? startDate : ''}
                                onChange={(e) => handleSingleDatePick(e.target.value)}
                                title="Pick a single day (e.g. yesterday or any specific date)"
                            />
                        </div>
                        <div className="lg:col-span-2 min-w-0">
                            <label className="mb-1 block text-xs font-medium text-muted-foreground">
                                From Date
                            </label>
                            <Input
                                type="date"
                                value={startDate}
                                onChange={(e) => handleStartDateChange(e.target.value)}
                            />
                        </div>
                        <div className="lg:col-span-2 min-w-0">
                            <label className="mb-1 block text-xs font-medium text-muted-foreground">
                                To Date
                            </label>
                            <Input
                                type="date"
                                value={endDate}
                                onChange={(e) => handleEndDateChange(e.target.value)}
                            />
                        </div>
                        <div className="lg:col-span-2 min-w-0">
                            <label className="mb-1 block text-xs font-medium text-muted-foreground">
                                Employee
                            </label>
                            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="All Employees" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Employees ({staffOptions.length})</SelectItem>
                                    {staffOptions.map((u) => (
                                        <SelectItem key={u.userId} value={u.userId}>
                                            {u.name} ({u.role})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="lg:col-span-2 min-w-0">
                            <label className="mb-1 block text-xs font-medium text-muted-foreground">
                                Module / Category
                            </label>
                            <Select value={category} onValueChange={(v) => setCategory(v as CategoryKey)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="All Categories" />
                                </SelectTrigger>
                                <SelectContent>
                                    {CATEGORY_OPTIONS.map((opt) => (
                                        <SelectItem key={opt.value} value={opt.value}>
                                            {opt.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="lg:col-span-2 min-w-0">
                            <label className="mb-1 block text-xs font-medium text-muted-foreground">
                                Search
                            </label>
                            <div className="relative">
                                <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Task, lead, staff..."
                                    className="pl-8"
                                />
                            </div>
                        </div>
                    </div>

                    {selectedStaffName && (
                        <div className="flex flex-wrap items-center gap-2 pt-1">
                            <span className="text-xs text-muted-foreground">Filtered by employee:</span>
                            <Badge variant="secondary" className="gap-1.5">
                                {selectedStaffName}
                                <button
                                    type="button"
                                    onClick={() => setSelectedUserId('all')}
                                    className="rounded-full hover:bg-muted p-0.5"
                                    aria-label="Clear employee filter"
                                >
                                    <X className="h-3 w-3" />
                                </button>
                            </Badge>
                        </div>
                    )}
                </CardContent>
            </Card>

            {error && (
                <Card className="border-destructive/50 bg-destructive/5">
                    <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                        <div className="flex items-center gap-2 text-sm text-destructive">
                            <AlertTriangle className="h-4 w-4 shrink-0" />
                            <span>{error}</span>
                        </div>
                        <Button size="sm" variant="outline" onClick={() => fetchAudit(true)}>
                            Retry
                        </Button>
                    </CardContent>
                </Card>
            )}

            {/* KPI Summary Cards */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <Card className="min-w-0">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Recorded Activities
                        </CardTitle>
                        <Activity className="h-4 w-4 text-primary shrink-0" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{summary.totalEvents}</div>
                        <p className="mt-1 text-xs text-muted-foreground">
                            {summary.attendancePresentCount} present · {startDate === endDate ? startDate : `${startDate} to ${endDate}`}
                        </p>
                    </CardContent>
                </Card>

                <Card className="min-w-0">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Tasks Completed
                        </CardTitle>
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{summary.tasksCompleted}</div>
                        <p className="mt-1 text-xs text-muted-foreground">
                            {summary.tasksCreatedOrUpdated} task creations / status updates
                        </p>
                    </CardContent>
                </Card>

                <Card className="min-w-0">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Time Logged
                        </CardTitle>
                        <Clock className="h-4 w-4 text-blue-600 shrink-0" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatMinutes(summary.timeLoggedMinutes)}</div>
                        <p className="mt-1 text-xs text-muted-foreground">
                            Tracked work sessions in selected range
                        </p>
                    </CardContent>
                </Card>

                <Card className="min-w-0">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Gaps & Pending Work
                        </CardTitle>
                        <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {summary.attendanceAbsentOrNoShowCount} Inactive
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                            {summary.overduePendingTasksCount} overdue tasks · {summary.missedFollowUpsCount} missed follow-ups
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Main Tabs */}
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="space-y-4">
                <TabsList className="flex flex-wrap h-auto gap-1 w-full sm:w-fit">
                    <TabsTrigger value="timeline" className="gap-2">
                        <Activity className="h-4 w-4" />
                        <span>Chronological Timeline</span>
                        <Badge variant="secondary" className="ml-1 text-xs">
                            {filteredTimeline.length}
                        </Badge>
                    </TabsTrigger>
                    <TabsTrigger value="employees" className="gap-2">
                        <Users className="h-4 w-4" />
                        <span>Employee Breakdown</span>
                        <Badge variant="secondary" className="ml-1 text-xs">
                            {filteredEmployees.length}
                        </Badge>
                    </TabsTrigger>
                    <TabsTrigger value="missed" className="gap-2">
                        <AlertTriangle className="h-4 w-4" />
                        <span>Missed / Pending Work</span>
                        <Badge
                            variant={totalMissedItems > 0 ? 'destructive' : 'secondary'}
                            className="ml-1 text-xs"
                        >
                            {totalMissedItems}
                        </Badge>
                    </TabsTrigger>
                </TabsList>

                {/* Tab 1: Chronological Timeline */}
                <TabsContent value="timeline" className="space-y-4">
                    {groupedTimeline.length === 0 ? (
                        <Card>
                            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                                <ClipboardList className="mb-3 h-10 w-10 text-muted-foreground/60" />
                                <h3 className="text-base font-semibold">No Activity Found</h3>
                                <p className="mt-1 max-w-md text-sm text-muted-foreground">
                                    No employee activity was recorded for {startDate === endDate ? startDate : `${startDate} to ${endDate}`} with the current filters. Check the &ldquo;Missed / Pending Work&rdquo; tab to see inactive staff and overdue tasks.
                                </p>
                            </CardContent>
                        </Card>
                    ) : (
                        groupedTimeline.map(([dateKey, events]) => (
                            <Card key={dateKey} className="min-w-0 overflow-hidden">
                                <CardHeader className="border-b bg-muted/30 py-3 px-4">
                                    <div className="flex items-center justify-between gap-2">
                                        <CardTitle className="text-sm font-semibold">
                                            {formatTimelineDateHeader(dateKey)}
                                        </CardTitle>
                                        <Badge variant="outline" className="text-xs">
                                            {events.length} {events.length === 1 ? 'event' : 'events'}
                                        </Badge>
                                    </div>
                                </CardHeader>
                                <CardContent className="divide-y p-0">
                                    {events.map((evt) => (
                                        <div
                                            key={evt.id}
                                            className="flex flex-col gap-2 p-4 transition-colors hover:bg-muted/30 sm:flex-row sm:items-start sm:justify-between"
                                        >
                                            <div className="flex min-w-0 items-start gap-3">
                                                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border bg-background">
                                                    {getCategoryIcon(evt.category)}
                                                </div>
                                                <div className="min-w-0 space-y-1">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <span className="font-medium text-sm text-foreground break-words">
                                                            {evt.title}
                                                        </span>
                                                        <span
                                                            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${getToneClasses(
                                                                evt.tone
                                                            )}`}
                                                        >
                                                            {evt.badge}
                                                        </span>
                                                        {evt.projectName && (
                                                            <Badge variant="outline" className="text-[11px]">
                                                                {evt.projectName}
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    {evt.description && (
                                                        <p className="text-xs text-muted-foreground break-words">
                                                            {evt.description}
                                                        </p>
                                                    )}
                                                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                if (evt.userId) setSelectedUserId(evt.userId)
                                                            }}
                                                            className="font-medium text-foreground hover:underline"
                                                        >
                                                            {evt.userName}
                                                        </button>
                                                        {evt.userRole && (
                                                            <span className="capitalize">({evt.userRole})</span>
                                                        )}
                                                        <span>•</span>
                                                        <span className="capitalize">{evt.category}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex shrink-0 items-center gap-2 pl-11 sm:pl-0">
                                                <span className="font-mono text-xs text-muted-foreground">
                                                    {formatTime(evt.timestamp)}
                                                </span>
                                                {evt.link && (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-7 px-2 text-xs"
                                                        onClick={() => navigate(evt.link!)}
                                                    >
                                                        Open
                                                        <ExternalLink className="ml-1 h-3 w-3" />
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </CardContent>
                            </Card>
                        ))
                    )}
                </TabsContent>

                {/* Tab 2: Employee Breakdown */}
                <TabsContent value="employees" className="space-y-4">
                    <Card className="min-w-0 overflow-hidden">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base">Employee-Wise Activity Summary</CardTitle>
                            <CardDescription>
                                Click any employee row to filter the chronological timeline to that employee&apos;s exact actions.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-y bg-muted/40 text-left text-xs font-medium text-muted-foreground">
                                            <th className="py-3 px-4">Employee</th>
                                            <th className="py-3 px-3">Status</th>
                                            <th className="py-3 px-3">Attendance</th>
                                            <th className="py-3 px-3">Time Logged</th>
                                            <th className="py-3 px-3">Tasks</th>
                                            <th className="py-3 px-3">Projects / Bugs</th>
                                            <th className="py-3 px-3">Sales / Tickets</th>
                                            <th className="py-3 px-3">Overdue</th>
                                            <th className="py-3 px-4 text-right">Events</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {filteredEmployees.length === 0 ? (
                                            <tr>
                                                <td colSpan={9} className="py-10 text-center text-muted-foreground">
                                                    No staff records match your current filter.
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredEmployees.map((emp) => (
                                                <tr
                                                    key={emp.userId}
                                                    onClick={() => {
                                                        setSelectedUserId(emp.userId)
                                                        setActiveTab('timeline')
                                                    }}
                                                    className="cursor-pointer transition-colors hover:bg-muted/40"
                                                >
                                                    <td className="py-3 px-4">
                                                        <div className="font-medium text-foreground">{emp.name}</div>
                                                        <div className="text-xs text-muted-foreground capitalize">
                                                            {emp.designation || emp.role}
                                                            {emp.department ? ` · ${emp.department}` : ''}
                                                        </div>
                                                    </td>
                                                    <td className="py-3 px-3">
                                                        {emp.hadAnyActivity ? (
                                                            <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white">
                                                                Active
                                                            </Badge>
                                                        ) : (
                                                            <Badge variant="outline" className="border-rose-300 text-rose-600">
                                                                No Activity
                                                            </Badge>
                                                        )}
                                                    </td>
                                                    <td className="py-3 px-3 text-xs">
                                                        {emp.attendanceDaysPresent > 0 ? (
                                                            <div>
                                                                <span className="font-medium text-foreground capitalize">
                                                                    {emp.attendanceStatus}
                                                                </span>
                                                                <div className="text-muted-foreground">
                                                                    {formatTime(emp.checkIn)} – {formatTime(emp.checkOut)}
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <span className="text-rose-600 font-medium">No Check-In</span>
                                                        )}
                                                    </td>
                                                    <td className="py-3 px-3 text-xs">
                                                        <div className="font-medium">{formatMinutes(emp.timeLoggedMinutes)}</div>
                                                        <div className="text-muted-foreground">
                                                            {emp.timeSessionsCount} sessions
                                                        </div>
                                                    </td>
                                                    <td className="py-3 px-3 text-xs">
                                                        <div>
                                                            <span className="font-medium text-emerald-600">
                                                                {emp.tasksCompleted} done
                                                            </span>
                                                        </div>
                                                        <div className="text-muted-foreground">
                                                            {emp.tasksCreated} created · {emp.taskStatusChanges} updates
                                                        </div>
                                                    </td>
                                                    <td className="py-3 px-3 text-xs">
                                                        <div className="font-medium">{emp.projectAndBugActions} actions</div>
                                                        <div className="text-muted-foreground">
                                                            {emp.calendarEventsCount} calendar
                                                        </div>
                                                    </td>
                                                    <td className="py-3 px-3 text-xs">
                                                        <div>{emp.salesCallsAndFollowups} sales</div>
                                                        <div className="text-muted-foreground">
                                                            {emp.ticketActions} tickets
                                                        </div>
                                                    </td>
                                                    <td className="py-3 px-3 text-xs">
                                                        {emp.overdueAssignedTasksCount > 0 ? (
                                                            <Badge variant="destructive" className="text-[11px]">
                                                                {emp.overdueAssignedTasksCount} overdue
                                                            </Badge>
                                                        ) : (
                                                            <span className="text-muted-foreground">0</span>
                                                        )}
                                                    </td>
                                                    <td className="py-3 px-4 text-right font-semibold">
                                                        {emp.totalEvents}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Tab 3: Kya Nahi Hua (Missed / Pending Work) */}
                <TabsContent value="missed" className="space-y-4">
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                        {/* Inactive / No-Show Employees */}
                        <Card className="min-w-0">
                            <CardHeader className="pb-3">
                                <div className="flex items-center justify-between gap-2">
                                    <CardTitle className="flex items-center gap-2 text-base">
                                        <UserX className="h-4 w-4 text-rose-600" />
                                        No-Activity Staff
                                    </CardTitle>
                                    <Badge variant={filteredInactiveEmployees.length > 0 ? 'destructive' : 'secondary'}>
                                        {filteredInactiveEmployees.length}
                                    </Badge>
                                </div>
                                <CardDescription>
                                    Employees with zero check-in, time log, or work activity in this range
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-2 max-h-[420px] overflow-y-auto">
                                {filteredInactiveEmployees.length === 0 ? (
                                    <div className="py-8 text-center text-sm text-muted-foreground">
                                        All matching staff showed recorded activity.
                                    </div>
                                ) : (
                                    filteredInactiveEmployees.map((emp) => (
                                        <div
                                            key={emp.userId}
                                            className="flex items-center justify-between gap-2 rounded-lg border p-3"
                                        >
                                            <div className="min-w-0">
                                                <p className="truncate text-sm font-medium">{emp.name}</p>
                                                <p className="truncate text-xs text-muted-foreground capitalize">
                                                    {emp.designation || emp.role}
                                                </p>
                                            </div>
                                            {emp.overdueAssignedTasksCount > 0 && (
                                                <Badge variant="destructive" className="shrink-0 text-[11px]">
                                                    {emp.overdueAssignedTasksCount} overdue
                                                </Badge>
                                            )}
                                        </div>
                                    ))
                                )}
                            </CardContent>
                        </Card>

                        {/* Overdue / Pending Tasks */}
                        <Card className="min-w-0">
                            <CardHeader className="pb-3">
                                <div className="flex items-center justify-between gap-2">
                                    <CardTitle className="flex items-center gap-2 text-base">
                                        <AlertTriangle className="h-4 w-4 text-amber-600" />
                                        Overdue Tasks
                                    </CardTitle>
                                    <Badge variant={filteredOverdueTasks.length > 0 ? 'destructive' : 'secondary'}>
                                        {filteredOverdueTasks.length}
                                    </Badge>
                                </div>
                                <CardDescription>
                                    Tasks whose due date fell on or before {endDate} and are still not Done
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-2 max-h-[420px] overflow-y-auto">
                                {filteredOverdueTasks.length === 0 ? (
                                    <div className="py-8 text-center text-sm text-muted-foreground">
                                        No overdue tasks pending in this selection.
                                    </div>
                                ) : (
                                    filteredOverdueTasks.map((task) => (
                                        <button
                                            type="button"
                                            key={task.id}
                                            onClick={() => navigate(`/tasks/${task.id}`)}
                                            className="w-full text-left rounded-lg border p-3 transition-colors hover:bg-muted/40"
                                        >
                                            <div className="flex items-start justify-between gap-2">
                                                <p className="text-sm font-medium line-clamp-1">{task.title}</p>
                                                <Badge variant="outline" className="shrink-0 text-[10px] uppercase">
                                                    {task.priority || 'medium'}
                                                </Badge>
                                            </div>
                                            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                                <span>{task.assigneeName}</span>
                                                <span>•</span>
                                                <span>{task.projectName}</span>
                                                <span>•</span>
                                                <span className="text-rose-600 font-medium">
                                                    Due {formatDateLabel(task.dueDate)}
                                                </span>
                                            </div>
                                        </button>
                                    ))
                                )}
                            </CardContent>
                        </Card>

                        {/* Missed Lead Follow-ups */}
                        <Card className="min-w-0">
                            <CardHeader className="pb-3">
                                <div className="flex items-center justify-between gap-2">
                                    <CardTitle className="flex items-center gap-2 text-base">
                                        <PhoneCall className="h-4 w-4 text-orange-600" />
                                        Missed Lead Follow-ups
                                    </CardTitle>
                                    <Badge variant={filteredMissedFollowUps.length > 0 ? 'destructive' : 'secondary'}>
                                        {filteredMissedFollowUps.length}
                                    </Badge>
                                </div>
                                <CardDescription>
                                    Scheduled lead reminders not completed up to {endDate}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-2 max-h-[420px] overflow-y-auto">
                                {filteredMissedFollowUps.length === 0 ? (
                                    <div className="py-8 text-center text-sm text-muted-foreground">
                                        No missed lead follow-ups in this selection.
                                    </div>
                                ) : (
                                    filteredMissedFollowUps.map((lead) => (
                                        <button
                                            type="button"
                                            key={lead.id}
                                            onClick={() => navigate('/leads')}
                                            className="w-full text-left rounded-lg border p-3 transition-colors hover:bg-muted/40"
                                        >
                                            <div className="flex items-start justify-between gap-2">
                                                <p className="text-sm font-medium line-clamp-1">{lead.leadName}</p>
                                                {lead.stage && (
                                                    <Badge variant="outline" className="shrink-0 text-[10px]">
                                                        {lead.stage}
                                                    </Badge>
                                                )}
                                            </div>
                                            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                                <span>{lead.assignedToName}</span>
                                                {lead.company && (
                                                    <>
                                                        <span>•</span>
                                                        <span>{lead.company}</span>
                                                    </>
                                                )}
                                                <span>•</span>
                                                <span className="text-amber-700 font-medium">
                                                    {formatDateLabel(lead.reminderDate)}
                                                </span>
                                            </div>
                                        </button>
                                    ))
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    )
}

export default WorkAuditPage
