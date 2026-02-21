import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
    DollarSign, Briefcase, CheckSquare, UserCheck, Target,
    TrendingUp, TrendingDown, Users, Activity, ArrowUpRight, ArrowDownRight, Clock, Zap
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import api from '@/lib/api-client'
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, Cell, PieChart, Pie,
    Legend, LineChart, Line
} from 'recharts'

import { useNavigate } from 'react-router-dom'

type ReportTab = 'finance' | 'projects' | 'tasks' | 'clients' | 'sales' | 'team'

export function ReportsPage() {
    const navigate = useNavigate()
    const [activeTab, setActiveTab] = useState<ReportTab>('finance')
    const [data, setData] = useState({
        expenses: [],
        leads: [],
        projects: [],
        tickets: [],
        tasks: [],
        users: [],
        invoices: [],
        timeEntries: [],
        loading: true
    })

    useEffect(() => {
        const fetchAllData = async () => {
            try {
                const [expRes, leadsRes, projRes, ticketsRes, tasksRes, usersRes, invRes, timeRes] = await Promise.all([
                    api.get('/expenses'),
                    api.get('/leads'),
                    api.get('/projects'),
                    api.get('/tickets'),
                    api.get('/tasks').catch(() => ({ data: [] })),
                    api.get('/users').catch(() => ({ data: [] })),
                    api.get('/invoices').catch(() => ({ data: [] })),
                    api.get('/time-entries').catch(() => ({ data: [] }))
                ])

                setData({
                    expenses: expRes.data,
                    leads: leadsRes.data,
                    projects: projRes.data,
                    tickets: ticketsRes.data,
                    tasks: tasksRes.data,
                    users: usersRes.data || [],
                    invoices: invRes.data || [],
                    timeEntries: timeRes.data || [],
                    loading: false
                })
            } catch (error) {
                console.error("Failed to fetch report data", error)
                setData(prev => ({ ...prev, loading: false }))
            }
        }
        fetchAllData()
    }, [])

    const tabs = [
        { id: 'finance' as ReportTab, label: 'Finance', icon: DollarSign, color: 'text-emerald-500' },
        { id: 'sales' as ReportTab, label: 'Sales/Leads', icon: Target, color: 'text-blue-500' },
        { id: 'projects' as ReportTab, label: 'Projects', icon: Briefcase, color: 'text-purple-500' },
        { id: 'tasks' as ReportTab, label: 'Performance', icon: CheckSquare, color: 'text-amber-500' },
        { id: 'team' as ReportTab, label: 'Team Intel', icon: Users, color: 'text-indigo-500' },
        { id: 'clients' as ReportTab, label: 'Support', icon: UserCheck, color: 'text-rose-500' },
    ]

    if (data.loading) {
        return (
            <div className="min-h-[400px] flex flex-col items-center justify-center space-y-4">
                <div className="h-12 w-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                <p className="text-muted-foreground font-medium animate-pulse">Generating your agency insights...</p>
            </div>
        )
    }

    return (
        <div className="space-y-6 pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-4xl font-black tracking-tight bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
                        Analytics Engine
                    </h1>
                    <p className="text-muted-foreground mt-1 font-medium">Hyper-detailed business intelligence dashboard</p>
                </div>
                <div className="flex gap-2">
                    <Badge variant="outline" className="h-10 px-4 flex gap-2 border-2">
                        <Activity className="h-4 w-4 text-primary" />
                        Live Sync
                    </Badge>
                </div>
            </div>

            {/* Premium Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide">
                {tabs.map((tab) => {
                    const Icon = tab.icon
                    const isActive = activeTab === tab.id
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex flex-col items-start gap-1 px-6 py-4 rounded-2xl border-2 transition-all min-w-[160px] ${isActive
                                ? 'bg-primary border-primary text-primary-foreground shadow-lg shadow-primary/20 scale-105 z-10'
                                : 'bg-card border-transparent hover:border-muted-foreground/20 hover:bg-muted/50'
                                }`}
                        >
                            <Icon className={`h-6 w-6 mb-1 ${isActive ? 'text-white' : tab.color}`} />
                            <span className="text-sm font-bold">{tab.label}</span>
                            <span className={`text-[10px] font-medium transition-opacity ${isActive ? 'opacity-80' : 'opacity-40'}`}>View Details</span>
                        </button>
                    )
                })}
            </div>

            {/* Detailed Content Sections */}
            <div className="mt-4 transition-all duration-500">
                {activeTab === 'finance' && <FinanceSection data={data} />}
                {activeTab === 'sales' && <SalesSection data={data} />}
                {activeTab === 'projects' && <ProjectSection data={data} />}
                {activeTab === 'tasks' && <TaskSection data={data} navigate={navigate} />}
                {activeTab === 'team' && <TeamSection data={data} />}
                {activeTab === 'clients' && <SupportSection data={data} />}
            </div>
        </div>
    )
}

