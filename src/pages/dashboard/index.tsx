import { useState, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import api from '@/lib/api-client'
import { mapLead, mapProject, mapInvoice, mapExpense, mapTask, mapUser } from '@/lib/mappers'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '@/store'
import { Button } from '@/components/ui/button'
import {
    CheckSquare, Clock, Briefcase, Banknote, TrendingUp, AlertCircle, PlayCircle,
    StopCircle, Target, Layers, Wallet, CreditCard, Coffee, ArrowUpRight, Zap, LayoutDashboard,
    CheckCircle, MessageSquare, Rocket, FileText, Globe, Server, XCircle, BellRing,
    Plus, Activity, ShieldCheck, Calendar, Sparkles
} from 'lucide-react'
import { Progress } from '@/components/ui/progress'
import { formatCurrency } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    Cell, PieChart, Pie
} from 'recharts'
import { Card } from '@/components/ui/card'
import { useAttendance } from '@/hooks/use-attendance'
import { useDashboardMetrics } from '@/hooks/use-dashboard-metrics'
import { PageSkeleton } from '@/components/ui/page-skeleton'
import { LivePresenceBoard } from '@/components/attendance/live-presence-board'
import { SalesDashboardSection } from '@/components/dashboard/sales-dashboard-section'
import { UpcomingScheduleWidget } from '@/components/calendar/upcoming-schedule-widget'

type DashboardTab = 'all' | 'finance' | 'work' | 'operations'

const FUNNEL_COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444'] as const

