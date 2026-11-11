import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
    DollarSign, Briefcase, CheckSquare, UserCheck, Target,
    TrendingUp, TrendingDown, Users, Activity, ArrowUpRight, ArrowDownRight, Clock, Zap,
    PhoneCall, CheckCircle2, Sparkles, Trophy, User,
    Search, ExternalLink, RotateCcw, BarChart3, AlertCircle,
    Flame, AlertTriangle, Layers
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
        stages: [] as any[],
        telecallerAnalytics: null as any,
        loading: true
    })

    useEffect(() => {
        const fetchAllData = async () => {
            try {
                const [expRes, leadsRes, projRes, ticketsRes, tasksRes, usersRes, invRes, timeRes, stagesRes, teleRes] = await Promise.all([
                    api.get('/expenses'),
                    api.get('/leads'),
                    api.get('/projects'),
                    api.get('/tickets'),
                    api.get('/tasks').catch(() => ({ data: [] })),
                    api.get('/users').catch(() => ({ data: [] })),
                    api.get('/invoices').catch(() => ({ data: [] })),
                    api.get('/time-entries').catch(() => ({ data: [] })),
                    api.get('/leads/stages').catch(() => ({ data: [] })),
                    api.get('/leads/telecaller-analytics?range=all').catch(() => ({ data: null }))
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
                    stages: stagesRes.data || [],
                    telecallerAnalytics: teleRes.data || null,
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
                {activeTab === 'sales' && <SalesSection data={data} navigate={navigate} />}
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
const getStageColorHex = (colorClass?: string, index: number = 0) => {
    const palette = ['#3b82f6', '#eab308', '#a855f7', '#10b981', '#ef4444', '#06b6d4', '#f97316', '#ec4899', '#8b5cf6']
    if (!colorClass) return palette[index % palette.length]
    if (colorClass.startsWith('#')) return colorClass
    if (colorClass.includes('blue')) return '#3b82f6'
    if (colorClass.includes('yellow') || colorClass.includes('amber')) return '#eab308'
    if (colorClass.includes('purple') || colorClass.includes('violet')) return '#a855f7'
    if (colorClass.includes('green') || colorClass.includes('emerald')) return '#10b981'
    if (colorClass.includes('red') || colorClass.includes('rose')) return '#ef4444'
    if (colorClass.includes('cyan') || colorClass.includes('teal')) return '#06b6d4'
    if (colorClass.includes('orange')) return '#f97316'
    if (colorClass.includes('pink')) return '#ec4899'
    return palette[index % palette.length]
}

function SalesSection({ data, navigate }: { data: any, navigate?: any }) {
    const [timeRange, setTimeRange] = useState<'all' | 'this_month' | 'this_week' | 'today'>('all')
    const [selectedAgent, setSelectedAgent] = useState<string>('all')
    const [selectedStage, setSelectedStage] = useState<string>('all')
    const [searchQuery, setSearchQuery] = useState<string>('')

    // 1. Raw Leads & Stages
    const allLeads = useMemo(() => Array.isArray(data.leads) ? data.leads : [], [data.leads])
    const stages = useMemo(() => {
        if (Array.isArray(data.stages) && data.stages.length > 0) {
            return data.stages
        }
        return [
            { id: 'new', label: 'New Leads', color: 'bg-blue-500', order: 0 },
            { id: 'discussion', label: 'In Discussion', color: 'bg-yellow-500', order: 1 },
            { id: 'proposal', label: 'Proposal Sent', color: 'bg-purple-500', order: 2 },
            { id: 'closed', label: 'Closed / Won', color: 'bg-green-500', order: 3 },
            { id: 'lose', label: 'Lost', color: 'bg-red-500', order: 4 },
        ]
    }, [data.stages])

    // List of agents for dropdown
    const availableAgents = useMemo(() => {
        const agentMap = new Map<string, string>()
        if (Array.isArray(data.users)) {
            data.users.forEach((u: any) => {
                if (u.name) agentMap.set(u._id || u.name, u.name)
            })
        }
        allLeads.forEach((l: any) => {
            if (l.assignedToName) agentMap.set(l.assignedTo || l.assignedToName, l.assignedToName)
            if (l.createdByName) agentMap.set(l.createdBy || l.createdByName, l.createdByName)
        })
        return Array.from(agentMap.entries()).map(([id, name]) => ({ id, name }))
    }, [data.users, allLeads])

    // 2. Filter Leads by Time, Agent, Stage, and Search
    const filteredLeads = useMemo(() => {
        const now = new Date()
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
        const weekStart = now.getTime() - 7 * 24 * 60 * 60 * 1000
        const monthStart = now.getTime() - 30 * 24 * 60 * 60 * 1000

        return allLeads.filter((lead: any) => {
            // Time filter
            const leadDate = new Date(lead.createdAt || lead.updatedAt || Date.now()).getTime()
            if (timeRange === 'today' && leadDate < todayStart) return false
            if (timeRange === 'this_week' && leadDate < weekStart) return false
            if (timeRange === 'this_month' && leadDate < monthStart) return false

            // Agent filter
            if (selectedAgent !== 'all') {
                const matches = (lead.assignedTo && lead.assignedTo === selectedAgent) ||
                                (lead.assignedToName && lead.assignedToName.toLowerCase() === selectedAgent.toLowerCase()) ||
                                (lead.createdBy && (lead.createdBy === selectedAgent || lead.createdBy._id === selectedAgent)) ||
                                (lead.createdByName && lead.createdByName.toLowerCase() === selectedAgent.toLowerCase())
                if (!matches) return false
            }

            // Stage filter
            if (selectedStage !== 'all') {
                if (selectedStage === 'closed') {
                    const s = (lead.stage || '').toLowerCase()
                    if (s !== 'closed' && s !== 'won' && !s.includes('closed') && !s.includes('won')) return false
                } else if (lead.stage !== selectedStage) {
                    return false
                }
            }

            // Search query
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase()
                const matchName = lead.name?.toLowerCase().includes(q)
                const matchCompany = lead.company?.toLowerCase().includes(q)
                const matchPhone = lead.phone?.toLowerCase().includes(q)
                const matchEmail = lead.email?.toLowerCase().includes(q)
                const matchSource = lead.source?.toLowerCase().includes(q)
                if (!matchName && !matchCompany && !matchPhone && !matchEmail && !matchSource) return false
            }

            return true
        })
    }, [allLeads, timeRange, selectedAgent, selectedStage, searchQuery])

    // 3. Executive Metrics
    const metrics = useMemo(() => {
        const total = filteredLeads.length
        let wonCount = 0
        let wonRevenue = 0
        let pipelineValue = 0
        let contactedCount = 0
        let overdueCount = 0
        let upcomingCount = 0
        const nowMs = Date.now()

        filteredLeads.forEach((lead: any) => {
            const val = Number(lead.value) || 0
            const stage = (lead.stage || '').toLowerCase()
            const isWon = stage === 'closed' || stage === 'won' || stage.includes('closed') || stage.includes('won')
            const isLost = stage === 'lose' || stage === 'lost' || stage.includes('lose') || stage.includes('lost')

            if (isWon) {
                wonCount++
                wonRevenue += val
            } else if (!isLost) {
                pipelineValue += val
            }

            const hasActivities = Array.isArray(lead.activities) && lead.activities.length > 0
            if (hasActivities || lead.lastFollowUpDate || lead.lastFollowUpOutcome || stage !== 'new') {
                contactedCount++
            }

            if (lead.reminder?.date) {
                const remMs = new Date(lead.reminder.date).getTime()
                if (remMs < nowMs && !lead.reminder.completed) {
                    overdueCount++
                } else if (!lead.reminder.completed) {
                    upcomingCount++
                }
            }
        })

        const winRate = total > 0 ? ((wonCount / total) * 100).toFixed(1) : '0'
        const avgDealWon = wonCount > 0 ? Math.round(wonRevenue / wonCount) : (total > 0 ? Math.round((pipelineValue + wonRevenue) / total) : 0)
        const contactRate = total > 0 ? ((contactedCount / total) * 100).toFixed(1) : '0'

        return {
            total,
            wonCount,
            wonRevenue,
            pipelineValue: pipelineValue + wonRevenue,
            activePipelineValue: pipelineValue,
            winRate,
            avgDealWon,
            contactedCount,
            contactRate,
            overdueCount,
            upcomingCount
        }
    }, [filteredLeads])

    // 4. Dynamic Pipeline Stages Breakdown
    const stageFlowData = useMemo(() => {
        const total = filteredLeads.length || 1
        return stages.map((st: any, idx: number) => {
            const leadsInStage = filteredLeads.filter((l: any) => {
                if (st.id === 'closed') {
                    return l.stage === 'closed' || l.stage === 'won' || (l.stage || '').toLowerCase().includes('won')
                }
                return l.stage === st.id
            })
            const count = leadsInStage.length
            const val = leadsInStage.reduce((acc: number, l: any) => acc + (Number(l.value) || 0), 0)
            const percentage = Math.round((count / total) * 100)
            const color = getStageColorHex(st.color, idx)

            return {
                id: st.id,
                label: st.label,
                count,
                value: val,
                percentage,
                color,
                colorClass: st.color || 'bg-primary'
            }
        })
    }, [stages, filteredLeads])

    // 5. Lead Acquisition Sources Breakdown
    const sourceBreakdown = useMemo(() => {
        const sourceMap = new Map<string, { total: number, won: number, wonRev: number, contacted: number }>()

        filteredLeads.forEach((lead: any) => {
            const src = (lead.source || 'Direct Inflow').trim() || 'Direct Inflow'
            if (!sourceMap.has(src)) {
                sourceMap.set(src, { total: 0, won: 0, wonRev: 0, contacted: 0 })
            }
            const s = sourceMap.get(src)!
            s.total++

            const stage = (lead.stage || '').toLowerCase()
            const isWon = stage === 'closed' || stage === 'won' || stage.includes('closed') || stage.includes('won')
            if (isWon) {
                s.won++
                s.wonRev += (Number(lead.value) || 0)
            }

            const hasAct = (Array.isArray(lead.activities) && lead.activities.length > 0) || lead.lastFollowUpOutcome || stage !== 'new'
            if (hasAct) {
                s.contacted++
            }
        })

        const palette = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#64748b']
        return Array.from(sourceMap.entries())
            .map(([source, stats], idx) => ({
                source,
                leads: stats.total,
                contacted: stats.contacted,
                won: stats.won,
                revenue: stats.wonRev,
                conversionRate: stats.total > 0 ? ((stats.won / stats.total) * 100).toFixed(1) : '0',
                color: palette[idx % palette.length]
            }))
            .sort((a, b) => b.leads - a.leads)
    }, [filteredLeads])

    // 6. Telecaller / Agent Leaderboard
    const agentLeaderboard = useMemo(() => {
        const agentMap = new Map<string, {
            name: string,
            role: string,
            assignedLeads: number,
            activitiesCount: number,
            contactedCount: number,
            wonCount: number,
            wonRevenue: number,
            overdueCount: number
        }>()

        // From telecaller analytics if available
        if (data.telecallerAnalytics?.agents && Array.isArray(data.telecallerAnalytics.agents)) {
            data.telecallerAnalytics.agents.forEach((ag: any) => {
                if (ag.name && ag.name !== 'Unassigned') {
                    agentMap.set(ag.name, {
                        name: ag.name,
                        role: ag.role || 'Telecaller',
                        assignedLeads: 0,
                        activitiesCount: ag.callsInRange || ag.callsToday || 0,
                        contactedCount: ag.uniqueLeadsContacted?.length || 0,
                        wonCount: ag.dealsWon || 0,
                        wonRevenue: ag.dealsWonValue || 0,
                        overdueCount: ag.overdueFollowups || 0
                    })
                }
            })
        }

        // Aggregate from filtered leads
        const nowMs = Date.now()
        filteredLeads.forEach((lead: any) => {
            const agentName = lead.assignedToName || lead.createdByName || lead.lastContactedBy || 'Unassigned'
            if (!agentMap.has(agentName)) {
                agentMap.set(agentName, {
                    name: agentName,
                    role: 'Sales Rep',
                    assignedLeads: 0,
                    activitiesCount: 0,
                    contactedCount: 0,
                    wonCount: 0,
                    wonRevenue: 0,
                    overdueCount: 0
                })
            }
            const record = agentMap.get(agentName)!
            record.assignedLeads++

            const actList = Array.isArray(lead.activities) ? lead.activities : []
            if (actList.length > 0) {
                record.activitiesCount += actList.length
                record.contactedCount++
            } else if (lead.lastFollowUpOutcome || (lead.stage && lead.stage !== 'new')) {
                record.contactedCount++
            }

            const stage = (lead.stage || '').toLowerCase()
            const isWon = stage === 'closed' || stage === 'won' || stage.includes('closed') || stage.includes('won')
            if (isWon) {
                record.wonCount++
                record.wonRevenue += (Number(lead.value) || 0)
            }

            if (lead.reminder?.date && !lead.reminder.completed) {
                if (new Date(lead.reminder.date).getTime() < nowMs) {
                    record.overdueCount++
                }
            }
        })

        return Array.from(agentMap.values())
            .filter(a => a.assignedLeads > 0 || a.activitiesCount > 0)
            .map(a => ({
                ...a,
                conversionRate: a.assignedLeads > 0 ? ((a.wonCount / a.assignedLeads) * 100).toFixed(1) : '0',
                contactRate: a.assignedLeads > 0 ? ((a.contactedCount / a.assignedLeads) * 100).toFixed(1) : '0'
            }))
            .sort((a, b) => b.wonRevenue - a.wonRevenue || b.assignedLeads - a.assignedLeads)
    }, [filteredLeads, data.telecallerAnalytics])

    // 7. Follow-up Outcomes Distribution
    const outcomeData = useMemo(() => {
        const outcomes: Record<string, number> = {}

        filteredLeads.forEach((lead: any) => {
            if (lead.lastFollowUpOutcome) {
                const key = lead.lastFollowUpOutcome.trim()
                outcomes[key] = (outcomes[key] || 0) + 1
            }
            if (Array.isArray(lead.activities)) {
                lead.activities.forEach((act: any) => {
                    if (act.outcome) {
                        const key = act.outcome.trim()
                        outcomes[key] = (outcomes[key] || 0) + 1
                    }
                })
            }
        })

        const palette = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#ef4444', '#64748b']
        const entries = Object.entries(outcomes).map(([name, value], idx) => ({
            name,
            value,
            color: palette[idx % palette.length]
        })).sort((a, b) => b.value - a.value)

        if (entries.length === 0) {
            return [
                { name: 'No Calls Logged', value: filteredLeads.length || 1, color: '#94a3b8' }
            ]
        }
        return entries
    }, [filteredLeads])

    // 8. Top 5 High-Value Deals & Stale Leads Watchlist
    const highValueDeals = useMemo(() => {
        return [...filteredLeads]
            .filter((l: any) => {
                const s = (l.stage || '').toLowerCase()
                return !s.includes('lost') && !s.includes('lose')
            })
            .sort((a: any, b: any) => (Number(b.value) || 0) - (Number(a.value) || 0))
            .slice(0, 5)
    }, [filteredLeads])

    const staleLeads = useMemo(() => {
        const nowMs = Date.now()
        const fourDaysAgo = nowMs - (4 * 24 * 60 * 60 * 1000)
        return [...filteredLeads]
            .filter((l: any) => {
                const s = (l.stage || '').toLowerCase()
                if (s.includes('won') || s.includes('closed') || s.includes('lost') || s.includes('lose')) return false
                const isOverdue = l.reminder?.date && new Date(l.reminder.date).getTime() < nowMs && !l.reminder.completed
                const isInactive = new Date(l.updatedAt || l.createdAt || nowMs).getTime() < fourDaysAgo
                return isOverdue || isInactive
            })
            .slice(0, 5)
    }, [filteredLeads])

    const isFiltered = timeRange !== 'all' || selectedAgent !== 'all' || selectedStage !== 'all' || searchQuery.trim().length > 0

    const resetFilters = () => {
        setTimeRange('all')
        setSelectedAgent('all')
        setSelectedStage('all')
        setSearchQuery('')
    }

    return (
        <div className="space-y-6">
            {/* Filter & Period Selector Bar */}
            <Card className="border border-border/60 shadow-sm bg-card/60 backdrop-blur-md">
                <CardContent className="p-4 sm:p-5">
                    <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
                        {/* Search Input */}
                        <div className="relative flex-1 min-w-[240px]">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search by lead name, company, phone, source..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9 h-10 rounded-xl bg-background/80 text-xs sm:text-sm border-border/60"
                            />
                        </div>

                        {/* Controls Group */}
                        <div className="flex flex-wrap items-center gap-2.5">
                            {/* Time Range Pills */}
                            <div className="flex items-center bg-muted/60 p-1 rounded-xl border border-border/40 text-xs">
                                <button
                                    onClick={() => setTimeRange('all')}
                                    className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${timeRange === 'all' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                                >
                                    All Time
                                </button>
                                <button
                                    onClick={() => setTimeRange('this_month')}
                                    className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${timeRange === 'this_month' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                                >
                                    This Month
                                </button>
                                <button
                                    onClick={() => setTimeRange('this_week')}
                                    className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${timeRange === 'this_week' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                                >
                                    This Week
                                </button>
                                <button
                                    onClick={() => setTimeRange('today')}
                                    className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${timeRange === 'today' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                                >
                                    Today
                                </button>
                            </div>

                            {/* Agent Selector */}
                            <Select value={selectedAgent} onValueChange={setSelectedAgent}>
                                <SelectTrigger className="h-10 w-[170px] text-xs font-semibold rounded-xl bg-background/80 border-border/60">
                                    <div className="flex items-center gap-2 truncate">
                                        <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                        <SelectValue placeholder="All Agents" />
                                    </div>
                                </SelectTrigger>
                                <SelectContent className="rounded-xl text-xs">
                                    <SelectItem value="all" className="text-xs font-bold">All Agents & Callers</SelectItem>
                                    {availableAgents.map((ag) => (
                                        <SelectItem key={ag.id} value={ag.id} className="text-xs font-medium">
                                            {ag.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            {/* Stage Selector */}
                            <Select value={selectedStage} onValueChange={setSelectedStage}>
                                <SelectTrigger className="h-10 w-[150px] text-xs font-semibold rounded-xl bg-background/80 border-border/60">
                                    <div className="flex items-center gap-2 truncate">
                                        <Layers className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                        <SelectValue placeholder="All Stages" />
                                    </div>
                                </SelectTrigger>
                                <SelectContent className="rounded-xl text-xs">
                                    <SelectItem value="all" className="text-xs font-bold">All Stages</SelectItem>
                                    {stages.map((st: any) => (
                                        <SelectItem key={st.id} value={st.id} className="text-xs font-medium">
                                            {st.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            {/* Reset Button */}
                            {isFiltered && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={resetFilters}
                                    className="h-10 px-3 text-xs text-muted-foreground hover:text-foreground gap-1.5 rounded-xl border border-dashed border-border"
                                >
                                    <RotateCcw className="h-3.5 w-3.5" />
                                    Reset
                                </Button>
                            )}
                        </div>
                    </div>

                    {/* Status hint */}
                    <div className="mt-3 pt-3 border-t border-border/30 flex items-center justify-between text-xs text-muted-foreground">
                        <div className="flex items-center gap-2">
                            <span>Showing <strong className="text-foreground">{filteredLeads.length}</strong> of {allLeads.length} total leads</span>
                            {isFiltered && (
                                <Badge variant="secondary" className="text-[10px] py-0 px-2 font-medium bg-primary/10 text-primary">
                                    Filtered View Active
                                </Badge>
                            )}
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="flex items-center gap-1.5">
                                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                                Live Engine Sync
                            </span>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Executive KPI Metric Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {/* 1. Total Pipeline Value */}
                <Card className="border border-border/60 shadow-sm bg-card/80">
                    <CardContent className="p-4 space-y-1">
                        <div className="flex items-center justify-between text-muted-foreground">
                            <span className="text-[11px] font-bold uppercase tracking-wider">Gross Pipeline</span>
                            <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-500">
                                <DollarSign className="h-4 w-4" />
                            </div>
                        </div>
                        <div className="text-lg sm:text-xl font-black text-foreground truncate">
                            {formatCurrency(metrics.pipelineValue)}
                        </div>
                        <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                            <span>{metrics.total} total leads in scope</span>
                        </div>
                    </CardContent>
                </Card>

                {/* 2. Closed-Won Revenue */}
                <Card className="border border-border/60 shadow-sm bg-card/80">
                    <CardContent className="p-4 space-y-1">
                        <div className="flex items-center justify-between text-muted-foreground">
                            <span className="text-[11px] font-bold uppercase tracking-wider">Won Revenue</span>
                            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500">
                                <Trophy className="h-4 w-4" />
                            </div>
                        </div>
                        <div className="text-lg sm:text-xl font-black text-emerald-600 dark:text-emerald-400 truncate">
                            {formatCurrency(metrics.wonRevenue)}
                        </div>
                        <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            <span>{metrics.wonCount} deals closed won</span>
                        </div>
                    </CardContent>
                </Card>

                {/* 3. Win Rate / Conversion */}
                <Card className="border border-border/60 shadow-sm bg-card/80">
                    <CardContent className="p-4 space-y-1">
                        <div className="flex items-center justify-between text-muted-foreground">
                            <span className="text-[11px] font-bold uppercase tracking-wider">Win Rate</span>
                            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-500">
                                <Target className="h-4 w-4" />
                            </div>
                        </div>
                        <div className="text-lg sm:text-xl font-black text-foreground">
                            {metrics.winRate}%
                        </div>
                        <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden mt-1">
                            <div
                                className="bg-amber-500 h-full rounded-full transition-all duration-500"
                                style={{ width: `${Math.min(100, Math.max(0, Number(metrics.winRate)))}%` }}
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* 4. Average Deal Won */}
                <Card className="border border-border/60 shadow-sm bg-card/80">
                    <CardContent className="p-4 space-y-1">
                        <div className="flex items-center justify-between text-muted-foreground">
                            <span className="text-[11px] font-bold uppercase tracking-wider">Avg Deal Size</span>
                            <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-500">
                                <Sparkles className="h-4 w-4" />
                            </div>
                        </div>
                        <div className="text-lg sm:text-xl font-black text-foreground truncate">
                            {formatCurrency(metrics.avgDealWon)}
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                            <span>Per converted opportunity</span>
                        </div>
                    </CardContent>
                </Card>

                {/* 5. Contact / Outreach Rate */}
                <Card className="border border-border/60 shadow-sm bg-card/80">
                    <CardContent className="p-4 space-y-1">
                        <div className="flex items-center justify-between text-muted-foreground">
                            <span className="text-[11px] font-bold uppercase tracking-wider">Contact Rate</span>
                            <div className="p-1.5 rounded-lg bg-sky-500/10 text-sky-500">
                                <PhoneCall className="h-4 w-4" />
                            </div>
                        </div>
                        <div className="text-lg sm:text-xl font-black text-foreground">
                            {metrics.contactRate}%
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                            <span>{metrics.contactedCount} of {metrics.total} contacted</span>
                        </div>
                    </CardContent>
                </Card>

                {/* 6. Follow-up Health */}
                <Card className="border border-border/60 shadow-sm bg-card/80">
                    <CardContent className="p-4 space-y-1">
                        <div className="flex items-center justify-between text-muted-foreground">
                            <span className="text-[11px] font-bold uppercase tracking-wider">Follow-up Health</span>
                            <div className={`p-1.5 rounded-lg ${metrics.overdueCount > 0 ? 'bg-rose-500/10 text-rose-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                                {metrics.overdueCount > 0 ? <AlertCircle className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
                            </div>
                        </div>
                        <div className={`text-lg sm:text-xl font-black ${metrics.overdueCount > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                            {metrics.overdueCount > 0 ? `${metrics.overdueCount} Overdue` : 'All On Track'}
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                            <span>{metrics.upcomingCount} pending follow-ups</span>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Section 1: Pipeline Stage Flow & Dynamic Stage Funnel */}
            <div className="grid lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2 border border-border/60 shadow-sm">
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-base font-bold flex items-center gap-2">
                                    <BarChart3 className="h-5 w-5 text-primary" />
                                    Dynamic Pipeline Stage Funnel
                                </CardTitle>
                                <CardDescription className="text-xs">
                                    Distribution of opportunities across active workflow stages
                                </CardDescription>
                            </div>
                            <Badge variant="outline" className="text-xs font-semibold">
                                {stageFlowData.length} Stages Configured
                            </Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="h-[360px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                layout="vertical"
                                data={stageFlowData}
                                margin={{ left: 20, right: 30, top: 10, bottom: 10 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" opacity={0.5} />
                                <XAxis type="number" tickLine={false} axisLine={false} />
                                <YAxis
                                    dataKey="label"
                                    type="category"
                                    axisLine={false}
                                    tickLine={false}
                                    width={120}
                                    tick={{ fontSize: 12, fill: 'currentColor', fontWeight: 600 }}
                                />
                                <Tooltip
                                    formatter={(value: any, _name: any, item: any) => {
                                        return [
                                            `${value} leads (${formatCurrency(item.payload.value)}) - ${item.payload.percentage}% share`,
                                            'Volume'
                                        ]
                                    }}
                                    contentStyle={{
                                        backgroundColor: 'hsl(var(--card))',
                                        borderColor: 'hsl(var(--border))',
                                        borderRadius: '12px',
                                        fontSize: '12px',
                                        fontWeight: 600
                                    }}
                                />
                                <Bar dataKey="count" radius={[0, 8, 8, 0]}>
                                    {stageFlowData.map((entry: any, index: number) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Stage Breakdown & Quick Action */}
                <Card className="border border-border/60 shadow-sm flex flex-col justify-between">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base font-bold">Stage Value Breakdown</CardTitle>
                        <CardDescription className="text-xs">Monetary value and share by stage</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3 flex-1 overflow-y-auto max-h-[290px] pr-2">
                        {stageFlowData.map((stage: any) => (
                            <div
                                key={stage.id}
                                onClick={() => setSelectedStage(stage.id === selectedStage ? 'all' : stage.id)}
                                className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                                    selectedStage === stage.id
                                        ? 'border-primary bg-primary/5 shadow-sm'
                                        : 'border-border/40 hover:border-border hover:bg-muted/40'
                                }`}
                            >
                                <div className="flex items-center gap-2.5 min-w-0">
                                    <div
                                        className="w-3 h-3 rounded-full shrink-0"
                                        style={{ backgroundColor: stage.color }}
                                    />
                                    <div className="truncate">
                                        <div className="text-xs font-bold truncate">{stage.label}</div>
                                        <div className="text-[10px] text-muted-foreground">{stage.count} Leads ({stage.percentage}%)</div>
                                    </div>
                                </div>
                                <div className="text-right shrink-0">
                                    <div className="text-xs font-bold text-foreground">
                                        {formatCurrency(stage.value)}
                                    </div>
                                    <span className="text-[10px] font-medium text-muted-foreground">
                                        {metrics.pipelineValue > 0 ? `${Math.round((stage.value / metrics.pipelineValue) * 100)}% val` : '0%'}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </CardContent>
                    <div className="p-4 pt-2 border-t border-border/40">
                        <Button
                            onClick={() => navigate ? navigate('/leads') : window.location.href = '/leads'}
                            className="w-full text-xs font-bold gap-2 rounded-xl"
                        >
                            Open Kanban Pipeline Board
                            <ExternalLink className="h-3.5 w-3.5" />
                        </Button>
                    </div>
                </Card>
            </div>

            {/* Section 2: Lead Acquisition Sources & Channel ROI */}
            <div className="grid lg:grid-cols-12 gap-6">
                <Card className="lg:col-span-5 border border-border/60 shadow-sm">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base font-bold flex items-center gap-2">
                            <Flame className="h-5 w-5 text-amber-500" />
                            Lead Acquisition Channels
                        </CardTitle>
                        <CardDescription className="text-xs">
                            Top sources generating inquiries and customer flow
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={sourceBreakdown.slice(0, 6)} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" opacity={0.5} />
                                <XAxis dataKey="source" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} angle={-15} textAnchor="end" />
                                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                                <Tooltip
                                    formatter={(val: any, _name: any, item: any) => [`${val} Leads (${formatCurrency(item.payload.revenue)} won)`, 'Inflow']}
                                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '12px', fontSize: '12px' }}
                                />
                                <Bar dataKey="leads" radius={[6, 6, 0, 0]}>
                                    {sourceBreakdown.slice(0, 6).map((entry: any, index: number) => (
                                        <Cell key={`source-cell-${index}`} fill={entry.color} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Source ROI Performance Table */}
                <Card className="lg:col-span-7 border border-border/60 shadow-sm flex flex-col justify-between">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base font-bold">Acquisition Channel Conversion ROI</CardTitle>
                        <CardDescription className="text-xs">Performance and closed revenue by channel</CardDescription>
                    </CardHeader>
                    <CardContent className="overflow-x-auto p-0 px-4 pb-4">
                        <table className="w-full text-left text-xs">
                            <thead>
                                <tr className="border-b border-border/60 text-muted-foreground uppercase text-[10px] font-bold">
                                    <th className="py-2.5 px-2">Channel / Source</th>
                                    <th className="py-2.5 px-2 text-center">Inflow</th>
                                    <th className="py-2.5 px-2 text-center">Contacted</th>
                                    <th className="py-2.5 px-2 text-center">Won</th>
                                    <th className="py-2.5 px-2 text-right">Revenue Won</th>
                                    <th className="py-2.5 px-2 text-right">Win %</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/40">
                                {sourceBreakdown.map((src: any) => (
                                    <tr key={src.source} className="hover:bg-muted/40 transition-colors">
                                        <td className="py-2.5 px-2 font-bold flex items-center gap-2">
                                            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: src.color }} />
                                            <span className="truncate max-w-[150px]">{src.source}</span>
                                        </td>
                                        <td className="py-2.5 px-2 text-center font-semibold">{src.leads}</td>
                                        <td className="py-2.5 px-2 text-center text-muted-foreground">{src.contacted}</td>
                                        <td className="py-2.5 px-2 text-center font-semibold text-emerald-600 dark:text-emerald-400">
                                            {src.won}
                                        </td>
                                        <td className="py-2.5 px-2 text-right font-bold text-foreground">
                                            {formatCurrency(src.revenue)}
                                        </td>
                                        <td className="py-2.5 px-2 text-right">
                                            <Badge variant={Number(src.conversionRate) > 15 ? 'default' : 'secondary'} className="text-[10px] py-0 px-1.5 font-bold">
                                                {src.conversionRate}%
                                            </Badge>
                                        </td>
                                    </tr>
                                ))}
                                {sourceBreakdown.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="py-6 text-center text-muted-foreground">
                                            No source records found for selected period.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </CardContent>
                </Card>
            </div>

            {/* Section 3: Telecaller & Sales Rep Performance Audit Table */}
            <Card className="border border-border/60 shadow-sm overflow-hidden">
                <CardHeader className="pb-3 border-b border-border/40 bg-muted/20">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                        <div>
                            <CardTitle className="text-base font-bold flex items-center gap-2">
                                <Trophy className="h-5 w-5 text-amber-500" />
                                Telecaller & Sales Rep Performance Leaderboard
                            </CardTitle>
                            <CardDescription className="text-xs">
                                Complete admin audit of assigned leads, activities, closed deals, and follow-up discipline
                            </CardDescription>
                        </div>
                        <Badge variant="outline" className="text-xs font-semibold">
                            {agentLeaderboard.length} Agents Logged
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent className="p-0 overflow-x-auto">
                    <table className="w-full text-left text-xs">
                        <thead>
                            <tr className="border-b border-border/60 bg-muted/40 text-muted-foreground uppercase text-[10px] font-bold">
                                <th className="py-3 px-4">Sales Representative</th>
                                <th className="py-3 px-3 text-center">Assigned Leads</th>
                                <th className="py-3 px-3 text-center">Activities / Calls</th>
                                <th className="py-3 px-3 text-center">Contact %</th>
                                <th className="py-3 px-3 text-center">Deals Won</th>
                                <th className="py-3 px-3 text-right">Won Revenue</th>
                                <th className="py-3 px-3 text-center">Overdue Follow-ups</th>
                                <th className="py-3 px-3 text-right">Win %</th>
                                <th className="py-3 px-4 text-right">Quick Filter</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/40">
                            {agentLeaderboard.map((agent, idx) => (
                                <tr key={agent.name} className="hover:bg-muted/40 transition-colors">
                                    <td className="py-3 px-4">
                                        <div className="flex items-center gap-2.5">
                                            <div className="relative">
                                                <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary font-bold flex items-center justify-center text-xs">
                                                    {agent.name.charAt(0).toUpperCase()}
                                                </div>
                                                {idx === 0 && (
                                                    <span className="absolute -top-1 -right-1 text-xs" title="Top Performer">
                                                        👑
                                                    </span>
                                                )}
                                            </div>
                                            <div>
                                                <div className="font-bold text-foreground flex items-center gap-1.5">
                                                    {agent.name}
                                                    {idx === 0 && (
                                                        <Badge variant="secondary" className="text-[9px] py-0 px-1 font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border-none">
                                                            Top Rep
                                                        </Badge>
                                                    )}
                                                </div>
                                                <div className="text-[10px] text-muted-foreground capitalize">{agent.role}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="py-3 px-3 text-center font-bold text-foreground">
                                        {agent.assignedLeads}
                                    </td>
                                    <td className="py-3 px-3 text-center font-semibold text-muted-foreground">
                                        {agent.activitiesCount}
                                    </td>
                                    <td className="py-3 px-3 text-center">
                                        <span className="font-semibold">{agent.contactRate}%</span>
                                    </td>
                                    <td className="py-3 px-3 text-center font-bold text-emerald-600 dark:text-emerald-400">
                                        {agent.wonCount}
                                    </td>
                                    <td className="py-3 px-3 text-right font-black text-foreground">
                                        {formatCurrency(agent.wonRevenue)}
                                    </td>
                                    <td className="py-3 px-3 text-center">
                                        {agent.overdueCount > 0 ? (
                                            <Badge variant="destructive" className="text-[10px] py-0 px-1.5 font-bold gap-1">
                                                <AlertCircle className="h-3 w-3" />
                                                {agent.overdueCount} Overdue
                                            </Badge>
                                        ) : (
                                            <Badge variant="secondary" className="text-[10px] py-0 px-1.5 font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-none">
                                                Clean
                                            </Badge>
                                        )}
                                    </td>
                                    <td className="py-3 px-3 text-right">
                                        <span className="font-bold text-foreground">{agent.conversionRate}%</span>
                                    </td>
                                    <td className="py-3 px-4 text-right">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setSelectedAgent(agent.name)}
                                            className="h-7 text-[11px] font-semibold px-2 rounded-lg"
                                        >
                                            Audit Agent
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                            {agentLeaderboard.length === 0 && (
                                <tr>
                                    <td colSpan={9} className="py-8 text-center text-muted-foreground">
                                        No sales agent activity recorded for selected range.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </CardContent>
            </Card>

            {/* Section 4: Follow-up Outcomes & Call Discipline + Opportunities Watchlist */}
            <div className="grid lg:grid-cols-12 gap-6">
                {/* Outcomes Donut Chart */}
                <Card className="lg:col-span-5 border border-border/60 shadow-sm flex flex-col justify-between">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base font-bold flex items-center gap-2">
                            <Activity className="h-5 w-5 text-indigo-500" />
                            Follow-up & Call Outcomes
                        </CardTitle>
                        <CardDescription className="text-xs">
                            Distribution of calling dispositions and customer responses
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="h-[280px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={outcomeData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={55}
                                    outerRadius={85}
                                    paddingAngle={3}
                                    dataKey="value"
                                >
                                    {outcomeData.map((entry, index) => (
                                        <Cell key={`outcome-cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    formatter={(value: any, name: any) => [`${value} occurrences`, name]}
                                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '12px', fontSize: '12px' }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </CardContent>
                    <div className="p-4 pt-0 border-t border-border/40 grid grid-cols-2 gap-2 max-h-[140px] overflow-y-auto">
                        {outcomeData.map((item) => (
                            <div key={item.name} className="flex items-center gap-2 text-xs">
                                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                                <span className="truncate text-muted-foreground font-medium">{item.name}</span>
                                <span className="ml-auto font-bold text-foreground">{item.value}</span>
                            </div>
                        ))}
                    </div>
                </Card>

                {/* Top Opportunities & Stale Leads Watchlist */}
                <div className="lg:col-span-7 space-y-6">
                    {/* Top 5 High-Value Deals */}
                    <Card className="border border-border/60 shadow-sm">
                        <CardHeader className="pb-2.5">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-sm font-bold flex items-center gap-2">
                                    <Sparkles className="h-4 w-4 text-amber-500" />
                                    Top High-Value Active Opportunities
                                </CardTitle>
                                <span className="text-[11px] text-muted-foreground">Highest pipeline potential</span>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="divide-y divide-border/40">
                                {highValueDeals.map((lead: any) => (
                                    <div
                                        key={lead._id || lead.id}
                                        className="p-3 px-4 flex items-center justify-between hover:bg-muted/40 transition-colors"
                                    >
                                        <div className="min-w-0 flex-1 mr-3">
                                            <div className="font-bold text-xs truncate flex items-center gap-2">
                                                <span>{lead.name}</span>
                                                <Badge variant="outline" className="text-[10px] py-0 px-1 font-semibold uppercase">
                                                    {lead.stage}
                                                </Badge>
                                            </div>
                                            <div className="text-[11px] text-muted-foreground truncate flex items-center gap-2 mt-0.5">
                                                <span>{lead.company}</span>
                                                <span>•</span>
                                                <span>Agent: {lead.assignedToName || 'Unassigned'}</span>
                                            </div>
                                        </div>
                                        <div className="text-right shrink-0 flex items-center gap-3">
                                            <div className="text-sm font-black text-foreground">
                                                {formatCurrency(lead.value || 0)}
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 rounded-lg"
                                                onClick={() => navigate ? navigate(`/leads?search=${encodeURIComponent(lead.name)}`) : window.location.href = `/leads`}
                                            >
                                                <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                                {highValueDeals.length === 0 && (
                                    <div className="p-4 text-center text-xs text-muted-foreground">
                                        No active opportunities found in current filter.
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Stale / At-Risk Leads Watchlist */}
                    <Card className="border border-border/60 shadow-sm">
                        <CardHeader className="pb-2.5">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-sm font-bold flex items-center gap-2 text-rose-500">
                                    <AlertTriangle className="h-4 w-4" />
                                    At-Risk & Stale Leads Watchlist
                                </CardTitle>
                                <span className="text-[11px] text-rose-500 font-semibold">Immediate Follow-up Needed</span>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="divide-y divide-border/40">
                                {staleLeads.map((lead: any) => {
                                    const isOverdue = lead.reminder?.date && new Date(lead.reminder.date).getTime() < Date.now() && !lead.reminder.completed
                                    return (
                                        <div
                                            key={lead._id || lead.id}
                                            className="p-3 px-4 flex items-center justify-between hover:bg-muted/40 transition-colors"
                                        >
                                            <div className="min-w-0 flex-1 mr-3">
                                                <div className="font-bold text-xs truncate flex items-center gap-2">
                                                    <span>{lead.name}</span>
                                                    <span className="text-muted-foreground text-[10px]">({lead.company})</span>
                                                    {isOverdue && (
                                                        <Badge variant="destructive" className="text-[9px] py-0 px-1 font-bold">
                                                            Overdue Reminder
                                                        </Badge>
                                                    )}
                                                </div>
                                                <div className="text-[11px] text-muted-foreground truncate flex items-center gap-2 mt-0.5">
                                                    <span>Agent: {lead.assignedToName || 'Unassigned'}</span>
                                                    <span>•</span>
                                                    <span>Last Outcome: {lead.lastFollowUpOutcome || 'None'}</span>
                                                </div>
                                            </div>
                                            <div className="text-right shrink-0">
                                                <div className="text-xs font-bold text-foreground">
                                                    {formatCurrency(lead.value || 0)}
                                                </div>
                                                <span className="text-[10px] text-rose-500 font-medium">Needs Attention</span>
                                            </div>
                                        </div>
                                    )
                                })}
                                {staleLeads.length === 0 && (
                                    <div className="p-4 text-center text-xs text-muted-foreground">
                                        🎉 Great job! No stale or overdue leads at this time.
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
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
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-white text-base font-extrabold">Customer Satisfaction (CSAT)</CardTitle>
                        <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                            92% Positive
                        </span>
                    </div>
                    <CardDescription className="text-slate-400 text-xs">Real-time user feedback distribution</CardDescription>
                </CardHeader>
                <CardContent className="flex items-end justify-around h-[220px] pb-6 pt-2">
                    {feedbackData.map((f: any, i: number) => (
                        <div key={i} className="flex flex-col items-center gap-2 group">
                            <span className="text-xs font-extrabold text-white opacity-90 group-hover:opacity-100 transition-opacity">
                                {f.value}%
                            </span>
                            <div className="w-12 bg-white/10 rounded-t-xl hover:bg-white/20 transition-all flex items-end justify-center p-1" style={{ height: `${Math.max(16, f.value * 2)}px` }}>
                                <div className="w-full rounded-t-lg transition-all" style={{ height: '100%', backgroundColor: f.fill }} />
                            </div>
                            <span className="text-[10px] font-extrabold uppercase text-slate-300 mt-2 text-center whitespace-nowrap">
                                {f.name}
                            </span>
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
        // Precompute total actual cost for each project across all users
        const projectActualCosts: Record<string, number> = {}
        projects.forEach((proj: any) => {
            const pid = proj._id || proj.id
            const projEntries = timeEntries.filter((te: any) => (te.projectId?._id || te.projectId) === pid)
            const totalProjCost = projEntries.reduce((sum: number, te: any) => {
                const entryUserId = te.userId?._id || te.userId
                const u = users.find((usr: any) => (usr._id || usr.id) === entryUserId)
                if (!u) return sum
                const hourlyRate = (Number(u.salary) || 0) / 208
                return sum + ((te.duration || 0) / 60) * hourlyRate
            }, 0)
            projectActualCosts[pid] = totalProjCost
        })

        return users.map((user: any) => {
            const userId = user._id || user.id
            const userTasks = tasks.filter((t: any) => t.assigneeId === userId)
            const completedCount = userTasks.filter((t: any) => t.status === 'done').length

            // Total time worked by this user (in hours)
            const totalMinutes = timeEntries
                .filter((te: any) => (te.userId?._id || te.userId) === userId)
                .reduce((sum: number, te: any) => sum + (te.duration || 0), 0)
            const totalHours = totalMinutes / 60

            // Estimated cost of this employee based on salary and time (26 days * 8h = 208h/month)
            const hourlyRate = (Number(user.salary) || 0) / 208
            const calculatedCost = totalHours * hourlyRate

            // Projects this user worked on
            const userProjectIds = [...new Set(userTasks.map((t: any) => t.projectId))]
            const projectDetails = userProjectIds.map((pid: any) => {
                const proj = projects.find((p: any) => p._id === pid || p.id === pid)
                if (!proj) return null

                const projTasks = userTasks.filter((t: any) => t.projectId === pid)
                const projMinutes = timeEntries
                    .filter((te: any) => (te.userId?._id || te.userId) === userId && (te.projectId?._id || te.projectId) === pid)
                    .reduce((sum: number, te: any) => sum + (te.duration || 0), 0)

                const totalActualCost = projectActualCosts[pid] || 0
                const budget = Number(proj.budget) || 0
                const margin = budget - totalActualCost

                return {
                    name: proj.name || proj.title,
                    tasks: projTasks.length,
                    completed: projTasks.filter((t: any) => t.status === 'done').length,
                    hours: (projMinutes / 60).toFixed(1),
                    cost: ((projMinutes / 60) * hourlyRate).toFixed(2),
                    budget,
                    totalProjectCost: totalActualCost.toFixed(2),
                    margin: margin.toFixed(2)
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
                                                    <div className="text-[10px] font-bold text-emerald-600">{formatCurrency(emp.salary || 0)}/mo</div>
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
                                                <span className="text-xl font-black tabular-nums text-rose-600">{formatCurrency(Number(emp.calculatedCost) || 0)}</span>
                                                <span className="text-[10px] uppercase font-bold text-muted-foreground">Cost Contribution</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="space-y-3">
                                                {emp.projects.map((p: any, j: number) => {
                                                    const isProfitable = Number(p.margin) >= 0;
                                                    return (
                                                        <div key={j} className="bg-muted/30 p-3 rounded-xl border border-border/40 space-y-2">
                                                            <div className="flex justify-between items-start">
                                                                <span className="text-xs font-bold leading-none">{p.name}</span>
                                                                <span className="text-[9px] font-black uppercase px-2 py-0.5 bg-primary/10 text-primary rounded-full">{p.hours}h logged</span>
                                                            </div>
                                                            <div className="flex justify-between text-[10px] text-muted-foreground border-b border-border/20 pb-1.5">
                                                                <span>{p.completed}/{p.tasks} Tasks Done</span>
                                                                <span className="font-bold text-rose-500">My Cost: {formatCurrency(Number(p.cost) || 0)}</span>
                                                            </div>
                                                            <div className="grid grid-cols-3 gap-1 pt-0.5 text-[9px] font-semibold text-muted-foreground leading-normal">
                                                                <div>
                                                                    <div className="text-muted-foreground uppercase text-[8px] font-black">Budget</div>
                                                                    <div className="font-bold text-foreground">{formatCurrency(Number(p.budget) || 0)}</div>
                                                                </div>
                                                                <div>
                                                                    <div className="text-muted-foreground uppercase text-[8px] font-black">Actual</div>
                                                                    <div className="font-bold text-rose-500">{formatCurrency(Number(p.totalProjectCost) || 0)}</div>
                                                                </div>
                                                                <div>
                                                                    <div className="text-muted-foreground uppercase text-[8px] font-black">Margin</div>
                                                                    <div className={`font-bold ${isProfitable ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                                        {isProfitable ? '+' : ''}{formatCurrency(Number(p.margin) || 0)}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
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
                            .filter((te: any) => (te.projectId?._id || te.projectId) === pid)
                            .reduce((sum: number, te: any) => {
                                const entryUserId = te.userId?._id || te.userId
                                const user = users.find((u: any) => (u._id || u.id) === entryUserId)
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
                                        <span className="font-black">{formatCurrency(budget)}</span>
                                    </div>
                                    <div className="flex justify-between text-xs">
                                        <span className="text-slate-400 uppercase font-bold tracking-widest">Est. Cost</span>
                                        <span className="font-black text-rose-400">{formatCurrency(cost)}</span>
                                    </div>
                                    <div className="pt-4 border-t border-white/5 flex justify-between items-center">
                                        <span className="text-xs uppercase font-black text-slate-500">Net Return</span>
                                        <span className={`text-xl font-black ${isProfitable ? 'text-emerald-400' : 'text-rose-500'}`}>
                                            {isProfitable ? '+' : ''}{formatCurrency(profit)}
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

export default ReportsPage
