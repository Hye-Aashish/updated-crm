import React, { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
    Calendar as CalendarIcon, 
    PhoneCall, 
    PhoneOff, 
    Clock, 
    UserCheck, 
    Search, 
    ChevronLeft, 
    ChevronRight, 
    RotateCcw, 
    ArrowUpRight, 
    CheckCircle2, 
    AlertCircle, 
    CalendarClock, 
    User,
    Sparkles,
    FileText,
    TrendingUp
} from 'lucide-react'
import { format, addDays, subDays, parseISO } from 'date-fns'
import api from '@/lib/api-client'
import { useNavigate } from 'react-router-dom'

export interface DayAgentCallingSectionProps {
    isPersonalView?: boolean
    selectedAgentId?: string
    onViewLeadsBoard?: () => void
}

export function DayAgentCallingSection({
    isPersonalView = false,
    selectedAgentId = 'all',
    onViewLeadsBoard
}: DayAgentCallingSectionProps) {
    const navigate = useNavigate()
    const [selectedDate, setSelectedDate] = useState<string>(
        new Date().toISOString().split('T')[0]
    )
    const [loading, setLoading] = useState<boolean>(true)
    const [data, setData] = useState<any>(null)
    const [searchQuery, setSearchQuery] = useState<string>('')
    const [agentFilter, setAgentFilter] = useState<string>(selectedAgentId || 'all')

    // Drilldown Dialog state
    const [activeAgentDetails, setActiveAgentDetails] = useState<any>(null)
    const [isDetailsOpen, setIsDetailsOpen] = useState<boolean>(false)
    const [detailTab, setDetailTab] = useState<'new' | 'followup' | 'pending' | 'scheduled'>('new')

    // Sync agent filter from parent if provided
    useEffect(() => {
        if (selectedAgentId) {
            setAgentFilter(selectedAgentId)
        }
    }, [selectedAgentId])

    const fetchDayReport = async (dateToFetch: string) => {
        try {
            setLoading(true)
            const params = new URLSearchParams()
            params.append('date', dateToFetch)
            if (agentFilter && agentFilter !== 'all') {
                params.append('agentId', agentFilter)
            }

            const res = await api.get(`/leads/day-agent-calling?${params.toString()}`)
            setData(res.data)
        } catch (err) {
            console.error('Failed to fetch day agent calling report:', err)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchDayReport(selectedDate)
    }, [selectedDate, agentFilter])

    const handlePrevDay = () => {
        try {
            const current = parseISO(selectedDate)
            const prev = subDays(current, 1)
            setSelectedDate(format(prev, 'yyyy-MM-dd'))
        } catch (e) {
            setSelectedDate(new Date().toISOString().split('T')[0])
        }
    }

    const handleNextDay = () => {
        try {
            const current = parseISO(selectedDate)
            const next = addDays(current, 1)
            setSelectedDate(format(next, 'yyyy-MM-dd'))
        } catch (e) {
            setSelectedDate(new Date().toISOString().split('T')[0])
        }
    }

    const handlePreset = (preset: 'today' | 'yesterday') => {
        if (preset === 'today') {
            setSelectedDate(new Date().toISOString().split('T')[0])
        } else {
            const yest = subDays(new Date(), 1)
            setSelectedDate(format(yest, 'yyyy-MM-dd'))
        }
    }

    const summary = data?.summary || {
        totalCallsDone: 0,
        newCallsCount: 0,
        followupCallsCount: 0,
        callsNotDoneCount: 0,
        followupsTakenCount: 0,
        activeAgentsCount: 0,
        totalAgentsCount: 0
    }

    const allAgentsList = data?.allAgents || []
    const agents = (data?.agents || []).filter((a: any) => {
        const matchesSearch = 
            !searchQuery ||
            a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            a.email?.toLowerCase().includes(searchQuery.toLowerCase())
        return matchesSearch
    })

    const openAgentModal = (agent: any, defaultTab: 'new' | 'followup' | 'pending' | 'scheduled' = 'new') => {
        setActiveAgentDetails(agent)
        setDetailTab(defaultTab)
        setIsDetailsOpen(true)
    }

    let formattedDateLabel = selectedDate
    try {
        formattedDateLabel = format(parseISO(selectedDate), 'EEEE, dd MMMM yyyy')
    } catch (e) {}

    const isTodaySelected = selectedDate === new Date().toISOString().split('T')[0]

    return (
        <Card className="p-5 sm:p-6 rounded-3xl border border-border/50 bg-card shadow-xs space-y-6">
            {/* Header & Day Selector Bar */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-border/40">
                <div className="flex items-center gap-3.5">
                    <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-primary/20 via-indigo-500/20 to-sky-500/20 border border-primary/30 flex items-center justify-center text-primary shadow-xs shrink-0">
                        <CalendarClock className="h-6 w-6 text-primary animate-pulse" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-extrabold text-lg text-foreground tracking-tight">
                                Day-Wise Calling & Follow-up Agenda
                            </h3>
                            <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px] font-bold">
                                {formattedDateLabel}
                            </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Day-by-day agent monitoring: Track fresh 1st calls dialed, subsequent follow-ups, and pending missed calls.
                        </p>
                    </div>
                </div>

                {/* Date Controls & Agent Filter */}
                <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto">
                    {/* Quick Preset Pills */}
                    <div className="flex items-center bg-muted/40 p-1 rounded-xl border border-border/40 text-xs font-semibold">
                        <button
                            type="button"
                            onClick={() => handlePreset('today')}
                            className={`px-3 py-1 rounded-lg transition-all ${
                                isTodaySelected 
                                    ? 'bg-primary text-primary-foreground font-bold shadow-2xs' 
                                    : 'text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            Today
                        </button>
                        <button
                            type="button"
                            onClick={() => handlePreset('yesterday')}
                            className={`px-3 py-1 rounded-lg transition-all ${
                                !isTodaySelected && selectedDate === format(subDays(new Date(), 1), 'yyyy-MM-dd')
                                    ? 'bg-primary text-primary-foreground font-bold shadow-2xs' 
                                    : 'text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            Yesterday
                        </button>
                    </div>

                    {/* Stepper & Date Picker */}
                    <div className="flex items-center gap-1 bg-background border border-border/60 rounded-xl p-1 shadow-2xs">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={handlePrevDay}
                            className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground"
                            title="Previous Day"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="h-7 w-36 text-xs font-semibold border-0 bg-transparent px-1 focus-visible:ring-0"
                        />
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={handleNextDay}
                            className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground"
                            title="Next Day"
                        >
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>

                    {/* Agent Filter Dropdown (Always visible for Admin) */}
                    {!isPersonalView && (
                        <Select value={agentFilter} onValueChange={setAgentFilter}>
                            <SelectTrigger className="h-9 w-44 text-xs font-semibold rounded-xl bg-background border-border/60">
                                <SelectValue placeholder="All Agents" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all" className="text-xs font-semibold">All Sales Agents</SelectItem>
                                {allAgentsList.map((ag: any) => (
                                    <SelectItem key={ag.userId || ag.name} value={ag.userId || ag.name} className="text-xs font-semibold">
                                        {ag.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}

                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => fetchDayReport(selectedDate)}
                        className="h-9 w-9 rounded-xl border border-border/50 text-muted-foreground hover:text-foreground hover:bg-muted"
                        title="Reload Day Data"
                    >
                        <RotateCcw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    </Button>
                </div>
            </div>

            {/* 4 Summary Highlight Cards for the Day */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
                {/* 1. Total Calls Done */}
                <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-500/10 via-background to-background border border-indigo-500/20 shadow-2xs space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Total Calls Done</span>
                        <div className="h-7 w-7 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                            <PhoneCall className="h-3.5 w-3.5" />
                        </div>
                    </div>
                    <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400">
                        {summary.totalCallsDone}
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                        <Badge className="bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30 text-[9px] font-bold py-0">
                            Fresh: {summary.newCallsCount}
                        </Badge>
                        <Badge className="bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30 text-[9px] font-bold py-0">
                            Follow-up: {summary.followupCallsCount}
                        </Badge>
                    </div>
                </div>

                {/* 2. Calls Not Done (Pending / Missed) */}
                <div className="p-4 rounded-2xl bg-gradient-to-br from-rose-500/10 via-background to-background border border-rose-500/20 shadow-2xs space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Calls Not Done</span>
                        <div className="h-7 w-7 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                            <PhoneOff className="h-3.5 w-3.5" />
                        </div>
                    </div>
                    <div className="text-2xl font-black text-rose-600 dark:text-rose-400">
                        {summary.callsNotDoneCount}
                    </div>
                    <span className="text-[10px] text-muted-foreground block font-medium">
                        Uncalled fresh leads + missed due reminders
                    </span>
                </div>

                {/* 3. Follow-ups Taken / Scheduled */}
                <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-500/10 via-background to-background border border-amber-500/20 shadow-2xs space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Follow-ups Taken</span>
                        <div className="h-7 w-7 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                            <CalendarClock className="h-3.5 w-3.5" />
                        </div>
                    </div>
                    <div className="text-2xl font-black text-amber-600 dark:text-amber-400">
                        {summary.followupsTakenCount}
                    </div>
                    <span className="text-[10px] text-muted-foreground block font-medium">
                        Next follow-up dates committed by agents
                    </span>
                </div>

                {/* 4. Active Agents */}
                <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-500/10 via-background to-background border border-emerald-500/20 shadow-2xs space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Active Calling Agents</span>
                        <div className="h-7 w-7 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                            <UserCheck className="h-3.5 w-3.5" />
                        </div>
                    </div>
                    <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                        {summary.activeAgentsCount} <span className="text-xs font-semibold text-muted-foreground">/ {summary.totalAgentsCount} Team</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground block font-medium">
                        {summary.activeAgentsCount > 0 ? 'Actively dialing today' : 'No calls logged yet today'}
                    </span>
                </div>
            </div>

            {/* Agent Performance Table Section */}
            <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                            Agent Day Calling Breakdown
                        </span>
                        <Badge variant="outline" className="text-[10px] font-semibold">
                            {agents.length} Agents
                        </Badge>
                    </div>

                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                        <Input
                            placeholder="Search agent name..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="h-8 pl-8 text-xs rounded-xl border-border/60"
                        />
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto rounded-2xl border border-border/50">
                    <table className="w-full text-left border-collapse text-xs">
                        <thead>
                            <tr className="border-b border-border/40 bg-muted/30 text-[10px] uppercase font-bold text-muted-foreground">
                                <th className="py-3 px-3.5">Telecaller / Agent</th>
                                <th className="py-3 px-3 text-center">Assigned</th>
                                <th className="py-3 px-3 text-center">New Calls (Fresh)</th>
                                <th className="py-3 px-3 text-center">Follow-up Calls</th>
                                <th className="py-3 px-3 text-center">Total Calls Done</th>
                                <th className="py-3 px-3 text-center">Calls Not Done</th>
                                <th className="py-3 px-3 text-center">Follow-ups Taken</th>
                                <th className="py-3 px-3 text-center">Talk Time</th>
                                <th className="py-3 px-3.5 text-right">Details</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/20">
                            {agents.map((ag: any) => (
                                <tr key={ag.userId || ag.name} className="hover:bg-muted/30 transition-colors">
                                    {/* Agent */}
                                    <td className="py-3 px-3.5 font-semibold">
                                        <div className="flex items-center gap-2.5">
                                            <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0 border border-primary/20">
                                                {ag.name?.charAt(0)?.toUpperCase()}
                                            </div>
                                            <div className="truncate">
                                                <span className="font-bold text-foreground block truncate">{ag.name}</span>
                                                <span className="text-[10px] text-muted-foreground capitalize">{ag.role || 'Telecaller'}</span>
                                            </div>
                                        </div>
                                    </td>

                                    {/* Assigned */}
                                    <td className="py-3 px-3 text-center font-bold text-foreground">
                                        {ag.totalAssignedLeads}
                                    </td>

                                    {/* New Calls */}
                                    <td className="py-3 px-3 text-center">
                                        {ag.newCallsCount > 0 ? (
                                            <button
                                                type="button"
                                                onClick={() => openAgentModal(ag, 'new')}
                                                className="inline-flex items-center gap-1 font-extrabold text-sky-600 dark:text-sky-400 bg-sky-500/10 hover:bg-sky-500/20 px-2 py-0.5 rounded-lg transition-all"
                                                title="View New Fresh Calls"
                                            >
                                                {ag.newCallsCount}
                                            </button>
                                        ) : (
                                            <span className="text-muted-foreground text-[11px]">0</span>
                                        )}
                                    </td>

                                    {/* Follow-up Calls */}
                                    <td className="py-3 px-3 text-center">
                                        {ag.followupCallsCount > 0 ? (
                                            <button
                                                type="button"
                                                onClick={() => openAgentModal(ag, 'followup')}
                                                className="inline-flex items-center gap-1 font-extrabold text-purple-600 dark:text-purple-400 bg-purple-500/10 hover:bg-purple-500/20 px-2 py-0.5 rounded-lg transition-all"
                                                title="View Follow-up Calls"
                                            >
                                                {ag.followupCallsCount}
                                            </button>
                                        ) : (
                                            <span className="text-muted-foreground text-[11px]">0</span>
                                        )}
                                    </td>

                                    {/* Total Calls Done */}
                                    <td className="py-3 px-3 text-center">
                                        <span className="font-black text-xs text-indigo-600 dark:text-indigo-400 bg-indigo-500/15 px-2.5 py-1 rounded-xl">
                                            {ag.totalCallsDone}
                                        </span>
                                    </td>

                                    {/* Calls Not Done (Pending) */}
                                    <td className="py-3 px-3 text-center">
                                        {ag.callsNotDoneCount > 0 ? (
                                            <button
                                                type="button"
                                                onClick={() => openAgentModal(ag, 'pending')}
                                                className="inline-flex items-center gap-1 font-extrabold text-rose-600 dark:text-rose-400 bg-rose-500/15 hover:bg-rose-500/25 px-2 py-0.5 rounded-lg transition-all"
                                                title="Click to view uncalled/missed leads"
                                            >
                                                <AlertCircle className="h-3 w-3" />
                                                {ag.callsNotDoneCount} Missed
                                            </button>
                                        ) : (
                                            <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-[9px] font-bold py-0.5">
                                                All Done ✓
                                            </Badge>
                                        )}
                                    </td>

                                    {/* Follow-ups Taken */}
                                    <td className="py-3 px-3 text-center">
                                        {ag.followupsTakenCount > 0 ? (
                                            <button
                                                type="button"
                                                onClick={() => openAgentModal(ag, 'scheduled')}
                                                className="inline-flex items-center gap-1 font-extrabold text-amber-600 dark:text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 px-2 py-0.5 rounded-lg transition-all"
                                            >
                                                {ag.followupsTakenCount}
                                            </button>
                                        ) : (
                                            <span className="text-muted-foreground text-[11px]">0</span>
                                        )}
                                    </td>

                                    {/* Talk Time */}
                                    <td className="py-3 px-3 text-center font-medium text-muted-foreground text-[11px]">
                                        {ag.durationFormatted || '0s'}
                                    </td>

                                    {/* Details Button */}
                                    <td className="py-3 px-3.5 text-right">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => openAgentModal(ag, 'new')}
                                            className="h-7 px-2.5 text-[10px] font-bold rounded-lg border-border/60 hover:bg-primary hover:text-white"
                                        >
                                            View Day Leads
                                        </Button>
                                    </td>
                                </tr>
                            ))}

                            {agents.length === 0 && (
                                <tr>
                                    <td colSpan={9} className="py-8 text-center text-muted-foreground text-xs italic">
                                        {loading ? 'Loading day calling data...' : 'No agent records found for this date.'}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Drilldown Dialog for Selected Agent's Day Calling */}
            <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
                <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-6 rounded-3xl">
                    <DialogHeader className="pb-3 border-b border-border/40">
                        <div className="flex items-center justify-between pr-4">
                            <div>
                                <DialogTitle className="text-lg font-extrabold text-foreground flex items-center gap-2">
                                    <User className="h-5 w-5 text-primary" />
                                    {activeAgentDetails?.name} — Day Calling Record
                                </DialogTitle>
                                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                                    Detailed breakdown for {formattedDateLabel} ({activeAgentDetails?.totalCallsDone || 0} total calls, {activeAgentDetails?.callsNotDoneCount || 0} pending)
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>

                    {/* Tabs */}
                    <Tabs value={detailTab} onValueChange={(v: any) => setDetailTab(v)} className="flex-1 flex flex-col min-h-0">
                        <TabsList className="grid grid-cols-4 rounded-xl p-1 bg-muted/50 mb-3 shrink-0">
                            <TabsTrigger value="new" className="text-xs font-bold rounded-lg">
                                Fresh ({activeAgentDetails?.newCallsList?.length || 0})
                            </TabsTrigger>
                            <TabsTrigger value="followup" className="text-xs font-bold rounded-lg">
                                Follow-up ({activeAgentDetails?.followupCallsList?.length || 0})
                            </TabsTrigger>
                            <TabsTrigger value="pending" className="text-xs font-bold rounded-lg text-rose-600 data-[state=active]:text-rose-600">
                                Pending ({activeAgentDetails?.pendingCallsList?.length || 0})
                            </TabsTrigger>
                            <TabsTrigger value="scheduled" className="text-xs font-bold rounded-lg">
                                Scheduled ({activeAgentDetails?.scheduledFollowupsList?.length || 0})
                            </TabsTrigger>
                        </TabsList>

                        <div className="flex-1 overflow-y-auto custom-scrollbar pr-1">
                            {/* Tab 1: New / Fresh Calls */}
                            <TabsContent value="new" className="space-y-2 mt-0">
                                {activeAgentDetails?.newCallsList && activeAgentDetails.newCallsList.length > 0 ? (
                                    activeAgentDetails.newCallsList.map((lead: any, idx: number) => (
                                        <div key={lead.id || idx} className="p-3 rounded-2xl bg-muted/20 border border-border/40 space-y-1.5">
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="font-bold text-xs text-foreground">
                                                    {lead.name} {lead.company ? `(${lead.company})` : ''}
                                                </span>
                                                <Badge className="bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30 text-[9px] font-bold">
                                                    Fresh Lead Contacted
                                                </Badge>
                                            </div>
                                            <div className="text-[11px] text-muted-foreground flex items-center gap-3">
                                                <span>📞 {lead.phone || 'No phone'}</span>
                                                <span>Stage: <strong className="text-foreground capitalize">{lead.stage}</strong></span>
                                                {lead.outcome && <span>Outcome: <strong className="text-foreground">{lead.outcome}</strong></span>}
                                            </div>
                                            {lead.note && (
                                                <p className="text-xs bg-card p-2 rounded-xl border border-border/30 text-foreground font-medium">
                                                    💬 {lead.note}
                                                </p>
                                            )}
                                        </div>
                                    ))
                                ) : (
                                    <div className="p-8 rounded-2xl bg-muted/10 border border-dashed border-border/40 text-center text-xs text-muted-foreground">
                                        No fresh/new calls logged on this date.
                                    </div>
                                )}
                            </TabsContent>

                            {/* Tab 2: Follow-up Calls */}
                            <TabsContent value="followup" className="space-y-2 mt-0">
                                {activeAgentDetails?.followupCallsList && activeAgentDetails.followupCallsList.length > 0 ? (
                                    activeAgentDetails.followupCallsList.map((lead: any, idx: number) => (
                                        <div key={lead.id || idx} className="p-3 rounded-2xl bg-muted/20 border border-border/40 space-y-2">
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="font-bold text-xs text-foreground">
                                                    {lead.name} {lead.company ? `(${lead.company})` : ''}
                                                </span>
                                                <Badge className="bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30 text-[9px] font-bold">
                                                    Follow-up Done
                                                </Badge>
                                            </div>
                                            <div className="text-[11px] text-muted-foreground flex items-center gap-3">
                                                <span>📞 {lead.phone || 'No phone'}</span>
                                                <span>Stage: <strong className="text-foreground capitalize">{lead.stage}</strong></span>
                                            </div>
                                            <div className="space-y-1 text-xs">
                                                {lead.previousNote && (
                                                    <div className="bg-muted/40 p-2 rounded-xl text-muted-foreground text-[11px]">
                                                        <span className="font-bold block text-foreground mb-0.5">Previous Conversation:</span>
                                                        {lead.previousNote}
                                                    </div>
                                                )}
                                                {lead.currentNote && (
                                                    <div className="bg-card p-2 rounded-xl border border-border/40 text-foreground font-medium">
                                                        <span className="font-bold block text-primary mb-0.5">Today's Update:</span>
                                                        {lead.currentNote}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="p-8 rounded-2xl bg-muted/10 border border-dashed border-border/40 text-center text-xs text-muted-foreground">
                                        No follow-up calls logged on this date.
                                    </div>
                                )}
                            </TabsContent>

                            {/* Tab 3: Pending / Calls Not Done */}
                            <TabsContent value="pending" className="space-y-2 mt-0">
                                {activeAgentDetails?.pendingCallsList && activeAgentDetails.pendingCallsList.length > 0 ? (
                                    activeAgentDetails.pendingCallsList.map((lead: any, idx: number) => (
                                        <div key={lead.id || idx} className="p-3 rounded-2xl bg-rose-500/[0.04] border border-rose-500/20 space-y-1.5">
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="font-bold text-xs text-foreground">
                                                    {lead.name} {lead.company ? `(${lead.company})` : ''}
                                                </span>
                                                <Badge className="bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30 text-[9px] font-bold">
                                                    Not Called
                                                </Badge>
                                            </div>
                                            <div className="text-[11px] text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-1.5">
                                                <AlertCircle className="h-3 w-3 shrink-0" />
                                                <span>{lead.reason}</span>
                                            </div>
                                            <div className="flex items-center justify-between pt-1">
                                                <span className="text-[10px] text-muted-foreground">
                                                    Phone: {lead.phone || 'No phone'} • Stage: {lead.stage || 'new'}
                                                </span>
                                                <Button
                                                    size="sm"
                                                    onClick={() => {
                                                        setIsDetailsOpen(false)
                                                        navigate('/leads')
                                                    }}
                                                    className="h-6 px-2 text-[10px] font-bold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90"
                                                >
                                                    Open In Leads Board <ArrowUpRight className="ml-1 h-2.5 w-2.5" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="p-8 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 text-center text-xs text-emerald-600 dark:text-emerald-400 font-semibold space-y-1">
                                        <CheckCircle2 className="h-6 w-6 mx-auto text-emerald-500 mb-1" />
                                        <p>Great job! No missed or pending calls for this agent on this date.</p>
                                    </div>
                                )}
                            </TabsContent>

                            {/* Tab 4: Scheduled Next Follow-ups */}
                            <TabsContent value="scheduled" className="space-y-2 mt-0">
                                {activeAgentDetails?.scheduledFollowupsList && activeAgentDetails.scheduledFollowupsList.length > 0 ? (
                                    activeAgentDetails.scheduledFollowupsList.map((lead: any, idx: number) => (
                                        <div key={lead.id || idx} className="p-3 rounded-2xl bg-amber-500/[0.04] border border-amber-500/20 space-y-1.5">
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="font-bold text-xs text-foreground">
                                                    {lead.name} {lead.company ? `(${lead.company})` : ''}
                                                </span>
                                                <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 text-[9px] font-bold">
                                                    Scheduled
                                                </Badge>
                                            </div>
                                            <div className="text-[11px] text-amber-700 dark:text-amber-300 font-semibold">
                                                📅 Scheduled for: {lead.scheduledFor ? format(new Date(lead.scheduledFor), 'dd MMM yyyy, hh:mm a') : 'Later'}
                                            </div>
                                            {lead.note && (
                                                <p className="text-xs bg-card p-2 rounded-xl border border-border/30 text-foreground">
                                                    💬 {lead.note}
                                                </p>
                                            )}
                                        </div>
                                    ))
                                ) : (
                                    <div className="p-8 rounded-2xl bg-muted/10 border border-dashed border-border/40 text-center text-xs text-muted-foreground">
                                        No new follow-ups scheduled on this date.
                                    </div>
                                )}
                            </TabsContent>
                        </div>
                    </Tabs>
                </DialogContent>
            </Dialog>
        </Card>
    )
}