export function DashboardPage() {
    const navigate = useNavigate()
    const { currentUser, leads, setLeads, setExpenses, setProjects, setInvoices, setTasks, invoices, setTickets } = useAppStore()
    const [settings, setSettings] = useState<any>(null)
    const [, setTodayAttendance] = useState<any[]>([])
    const [amcStats, setAmcStats] = useState<any>(null)
    const [domainStats, setDomainStats] = useState<any>(null)
    const [expirySummary, setExpirySummary] = useState<any>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [activeTab, setActiveTab] = useState<DashboardTab>('all')

    const userId = currentUser?.id || (currentUser as any)?._id

    // Confirm modal states
    const [showConfirmModal, setShowConfirmModal] = useState(false)
    const [confirmAction, setConfirmAction] = useState<'break' | 'clock-out' | null>(null)

    // Hooks for business logic
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

    const {
        totalRevenue, totalExpenses, netProfit, outstandingInvoices,
        relevantTasks, winRate,
        revenueData, leadStatusData, healthMetrics, recentActivities,
        revenueTrend, expenseTrend,
        completedProjects, inProgressProjects, onHoldProjects, planningProjects,
        todoTasks, inProgressTasks, reviewTasks, doneTasks,
        totalProjectCost,
        projectRevenueReceived,
        currentLayout, sectionOrder, customLabels, hiddenSubItems,
        myPerformanceScore,
        openTickets, resolvedTickets, criticalTickets,
        relevantProjects,
        relevantInvoices
    } = useDashboardMetrics(settings)

    const isAdmin = ['admin', 'owner'].includes(currentUser?.role)

    // Stable Greeting & Formatted Date (avoids 1-second interval re-render thrashing)
    const greeting = useMemo(() => {
        const hour = new Date().getHours()
        if (hour < 12) return 'Good morning'
        if (hour < 17) return 'Good afternoon'
        return 'Good evening'
    }, [])

    const formattedDate = useMemo(() => {
        return new Date().toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric'
        })
    }, [])

    // Data Fetching
    useEffect(() => {
        const loadInitialData = async () => {
            setIsLoading(true)
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
                if (settingsRes?.data) {
                    setSettings(settingsRes.data)
                }
            } catch (error) {
                console.error("Dashboard Load Error", error)
            } finally {
                setIsLoading(false)
            }
        }
        loadInitialData()
    }, [setLeads, setExpenses, setProjects, setInvoices, setTasks, setTickets])

    // Loading guard
    if (!currentUser || isLoading) {
        return <PageSkeleton />
    }

    // 🎨 Claymorphic 3D Pillowy StatCard Component - Optimized for Zero Text Clipping
    const StatCard = ({ label, value, trend, icon: Icon, color, bg, onClick, className }: any) => {
        return (
            <div
                onClick={onClick}
                className={`group clay-card p-4 sm:p-4.5 flex flex-col justify-between cursor-pointer select-none active:scale-[0.98] transition-all min-h-[124px] ${className || ''}`}
            >
                {/* Top Row: Icon + Trend Badge */}
                <div className="flex items-center justify-between gap-2">
                    <div className={`clay-icon p-2 rounded-xl ${bg} ${color} shrink-0 group-hover:scale-105 transition-transform duration-300`}>
                        <Icon className="h-4 w-4 sm:h-4.5 sm:w-4.5 stroke-[2.4px]" />
                    </div>
                    {trend && (
                        <span 
                            className={`clay-badge text-[10px] sm:text-[11px] font-bold px-2 py-0.5 shrink-0 whitespace-nowrap ${
                                !trend.includes('-') && !trend.includes('Overdue')
                                    ? 'text-emerald-700 bg-emerald-100/90 dark:text-emerald-300 dark:bg-emerald-950/70'
                                    : 'text-rose-700 bg-rose-100/90 dark:text-rose-300 dark:bg-rose-950/70'
                            }`}
                            title={trend}
                        >
                            {trend}
                        </span>
                    )}
                </div>

                {/* Middle Row: Full width label on a clean single line with zero awkward wrapping */}
                <div className="min-w-0 mt-2 mb-1">
                    <p 
                        className="text-[11px] sm:text-xs font-bold text-muted-foreground uppercase tracking-wider leading-snug whitespace-nowrap truncate"
                        title={label}
                    >
                        {label}
                    </p>
                </div>

                {/* Bottom Row: Fully visible metric value + Arrow pill */}
                <div className="flex items-baseline justify-between gap-1.5 pt-0.5">
                    <span 
                        className="text-lg sm:text-xl xl:text-2xl font-extrabold tracking-tight text-foreground whitespace-nowrap overflow-visible leading-tight tabular-nums"
                        title={typeof value === 'string' || typeof value === 'number' ? String(value) : undefined}
                    >
                        {value}
                    </span>
                    <div className="h-6 w-6 rounded-full bg-muted/60 flex items-center justify-center shrink-0 group-hover:bg-primary/10 transition-colors">
                        <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground/50 group-hover:text-primary transition-colors" />
                    </div>
                </div>
            </div>
        )
    }

    // 🌟 AutoGrid: Dynamically arranges remaining cards to fill 100% width with ZERO empty gaps
    const AutoGrid = ({ 
        children, 
        className = '', 
        minWidth = '175px',
        gap = 'gap-3.5'
    }: { 
        children: React.ReactNode, 
        className?: string, 
        minWidth?: string,
        gap?: string
    }) => {
        const validChildren = (Array.isArray(children) ? children : [children])
            .flat(Infinity)
            .filter(Boolean);
        if (validChildren.length === 0) return null;

        return (
            <div 
                className={`w-full ${gap} ${className}`}
                style={{
                    display: 'grid',
                    gridTemplateColumns: `repeat(auto-fit, minmax(min(100%, ${minWidth}), 1fr))`
                }}
            >
                {validChildren}
            </div>
        );
    };

    // 🌟 Intelligent Dynamic Column Layout:
    // If secondary column has no active cards (or if admin hid them),
    // main column automatically expands to full width (lg:col-span-12) with ZERO dead background space!
    const hasClientPortal = currentUser?.role === 'client';
    const hasFollowups = isAdmin && (activeTab === 'all' || activeTab === 'finance');
    const hasInvoicesWidget = currentUser?.role !== 'employee' && (activeTab === 'all' || activeTab === 'finance');
    const hasFunnel = currentLayout.includes('funnel') && !hiddenSubItems.includes('funnel') && currentUser?.role !== 'client' && (activeTab === 'all' || activeTab === 'finance');
    const hasHealth = currentLayout.includes('health') && !hiddenSubItems.includes('health') && currentUser?.role !== 'client' && (activeTab === 'all' || activeTab === 'work');
    const hasDeadlines = currentLayout.includes('deadlines') && !hiddenSubItems.includes('deadlines') && (activeTab === 'all' || activeTab === 'work');
    const hasActivity = currentLayout.includes('activity') && !hiddenSubItems.includes('activity') && (activeTab === 'all' || activeTab === 'operations');

    const hasSecondaryWidgets = hasClientPortal || hasFollowups || hasInvoicesWidget || hasFunnel || hasHealth || hasDeadlines || hasActivity;

    return (
        <div className="w-full max-w-[1600px] mx-auto space-y-4 sm:space-y-5 pb-4 sm:pb-8 font-sans min-w-0">

            {/* 1. Claymorphic Executive Command & Attendance Hub */}
            {(currentLayout.includes('hero') || currentLayout.includes('session')) && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
                    
                    {/* Executive Clay Greeting Banner */}
                    {currentLayout.includes('hero') && (
                        <div className={`${currentLayout.includes('session') && currentUser.role !== 'client' ? 'lg:col-span-8' : 'lg:col-span-12'} clay-card p-5 sm:p-6 flex flex-col justify-between relative overflow-hidden`}>
                            {/* Decorative Clay Accent Glow */}
                            <div className="absolute top-0 right-0 w-80 h-80 bg-primary/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
                            <div className="absolute bottom-0 left-0 w-64 h-64 bg-violet-500/10 rounded-full blur-2xl pointer-events-none -ml-20 -mb-20" />

                            <div className="relative z-10 space-y-5">
                                {/* Top Header: Avatar + Greeting + Quick Action Clay Buttons */}
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/40">
                                    <div className="flex items-center gap-3.5">
                                        <div className="clay-icon h-12 w-12 rounded-2xl bg-gradient-to-br from-primary/20 via-primary/10 to-transparent flex items-center justify-center shrink-0 text-primary">
                                            <Sparkles className="h-6 w-6" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <h1 className="text-lg sm:text-xl font-extrabold tracking-tight text-foreground">
                                                    {greeting}, {currentUser.name.split(' ')[0]}
                                                </h1>
                                                <Badge className="clay-badge bg-primary/15 text-primary border-primary/20 text-[10px] font-bold px-2.5 py-0.5 tracking-wider uppercase">
                                                    <span className="h-2 w-2 rounded-full bg-primary animate-pulse mr-1.5 inline-block" />
                                                    {customLabels.hero || 'Live Workspace'}
                                                </Badge>
                                            </div>
                                            <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-1 font-medium">
                                                <Calendar className="h-3.5 w-3.5 text-primary" />
                                                <span>{formattedDate}</span>
                                                <span>•</span>
                                                <span>Enterprise Claymorphic Dashboard</span>
                                            </p>
                                        </div>
                                    </div>

                                    {/* Clay Action Buttons */}
                                    {isAdmin && (
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <Button 
                                                size="sm" 
                                                onClick={() => navigate('/leads')}
                                                className="clay-btn bg-primary hover:bg-primary/95 text-white h-9 px-3.5 rounded-xl text-xs font-bold gap-1.5 shadow-md"
                                            >
                                                <Plus className="h-4 w-4" /> New Lead
                                            </Button>
                                            <Button 
                                                variant="outline" 
                                                size="sm" 
                                                onClick={() => navigate('/projects/new')}
                                                className="clay-card h-9 px-3.5 rounded-xl text-xs font-bold gap-1.5 hover:border-primary/40 text-foreground"
                                            >
                                                <Briefcase className="h-4 w-4 text-primary" /> Project
                                            </Button>
                                            <Button 
                                                variant="outline" 
                                                size="sm" 
                                                onClick={() => navigate('/invoices/new')}
                                                className="clay-card h-9 px-3.5 rounded-xl text-xs font-bold gap-1.5 hover:border-emerald-500/40 text-foreground"
                                            >
                                                <Banknote className="h-4 w-4 text-emerald-600 dark:text-emerald-400" /> Invoice
                                            </Button>
                                        </div>
                                    )}
                                </div>

                                {/* Bottom Strip: Clay Inset Metric Pills */}
                                {!hiddenSubItems.includes('mini_stats') && (
                                    <div>
                                        {isAdmin ? (
                                            <AutoGrid minWidth="140px" gap="gap-3">
                                                {[
                                                    { label: 'Net Profit', value: formatCurrency(netProfit), color: 'text-emerald-600 dark:text-emerald-400', path: '/invoices' },
                                                    { label: 'Win Rate', value: `${winRate}%`, color: 'text-blue-600 dark:text-blue-400', path: '/projects' },
                                                    { label: 'Active Projects', value: inProgressProjects, color: 'text-violet-600 dark:text-violet-400', path: '/projects?status=in-progress' },
                                                    { label: 'Total Portfolio', value: formatCurrency(totalProjectCost || 0), color: 'text-amber-600 dark:text-amber-400', path: '/projects' },
                                                ].map((stat, i) => (
                                                    <div 
                                                        key={i} 
                                                        onClick={() => navigate(stat.path)}
                                                        className="clay-inset p-3 bg-muted/40 hover:bg-muted/70 transition-all duration-200 cursor-pointer flex items-center justify-between group/pill"
                                                    >
                                                        <div className="min-w-0 pr-1.5 flex-1">
                                                            <span 
                                                                className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-muted-foreground block leading-tight break-words line-clamp-1" 
                                                                title={stat.label}
                                                            >
                                                                {stat.label}
                                                            </span>
                                                            <span className={`text-sm sm:text-base font-extrabold tracking-tight block leading-snug mt-0.5 tabular-nums ${stat.color}`}>
                                                                {stat.value}
                                                            </span>
                                                        </div>
                                                        <div className="h-5 w-5 rounded-full bg-background/80 flex items-center justify-center shrink-0 group-hover/pill:scale-110 transition-transform">
                                                            <ArrowUpRight className="h-3 w-3 text-muted-foreground/50 group-hover/pill:text-primary transition-colors" />
                                                        </div>
                                                    </div>
                                                ))}
                                            </AutoGrid>
                                        ) : currentUser.role !== 'client' ? (
                                            <div className="clay-inset p-3.5 bg-muted/40 flex items-center justify-between gap-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="clay-icon h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                                                        <Zap className="h-4.5 w-4.5" />
                                                    </div>
                                                    <div>
                                                        <span className="text-xs font-bold text-foreground block">Efficiency Benchmark</span>
                                                        <span className="text-[10px] text-muted-foreground font-semibold">Active productivity score</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3 flex-1 max-w-xs">
                                                    <Progress value={Math.max(5, myPerformanceScore ?? 0)} className="h-2 rounded-full bg-background" />
                                                    <span className="text-sm font-extrabold text-primary tabular-nums">{myPerformanceScore ?? 0}%</span>
                                                </div>
                                            </div>
                                        ) : null}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Clay Shift Session Card */}
                    {currentLayout.includes('session') && currentUser?.role !== 'client' && (
                        <div className={`${currentLayout.includes('hero') ? 'lg:col-span-4' : 'lg:col-span-12'} clay-card p-5 sm:p-6 flex flex-col justify-between`}>
                            <div className="flex items-center justify-between">
                                <div>
                                    <span className="text-[10px] font-bold text-primary uppercase tracking-wider block">Shift Session</span>
                                    <h2 className="text-xl font-extrabold font-mono tracking-tight text-foreground mt-0.5">
                                        {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                    </h2>
                                </div>
                                <div className={`clay-badge flex items-center gap-1.5 px-3 py-1 text-xs font-bold ${
                                    (attendanceStatus === 'out' || attendanceStatus === 'checked-out')
                                        ? 'bg-muted text-muted-foreground'
                                        : attendanceStatus === 'break'
                                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                                            : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                                }`}>
                                    <span className={`h-2 w-2 rounded-full ${
                                        (attendanceStatus === 'out' || attendanceStatus === 'checked-out')
                                            ? 'bg-muted-foreground/40'
                                            : attendanceStatus === 'break'
                                                ? 'bg-amber-500 animate-pulse'
                                                : 'bg-emerald-500 animate-pulse'
                                    }`} />
                                    {(attendanceStatus === 'out' || attendanceStatus === 'checked-out') ? 'Offline' : attendanceStatus === 'break' ? 'On Break' : 'Online'}
                                </div>
                            </div>

                            {/* Clay Inset Shift Progress */}
                            {!hiddenSubItems.includes('timer') && (
                                <div className="my-4 clay-inset p-3 bg-muted/40 space-y-1.5">
                                    <div className="flex items-center justify-between text-xs font-bold text-muted-foreground">
                                        <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 text-primary" /> Active Working Time</span>
                                        <span className="font-mono font-extrabold text-foreground">{formatElapsedTime(elapsedTime)}</span>
                                    </div>
                                    <Progress 
                                        value={(attendanceStatus === 'out' || attendanceStatus === 'checked-out') ? 0 : Math.min(100, Math.round((elapsedTime / 28800) * 100))} 
                                        className="h-2 rounded-full bg-background" 
                                    />
                                </div>
                            )}

                            {/* Clay Tactile Session Actions */}
                            {!hiddenSubItems.includes('clock_actions') && (
                                <div>
                                    {attendanceStatus === 'out' ? (
                                        <Button 
                                            onClick={handleClockIn} 
                                            className="w-full h-11 rounded-2xl clay-btn bg-primary hover:bg-primary/95 text-white font-extrabold text-xs gap-2 shadow-lg active:scale-95 transition-all"
                                        >
                                            <PlayCircle className="h-4 w-4" /> CLOCK IN SESSION
                                        </Button>
                                    ) : (attendanceStatus === 'checked-out' || attendanceStatus === 'half-day') ? (
                                        <div className="clay-card p-3 bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-500/20 text-center">
                                            <span className="text-emerald-700 dark:text-emerald-300 font-extrabold text-xs">✓ Shift Completed Successfully</span>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-2 gap-2.5">
                                            <Button 
                                                variant="outline" 
                                                onClick={() => triggerConfirm('break')} 
                                                className={`h-11 rounded-2xl font-extrabold text-xs clay-card ${attendanceStatus === 'break' ? 'border-amber-500 bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300' : 'text-foreground'}`}
                                            >
                                                <Coffee className="h-4 w-4 mr-1.5" />
                                                {attendanceStatus === 'break' ? 'RESUME' : 'BREAK'}
                                            </Button>
                                            <Button 
                                                variant="destructive" 
                                                onClick={() => triggerConfirm('clock-out')} 
                                                className="h-11 rounded-2xl font-extrabold text-xs clay-btn bg-rose-600 hover:bg-rose-700 text-white shadow-md" 
                                                disabled={attendanceStatus === 'break'}
                                            >
                                                <StopCircle className="h-4 w-4 mr-1.5" />
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

            {/* 2. Clay Segmented Filter Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                <div className="clay-inset p-1 bg-muted/60 flex items-center gap-1 w-fit">
                    {[
                        { id: 'all', label: 'All View', icon: LayoutDashboard },
                        { id: 'finance', label: 'Financials', icon: Banknote },
                        { id: 'work', label: 'Work & Projects', icon: Briefcase },
                        { id: 'operations', label: 'Operations & Assets', icon: Activity },
                    ].map(tab => {
                        const Icon = tab.icon
                        const isActive = activeTab === tab.id
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as DashboardTab)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                                    isActive
                                        ? 'clay-card bg-card text-primary shadow-sm'
                                        : 'text-muted-foreground hover:text-foreground'
                                }`}
                            >
                                <Icon className="h-3.5 w-3.5" />
                                <span>{tab.label}</span>
                            </button>
                        )
                    })}
                </div>

                <div className="flex items-center gap-2 text-xs text-muted-foreground font-semibold px-1">
                    <Sparkles className="h-3.5 w-3.5 text-primary" />
                    <span>Real-Time 3D Analytics Stream</span>
                </div>
            </div>

            {/* My Calendar — upcoming meetings for every logged-in user */}
            {currentUser?.role !== 'client' && (activeTab === 'all' || activeTab === 'work') && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <UpcomingScheduleWidget basePath="/calendar" title="My Upcoming Schedule" />
                </div>
            )}

            {/* 3. Clay Financial Overview Stat Cards */}
            {currentLayout.includes('financials') && (activeTab === 'all' || activeTab === 'finance') && (
                <div className="space-y-3">
                    <div className="flex items-center justify-between px-1">
                        <span className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                            <Banknote className="h-4 w-4 text-primary" />
                            {customLabels.financials || 'Financial Overview'}
                        </span>
                    </div>
                    <AutoGrid minWidth="180px" gap="gap-3.5">
                        {!hiddenSubItems.includes('revenue') && (
                            <StatCard 
                                label={currentUser.role === 'client' ? 'Total Paid' : 'Total Revenue'} 
                                value={formatCurrency(totalRevenue)} 
                                trend={revenueTrend} 
                                icon={Banknote} 
                                color="text-emerald-600 dark:text-emerald-400" 
                                bg="bg-emerald-100 dark:bg-emerald-950/50" 
                                onClick={() => navigate('/invoices')} 
                            />
                        )}
                        {!hiddenSubItems.includes('expenses') && currentUser.role !== 'client' && (
                            <StatCard 
                                label="Total Expenses" 
                                value={formatCurrency(totalExpenses)} 
                                trend={expenseTrend} 
                                icon={Wallet} 
                                color="text-rose-600 dark:text-rose-400" 
                                bg="bg-rose-100 dark:bg-rose-950/50" 
                                onClick={() => navigate('/expenses')} 
                            />
                        )}
                        {!hiddenSubItems.includes('profit') && currentUser.role !== 'client' && (
                            <StatCard 
                                label="Net Profit" 
                                value={formatCurrency(netProfit)} 
                                trend={revenueTrend} 
                                icon={TrendingUp} 
                                color="text-blue-600 dark:text-blue-400" 
                                bg="bg-blue-100 dark:bg-blue-950/50" 
                                onClick={() => navigate('/invoices')} 
                            />
                        )}
                        {!hiddenSubItems.includes('outstanding') && (
                            <StatCard 
                                label={currentUser.role === 'client' ? 'Pending Payment' : 'Outstanding'} 
                                value={formatCurrency(outstandingInvoices)} 
                                trend={`${(relevantInvoices || []).filter((i: any) => i.status === 'pending' || i.status === 'overdue').length} Invoices`} 
                                icon={CreditCard} 
                                color="text-amber-600 dark:text-amber-400" 
                                bg="bg-amber-100 dark:bg-amber-950/50" 
                                onClick={() => navigate('/invoices')} 
                            />
                        )}
                        {isAdmin && (
                            <>
                                <StatCard 
                                    label="Project Costing" 
                                    value={formatCurrency(totalProjectCost || 0)} 
                                    trend={`${(relevantProjects || []).length} Projects`} 
                                    icon={Briefcase} 
                                    color="text-indigo-600 dark:text-indigo-400" 
                                    bg="bg-indigo-100 dark:bg-indigo-950/50" 
                                    onClick={() => navigate('/projects')} 
                                />
                                <StatCard 
                                    label="Collected Amount" 
                                    value={formatCurrency(projectRevenueReceived || 0)} 
                                    trend={`${(totalProjectCost || 0) > 0 ? Math.round(((projectRevenueReceived || 0) / (totalProjectCost || 1)) * 100) : 0}% Collected`} 
                                    icon={CheckCircle} 
                                    color="text-purple-600 dark:text-purple-400" 
                                    bg="bg-purple-100 dark:bg-purple-950/50" 
                                    onClick={() => navigate('/invoices?status=paid')} 
                                />
                            </>
                        )}
                    </AutoGrid>
                </div>
            )}

            {/* 4. Team Live Presence Board - Dedicated Full Width Enterprise Suite */}
            {currentLayout.includes('team_live') && (currentUser.role === 'admin' || currentUser.role === 'owner') && (activeTab === 'all' || activeTab === 'operations') && (
                <div className="w-full">
                    <LivePresenceBoard
                        title="Team Live Presence & Real-Time Activity"
                        description="Real-time monitoring: Active working members, break timers, and attendance durations."
                        defaultView="cards"
                    />
                </div>
            )}

            {/* 5. Financial Velocity & Cash Flow - Full Width Dedicated Analytics Suite */}
            {currentLayout.includes('analytics') && !hiddenSubItems.includes('analytics') && currentUser.role !== 'client' && (activeTab === 'all' || activeTab === 'finance') && (
                <Card className="p-5 sm:p-6 space-y-4 w-full">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-border/40">
                        <div className="flex items-center gap-3">
                            <div className="clay-icon h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                                <TrendingUp className="h-5 w-5" />
                            </div>
                            <div>
                                <h3 className="text-sm font-extrabold uppercase tracking-wider text-foreground">{customLabels.analytics || 'Financial Velocity & Cash Flow'}</h3>
                                <p className="text-[11px] text-muted-foreground font-medium">Revenue and expense cycle visualization</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 text-xs font-bold">
                            <div className="clay-badge px-2.5 py-1 bg-primary/10 flex items-center gap-1.5 text-primary">
                                <span className="h-2 w-2 rounded-full bg-primary" />
                                <span>Revenue</span>
                            </div>
                            <div className="clay-badge px-2.5 py-1 bg-rose-500/10 flex items-center gap-1.5 text-rose-600 dark:text-rose-400">
                                <span className="h-2 w-2 rounded-full bg-rose-500" />
                                <span>Expenses</span>
                            </div>
                        </div>
                    </div>
                    <div className="h-[270px] w-full pt-2">
                        <ResponsiveContainer width="100%" height="100%" debounce={50}>
                            <AreaChart data={revenueData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="velocityGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="hsl(var(--border) / 0.5)" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 700, fill: 'hsl(var(--muted-foreground))' }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 700, fill: 'hsl(var(--muted-foreground))' }} />
                                <Tooltip contentStyle={{ borderRadius: '16px', border: '1.5px solid rgba(255,255,255,0.7)', boxShadow: '0 8px 24px rgba(0,0,0,0.1)', background: 'hsl(var(--card))', fontSize: '12px', fontWeight: 700 }} />
                                {!hiddenSubItems.includes('revenue_trend') && <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={3} fill="url(#velocityGrad)" isAnimationActive={false} />}
                                {!hiddenSubItems.includes('expense_trend') && <Area type="monotone" dataKey="expense" stroke="#f43f5e" strokeWidth={2} strokeDasharray="5 5" fillOpacity={0} isAnimationActive={false} />}
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </Card>
            )}

            {/* 6. Task Progress Hub - Full Width */}
            {currentLayout.includes('tasks') && !hiddenSubItems.includes('tasks') && (activeTab === 'all' || activeTab === 'work') && (
                <Card className="p-5 sm:p-6 space-y-4 w-full">
                    <div className="flex items-center justify-between pb-3 border-b border-border/40">
                        <div className="flex items-center gap-3">
                            <div className="clay-icon h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                                <CheckSquare className="h-5 w-5" />
                            </div>
                            <div>
                                <h3 className="text-sm font-extrabold uppercase tracking-wider text-foreground">{customLabels.tasks || 'Task Progress Hub'}</h3>
                                <p className="text-[11px] text-muted-foreground font-medium">Distribution across task statuses</p>
                            </div>
                        </div>
                        <Button 
                            variant="ghost" 
                            size="sm"
                            className="h-8 rounded-xl text-xs font-bold px-3"
                            onClick={() => navigate('/tasks')}
                        >
                            All Tasks <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
                        </Button>
                    </div>
                    <AutoGrid minWidth="160px" gap="gap-3">
                        {!hiddenSubItems.includes('todo') && (
                            <StatCard label="To Do" value={todoTasks} icon={Layers} color="text-slate-600 dark:text-slate-400" bg="bg-slate-100 dark:bg-slate-900" onClick={() => navigate('/tasks?status=todo')} />
                        )}
                        {!hiddenSubItems.includes('in_progress') && (
                            <StatCard label="In Progress" value={inProgressTasks} icon={PlayCircle} color="text-blue-600 dark:text-blue-400" bg="bg-blue-100 dark:bg-blue-950/50" onClick={() => navigate('/tasks?status=in-progress')} />
                        )}
                        {!hiddenSubItems.includes('review') && (
                            <StatCard label="Review" value={reviewTasks} icon={Target} color="text-amber-600 dark:text-amber-400" bg="bg-amber-100 dark:bg-amber-950/50" onClick={() => navigate('/tasks?status=review')} />
                        )}
                        {!hiddenSubItems.includes('done') && (
                            <StatCard label="Completed" value={doneTasks} icon={CheckSquare} color="text-emerald-600 dark:text-emerald-400" bg="bg-emerald-100 dark:bg-emerald-950/50" onClick={() => navigate('/tasks?status=done')} />
                        )}
                    </AutoGrid>
                </Card>
            )}

            {/* 7. Projects Portfolio - Full Width */}
            {currentLayout.includes('projects_overview') && !hiddenSubItems.includes('projects_overview') && (activeTab === 'all' || activeTab === 'work') && (
                currentUser.role === 'client' ? (
                    <div className="space-y-3.5 w-full">
                        <div className="flex items-center justify-between px-1">
                            <span className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                <Rocket className="h-4 w-4 text-primary" />
                                Active Project Tracking
                            </span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                            {relevantProjects.filter(p => p.status !== 'completed').map((project: any) => (
                                <Card key={project.id || project._id} className="p-4 sm:p-5 space-y-3">
                                    <div className="flex items-start justify-between">
                                        <div className="min-w-0 pr-2">
                                            <h4 className="font-extrabold text-base text-foreground break-words leading-snug line-clamp-2" title={project.name}>{project.name}</h4>
                                            <div className="flex items-center gap-2 mt-1">
                                                <Badge className="clay-badge text-[10px] font-bold uppercase">{project.type || 'Standard'}</Badge>
                                                <span className="text-xs text-muted-foreground font-semibold">Due: {new Date(project.dueDate).toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                        <div className="clay-icon h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                                            <Briefcase className="h-4.5 w-4.5" />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-xs font-bold">
                                            <span className="text-muted-foreground">Milestone Progress</span>
                                            <span className="text-primary">{project.progress || 0}%</span>
                                        </div>
                                        <Progress value={project.progress || 0} className="h-2 rounded-full bg-background" />
                                    </div>
                                    <div className="flex items-center justify-between pt-3 border-t border-border/40 text-xs">
                                        <div>
                                            <span className="text-muted-foreground block text-[10px] font-bold uppercase">Budget</span>
                                            <span className="font-extrabold text-foreground">{formatCurrency(project.budget || 0)}</span>
                                        </div>
                                        <Button 
                                            variant="ghost" 
                                            size="sm" 
                                            className="h-8 text-xs font-bold rounded-xl" 
                                            onClick={() => navigate(`/projects/${project.id || project._id}`)}
                                        >
                                            Details <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
                                        </Button>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    </div>
                ) : (
                    <Card className="p-5 sm:p-6 space-y-4 w-full">
                        <div className="flex items-center justify-between pb-3 border-b border-border/40">
                            <div className="flex items-center gap-3">
                                <div className="clay-icon h-9 w-9 rounded-xl bg-indigo-100 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                                    <Briefcase className="h-5 w-5" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-extrabold uppercase tracking-wider text-foreground">{customLabels.projects_overview || (isAdmin ? 'Projects Portfolio' : 'Assigned Projects')}</h3>
                                    <p className="text-[11px] text-muted-foreground font-medium">Delivery lifecycle overview</p>
                                </div>
                            </div>
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                className="text-xs font-bold h-8 rounded-xl px-3" 
                                onClick={() => navigate('/projects')}
                            >
                                View All <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
                            </Button>
                        </div>
                        <AutoGrid minWidth="160px" gap="gap-3">
                            <StatCard label="Planning" value={planningProjects} icon={Layers} color="text-slate-600 dark:text-slate-400" bg="bg-slate-100 dark:bg-slate-900" onClick={() => navigate('/projects?status=planning')} />
                            <StatCard label="Active" value={inProgressProjects} icon={PlayCircle} color="text-blue-600 dark:text-blue-400" bg="bg-blue-100 dark:bg-blue-950/50" onClick={() => navigate('/projects?status=in-progress')} />
                            <StatCard label="On Hold" value={onHoldProjects} icon={StopCircle} color="text-amber-600 dark:text-amber-400" bg="bg-amber-100 dark:bg-amber-950/50" onClick={() => navigate('/projects?status=on-hold')} />
                            <StatCard label="Completed" value={completedProjects} icon={CheckCircle} color="text-emerald-600 dark:text-emerald-400" bg="bg-emerald-100 dark:bg-emerald-950/50" onClick={() => navigate('/projects?status=completed')} />
                        </AutoGrid>
                    </Card>
                )
            )}

            {/* 8. Operational Intelligence & Activity Feeds Hub - Auto-distributing Grid */}
            {hasSecondaryWidgets && (
                <div className="space-y-3 w-full">
                    <div className="flex items-center justify-between px-1">
                        <span className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                            <Sparkles className="h-4 w-4 text-primary" />
                            Operational Intelligence & Live Feeds
                        </span>
                    </div>
                    <AutoGrid minWidth="320px" gap="gap-5">
                        {/* Client Quick Portal */}
                        {currentUser.role === 'client' && (
                            <Card className="p-5 space-y-3">
                                <span className="text-xs font-extrabold uppercase tracking-wider flex items-center gap-1.5 text-primary">
                                    <Sparkles className="h-4 w-4" /> Client Quick Portal
                                </span>
                                <div className="space-y-2.5">
                                    <Button className="w-full h-10 rounded-2xl clay-btn bg-primary text-white font-extrabold text-xs shadow-md gap-2" onClick={() => navigate('/invoices')}>
                                        <Banknote className="h-4 w-4" /> Pay Latest Invoice
                                    </Button>
                                    <Button variant="outline" className="w-full h-10 rounded-2xl font-extrabold text-xs gap-2" onClick={() => navigate('/tickets')}>
                                        <MessageSquare className="h-4 w-4 text-primary" /> Raise Support Ticket
                                    </Button>
                                    <Button variant="outline" className="w-full h-10 rounded-2xl font-extrabold text-xs gap-2" onClick={() => navigate('/chat')}>
                                        <Coffee className="h-4 w-4 text-emerald-500" /> Message Team
                                    </Button>
                                </div>
                            </Card>
                        )}

                        {/* Upcoming Lead Follow-ups */}
                        {isAdmin && (activeTab === 'all' || activeTab === 'finance') && (
                            <Card className="p-4 sm:p-5 space-y-3">
                                <div className="flex items-center justify-between pb-2.5 border-b border-border/40">
                                    <span className="text-xs font-extrabold uppercase tracking-wider flex items-center gap-2 text-foreground">
                                        <Clock className="h-4 w-4 text-primary" />
                                        Upcoming Follow-ups
                                    </span>
                                    <Badge className="clay-badge text-[10px] font-bold px-2">{leads.filter(l => l.reminder && l.reminder.date && !l.reminder.completed && new Date(l.reminder.date) > new Date()).length} pending</Badge>
                                </div>
                                <div className="space-y-2">
                                    {leads
                                        .filter(l => l.reminder && l.reminder.date && !l.reminder.completed && new Date(l.reminder.date) > new Date())
                                        .sort((a, b) => new Date(a.reminder.date).getTime() - new Date(b.reminder.date).getTime())
                                        .slice(0, 4)
                                        .map(lead => {
                                            const date = new Date(lead.reminder.date);
                                            const diffMs = date.getTime() - Date.now();
                                            const diffMins = Math.round(diffMs / 60000);
                                            let countdownText = '';
                                            if (diffMins < 60) countdownText = `in ${diffMins}m`;
                                            else if (diffMins < 1440) countdownText = `in ${Math.round(diffMins/60)}h`;
                                            else countdownText = `in ${Math.round(diffMins/1440)}d`;

                                            return (
                                                <div 
                                                    key={lead.id} 
                                                    onClick={() => navigate('/leads')} 
                                                    className="clay-inset p-2.5 bg-muted/40 hover:bg-muted/70 transition-all cursor-pointer flex items-center justify-between group"
                                                >
                                                    <div className="flex items-center gap-2.5 min-w-0">
                                                        <span className={`w-2 h-2 rounded-full shrink-0 ${
                                                            lead.aiPriority === 'green' ? 'bg-emerald-500' : lead.aiPriority === 'yellow' ? 'bg-yellow-500' : 'bg-red-500'
                                                        }`} />
                                                        <div className="min-w-0 pr-1">
                                                            <p className="font-extrabold text-xs text-foreground truncate leading-snug group-hover:text-primary transition-colors" title={lead.company}>{lead.company}</p>
                                                            <p className="text-[10px] text-muted-foreground truncate leading-snug font-semibold" title={lead.name}>{lead.name}</p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right shrink-0">
                                                        <span className="text-xs font-extrabold text-foreground block">{countdownText}</span>
                                                        <span className="text-[10px] text-muted-foreground font-semibold">{date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    }
                                    {leads.filter(l => l.reminder && l.reminder.date && !l.reminder.completed && new Date(l.reminder.date) > new Date()).length === 0 && (
                                        <p className="text-xs text-muted-foreground italic text-center py-3">No upcoming follow-ups scheduled.</p>
                                    )}
                                </div>
                            </Card>
                        )}

                        {/* Pending Invoices Widget */}
                        {currentUser.role !== 'employee' && (activeTab === 'all' || activeTab === 'finance') && (
                            <Card className="p-4 sm:p-5 space-y-3">
                                <div className="flex items-center justify-between pb-2.5 border-b border-border/40">
                                    <span className="text-xs font-extrabold uppercase tracking-wider flex items-center gap-2 text-foreground">
                                        <FileText className="h-4 w-4 text-primary" />
                                        {currentUser.role === 'client' ? 'Pending Invoices' : 'Unpaid Invoices'}
                                    </span>
                                    <Button variant="ghost" size="sm" className="h-7 text-xs font-bold px-2 rounded-lg" onClick={() => navigate('/invoices')}>
                                        All <ArrowUpRight className="ml-1 h-3 w-3" />
                                    </Button>
                                </div>
                                <div className="space-y-2">
                                    {(relevantInvoices || []).filter((i: any) => i.status === 'pending' || i.status === 'overdue').slice(0, 3).map((inv: any) => (
                                        <div 
                                            key={inv.id || inv._id} 
                                            className="clay-inset p-2.5 bg-muted/40 hover:bg-muted/70 transition-all cursor-pointer flex items-center justify-between" 
                                            onClick={() => navigate(`/invoices/${inv.id || inv._id}`)}
                                        >
                                            <div className="min-w-0">
                                                <span className="text-[10px] font-bold text-muted-foreground uppercase block">#{inv.invoiceNumber}</span>
                                                <span className="font-extrabold text-xs text-foreground">{formatCurrency(inv.total)}</span>
                                            </div>
                                            <Badge className={`clay-badge ${inv.status === 'overdue' ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'} text-[10px] font-bold py-0.5`}>
                                                {inv.status}
                                            </Badge>
                                        </div>
                                    ))}
                                    {(relevantInvoices || []).filter((i: any) => i.status === 'pending' || i.status === 'overdue').length === 0 && (
                                        <p className="text-xs text-muted-foreground italic text-center py-3">No unpaid invoices.</p>
                                    )}
                                </div>
                            </Card>
                        )}

                        {/* Opportunity Funnel */}
                        {currentLayout.includes('funnel') && !hiddenSubItems.includes('funnel') && currentUser.role !== 'client' && (activeTab === 'all' || activeTab === 'finance') && (
                            <Card className="p-5 space-y-3">
                                <span className="text-xs font-extrabold uppercase tracking-wider flex items-center gap-2 text-foreground">
                                    <Target className="h-4 w-4 text-primary" />
                                    {customLabels.funnel || 'Opportunity Funnel'}
                                </span>
                                <div className="h-[180px] relative">
                                    {!hiddenSubItems.includes('conversion') && (
                                        <ResponsiveContainer width="100%" height="100%" debounce={50}>
                                            <PieChart>
                                                <Pie 
                                                    data={leadStatusData} 
                                                    dataKey="value" 
                                                    innerRadius={55} 
                                                    outerRadius={75} 
                                                    paddingAngle={leadStatusData.length > 1 ? 6 : 0} 
                                                    stroke="none"
                                                    isAnimationActive={false}
                                                >
                                                    {leadStatusData.map((_, i) => <Cell key={i} fill={FUNNEL_COLORS[i % FUNNEL_COLORS.length]} />)}
                                                </Pie>
                                            </PieChart>
                                        </ResponsiveContainer>
                                    )}
                                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                        <span className="text-2xl font-extrabold text-foreground">{leads.length}</span>
                                        <span className="text-[10px] font-bold text-muted-foreground uppercase">{leads.length === 1 ? 'Lead' : 'Leads'}</span>
                                    </div>
                                </div>
                                {!hiddenSubItems.includes('velocity') && (
                                    <div className="mt-2 space-y-1.5 border-t border-border/40 pt-3">
                                        {leadStatusData.slice(0, 4).map((item, i) => (
                                            <div key={i} className="flex justify-between items-center text-xs font-semibold">
                                                <div className="flex items-center gap-2">
                                                    <div className="h-2 w-2 rounded-full" style={{ backgroundColor: FUNNEL_COLORS[i % FUNNEL_COLORS.length] }} />
                                                    <span className="text-muted-foreground uppercase text-[11px]">{item.name}</span>
                                                </div>
                                                <span className="font-extrabold text-foreground">{item.value}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </Card>
                        )}

                        {/* Metric Pulse */}
                        {currentLayout.includes('health') && !hiddenSubItems.includes('health') && currentUser.role !== 'client' && (activeTab === 'all' || activeTab === 'work') && (
                            <Card className="p-5 space-y-3.5">
                                <span className="text-xs font-extrabold uppercase tracking-wider flex items-center gap-2 text-foreground">
                                    <Zap className="h-4 w-4 text-primary" />
                                    {customLabels.health || 'Metric Pulse'}
                                </span>
                                <div className="space-y-3">
                                    {healthMetrics.map((m, i) => {
                                        const itemKey = m.label.toLowerCase().includes('success') ? 'success_rate' : 'throughput'
                                        if (hiddenSubItems.includes(itemKey)) return null
                                        return (
                                            <div key={i} className="space-y-1">
                                                <div className="flex justify-between text-xs font-bold">
                                                    <span className="text-muted-foreground">{m.label}</span>
                                                    <span className="text-primary font-extrabold">{m.value}%</span>
                                                </div>
                                                <Progress value={m.value} className="h-2 rounded-full bg-background" />
                                            </div>
                                        )
                                    })}
                                </div>
                            </Card>
                        )}

                        {/* Urgent Deadlines */}
                        {currentLayout.includes('deadlines') && !hiddenSubItems.includes('deadlines') && (activeTab === 'all' || activeTab === 'work') && (
                            <Card className="p-4 sm:p-5 space-y-3 border-rose-300/40 bg-rose-50/50 dark:bg-rose-950/20">
                                <span className="text-xs font-extrabold uppercase tracking-wider flex items-center gap-2 text-rose-600 dark:text-rose-400">
                                    <AlertCircle className="h-4 w-4 text-rose-500" />
                                    {customLabels.deadlines || 'Urgent Deadlines'}
                                </span>
                                <div className="space-y-2">
                                    {!hiddenSubItems.includes('overdue') && relevantTasks.filter(t => t.status !== 'done').slice(0, 3).map((t, i) => (
                                        <div
                                            key={i}
                                            onClick={() => navigate('/tasks')}
                                            className="clay-card p-3 bg-card hover:bg-card/90 transition-all cursor-pointer flex items-center justify-between"
                                        >
                                            <span className="text-xs font-bold line-clamp-1 flex-1 mr-2 leading-snug" title={t.title}>{t.title}</span>
                                            <Badge className="clay-badge bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 text-[9px] font-extrabold px-1.5 py-0.5">DUE</Badge>
                                        </div>
                                    ))}
                                    {relevantTasks.filter(t => t.status !== 'done').length === 0 && (
                                        <p className="text-xs text-muted-foreground italic text-center py-2.5">No overdue tasks.</p>
                                    )}
                                </div>
                            </Card>
                        )}

                        {/* Live Activity Feed */}
                        {currentLayout.includes('activity') && !hiddenSubItems.includes('activity') && (activeTab === 'all' || activeTab === 'operations') && (
                            <Card className="p-5 space-y-3.5">
                                <div className="flex items-center justify-between pb-2.5 border-b border-border/40">
                                    <span className="text-xs font-extrabold uppercase tracking-wider flex items-center gap-2 text-foreground">
                                        <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                                        {customLabels.activity || 'Activity Stream'}
                                    </span>
                                    <Badge className="clay-badge text-[9px] font-bold px-2">Live</Badge>
                                </div>
                                <div className="space-y-3">
                                    {!hiddenSubItems.includes('system_logs') && recentActivities.slice(0, 5).map((log, i) => (
                                        <div key={i} className="flex gap-3 items-start group">
                                            <div className={`clay-icon h-8 w-8 rounded-xl ${log.bg} ${log.color} flex items-center justify-center shrink-0`}>
                                                <log.icon className="h-4 w-4" />
                                            </div>
                                            <div className="flex flex-col min-w-0 flex-1 border-b border-border/30 pb-2.5 group-last:border-0 last:pb-0">
                                                <span className="text-xs font-bold text-foreground line-clamp-1 break-words leading-snug group-hover:text-primary transition-colors" title={log.action}>{log.action}</span>
                                                <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-muted-foreground font-semibold">
                                                    <span>{log.user}</span>
                                                    <span>•</span>
                                                    <span>{log.time}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </Card>
                        )}
                    </AutoGrid>
                </div>
            )}

            {/* 9. AMC Monitoring - Full Width */}
            {currentLayout.includes('amc') && (currentUser.role === 'admin' || currentUser.role === 'owner') && (activeTab === 'all' || activeTab === 'operations') && (
                <Card className="p-5 sm:p-6 space-y-4 w-full">
                    <div className="flex items-center justify-between pb-3 border-b border-border/40">
                        <div className="flex items-center gap-3">
                            <div className="clay-icon h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                                <ShieldCheck className="h-5 w-5" />
                            </div>
                            <div>
                                <h3 className="text-sm font-extrabold uppercase tracking-wider text-foreground">{customLabels.amc || 'AMC Monitoring & Maintenance'}</h3>
                                <p className="text-[11px] text-muted-foreground font-medium">Contract lifecycle tracking</p>
                            </div>
                        </div>
                        <Button 
                            variant="outline" 
                            size="sm"
                            className="h-8 rounded-xl text-xs font-bold px-3"
                            onClick={() => navigate('/amc')}
                        >
                            Manage <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
                        </Button>
                    </div>
                    <AutoGrid minWidth="160px" gap="gap-3">
                        <StatCard label="Active AMCs" value={amcStats?.active || 0} icon={ShieldCheck} color="text-blue-600 dark:text-blue-400" bg="bg-blue-100 dark:bg-blue-950/50" onClick={() => navigate('/amc')} />
                        <StatCard label="Expiring Soon" value={amcStats?.expiringSoon || 0} icon={AlertCircle} color="text-amber-600 dark:text-amber-400" bg="bg-amber-100 dark:bg-amber-950/50" onClick={() => navigate('/amc?filter=expiring')} />
                        <StatCard label="Expired" value={amcStats?.expired || 0} icon={XCircle} color="text-rose-600 dark:text-rose-400" bg="bg-rose-100 dark:bg-rose-950/50" onClick={() => navigate('/amc?filter=expired')} />
                        <StatCard label="Portfolio" value={formatCurrency(amcStats?.totalRevenue || 0)} icon={Banknote} color="text-emerald-600 dark:text-emerald-400" bg="bg-emerald-100 dark:bg-emerald-950/50" onClick={() => navigate('/amc')} />
                    </AutoGrid>
                </Card>
            )}

            {/* 10. Critical Expiry Alerts - Full Width */}
            {currentLayout.includes('expiry_alerts') && (currentUser.role === 'admin' || currentUser.role === 'owner') && expirySummary?.totalAlerts > 0 && (activeTab === 'all' || activeTab === 'operations') && (
                <Card className="p-5 sm:p-6 space-y-4 w-full">
                    <div className="flex items-center justify-between pb-3 border-b border-border/40">
                        <div className="flex items-center gap-3">
                            <div className="clay-icon h-9 w-9 rounded-xl bg-amber-100 dark:bg-amber-950/50 flex items-center justify-center text-amber-600 dark:text-amber-400">
                                <BellRing className="h-5 w-5" />
                            </div>
                            <div>
                                <h3 className="text-sm font-extrabold uppercase tracking-wider text-foreground">Critical Expiry & Renewals</h3>
                                <p className="text-[11px] text-muted-foreground font-medium">Expiring services & invoices</p>
                            </div>
                        </div>
                        <Button
                            size="sm"
                            onClick={() => navigate('/expiry-alerts')}
                            className="clay-btn bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold h-8 rounded-xl px-3.5 shadow-md"
                        >
                            Take Action <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
                        </Button>
                    </div>
                    <AutoGrid minWidth="160px" gap="gap-3">
                        <StatCard
                            label="Expired"
                            value={expirySummary?.expired || 0}
                            icon={XCircle}
                            color="text-red-600 dark:text-red-400"
                            bg="bg-red-100 dark:bg-red-950/50"
                            onClick={() => navigate('/expiry-alerts?filter=expired')}
                            className={expirySummary?.expired > 0 ? "border-red-400/50" : ""}
                        />
                        <StatCard
                            label="Critical (7 Days)"
                            value={expirySummary?.critical || 0}
                            icon={AlertCircle}
                            color="text-amber-600 dark:text-amber-400"
                            bg="bg-amber-100 dark:bg-amber-950/50"
                            onClick={() => navigate('/expiry-alerts?filter=critical')}
                        />
                        <StatCard
                            label="Overdue Invoices"
                            value={expirySummary?.invoiceAlerts || 0}
                            icon={FileText}
                            color="text-rose-600 dark:text-rose-400"
                            bg="bg-rose-100 dark:bg-rose-950/50"
                            onClick={() => navigate('/expiry-alerts?type=invoice')}
                        />
                        <StatCard
                            label="Total Alerts"
                            value={expirySummary?.totalAlerts || 0}
                            icon={BellRing}
                            color="text-blue-600 dark:text-blue-400"
                            bg="bg-blue-100 dark:bg-blue-950/50"
                            onClick={() => navigate('/expiry-alerts')}
                        />
                    </AutoGrid>
                </Card>
            )}

            {/* 11. Domain & Asset Tracking - Full Width */}
            {currentLayout.includes('domains') && (currentUser.role === 'admin' || currentUser.role === 'owner') && (activeTab === 'all' || activeTab === 'operations') && (
                <Card className="p-5 sm:p-6 space-y-4 w-full">
                    <div className="flex items-center justify-between pb-3 border-b border-border/40">
                        <div className="flex items-center gap-3">
                            <div className="clay-icon h-9 w-9 rounded-xl bg-indigo-100 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                                <Globe className="h-5 w-5" />
                            </div>
                            <div>
                                <h3 className="text-sm font-extrabold uppercase tracking-wider text-foreground">{customLabels.domains || 'Domain & Asset Tracking'}</h3>
                                <p className="text-[11px] text-muted-foreground font-medium">Domain lifecycle and SSL security</p>
                            </div>
                        </div>
                        <Button variant="ghost" size="sm" className="text-xs font-bold h-8 rounded-xl px-3" onClick={() => navigate('/domains')}>
                            Manage <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
                        </Button>
                    </div>
                    <AutoGrid minWidth="160px" gap="gap-3">
                        <StatCard label="Total Assets" value={domainStats?.total || 0} icon={Globe} color="text-indigo-600 dark:text-indigo-400" bg="bg-indigo-100 dark:bg-indigo-950/50" onClick={() => navigate('/domains')} />
                        <StatCard label="Expiring Soon" value={domainStats?.expiringSoon || 0} icon={Clock} color="text-amber-600 dark:text-amber-400" bg="bg-amber-100 dark:bg-amber-950/50" onClick={() => navigate('/domains?filter=expiring')} />
                        <StatCard label="Active SSL" value={domainStats?.activeSsl || 0} icon={ShieldCheck} color="text-emerald-600 dark:text-emerald-400" bg="bg-emerald-100 dark:bg-emerald-950/50" onClick={() => navigate('/domains')} />
                        <StatCard label="Pending Renewal" value={domainStats?.pendingRenewal || 0} icon={AlertCircle} color="text-rose-600 dark:text-rose-400" bg="bg-rose-100 dark:bg-rose-950/50" onClick={() => navigate('/domains')} />
                    </AutoGrid>
                </Card>
            )}

            {/* 12. Hosting Infrastructure - Full Width */}
            {currentLayout.includes('hosting') && (currentUser.role === 'admin' || currentUser.role === 'owner') && (activeTab === 'all' || activeTab === 'operations') && (
                <Card className="p-5 sm:p-6 space-y-4 w-full">
                    <div className="flex items-center justify-between pb-3 border-b border-border/40">
                        <div className="flex items-center gap-3">
                            <div className="clay-icon h-9 w-9 rounded-xl bg-orange-100 dark:bg-orange-950/50 flex items-center justify-center text-orange-600 dark:text-orange-400">
                                <Server className="h-5 w-5" />
                            </div>
                            <div>
                                <h3 className="text-sm font-extrabold uppercase tracking-wider text-foreground">Hosting Infrastructure</h3>
                                <p className="text-[11px] text-muted-foreground font-medium">Server availability & resource limits</p>
                            </div>
                        </div>
                        <Button variant="ghost" size="sm" className="text-xs font-bold h-8 rounded-xl px-3" onClick={() => navigate('/hosting')}>
                            Servers <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
                        </Button>
                    </div>
                    <AutoGrid minWidth="160px" gap="gap-3">
                        <StatCard label="Total Servers" value={domainStats?.totalServers || 0} icon={Server} color="text-orange-600 dark:text-orange-400" bg="bg-orange-100 dark:bg-orange-950/50" onClick={() => navigate('/hosting')} />
                        <StatCard label="Expiring" value={domainStats?.hostingExpiring || 0} icon={Clock} color="text-amber-600 dark:text-amber-400" bg="bg-amber-100 dark:bg-amber-950/50" onClick={() => navigate('/hosting')} />
                        <StatCard label="Disk Usage" value="82%" icon={ShieldCheck} color="text-emerald-600 dark:text-emerald-400" bg="bg-emerald-100 dark:bg-emerald-950/50" onClick={() => navigate('/hosting')} />
                        <StatCard label="Suspended" value={0} icon={AlertCircle} color="text-rose-600 dark:text-rose-400" bg="bg-rose-100 dark:bg-rose-950/50" onClick={() => navigate('/hosting')} />
                    </AutoGrid>
                </Card>
            )}

            {/* 13. Support Tickets - Full Width */}
            {currentLayout.includes('support_tickets') && !hiddenSubItems.includes('support_tickets') && (activeTab === 'all' || activeTab === 'operations') && (
                <Card className="p-5 sm:p-6 space-y-4 w-full">
                    <div className="flex items-center justify-between pb-3 border-b border-border/40">
                        <div className="flex items-center gap-3">
                            <div className="clay-icon h-9 w-9 rounded-xl bg-rose-100 dark:bg-rose-950/50 flex items-center justify-center text-rose-600 dark:text-rose-400">
                                <MessageSquare className="h-5 w-5" />
                            </div>
                            <div>
                                <h3 className="text-sm font-extrabold uppercase tracking-wider text-foreground">{customLabels.support_tickets || 'Support Tickets'}</h3>
                                <p className="text-[11px] text-muted-foreground font-medium">Issue resolution pipeline</p>
                            </div>
                        </div>
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 rounded-xl text-xs font-bold px-3" 
                            onClick={() => navigate('/tickets')}
                        >
                            Tickets <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
                        </Button>
                    </div>
                    <AutoGrid minWidth="160px" gap="gap-3">
                        {!hiddenSubItems.includes('open') && (
                            <StatCard label="Open" value={openTickets} icon={AlertCircle} color="text-blue-600 dark:text-blue-400" bg="bg-blue-100 dark:bg-blue-950/50" onClick={() => navigate('/tickets?status=open')} />
                        )}
                        {!hiddenSubItems.includes('critical') && (
                            <StatCard label="Critical/High" value={criticalTickets} icon={Clock} color="text-rose-600 dark:text-rose-400" bg="bg-rose-100 dark:bg-rose-950/50" onClick={() => navigate('/tickets?priority=critical')} />
                        )}
                        {!hiddenSubItems.includes('resolved') && (
                            <StatCard label="Resolved" value={resolvedTickets} icon={CheckCircle} color="text-emerald-600 dark:text-emerald-400" bg="bg-emerald-100 dark:bg-emerald-950/50" onClick={() => navigate('/tickets?status=resolved')} />
                        )}
                    </AutoGrid>
                </Card>
            )}

            {/* 5. Sales & Leads Intelligence Dedicated Section */}
            {currentUser?.role !== 'client' && (activeTab === 'all' || activeTab === 'finance') && (
                <div className="pt-2">
                    <SalesDashboardSection />
                </div>
            )}

            {/* Clay Confirmation Modals for Break & Clock Out */}
            {showConfirmModal && createPortal(
                <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="clay-card w-full max-w-sm p-6 relative flex flex-col items-center text-center animate-in zoom-in-95 duration-200">
                        {confirmAction === 'break' ? (
                            <>
                                <div className="clay-icon h-14 w-14 rounded-2xl bg-amber-100 dark:bg-amber-950/50 text-amber-600 flex items-center justify-center mb-4">
                                    <Coffee className="h-7 w-7" />
                                </div>
                                <h3 className="text-lg font-extrabold text-foreground mb-1">
                                    {attendanceStatus === 'break' ? 'Resume Session?' : 'Take a Break?'}
                                </h3>
                                <p className="text-xs text-muted-foreground leading-relaxed px-2 mb-6 font-medium">
                                    {attendanceStatus === 'break'
                                        ? 'Ready to resume your active work session timer?'
                                        : 'Take a break? This will temporarily pause your shift timer.'}
                                </p>
                                <div className="flex items-center gap-3 w-full">
                                    <Button variant="outline" className="flex-1 h-10 rounded-xl font-bold text-xs" onClick={() => setShowConfirmModal(false)}>
                                        Cancel
                                    </Button>
                                    <Button className="flex-1 h-10 rounded-xl font-bold text-xs clay-btn bg-amber-500 hover:bg-amber-600 text-white shadow-md" onClick={executeConfirm}>
                                        Confirm
                                    </Button>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="clay-icon h-14 w-14 rounded-2xl bg-rose-100 dark:bg-rose-950/50 text-rose-600 flex items-center justify-center mb-4">
                                    <StopCircle className="h-7 w-7" />
                                </div>
                                <h3 className="text-lg font-extrabold text-foreground mb-1">End Work Shift?</h3>
                                <p className="text-xs text-muted-foreground leading-relaxed px-2 mb-6 font-medium">
                                    Clock out for today? This will submit your logged session duration.
                                </p>
                                <div className="flex items-center gap-3 w-full">
                                    <Button variant="outline" className="flex-1 h-10 rounded-xl font-bold text-xs" onClick={() => setShowConfirmModal(false)}>
                                        Cancel
                                    </Button>
                                    <Button className="flex-1 h-10 rounded-xl font-bold text-xs clay-btn bg-rose-600 hover:bg-rose-700 text-white shadow-md" onClick={executeConfirm}>
                                        Clock Out
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
