import { useState, useEffect } from 'react'
import api from '@/lib/api-client'
import { mapLead, mapProject, mapInvoice, mapExpense, mapTask, mapUser } from '@/lib/mappers'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '@/store'
import { Button } from '@/components/ui/button'
import {
    CheckSquare, Clock, Briefcase, Banknote, TrendingUp, TrendingDown, AlertCircle, PlayCircle,
    StopCircle, Target, Layers, Wallet, CreditCard, Coffee, ArrowUpRight, Zap, LayoutDashboard,
    CheckCircle, MessageSquare, Rocket, FileText, Users, Shield, Globe, Server, XCircle, BellRing
} from 'lucide-react'
import { Progress } from '@/components/ui/progress'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { formatCurrency, getInitials } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    Cell, PieChart, Pie
} from 'recharts'
import { Card } from '@/components/ui/card'
import { WelcomeAnimation } from '@/components/welcome-animation'
import { useAttendance } from '@/hooks/use-attendance'
import { useDashboardMetrics } from '@/hooks/use-dashboard-metrics'

export function DashboardPage() {
    const navigate = useNavigate()
    const { currentUser, leads, setLeads, setExpenses, setProjects, setInvoices, setTasks, invoices, setTickets, users } = useAppStore()
    const [settings, setSettings] = useState<any>(null)
    const [todayAttendance, setTodayAttendance] = useState<any[]>([])
    const [amcStats, setAmcStats] = useState<any>(null)
    const [domainStats, setDomainStats] = useState<any>(null)
    const [expirySummary, setExpirySummary] = useState<any>(null)
    const userId = currentUser?.id || (currentUser as any)?._id

    // Hooks for business logic
    const {
        currentTime, attendanceStatus, elapsedTime,
        handleClockIn, handleBreakToggle, handleClockOut, formatElapsedTime
    } = useAttendance(userId)

    const {
        totalRevenue, totalExpenses, netProfit, outstandingInvoices,
        relevantTasks, winRate,
        revenueData, leadStatusData, healthMetrics, recentActivities,
        revenueTrend, expenseTrend,
        completedProjects, inProgressProjects, onHoldProjects, planningProjects,
        todoTasks, inProgressTasks, reviewTasks, doneTasks,
        totalProjectCost,
        currentLayout, sectionOrder, customLabels, hiddenSubItems,
        myPerformanceScore,
        openTickets, resolvedTickets, criticalTickets,
        relevantProjects,
        relevantInvoices
    } = useDashboardMetrics(settings)

    // Loading state guard
    if (!currentUser) {
        return (
            <div className="h-[80vh] w-full flex flex-col items-center justify-center space-y-4 animate-pulse">
                <div className="h-16 w-16 rounded-2xl bg-muted" />
                <div className="h-4 w-48 bg-muted rounded-full" />
                <p className="text-xs font-bold uppercase tracking-[0.1em] text-muted-foreground">Syncing Enterprise Data...</p>
            </div>
        )
    }

    // Data Fetching
    useEffect(() => {
        const loadInitialData = async () => {
            try {
                const [settingsRes] = await Promise.all([
                    api.get('/settings').catch(() => ({ data: null })),
                    api.get('/leads').then(res => { if (Array.isArray(res.data)) setLeads(res.data.map(mapLead)) }).catch(err => console.error(err)),
                    api.get('/expenses').then(res => { if (Array.isArray(res.data)) setExpenses(res.data.map(mapExpense)) }).catch(err => console.error(err)),
                    api.get('/projects').then(res => { if (Array.isArray(res.data)) setProjects(res.data.map(mapProject)) }).catch(err => console.error(err)),
                    api.get('/invoices').then(res => { if (Array.isArray(res.data)) setInvoices(res.data.map(mapInvoice)) }).catch(err => console.error(err)),
                    api.get('/tasks').then(res => { if (Array.isArray(res.data)) setTasks(res.data.map(mapTask)) }).catch(err => console.error(err)),
                    api.get('/users').then(res => { if (Array.isArray(res.data)) useAppStore.getState().setUsers(res.data.map(mapUser)) }).catch(err => console.error(err)),
                    api.get('/time-entries').then(res => { if (Array.isArray(res.data)) useAppStore.getState().setTimeEntries(res.data) }).catch(err => console.error(err)),
                    api.get('/tickets').then(res => { if (Array.isArray(res.data)) setTickets(res.data) }).catch(err => console.error(err)),
                    api.get(`/attendance/monthly?month=${new Date().getMonth()}&year=${new Date().getFullYear()}`).then(res => setTodayAttendance(res.data)).catch(err => console.error(err)),
                    api.get('/amc/stats/summary').then(res => setAmcStats(res.data)).catch(() => null),
                    api.get('/domains/stats/summary').then(res => setDomainStats(res.data)).catch(() => null),
                    api.get('/expiry-alerts').then(res => setExpirySummary(res.data.summary)).catch(() => null)
                ])
                if (settingsRes?.data) setSettings(settingsRes.data)
            } catch (error) {
                console.error("Dashboard Load Error", error)
            }
        }
        loadInitialData()
    }, [setLeads, setExpenses, setProjects, setInvoices, setTasks])

    const StatCard = ({ label, value, trend, icon: Icon, color, bg, onClick, className }: any) => {
        return (
            <div
                className={`group relative bg-card/60 backdrop-blur-sm border border-border/40 hover:border-primary/40 p-5 rounded-[1.5rem] transition-all duration-500 hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] active:scale-[0.98] cursor-pointer overflow-hidden ${className || ''}`}
                onClick={onClick}
            >
                <div className="flex justify-between items-start mb-4">
                    <div className={`p-3 rounded-2xl ${bg} ${color} shadow-sm group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500`}>
                        <Icon className="h-6 w-6" />
                    </div>
                    {trend && (
                        <div className={`flex items-center gap-1 text-[10px] font-black px-2 py-1 rounded-lg border ${!trend.includes('-') ? 'text-emerald-600 bg-emerald-50 border-emerald-100' : 'text-rose-600 bg-rose-50 border-rose-100'}`}>
                            {!trend.includes('-') ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                            {trend}
                        </div>
                    )}
                </div>
                <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">{label}</p>
                    <div className="flex items-end justify-between">
                        <h3 className="text-3xl font-bold tracking-tight text-foreground leading-none">{value}</h3>
                        <ArrowUpRight className="h-4 w-4 text-muted-foreground/30 mb-0.5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                    </div>
                </div>
            </div>
        )
    }

    const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444']

    return (
        <div className="max-w-[1700px] mx-auto space-y-4 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-700 font-sans">

            {/* 1. Header & Command Hub */}
            {(currentLayout.includes('hero') || currentLayout.includes('session')) && (
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-stretch">
                    {/* Brand Hero */}
                    {currentLayout.includes('hero') && (
                        <div className={`${currentLayout.includes('session') ? 'xl:col-span-8' : 'xl:col-span-12'} bg-slate-950 rounded-[3rem] p-10 text-white relative overflow-hidden shadow-2xl group border border-white/5`}>
                            <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/20 rounded-full -mr-48 -mt-48 blur-[120px] animate-pulse" />
                            <div className="absolute bottom-0 left-0 w-80 h-80 bg-indigo-600/10 rounded-full -ml-20 -mb-20 blur-[100px]" />

                            <div className="relative z-10 h-full flex flex-col justify-between">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                    <div className="flex items-center gap-5">
                                        <div className="h-16 w-16 rounded-2xl bg-white/5 backdrop-blur-xl flex items-center justify-center border border-white/10 shadow-inner group-hover:rotate-12 transition-transform duration-700">
                                            <WelcomeAnimation />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-3">
                                                <h1 className="text-4xl font-bold tracking-tight">{customLabels.hero || 'Dashboard'}</h1>
                                                <Badge className="bg-primary hover:bg-primary border-none text-[9px] h-5 px-2 font-black tracking-widest uppercase">System Active</Badge>
                                            </div>
                                            {!hiddenSubItems.includes('welcome_msg') && (
                                                <p className="text-slate-400 font-medium mt-1 text-sm">Welcome back, <span className="text-white font-bold">{currentUser.name}</span>. Here's your workspace today.</p>
                                            )}
                                        </div>
                                    </div>

                                </div>

                                {!hiddenSubItems.includes('mini_stats') && (
                                    <div className="mt-6 pt-6 border-t border-white/5">
                                        {['owner', 'admin'].includes(currentUser.role) ? (
                                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                                {[
                                                    { label: 'Revenue Net', value: formatCurrency(netProfit), color: 'from-emerald-400 to-teal-500', onClick: () => navigate('/invoices') },
                                                    { label: 'Project Success', value: `${winRate}%`, color: 'from-blue-400 to-indigo-500', onClick: () => navigate('/projects') },
                                                    { label: 'Active Projects', value: inProgressProjects, color: 'from-indigo-400 to-purple-500', onClick: () => navigate('/projects?status=in-progress') },
                                                    { label: 'Project Portfolio', value: formatCurrency(totalProjectCost || 0), color: 'from-rose-400 to-orange-500', onClick: () => navigate('/projects') },
                                                ].map((item, i) => (
                                                    <div key={i} className="group/item relative p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all cursor-pointer" onClick={item.onClick}>
                                                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1 block">{item.label}</span>
                                                        <p className="text-xl font-black tracking-tighter text-white">{item.value}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : currentUser.role !== 'client' ? (
                                            <div className="grid grid-cols-1 gap-4">
                                                {/* Full-width Compact Performance HUD */}
                                                <div className="bg-white/5 border border-white/10 rounded-[1.5rem] p-4 relative overflow-hidden group/hud">
                                                    <div className="flex items-center justify-between mb-4 relative z-10">
                                                        <div className="flex items-center gap-3">
                                                            <div className="h-8 w-8 bg-primary/10 rounded-lg flex items-center justify-center text-primary border border-primary/20">
                                                                <Zap className="h-4 w-4 fill-primary/20 animate-pulse" />
                                                            </div>
                                                            <div>
                                                                <p className="text-[8px] font-black uppercase tracking-[0.2em] text-primary/80">Performance HUD</p>
                                                                <h4 className="text-lg font-black text-white leading-none mt-0.5">Efficiency Score</h4>
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <span className="text-3xl font-black text-white tabular-nums tracking-tighter">{myPerformanceScore ?? 0}<span className="text-xs text-slate-500 ml-1">/100</span></span>
                                                        </div>
                                                    </div>

                                                    <div className="space-y-2 relative z-10">
                                                        <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden border border-white/10">
                                                            <div
                                                                className="h-full bg-gradient-to-r from-indigo-500 via-primary to-emerald-400 rounded-full transition-all duration-1000 shadow-[0_0_15px_rgba(var(--primary),0.5)]"
                                                                style={{ width: `${Math.max(2, myPerformanceScore ?? 0)}%` }}
                                                            />
                                                        </div>
                                                        <div className="flex justify-between items-center text-[8px] font-black uppercase tracking-widest text-slate-500 px-1">
                                                            <span className="flex items-center gap-1.5"><span className="h-1 w-1 rounded-full bg-emerald-500 animate-pulse" /> Live</span>
                                                            <span className="text-primary/70">Stable Engine</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : null}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Session Hub */}
                    {currentLayout.includes('session') && currentUser?.role !== 'client' && (
                        <div className={`${currentLayout.includes('hero') ? 'xl:col-span-4' : 'xl:col-span-12'} bg-card border border-border/40 rounded-[3rem] p-10 flex flex-col justify-between shadow-xl relative overflow-hidden group/session`}>
                            <div className="flex justify-between items-start relative z-10">
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">{customLabels.session || 'Live Session'}</p>
                                    <h2 className="text-4xl font-black tabular-nums tracking-tighter">{currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</h2>
                                </div>
                                <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${(attendanceStatus === 'out' || attendanceStatus === 'checked-out')
                                    ? 'bg-slate-500/10 text-slate-600 border-slate-500/20'
                                    : attendanceStatus === 'break'
                                        ? 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                                        : 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                                    }`}>
                                    <span className={`h-1.5 w-1.5 rounded-full animate-pulse ${(attendanceStatus === 'out' || attendanceStatus === 'checked-out')
                                        ? 'bg-slate-400'
                                        : attendanceStatus === 'break'
                                            ? 'bg-amber-500'
                                            : 'bg-emerald-500'
                                        }`} />
                                    {(attendanceStatus === 'out' || attendanceStatus === 'checked-out') ? 'Offline' : attendanceStatus === 'break' ? 'On Break' : 'Online'}
                                </div>
                            </div>

                            {!hiddenSubItems.includes('timer') && (
                                <div className="mt-8 space-y-4 relative z-10">
                                    <div className="flex items-center justify-between text-[11px] font-black text-muted-foreground uppercase tracking-widest">
                                        <div className="flex items-center gap-2"><Clock className="h-3 w-3" /> Duration</div>
                                        <span className="text-foreground font-black tabular-nums">{formatElapsedTime(elapsedTime)}</span>
                                    </div>
                                    <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                                        <div className="h-full brand-gradient shimmer rounded-full transition-all duration-1000" style={{ width: (attendanceStatus === 'out' || attendanceStatus === 'checked-out') ? '0%' : '75%' }} />
                                    </div>
                                </div>
                            )}

                            {!hiddenSubItems.includes('clock_actions') && (
                                <div className="mt-8 grid grid-cols-1 gap-3 relative z-10">
                                    {attendanceStatus === 'out' ? (
                                        <Button onClick={handleClockIn} className="w-full h-16 rounded-[1.5rem] brand-gradient text-white font-black text-sm hover:scale-[1.02] active:scale-95 transition-all shadow-[0_15px_30px_-10px_rgba(37,99,235,0.4)]">
                                            <PlayCircle className="h-5 w-5 mr-3" />
                                            CLOCK IN START SESSION
                                        </Button>
                                    ) : (attendanceStatus === 'checked-out' || attendanceStatus === 'half-day') ? (
                                        <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-[1.5rem] p-6 text-center animate-in zoom-in-95 duration-500">
                                            <div className="h-12 w-12 bg-emerald-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                                <CheckCircle className="h-6 w-6 text-emerald-600" />
                                            </div>
                                            <h4 className="text-emerald-900 font-black text-sm uppercase tracking-tight">Shift Completed</h4>
                                            <p className="text-emerald-600/60 text-[10px] font-bold mt-1 uppercase tracking-widest">Great work today, {currentUser.name.split(' ')[0]}!</p>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-2 gap-3">
                                            <Button variant="outline" onClick={handleBreakToggle} className={`h-16 rounded-[1.5rem] font-black text-xs border-2 shadow-sm ${attendanceStatus === 'break' ? 'border-amber-400 bg-amber-50 text-amber-700' : 'hover:border-primary/40'}`}>
                                                <Coffee className="h-4 w-4 mr-2" />
                                                {attendanceStatus === 'break' ? 'RESUME' : 'BREAK'}
                                            </Button>
                                            <Button variant="destructive" onClick={handleClockOut} className="h-16 rounded-[1.5rem] font-black text-xs shadow-[0_15px_30px_-10px_rgba(244,63,94,0.3)]" disabled={attendanceStatus === 'break'}>
                                                <StopCircle className="h-4 w-4 mr-2" />
                                                CLOCK OUT
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* 2. Top Stats - Financials */}
            {currentLayout.includes('financials') && (
                <div className="space-y-3 animate-in fade-in duration-500">
                    <div className="flex items-center justify-between px-2">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">{customLabels.financials || 'Financial Overview'}</h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {!hiddenSubItems.includes('revenue') && <StatCard label={currentUser.role === 'client' ? 'Total Paid' : 'Total Revenue'} value={formatCurrency(totalRevenue)} trend={revenueTrend} icon={Banknote} color="text-emerald-600" bg="bg-emerald-100" onClick={() => navigate('/invoices')} />}
                        {!hiddenSubItems.includes('expenses') && currentUser.role !== 'client' && <StatCard label="Total Expenses" value={formatCurrency(totalExpenses)} trend={expenseTrend} icon={Wallet} color="text-rose-600" bg="bg-rose-100" onClick={() => navigate('/expenses')} />}
                        {!hiddenSubItems.includes('profit') && currentUser.role !== 'client' && <StatCard label="Net Profit" value={formatCurrency(netProfit)} trend={revenueTrend} icon={TrendingUp} color="text-blue-600" bg="bg-blue-100" onClick={() => navigate('/invoices')} />}
                        {!hiddenSubItems.includes('outstanding') && <StatCard label={currentUser.role === 'client' ? 'Pending Payment' : 'Outstanding'} value={formatCurrency(outstandingInvoices)} trend={`${(relevantInvoices || []).filter((i: any) => i.status === 'pending' || i.status === 'overdue').length} Invoices`} icon={CreditCard} color="text-amber-600" bg="bg-amber-100" onClick={() => navigate('/invoices')} />}
                    </div>
                </div>
            )}

            {/* 3. Operational Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

                {/* Primary Intelligence Area */}
                <div className="lg:col-span-8 space-y-8">
                    {(sectionOrder || []).map((sectionId: string) => {
                        if (!currentLayout.includes(sectionId)) return null;

                        // Render Main Sections
                        if (sectionId === 'tasks') {
                            return (
                                <div key={sectionId} className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                                    <div className="flex items-center justify-between mb-8 px-2">
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center">
                                                <CheckSquare className="h-5 w-5 text-primary" />
                                            </div>
                                            <div>
                                                <h3 className="text-xl font-black tracking-tight">{customLabels.tasks || 'Task Center'}</h3>
                                                <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mt-0.5">Distribution across status</p>
                                            </div>
                                        </div>
                                        <Badge className="bg-primary/10 text-primary border-none text-[10px] px-3 font-black underline decoration-primary/20 underline-offset-4">LIVE ENGINE</Badge>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                        {!hiddenSubItems.includes('todo') && (
                                            <StatCard label="To Do" value={todoTasks} icon={Layers} color="text-slate-600" bg="bg-slate-100" onClick={() => navigate('/tasks?status=todo')} />
                                        )}
                                        {!hiddenSubItems.includes('in_progress') && (
                                            <StatCard label="Progress" value={inProgressTasks} icon={PlayCircle} color="text-blue-600" bg="bg-blue-100" onClick={() => navigate('/tasks?status=in-progress')} />
                                        )}
                                        {!hiddenSubItems.includes('review') && (
                                            <StatCard label="Review" value={reviewTasks} icon={Target} color="text-amber-600" bg="bg-amber-100" onClick={() => navigate('/tasks?status=review')} />
                                        )}
                                        {!hiddenSubItems.includes('done') && (
                                            <StatCard label="Done" value={doneTasks} icon={CheckSquare} color="text-emerald-600" bg="bg-emerald-100" onClick={() => navigate('/tasks?status=done')} />
                                        )}
                                    </div>
                                </div>
                            )
                        }

                        if (sectionId === 'team_live' && (currentUser.role === 'admin' || currentUser.role === 'owner')) {
                            const today = new Date().setHours(0, 0, 0, 0);
                            const staffRoles = ['admin', 'owner', 'employee', 'developer']
                            const activeUsers = users.filter(usr =>
                                usr.id !== userId &&
                                staffRoles.includes(usr.role)
                            );
                            const teamStatus = (activeUsers || []).map(user => {
                                const record = todayAttendance.find(a =>
                                    a.userId === (user.id || (user as any)._id) &&
                                    new Date(a.date).setHours(0, 0, 0, 0) === today
                                );
                                return { ...user, attendance: record };
                            });

                            const online = teamStatus.filter(u => u.attendance?.status === 'present');
                            const onBreak = teamStatus.filter(u => u.attendance?.status === 'on-break');
                            const completed = teamStatus.filter(u => u.attendance?.status === 'checked-out' || u.attendance?.status === 'half-day');
                            const notJoined = teamStatus.filter(u => !u.attendance || u.attendance.status === 'absent');

                            return (
                                <div key={sectionId} className="space-y-6">
                                    <div className="flex items-center justify-between px-2">
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center">
                                                <Users className="h-5 w-5 text-primary" />
                                            </div>
                                            <div>
                                                <h3 className="text-xl font-black tracking-tight">Team Live Presence</h3>
                                                <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mt-0.5">Real-time member activity</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                        {[
                                            { label: 'Online', count: online.length, users: online, color: 'text-emerald-600', bg: 'bg-emerald-50', dot: 'bg-emerald-500' },
                                            { label: 'On Break', count: onBreak.length, users: onBreak, color: 'text-amber-600', bg: 'bg-amber-50', dot: 'bg-amber-500' },
                                            { label: 'Completed', count: completed.length, users: completed, color: 'text-blue-600', bg: 'bg-blue-50', dot: 'bg-blue-500' },
                                            { label: 'Not Joined', count: notJoined.length, users: notJoined, color: 'text-slate-400', bg: 'bg-slate-50', dot: 'bg-slate-300' },
                                        ].map((group, idx) => (
                                            <Card key={idx} className="p-4 rounded-[1.5rem] border-none shadow-sm bg-card/40 backdrop-blur-sm">
                                                <div className="flex items-center justify-between mb-4">
                                                    <span className={`text-[10px] font-black uppercase tracking-widest ${group.color}`}>{group.label}</span>
                                                    <Badge variant="outline" className="font-black h-5 min-w-[20px] justify-center border-none bg-muted/50">{group.count}</Badge>
                                                </div>
                                                <div className="flex -space-x-2 overflow-hidden mb-2">
                                                    {group.users.slice(0, 5).map((u, i) => (
                                                        <Avatar key={i} className="h-7 w-7 border-2 border-background ring-2 ring-transparent group-hover:ring-primary/20 transition-all">
                                                            <AvatarImage src={u.avatar} />
                                                            <AvatarFallback className="text-[8px] font-black">{getInitials(u.name)}</AvatarFallback>
                                                        </Avatar>
                                                    ))}
                                                    {group.users.length > 5 && (
                                                        <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-[8px] font-black border-2 border-background text-muted-foreground">
                                                            +{group.users.length - 5}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-1.5 mt-2">
                                                    <span className={`h-1.5 w-1.5 rounded-full ${group.dot} ${group.label !== 'Not Joined' ? 'animate-pulse' : ''}`} />
                                                    <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-tighter">
                                                        {group.label === 'Online' ? 'Currently Active' : group.label === 'On Break' ? 'Away' : group.label === 'Completed' ? 'Shift Done' : 'Yet to Clock-in'}
                                                    </span>
                                                </div>
                                            </Card>
                                        ))}
                                    </div>
                                </div>
                            );
                        }

                        if (sectionId === 'projects_overview') {
                            if (currentUser.role === 'client') {
                                return (
                                    <div key={sectionId} className="space-y-4">
                                        <div className="flex items-center justify-between px-2">
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center">
                                                    <Rocket className="h-5 w-5 text-primary" />
                                                </div>
                                                <div>
                                                    <h3 className="text-xl font-bold tracking-tight">Active Project Tracking</h3>
                                                    <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wider mt-0.5">Real-time delivery progress</p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            {relevantProjects.filter(p => p.status !== 'completed').map((project: any) => (
                                                <Card key={project.id || project._id} className="relative overflow-hidden border-2 border-primary/5 bg-card/40 backdrop-blur-xl group hover:border-primary/20 transition-all duration-500 rounded-[2.5rem] p-6 shadow-sm">
                                                    <div className="flex items-start justify-between mb-6">
                                                        <div className="space-y-1">
                                                            <h4 className="font-bold text-lg text-foreground tracking-tight group-hover:text-primary transition-colors">{project.name}</h4>
                                                            <div className="flex items-center gap-2">
                                                                <Badge variant="outline" className="text-[10px] font-semibold uppercase tracking-wider bg-primary/5 text-primary border-primary/20">{project.type || 'Standard'}</Badge>
                                                                <span className="text-[10px] font-bold text-muted-foreground">• Due {new Date(project.dueDate).toLocaleDateString()}</span>
                                                            </div>
                                                        </div>
                                                        <div className="h-10 w-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary group-hover:rotate-12 transition-transform">
                                                            <Briefcase className="h-5 w-5" />
                                                        </div>
                                                    </div>

                                                    <div className="space-y-4">
                                                        <div className="grid grid-cols-2 gap-4 pb-2">
                                                            <div>
                                                                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Project Budget</p>
                                                                <p className="text-sm font-bold">{formatCurrency(project.budget || 0)}</p>
                                                            </div>
                                                            <div className="text-right">
                                                                <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600 mb-1">Paid Status</p>
                                                                <p className="text-sm font-bold text-emerald-600">
                                                                    {formatCurrency((invoices || []).filter(i => i.projectId === (project.id || project._id) && i.status === 'paid').reduce((sum, i) => sum + (i.total || 0), 0))}
                                                                </p>
                                                            </div>
                                                        </div>

                                                        <div className="space-y-2">
                                                            <div className="flex justify-between items-end">
                                                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Delivery Milestone</span>
                                                                <span className="text-sm font-black text-primary">{project.progress || 0}%</span>
                                                            </div>
                                                            <Progress value={project.progress || 0} className="h-2.5 bg-muted rounded-full" />
                                                        </div>

                                                        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-muted/50">
                                                            <div className="flex items-center gap-3">
                                                                <Avatar className="h-8 w-8 border-2 border-primary/10 shadow-sm">
                                                                    <AvatarImage src="/avatars/pm.png" />
                                                                    <AvatarFallback className="bg-primary/5 text-primary text-[10px] font-black">PM</AvatarFallback>
                                                                </Avatar>
                                                                <div className="min-w-0">
                                                                    <p className="text-[8px] font-black uppercase tracking-widest text-muted-foreground">Project Manager</p>
                                                                    <p className="text-[10px] font-bold truncate">Nexprism Team</p>
                                                                </div>
                                                            </div>
                                                            <div className="flex justify-end items-center">
                                                                <Button variant="ghost" size="sm" className="h-8 text-[10px] font-black uppercase tracking-widest hover:bg-primary/5 group/btn" onClick={() => navigate(`/projects/${project.id || project._id}`)}>
                                                                    Project Docs <ArrowUpRight className="ml-2 h-3 w-3 group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform" />
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </Card>
                                            ))}
                                            {relevantProjects.filter(p => p.status !== 'completed').length === 0 && (
                                                <div className="md:col-span-2 py-12 text-center border-2 border-dashed border-muted rounded-[2.5rem] bg-muted/5">
                                                    <p className="text-xs font-black uppercase tracking-widest text-muted-foreground opacity-40">No active projects currently being tracked</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )
                            }
                            return (
                                <div key={sectionId} className="mb-12 border-2 border-indigo-500/20 rounded-[2.5rem] p-6 bg-indigo-50/10">
                                    <div className="flex items-center justify-between mb-8 px-2">
                                        <div className="flex items-center gap-3">
                                            <div className="h-12 w-12 rounded-2xl bg-indigo-500/20 flex items-center justify-center">
                                                <Briefcase className="h-6 w-6 text-indigo-600" />
                                            </div>
                                            <div>
                                                <h3 className="text-2xl font-black tracking-tight text-indigo-900">{customLabels.projects_overview || (['owner', 'admin'].includes(currentUser.role) ? 'Projects Portfolio' : 'Projects Assigned to Me')}</h3>
                                                <p className="text-xs font-black uppercase text-indigo-500 tracking-widest mt-0.5">Project status overview</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                        <StatCard label="Planning" value={planningProjects} icon={Layers} color="text-slate-600" bg="bg-slate-100" onClick={() => navigate('/projects?status=planning')} />
                                        <StatCard label="Active" value={inProgressProjects} icon={PlayCircle} color="text-blue-600" bg="bg-blue-100" onClick={() => navigate('/projects?status=in-progress')} />
                                        <StatCard label="On Hold" value={onHoldProjects} icon={StopCircle} color="text-amber-600" bg="bg-amber-100" onClick={() => navigate('/projects?status=on-hold')} />
                                        <StatCard label="Completed" value={completedProjects} icon={CheckCircle} color="text-emerald-600" bg="bg-emerald-100" onClick={() => navigate('/projects?status=completed')} />
                                    </div>
                                </div>
                            )
                        }

                        if (sectionId === 'analytics') {
                            if (currentUser.role === 'client') return null;
                            return (
                                <div key={sectionId} className="bg-card border border-border/40 rounded-[2.5rem] p-8 shadow-sm animate-in fade-in slide-in-from-left-4 duration-500">
                                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-10">
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                                                <LayoutDashboard className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-black tracking-tight">{customLabels.analytics || 'Financial Velocity'}</h3>
                                                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mt-0.5">Performance tracking across current cycle</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="h-[380px] w-full">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <AreaChart data={revenueData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                                                <defs>
                                                    <linearGradient id="velocityGrad" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.2} />
                                                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid strokeDasharray="6 6" vertical={false} stroke="hsl(var(--border))" />
                                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 900, fill: 'hsl(var(--muted-foreground))' }} dy={15} />
                                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 900, fill: 'hsl(var(--muted-foreground))' }} />
                                                <Tooltip contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', background: 'hsl(var(--card))', fontSize: '12px', fontWeight: 'bold' }} />
                                                {!hiddenSubItems.includes('revenue_trend') && <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={5} fill="url(#velocityGrad)" />}
                                                {!hiddenSubItems.includes('expense_trend') && <Area type="monotone" dataKey="expense" stroke="#f43f5e" strokeWidth={3} strokeDasharray="10 10" fillOpacity={0} />}
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            )
                        }

                        if (sectionId === 'support_tickets') {
                            return (
                                <div key={sectionId} className="mb-12 border-2 border-rose-500/20 rounded-[2.5rem] p-6 bg-rose-50/10">
                                    <div className="flex items-center justify-between mb-8 px-2">
                                        <div className="flex items-center gap-3">
                                            <div className="h-12 w-12 rounded-2xl bg-rose-500/20 flex items-center justify-center">
                                                <MessageSquare className="h-6 w-6 text-rose-600" />
                                            </div>
                                            <div>
                                                <h3 className="text-2xl font-black tracking-tight text-rose-900">{customLabels.support_tickets || 'Support Tickets'}</h3>
                                                <p className="text-xs font-black uppercase text-rose-500 tracking-widest mt-0.5">Customer issues snapshot</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {!hiddenSubItems.includes('open') && (
                                            <StatCard label="Open Tickets" value={openTickets} icon={AlertCircle} color="text-blue-600" bg="bg-blue-100" onClick={() => navigate('/tickets?status=open')} />
                                        )}
                                        {!hiddenSubItems.includes('critical') && (
                                            <StatCard label="Critical/High" value={criticalTickets} icon={Clock} color="text-rose-600" bg="bg-rose-100" onClick={() => navigate('/tickets?priority=critical')} />
                                        )}
                                        {!hiddenSubItems.includes('resolved') && (
                                            <StatCard label="Resolved" value={resolvedTickets} icon={CheckCircle} color="text-emerald-600" bg="bg-emerald-100" onClick={() => navigate('/tickets?status=resolved')} />
                                        )}
                                    </div>
                                </div>
                            )
                        }

                        if (sectionId === 'expiry_alerts' && (currentUser.role === 'admin' || currentUser.role === 'owner') && expirySummary?.totalAlerts > 0) {
                            return (
                                <div key={sectionId} className="mb-12 border-2 border-amber-500/20 rounded-[2.5rem] p-6 bg-amber-50/10">
                                    <div className="flex items-center justify-between mb-8 px-2">
                                        <div className="flex items-center gap-3">
                                            <div className="h-12 w-12 rounded-2xl bg-amber-500/20 flex items-center justify-center">
                                                <Zap className="h-6 w-6 text-amber-600" />
                                            </div>
                                            <div>
                                                <h3 className="text-2xl font-black tracking-tight text-amber-900">Expiry Monitoring</h3>
                                                <p className="text-xs font-black uppercase text-amber-500 tracking-widest mt-0.5">Critical renewals & overdue items</p>
                                            </div>
                                        </div>
                                        <Button
                                            onClick={() => navigate('/expiry-alerts')}
                                            className="bg-amber-600 hover:bg-amber-700 text-white text-[10px] font-black uppercase tracking-widest h-8 px-4 rounded-xl shadow-lg shadow-amber-200"
                                        >
                                            Take Action <ArrowUpRight className="ml-2 h-3 w-3" />
                                        </Button>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                        <StatCard
                                            label="Expired Items"
                                            value={expirySummary?.expired || 0}
                                            icon={XCircle}
                                            color="text-red-600"
                                            bg="bg-red-100"
                                            onClick={() => navigate('/expiry-alerts?filter=expired')}
                                            className={expirySummary?.expired > 0 ? "border-red-200 animate-pulse" : ""}
                                        />
                                        <StatCard
                                            label="Critical (7 Days)"
                                            value={expirySummary?.critical || 0}
                                            icon={AlertCircle}
                                            color="text-amber-600"
                                            bg="bg-amber-100"
                                            onClick={() => navigate('/expiry-alerts?filter=critical')}
                                        />
                                        <StatCard
                                            label="Overdue Invoices"
                                            value={expirySummary?.invoiceAlerts || 0}
                                            icon={FileText}
                                            color="text-rose-600"
                                            bg="bg-rose-100"
                                            onClick={() => navigate('/expiry-alerts?type=invoice')}
                                        />
                                        <StatCard
                                            label="Total Alerts"
                                            value={expirySummary?.totalAlerts || 0}
                                            icon={BellRing}
                                            color="text-blue-600"
                                            bg="bg-blue-100"
                                            onClick={() => navigate('/expiry-alerts')}
                                        />
                                    </div>
                                </div>
                            )
                        }

                        if (sectionId === 'amc' && (currentUser.role === 'admin' || currentUser.role === 'owner')) {
                            return (
                                <div key={sectionId} className="mb-12 border-2 border-blue-500/20 rounded-[2.5rem] p-6 bg-blue-50/10">
                                    <div className="flex items-center justify-between mb-8 px-2">
                                        <div className="flex items-center gap-3">
                                            <div className="h-12 w-12 rounded-2xl bg-blue-500/20 flex items-center justify-center">
                                                <Shield className="h-6 w-6 text-blue-600" />
                                            </div>
                                            <div>
                                                <h3 className="text-2xl font-black tracking-tight text-blue-900">{customLabels.amc || 'AMC Monitoring'}</h3>
                                                <p className="text-xs font-black uppercase text-blue-500 tracking-widest mt-0.5">Contract health & revenue</p>
                                            </div>
                                        </div>
                                        <Button variant="ghost" size="sm" className="text-[10px] font-black uppercase tracking-widest h-8" onClick={() => navigate('/amc')}>
                                            View All <ArrowUpRight className="ml-2 h-3 w-3" />
                                        </Button>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                        <StatCard label="Active AMCs" value={amcStats?.active || 0} icon={Shield} color="text-blue-600" bg="bg-blue-100" onClick={() => navigate('/amc')} />
                                        <StatCard label="Expiring" value={amcStats?.expiringSoon || 0} icon={AlertCircle} color="text-amber-600" bg="bg-amber-100" onClick={() => navigate('/amc?filter=expiring')} />
                                        <StatCard label="Expired" value={amcStats?.expired || 0} icon={XCircle} color="text-rose-600" bg="bg-rose-100" onClick={() => navigate('/amc?filter=expired')} />
                                        <StatCard label="Monthly Rev" value={formatCurrency(amcStats?.totalRevenue || 0)} icon={Banknote} color="text-emerald-600" bg="bg-emerald-100" onClick={() => navigate('/amc')} />
                                    </div>
                                </div>
                            )
                        }

                        if (sectionId === 'domains' && (currentUser.role === 'admin' || currentUser.role === 'owner')) {
                            return (
                                <div key={sectionId} className="mb-12 border-2 border-indigo-500/20 rounded-[2.5rem] p-6 bg-indigo-50/10">
                                    <div className="flex items-center justify-between mb-8 px-2">
                                        <div className="flex items-center gap-3">
                                            <div className="h-12 w-12 rounded-2xl bg-indigo-500/20 flex items-center justify-center">
                                                <Globe className="h-6 w-6 text-indigo-600" />
                                            </div>
                                            <div>
                                                <h3 className="text-2xl font-black tracking-tight text-indigo-900">{customLabels.domains || 'Asset Lifecycle'}</h3>
                                                <p className="text-xs font-black uppercase text-indigo-500 tracking-widest mt-0.5">Domain & Hosting tracking</p>
                                            </div>
                                        </div>
                                        <Button variant="ghost" size="sm" className="text-[10px] font-black uppercase tracking-widest h-8" onClick={() => navigate('/domains')}>
                                            Manage Assets <ArrowUpRight className="ml-2 h-3 w-3" />
                                        </Button>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                        <StatCard label="Total Assets" value={domainStats?.total || 0} icon={Globe} color="text-indigo-600" bg="bg-indigo-100" onClick={() => navigate('/domains')} />
                                        <StatCard label="Expiring" value={domainStats?.expiringSoon || 0} icon={Clock} color="text-amber-600" bg="bg-amber-100" onClick={() => navigate('/domains?filter=expiring')} />
                                        <StatCard label="Active SSL" value={domainStats?.activeSsl || 0} icon={Shield} color="text-emerald-600" bg="bg-emerald-100" onClick={() => navigate('/domains')} />
                                        <StatCard label="Pending" value={domainStats?.pendingRenewal || 0} icon={AlertCircle} color="text-rose-600" bg="bg-rose-100" onClick={() => navigate('/domains')} />
                                    </div>
                                </div>
                            )
                        }

                        if (sectionId === 'hosting' && (currentUser.role === 'admin' || currentUser.role === 'owner')) {
                            return (
                                <div key={sectionId} className="mb-12 border-2 border-orange-500/20 rounded-[2.5rem] p-6 bg-orange-50/10">
                                    <div className="flex items-center justify-between mb-8 px-2">
                                        <div className="flex items-center gap-3">
                                            <div className="h-12 w-12 rounded-2xl bg-orange-500/20 flex items-center justify-center">
                                                <Server className="h-6 w-6 text-orange-600" />
                                            </div>
                                            <div>
                                                <h3 className="text-2xl font-black tracking-tight text-orange-900">Hosting Management</h3>
                                                <p className="text-xs font-black uppercase text-orange-500 tracking-widest mt-0.5">Server resources & uptime</p>
                                            </div>
                                        </div>
                                        <Button variant="ghost" size="sm" className="text-[10px] font-black uppercase tracking-widest h-8" onClick={() => navigate('/hosting')}>
                                            Server List <ArrowUpRight className="ml-2 h-3 w-3" />
                                        </Button>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                        <StatCard label="Total Servers" value={domainStats?.totalServers || 0} icon={Server} color="text-orange-600" bg="bg-orange-100" onClick={() => navigate('/hosting')} />
                                        <StatCard label="Expiring" value={domainStats?.hostingExpiring || 0} icon={Clock} color="text-amber-600" bg="bg-amber-100" onClick={() => navigate('/hosting')} />
                                        <StatCard label="Disk Usage" value="82%" icon={Shield} color="text-emerald-600" bg="bg-emerald-100" onClick={() => navigate('/hosting')} />
                                        <StatCard label="Suspended" value={0} icon={AlertCircle} color="text-rose-600" bg="bg-rose-100" onClick={() => navigate('/hosting')} />
                                    </div>
                                </div>
                            )
                        }



                        return null;
                    })}
                </div>

                {/* Secondary Sidebar Area */}
                <div className="lg:col-span-4 space-y-8">
                    {currentUser.role === 'client' && (
                        <div className="bg-primary/5 border border-primary/10 rounded-[2.5rem] p-8 shadow-sm group">
                            <h3 className="text-xs font-black uppercase tracking-[0.2em] flex items-center gap-2 mb-8 text-primary">
                                <Zap className="h-4 w-4 fill-primary/20 animate-pulse" />
                                Client Quick Control
                            </h3>
                            <div className="space-y-3">
                                <Button className="w-full h-14 rounded-2xl brand-gradient text-white font-black text-xs hover:scale-[1.02] shadow-lg shadow-primary/20" onClick={() => navigate('/invoices')}>
                                    <Banknote className="mr-2 h-4 w-4" /> PAY LATEST INVOICE
                                </Button>
                                <Button variant="outline" className="w-full h-14 rounded-2xl font-black text-xs hover:bg-card border-2" onClick={() => navigate('/tickets')}>
                                    <MessageSquare className="mr-2 h-4 w-4 text-primary" /> RAISE SUPPORT TICKET
                                </Button>
                                <Button variant="outline" className="w-full h-14 rounded-2xl font-black text-xs hover:bg-card border-2" onClick={() => navigate('/chat')}>
                                    <Coffee className="mr-2 h-4 w-4 text-emerald-500" /> START COLLABORATION
                                </Button>
                            </div>
                            <div className="mt-8 pt-6 border-t border-primary/10">
                                <div className="flex items-center gap-4">
                                    <div className="h-10 w-10 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600">
                                        <Target className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Managed by</p>
                                        <p className="text-xs font-black">Senior Account Lead</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {currentUser.role === 'client' && (
                        <Card className="bg-card border-border/40 rounded-[2.5rem] p-8 shadow-sm">
                            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2 mb-6 text-muted-foreground">
                                <FileText className="h-4 w-4" />
                                Pending Actions
                            </h3>
                            <div className="space-y-4">
                                {(relevantInvoices || []).filter((i: any) => i.status === 'pending' || i.status === 'overdue').slice(0, 3).map((inv: any) => (
                                    <div key={inv.id || inv._id} className="flex items-center justify-between p-4 rounded-2xl bg-muted/30 border border-border/50 hover:border-primary/30 transition-all group/inv cursor-pointer" onClick={() => navigate(`/invoices/${inv.id || inv._id}`)}>
                                        <div className="min-w-0">
                                            <p className="text-[10px] font-black text-muted-foreground uppercase truncate">Invoice #{inv.invoiceNumber}</p>
                                            <p className="font-black text-sm">{formatCurrency(inv.total)}</p>
                                        </div>
                                        <Badge className={`${inv.status === 'overdue' ? 'bg-rose-500/10 text-rose-600' : 'bg-amber-500/10 text-amber-600'} border-none text-[8px] font-black uppercase`}>
                                            {inv.status}
                                        </Badge>
                                    </div>
                                ))}
                                {(relevantInvoices || []).filter((i: any) => i.status === 'pending' || i.status === 'overdue').length === 0 && (
                                    <div className="py-8 text-center bg-emerald-500/5 rounded-2xl border border-emerald-500/10">
                                        <CheckCircle className="h-8 w-8 text-emerald-500 mx-auto mb-2 opacity-20" />
                                        <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600/60">No Pending Payments</p>
                                    </div>
                                )}
                            </div>
                        </Card>
                    )}

                    {(sectionOrder || []).map((sectionId: string) => {
                        if (!currentLayout.includes(sectionId)) return null;

                        // Render Sidebar Sections
                        if (sectionId === 'funnel') {
                            if (currentUser.role === 'client') return null;
                            return (
                                <div key={sectionId} className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full blur-[80px]" />
                                    <h3 className="text-xs font-black uppercase tracking-[0.2em] flex items-center gap-2 mb-8 pr-12 leading-relaxed">
                                        <Target className="h-4 w-4 text-primary" />
                                        {customLabels.funnel || 'Business Conversion Pipeline'}
                                    </h3>
                                    <div className="h-[220px] relative">
                                        {!hiddenSubItems.includes('conversion') && (
                                            <ResponsiveContainer width="100%" height="100%">
                                                <PieChart>
                                                    <Pie data={leadStatusData} dataKey="value" innerRadius={65} outerRadius={85} paddingAngle={8} stroke="none">
                                                        {leadStatusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                                    </Pie>
                                                </PieChart>
                                            </ResponsiveContainer>
                                        )}
                                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                            <span className="text-3xl font-black">{leads.length}</span>
                                            <span className="text-[9px] font-black uppercase tracking-[0.2em] opacity-50">{leads.length === 1 ? 'Opportunity' : 'Opportunities'}</span>
                                        </div>
                                    </div>
                                    {!hiddenSubItems.includes('velocity') && (
                                        <div className="mt-8 space-y-3">
                                            {leadStatusData.slice(0, 4).map((item, i) => (
                                                <div key={i} className="flex justify-between items-center text-[11px] font-bold group/item">
                                                    <div className="flex items-center gap-2">
                                                        <div className="h-2 w-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                                                        <span className="opacity-60 group-hover/item:opacity-100 transition-opacity uppercase tracking-widest">{item.name}</span>
                                                    </div>
                                                    <span className="font-black">{item.value}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )
                        }

                        if (sectionId === 'health') {
                            if (currentUser.role === 'client') return null;
                            return (
                                <div key={sectionId} className="bg-card border border-border/40 rounded-[2.5rem] p-8 shadow-sm">
                                    <div className="flex items-center gap-3 mb-8">
                                        <Zap className="h-5 w-5 text-primary" />
                                        <h3 className="text-sm font-black uppercase tracking-[0.1em]">{customLabels.health || 'Metric Pulse'}</h3>
                                    </div>
                                    <div className="space-y-8">
                                        {healthMetrics.map((m, i) => {
                                            const itemKey = m.label.toLowerCase().includes('success') ? 'success_rate' : 'throughput'
                                            if (hiddenSubItems.includes(itemKey)) return null
                                            return (
                                                <div key={i} className="space-y-3">
                                                    <div className="flex justify-between items-end">
                                                        <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">{m.label}</span>
                                                        <span className="text-sm font-black text-primary">{m.value}%</span>
                                                    </div>
                                                    <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                                                        <div className={`h-full ${m.color} rounded-full shimmer transition-all duration-1000`} style={{ width: `${m.value}%` }} />
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            )
                        }

                        if (sectionId === 'deadlines') {
                            return (
                                <div key={sectionId} className="bg-rose-500/5 rounded-[2.5rem] p-8 border border-rose-500/10">
                                    <div className="flex items-center gap-3 mb-6">
                                        <AlertCircle className="h-5 w-5 text-rose-500" />
                                        <h3 className="text-sm font-black uppercase tracking-[0.1em] text-rose-600">{customLabels.deadlines || 'Urgent Tasks'}</h3>
                                    </div>
                                    <div className="space-y-3">
                                        {!hiddenSubItems.includes('overdue') && relevantTasks.filter(t => t.status !== 'done').slice(0, 3).map((t, i) => (
                                            <div
                                                key={i}
                                                onClick={() => navigate('/tasks')}
                                                className="bg-card/50 p-4 rounded-2xl border border-rose-500/10 hover:bg-card transition-all cursor-pointer group shadow-sm"
                                            >
                                                <span className="text-xs font-bold font-sans line-clamp-1 block mb-1">{t.title}</span>
                                                <div className="flex items-center justify-between">
                                                    <Badge className="bg-rose-500/10 text-rose-600 border-none text-[8px] px-2 py-0 font-black h-4">OVERDUE</Badge>
                                                    <ArrowUpRight className="h-3 w-3 text-rose-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                                                </div>
                                            </div>
                                        ))}
                                        {relevantTasks.filter(t => t.status !== 'done').length === 0 && (
                                            <div className="py-6 text-center text-[10px] font-black text-muted-foreground uppercase opacity-50">Zero incidents reported</div>
                                        )}
                                    </div>
                                </div>
                            )
                        }

                        if (sectionId === 'activity') {
                            return (
                                <div key={sectionId} className="px-4">
                                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-6">{customLabels.activity || 'Network Stream'}</h3>
                                    <div className="space-y-6">
                                        {!hiddenSubItems.includes('system_logs') && recentActivities.slice(0, 4).map((log, i) => (
                                            <div key={i} className="flex gap-4 items-center group">
                                                <div className={`h-11 w-11 rounded-2xl ${log.bg} ${log.color} flex items-center justify-center shrink-0 shadow-sm group-hover:scale-95 transition-transform`}>
                                                    <log.icon className="h-5 w-5" />
                                                </div>
                                                <div className="flex flex-col min-w-0 flex-1">
                                                    <span className="text-xs font-bold text-foreground truncate tracking-tight">{log.action}</span>
                                                    <span className="text-[10px] font-black text-muted-foreground uppercase mt-0.5 opacity-60">{log.user} • {log.time}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )
                        }

                        return null;
                    })}
                </div>
            </div>



        </div>
    )
}
