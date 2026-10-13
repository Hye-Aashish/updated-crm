import React, { useState } from 'react'
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
    UserCheck, 
    PhoneForwarded, 
    BarChart3,
    CheckCircle2,
    Calendar,
    FileText,
    Percent,
    ExternalLink,
    Filter
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { format } from 'date-fns'
import { useNavigate } from 'react-router-dom'

export interface AgentAnalytics {
    userId: string
    name: string
    email: string
    role: string
    avatar?: string
    totalAssignedLeads: number
    assignedLeadIds: string[]
    callsInRange: number
    callsToday: number
    uniqueLeadsContacted: number
    followupsScheduled: number
    followupsCompleted: number
    overdueFollowups: number
    meetingsArranged: number
    dealsWon: number
    dealsWonValue: number
    conversionRate: number
    accuracyScore: number
    reachRate?: number
    leadStages?: Record<string, number>
    assignedLeadsList?: Array<{
        id: string
        name: string
        company?: string
        phone?: string
        stage: string
        value: number
        reminder?: { date: string; completed?: boolean; note?: string }
        updatedAt?: string
    }>
    outcomes: Record<string, number>
    recentCalls: Array<{
        leadId: string
        leadName: string
        company?: string
        phone?: string
        outcome: string
        note?: string
        date: string | Date
    }>
}

interface TelecallerDeepAnalyticsProps {
    agents: AgentAnalytics[]
    onSelectAgentForKanban?: (agentName: string) => void
    isPersonalView?: boolean
}

