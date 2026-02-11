import { useState, useEffect } from 'react'
import api from '@/lib/api-client'
import { mapLead, mapProject, mapInvoice, mapExpense, mapTask } from '@/lib/mappers'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '@/store'
import { Button } from '@/components/ui/button'
import {
    Users, Briefcase, CheckSquare, Clock,
    Banknote, TrendingUp, TrendingDown, AlertCircle, PlayCircle, StopCircle, Target, Activity, Layers, Filter,
    Wallet, CreditCard, Coffee
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    Cell, PieChart, Pie
} from 'recharts'
import { WelcomeAnimation } from '@/components/welcome-animation'
import { useAttendance } from '@/hooks/use-attendance'
import { useDashboardMetrics } from '@/hooks/use-dashboard-metrics'

export function DashboardPage() {
    const navigate = useNavigate()
    const { currentUser, leads, invoices, setLeads, setExpenses, setProjects, setInvoices, setTasks } = useAppStore()
    const [settings, setSettings] = useState<any>(null)
    const userId = currentUser?.id || (currentUser as any)?._id

    // Hooks for business logic
    const {
        currentTime, attendanceStatus, elapsedTime,
        handleClockIn, handleBreakToggle, handleClockOut, formatElapsedTime
    } = useAttendance(userId)

    const {
        totalRevenue, totalExpenses, netProfit, outstandingInvoices,
        relevantProjects, relevantTasks, winRate, totalBillableHours,
        revenueData, leadStatusData, healthMetrics, recentActivities,
        revenueTrend, expenseTrend, currentLayout
    } = useDashboardMetrics(settings)

    if (!currentUser) return null;

    // Data Fetching (Initial load only)
    useEffect(() => {
        const loadInitialData = async () => {
            try {
                console.log('Fetching dashboard data...')
                const [settingsRes] = await Promise.all([
                    api.get('/settings').catch(() => ({ data: null })),
                    api.get('/leads').then(res => {
                        console.log('Leads fetched:', res.data.length)
                        setLeads(res.data.map(mapLead))
                    }).catch(err => console.error('Leads fetch fail:', err)),
                    api.get('/expenses').then(res => {
                        setExpenses(res.data.map(mapExpense))
                    }).catch(err => console.error('Expenses fetch fail:', err)),
                    api.get('/projects').then(res => {
                        console.log('Projects fetched:', res.data.length)
                        setProjects(res.data.map(mapProject))
                    }).catch(err => console.error('Projects fetch fail:', err)),
                    api.get('/invoices').then(res => {
                        console.log('Invoices fetched:', res.data.length)
                        setInvoices(res.data.map(mapInvoice))
                    }).catch(err => console.error('Invoices fetch fail:', err)),
                    api.get('/tasks').then(res => {
                        setTasks(res.data.map(mapTask))
                    }).catch(err => console.error('Tasks fetch fail:', err)),
                    api.get('/notifications').then(res => {
                        if (Array.isArray(res.data)) {
                            useAppStore.getState().setNotifications(res.data.map((n: any) => ({
                                id: n._id,
                                title: n.title,
                                message: n.message,
                                read: n.read,
                                createdAt: new Date(n.createdAt)
                            })))
                        }
                    }).catch(err => console.error('Notifications fetch fail:', err))
                ])
                if (settingsRes?.data) setSettings(settingsRes.data)
            } catch (error) {
                console.error("Dashboard Load Error", error)
            }
        }
        loadInitialData()
    }, [setLeads, setExpenses, setProjects, setInvoices, setTasks])

    const renderSection = (key: string) => {
        const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#64748b']

        switch (key) {
            case 'financials':
                return (
                    <div key="financials" className="space-y-3">
                        <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider pl-1 font-sans">Financial Overview</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            {[
                                { label: 'Total Revenue', value: formatCurrency(totalRevenue), trend: revenueTrend, icon: Banknote, color: 'text-emerald-600', bg: 'bg-emerald-500/10' },
                                { label: 'Total Expenses', value: formatCurrency(totalExpenses), trend: expenseTrend, icon: Wallet, color: 'text-red-600', bg: 'bg-red-500/10' },
                                { label: 'Net Profit', value: formatCurrency(netProfit), trend: revenueTrend, icon: TrendingUp, color: 'text-blue-600', bg: 'bg-blue-500/10' },
                                { label: 'Outstanding Invoices', value: formatCurrency(outstandingInvoices), trend: `${invoices.filter(i => i.status === 'pending').length} Pending`, icon: CreditCard, color: 'text-amber-600', bg: 'bg-amber-500/10' },
                            ].map((stat, i) => (
                                <div key={i} className="dashboard-card hover:-translate-y-1">
                                    <div className="dashboard-card-content flex flex-col justify-between h-full p-5">
                                        <div className="flex justify-between items-start mb-3">
                                            <div className={`p-2.5 rounded-xl ${stat.bg} ${stat.color} transition-colors`}>
                                                <stat.icon className="h-5 w-5" />
                                            </div>
                                            <div className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-background border border-border/40 ${stat.trend.includes('-') || stat.label === 'Total Expenses' ? 'text-amber-600' : 'text-emerald-600'}`}>
                                                {stat.trend.includes('-') || stat.label === 'Total Expenses' ? <TrendingDown className="h-3 w-3" /> : <TrendingUp className="h-3 w-3" />}
                                                {stat.trend}
                                            </div>
                                        </div>
                                        <div>
                                            <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">{stat.label}</p>
                                            <h3 className="text-2xl font-bold mt-1 tracking-tight text-foreground">{stat.value}</h3>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )
            case 'operational':
                return (
                    <div key="operational" className="space-y-3">
                        <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider pl-1 font-sans">Operational Efficiency</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            {[
                                { label: 'Active Projects', value: relevantProjects.filter(p => p.status === 'in-progress').length, sub: 'Projects in flight', icon: Briefcase, color: 'text-indigo-600', bg: 'bg-indigo-500/10', onClick: () => navigate('/projects') },
                                { label: 'Pending Tasks', value: relevantTasks.filter(t => t.status !== 'done').length, sub: 'Due this week', icon: CheckSquare, color: 'text-cyan-600', bg: 'bg-cyan-500/10', onClick: () => navigate('/tasks?filter=active') },
                                { label: 'Win Rate', value: `${winRate}%`, sub: 'Lead Conversion', icon: Target, color: 'text-purple-600', bg: 'bg-purple-500/10' },
                                { label: 'Billable Hours', value: `${totalBillableHours}h`, sub: 'Tracked time', icon: Clock, color: 'text-orange-600', bg: 'bg-orange-500/10' },
                            ].map((stat, i) => (
                                <div key={i} className={`dashboard-card hover:-translate-y-1 ${stat.onClick ? 'cursor-pointer active:scale-95' : ''}`} onClick={stat.onClick}>
                                    <div className="dashboard-card-content flex flex-col justify-between h-full p-5">
                                        <div className="flex justify-between items-start mb-3">
                                            <div className={`p-2.5 rounded-xl ${stat.bg} ${stat.color} transition-colors`}>
                                                <stat.icon className="h-5 w-5" />
                                            </div>
                                            <Activity className="h-4 w-4 text-muted-foreground/30" />
                                        </div>
                                        <div>
                                            <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">{stat.label}</p>
                                            <div className="flex items-baseline gap-2 mt-1">
                                                <h3 className="text-2xl font-bold tracking-tight text-foreground">{stat.value}</h3>
                                                <span className="text-[10px] text-muted-foreground font-medium">{stat.sub}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )
            case 'analytics':
                return (
                    <div key="analytics" className="dashboard-card lg:col-span-2">
                        <div className="dashboard-card-header">
                            <div>
                                <h3 className="dashboard-card-title">
                                    <Activity className="h-4 w-4 text-primary" />
                                    Financial Performance
                                </h3>
                                <p className="text-sm text-muted-foreground mt-1">Revenue trends over time</p>
                            </div>
                            <Select defaultValue="6m">
                                <SelectTrigger className="h-9 w-[120px]">
                                    <SelectValue placeholder="Period" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="6m">Last 6 Months</SelectItem>
                                    <SelectItem value="ytd">Year to Date</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="dashboard-card-content h-[350px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={revenueData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.15} />
                                            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))', fontWeight: 500 }} dy={10} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))', fontWeight: 500 }} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                        itemStyle={{ fontSize: '13px', fontWeight: 'bold', color: 'hsl(var(--foreground))' }}
                                        labelStyle={{ color: 'hsl(var(--muted-foreground))', marginBottom: '0.25rem' }}
                                    />
                                    <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
                                    <Area type="monotone" dataKey="expense" stroke="#ef4444" strokeWidth={2} strokeDasharray="5 5" fillOpacity={0} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                )
            case 'funnel':
                return (
                    <div key="funnel" className="dashboard-card flex flex-col">
                        <div className="dashboard-card-header">
                            <h3 className="dashboard-card-title">
                                <Target className="h-4 w-4 text-primary" />
                                Conversion Funnel
                            </h3>
                        </div>
                        <div className="dashboard-card-content flex-1 flex flex-col justify-center items-center">
                            <div className="w-full h-[200px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={leadStatusData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={65}
                                            outerRadius={85}
                                            paddingAngle={5}
                                            dataKey="value"
                                            stroke="hsl(var(--card))"
                                            strokeWidth={4}
                                        >
                                            {leadStatusData.map((_entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="grid grid-cols-2 gap-4 w-full mt-6">
                                {leadStatusData.map((item, i) => (
                                    <div key={i} className="flex items-center gap-3">
                                        <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                                        <div className="flex flex-col">
                                            <span className="text-[11px] uppercase font-bold text-muted-foreground leading-tight">{item.name}</span>
                                            <span className="text-sm font-bold text-foreground">{item.name === 'No Data' ? '-' : `${item.value} Leads`}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )
            case 'deadlines':
                return (
                    <div key="deadlines" className="dashboard-card">
                        <div className="dashboard-card-header">
                            <h3 className="dashboard-card-title text-red-600">
                                <AlertCircle className="h-4 w-4" />
                                Critical Deadlines
                            </h3>
                            <Badge variant="outline" className="border-red-200 text-red-600 bg-red-50 font-bold">HIGH PRIORITY</Badge>
                        </div>
                        <div className="divide-y divide-border/50">
                            {relevantTasks.filter(t => t.status !== 'done').slice(0, 4).map((task, i) => (
                                <div key={i} className="p-4 hover:bg-muted/30 transition-colors group cursor-pointer">
                                    <div className="flex justify-between items-start mb-1.5">
                                        <p className="font-semibold text-sm truncate group-hover:text-primary transition-colors pr-4">{task.title}</p>
                                        <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full whitespace-nowrap">Due Soon</span>
                                    </div>
                                    <div className="flex items-center justify-between mt-2">
                                        <Badge variant="secondary" className="text-[10px] h-5 font-medium bg-muted text-muted-foreground rounded-md">Project Task</Badge>
                                        <div className="flex -space-x-2">
                                            <div className="h-6 w-6 rounded-full border-2 border-card bg-muted flex items-center justify-center text-[10px] font-bold text-muted-foreground">U</div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )
            case 'health':
                return (
                    <div key="health" className="dashboard-card">
                        <div className="dashboard-card-header">
                            <h3 className="dashboard-card-title">
                                <Layers className="h-4 w-4 text-primary" />
                                Operational Health
                            </h3>
                        </div>
                        <div className="dashboard-card-content space-y-6">
                            {healthMetrics.map((metric, i) => (
                                <div key={i} className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="font-medium text-foreground">{metric.label}</span>
                                        <span className="font-bold text-foreground">{metric.value}%</span>
                                    </div>
                                    <div className="h-2.5 w-full bg-secondary rounded-full overflow-hidden">
                                        <div
                                            className={`h-full ${metric.color} rounded-full transition-all duration-1000`}
                                            style={{ width: `${metric.value}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )
            case 'activity':
                return (
                    <div key="activity" className="dashboard-card">
                        <div className="dashboard-card-header">
                            <h3 className="dashboard-card-title">
                                <Clock className="h-4 w-4 text-primary" />
                                Recent Activity
                            </h3>
                        </div>
                        <div className="divide-y divide-border/50">
                            {recentActivities.map((log, i) => (
                                <div key={i} className="p-4 flex gap-4 hover:bg-muted/30 transition-colors cursor-default">
                                    <div className={`h-9 w-9 rounded-xl ${log.bg} ${log.color} shrink-0 flex items-center justify-center`}>
                                        <log.icon className="h-4.5 w-4.5" />
                                    </div>
                                    <div className="flex flex-col justify-center">
                                        <span className="text-sm font-semibold text-foreground">{log.action}</span>
                                        <span className="text-xs text-muted-foreground font-medium">{log.user} • {log.time}</span>
                                    </div>
                                </div>
                            ))}
                            {recentActivities.length === 0 && (
                                <div className="p-8 text-center text-muted-foreground text-sm font-medium italic">No recent activity detected.</div>
                            )}
                        </div>
                        <div className="p-4 border-t border-border/50 text-center">
                            <Button variant="ghost" size="sm" className="text-xs font-semibold hover:text-primary">View Full Audit Log</Button>
                        </div>
                    </div>
                )
            case 'leads':
                return (
                    <div key="leads" className="dashboard-card overflow-hidden">
                        <div className="dashboard-card-header">
                            <div>
                                <h3 className="dashboard-card-title">
                                    <Users className="h-4 w-4 text-primary" />
                                    Business Opportunities
                                </h3>
                            </div>
                            <Button variant="outline" size="sm" onClick={() => navigate('/leads')} className="font-semibold text-xs transition-transform hover:scale-105">View All Leads</Button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-muted/40 text-[11px] uppercase font-bold tracking-wider text-muted-foreground border-b border-border/50">
                                    <tr>
                                        <th className="px-6 py-4">Company</th>
                                        <th className="px-6 py-4">Contact</th>
                                        <th className="px-6 py-4">Value</th>
                                        <th className="px-6 py-4">Stage</th>
                                        <th className="px-6 py-4 text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/40 text-sm">
                                    {leads.slice(0, 5).map((lead) => (
                                        <tr key={lead.id} className="hover:bg-muted/20 transition-colors">
                                            <td className="px-6 py-4 font-semibold text-foreground">
                                                {lead.company}
                                            </td>
                                            <td className="hidden md:table-cell px-6 py-4 text-muted-foreground font-medium">
                                                {lead.name}
                                            </td>
                                            <td className="hidden sm:table-cell px-6 py-4 font-bold text-foreground">
                                                {formatCurrency(lead.value)}
                                            </td>
                                            <td className="px-6 py-4">
                                                <Badge variant="secondary" className="rounded-md font-bold text-[10px] uppercase tracking-wide">{lead.stage}</Badge>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                                                    <Filter className="h-4 w-4" />
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )
            default:
                return null
        }
    }

    return (
        <div className="space-y-8 pb-10">
            {/* 1. Header & Attendance */}
            <div className="flex flex-col xl:flex-row gap-6 justify-between items-end">
                <div className="animate-in fade-in slide-in-from-left-4 duration-700 w-full xl:w-auto">
                    <div className="flex items-center gap-2">
                        <WelcomeAnimation />
                        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground font-sans">Dashboard</h1>
                    </div>
                    <p className="text-muted-foreground mt-2 text-sm md:text-base font-medium">
                        Welcome back, {currentUser.name}. Here's what's happening today.
                    </p>
                </div>

                <div className="dashboard-card flex flex-col sm:flex-row items-center gap-4 p-4 bg-background/50 border-border/60 animate-in fade-in slide-in-from-right-4 duration-700 w-full xl:w-auto">
                    <div className="w-full sm:w-auto flex justify-between sm:block px-0 sm:px-4 border-b sm:border-b-0 sm:border-r border-border/40 pb-2 sm:pb-0 text-left sm:text-right">
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">System Time</p>
                        <p className="text-xl font-mono font-bold tracking-tight">{currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>

                    <div className="w-full sm:w-auto flex flex-col sm:flex-row gap-2">
                        {attendanceStatus === 'out' ? (
                            <Button size="sm" onClick={handleClockIn} className="w-full sm:w-auto rounded-lg bg-emerald-600 hover:bg-emerald-700 font-semibold shadow-sm transition-all hover:shadow-md text-white">
                                <PlayCircle className="h-4 w-4 mr-2" />
                                Clock In
                            </Button>
                        ) : attendanceStatus === 'checked-out' ? (
                            <Badge variant="outline" className="w-full sm:w-auto justify-center h-9 px-4 rounded-lg font-bold border-muted-foreground/30 text-muted-foreground">
                                <CheckSquare className="h-4 w-4 mr-2" />
                                Shift Completed
                            </Badge>
                        ) : (
                            <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
                                <div className="hidden sm:block text-right mr-2">
                                    <p className="text-[10px] uppercase text-muted-foreground font-bold">Session</p>
                                    <p className="text-sm font-mono text-primary font-bold tabular-nums">{formatElapsedTime(elapsedTime)}</p>
                                </div>

                                <div className="flex gap-2 w-full sm:w-auto">
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className={`flex-1 sm:flex-none rounded-lg font-semibold transition-colors ${attendanceStatus === 'break' ? 'bg-amber-100 text-amber-900 border-amber-200 hover:bg-amber-200' : 'text-amber-600 border-amber-200 hover:bg-amber-50'}`}
                                        onClick={handleBreakToggle}
                                    >
                                        <Coffee className="h-4 w-4 mr-1" />
                                        {attendanceStatus === 'break' ? 'End Break' : 'Break'}
                                    </Button>

                                    <Button size="sm" variant="destructive" className="flex-1 sm:flex-none rounded-lg shadow-sm font-semibold text-white transition-transform hover:scale-105" onClick={handleClockOut} disabled={attendanceStatus === 'break'}>
                                        <StopCircle className="h-4 w-4 mr-2" />
                                        Clock Out
                                    </Button>
                                </div>
                                {/* Mobile Session Timer */}
                                <div className="sm:hidden w-full flex justify-between items-center bg-muted/30 p-2 rounded-lg mt-1">
                                    <span className="text-[10px] uppercase text-muted-foreground font-bold">Current Session</span>
                                    <span className="text-sm font-mono text-primary font-bold tabular-nums">{formatElapsedTime(elapsedTime)}</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Layout Rendering */}
            <div className="grid grid-cols-1 gap-8">
                {currentLayout.includes('financials') && renderSection('financials')}
                {currentLayout.includes('operational') && renderSection('operational')}

                <div className="grid lg:grid-cols-3 gap-8">
                    {currentLayout.includes('analytics') && renderSection('analytics')}
                    {currentLayout.includes('funnel') && renderSection('funnel')}
                </div>

                <div className="grid lg:grid-cols-3 gap-8">
                    {currentLayout.includes('deadlines') && renderSection('deadlines')}
                    {currentLayout.includes('health') && renderSection('health')}
                    {currentLayout.includes('activity') && renderSection('activity')}
                </div>

                {currentLayout.includes('leads') && renderSection('leads')}
            </div>
        </div>
    )
}
