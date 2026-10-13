import React, { useState, useMemo } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
    PhoneCall, 
    Clock, 
    Timer, 
    UserCheck, 
    Search, 
    Download, 
    Calendar, 
    CheckCircle2, 
    PhoneOff, 
    AlertTriangle, 
    ArrowUpRight, 
    TrendingUp, 
    Flame,
    Headphones,
    MessageSquare,
    ExternalLink
} from 'lucide-react'
import { format } from 'date-fns'
import { useNavigate } from 'react-router-dom'

export interface DailyCallingLogItem {
    id: string
    leadId: string
    leadName: string
    company?: string
    phone?: string
    agentName: string
    stage?: string
    type?: string
    outcome: string
    durationSeconds: number
    durationFormatted: string
    note?: string
    createdAt: string | Date
}

export interface DailyCallingReportProps {
    agents: any[]
    callingLogs: DailyCallingLogItem[]
    overallHourlyCalls?: Record<string, number>
    summary: any
    isPersonalView?: boolean
}

export function DailyCallingReport({
    agents,
    callingLogs = [],
    overallHourlyCalls = {},
    summary,
    isPersonalView = false
}: DailyCallingReportProps) {
    const navigate = useNavigate()
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedAgent, setSelectedAgent] = useState<string>('all')
    const [outcomeFilter, setOutcomeFilter] = useState<string>('all')

    // Filtered Calling Logs
    const filteredLogs = useMemo(() => {
        return (callingLogs || []).filter((log) => {
            const matchesSearch = 
                !searchQuery ||
                log.leadName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                log.agentName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                log.phone?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                log.company?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                log.note?.toLowerCase().includes(searchQuery.toLowerCase())

            const matchesAgent = 
                selectedAgent === 'all' || 
                log.agentName === selectedAgent || 
                (log as any).userId === selectedAgent

            const matchesOutcome = 
                outcomeFilter === 'all' || 
                log.outcome?.toLowerCase() === outcomeFilter.toLowerCase() ||
                (outcomeFilter === 'connected' && log.outcome?.toLowerCase().includes('connect')) ||
                (outcomeFilter === 'unanswered' && (log.outcome?.toLowerCase().includes('not answered') || log.outcome?.toLowerCase().includes('busy')))

            return matchesSearch && matchesAgent && matchesOutcome
        })
    }, [callingLogs, searchQuery, selectedAgent, outcomeFilter])

    // Export calling logs as CSV
    const exportCSV = () => {
        if (!filteredLogs.length) return
        const headers = ['Timestamp', 'Sales Person', 'Lead Name', 'Company', 'Phone', 'Duration', 'Seconds', 'Outcome', 'Notes']
        const rows = filteredLogs.map(l => [
            format(new Date(l.createdAt), 'yyyy-MM-dd HH:mm:ss'),
            `"${l.agentName || ''}"`,
            `"${l.leadName || ''}"`,
            `"${l.company || ''}"`,
            `"${l.phone || ''}"`,
            `"${l.durationFormatted || '0s'}"`,
            l.durationSeconds || 0,
            `"${l.outcome || ''}"`,
            `"${(l.note || '').replace(/"/g, '""')}"`
        ])

        const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n')
        const encodedUri = encodeURI(csvContent)
        const link = document.createElement('a')
        link.setAttribute('href', encodedUri)
        link.setAttribute('download', `daily_calls_report_${format(new Date(), 'yyyy-MM-dd')}.csv`)
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }

    const getOutcomeBadge = (outcome: string) => {
        const o = (outcome || '').toLowerCase()
        if (o.includes('connect')) {
            return (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                    <CheckCircle2 className="h-3 w-3" />
                    {outcome}
                </span>
            )
        }
        if (o.includes('busy')) {
            return (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                    <AlertTriangle className="h-3 w-3" />
                    {outcome}
                </span>
            )
        }
        if (o.includes('not answered') || o.includes('missed')) {
            return (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30">
                    <PhoneOff className="h-3 w-3" />
                    {outcome}
                </span>
            )
        }
        return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-muted text-muted-foreground border border-border/60">
                <PhoneCall className="h-3 w-3" />
                {outcome || 'Call'}
            </span>
        )
    }

    const getDurationBadge = (seconds: number, formatted: string) => {
        if (seconds >= 300) { // 5+ min deep discussion
            return (
                <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 font-bold text-[10px] px-2 py-0.5">
                    ⏱️ {formatted || '5m+'}
                </Badge>
            )
        }
        if (seconds >= 120) { // 2 - 5 mins good talk
            return (
                <Badge className="bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30 font-bold text-[10px] px-2 py-0.5">
                    ⏱️ {formatted}
                </Badge>
            )
        }
        if (seconds >= 40) { // Brief chat
            return (
                <Badge className="bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30 font-semibold text-[10px] px-2 py-0.5">
                    ⏱️ {formatted}
                </Badge>
            )
        }
        return (
            <Badge variant="outline" className="text-muted-foreground text-[10px] font-medium px-2 py-0.5">
                ⏱️ {formatted || '0s'}
            </Badge>
        )
    }

    return (
        <div className="space-y-6">
            {/* Section Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5 rounded-3xl bg-gradient-to-r from-blue-900/40 via-indigo-900/30 to-purple-900/30 border border-indigo-500/20 backdrop-blur-md">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                        <Headphones className="h-5 w-5" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="font-bold text-lg text-foreground">
                                Daily Calling & Talk Time Intelligence
                            </h3>
                            <Badge className="bg-indigo-500/20 text-indigo-300 border-indigo-500/30 text-[9px] uppercase font-bold">
                                Live Tracking
                            </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Exact duration spent on customer calls, total talk time, connection rate, and daily activity per sales person
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto">
                    <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={exportCSV}
                        disabled={filteredLogs.length === 0}
                        className="h-8 px-3 text-xs font-bold rounded-xl border-border/60 hover:bg-muted gap-1.5"
                    >
                        <Download className="h-3.5 w-3.5" />
                        Export Call Logs ({filteredLogs.length})
                    </Button>
                </div>
            </div>

            {/* 4 Talk Time Intelligence Metric Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
                <Card className="p-4 rounded-2xl border border-border/50 bg-card shadow-xs space-y-1">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                            Total Talk Time
                        </span>
                        <Timer className="h-4 w-4 text-indigo-500" />
                    </div>
                    <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400">
                        {summary?.totalTalkTimeFormatted || '0m'}
                    </div>
                    <span className="text-[10px] text-muted-foreground block">
                        Today: <strong className="text-foreground">{summary?.callsTodayTalkTimeFormatted || '0m'}</strong>
                    </span>
                </Card>

                <Card className="p-4 rounded-2xl border border-border/50 bg-card shadow-xs space-y-1">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                            Average Call Length
                        </span>
                        <Clock className="h-4 w-4 text-sky-500" />
                    </div>
                    <div className="text-2xl font-black text-sky-600 dark:text-sky-400">
                        {summary?.avgCallDurationFormatted || '0m'}
                    </div>
                    <span className="text-[10px] text-muted-foreground block">
                        Target benchmark: <strong className="text-foreground">2m 30s+</strong>
                    </span>
                </Card>

                <Card className="p-4 rounded-2xl border border-border/50 bg-card shadow-xs space-y-1">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                            Longest Conversation
                        </span>
                        <Flame className="h-4 w-4 text-amber-500" />
                    </div>
                    <div className="text-2xl font-black text-amber-600 dark:text-amber-400">
                        {summary?.longestCallDurationFormatted || '0m'}
                    </div>
                    <span className="text-[10px] text-muted-foreground block">
                        Deepest customer discovery
                    </span>
                </Card>

                <Card className="p-4 rounded-2xl border border-border/50 bg-card shadow-xs space-y-1">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                            Calls Connected Today
                        </span>
                        <PhoneCall className="h-4 w-4 text-emerald-500" />
                    </div>
                    <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                        {summary?.totalCallsToday ?? 0}
                    </div>
                    <span className="text-[10px] text-muted-foreground block">
                        Total range: <strong className="text-foreground">{summary?.totalCalls ?? 0} dials</strong>
                    </span>
                </Card>
            </div>

            {/* Sales Persons Daily Calling Summary Cards (Admin/Owner view shows all, personal shows self) */}
            {!isPersonalView && agents && agents.length > 0 && (
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                            <UserCheck className="h-3.5 w-3.5 text-primary" />
                            Salesperson Daily Calling & Coverage Scorecard
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                            {agents.length} Active Sales Persons
                        </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                        {agents.map((ag) => (
                            <div 
                                key={ag.userId || ag.name}
                                className="p-4 rounded-2xl bg-card border border-border/50 hover:border-primary/40 transition-all shadow-xs space-y-3"
                            >
                                <div className="flex items-center justify-between pb-2 border-b border-border/30">
                                    <div className="flex items-center gap-2.5">
                                        <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-black text-sm">
                                            {ag.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <span className="font-bold text-xs text-foreground block">
                                                {ag.name}
                                            </span>
                                            <span className="text-[10px] text-muted-foreground">
                                                {ag.email || 'Sales Executive'}
                                            </span>
                                        </div>
                                    </div>
                                    <Badge className="bg-primary/15 text-primary border-primary/30 text-[9px] font-bold">
                                        Rank #{ag.rank || 1}
                                    </Badge>
                                </div>

                                {/* Call Stats Matrix */}
                                <div className="grid grid-cols-3 gap-2 text-center">
                                    <div className="p-2 rounded-xl bg-muted/20 border border-border/30">
                                        <span className="text-[9px] uppercase font-bold text-muted-foreground block">Total Talk</span>
                                        <span className="font-extrabold text-xs text-indigo-600 block mt-0.5">
                                            {ag.totalTalkTimeFormatted || '0s'}
                                        </span>
                                        <span className="text-[8.5px] text-muted-foreground">Today: {ag.callsTodayTalkTimeFormatted || '0s'}</span>
                                    </div>

                                    <div className="p-2 rounded-xl bg-muted/20 border border-border/30">
                                        <span className="text-[9px] uppercase font-bold text-muted-foreground block">Dials</span>
                                        <span className="font-extrabold text-xs text-foreground block mt-0.5">
                                            {ag.callsInRange}
                                        </span>
                                        <span className="text-[8.5px] text-muted-foreground">Today: {ag.callsToday}</span>
                                    </div>

                                    <div className="p-2 rounded-xl bg-muted/20 border border-border/30">
                                        <span className="text-[9px] uppercase font-bold text-muted-foreground block">Avg Call</span>
                                        <span className="font-extrabold text-xs text-sky-600 block mt-0.5">
                                            {ag.avgCallDurationFormatted || '0s'}
                                        </span>
                                        <span className="text-[8.5px] text-muted-foreground">Max: {ag.longestCallDurationFormatted || '0s'}</span>
                                    </div>
                                </div>

                                {/* Leads Coverage Progress */}
                                <div className="space-y-1">
                                    <div className="flex items-center justify-between text-[10px] font-semibold">
                                        <span className="text-muted-foreground">Leads Covered</span>
                                        <span className="text-foreground">
                                            <strong>{ag.uniqueLeadsContacted}</strong> / {ag.totalAssignedLeads} leads ({ag.reachRate || 0}%)
                                        </span>
                                    </div>
                                    <div className="h-1.5 w-full bg-muted/60 rounded-full overflow-hidden">
                                        <div 
                                            className="h-full bg-emerald-500 rounded-full transition-all"
                                            style={{ width: `${Math.min(100, Math.max(3, ag.reachRate || 0))}%` }}
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Detailed Calling Logs Stream & Interactive Table */}
            <div className="p-5 rounded-3xl bg-card border border-border/50 shadow-xs space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-border/40">
                    <div>
                        <h4 className="font-bold text-sm text-foreground flex items-center gap-2">
                            <span>Comprehensive Call Activity & Duration Log</span>
                            <Badge variant="outline" className="text-[10px] font-bold">
                                {filteredLogs.length} Records
                            </Badge>
                        </h4>
                        <p className="text-[10px] text-muted-foreground">
                            Every call dialed by telecallers with duration, talk time, and customer feedback
                        </p>
                    </div>

                    {/* Filters Bar */}
                    <div className="flex flex-wrap items-center gap-2">
                        {/* Search Input */}
                        <div className="relative w-full sm:w-44">
                            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                            <Input
                                placeholder="Search lead or phone..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="h-8 pl-8 text-xs rounded-xl border-border/60"
                            />
                        </div>

                        {/* Agent Filter (Admins) */}
                        {!isPersonalView && agents && agents.length > 1 && (
                            <Select value={selectedAgent} onValueChange={setSelectedAgent}>
                                <SelectTrigger className="h-8 w-36 text-xs font-semibold rounded-xl border-border/60">
                                    <SelectValue placeholder="All Agents" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all" className="text-xs font-semibold">All Agents</SelectItem>
                                    {agents.map((ag) => (
                                        <SelectItem key={ag.userId || ag.name} value={ag.name} className="text-xs font-semibold">
                                            {ag.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}

                        {/* Outcome Filter */}
                        <Select value={outcomeFilter} onValueChange={setOutcomeFilter}>
                            <SelectTrigger className="h-8 w-32 text-xs font-semibold rounded-xl border-border/60">
                                <SelectValue placeholder="Outcome" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all" className="text-xs font-semibold">All Outcomes</SelectItem>
                                <SelectItem value="connected" className="text-xs font-semibold">Connected</SelectItem>
                                <SelectItem value="unanswered" className="text-xs font-semibold">Not Answered / Busy</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                        <thead>
                            <tr className="border-b border-border/40 text-[10px] uppercase font-bold text-muted-foreground">
                                <th className="py-2.5 px-3">Call Time</th>
                                {!isPersonalView && <th className="py-2.5 px-3">Sales Person</th>}
                                <th className="py-2.5 px-3">Lead Contact</th>
                                <th className="py-2.5 px-3">Duration / Talk Time</th>
                                <th className="py-2.5 px-3">Outcome</th>
                                <th className="py-2.5 px-3">Call Notes & Feedback</th>
                                <th className="py-2.5 px-3 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/30">
                            {filteredLogs.length > 0 ? (
                                filteredLogs.map((log) => (
                                    <tr key={log.id} className="hover:bg-muted/30 transition-colors">
                                        {/* Timestamp */}
                                        <td className="py-3 px-3 whitespace-nowrap">
                                            <div className="flex flex-col">
                                                <span className="font-semibold text-xs text-foreground">
                                                    {format(new Date(log.createdAt), 'hh:mm a')}
                                                </span>
                                                <span className="text-[10px] text-muted-foreground">
                                                    {format(new Date(log.createdAt), 'dd MMM yyyy')}
                                                </span>
                                            </div>
                                        </td>

                                        {/* Agent */}
                                        {!isPersonalView && (
                                            <td className="py-3 px-3 whitespace-nowrap">
                                                <div className="flex items-center gap-2">
                                                    <div className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-[10px]">
                                                        {log.agentName?.charAt(0)?.toUpperCase() || 'S'}
                                                    </div>
                                                    <span className="font-semibold text-xs text-foreground">
                                                        {log.agentName || 'Salesperson'}
                                                    </span>
                                                </div>
                                            </td>
                                        )}

                                        {/* Lead Contact */}
                                        <td className="py-3 px-3">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-xs text-foreground hover:text-primary cursor-pointer truncate" onClick={() => navigate('/leads')}>
                                                    {log.leadName}
                                                </span>
                                                <span className="text-[10px] text-muted-foreground">
                                                    {log.company || log.phone || 'Direct Lead'}
                                                </span>
                                            </div>
                                        </td>

                                        {/* Duration */}
                                        <td className="py-3 px-3 whitespace-nowrap">
                                            {getDurationBadge(log.durationSeconds, log.durationFormatted)}
                                        </td>

                                        {/* Outcome */}
                                        <td className="py-3 px-3 whitespace-nowrap">
                                            {getOutcomeBadge(log.outcome)}
                                        </td>

                                        {/* Notes */}
                                        <td className="py-3 px-3 max-w-xs">
                                            <p className="text-xs text-muted-foreground line-clamp-2" title={log.note}>
                                                {log.note || 'No notes added for this call.'}
                                            </p>
                                        </td>

                                        {/* Action */}
                                        <td className="py-3 px-3 text-right whitespace-nowrap">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => navigate('/leads')}
                                                className="h-7 px-2 text-[10px] font-bold text-primary hover:bg-primary/10 rounded-lg"
                                            >
                                                Open Lead <ExternalLink className="ml-1 h-3 w-3" />
                                            </Button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={isPersonalView ? 6 : 7} className="py-8 text-center text-xs text-muted-foreground italic">
                                        No call logs recorded for the selected filter or date range. Dial a lead from the Leads board to log your calls!
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
