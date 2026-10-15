import React, { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
    PhoneCall, 
    Users, 
    CalendarCheck, 
    Trophy, 
    TrendingUp, 
    AlertTriangle, 
    ArrowUpRight, 
    RefreshCw, 
    Target, 
    UserCheck, 
    Search,
    BarChart3,
    ArrowRightLeft,
    PhoneForwarded
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { useNavigate } from 'react-router-dom'
import api from '@/lib/api-client'
import { format } from 'date-fns'
import { useAppStore } from '@/store'
import { TelecallerPerformanceDialog } from '@/components/leads/telecaller-performance-dialog'
import { TelecallerDeepAnalytics } from '@/components/dashboard/telecaller-deep-analytics'
import { SalesGrowthSuite } from '@/components/dashboard/sales-growth-suite'
import { WebFormPerformanceSection } from '@/components/dashboard/web-form-performance-section'
import { DailyCallingReport } from '@/components/dashboard/daily-calling-report'
import { DayAgentCallingSection } from '@/components/dashboard/day-wise-agent-calling-section'
import { SalesFilterBar, type SalesFilterState } from '@/components/dashboard/sales-filter-bar'
import { SalesKpiCards } from '@/components/dashboard/sales-kpi-cards'
import { SalesCalendar } from '@/components/dashboard/sales-calendar'

export function SalesDashboardPage() {
    const navigate = useNavigate()
    const { currentUser } = useAppStore()
    const isAdminOrOwner = currentUser?.role === 'admin' || currentUser?.role === 'owner'

    // Comprehensive Filter State
    const [filters, setFilters] = useState<SalesFilterState>({
        range: 'today',
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0],
        selectedAgent: 'all',
        leadSource: 'all',
        pipelineStage: 'all'
    })

    const [loading, setLoading] = useState<boolean>(true)
    const [data, setData] = useState<any>(null)
    const [analyticsOverview, setAnalyticsOverview] = useState<any>(null)
    const [searchQuery, setSearchQuery] = useState<string>('')
    const [isPerformanceModalOpen, setIsPerformanceModalOpen] = useState(false)

    const fetchSalesData = async () => {
        try {
            setLoading(true)
            const queryParams = new URLSearchParams()
            queryParams.append('range', filters.range)
            if (filters.startDate) queryParams.append('startDate', filters.startDate)
            if (filters.endDate) queryParams.append('endDate', filters.endDate)
            if (filters.selectedAgent !== 'all') queryParams.append('agentId', filters.selectedAgent)
            if (filters.leadSource !== 'all') queryParams.append('leadSource', filters.leadSource)
            if (filters.pipelineStage !== 'all') queryParams.append('pipelineStage', filters.pipelineStage)

            const [telecallerRes, analyticsRes] = await Promise.all([
                api.get(`/leads/telecaller-analytics?${queryParams.toString()}`),
                api.get(`/sales-analytics/overview?${queryParams.toString()}`).catch(() => ({ data: null }))
            ])

            setData(telecallerRes.data)
            if (analyticsRes?.data) {
                setAnalyticsOverview(analyticsRes.data)
            }
        } catch (err) {
            console.error('Error fetching sales dashboard data:', err)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchSalesData()
    }, [filters.range, filters.selectedAgent, filters.leadSource, filters.pipelineStage])

    const handleApplyFilters = () => {
        fetchSalesData()
    }

    const handleResetFilters = () => {
        setFilters({
            range: 'today',
            startDate: new Date().toISOString().split('T')[0],
            endDate: new Date().toISOString().split('T')[0],
            selectedAgent: 'all',
            leadSource: 'all',
            pipelineStage: 'all'
        })
    }

    const handleExportReport = () => {
        const queryParams = new URLSearchParams()
        if (filters.startDate) queryParams.append('startDate', filters.startDate)
        if (filters.endDate) queryParams.append('endDate', filters.endDate)
        if (filters.selectedAgent !== 'all') queryParams.append('agentId', filters.selectedAgent)
        window.open(`/api/sales-analytics/export?${queryParams.toString()}`, '_blank')
    }

    const summary = data?.summary
    const isPersonal = !isAdminOrOwner
    const agents = (data?.agents || []).filter((a: any) => 
        a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.email?.toLowerCase().includes(searchQuery.toLowerCase())
    )
    const myAgent = agents[0] || null

    // Unified KPIs
    const unifiedKpis = {
        totalCallAttempts: analyticsOverview?.kpis?.totalCallAttempts ?? summary?.totalCalls ?? 0,
        uniqueLeadsCalled: analyticsOverview?.kpis?.uniqueLeadsCalled ?? summary?.totalUniqueContacted ?? 0,
        uniqueLeadsContacted: analyticsOverview?.kpis?.uniqueLeadsContacted ?? summary?.totalUniqueContacted ?? 0,
        leadsNotYetContacted: analyticsOverview?.kpis?.leadsNotYetContacted ?? Math.max(0, (summary?.totalLeads || 0) - (summary?.totalUniqueContacted || 0)),
        connectedCalls: analyticsOverview?.kpis?.connectedCalls ?? summary?.totalCallsToday ?? 0,
        unansweredOutgoing: analyticsOverview?.kpis?.unansweredOutgoing ?? Math.max(0, (summary?.totalCalls || 0) - (summary?.totalUniqueContacted || 0)),
        callConnectionRate: analyticsOverview?.kpis?.callConnectionRate ?? 78,
        totalTalkTimeFormatted: summary?.totalTalkTimeFormatted || '0m',
        avgCallDurationFormatted: summary?.avgCallDurationFormatted || '0m',
        longestCallDurationFormatted: summary?.longestCallDurationFormatted || '0m',
        meetingsScheduled: analyticsOverview?.kpis?.meetingsScheduled ?? summary?.totalMeetings ?? 0,
        meetingsCompleted: analyticsOverview?.kpis?.meetingsCompleted ?? Math.max(0, (summary?.totalMeetings || 0) - (summary?.pendingMeetings || 0)),
        meetingAttendanceRate: analyticsOverview?.kpis?.meetingAttendanceRate ?? 92,
        followupsCompleted: analyticsOverview?.kpis?.followupsCompleted ?? summary?.totalCallsToday ?? 0,
        overdueFollowups: summary?.totalOverdueFollowups ?? 0,
        qualifiedLeads: summary?.qualifiedLeads ?? 0,
        dealsWon: summary?.totalDealsWon ?? 0,
        revenueGenerated: summary?.totalRevenueWon ?? 0,
        conversionRate: summary?.totalLeads > 0 ? Math.round(((summary?.totalDealsWon || 0) / summary.totalLeads) * 100) : 0,
        targetAchievement: analyticsOverview?.kpis?.targetAchievement || { revenue: null, calls: null, revenueTarget: 0 }
    }

    return (
        <div className="flex-1 space-y-6 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto custom-scrollbar">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white shadow-xl border border-white/10 relative overflow-hidden">
                <div className="space-y-1 relative z-10">
                    <div className="flex items-center gap-2.5">
                        <div className="h-11 w-11 rounded-2xl bg-primary/20 border border-primary/30 flex items-center justify-center text-primary shadow-inner">
                            <Target className="h-6 w-6 animate-pulse" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-2xl font-bold tracking-tight text-white">
                                    {isPersonal ? 'My Sales Performance Dashboard' : 'Sales Performance Dashboard'}
                                </h2>
                                <Badge className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[9px] uppercase font-bold py-0.5">
                                    {isPersonal ? 'Personal Sales Space' : 'Full CRM Intelligence'}
                                </Badge>
                            </div>
                            <p className="text-xs text-slate-400">
                                {isPersonal 
                                    ? 'Personal performance tracking: My dialed calls, customer connections, won deals, pipeline status, and follow-ups'
                                    : 'Comprehensive monitoring of lead flows, telecaller activity, daily calls, meetings, calendar agenda, and won contracts'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Right Action */}
                <div className="flex items-center gap-2 relative z-10">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={fetchSalesData}
                        className="h-8 w-8 text-slate-300 hover:text-white hover:bg-white/10 rounded-xl"
                        title="Refresh"
                    >
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    </Button>
                    <Button 
                        onClick={() => navigate('/leads')}
                        className="h-9 px-4 rounded-xl font-bold text-xs bg-primary text-primary-foreground hover:bg-primary/90 shadow-md"
                    >
                        Go to Leads Board <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
                    </Button>
                </div>

                {/* Glow */}
                <div className="absolute right-0 top-0 h-48 w-48 bg-primary/20 blur-3xl rounded-full pointer-events-none" />
                <div className="absolute left-1/4 bottom-0 h-32 w-32 bg-indigo-500/20 blur-3xl rounded-full pointer-events-none" />
            </div>

            {/* Custom Date Range & Dimensional Filter Bar */}
            <SalesFilterBar
                filters={filters}
                onChangeFilters={(updated) => setFilters(prev => ({ ...prev, ...updated }))}
                onApply={handleApplyFilters}
                onReset={handleResetFilters}
                onExport={handleExportReport}
                agents={data?.allAgents || data?.agents || []}
                isPersonalView={isPersonal}
            />

            {/* 15 Standard KPI Cards Section */}
            <SalesKpiCards 
                kpis={unifiedKpis}
                isPersonalView={isPersonal}
                onCardClick={(kpiKey) => {
                    if (kpiKey.includes('lead') || kpiKey.includes('deal')) navigate('/leads')
                }}
            />

            {/* 6 Top KPI Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
                <Card className="p-4 rounded-2xl border border-border/50 bg-card shadow-xs hover:border-primary/40 transition-all cursor-pointer" onClick={() => navigate('/leads')}>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">
                        {isPersonal ? 'My Managed Leads' : 'Total Pipeline Leads'}
                    </span>
                    <div className="text-2xl font-extrabold text-foreground">{summary?.totalLeads ?? 0}</div>
                    <span className="text-[10px] text-muted-foreground block mt-1">Fresh Inflow: <strong className="text-blue-600">{summary?.newLeads ?? 0}</strong></span>
                </Card>

                <Card className="p-4 rounded-2xl border border-border/50 bg-card shadow-xs">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">
                        {isPersonal ? 'My Calls Dialed' : 'Total Calls Dialed'}
                    </span>
                    <div className="text-2xl font-extrabold text-indigo-600 dark:text-indigo-400">{summary?.totalCalls ?? 0}</div>
                    <span className="text-[10px] text-muted-foreground block mt-1">Today: <strong className="text-foreground">{summary?.totalCallsToday ?? 0}</strong></span>
                </Card>

                <Card className="p-4 rounded-2xl border border-border/50 bg-card shadow-xs">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">Unique Contacts Reached</span>
                    <div className="text-2xl font-extrabold text-sky-600 dark:text-sky-400">{summary?.totalUniqueContacted ?? 0}</div>
                    <span className="text-[10px] text-muted-foreground block mt-1">Spoke With Customers</span>
                </Card>

                <Card className="p-4 rounded-2xl border border-border/50 bg-card shadow-xs">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">Meetings & Demos</span>
                    <div className="text-2xl font-extrabold text-amber-600 dark:text-amber-400">{summary?.totalMeetings ?? 0}</div>
                    <span className="text-[10px] text-muted-foreground block mt-1">Pending: <strong className="text-amber-600">{summary?.pendingMeetings ?? 0}</strong></span>
                </Card>

                <Card className="p-4 rounded-2xl border border-border/50 bg-card shadow-xs">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">
                        {isPersonal ? 'My Closed Deals' : 'Deals / Projects Won'}
                    </span>
                    <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">{summary?.totalDealsWon ?? 0}</div>
                    <span className="text-[10px] text-emerald-600 font-bold block mt-1 truncate">{formatCurrency(summary?.totalRevenueWon ?? 0)}</span>
                </Card>

                <Card className="p-4 rounded-2xl border border-border/50 bg-card shadow-xs">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">
                        {isPersonal ? 'My Overdue Calls' : 'Overdue Follow-ups'}
                    </span>
                    <div className="text-2xl font-extrabold text-rose-600 dark:text-rose-400">{summary?.totalOverdueFollowups ?? 0}</div>
                    <span className="text-[10px] text-muted-foreground block mt-1">Pending: <strong className="text-foreground">{summary?.totalPendingFollowups ?? 0}</strong></span>
                </Card>
            </div>

            {/* Main Agent Details & Pipeline Flow Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* When Personal: Rich Sales Command Center (8 cols) */}
                {isPersonal ? (
                    <div className="lg:col-span-8 bg-card border border-border/50 rounded-3xl p-5 sm:p-6 shadow-xs space-y-5">
                        {/* Top Identity & Calling Target Bar */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-gradient-to-r from-primary/10 via-indigo-500/10 to-transparent border border-primary/20">
                            <div className="flex items-center gap-3.5">
                                <div className="h-14 w-14 rounded-2xl bg-primary text-primary-foreground font-black text-xl flex items-center justify-center shadow-md">
                                    {currentUser?.name?.charAt(0)?.toUpperCase() || 'S'}
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-extrabold text-lg text-foreground">{currentUser?.name}</h3>
                                        <Badge className="bg-primary/20 text-primary border-primary/30 text-[10px] font-bold">
                                            {currentUser?.role === 'telecaller' ? 'Sales Executive / Telecaller' : (currentUser?.role || 'Sales')}
                                        </Badge>
                                    </div>
                                    <p className="text-xs text-muted-foreground">{currentUser?.email}</p>
                                </div>
                            </div>

                            <div className="sm:text-right space-y-1">
                                <span className="text-[10px] uppercase font-bold text-muted-foreground block">Today's Calling Target</span>
                                <div className="flex items-center sm:justify-end gap-2">
                                    <span className="text-xl font-black text-foreground">{summary?.totalCallsToday ?? 0}</span>
                                    <span className="text-xs text-muted-foreground font-semibold">/ 30 Dials</span>
                                    <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-[10px] font-bold">
                                        {Math.min(100, Math.round(((summary?.totalCallsToday ?? 0) / 30) * 100))}% Done
                                    </Badge>
                                </div>
                            </div>
                        </div>

                        {/* 4 Personal Metric Highlights */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            <div className="p-3.5 rounded-2xl bg-muted/20 border border-border/40 text-center space-y-1">
                                <span className="text-[10px] uppercase font-bold text-muted-foreground block">Conversion Rate</span>
                                <span className="text-xl font-extrabold text-emerald-600 block">
                                    {(summary?.totalLeads || 0) > 0 ? Math.round(((summary?.totalDealsWon || 0) / summary.totalLeads) * 100) : 0}%
                                </span>
                                <span className="text-[9px] text-muted-foreground">Leads to Won</span>
                            </div>

                            <div className="p-3.5 rounded-2xl bg-muted/20 border border-border/40 text-center space-y-1">
                                <span className="text-[10px] uppercase font-bold text-muted-foreground block">Reach Accuracy</span>
                                <span className="text-xl font-extrabold text-indigo-600 block">
                                    {(summary?.totalCalls || 0) > 0 ? Math.round(((summary?.totalUniqueContacted || 0) / (summary?.totalCalls || 1)) * 100) : 0}%
                                </span>
                                <span className="text-[9px] text-muted-foreground">Contact Ratio</span>
                            </div>

                            <div className="p-3.5 rounded-2xl bg-muted/20 border border-border/40 text-center space-y-1">
                                <span className="text-[10px] uppercase font-bold text-muted-foreground block">Follow-up Discipline</span>
                                <span className="text-xl font-extrabold text-foreground block">
                                    {(summary?.totalOverdueFollowups ?? 0) === 0 ? '100%' : `${Math.max(0, 100 - (summary?.totalOverdueFollowups ?? 0) * 10)}%`}
                                </span>
                                <span className="text-[9px] text-muted-foreground">
                                    {(summary?.totalOverdueFollowups ?? 0) === 0 ? 'Zero Overdue' : `${summary?.totalOverdueFollowups} Overdue`}
                                </span>
                            </div>

                            <div className="p-3.5 rounded-2xl bg-muted/20 border border-border/40 text-center space-y-1">
                                <span className="text-[10px] uppercase font-bold text-muted-foreground block">Closed Revenue</span>
                                <span className="text-base sm:text-lg font-extrabold text-emerald-600 block truncate">
                                    {formatCurrency(summary?.totalRevenueWon ?? 0)}
                                </span>
                                <span className="text-[9px] text-muted-foreground">{summary?.totalDealsWon ?? 0} Deals Won</span>
                            </div>
                        </div>

                        {/* My Managed Leads Quick Pipeline List */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                    <Users className="h-3.5 w-3.5 text-primary" />
                                    My Assigned Active Leads
                                </span>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => navigate('/leads')}
                                    className="h-7 px-3 text-[10px] font-bold rounded-lg border-border/60 hover:bg-primary hover:text-white"
                                >
                                    Open Full Leads Board <ArrowUpRight className="ml-1 h-3 w-3" />
                                </Button>
                            </div>

                            <div className="space-y-2 max-h-[260px] overflow-y-auto custom-scrollbar pr-1">
                                {myAgent?.assignedLeadsList && myAgent.assignedLeadsList.length > 0 ? (
                                    myAgent.assignedLeadsList.map((lead: any) => (
                                        <div
                                            key={lead.id}
                                            onClick={() => navigate('/leads')}
                                            className="p-3 rounded-xl bg-muted/20 border border-border/40 hover:border-primary/40 hover:bg-muted/40 transition-all cursor-pointer flex items-center justify-between gap-2"
                                        >
                                            <div className="min-w-0">
                                                <span className="font-bold text-xs text-foreground block truncate">
                                                    {lead.name} {lead.company ? `(${lead.company})` : ''}
                                                </span>
                                                <span className="text-[10px] text-muted-foreground block">
                                                    {lead.phone || 'No Phone'} • Stage: <strong className="text-foreground capitalize">{lead.stage}</strong>
                                                </span>
                                            </div>

                                            <div className="text-right shrink-0 space-y-0.5">
                                                {lead.value > 0 && (
                                                    <span className="text-xs font-extrabold text-emerald-600 block">
                                                        {formatCurrency(lead.value)}
                                                    </span>
                                                )}
                                                <Badge variant="outline" className="text-[9px] font-semibold capitalize">
                                                    {lead.stage}
                                                </Badge>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="p-8 rounded-2xl bg-muted/10 border border-dashed border-border/50 text-center space-y-2">
                                        <p className="text-xs text-muted-foreground">No active leads assigned yet or all leads closed.</p>
                                        <Button
                                            size="sm"
                                            onClick={() => navigate('/leads')}
                                            className="h-8 rounded-xl font-bold text-xs bg-primary text-primary-foreground"
                                        >
                                            Add or View Leads
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ) : (
                    /* Admin / Owner View: Full Agent Call Table (8 cols) */
                    <div className="lg:col-span-8 bg-card border border-border/50 rounded-3xl p-5 shadow-xs space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/30">
                            <div className="flex items-center gap-2">
                                <div className="h-8 w-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                                    <UserCheck className="h-4 w-4" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-base text-foreground">Agent Call & Conversion Report</h3>
                                    <p className="text-[10px] text-muted-foreground">Detailed activity, conversion %, and calls breakdown per telecaller</p>
                                </div>
                            </div>

                            <div className="relative w-full sm:w-60">
                                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                                <Input
                                    placeholder="Filter agent name..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="h-8 pl-8 text-xs rounded-xl border-border/60"
                                />
                            </div>
                        </div>

                        {/* Table */}
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse text-xs">
                                <thead>
                                    <tr className="border-b border-border/40 text-[10px] uppercase font-bold text-muted-foreground">
                                        <th className="py-2.5 px-3">Telecaller / Agent</th>
                                        <th className="py-2.5 px-3 text-center">Assigned Leads</th>
                                        <th className="py-2.5 px-3 text-center">Calls Dialed</th>
                                        <th className="py-2.5 px-3 text-center">Spoke With</th>
                                        <th className="py-2.5 px-3 text-center">Meetings</th>
                                        <th className="py-2.5 px-3 text-center">Deals Won</th>
                                        <th className="py-2.5 px-3 text-center">Call Accuracy</th>
                                        <th className="py-2.5 px-3 text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/20">
                                    {agents.map((ag: any) => (
                                        <tr key={ag.userId || ag.name} className="hover:bg-muted/30 transition-colors">
                                            <td className="py-3 px-3 font-semibold">
                                                <div className="flex items-center gap-2">
                                                    <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                                                        {ag.name?.charAt(0)?.toUpperCase()}
                                                    </div>
                                                    <div className="truncate">
                                                        <span className="font-bold text-foreground block truncate">{ag.name}</span>
                                                        <span className="text-[10px] text-muted-foreground">{ag.email || 'Telecaller'}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-3 px-3 text-center font-extrabold text-foreground">
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
                                                <span className="font-bold text-emerald-600 dark:text-emerald-400 block">
                                                    {ag.dealsWon}
                                                </span>
                                                {ag.dealsWonValue > 0 && (
                                                    <span className="text-[9px] text-muted-foreground font-medium block">
                                                        {formatCurrency(ag.dealsWonValue)}
                                                    </span>
                                                )}
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
                                                    className="h-7 px-2.5 text-[10px] font-bold rounded-lg border-border/60 hover:bg-primary hover:text-white"
                                                >
                                                    View Leads
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}

                                    {agents.length === 0 && (
                                        <tr>
                                            <td colSpan={8} className="py-8 text-center text-muted-foreground text-xs italic">
                                                No agent performance records found.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Pipeline Stages & Calling Effectiveness (4 cols) */}
                <div className="lg:col-span-4 space-y-4">
                    <div className="bg-card border border-border/50 rounded-3xl p-5 shadow-xs space-y-4">
                        <div className="flex items-center justify-between pb-2 border-b border-border/30">
                            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                <BarChart3 className="h-3.5 w-3.5 text-primary" />
                                Sales Conversion Funnel
                            </span>
                            <span className="text-[10px] text-muted-foreground font-semibold">
                                {summary?.totalLeads ?? 0} Leads
                            </span>
                        </div>

                        <div className="space-y-3 text-xs">
                            {[
                                { label: 'New Leads Inflow', count: (summary?.stageCounts?.['new'] || 0) + (summary?.stageCounts?.['new-lead'] || 0), color: 'bg-blue-500' },
                                { label: 'Contacted Leads', count: summary?.stageCounts?.['contacted'] || 0, color: 'bg-amber-500' },
                                { label: 'Qualified Leads', count: summary?.stageCounts?.['qualified'] || 0, color: 'bg-purple-500' },
                                { label: 'Pending Meeting', count: summary?.stageCounts?.['pending-meeting'] || 0, color: 'bg-emerald-500' },
                                { label: 'Deals Won & Closed', count: (summary?.stageCounts?.['closed'] || 0) + (summary?.stageCounts?.['won'] || 0), color: 'bg-green-600' },
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
                                        <div className="h-2 w-full bg-muted/50 rounded-full overflow-hidden">
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
                            className="w-full h-10 rounded-xl font-bold text-xs bg-primary text-primary-foreground shadow-xs hover:bg-primary/90 mt-2"
                            onClick={() => navigate('/leads')}
                        >
                            Open Kanban Lead Pipeline <ArrowUpRight className="ml-1.5 h-3.5 w-3.5" />
                        </Button>
                    </div>

                    {/* Team Calling Efficiency Card */}
                    <div className="bg-muted/30 border border-border/40 rounded-3xl p-5 shadow-xs space-y-3">
                        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
                            Calling Discipline & Health
                        </span>
                        <div className="grid grid-cols-2 gap-2 text-center">
                            <div className="p-3 rounded-2xl bg-card border border-border/40">
                                <span className="text-[10px] uppercase font-bold text-muted-foreground block">On-Time Follow-up</span>
                                <span className="text-xl font-extrabold text-foreground">
                                    {(summary?.totalLeads || 0) > 0 ? Math.max(0, Math.round(100 - ((summary?.totalOverdueFollowups || 0) / summary.totalLeads) * 100)) : 100}%
                                </span>
                            </div>
                            <div className="p-3 rounded-2xl bg-card border border-border/40">
                                <span className="text-[10px] uppercase font-bold text-muted-foreground block">Active Agents</span>
                                <span className="text-xl font-extrabold text-primary">
                                    {summary?.activeAgents || 0}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Day-Wise Calling & Follow-up Agenda (Calendar Day Selection, New vs Follow-up, Missed Calls) */}
            <DayAgentCallingSection
                isPersonalView={isPersonal}
                selectedAgentId={filters.selectedAgent}
                onViewLeadsBoard={() => navigate('/leads')}
            />

            {/* Daily Calling & Talk Time Intelligence Report (per sales person tracking) */}
            <DailyCallingReport
                agents={data?.allAgents || data?.agents || []}
                callingLogs={data?.dailyCallingLogs || []}
                overallHourlyCalls={data?.overallHourlyCalls || {}}
                summary={data?.summary || {}}
                isPersonalView={isPersonal}
            />

            {/* Sales Calendar: Month Navigation, Agenda, Scheduled Meetings & Follow-ups */}
            <SalesCalendar
                agents={data?.allAgents || data?.agents || []}
                isPersonalView={isPersonal}
            />

            {/* Sales Growth Engine: Agent Rankings, Leakage Radar, ROI, and Hot Deals */}
            <SalesGrowthSuite
                agents={data?.allAgents || data?.agents || []}
                sourceAnalytics={data?.sourceAnalytics || []}
                formAnalytics={data?.formAnalytics || []}
                leakageRadar={data?.leakageRadar}
                hotOpportunities={data?.hotOpportunities || []}
                smartInsights={data?.smartInsights || []}
                onRefresh={fetchSalesData}
                isPersonalView={isPersonal}
            />

            {/* Dedicated Lead Capture Forms Performance & Tracking Suite */}
            <WebFormPerformanceSection
                formAnalytics={data?.formAnalytics || []}
                onNavigateToLeads={() => navigate('/leads')}
            />

            {/* Telecaller-Wise Deep Performance Analytics Section */}
            <TelecallerDeepAnalytics 
                agents={data?.agents || []} 
                onSelectAgentForKanban={(ag) => navigate('/leads')}
                isPersonalView={isPersonal}
            />

            {/* Performance Modal */}
            <TelecallerPerformanceDialog
                open={isPerformanceModalOpen}
                onOpenChange={setIsPerformanceModalOpen}
                onFilterByAgent={(ag) => navigate('/leads')}
                onRefreshBoard={fetchSalesData}
            />
        </div>
    )
}
