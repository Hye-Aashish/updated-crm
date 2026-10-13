import React, { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
    PhoneCall, 
    Users, 
    CalendarCheck, 
    Trophy, 
    TrendingUp, 
    AlertTriangle, 
    Clock, 
    ArrowUpRight, 
    RefreshCw, 
    Target, 
    UserCheck, 
    CheckCircle2, 
    PhoneForwarded, 
    BarChart3,
    Sparkles,
    ShieldAlert
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { useNavigate } from 'react-router-dom'
import api from '@/lib/api-client'
import { TelecallerDeepAnalytics } from '@/components/dashboard/telecaller-deep-analytics'
import { SalesGrowthSuite } from '@/components/dashboard/sales-growth-suite'
import { WebFormPerformanceSection } from '@/components/dashboard/web-form-performance-section'

interface SalesDashboardProps {
    className?: string
}

export function SalesDashboardSection({ className }: SalesDashboardProps) {
    const navigate = useNavigate()
    const [range, setRange] = useState<'today' | 'yesterday' | 'this_week' | 'this_month' | 'all'>('today')
    const [loading, setLoading] = useState<boolean>(true)
    const [data, setData] = useState<any>(null)

    const fetchSalesData = async () => {
        try {
            setLoading(true)
            const res = await api.get(`/leads/telecaller-analytics?range=${range}`)
            setData(res.data)
        } catch (err) {
            console.error('Error fetching sales dashboard data:', err)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchSalesData()
    }, [range])

    const summary = data?.summary
    const agents = data?.agents || []

    return (
        <div className={`space-y-6 pt-2 pb-6 ${className || ''}`}>
            {/* Header with Title and Range Selector */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white shadow-xl border border-white/10 relative overflow-hidden">
                <div className="space-y-1 relative z-10">
                    <div className="flex items-center gap-2.5">
                        <div className="h-10 w-10 rounded-2xl bg-primary/20 border border-primary/30 flex items-center justify-center text-primary shadow-inner">
                            <Target className="h-5 w-5 animate-pulse" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-xl font-bold tracking-tight text-white">Sales & Leads Intelligence Hub</h3>
                                <Badge className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[9px] uppercase font-bold py-0.5">
                                    Live Performance
                                </Badge>
                            </div>
                            <p className="text-xs text-slate-400">
                                Real-time lead inflows, agent call metrics, meetings booked, and deal conversions
                            </p>
                        </div>
                    </div>
                </div>

                {/* Range Filters */}
                <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur-md p-1.5 rounded-2xl border border-white/10 relative z-10 shrink-0">
                    {[
                        { key: 'today', label: 'Today' },
                        { key: 'yesterday', label: 'Yesterday' },
                        { key: 'this_week', label: 'This Week' },
                        { key: 'this_month', label: 'This Month' },
                        { key: 'all', label: 'All Time' },
                    ].map(t => (
                        <Button
                            key={t.key}
                            variant={range === t.key ? 'secondary' : 'ghost'}
                            size="sm"
                            onClick={() => setRange(t.key as any)}
                            className={`h-7 px-3 rounded-xl text-xs font-bold transition-all ${
                                range === t.key 
                                    ? 'bg-white text-slate-900 shadow-md' 
                                    : 'text-slate-300 hover:text-white hover:bg-white/10'
                            }`}
                        >
                            {t.label}
                        </Button>
                    ))}

                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={fetchSalesData}
                        className="h-7 w-7 text-slate-300 hover:text-white hover:bg-white/10 rounded-xl"
                        title="Refresh"
                    >
                        <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
                    </Button>
                </div>

                {/* Decorative background glow */}
                <div className="absolute right-0 top-0 h-48 w-48 bg-primary/20 blur-3xl rounded-full pointer-events-none" />
                <div className="absolute left-1/3 bottom-0 h-32 w-32 bg-indigo-500/20 blur-3xl rounded-full pointer-events-none" />
            </div>

            {/* Top 6 KPI Metric Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
                {/* 1. Total Leads */}
                <Card 
                    className="p-4 rounded-2xl border border-border/50 bg-card hover:border-primary/40 transition-all cursor-pointer shadow-xs group"
                    onClick={() => navigate('/leads')}
                >
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Total Leads</span>
                        <div className="h-7 w-7 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
                            <Users className="h-3.5 w-3.5" />
                        </div>
                    </div>
                    <div className="text-2xl font-extrabold text-foreground group-hover:text-primary transition-colors">
                        {summary?.totalLeads ?? 0}
                    </div>
                    <span className="text-[10px] text-muted-foreground block mt-1">
                        New: <strong className="text-blue-600">{summary?.newLeads ?? 0}</strong>
                    </span>
                </Card>

                {/* 2. Calls Made */}
                <Card className="p-4 rounded-2xl border border-border/50 bg-card shadow-xs">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Calls Made</span>
                        <div className="h-7 w-7 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center">
                            <PhoneCall className="h-3.5 w-3.5" />
                        </div>
                    </div>
                    <div className="text-2xl font-extrabold text-indigo-600 dark:text-indigo-400">
                        {summary?.totalCalls ?? 0}
                    </div>
                    <span className="text-[10px] text-muted-foreground block mt-1">
                        Today: <strong className="text-foreground">{summary?.totalCallsToday ?? 0}</strong>
                    </span>
                </Card>

                {/* 3. Spoke With (Unique Leads) */}
                <Card className="p-4 rounded-2xl border border-border/50 bg-card shadow-xs">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Spoke With</span>
                        <div className="h-7 w-7 rounded-xl bg-sky-500/10 text-sky-600 flex items-center justify-center">
                            <PhoneForwarded className="h-3.5 w-3.5" />
                        </div>
                    </div>
                    <div className="text-2xl font-extrabold text-sky-600 dark:text-sky-400">
                        {summary?.totalUniqueContacted ?? 0}
                    </div>
                    <span className="text-[10px] text-muted-foreground block mt-1">
                        Unique Contacts
                    </span>
                </Card>

                {/* 4. Meetings Booked */}
                <Card className="p-4 rounded-2xl border border-border/50 bg-card shadow-xs">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Meetings Booked</span>
                        <div className="h-7 w-7 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                            <CalendarCheck className="h-3.5 w-3.5" />
                        </div>
                    </div>
                    <div className="text-2xl font-extrabold text-amber-600 dark:text-amber-400">
                        {summary?.totalMeetings ?? 0}
                    </div>
                    <span className="text-[10px] text-muted-foreground block mt-1">
                        Pending: <strong className="text-amber-600">{summary?.pendingMeetings ?? 0}</strong>
                    </span>
                </Card>

                {/* 5. Closed / Won Deals */}
                <Card className="p-4 rounded-2xl border border-border/50 bg-card shadow-xs">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Deals Won</span>
                        <div className="h-7 w-7 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                            <Trophy className="h-3.5 w-3.5" />
                        </div>
                    </div>
                    <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
                        {summary?.totalDealsWon ?? 0}
                    </div>
                    <span className="text-[10px] text-emerald-600 font-bold block mt-1 truncate" title={formatCurrency(summary?.totalRevenueWon ?? 0)}>
                        {formatCurrency(summary?.totalRevenueWon ?? 0)}
                    </span>
                </Card>

                {/* 6. Pending & Overdue Follow-ups */}
                <Card 
                    className="p-4 rounded-2xl border border-border/50 bg-card shadow-xs cursor-pointer hover:border-red-400/40 transition-all"
                    onClick={() => navigate('/leads')}
                >
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Overdue Calls</span>
                        <div className="h-7 w-7 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center">
                            <AlertTriangle className="h-3.5 w-3.5" />
                        </div>
                    </div>
                    <div className="text-2xl font-extrabold text-rose-600 dark:text-rose-400">
                        {summary?.totalOverdueFollowups ?? 0}
                    </div>
                    <span className="text-[10px] text-muted-foreground block mt-1">
                        Total Pending: <strong className="text-foreground">{summary?.totalPendingFollowups ?? 0}</strong>
                    </span>
                </Card>
            </div>

            {/* Agent Performance Leaderboard & Detailed Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Left (8 cols): Agents Call & Lead Activity Table */}
                <div className="lg:col-span-8 bg-card border border-border/50 rounded-3xl p-5 shadow-xs space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-border/30">
                        <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                                <UserCheck className="h-4 w-4" />
                            </div>
                            <div>
                                <h4 className="font-bold text-sm text-foreground">Agent Call & Conversion Breakdown</h4>
                                <p className="text-[10px] text-muted-foreground">Detailed activity report of each telecaller</p>
                            </div>
                        </div>

                        <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => navigate('/leads')}
                            className="text-xs font-bold text-primary hover:bg-primary/10 rounded-xl h-8"
                        >
                            Manage Leads <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
                        </Button>
                    </div>

                    {/* Agents Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                            <thead>
                                <tr className="border-b border-border/40 text-[10px] uppercase font-bold text-muted-foreground">
                                    <th className="py-2.5 px-3">Agent</th>
                                    <th className="py-2.5 px-3 text-center">Assigned Leads</th>
                                    <th className="py-2.5 px-3 text-center">Calls Made</th>
                                    <th className="py-2.5 px-3 text-center">Spoke With</th>
                                    <th className="py-2.5 px-3 text-center">Meetings</th>
                                    <th className="py-2.5 px-3 text-center">Deals Won</th>
                                    <th className="py-2.5 px-3 text-center">Discipline</th>
                                    <th className="py-2.5 px-3 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/20">
                                {agents.map((ag: any) => (
                                    <tr key={ag.userId || ag.name} className="hover:bg-muted/30 transition-colors group">
                                        <td className="py-3 px-3 font-semibold">
                                            <div className="flex items-center gap-2">
                                                <div className="h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-[11px] shrink-0">
                                                    {ag.name?.charAt(0)?.toUpperCase()}
                                                </div>
                                                <div className="truncate">
                                                    <span className="font-bold text-foreground block truncate">{ag.name}</span>
                                                    <span className="text-[10px] text-muted-foreground capitalize">{ag.role || 'Telecaller'}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-3 px-3 text-center font-bold text-foreground">
                                            {ag.totalAssignedLeads}
                                        </td>
                                        <td className="py-3 px-3 text-center">
                                            <span className="font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-md">
                                                {ag.callsInRange}
                                            </span>
                                            {ag.callsToday > 0 && (
                                                <span className="text-[9px] text-muted-foreground block mt-0.5">Today: {ag.callsToday}</span>
                                            )}
                                        </td>
                                        <td className="py-3 px-3 text-center font-semibold text-foreground">
                                            {ag.uniqueLeadsContacted}
                                        </td>
                                        <td className="py-3 px-3 text-center">
                                            <Badge variant="outline" className="font-bold text-[10px] bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20">
                                                {ag.meetingsArranged}
                                            </Badge>
                                        </td>
                                        <td className="py-3 px-3 text-center">
                                            <div className="space-y-0.5">
                                                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                                                    {ag.dealsWon}
                                                </span>
                                                {ag.dealsWonValue > 0 && (
                                                    <span className="text-[9px] text-muted-foreground block font-medium">
                                                        {formatCurrency(ag.dealsWonValue)}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="py-3 px-3 text-center">
                                            {ag.overdueFollowups > 0 ? (
                                                <Badge className="bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30 text-[9px] font-bold">
                                                    {ag.overdueFollowups} Overdue
                                                </Badge>
                                            ) : (
                                                <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-[9px] font-bold">
                                                    100% On-time
                                                </Badge>
                                            )}
                                        </td>
                                        <td className="py-3 px-3 text-right">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => navigate('/leads')}
                                                className="h-7 px-2.5 text-[10px] font-bold rounded-lg border-border/60 hover:bg-primary hover:text-white transition-all"
                                            >
                                                View Leads
                                            </Button>
                                        </td>
                                    </tr>
                                ))}

                                {agents.length === 0 && (
                                    <tr>
                                        <td colSpan={8} className="py-8 text-center text-muted-foreground text-xs italic">
                                            No agent call activity found in this period.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Right (4 cols): Pipeline Flow & Quick Action */}
                <div className="lg:col-span-4 space-y-4">
                    {/* Pipeline Stage Distribution */}
                    <div className="bg-card border border-border/50 rounded-3xl p-5 shadow-xs space-y-3.5">
                        <div className="flex items-center justify-between pb-2 border-b border-border/30">
                            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                <BarChart3 className="h-3.5 w-3.5 text-primary" />
                                Pipeline Stage Flow
                            </span>
                            <span className="text-[10px] text-muted-foreground font-semibold">
                                {summary?.totalLeads ?? 0} Total
                            </span>
                        </div>

                        <div className="space-y-2.5 text-xs">
                            {[
                                { label: 'New Inflow', count: (summary?.stageCounts?.['new'] || 0) + (summary?.stageCounts?.['new-lead'] || 0), color: 'bg-blue-500' },
                                { label: 'Contacted', count: summary?.stageCounts?.['contacted'] || 0, color: 'bg-amber-500' },
                                { label: 'Qualified', count: summary?.stageCounts?.['qualified'] || 0, color: 'bg-purple-500' },
                                { label: 'Pending Meeting', count: summary?.stageCounts?.['pending-meeting'] || 0, color: 'bg-emerald-500' },
                                { label: 'Closed / Won', count: (summary?.stageCounts?.['closed'] || 0) + (summary?.stageCounts?.['won'] || 0), color: 'bg-green-600' },
                            ].map((stage, idx) => {
                                const total = summary?.totalLeads || 1
                                const pct = Math.round((stage.count / total) * 100)
                                return (
                                    <div key={idx} className="space-y-1">
                                        <div className="flex items-center justify-between text-[11px] font-semibold">
                                            <span className="flex items-center gap-1.5 text-foreground">
                                                <span className={`h-2 w-2 rounded-full ${stage.color}`} />
                                                {stage.label}
                                            </span>
                                            <span className="text-muted-foreground">
                                                <strong className="text-foreground">{stage.count}</strong> ({pct}%)
                                            </span>
                                        </div>
                                        <div className="h-1.5 w-full bg-muted/50 rounded-full overflow-hidden">
                                            <div 
                                                className={`h-full ${stage.color} rounded-full transition-all duration-500`}
                                                style={{ width: `${Math.max(3, pct)}%` }}
                                            />
                                        </div>
                                    </div>
                                )
                            })}
                        </div>

                        <Button 
                            className="w-full mt-2 h-9 rounded-xl font-bold text-xs bg-primary text-primary-foreground shadow-xs hover:bg-primary/90"
                            onClick={() => navigate('/leads')}
                        >
                            Open Kanban Board <ArrowUpRight className="ml-1.5 h-3.5 w-3.5" />
                        </Button>
                    </div>

                    {/* Quick Call Outcomes Breakdown */}
                    <div className="bg-muted/30 border border-border/40 rounded-3xl p-5 shadow-xs space-y-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                            <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                            Calling Effectiveness
                        </span>
                        <div className="grid grid-cols-2 gap-2 text-center pt-1">
                            <div className="p-2.5 rounded-xl bg-background border border-border/40">
                                <span className="text-[10px] uppercase font-bold text-muted-foreground block">Call Discipline</span>
                                <span className="text-lg font-extrabold text-foreground">
                                    {(summary?.totalLeads || 0) > 0 ? Math.max(0, Math.round(100 - ((summary?.totalOverdueFollowups || 0) / summary.totalLeads) * 100)) : 100}%
                                </span>
                            </div>
                            <div className="p-2.5 rounded-xl bg-background border border-border/40">
                                <span className="text-[10px] uppercase font-bold text-muted-foreground block">Active Telecallers</span>
                                <span className="text-lg font-extrabold text-primary">
                                    {summary?.activeAgents || 0}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Sales Growth Engine: Agent Rankings, Leakage Radar, ROI, and Hot Deals */}
            <SalesGrowthSuite
                agents={data?.agents || []}
                sourceAnalytics={data?.sourceAnalytics || []}
                formAnalytics={data?.formAnalytics || []}
                leakageRadar={data?.leakageRadar}
                hotOpportunities={data?.hotOpportunities || []}
                smartInsights={data?.smartInsights || []}
                onRefresh={fetchSalesData}
            />

            {/* Dedicated Lead Capture Forms Performance & Tracking Suite */}
            <WebFormPerformanceSection
                formAnalytics={data?.formAnalytics || []}
                onNavigateToLeads={() => navigate('/leads')}
            />

            {/* Telecaller-Wise Deep Performance Analytics Component */}
            <TelecallerDeepAnalytics 
                agents={data?.agents || []} 
                onSelectAgentForKanban={(ag) => navigate('/leads')}
            />
        </div>
    )
}
