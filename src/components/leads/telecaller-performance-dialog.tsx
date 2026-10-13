import React, { useState, useEffect } from 'react'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
    PhoneCall, 
    Users, 
    CalendarCheck, 
    Trophy, 
    TrendingUp, 
    AlertTriangle, 
    CheckCircle2, 
    UserCheck, 
    ArrowRightLeft, 
    Filter, 
    RefreshCw,
    Search,
    Clock,
    PhoneForwarded
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { format } from 'date-fns'
import api from '@/lib/api-client'
import { useToast } from '@/hooks/use-toast'

interface AgentPerformance {
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
    outcomes: Record<string, number>
    recentCalls: {
        leadId: string
        leadName: string
        company: string
        phone?: string
        outcome: string
        note?: string
        date: string
    }[]
}

interface AnalyticsData {
    summary: {
        totalCalls: number
        totalCallsToday: number
        totalUniqueContacted: number
        totalMeetings: number
        totalDealsWon: number
        totalRevenueWon: number
        totalOverdueFollowups: number
        activeAgents: number
        dateRange: string
    }
    agents: AgentPerformance[]
}

interface TelecallerPerformanceDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onFilterByAgent: (agentName: string) => void
    onRefreshBoard?: () => void
}

export function TelecallerPerformanceDialog({
    open,
    onOpenChange,
    onFilterByAgent,
    onRefreshBoard
}: TelecallerPerformanceDialogProps) {
    const { toast } = useToast()
    const [range, setRange] = useState<'today' | 'yesterday' | 'this_week' | 'this_month' | 'all'>('today')
    const [loading, setLoading] = useState<boolean>(false)
    const [data, setData] = useState<AnalyticsData | null>(null)
    const [searchAgent, setSearchAgent] = useState<string>('')
    
    // Reassign Modal State
    const [reassignModalOpen, setReassignModalOpen] = useState(false)
    const [sourceAgent, setSourceAgent] = useState<AgentPerformance | null>(null)
    const [targetAgentId, setTargetAgentId] = useState<string>('')
    const [reassignLoading, setReassignLoading] = useState(false)

    const fetchAnalytics = async () => {
        try {
            setLoading(true)
            const res = await api.get(`/leads/telecaller-analytics?range=${range}`)
            setData(res.data)
        } catch (error: any) {
            console.error('Failed to load performance analytics', error)
            toast({
                title: "Error",
                description: error.response?.data?.message || "Failed to load agent analytics",
                variant: "destructive"
            })
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (open) {
            fetchAnalytics()
        }
    }, [open, range])

    const handleReassignAll = async () => {
        if (!sourceAgent || !targetAgentId) return
        const targetAgent = data?.agents.find(a => a.userId === targetAgentId || a.name === targetAgentId)
        if (!targetAgent) return

        try {
            setReassignLoading(true)
            await api.post('/leads/bulk-reassign', {
                leadIds: sourceAgent.assignedLeadIds,
                newAgentId: targetAgent.userId,
                newAgentName: targetAgent.name
            })
            toast({
                title: "Leads Reassigned",
                description: `Successfully reassigned ${sourceAgent.assignedLeadIds.length} leads from ${sourceAgent.name} to ${targetAgent.name}.`
            })
            setReassignModalOpen(false)
            fetchAnalytics()
            if (onRefreshBoard) onRefreshBoard()
        } catch (err: any) {
            toast({
                title: "Reassign Failed",
                description: err.response?.data?.message || "Could not reassign leads",
                variant: "destructive"
            })
        } finally {
            setReassignLoading(false)
        }
    }

    const filteredAgents = (data?.agents || []).filter(a => 
        a.name.toLowerCase().includes(searchAgent.toLowerCase()) ||
        a.email.toLowerCase().includes(searchAgent.toLowerCase())
    )

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto rounded-2xl p-6 custom-scrollbar">
                <DialogHeader className="pb-3 border-b border-border/40">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div>
                            <DialogTitle className="text-xl font-bold flex items-center gap-2">
                                <TrendingUp className="h-5 w-5 text-primary" />
                                Telecaller & Agent Performance Dashboard
                            </DialogTitle>
                            <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                                Real-time tracking of calls made, unique leads contacted, meetings booked, and deal closures per agent.
                            </DialogDescription>
                        </div>

                        {/* Date Range Selector */}
                        <div className="flex items-center gap-1.5 bg-muted/40 p-1 rounded-xl border border-border/40 shrink-0">
                            {[
                                { key: 'today', label: 'Today' },
                                { key: 'yesterday', label: 'Yesterday' },
                                { key: 'this_week', label: 'This Week' },
                                { key: 'this_month', label: 'This Month' },
                                { key: 'all', label: 'All Time' }
                            ].map((tab) => (
                                <Button
                                    key={tab.key}
                                    variant={range === tab.key ? 'secondary' : 'ghost'}
                                    size="sm"
                                    onClick={() => setRange(tab.key as any)}
                                    className={`h-7 px-2.5 rounded-lg text-xs font-bold ${range === tab.key ? 'bg-background shadow-xs text-primary' : 'text-muted-foreground'}`}
                                >
                                    {tab.label}
                                </Button>
                            ))}

                            <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={fetchAnalytics}
                                className="h-7 w-7 rounded-lg text-muted-foreground hover:bg-muted"
                                title="Refresh Analytics"
                            >
                                <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
                            </Button>
                        </div>
                    </div>
                </DialogHeader>

                {/* KPI Metrics Bento Bar */}
                {data?.summary && (
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 py-2">
                        {/* Calls in Range */}
                        <div className="p-3 bg-muted/30 border border-border/40 rounded-xl space-y-1">
                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                                <PhoneCall className="h-3 w-3 text-blue-500" />
                                Calls Made
                            </span>
                            <div className="text-xl font-extrabold text-foreground">{data.summary.totalCalls}</div>
                            <span className="text-[10px] text-muted-foreground">Today: <strong className="text-foreground">{data.summary.totalCallsToday}</strong></span>
                        </div>

                        {/* Unique Leads Spoken */}
                        <div className="p-3 bg-muted/30 border border-border/40 rounded-xl space-y-1">
                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                                <Users className="h-3 w-3 text-indigo-500" />
                                Spoke To
                            </span>
                            <div className="text-xl font-extrabold text-foreground">{data.summary.totalUniqueContacted}</div>
                            <span className="text-[10px] text-muted-foreground">Unique Leads</span>
                        </div>

                        {/* Meetings Arranged */}
                        <div className="p-3 bg-muted/30 border border-border/40 rounded-xl space-y-1">
                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                                <CalendarCheck className="h-3 w-3 text-amber-500" />
                                Meetings Booked
                            </span>
                            <div className="text-xl font-extrabold text-amber-600 dark:text-amber-400">{data.summary.totalMeetings}</div>
                            <span className="text-[10px] text-muted-foreground">Demos / Meetings</span>
                        </div>

                        {/* Deals / Projects Won */}
                        <div className="p-3 bg-muted/30 border border-border/40 rounded-xl space-y-1">
                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                                <Trophy className="h-3 w-3 text-emerald-500" />
                                Deals Won
                            </span>
                            <div className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400">{data.summary.totalDealsWon}</div>
                            <span className="text-[10px] text-muted-foreground">Confirmed Projects</span>
                        </div>

                        {/* Revenue Won */}
                        <div className="p-3 bg-muted/30 border border-border/40 rounded-xl space-y-1">
                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                                <TrendingUp className="h-3 w-3 text-emerald-500" />
                                Revenue Closed
                            </span>
                            <div className="text-base font-extrabold text-foreground truncate" title={formatCurrency(data.summary.totalRevenueWon)}>
                                {formatCurrency(data.summary.totalRevenueWon)}
                            </div>
                            <span className="text-[10px] text-muted-foreground">Closed Pipeline</span>
                        </div>

                        {/* Follow-up Discipline */}
                        <div className="p-3 bg-muted/30 border border-border/40 rounded-xl space-y-1">
                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                                <AlertTriangle className="h-3 w-3 text-red-500" />
                                Overdue Follow-ups
                            </span>
                            <div className="text-xl font-extrabold text-red-600 dark:text-red-400">{data.summary.totalOverdueFollowups}</div>
                            <span className="text-[10px] text-muted-foreground">Needs Attention</span>
                        </div>
                    </div>
                )}

                {/* Search Agent Bar */}
                <div className="flex items-center justify-between gap-3 pt-2">
                    <div className="relative flex-1 max-w-xs">
                        <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                        <Input
                            placeholder="Search agent name or email..."
                            value={searchAgent}
                            onChange={(e) => setSearchAgent(e.target.value)}
                            className="h-8 pl-8 text-xs rounded-xl border-border/60"
                        />
                    </div>
                    <span className="text-xs text-muted-foreground font-medium">
                        Showing {filteredAgents.length} Agents / Telecallers
                    </span>
                </div>

                {/* Agents Performance Cards & Grid */}
                <div className="space-y-3 pt-1">
                    {filteredAgents.map((agent) => (
                        <div 
                            key={agent.userId || agent.name}
                            className="p-4 rounded-xl border border-border/60 bg-card hover:border-primary/40 transition-all space-y-3 shadow-xs"
                        >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-border/30">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                                        {agent.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-sm text-foreground">{agent.name}</span>
                                            <Badge variant="outline" className="text-[10px] uppercase font-bold py-0">
                                                {agent.role}
                                            </Badge>
                                        </div>
                                        <span className="text-[11px] text-muted-foreground">{agent.email || 'Telecaller'}</span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    {/* Action: Filter Leads on Kanban */}
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                            onFilterByAgent(agent.name)
                                            onOpenChange(false)
                                        }}
                                        className="h-7 px-2.5 text-xs font-bold rounded-lg border-border/60"
                                    >
                                        <Filter className="mr-1 h-3 w-3 text-primary" />
                                        View Leads ({agent.totalAssignedLeads})
                                    </Button>

                                    {/* Action: Reassign Agent's Leads */}
                                    <Button
                                        variant="secondary"
                                        size="sm"
                                        onClick={() => {
                                            setSourceAgent(agent)
                                            setReassignModalOpen(true)
                                        }}
                                        className="h-7 px-2.5 text-xs font-bold rounded-lg"
                                        disabled={agent.totalAssignedLeads === 0}
                                    >
                                        <ArrowRightLeft className="mr-1 h-3 w-3" />
                                        Reassign Leads
                                    </Button>
                                </div>
                            </div>

                            {/* Performance Metrics Row */}
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5 text-center">
                                <div className="bg-muted/30 p-2 rounded-lg border border-border/30">
                                    <span className="text-[9.5px] uppercase font-bold text-muted-foreground">Assigned Leads</span>
                                    <div className="text-base font-extrabold text-foreground">{agent.totalAssignedLeads}</div>
                                </div>

                                <div className="bg-blue-500/10 p-2 rounded-lg border border-blue-500/20">
                                    <span className="text-[9.5px] uppercase font-bold text-blue-700 dark:text-blue-300">Calls in Period</span>
                                    <div className="text-base font-extrabold text-blue-700 dark:text-blue-300">{agent.callsInRange}</div>
                                    <span className="text-[9px] text-muted-foreground font-medium">Today: {agent.callsToday}</span>
                                </div>

                                <div className="bg-indigo-500/10 p-2 rounded-lg border border-indigo-500/20">
                                    <span className="text-[9.5px] uppercase font-bold text-indigo-700 dark:text-indigo-300">Leads Contacted</span>
                                    <div className="text-base font-extrabold text-indigo-700 dark:text-indigo-300">{agent.uniqueLeadsContacted}</div>
                                </div>

                                <div className="bg-amber-500/10 p-2 rounded-lg border border-amber-500/20">
                                    <span className="text-[9.5px] uppercase font-bold text-amber-700 dark:text-amber-300">Meetings Arranged</span>
                                    <div className="text-base font-extrabold text-amber-700 dark:text-amber-300">{agent.meetingsArranged}</div>
                                </div>

                                <div className="bg-emerald-500/10 p-2 rounded-lg border border-emerald-500/20">
                                    <span className="text-[9.5px] uppercase font-bold text-emerald-700 dark:text-emerald-300">Deals Won</span>
                                    <div className="text-base font-extrabold text-emerald-700 dark:text-emerald-300">{agent.dealsWon}</div>
                                    <span className="text-[9px] text-emerald-600 font-bold truncate block">
                                        {formatCurrency(agent.dealsWonValue)}
                                    </span>
                                </div>

                                <div className={`p-2 rounded-lg border ${agent.overdueFollowups > 0 ? 'bg-red-500/10 border-red-500/20' : 'bg-muted/30 border-border/30'}`}>
                                    <span className="text-[9.5px] uppercase font-bold text-muted-foreground">Overdue Follow-ups</span>
                                    <div className={`text-base font-extrabold ${agent.overdueFollowups > 0 ? 'text-red-600' : 'text-foreground'}`}>
                                        {agent.overdueFollowups}
                                    </div>
                                    <span className="text-[9px] text-muted-foreground font-medium">Discipline Score: {agent.accuracyScore}%</span>
                                </div>
                            </div>

                            {/* Call Outcomes Pills */}
                            {Object.keys(agent.outcomes).length > 0 && (
                                <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[10px]">
                                    <span className="text-muted-foreground font-bold">Call Outcomes:</span>
                                    {Object.entries(agent.outcomes).map(([outcome, count]) => (
                                        <span 
                                            key={outcome} 
                                            className="px-2 py-0.5 rounded-md bg-muted/60 border border-border/40 font-semibold text-foreground"
                                        >
                                            {outcome}: <strong className="text-primary">{count}</strong>
                                        </span>
                                    ))}
                                </div>
                            )}

                            {/* Recent Calls Mini Table */}
                            {agent.recentCalls.length > 0 && (
                                <div className="pt-1 border-t border-border/20">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                                        Recent Calls by {agent.name}:
                                    </span>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[10.5px]">
                                        {agent.recentCalls.slice(0, 4).map((c, idx) => (
                                            <div key={idx} className="p-1.5 rounded-lg bg-muted/20 border border-border/30 flex items-center justify-between gap-1">
                                                <div className="truncate min-w-0">
                                                    <span className="font-bold text-foreground truncate block">{c.leadName} ({c.company})</span>
                                                    <span className="text-[9.5px] text-muted-foreground truncate block italic">"{c.note || c.outcome}"</span>
                                                </div>
                                                <Badge variant="outline" className="text-[9px] py-0 shrink-0 font-bold">
                                                    {c.outcome}
                                                </Badge>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}

                    {filteredAgents.length === 0 && !loading && (
                        <div className="py-12 text-center text-muted-foreground text-sm border-2 border-dashed border-border/40 rounded-xl">
                            No agent activity found for this time range.
                        </div>
                    )}
                </div>
            </DialogContent>

            {/* Reassign Dialog */}
            <Dialog open={reassignModalOpen} onOpenChange={setReassignModalOpen}>
                <DialogContent className="max-w-md rounded-2xl">
                    <DialogHeader>
                        <DialogTitle className="font-bold text-lg flex items-center gap-2">
                            <ArrowRightLeft className="h-4 w-4 text-primary" />
                            Reassign Leads
                        </DialogTitle>
                        <DialogDescription className="text-xs text-muted-foreground">
                            Move all leads from <strong>{sourceAgent?.name}</strong> to another agent.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-3">
                        <div className="p-3 rounded-xl bg-muted/30 border border-border/40 text-xs space-y-1">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Source Agent:</span>
                                <span className="font-bold text-foreground">{sourceAgent?.name}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Total Leads to Move:</span>
                                <span className="font-bold text-primary">{sourceAgent?.totalAssignedLeads} leads</span>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-xs font-bold text-foreground">Select New Assigned Agent</Label>
                            <Select value={targetAgentId} onValueChange={setTargetAgentId}>
                                <SelectTrigger className="h-9 rounded-xl border-border/60 text-xs">
                                    <SelectValue placeholder="Choose target agent..." />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl text-xs">
                                    {(data?.agents || [])
                                        .filter(a => a.name !== sourceAgent?.name)
                                        .map(a => (
                                            <SelectItem key={a.userId || a.name} value={a.userId || a.name}>
                                                {a.name} ({a.totalAssignedLeads} current leads)
                                            </SelectItem>
                                        ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                        <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => setReassignModalOpen(false)}
                            className="rounded-xl text-xs"
                        >
                            Cancel
                        </Button>
                        <Button
                            size="sm"
                            onClick={handleReassignAll}
                            disabled={!targetAgentId || reassignLoading}
                            className="rounded-xl text-xs font-bold bg-primary text-primary-foreground"
                        >
                            {reassignLoading ? 'Reassigning...' : 'Confirm Reassignment'}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </Dialog>
    )
}