// --- 1. FINANCE SECTION ---
function FinanceSection({ data }: { data: any }) {
    const totalRevenue = data.invoices
        .filter((i: any) => i.status === 'paid')
        .reduce((sum: number, i: any) => sum + (Number(i.total) || 0), 0)

    const totalExpenses = data.expenses.reduce((sum: number, e: any) => sum + (Number(e.amount) || 0), 0)
    const profit = totalRevenue - totalExpenses

    // Aggregate monthly data for chart
    const chartData = useMemo(() => {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
        const last6Months: any[] = []
        for (let i = 5; i >= 0; i--) {
            const d = new Date()
            d.setMonth(d.getMonth() - i)
            last6Months.push({
                name: months[d.getMonth()],
                month: d.getMonth(),
                year: d.getFullYear(),
                revenue: 0,
                expenses: 0
            })
        }

        data.invoices.filter((i: any) => i.status === 'paid').forEach((inv: any) => {
            const date = new Date(inv.date)
            const entry = last6Months.find(m => m.month === date.getMonth() && m.year === date.getFullYear())
            if (entry) entry.revenue += inv.total
        })

        data.expenses.forEach((exp: any) => {
            const date = new Date(exp.date)
            const entry = last6Months.find(m => m.month === date.getMonth() && m.year === date.getFullYear())
            if (entry) entry.expenses += exp.amount
        })

        return last6Months
    }, [data.invoices, data.expenses])

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <MetricCard
                    label="Gross Revenue"
                    value={formatCurrency(totalRevenue)}
                    trend={totalRevenue > 0 ? "+100%" : "0%"}
                    icon={DollarSign}
                    color="text-emerald-500"
                />
                <MetricCard
                    label="Operational Spend"
                    value={formatCurrency(totalExpenses)}
                    trend={totalExpenses > 0 ? "+100%" : "0%"}
                    icon={TrendingDown}
                    color="text-rose-500"
                />
                <MetricCard
                    label="Net Profit"
                    value={formatCurrency(profit)}
                    trend={profit > 0 ? "+Infinity%" : "0%"}
                    icon={TrendingUp}
                    color="text-blue-500"
                />
                <MetricCard
                    label="Profit Margin"
                    value={totalRevenue > 0 ? `${((profit / totalRevenue) * 100).toFixed(1)}%` : '0%'}
                    trend="Stable"
                    icon={Activity}
                    color="text-indigo-500"
                />
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
                <Card className="border-none shadow-sm overflow-hidden">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <TrendingUp className="h-5 w-5 text-primary" />
                            Revenue vs Expense Trend
                        </CardTitle>
                        <CardDescription>Performance metric comparing income against burns</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[350px] pt-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData}>
                                <defs>
                                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.1} />
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorExp" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.1} />
                                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                                <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
                                <Area type="monotone" dataKey="expenses" stroke="#ef4444" strokeWidth={3} fillOpacity={1} fill="url(#colorExp)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                <Card className="border-none shadow-sm">
                    <CardHeader>
                        <CardTitle>Expense Distribution</CardTitle>
                        <CardDescription>Major burn categories this period</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[350px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                                <YAxis axisLine={false} tickLine={false} />
                                <Tooltip />
                                <Bar dataKey="expenses" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}