export function TelecallerDeepAnalytics({ agents, onSelectAgentForKanban, isPersonalView = false }: TelecallerDeepAnalyticsProps) {
    const navigate = useNavigate()
    const isSingle = isPersonalView || agents.length === 1
    const [selectedAgentName, setSelectedAgentName] = useState<string>(isSingle ? agents[0]?.name || 'all' : 'all')

    React.useEffect(() => {
        if (isSingle && agents[0]) {
            setSelectedAgentName(agents[0].name)
        }
    }, [isSingle, agents])

    if (!agents || agents.length === 0) {
        return null
    }

    const currentAgent = selectedAgentName !== 'all' 
        ? agents.find(a => a.name === selectedAgentName) || agents[0]
        : null

    const getStageBadgeColor = (stage: string) => {
        const s = (stage || '').toLowerCase()
        if (s.includes('won') || s === 'closed') return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
        if (s.includes('meeting')) return 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30'
        if (s.includes('qualif')) return 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30'
        if (s.includes('contact')) return 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30'
        return 'bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/30'
    }

    return (
        <div className="space-y-5 bg-card border border-border/50 rounded-3xl p-5 sm:p-6 shadow-xs">
            {/* Header with Title and Mode Switcher */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border/30">
                <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                            <UserCheck className="h-4 w-4" />
                        </div>
                        <h3 className="text-lg font-bold text-foreground">
                            {isPersonalView ? 'My In-Depth Performance & Calling Breakdown' : 'Telecaller-Wise Deep Performance Analytics'}
                        </h3>
                        <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px] font-bold">
                            {isPersonalView ? 'My Drill-Down' : 'Individual Drill-Down'}
                        </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                        {isPersonalView 
                            ? 'Aapki calling activity, call outcomes, conversion rate, aur assigned leads pipeline ka complete breakdown'
                            : 'Har telecaller ki detailed calling activity, call outcomes, conversion rate, aur assigned leads pipeline'}
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    {currentAgent && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                                if (onSelectAgentForKanban) {
                                    onSelectAgentForKanban(currentAgent.name)
                                } else {
                                    navigate('/leads')
                                }
                            }}
                            className="h-8 px-3 rounded-xl text-xs font-bold border-border/60 hover:bg-primary hover:text-white transition-all"
                        >
                            <Filter className="h-3 w-3 mr-1 text-primary" />
                            {isPersonalView ? 'Go to My Leads Board' : `Filter "${currentAgent.name}" in Leads`}
                        </Button>
                    )}
                </div>
            </div>

            {/* Telecaller Selector Chips / Tabs (Only if multiple agents) */}
            {!isSingle && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                <button
                    onClick={() => setSelectedAgentName('all')}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-2xl text-xs font-bold transition-all shrink-0 border ${
                        selectedAgentName === 'all'
                            ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                            : 'bg-muted/40 text-muted-foreground border-border/40 hover:bg-muted/70 hover:text-foreground'
                    }`}
                >
                    <BarChart3 className="h-3.5 w-3.5" />
                    All Telecallers Comparison ({agents.length})
                </button>

                {agents.map((ag) => {
                    const isSelected = selectedAgentName === ag.name
                    return (
                        <button
                            key={ag.userId || ag.name}
                            onClick={() => setSelectedAgentName(ag.name)}
                            className={`flex items-center gap-2 px-3.5 py-2 rounded-2xl text-xs font-bold transition-all shrink-0 border ${
                                isSelected
                                    ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                                    : 'bg-muted/40 text-muted-foreground border-border/40 hover:bg-muted/70 hover:text-foreground'
                            }`}
                        >
                            <div className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-extrabold ${
                                isSelected ? 'bg-white/20 text-white' : 'bg-primary/10 text-primary'
                            }`}>
                                {ag.name.charAt(0).toUpperCase()}
                            </div>
                            <span>{ag.name}</span>
                            <span className={`text-[10px] px-1.5 py-0.2 rounded-md ${
                                isSelected ? 'bg-white/20 text-white' : 'bg-muted text-foreground'
                            }`}>
                                {ag.callsInRange} calls
                            </span>
                            {ag.dealsWon > 0 && (
                                <span className={`text-[10px] font-extrabold ${isSelected ? 'text-emerald-200' : 'text-emerald-600'}`}>
                                    🏆{ag.dealsWon}
                                </span>
                            )}
                        </button>
                    )
                })}
            </div>
            )}

            {/* View 1: When an Individual Telecaller is selected */}
            {currentAgent ? (
                <div className="space-y-5 animate-in fade-in-50 duration-200">
                    {/* Agent Highlights Scorecard */}
                    <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-muted/60 via-muted/30 to-muted/60 border border-border/50">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <div className="h-12 w-12 rounded-2xl bg-primary/15 text-primary border border-primary/25 flex items-center justify-center font-extrabold text-lg shadow-inner">
                                    {currentAgent.name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h4 className="text-lg font-bold text-foreground">{currentAgent.name}</h4>
                                        <Badge variant="outline" className="text-[10px] uppercase font-bold py-0.5">
                                            {currentAgent.role || 'Telecaller'}
                                        </Badge>
                                        {currentAgent.accuracyScore >= 90 && (
                                            <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-[9px] font-bold">
                                                Top Discipline
                                            </Badge>
                                        )}
                                    </div>
                                    <span className="text-xs text-muted-foreground">{currentAgent.email || 'telecaller@nexprism.com'}</span>
                                </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                                <div className="text-left sm:text-right px-3 py-1.5 rounded-xl bg-card border border-border/40">
                                    <span className="text-[10px] uppercase font-bold text-muted-foreground block">Calling Discipline</span>
                                    <span className={`text-sm font-extrabold ${currentAgent.accuracyScore >= 80 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                        {currentAgent.accuracyScore}% On-Time
                                    </span>
                                </div>
                                <div className="text-left sm:text-right px-3 py-1.5 rounded-xl bg-card border border-border/40">
                                    <span className="text-[10px] uppercase font-bold text-muted-foreground block">Conversion Rate</span>
                                    <span className="text-sm font-extrabold text-primary">
                                        {currentAgent.conversionRate}% ({currentAgent.dealsWon}/{currentAgent.totalAssignedLeads})
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Detailed Bento KPI Metrics Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                        <div className="p-3.5 rounded-2xl bg-muted/20 border border-border/40 space-y-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                                <Users className="h-3 w-3 text-blue-500" />
                                Assigned Leads
                            </span>
                            <div className="text-xl font-extrabold text-foreground">{currentAgent.totalAssignedLeads}</div>
                            <span className="text-[10px] text-muted-foreground">Active in pipeline</span>
                        </div>

                        <div className="p-3.5 rounded-2xl bg-indigo-500/5 border border-indigo-500/20 space-y-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300 flex items-center gap-1">
                                <PhoneCall className="h-3 w-3 text-indigo-600" />
                                Total Calls Dialed
                            </span>
                            <div className="text-xl font-extrabold text-indigo-700 dark:text-indigo-300">{currentAgent.callsInRange}</div>
                            <span className="text-[10px] text-muted-foreground">Today: <strong className="text-foreground">{currentAgent.callsToday}</strong></span>
                        </div>

                        <div className="p-3.5 rounded-2xl bg-sky-500/5 border border-sky-500/20 space-y-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-sky-700 dark:text-sky-300 flex items-center gap-1">
                                <PhoneForwarded className="h-3 w-3 text-sky-600" />
                                Unique Reached
                            </span>
                            <div className="text-xl font-extrabold text-sky-700 dark:text-sky-300">{currentAgent.uniqueLeadsContacted}</div>
                            <span className="text-[10px] text-muted-foreground">Coverage: <strong className="text-foreground">{currentAgent.reachRate ?? 0}%</strong></span>
                        </div>

                        <div className="p-3.5 rounded-2xl bg-amber-500/5 border border-amber-500/20 space-y-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300 flex items-center gap-1">
                                <CalendarCheck className="h-3 w-3 text-amber-600" />
                                Meetings Booked
                            </span>
                            <div className="text-xl font-extrabold text-amber-700 dark:text-amber-300">{currentAgent.meetingsArranged}</div>
                            <span className="text-[10px] text-muted-foreground">Demos / Calls</span>
                        </div>

                        <div className="p-3.5 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 space-y-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                                <Trophy className="h-3 w-3 text-emerald-600" />
                                Deals Closed
                            </span>
                            <div className="text-xl font-extrabold text-emerald-700 dark:text-emerald-300">{currentAgent.dealsWon}</div>
                            <span className="text-[10px] text-emerald-600 font-bold block truncate" title={formatCurrency(currentAgent.dealsWonValue)}>
                                {formatCurrency(currentAgent.dealsWonValue)}
                            </span>
                        </div>

                        <div className={`p-3.5 rounded-2xl border space-y-1 ${
                            currentAgent.overdueFollowups > 0 ? 'bg-rose-500/5 border-rose-500/20' : 'bg-muted/20 border-border/40'
                        }`}>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                                <AlertTriangle className={`h-3 w-3 ${currentAgent.overdueFollowups > 0 ? 'text-rose-600' : 'text-slate-500'}`} />
                                Overdue Follow-ups
                            </span>
                            <div className={`text-xl font-extrabold ${currentAgent.overdueFollowups > 0 ? 'text-rose-600' : 'text-foreground'}`}>
                                {currentAgent.overdueFollowups}
                            </div>
                            <span className="text-[10px] text-muted-foreground">
                                {currentAgent.overdueFollowups > 0 ? 'Needs Urgent Call' : 'All on track'}
                            </span>
                        </div>
                    </div>

                    {/* Middle Section: Call Outcomes Breakdown & Lead Stages Funnel */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                        {/* Call Outcomes Analysis (6 cols) */}
                        <div className="lg:col-span-6 p-4 rounded-2xl bg-card border border-border/40 space-y-3">
                            <div className="flex items-center justify-between pb-2 border-b border-border/30">
                                <span className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                                    <PhoneCall className="h-3.5 w-3.5 text-primary" />
                                    Call Outcomes & Disposition Breakdown
                                </span>
                                <span className="text-[10px] text-muted-foreground font-semibold">
                                    {currentAgent.callsInRange} Total Calls
                                </span>
                            </div>

                            {Object.keys(currentAgent.outcomes).length > 0 ? (
                                <div className="space-y-2.5">
                                    {Object.entries(currentAgent.outcomes).map(([outcome, count]) => {
                                        const pct = currentAgent.callsInRange > 0
                                            ? Math.round((count / currentAgent.callsInRange) * 100)
                                            : 0
                                        const isPositive = outcome.toLowerCase().includes('interest') || outcome.toLowerCase().includes('meeting') || outcome.toLowerCase().includes('won')
                                        const isNegative = outcome.toLowerCase().includes('not') || outcome.toLowerCase().includes('wrong') || outcome.toLowerCase().includes('switch')

                                        return (
                                            <div key={outcome} className="space-y-1">
                                                <div className="flex items-center justify-between text-xs">
                                                    <span className="font-semibold text-foreground flex items-center gap-1.5">
                                                        <span className={`h-2 w-2 rounded-full ${
                                                            isPositive ? 'bg-emerald-500' : isNegative ? 'bg-rose-500' : 'bg-blue-500'
                                                        }`} />
                                                        {outcome}
                                                    </span>
                                                    <span className="text-muted-foreground text-[11px]">
                                                        <strong className="text-foreground">{count}</strong> ({pct}%)
                                                    </span>
                                                </div>
                                                <div className="h-1.5 w-full bg-muted/60 rounded-full overflow-hidden">
                                                    <div 
                                                        className={`h-full rounded-full transition-all duration-300 ${
                                                            isPositive ? 'bg-emerald-500' : isNegative ? 'bg-rose-500' : 'bg-primary'
                                                        }`}
                                                        style={{ width: `${Math.max(4, pct)}%` }}
                                                    />
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            ) : (
                                <div className="py-8 text-center text-xs text-muted-foreground italic">
                                    No call outcomes recorded in this selected period.
                                </div>
                            )}
                        </div>

                        {/* Pipeline Stage Distribution for this Telecaller (6 cols) */}
                        <div className="lg:col-span-6 p-4 rounded-2xl bg-card border border-border/40 space-y-3">
                            <div className="flex items-center justify-between pb-2 border-b border-border/30">
                                <span className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                                    <BarChart3 className="h-3.5 w-3.5 text-primary" />
                                    Lead Stages Managed by {currentAgent.name}
                                </span>
                                <span className="text-[10px] text-muted-foreground font-semibold">
                                    {currentAgent.totalAssignedLeads} Leads Total
                                </span>
                            </div>

                            {currentAgent.leadStages && Object.keys(currentAgent.leadStages).length > 0 ? (
                                <div className="space-y-2.5">
                                    {Object.entries(currentAgent.leadStages).map(([stage, count]) => {
                                        const pct = currentAgent.totalAssignedLeads > 0 
                                            ? Math.round((count / currentAgent.totalAssignedLeads) * 100) 
                                            : 0
                                        return (
                                            <div key={stage} className="space-y-1">
                                                <div className="flex items-center justify-between text-xs">
                                                    <Badge variant="outline" className={`text-[10px] font-bold capitalize py-0 ${getStageBadgeColor(stage)}`}>
                                                        {stage.replace('-', ' ')}
                                                    </Badge>
                                                    <span className="text-muted-foreground text-[11px]">
                                                        <strong className="text-foreground">{count}</strong> leads ({pct}%)
                                                    </span>
                                                </div>
                                                <div className="h-1.5 w-full bg-muted/60 rounded-full overflow-hidden">
                                                    <div 
                                                        className="h-full bg-primary rounded-full transition-all duration-300"
                                                        style={{ width: `${Math.max(4, pct)}%` }}
                                                    />
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            ) : (
                                <div className="py-8 text-center text-xs text-muted-foreground italic">
                                    No stage data available for this telecaller.
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Bottom Section: Recent Calls History & Assigned Leads List */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                        {/* Recent Calls Log (6 cols) */}
                        <div className="lg:col-span-6 p-4 rounded-2xl bg-card border border-border/40 space-y-3">
                            <div className="flex items-center justify-between pb-2 border-b border-border/30">
                                <span className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                                    <Clock className="h-3.5 w-3.5 text-primary" />
                                    Recent Calling Activity Log
                                </span>
                                <span className="text-[10px] text-muted-foreground">
                                    Last {currentAgent.recentCalls?.length || 0} calls
                                </span>
                            </div>

                            <div className="space-y-2 max-h-[320px] overflow-y-auto custom-scrollbar pr-1">
                                {currentAgent.recentCalls && currentAgent.recentCalls.length > 0 ? (
                                    currentAgent.recentCalls.map((c, idx) => (
                                        <div key={idx} className="p-2.5 rounded-xl bg-muted/20 border border-border/30 hover:border-border/60 transition-colors space-y-1">
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="font-bold text-xs text-foreground truncate">
                                                    {c.leadName} {c.company ? `(${c.company})` : ''}
                                                </span>
                                                <Badge variant="outline" className="text-[9.5px] font-bold py-0 shrink-0">
                                                    {c.outcome}
                                                </Badge>
                                            </div>
                                            {c.note && (
                                                <p className="text-[11px] text-muted-foreground line-clamp-2 italic">
                                                    "{c.note}"
                                                </p>
                                            )}
                                            <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-0.5">
                                                <span>{c.phone ? `📞 ${c.phone}` : ''}</span>
                                                <span>{c.date ? format(new Date(c.date), 'dd MMM, hh:mm a') : 'Recently'}</span>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="py-8 text-center text-xs text-muted-foreground italic">
                                        No call notes recorded yet.
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Assigned Leads Pipeline Preview (6 cols) */}
                        <div className="lg:col-span-6 p-4 rounded-2xl bg-card border border-border/40 space-y-3">
                            <div className="flex items-center justify-between pb-2 border-b border-border/30">
                                <span className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                                    <FileText className="h-3.5 w-3.5 text-primary" />
                                    Assigned Leads In Hand
                                </span>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => navigate('/leads')}
                                    className="h-6 px-2 text-[10px] font-bold text-primary hover:bg-primary/10 rounded-md"
                                >
                                    View All <ExternalLink className="h-2.5 w-2.5 ml-1" />
                                </Button>
                            </div>

                            <div className="space-y-2 max-h-[320px] overflow-y-auto custom-scrollbar pr-1">
                                {currentAgent.assignedLeadsList && currentAgent.assignedLeadsList.length > 0 ? (
                                    currentAgent.assignedLeadsList.map((lead) => (
                                        <div 
                                            key={lead.id} 
                                            className="p-2.5 rounded-xl bg-muted/20 border border-border/30 hover:border-primary/40 transition-colors flex items-center justify-between gap-2 cursor-pointer"
                                            onClick={() => navigate('/leads')}
                                        >
                                            <div className="min-w-0">
                                                <span className="font-bold text-xs text-foreground truncate block">
                                                    {lead.name}
                                                </span>
                                                <span className="text-[10px] text-muted-foreground truncate block">
                                                    {lead.company || lead.phone || 'No company listed'}
                                                </span>
                                            </div>

                                            <div className="text-right shrink-0 space-y-0.5">
                                                <Badge variant="outline" className={`text-[9.5px] font-bold capitalize py-0 ${getStageBadgeColor(lead.stage)}`}>
                                                    {lead.stage.replace('-', ' ')}
                                                </Badge>
                                                {lead.value > 0 && (
                                                    <span className="text-[10px] text-emerald-600 font-bold block">
                                                        {formatCurrency(lead.value)}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="py-8 text-center text-xs text-muted-foreground italic">
                                        No assigned leads found for this telecaller.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                /* View 2: All Telecallers Side-by-Side Comparison Cards */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-in fade-in-50 duration-200">
                    {agents.map((ag) => (
                        <div 
                            key={ag.userId || ag.name}
                            onClick={() => setSelectedAgentName(ag.name)}
                            className="p-4 rounded-2xl bg-muted/15 border border-border/50 hover:border-primary/50 transition-all cursor-pointer space-y-3 group shadow-2xs"
                        >
                            <div className="flex items-center justify-between pb-2 border-b border-border/30">
                                <div className="flex items-center gap-2.5">
                                    <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-sm group-hover:bg-primary group-hover:text-white transition-colors">
                                        {ag.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <span className="font-bold text-sm text-foreground block group-hover:text-primary transition-colors">
                                            {ag.name}
                                        </span>
                                        <span className="text-[10px] text-muted-foreground">{ag.email || 'Telecaller'}</span>
                                    </div>
                                </div>
                                <Badge className="bg-primary/10 text-primary border-primary/20 text-[9px] font-bold">
                                    Click for Deep Dive
                                </Badge>
                            </div>

                            {/* Mini Metrics */}
                            <div className="grid grid-cols-3 gap-2 text-center text-xs">
                                <div className="p-2 rounded-xl bg-card border border-border/40">
                                    <span className="text-[9px] uppercase font-bold text-muted-foreground block">Calls</span>
                                    <span className="font-extrabold text-indigo-600 dark:text-indigo-400 text-sm">{ag.callsInRange}</span>
                                    <span className="text-[8.5px] text-muted-foreground block">Today: {ag.callsToday}</span>
                                </div>
                                <div className="p-2 rounded-xl bg-card border border-border/40">
                                    <span className="text-[9px] uppercase font-bold text-muted-foreground block">Spoke With</span>
                                    <span className="font-extrabold text-sky-600 dark:text-sky-400 text-sm">{ag.uniqueLeadsContacted}</span>
                                    <span className="text-[8.5px] text-muted-foreground block">of {ag.totalAssignedLeads} leads</span>
                                </div>
                                <div className="p-2 rounded-xl bg-card border border-border/40">
                                    <span className="text-[9px] uppercase font-bold text-muted-foreground block">Deals Won</span>
                                    <span className="font-extrabold text-emerald-600 dark:text-emerald-400 text-sm">{ag.dealsWon}</span>
                                    <span className="text-[8.5px] text-emerald-600 font-bold block truncate">{formatCurrency(ag.dealsWonValue)}</span>
                                </div>
                            </div>

                            {/* Progress bar: Coverage */}
                            <div className="space-y-1">
                                <div className="flex items-center justify-between text-[10px]">
                                    <span className="text-muted-foreground">Contact Reach Rate</span>
                                    <strong className="text-foreground">{ag.reachRate ?? 0}%</strong>
                                </div>
                                <div className="h-1.5 w-full bg-muted/60 rounded-full overflow-hidden">
                                    <div 
                                        className="h-full bg-primary rounded-full"
                                        style={{ width: `${Math.min(100, Math.max(5, ag.reachRate ?? 0))}%` }}
                                    />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
