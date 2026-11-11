import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '@/store'
import api from '@/lib/api-client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
    Briefcase, CheckSquare, Clock, Zap,
    Calendar, PlayCircle, StopCircle, Coffee, AlertCircle, ArrowUpRight
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { useAttendance } from '@/hooks/use-attendance'
import { useDashboardMetrics } from '@/hooks/use-dashboard-metrics'
import { UpcomingScheduleWidget } from '@/components/calendar/upcoming-schedule-widget'
import { usePermissions } from '@/hooks/use-permissions'
import { mapTask, mapProject } from '@/lib/mappers'

export function EmployeeDashboardPage() {
    const navigate = useNavigate()
    const { currentUser, projects, tasks, timeEntries, setTasks, setProjects, setTimeEntries } = useAppStore()
    const { canView, loading: permsLoading } = usePermissions()
    const [settings, setSettings] = useState<any>(null)
    const userId = currentUser?.id || (currentUser as any)?._id

    // Confirm modal states
    const [showConfirmModal, setShowConfirmModal] = useState(false)
    const [confirmAction, setConfirmAction] = useState<'break' | 'clock-out' | null>(null)

    const {
        currentTime, attendanceStatus, elapsedTime,
        handleClockIn, handleBreakToggle, handleClockOut, formatElapsedTime
    } = useAttendance(userId)

    const triggerConfirm = (action: 'break' | 'clock-out') => {
        setConfirmAction(action)
        setShowConfirmModal(true)
    }

    const executeConfirm = () => {
        if (confirmAction === 'break') {
            handleBreakToggle()
        } else if (confirmAction === 'clock-out') {
            handleClockOut()
        }
        setShowConfirmModal(false)
        setConfirmAction(null)
    }

    const { myPerformanceScore } = useDashboardMetrics(settings)

    useEffect(() => {
        if (!currentUser) return
        Promise.all([
            api.get('/settings').then(res => setSettings(res.data)).catch(() => { }),
            api.get('/tasks').then(res => { if (Array.isArray(res.data)) setTasks(res.data.map(mapTask)) }).catch(() => { }),
            api.get('/projects').then(res => { if (Array.isArray(res.data)) setProjects(res.data.map(mapProject)) }).catch(() => { }),
            api.get('/time-entries').then(res => { if (Array.isArray(res.data)) setTimeEntries(res.data) }).catch(() => { }),
        ])
    }, [currentUser?.id, (currentUser as any)?._id, setTasks, setProjects, setTimeEntries])

    if (!currentUser) return null;

    // Get layout for employee
    const layoutConfig = settings?.dashboardLayouts?.employee || {
        enabledSections: ['hero', 'session', 'financials', 'operational', 'analytics', 'deadlines', 'tasks'],
        hiddenSubItems: []
    }
    const isDeadlinesEnabled = layoutConfig.enabledSections.includes('deadlines')
    const isTasksEnabled = layoutConfig.enabledSections.includes('tasks')

    const currentUserId = String(userId || '')
    const isDoneTask = (status?: string) => status === 'done' || status === 'completed'
    const myTasks = tasks.filter(t => String(t.assigneeId || '') === currentUserId)

    const now = new Date()
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)

    const myPendingTasks = myTasks.filter(t => !isDoneTask(t.status)).length
    const myTasksDueToday = myTasks.filter(t => {
        if (isDoneTask(t.status) || !t.dueDate) return false
        const d = new Date(t.dueDate)
        return d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    }).length

    const myTaskProjectIds = new Set(myTasks.map(t => String(t.projectId || '')))
    const myActiveProjects = projects.filter(p =>
        !p.status?.includes('completed') &&
        (String(p.pmId || '') === currentUserId ||
            (Array.isArray(p.members) && p.members.map(String).includes(currentUserId)) ||
            myTaskProjectIds.has(String(p.id || (p as any)._id || '')))
    ).length

    const loggedMinutes = (timeEntries || [])
        .filter((e: any) => String(e?.userId?._id || e?.userId || '') === currentUserId)
        .reduce((sum: number, e: any) => sum + (Number(e?.duration) || 0), 0)
    const loggedHoursRounded = Math.round((loggedMinutes / 60) * 10) / 10
    const loggedHoursDisplay = `${loggedHoursRounded.toLocaleString('en-IN', { maximumFractionDigits: 1 })}h`

    const myRecentTasks = [...myTasks]
        .filter(t => !isDoneTask(t.status))
        .sort((a, b) => new Date(a.dueDate || 0).getTime() - new Date(b.dueDate || 0).getTime())
        .slice(0, 8)

    const isTasksViewAllowed = permsLoading ? true : canView('tasks')
    const isAttendanceViewAllowed = permsLoading ? true : canView('attendance')

    const hasPrimaryContent = (isTasksEnabled && isTasksViewAllowed) || !layoutConfig.hiddenSubItems?.includes('mini_stats')

    const metrics = [
        { title: 'My Active Tasks', value: myPendingTasks, icon: CheckSquare, color: '#3b82f6', bg: 'bg-blue-50', link: '/employee/tasks', permissionKey: 'tasks' },
        { title: 'Due Today', value: myTasksDueToday, icon: Calendar, color: '#eab308', bg: 'bg-yellow-50', link: '/employee/tasks?filter=today', permissionKey: 'tasks' },
        { title: 'Assigned Projects', value: myActiveProjects, icon: Briefcase, color: '#8b5cf6', bg: 'bg-purple-50', link: '/employee/projects', permissionKey: 'projects' },
        { title: 'Logged Hours', value: loggedHoursDisplay, icon: Clock, color: '#10b981', bg: 'bg-emerald-50', link: '/employee/time', permissionKey: 'time_tracking' },
    ].filter(m => permsLoading ? true : canView(m.permissionKey))

    const overdueTasks = myTasks
        .filter(t => !isDoneTask(t.status) && t.dueDate && new Date(t.dueDate) < startOfToday)
        .slice(0, 3)

    return (
        <div className="space-y-6 pb-10 min-w-0">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="min-w-0">
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-primary">Employee Panel</h1>
                    <p className="text-sm text-muted-foreground mt-0.5">
                        Welcome back, {currentUser?.name || 'Employee'}. You have {myTasksDueToday} {myTasksDueToday === 1 ? 'task' : 'tasks'} due today.
                    </p>
                </div>
                {isTasksViewAllowed && (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate('/employee/tasks')}
                        className="self-start sm:self-auto shrink-0 font-semibold"
                    >
                        View All Tasks <ArrowUpRight className="ml-1.5 h-4 w-4" />
                    </Button>
                )}
            </div>

            {/* Full-Width KPI Row */}
            {metrics.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                    {metrics.map((m, i) => (
                        <Card
                            key={i}
                            className="cursor-pointer hover:shadow-md transition-all border-l-4 min-w-0"
                            style={{ borderLeftColor: m.color }}
                            onClick={() => navigate(m.link)}
                        >
                            <CardContent className="p-4 sm:p-5">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0 flex-1">
                                        <p className="text-xs font-semibold text-muted-foreground leading-snug truncate" title={m.title}>
                                            {m.title}
                                        </p>
                                        <h3 className="text-2xl font-bold mt-1.5 text-foreground tabular-nums truncate" title={String(m.value)}>
                                            {m.value}
                                        </h3>
                                    </div>
                                    <div className={`p-2.5 rounded-xl shrink-0 ${m.bg}`}>
                                        <m.icon className="h-5 w-5" style={{ color: m.color }} />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Balanced Two-Column Workspace */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Primary Work Column */}
                {hasPrimaryContent && (
                <div className="lg:col-span-8 space-y-6 min-w-0">
                    {/* My Priority Tasks */}
                    {isTasksEnabled && isTasksViewAllowed && (
                        <Card className="min-w-0">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                                <div className="flex items-center gap-2 min-w-0">
                                    <CardTitle className="text-lg">My Priority Tasks</CardTitle>
                                    <Badge variant="secondary" className="text-xs font-bold tabular-nums">
                                        {myPendingTasks}
                                    </Badge>
                                </div>
                                <Button variant="ghost" size="sm" onClick={() => navigate('/employee/tasks')} className="text-xs font-bold shrink-0">
                                    View All <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
                                </Button>
                            </CardHeader>
                            <CardContent>
                                {myRecentTasks.length > 0 ? (
                                    <div className="space-y-2.5">
                                        {myRecentTasks.map(task => {
                                            const projName = projects.find(p => String(p.id || (p as any)._id) === String(task.projectId))?.name || 'General'
                                            const dueObj = task.dueDate ? new Date(task.dueDate) : null
                                            const hasValidDue = dueObj && !isNaN(dueObj.getTime())
                                            return (
                                                <div
                                                    key={task.id}
                                                    onClick={() => navigate(`/employee/tasks/${task.id}`)}
                                                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 border rounded-xl hover:bg-accent/50 transition-colors cursor-pointer"
                                                >
                                                    <div className="flex items-center gap-3 min-w-0 flex-1">
                                                        <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${task.priority === 'urgent' ? 'bg-red-500' : task.priority === 'high' ? 'bg-orange-500' : 'bg-blue-500'}`} />
                                                        <div className="min-w-0 flex-1">
                                                            <p className="font-semibold text-sm truncate text-foreground">{task.title}</p>
                                                            <p className="text-xs text-muted-foreground truncate">{projName}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2.5 shrink-0 pl-5 sm:pl-0">
                                                        <Badge variant="outline" className="capitalize text-xs">
                                                            {(task.status || 'todo').replace('-', ' ')}
                                                        </Badge>
                                                        {hasValidDue && (
                                                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                                                                Due: {dueObj.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                ) : (
                                    <div className="text-center py-8 text-muted-foreground text-sm">
                                        No pending tasks. Good job!
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}

                    {/* Overall Performance HUD */}
                    {!layoutConfig.hiddenSubItems?.includes('mini_stats') && (
                        <div className="bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700/50 rounded-2xl p-5 sm:p-6 relative overflow-hidden group/hud shadow-xl w-full min-w-0">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-[80px] pointer-events-none" />
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-5 relative z-10 gap-4">
                                <div className="flex items-center gap-3.5 min-w-0">
                                    <div className="h-11 w-11 shrink-0 bg-primary/20 rounded-xl flex items-center justify-center text-primary border border-primary/30 shadow-inner">
                                        <Zap className="h-5 w-5 fill-primary/30 animate-pulse" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/80 mb-1">Performance HUD</p>
                                        <h4 className="text-lg sm:text-xl font-black text-white leading-tight">Overall Efficiency Score</h4>
                                    </div>
                                </div>
                                <div className="text-left sm:text-right bg-slate-950/50 px-5 py-2.5 rounded-2xl border border-white/5 shrink-0">
                                    <span className="text-3xl sm:text-4xl font-black text-white tabular-nums tracking-tighter">
                                        {myPerformanceScore ?? 0}
                                        <span className="text-sm text-slate-400 ml-1">/100</span>
                                    </span>
                                </div>
                            </div>

                            <div className="space-y-3 relative z-10">
                                <div className="h-3 w-full bg-slate-950/80 rounded-full overflow-hidden border border-white/5 shadow-inner">
                                    <div
                                        className="h-full bg-gradient-to-r from-rose-500 via-amber-400 to-emerald-500 rounded-full transition-all duration-1000 shadow-[0_0_20px_rgba(16,185,129,0.4)]"
                                        style={{ width: `${Math.max(2, myPerformanceScore ?? 0)}%` }}
                                    />
                                </div>
                                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest px-1">
                                    <span className="flex items-center gap-2 text-slate-400">
                                        <span className={`h-2 w-2 rounded-full ${(myPerformanceScore ?? 0) > 70 ? 'bg-emerald-500' : (myPerformanceScore ?? 0) > 40 ? 'bg-amber-500' : 'bg-rose-500'} animate-pulse`} />
                                        System Active
                                    </span>
                                    <span className="text-primary/70">{(myPerformanceScore ?? 0) > 70 ? 'Optimal' : (myPerformanceScore ?? 0) > 40 ? 'Needs Focus' : 'Critical'}</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
                )}

                {/* Secondary Side Column (Compact, non-stretching cards) */}
                <div className={`${hasPrimaryContent ? 'lg:col-span-4' : 'lg:col-span-12'} space-y-5 min-w-0`}>
                    {/* Attendance Widget */}
                    {isAttendanceViewAllowed && (
                        <Card className="border-l-4 border-l-primary shadow-sm">
                            <CardContent className="p-5">
                                <div className="flex items-center justify-between gap-2 mb-4">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <Clock className="h-5 w-5 text-primary shrink-0" />
                                        <h3 className="font-semibold text-base sm:text-lg truncate">Attendance</h3>
                                    </div>
                                    <Badge variant={attendanceStatus === 'in' ? 'default' : attendanceStatus === 'break' ? 'secondary' : 'outline'} className="capitalize px-2.5 py-0.5 shrink-0">
                                        {attendanceStatus === 'out' ? 'Clocked Out' : attendanceStatus === 'in' ? 'Clocked In' : 'On Break'}
                                    </Badge>
                                </div>

                                <div className="text-center py-3 px-2 bg-muted/30 rounded-xl mb-4">
                                    <div className="text-2xl sm:text-3xl font-mono font-bold tracking-wider">
                                        {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                    </div>
                                    <div className="text-xs sm:text-sm text-muted-foreground mt-1">
                                        {currentTime.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}
                                    </div>
                                </div>

                                {attendanceStatus === 'in' && (
                                    <div className="text-center mb-4">
                                        <span className="text-xs text-muted-foreground uppercase tracking-widest">Session Duration</span>
                                        <div className="text-xl font-mono font-medium text-primary mt-1">
                                            {formatElapsedTime(elapsedTime)}
                                        </div>
                                    </div>
                                )}

                                <div className="grid grid-cols-2 gap-3">
                                    {attendanceStatus === 'out' ? (
                                        <Button className="col-span-2 w-full gap-2 bg-green-600 hover:bg-green-700" onClick={handleClockIn}>
                                            <PlayCircle className="h-5 w-5" />
                                            Clock In
                                        </Button>
                                    ) : attendanceStatus === 'checked-out' ? (
                                        <div className="col-span-2 text-center py-2 text-sm font-medium text-muted-foreground bg-secondary/20 rounded-lg border border-dashed">
                                            Today's shift completed. See you tomorrow!
                                        </div>
                                    ) : (
                                        <>
                                            {attendanceStatus === 'in' ? (
                                                <Button variant="outline" className="gap-2 border-yellow-500 text-yellow-600 hover:bg-yellow-50" onClick={() => triggerConfirm('break')}>
                                                    <Coffee className="h-4 w-4" />
                                                    Take Break
                                                </Button>
                                            ) : attendanceStatus === 'break' ? (
                                                <Button className="gap-2 bg-green-600 hover:bg-green-700" onClick={() => triggerConfirm('break')}>
                                                    <PlayCircle className="h-4 w-4" />
                                                    Resume
                                                </Button>
                                            ) : null}
                                            <Button variant="destructive" className="gap-2" onClick={() => triggerConfirm('clock-out')}>
                                                <StopCircle className="h-4 w-4" />
                                                Clock Out
                                            </Button>
                                        </>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Urgent Tasks */}
                    {isDeadlinesEnabled && isTasksViewAllowed && overdueTasks.length > 0 && !layoutConfig.hiddenSubItems?.includes('overdue') && (
                        <div className="bg-rose-500/5 rounded-2xl p-5 border border-rose-500/15 space-y-3">
                            <div className="flex items-center gap-2">
                                <AlertCircle className="h-4 w-4 text-rose-500 shrink-0" />
                                <h3 className="text-xs font-black uppercase tracking-[0.1em] text-rose-600">Urgent Tasks</h3>
                            </div>
                            <div className="space-y-2.5">
                                {overdueTasks.map((t: any, i: number) => (
                                    <div
                                        key={t.id || i}
                                        onClick={() => navigate(`/employee/tasks/${t.id}`)}
                                        className="bg-card p-3.5 rounded-xl border border-rose-500/15 hover:border-rose-500/35 transition-all cursor-pointer group shadow-xs"
                                    >
                                        <span className="text-xs font-bold line-clamp-1 block mb-1.5 text-foreground">{t.title}</span>
                                        <div className="flex items-center justify-between">
                                            <Badge className="bg-rose-500/10 text-rose-600 border-none text-[9px] px-2 py-0 font-black h-4 uppercase tracking-tight">OVERDUE</Badge>
                                            <ArrowUpRight className="h-3.5 w-3.5 text-rose-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Upcoming Schedule */}
                    <UpcomingScheduleWidget basePath="/employee/calendar" title="My Upcoming Schedule" />
                </div>
            </div>
            {showConfirmModal && createPortal(
                <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-card border border-border/85 w-full max-w-sm rounded-[2rem] pt-5 pb-6 px-6 shadow-2xl relative overflow-hidden flex flex-col items-center text-center animate-in zoom-in-95 duration-200">
                        {confirmAction === 'break' ? (
                            <>
                                <div className="h-16 w-16 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-full flex items-center justify-center mb-4">
                                    <Coffee className="h-8 w-8 animate-pulse" />
                                </div>
                                <h3 className="text-xl font-bold tracking-tight text-foreground mb-2">
                                    {attendanceStatus === 'break' ? 'Resume Session?' : 'Take a Break?'}
                                </h3>
                                <p className="text-xs text-muted-foreground leading-relaxed px-2 mb-6">
                                    {attendanceStatus === 'break'
                                        ? 'Are you ready to resume your active work session timer?'
                                        : 'Are you sure you want to take a break? This will pause your active session timer.'}
                                </p>
                                <div className="flex items-center gap-3 w-full">
                                    <Button variant="outline" className="flex-1 h-12 rounded-2xl font-bold text-xs" onClick={() => setShowConfirmModal(false)}>
                                        Cancel
                                    </Button>
                                    <Button className="flex-1 h-12 rounded-2xl font-bold text-xs bg-amber-500 hover:bg-amber-600 text-white" onClick={executeConfirm}>
                                        Yes, Confirm
                                    </Button>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="h-16 w-16 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-full flex items-center justify-center mb-4">
                                    <StopCircle className="h-8 w-8 animate-pulse" />
                                </div>
                                <h3 className="text-xl font-bold tracking-tight text-foreground mb-2">Clock Out?</h3>
                                <p className="text-xs text-muted-foreground leading-relaxed px-2 mb-6">
                                    Are you sure you want to clock out? This will end your session today and submit your logged hours.
                                </p>
                                <div className="flex items-center gap-3 w-full">
                                    <Button variant="outline" className="flex-1 h-12 rounded-2xl font-bold text-xs" onClick={() => setShowConfirmModal(false)}>
                                        Cancel
                                    </Button>
                                    <Button className="flex-1 h-12 rounded-2xl font-bold text-xs bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-500/20" onClick={executeConfirm}>
                                        Yes, Clock Out
                                    </Button>
                                </div>
                            </>
                        )}
                    </div>
                </div>,
                document.body
            )}
        </div>
    )
}

export default EmployeeDashboardPage