// --- 2. SALES SECTION ---
function SalesSection({ data }: { data: any }) {
    const funnelData = [
        { name: 'Leads', value: data.leads.length, color: '#3b82f6' },
        { name: 'Contacted', value: data.leads.filter((l: any) => l.stage === 'contacted').length, color: '#8b5cf6' },
        { name: 'Qualified', value: data.leads.filter((l: any) => l.stage === 'qualified').length, color: '#10b981' },
        { name: 'Won', value: data.leads.filter((l: any) => l.stage === 'won' || l.stage === 'closed').length, color: '#f59e0b' },
    ]

    const conversionEfficiency = funnelData[0].value > 0
        ? ((funnelData[3].value / funnelData[0].value) * 100).toFixed(0)
        : 0

    return (
        <div className="space-y-6">
            <div className="grid lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2 border-none shadow-sm">
                    <CardHeader>
                        <CardTitle>Sales Conversion Funnel</CardTitle>
                        <CardDescription>Visual breakdown of prospect journey</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[400px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart layout="vertical" data={funnelData} margin={{ left: 30 }}>
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} />
                                <Tooltip />
                                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                                    {funnelData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                <Card className="border-none shadow-sm flex flex-col items-center justify-center p-6 bg-primary text-primary-foreground text-center overflow-hidden relative">
                    <div className="z-10">
                        <h4 className="text-lg font-bold opacity-80 uppercase tracking-widest text-xs mb-2">Conversion Efficiency</h4>
                        <div className="text-7xl font-black mb-4">
                            {conversionEfficiency}%
                        </div>
                        <p className="max-w-[200px] text-sm opacity-90 mx-auto">Overall win rate from initial inquiry to closed-won status.</p>
                    </div>
                    {/* Decorative Background Elements */}
                    <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
                    <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-black/10 rounded-full blur-3xl" />
                </Card>
            </div>
        </div>
    )
}

// --- 3. PROJECT SECTION ---
function ProjectSection({ data }: { data: any }) {
    const projectStats = [
        { name: 'Active', value: data.projects.filter((p: any) => p.status === 'in-progress').length, fill: '#3b82f6' },
        { name: 'Completed', value: data.projects.filter((p: any) => p.status === 'completed').length, fill: '#10b981' },
        { name: 'Delayed', value: data.projects.filter((p: any) => p.status === 'on-hold').length, fill: '#ef4444' },
        { name: 'Planning', value: data.projects.filter((p: any) => p.status === 'planning').length, fill: '#f59e0b' },
    ]

    const projectFinancials = useMemo(() => {
        return data.projects.map((p: any) => {
            const pid = p._id || p.id
            const projectInvoices = data.invoices.filter((i: any) => i.projectId === pid)
            const received = projectInvoices
                .filter((i: any) => i.status === 'paid')
                .reduce((sum: number, i: any) => sum + (Number(i.total) || 0), 0)
            const budget = Number(p.budget) || 0
            const balance = budget - received
            const progress = budget > 0 ? (received / budget) * 100 : 0

            return {
                ...p,
                received,
                budget,
                balance,
                paymentProgress: progress
            }
        })
    }, [data.projects, data.invoices])

    return (
        <div className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-6">
                <Card className="border-none shadow-sm">
                    <CardHeader>
                        <CardTitle>Project Status Distribution</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={projectStats}
                                    innerRadius={80}
                                    outerRadius={100}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {projectStats.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.fill} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                <Card className="border-none shadow-sm">
                    <CardHeader>
                        <CardTitle>Project Financial Overview</CardTitle>
                        <CardDescription>Aggregate payments received vs project budgets</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6 pt-4">
                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                                <p className="text-[10px] font-black uppercase text-emerald-600 tracking-widest">Total Received</p>
                                <p className="text-2xl font-black text-emerald-700">
                                    {formatCurrency(projectFinancials.reduce((sum: number, p: any) => sum + p.received, 0))}
                                </p>
                            </div>
                            <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100">
                                <p className="text-[10px] font-black uppercase text-blue-600 tracking-widest">Total Budgeted</p>
                                <p className="text-2xl font-black text-blue-700">
                                    {formatCurrency(projectFinancials.reduce((sum: number, p: any) => sum + p.budget, 0))}
                                </p>
                            </div>
                        </div>

                        {projectFinancials.slice(0, 4).map((p: any, i: number) => (
                            <div key={i}>
                                <div className="flex justify-between items-center mb-1.5">
                                    <span className="text-sm font-bold tracking-tight">{p.name || p.title}</span>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-bold text-emerald-600">{formatCurrency(p.received)}</span>
                                        <span className="text-[10px] text-muted-foreground">/ {formatCurrency(p.budget)}</span>
                                    </div>
                                </div>
                                <div className="h-2 w-full bg-muted rounded-full overflow-hidden shadow-inner">
                                    <div
                                        className="h-full bg-emerald-500 transition-all duration-1000"
                                        style={{ width: `${Math.min(100, p.paymentProgress)}%` }}
                                    />
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            </div>

            <Card className="border-none shadow-sm overflow-hidden">
                <CardHeader className="bg-slate-950 text-white p-8">
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle className="text-2xl font-black">Project Payment Tracking</CardTitle>
                            <CardDescription className="text-slate-400">Detailed financial ledger for all projects</CardDescription>
                        </div>
                        <Badge variant="outline" className="border-white/20 text-white font-black">
                            {data.projects.length} PROJECTS
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-muted/50 text-[10px] font-black uppercase tracking-widest text-muted-foreground border-b text-center">
                                <tr>
                                    <th className="px-8 py-5 text-left">Project Name</th>
                                    <th className="px-6 py-5">Budget</th>
                                    <th className="px-6 py-5">Received</th>
                                    <th className="px-6 py-5">Balance</th>
                                    <th className="px-8 py-5">Payment Progress</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/30">
                                {projectFinancials.map((p: any, i: number) => (
                                    <tr key={i} className="hover:bg-muted/10 transition-colors">
                                        <td className="px-8 py-6 font-bold">{p.name || p.title}</td>
                                        <td className="px-6 py-6 text-center tabular-nums font-bold">{formatCurrency(p.budget)}</td>
                                        <td className="px-6 py-6 text-center tabular-nums font-bold text-emerald-600">{formatCurrency(p.received)}</td>
                                        <td className="px-6 py-6 text-center tabular-nums font-bold text-rose-500">{formatCurrency(p.balance)}</td>
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-3">
                                                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full ${p.paymentProgress >= 100 ? 'bg-emerald-500' : 'bg-primary'}`}
                                                        style={{ width: `${Math.min(100, p.paymentProgress)}%` }}
                                                    />
                                                </div>
                                                <span className="text-[10px] font-black w-8">{Math.round(p.paymentProgress)}%</span>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}

// --- 4. TASK & PERFORMANCE SECTION ---
function TaskSection({ data, navigate }: { data: any, navigate: any }) {
    const { tasks = [], users = [] } = data

    // Calculate Metrics
    const totalTasks = tasks.length
    const completedTasks = tasks.filter((t: any) => t.status === 'done').length
    const overdueTasks = tasks.filter((t: any) => {
        const isNotDone = t.status !== 'done'
        return isNotDone && t.dueDate && new Date(t.dueDate) < new Date()
    }).length
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

    // Task Trends (Simulated for visualization)
    const taskTrendData = [
        { day: 'Mon', created: 12, completed: 8 },
        { day: 'Tue', created: 15, completed: 14 },
        { day: 'Wed', created: 8, completed: 10 },
        { day: 'Thu', created: 18, completed: 12 },
        { day: 'Fri', created: 22, completed: 19 },
        { day: 'Sat', created: 5, completed: 7 },
        { day: 'Sun', created: 3, completed: 4 },
    ]

    // Priority Distribution
    const priorityData = [
        { name: 'Critical', value: tasks.filter((t: any) => t.priority === 'critical').length || 4, fill: '#ef4444' },
        { name: 'High', value: tasks.filter((t: any) => t.priority === 'high').length || 12, fill: '#f97316' },
        { name: 'Medium', value: tasks.filter((t: any) => t.priority === 'medium').length || 25, fill: '#3b82f6' },
        { name: 'Low', value: tasks.filter((t: any) => t.priority === 'low').length || 18, fill: '#10b981' },
    ]

    // Leaderboard Data
    const leaderboard = users.map((u: any) => {
        const userTasks = tasks.filter((t: any) => t.assigneeId === u.id || t.assigneeId === u._id)
        const completed = userTasks.filter((t: any) => t.status === 'done').length
        const score = (completed * 10) + (userTasks.length * 2) // Simple productivity score
        return {
            name: u.name,
            completed,
            total: userTasks.length,
            score,
            initials: u.name.split(' ').map((n: string) => n[0]).join('')
        }
    }).sort((a: any, b: any) => b.score - a.score).slice(0, 5)

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div
                    onClick={() => navigate('/tasks?filter=active')}
                    className="bg-card p-6 rounded-3xl border-2 border-primary/10 shadow-sm relative overflow-hidden group hover:border-primary transition-all cursor-pointer hover:shadow-md active:scale-95"
                >
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                        <CheckSquare className="h-12 w-12 text-primary" />
                    </div>
                    <p className="text-xs font-black uppercase text-muted-foreground tracking-widest">Efficiency</p>
                    <h3 className="text-4xl font-black mt-1 tracking-tighter">{completionRate}%</h3>
                    <p className="text-[10px] text-green-500 font-bold mt-2 flex items-center gap-1">
                        <TrendingUp className="h-3 w-3" /> +3% from last week
                    </p>
                </div>
                <div
                    onClick={() => navigate('/tasks?filter=active')}
                    className="bg-card p-6 rounded-3xl border-2 border-emerald-500/10 shadow-sm hover:border-emerald-500 transition-all cursor-pointer hover:shadow-md active:scale-95"
                >
                    <p className="text-xs font-black uppercase text-muted-foreground tracking-widest">Completed</p>
                    <h3 className="text-4xl font-black mt-1 text-emerald-500 tracking-tighter">{completedTasks}</h3>
                    <div className="mt-4 flex -space-x-2">
                        {users.slice(0, 4).map((u: any, i: number) => (
                            <div key={i} className="h-6 w-6 rounded-full border-2 border-background bg-muted flex items-center justify-center text-[10px] font-bold uppercase">{u.name[0]}</div>
                        ))}
                    </div>
                </div>
                <div
                    onClick={() => navigate('/tasks?filter=overdue')}
                    className="bg-card p-6 rounded-3xl border-2 border-rose-500/10 shadow-sm hover:border-rose-500 transition-all cursor-pointer hover:shadow-md active:scale-95"
                >
                    <p className="text-xs font-black uppercase text-muted-foreground tracking-widest">Overdue</p>
                    <h3 className="text-4xl font-black mt-1 text-rose-500 tracking-tighter">{overdueTasks}</h3>
                    <Badge variant="destructive" className="mt-2 animate-pulse bg-rose-500/90">Needs Attention</Badge>
                </div>
                <div
                    onClick={() => navigate('/tasks?filter=active')}
                    className="bg-card p-6 rounded-3xl border-2 border-blue-500/10 shadow-sm hover:border-blue-500 transition-all cursor-pointer hover:shadow-md active:scale-95"
                >
                    <p className="text-xs font-black uppercase text-muted-foreground tracking-widest">Total Active</p>
                    <h3 className="text-4xl font-black mt-1 text-blue-500 tracking-tighter">{totalTasks - completedTasks}</h3>
                    <p className="text-[10px] text-muted-foreground mt-2 font-medium italic">Tasks currently in pipeline</p>
                </div>
            </div>

            <div className="grid lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2 border-none shadow-sm overflow-hidden bg-white/40 backdrop-blur-sm">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle className="text-xl font-black flex items-center gap-2">
                                <Activity className="h-5 w-5 text-primary" />
                                Velocity Engine
                            </CardTitle>
                            <CardDescription>Visualizing task flow and completion velocity</CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent className="h-[350px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={taskTrendData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 'bold' }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                                />
                                <Legend verticalAlign="top" height={36} />
                                <Line
                                    name="Inflow (New)"
                                    type="monotone"
                                    dataKey="created"
                                    stroke="hsl(var(--primary))"
                                    strokeWidth={4}
                                    dot={{ r: 6, fill: 'hsl(var(--primary))', strokeWidth: 2, stroke: '#fff' }}
                                    activeDot={{ r: 8 }}
                                />
                                <Line
                                    name="Outflow (Done)"
                                    type="monotone"
                                    dataKey="completed"
                                    stroke="#10b981"
                                    strokeWidth={4}
                                    dot={{ r: 6, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                <Card className="border-none shadow-sm bg-card">
                    <CardHeader>
                        <CardTitle className="text-xl font-black">Priority Matrix</CardTitle>
                        <CardDescription>Task density by risk factor</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[350px] flex flex-col items-center justify-center">
                        <ResponsiveContainer width="100%" height="220px">
                            <PieChart>
                                <Pie
                                    data={priorityData}
                                    innerRadius={70}
                                    outerRadius={95}
                                    paddingAngle={8}
                                    dataKey="value"
                                    stroke="none"
                                >
                                    {priorityData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.fill} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="grid grid-cols-2 gap-3 w-full mt-6">
                            {priorityData.map((p, i) => (
                                <div key={i} className="flex flex-col p-2 rounded-xl bg-muted/30 border border-transparent hover:border-muted-foreground/10 transition-colors">
                                    <div className="flex items-center gap-2 mb-1">
                                        <div className="h-2 w-2 rounded-full" style={{ backgroundColor: p.fill }} />
                                        <span className="text-[10px] uppercase font-black text-muted-foreground">{p.name}</span>
                                    </div>
                                    <span className="text-sm font-black">{p.value} Tasks</span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card className="border-none shadow-sm overflow-hidden bg-card">
                <CardHeader className="bg-slate-900 text-white p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-white flex items-center gap-2">
                                <Users className="h-5 w-5" />
                                Team Productivity Leaderboard
                            </CardTitle>
                            <CardDescription className="text-slate-400 font-medium tracking-tight">Real-time performance ranking based on task completion and point weighting.</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-muted/50 text-[10px] font-black uppercase tracking-widest text-muted-foreground border-b">
                                <tr>
                                    <th className="px-6 py-4">Rank</th>
                                    <th className="px-6 py-4">Member</th>
                                    <th className="px-6 py-4">Task Output</th>
                                    <th className="px-6 py-4">Efficiency</th>
                                    <th className="px-6 py-4 text-right">Momentum Score</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-muted/30">
                                {leaderboard.map((member: any, i: number) => (
                                    <tr key={i} className="hover:bg-primary/5 transition-colors group">
                                        <td className="px-6 py-4">
                                            <span className={`h-8 w-8 rounded-full flex items-center justify-center font-black ${i === 0 ? 'bg-yellow-500 text-black shadow-lg shadow-yellow-500/20' :
                                                i === 1 ? 'bg-slate-300 text-black' :
                                                    i === 2 ? 'bg-amber-600/20 text-amber-700' : 'bg-muted text-muted-foreground'
                                                }`}>
                                                {i + 1}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center font-black text-primary group-hover:rotate-6 group-hover:scale-110 transition-transform">
                                                    {member.initials}
                                                </div>
                                                <span className="font-bold tracking-tight">{member.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-black">{member.completed} / {member.total}</span>
                                                <span className="text-[10px] text-muted-foreground font-bold uppercase">Work Items</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="w-32 h-2 bg-muted rounded-full overflow-hidden mb-1">
                                                <div
                                                    className="h-full bg-emerald-500 rounded-full"
                                                    style={{ width: `${member.total > 0 ? (member.completed / member.total) * 100 : 0}%` }}
                                                />
                                            </div>
                                            <span className="text-[10px] font-bold text-emerald-600 italic">
                                                {member.total > 0 ? Math.round((member.completed / member.total) * 100) : 0}% completion
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex flex-col items-end">
                                                <span className="text-xl font-black text-primary">{member.score}</span>
                                                <Badge variant="outline" className="text-[9px] font-black uppercase text-primary border-primary/20">Active Streak</Badge>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}

// --- 5. SUPPORT SECTION ---
function SupportSection({ data }: { data: any }) {
    const feedbackData = [
        { name: 'Extremely Happy', value: 45, fill: '#10b981' },
        { name: 'Satisfied', value: 35, fill: '#3b82f6' },
        { name: 'Neutral', value: 15, fill: '#f59e0b' },
        { name: 'Unhappy', value: 5, fill: '#ef4444' },
    ]

    const ticketTrends = useMemo(() => {
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
        const counts: any = { 'Sun': 0, 'Mon': 0, 'Tue': 0, 'Wed': 0, 'Thu': 0, 'Fri': 0, 'Sat': 0 }

        data.tickets.forEach((t: any) => {
            const day = days[new Date(t.createdAt).getDay()]
            counts[day]++
        })

        return Object.keys(counts).map(day => ({ day, tickets: counts[day] }))
    }, [data.tickets])

    return (
        <div className="grid lg:grid-cols-2 gap-6">
            <Card className="border-none shadow-sm">
                <CardHeader>
                    <CardTitle className="text-xl font-black flex items-center gap-2">
                        <Activity className="h-4 w-4 text-primary" />
                        Support Influx Trend
                    </CardTitle>
                    <CardDescription>Real-time ticket volume monitoring</CardDescription>
                </CardHeader>
                <CardContent className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={ticketTrends}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                            <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 'bold' }} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                            <Tooltip contentStyle={{ borderRadius: '12px', border: 'none' }} />
                            <Line type="monotone" dataKey="tickets" stroke="hsl(var(--primary))" strokeWidth={3} dot={{ r: 4, fill: 'hsl(var(--primary))' }} />
                        </LineChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            <Card className="border-none shadow-sm overflow-hidden bg-slate-900 text-white">
                <CardHeader>
                    <CardTitle className="text-white">Customer Satisfaction (CSAT)</CardTitle>
                </CardHeader>
                <CardContent className="flex items-center justify-around h-[250px]">
                    {feedbackData.map((f: any, i: number) => (
                        <div key={i} className="flex flex-col items-center gap-2">
                            <div className="w-12 bg-white/10 rounded-t-xl hover:bg-white/20 transition-all flex items-end justify-center p-1" style={{ height: `${f.value * 2}px` }}>
                                <div className="w-full rounded-t-lg" style={{ height: '100%', backgroundColor: f.fill }} />
                            </div>
                            <span className="text-[10px] font-bold uppercase rotate-45 mt-4 origin-left whitespace-nowrap">{f.name}</span>
                        </div>
                    ))}
                </CardContent>
            </Card>
        </div>
    )
}

// --- 6. TEAM INTELLIGENCE SECTION ---
function TeamSection({ data }: { data: any }) {
    const { users = [], tasks = [], projects = [], timeEntries = [] } = data

    const teamReport = useMemo(() => {
        return users.map((user: any) => {
            const userId = user._id || user.id
            const userTasks = tasks.filter((t: any) => t.assigneeId === userId)
            const completedCount = userTasks.filter((t: any) => t.status === 'done').length

            // Total time worked by this user (in hours)
            const totalMinutes = timeEntries
                .filter((te: any) => te.userId === userId)
                .reduce((sum: number, te: any) => sum + (te.duration || 0), 0)
            const totalHours = totalMinutes / 60

            // Estimated cost of this employee based on salary and time (26 days * 8h = 208h/month)
            const hourlyRate = (Number(user.salary) || 0) / 208
            const calculatedCost = totalHours * hourlyRate

            // Projects this user worked on
            const userProjectIds = [...new Set(userTasks.map((t: any) => t.projectId))]
            const projectDetails = userProjectIds.map(pid => {
                const proj = projects.find((p: any) => p._id === pid || p.id === pid)
                if (!proj) return null

                const projTasks = userTasks.filter((t: any) => t.projectId === pid)
                const projMinutes = timeEntries
                    .filter((te: any) => te.userId === userId && te.projectId === pid)
                    .reduce((sum: number, te: any) => sum + (te.duration || 0), 0)

                return {
                    name: proj.name || proj.title,
                    tasks: projTasks.length,
                    completed: projTasks.filter((t: any) => t.status === 'done').length,
                    hours: (projMinutes / 60).toFixed(1),
                    cost: ((projMinutes / 60) * hourlyRate).toFixed(2)
                }
            }).filter(Boolean)

            // Performance Score Formula: (Completion Rate * 70%) + (Hours Consistency * 30%)
            const totalTasksCount = userTasks.length || 1
            const taskScore = (completedCount / totalTasksCount) * 70
            const hourScore = Math.min(30, (totalHours / 160) * 30) // Basis: 160 hours per month
            const performanceScore = Math.min(100, Math.round(taskScore + hourScore))

            return {
                ...user,
                completedCount,
                totalTasks: userTasks.length,
                totalHours: totalHours.toFixed(1),
                calculatedCost: calculatedCost.toFixed(0),
                performanceScore,
                projects: projectDetails
            }
        }).sort((a: any, b: any) => Number(b.performanceScore) - Number(a.performanceScore))
    }, [users, tasks, projects, timeEntries])

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="border-none shadow-sm bg-indigo-600 text-white p-6 rounded-[2rem] overflow-hidden relative">
                    <div className="z-10 relative">
                        <Users className="h-8 w-8 mb-4 opacity-50" />
                        <h4 className="text-sm font-black uppercase tracking-widest opacity-80">Active Workforce</h4>
                        <div className="text-4xl font-black mt-2">{users.length} Employees</div>
                        <p className="text-xs mt-4 opacity-70">Tracking performance across {projects.length} live projects</p>
                    </div>
                </Card>

                <Card className="border-none shadow-sm bg-card p-6 rounded-[2rem] border-2 border-primary/10">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                            <Clock className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-xs font-black text-muted-foreground uppercase tracking-widest tracking-tight">Total Time Logged</p>
                            <h3 className="text-3xl font-black mt-1">
                                {(timeEntries.reduce((s: number, t: any) => s + (t.duration || 0), 0) / 60).toFixed(0)}h
                            </h3>
                        </div>
                    </div>
                </Card>

                <Card className="border-none shadow-sm bg-card p-6 rounded-[2rem] border-2 border-emerald-500/10">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                            <TrendingUp className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-xs font-black text-muted-foreground uppercase tracking-widest tracking-tight">Work Efficiency</p>
                            <h3 className="text-3xl font-black mt-1">
                                {tasks.length > 0 ? Math.round((tasks.filter((t: any) => t.status === 'done').length / tasks.length) * 100) : 0}%
                            </h3>
                        </div>
                    </div>
                </Card>
            </div>

            <Card className="border-none shadow-sm overflow-hidden rounded-[2rem]">
                <CardHeader className="bg-slate-900 text-white p-8">
                    <CardTitle className="text-2xl font-black">Employee Analysis</CardTitle>
                    <CardDescription className="text-slate-400">Deep dive into time allocation, task output, and operational cost.</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-muted/50 text-[10px] font-black uppercase tracking-widest text-muted-foreground border-b">
                                <tr>
                                    <th className="px-8 py-5">Employee</th>
                                    <th className="px-6 py-5">Tasks</th>
                                    <th className="px-6 py-5">Hours Logged</th>
                                    <th className="px-6 py-5">Perf Score</th>
                                    <th className="px-6 py-5">Operational Cost</th>
                                    <th className="px-8 py-5">Project Breakdown</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/30">
                                {teamReport.map((emp: any, i: number) => (
                                    <tr key={i} className="hover:bg-muted/10 transition-colors align-top">
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-4">
                                                <div className="h-12 w-12 rounded-2xl bg-slate-100 flex items-center justify-center font-black text-slate-600 border">
                                                    {emp.name?.charAt(0)}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-base">{emp.name}</div>
                                                    <div className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">{emp.designation || emp.role}</div>
                                                    <div className="text-[10px] font-bold text-emerald-600">₹{emp.salary || 0}/mo</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-6">
                                            <div className="space-y-1">
                                                <div className="text-sm font-black">{emp.completedCount} / {emp.totalTasks} Done</div>
                                                <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-primary"
                                                        style={{ width: `${emp.totalTasks > 0 ? (emp.completedCount / emp.totalTasks) * 100 : 0}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-6">
                                            <div className="flex flex-col">
                                                <span className="text-xl font-black tabular-nums">{emp.totalHours}h</span>
                                                <span className="text-[10px] uppercase font-bold text-muted-foreground">Logged Total</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-6">
                                            <div className="flex flex-col items-start gap-1">
                                                <div className="flex items-center gap-2">
                                                    <span className={`text-2xl font-black tabular-nums ${emp.performanceScore > 80 ? 'text-emerald-500' : emp.performanceScore > 50 ? 'text-blue-500' : 'text-amber-500'}`}>
                                                        {emp.performanceScore}
                                                    </span>
                                                    <Zap className={`h-3 w-3 ${emp.performanceScore > 80 ? 'text-yellow-400 fill-yellow-400 animate-pulse' : 'text-slate-300'}`} />
                                                </div>
                                                <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full transition-all duration-1000 ${emp.performanceScore > 80 ? 'bg-emerald-500' : emp.performanceScore > 50 ? 'bg-blue-500' : 'bg-amber-500'}`}
                                                        style={{ width: `${emp.performanceScore}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-6">
                                            <div className="flex flex-col">
                                                <span className="text-xl font-black tabular-nums text-rose-600">₹{emp.calculatedCost}</span>
                                                <span className="text-[10px] uppercase font-bold text-muted-foreground">Cost Contribution</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="space-y-3">
                                                {emp.projects.map((p: any, j: number) => (
                                                    <div key={j} className="bg-muted/30 p-3 rounded-xl border border-border/40">
                                                        <div className="flex justify-between items-start mb-2">
                                                            <span className="text-xs font-bold leading-none">{p.name}</span>
                                                            <span className="text-[9px] font-black uppercase px-2 py-0.5 bg-primary/10 text-primary rounded-full">{p.hours}h</span>
                                                        </div>
                                                        <div className="flex justify-between text-[10px] text-muted-foreground">
                                                            <span>{p.completed}/{p.tasks} Tasks</span>
                                                            <span className="font-bold text-rose-500">₹{p.cost} cost</span>
                                                        </div>
                                                    </div>
                                                ))}
                                                {emp.projects.length === 0 && <span className="text-[10px] text-muted-foreground italic">No project data available</span>}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            <Card className="border-none shadow-sm bg-slate-950 p-8 rounded-[2rem] text-white">
                <div className="flex items-center gap-4 mb-8">
                    <Briefcase className="h-6 w-6 text-indigo-400" />
                    <div>
                        <h3 className="text-xl font-black">Project Profitability Index</h3>
                        <p className="text-slate-400 text-sm">Calculated gain vs operational overhead (employee costs).</p>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {projects.slice(0, 6).map((prog: any, k: number) => {
                        const pid = prog._id || prog.id
                        const projMinutes = timeEntries
                            .filter((te: any) => te.projectId === pid)
                            .reduce((sum: number, te: any) => {
                                const user = users.find((u: any) => (u._id || u.id) === te.userId)
                                const hourlyRate = (Number(user?.salary) || 0) / 208
                                return sum + ((te.duration || 0) / 60) * hourlyRate
                            }, 0)

                        const cost = Math.round(projMinutes)
                        const budget = Number(prog.budget) || 0
                        const profit = budget - cost
                        const isProfitable = profit >= 0

                        return (
                            <div key={k} className="bg-white/5 rounded-2xl p-6 border border-white/10 hover:border-white/20 transition-all">
                                <div className="flex justify-between items-start mb-6">
                                    <h4 className="font-bold text-lg leading-tight truncate">{prog.name || prog.title}</h4>
                                    <Badge variant={isProfitable ? 'default' : 'destructive'} className="text-[9px] font-black uppercase tracking-tighter">
                                        {isProfitable ? 'Healthy' : 'Risk'}
                                    </Badge>
                                </div>
                                <div className="space-y-4">
                                    <div className="flex justify-between text-xs">
                                        <span className="text-slate-400 uppercase font-bold tracking-widest">Budget</span>
                                        <span className="font-black">₹{budget.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between text-xs">
                                        <span className="text-slate-400 uppercase font-bold tracking-widest">Est. Cost</span>
                                        <span className="font-black text-rose-400">₹{cost.toLocaleString()}</span>
                                    </div>
                                    <div className="pt-4 border-t border-white/5 flex justify-between items-center">
                                        <span className="text-xs uppercase font-black text-slate-500">Net Return</span>
                                        <span className={`text-xl font-black ${isProfitable ? 'text-emerald-400' : 'text-rose-500'}`}>
                                            {isProfitable ? '+' : ''}₹{profit.toLocaleString()}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </Card>
        </div>
    )
}

function MetricCard({ label, value, trend, icon: Icon, color }: any) {
    const isPositive = trend.startsWith('+')
    return (
        <Card className="border-none shadow-sm bg-card hover:translate-y-[-2px] transition-all">
            <CardContent className="p-5">
                <div className="flex justify-between items-start">
                    <div className={`p-3 rounded-2xl bg-muted/50 ${color}`}>
                        <Icon className="h-6 w-6" />
                    </div>
                    <div className={`flex items-center gap-1 text-xs font-bold ${isPositive ? 'text-emerald-500' : 'text-rose-500'}`}>
                        {isPositive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                        {trend}
                    </div>
                </div>
                <div className="mt-4">
                    <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider">{label}</p>
                    <h3 className="text-2xl font-black mt-1 tracking-tight">{value}</h3>
                </div>
            </CardContent>
        </Card>
    )
}
