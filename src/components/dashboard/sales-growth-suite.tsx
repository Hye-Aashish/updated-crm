import React, { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
    Trophy, 
    TrendingUp, 
    AlertTriangle, 
    Sparkles, 
    Flame, 
    Clock, 
    ArrowUpRight, 
    UserCheck, 
    CheckCircle2, 
    Compass, 
    DollarSign, 
    HelpCircle,
    UserPlus,
    Filter,
    PhoneCall,
    Target,
    MessageSquare,
    ExternalLink,
    FileText,
    Folder
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { useNavigate } from 'react-router-dom'
import api from '@/lib/api-client'
import { useToast } from '@/hooks/use-toast'

interface SalesGrowthSuiteProps {
    agents: any[]
    sourceAnalytics?: Array<{
        source: string
        totalLeads: number
        dealsWon: number
        revenueWon: number
        conversionRate: number
    }>
    formAnalytics?: Array<{
        formTitle: string
        formId?: string
        totalLeads: number
        dealsWon: number
        revenueWon: number
        conversionRate: number
        leads: Array<{
            id: string
            name: string
            company: string
            phone?: string
            stage: string
            value: number
            assignedToName: string
            createdAt: string
        }>
    }>
    leakageRadar?: {
        staleLeads: Array<{
            id: string
            name: string
            company: string
            phone?: string
            stage: string
            value: number
            formTitle?: string
            assignedToName: string
            daysIdle: number
        }>
        unassignedLeads: Array<{
            id: string
            name: string
            company: string
            phone?: string
            stage: string
            value: number
            source: string
            formTitle?: string
            createdAt: string
        }>
    }
    hotOpportunities?: Array<{
        id: string
        name: string
        company: string
        phone?: string
        stage: string
        value: number
        aiPriority: string
        rating: number
        formTitle?: string
        assignedToName: string
    }>
    smartInsights?: string[]
    onRefresh?: () => void
    isPersonalView?: boolean
}

export function SalesGrowthSuite({
    agents = [],
    sourceAnalytics = [],
    formAnalytics = [],
    leakageRadar,
    hotOpportunities = [],
    smartInsights = [],
    onRefresh,
    isPersonalView = false
}: SalesGrowthSuiteProps) {
    const navigate = useNavigate()
    const { toast } = useToast()
    const [activeTab, setActiveTab] = useState<'leaderboard' | 'forms' | 'leakage' | 'sources' | 'hot'>('leaderboard')
    const [selectedFormFilter, setSelectedFormFilter] = useState<string>('all')
    const [assignModalOpen, setAssignModalOpen] = useState(false)
    const [leadToAssign, setLeadToAssign] = useState<any>(null)
    const [selectedAgentId, setSelectedAgentId] = useState<string>('')
    const [assignLoading, setAssignLoading] = useState(false)

    const handleAssignLead = async () => {
        if (!leadToAssign || !selectedAgentId) return
        const targetAgent = agents.find(a => a.userId === selectedAgentId || a.name === selectedAgentId)
        if (!targetAgent) return

        try {
            setAssignLoading(true)
            await api.post('/leads/bulk-reassign', {
                leadIds: [leadToAssign.id],
                newAgentId: targetAgent.userId,
                newAgentName: targetAgent.name
            })
            toast({
                title: "Lead Assigned Successfully",
                description: `Lead "${leadToAssign.name}" is now assigned to ${targetAgent.name}.`
            })
            setAssignModalOpen(false)
            setLeadToAssign(null)
            if (onRefresh) onRefresh()
        } catch (err: any) {
            toast({
                title: "Failed to Assign Lead",
                description: err.response?.data?.message || "Error assigning lead",
                variant: "destructive"
            })
        } finally {
            setAssignLoading(false)
        }
    }

    const openWhatsApp = (phone?: string) => {
        if (!phone) return
        const clean = phone.replace(/[^0-9]/g, '')
        window.open(`https://wa.me/${clean}`, '_blank')
    }

    const totalTodayCalls = agents.reduce((sum, a) => sum + (a.callsToday || 0), 0)
    const dailyTargetCalls = Math.max(50, agents.length * 30)
    const dailyProgressPct = Math.min(100, Math.round((totalTodayCalls / dailyTargetCalls) * 100))

    const getTierBadge = (tier: string, score: number) => {
        if (score >= 80 || tier === 'Star Closer') {
            return (
                <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 text-[10px] font-bold">
                    🥇 Star Closer
                </Badge>
            )
        }
        if (score >= 60 || tier === 'Strong Performer') {
            return (
                <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-[10px] font-bold">
                    ⚡ Strong Performer
                </Badge>
            )
        }
        return (
            <Badge className="bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30 text-[10px] font-bold">
                ⚠️ Needs Coaching
            </Badge>
        )
    }

    const staleCount = leakageRadar?.staleLeads?.length || 0
    const unassignedCount = leakageRadar?.unassignedLeads?.length || 0

    return (
        <div className="space-y-5 bg-card border border-border/50 rounded-3xl p-5 sm:p-6 shadow-xs">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/30">
                <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-xl bg-gradient-to-tr from-amber-500/20 to-primary/20 text-primary flex items-center justify-center font-bold">
                            <Sparkles className="h-4 w-4 text-amber-500" />
                        </div>
                        <h3 className="text-lg font-bold text-foreground">
                            {isPersonalView ? 'My Performance & Growth Suite' : 'Sales Optimization & Performance Engine'}
                        </h3>
                        <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-[10px] font-bold">
                            {isPersonalView ? 'Personal Goals' : 'Revenue Boosters'}
                        </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                        {isPersonalView 
                            ? 'Apna personal calling target, idle leads jinhe call karna hai, aur hot high-value deals track karo'
                            : 'Kaunsa agent best perform kar raha hai, lead leakages kahan hain, aur best ROI channels kaunse hain'}
                    </p>
                </div>

                {/* Sub Tab Switcher */}
                <div className="flex items-center gap-1 bg-muted/40 p-1 rounded-2xl border border-border/40 shrink-0 overflow-x-auto">
                    <Button
                        variant={activeTab === 'leaderboard' ? 'secondary' : 'ghost'}
                        size="sm"
                        onClick={() => setActiveTab('leaderboard')}
                        className={`h-7 px-3 rounded-xl text-xs font-bold transition-all ${
                            activeTab === 'leaderboard' ? 'bg-background shadow-xs text-primary' : 'text-muted-foreground'
                        }`}
                    >
                        <Trophy className="h-3 w-3 mr-1 text-amber-500" />
                        {isPersonalView ? 'My Scorecard' : 'Agent Rankings'}
                    </Button>

                    <Button
                        variant={activeTab === 'forms' ? 'secondary' : 'ghost'}
                        size="sm"
                        onClick={() => setActiveTab('forms')}
                        className={`h-7 px-3 rounded-xl text-xs font-bold transition-all ${
                            activeTab === 'forms' ? 'bg-background shadow-xs text-primary' : 'text-muted-foreground'
                        }`}
                    >
                        <FileText className="h-3 w-3 mr-1 text-indigo-500" />
                        Web Forms ROI ({formAnalytics.length})
                    </Button>

                    <Button
                        variant={activeTab === 'leakage' ? 'secondary' : 'ghost'}
                        size="sm"
                        onClick={() => setActiveTab('leakage')}
                        className={`h-7 px-3 rounded-xl text-xs font-bold transition-all ${
                            activeTab === 'leakage' ? 'bg-background shadow-xs text-primary' : 'text-muted-foreground'
                        }`}
                    >
                        <AlertTriangle className="h-3 w-3 mr-1 text-rose-500" />
                        {isPersonalView ? `Idle Leads (${staleCount})` : `Leakage Radar ${(staleCount + unassignedCount > 0) ? `(${staleCount + unassignedCount})` : ''}`}
                    </Button>

                    <Button
                        variant={activeTab === 'sources' ? 'secondary' : 'ghost'}
                        size="sm"
                        onClick={() => setActiveTab('sources')}
                        className={`h-7 px-3 rounded-xl text-xs font-bold transition-all ${
                            activeTab === 'sources' ? 'bg-background shadow-xs text-primary' : 'text-muted-foreground'
                        }`}
                    >
                        <Compass className="h-3 w-3 mr-1 text-blue-500" />
                        Channel ROI
                    </Button>

                    <Button
                        variant={activeTab === 'hot' ? 'secondary' : 'ghost'}
                        size="sm"
                        onClick={() => setActiveTab('hot')}
                        className={`h-7 px-3 rounded-xl text-xs font-bold transition-all ${
                            activeTab === 'hot' ? 'bg-background shadow-xs text-primary' : 'text-muted-foreground'
                        }`}
                    >
                        <Flame className="h-3 w-3 mr-1 text-orange-500" />
                        {isPersonalView ? `My Hot Deals (${hotOpportunities.length})` : `Hot Deals (${hotOpportunities.length})`}
                    </Button>
                </div>
            </div>

            {/* Daily Calling Targets Bar */}
            <div className="p-3.5 rounded-2xl bg-muted/30 border border-border/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                        <Target className="h-4 w-4 text-indigo-500" />
                        <span className="text-xs font-bold text-foreground">
                            {isPersonalView ? 'My Daily Calling Goal' : 'Team Daily Calling Goal'}
                        </span>
                        <Badge variant="outline" className="text-[10px] font-bold">
                            {totalTodayCalls} / {isPersonalView ? 30 : dailyTargetCalls} Calls Done
                        </Badge>
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                        {isPersonalView 
                            ? 'Daily recommended target: at least 30 dials to maintain active conversions' 
                            : 'Daily recommended pace: ~30 calls per active telecaller'}
                    </p>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-64">
                    <div className="h-2 w-full bg-muted/60 rounded-full overflow-hidden">
                        <div 
                            className="h-full bg-indigo-600 rounded-full transition-all duration-500"
                            style={{ width: `${dailyProgressPct}%` }}
                        />
                    </div>
                    <span className="text-xs font-extrabold text-foreground shrink-0">{dailyProgressPct}%</span>
                </div>
            </div>

            {/* Smart Recommendations Banner */}
            {smartInsights.length > 0 && (
                <div className="p-3.5 rounded-2xl bg-gradient-to-r from-primary/10 via-indigo-500/5 to-primary/10 border border-primary/20 space-y-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                        <Sparkles className="h-3 w-3 text-primary animate-pulse" />
                        AI Sales Advisor & Recommendations
                    </span>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-foreground">
                        {smartInsights.map((insight, idx) => (
                            <div key={idx} className="flex items-start gap-2 bg-card/60 p-2 rounded-xl border border-border/30">
                                <span className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                                <span className="text-[11.5px] leading-relaxed">{insight}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Tab: Web Lead Forms Intelligence & ROI */}
            {activeTab === 'forms' && (
                <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-border/30">
                        <div>
                            <h4 className="font-extrabold text-sm text-foreground flex items-center gap-1.5">
                                <FileText className="h-4 w-4 text-indigo-600" />
                                Web Lead Capture Forms Analytics & Performance
                            </h4>
                            <p className="text-[11px] text-muted-foreground">
                                Track karein kis web form se kitni leads generate hui, kis form ka conversion rate sabse zyada hai, aur kaunse telecaller ko assign hain
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            {/* Filter by Form */}
                            <Select value={selectedFormFilter} onValueChange={setSelectedFormFilter}>
                                <SelectTrigger className="h-8 rounded-xl text-xs font-semibold border-border/60 bg-card w-[180px]">
                                    <SelectValue placeholder="All Forms" />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl text-xs">
                                    <SelectItem value="all" className="text-xs font-bold">
                                        All Forms ({formAnalytics.length})
                                    </SelectItem>
                                    {formAnalytics.map(f => (
                                        <SelectItem key={f.formTitle} value={f.formTitle} className="text-xs font-semibold">
                                            {f.formTitle} ({f.totalLeads})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => navigate('/leads')}
                                className="h-8 text-xs font-bold rounded-xl border-border/60 hover:bg-primary hover:text-white"
                            >
                                Open Form Builder <ArrowUpRight className="ml-1 h-3 w-3" />
                            </Button>
                        </div>
                    </div>

                    {formAnalytics && formAnalytics.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {formAnalytics
                                .filter(f => selectedFormFilter === 'all' || f.formTitle === selectedFormFilter)
                                .map((form, idx) => {
                                    const isTop = idx === 0 && form.totalLeads > 0
                                    return (
                                        <div
                                            key={form.formTitle}
                                            className={`p-4 rounded-2xl bg-card border transition-all space-y-3.5 shadow-2xs ${
                                                isTop 
                                                    ? 'border-indigo-500/50 ring-1 ring-indigo-500/20' 
                                                    : 'border-border/50 hover:border-indigo-500/30'
                                            }`}
                                        >
                                            <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-border/30">
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-1.5">
                                                        <div className="h-6 w-6 rounded-lg bg-indigo-500/15 text-indigo-600 flex items-center justify-center shrink-0">
                                                            <FileText className="h-3.5 w-3.5" />
                                                        </div>
                                                        <h5 className="font-extrabold text-sm text-foreground truncate" title={form.formTitle}>
                                                            {form.formTitle}
                                                        </h5>
                                                    </div>
                                                    <span className="text-[10px] text-muted-foreground block mt-0.5">
                                                        Web Capture Form {form.isActive !== false ? '• 🟢 Active' : '• 🔴 Offline'}
                                                    </span>
                                                </div>
                                                <div className="flex flex-col items-end gap-1 shrink-0">
                                                    <Badge className="bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30 text-[10px] font-bold">
                                                        {form.conversionRate}% Win Rate
                                                    </Badge>
                                                    {isTop && (
                                                        <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 text-[8.5px] font-bold">
                                                            🏆 Best Performer
                                                        </Badge>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Metrics Grid */}
                                            <div className="grid grid-cols-3 gap-2 text-center text-xs">
                                                <div className="p-2 rounded-xl bg-muted/20 border border-border/40">
                                                    <span className="text-[9px] uppercase font-bold text-muted-foreground block">Leads</span>
                                                    <span className="font-extrabold text-indigo-600 dark:text-indigo-400 text-sm">{form.totalLeads}</span>
                                                    <span className="text-[8.5px] text-muted-foreground block">Captured</span>
                                                </div>
                                                <div className="p-2 rounded-xl bg-muted/20 border border-border/40">
                                                    <span className="text-[9px] uppercase font-bold text-muted-foreground block">Deals Won</span>
                                                    <span className="font-extrabold text-emerald-600 dark:text-emerald-400 text-sm">{form.dealsWon}</span>
                                                    <span className="text-[8.5px] text-emerald-600 font-bold block truncate">{formatCurrency(form.revenueWon)}</span>
                                                </div>
                                                <div className="p-2 rounded-xl bg-muted/20 border border-border/40">
                                                    <span className="text-[9px] uppercase font-bold text-muted-foreground block">Pipeline</span>
                                                    <span className="font-extrabold text-foreground text-sm">{Math.max(0, form.totalLeads - form.dealsWon)}</span>
                                                    <span className="text-[8.5px] text-muted-foreground block">Active</span>
                                                </div>
                                            </div>

                                            {/* Captured Leads List from this Form */}
                                            <div className="space-y-1.5 pt-1">
                                                <div className="flex items-center justify-between text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                                                    <span>Leads From This Form:</span>
                                                    <span className="text-primary font-bold">{form.leads?.length || 0} Leads</span>
                                                </div>

                                                <div className="space-y-1.5 max-h-44 overflow-y-auto custom-scrollbar pr-1">
                                                    {form.leads && form.leads.length > 0 ? (
                                                        form.leads.map((ld: any) => (
                                                            <div
                                                                key={ld.id}
                                                                onClick={() => navigate('/leads')}
                                                                className="p-2 rounded-xl bg-muted/15 border border-border/40 hover:border-primary/50 transition-colors flex items-center justify-between gap-2 cursor-pointer group"
                                                            >
                                                                <div className="min-w-0">
                                                                    <span className="font-bold text-xs text-foreground group-hover:text-primary transition-colors truncate block">
                                                                        {ld.name}
                                                                    </span>
                                                                    <span className="text-[10px] text-muted-foreground truncate block">
                                                                        {ld.company} {ld.phone ? `• ${ld.phone}` : ''}
                                                                    </span>
                                                                </div>

                                                                <div className="text-right shrink-0">
                                                                    <Badge variant="outline" className="text-[9px] uppercase font-bold py-0 block">
                                                                        {ld.stage}
                                                                    </Badge>
                                                                    <span className="text-[9px] text-muted-foreground block mt-0.5">
                                                                        Agent: <strong className="text-foreground">{ld.assignedToName}</strong>
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <div className="py-4 text-center text-[10.5px] text-muted-foreground italic bg-muted/10 rounded-xl">
                                                            No leads captured yet from this form.
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                        </div>
                    ) : (
                        <div className="py-12 text-center border-2 border-dashed border-border/40 rounded-2xl space-y-2">
                            <FileText className="h-8 w-8 text-muted-foreground/60 mx-auto" />
                            <h5 className="font-bold text-sm text-foreground">No Web Forms Registered Yet</h5>
                            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                                Lead Capture Forms se aane wale sabhi leads yahan form ke naam, total leads count, aur conversion rate ke sath track honge.
                            </p>
                            <Button
                                size="sm"
                                onClick={() => navigate('/leads')}
                                className="h-8 rounded-xl text-xs font-bold bg-primary text-primary-foreground mt-2"
                            >
                                Open Form Builder
                            </Button>
                        </div>
                    )}
                </div>
            )}

            {/* Tab 1: Agent Leaderboard & Rankings */}
            {activeTab === 'leaderboard' && (
                <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                        {agents.map((ag, idx) => {
                            const isTop3 = idx < 3
                            const rankMedal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`

                            return (
                                <div 
                                    key={ag.userId || ag.name}
                                    className={`p-4 rounded-2xl border transition-all space-y-3 relative overflow-hidden ${
                                        idx === 0 
                                            ? 'bg-gradient-to-b from-amber-500/10 to-card border-amber-500/30 shadow-xs' 
                                            : 'bg-card border-border/50 hover:border-primary/40'
                                    }`}
                                >
                                    {/* Top Rank Badge */}
                                    <div className="flex items-center justify-between pb-2 border-b border-border/30">
                                        <div className="flex items-center gap-2.5">
                                            <span className="text-xl font-extrabold">{rankMedal}</span>
                                            <div>
                                                <span className="font-bold text-sm text-foreground block truncate">
                                                    {ag.name}
                                                </span>
                                                <span className="text-[10px] text-muted-foreground">{ag.email || 'Telecaller'}</span>
                                            </div>
                                        </div>
                                        {getTierBadge(ag.tier, ag.performanceScore || 50)}
                                    </div>

                                    {/* Score Meter */}
                                    <div className="space-y-1">
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="text-[10.5px] font-semibold text-muted-foreground">Overall Performance Score</span>
                                            <strong className="text-foreground font-extrabold">{ag.performanceScore || 50} / 100</strong>
                                        </div>
                                        <div className="h-2 w-full bg-muted/60 rounded-full overflow-hidden">
                                            <div 
                                                className={`h-full rounded-full transition-all duration-500 ${
                                                    (ag.performanceScore || 50) >= 80 ? 'bg-amber-500' : (ag.performanceScore || 50) >= 60 ? 'bg-emerald-500' : 'bg-rose-500'
                                                }`}
                                                style={{ width: `${Math.max(8, ag.performanceScore || 50)}%` }}
                                            />
                                        </div>
                                    </div>

                                    {/* Score Card Metrics */}
                                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                                        <div className="p-2 rounded-xl bg-muted/30 border border-border/40">
                                            <span className="text-[9px] uppercase font-bold text-muted-foreground block">Deals Won</span>
                                            <span className="font-extrabold text-emerald-600 dark:text-emerald-400 text-sm">{ag.dealsWon}</span>
                                            <span className="text-[8.5px] text-emerald-600 block truncate">{formatCurrency(ag.dealsWonValue)}</span>
                                        </div>
                                        <div className="p-2 rounded-xl bg-muted/30 border border-border/40">
                                            <span className="text-[9px] uppercase font-bold text-muted-foreground block">Calls Dialed</span>
                                            <span className="font-extrabold text-indigo-600 dark:text-indigo-400 text-sm">{ag.callsInRange}</span>
                                            <span className="text-[8.5px] text-muted-foreground block">Today: {ag.callsToday}</span>
                                        </div>
                                        <div className="p-2 rounded-xl bg-muted/30 border border-border/40">
                                            <span className="text-[9px] uppercase font-bold text-muted-foreground block">Discipline</span>
                                            <span className={`font-extrabold text-sm ${ag.accuracyScore >= 80 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                {ag.accuracyScore}%
                                            </span>
                                            <span className="text-[8.5px] text-muted-foreground block">{ag.overdueFollowups} overdue</span>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}

            {/* Tab 2: Lead Leakage Radar */}
            {activeTab === 'leakage' && (
                <div className="space-y-4">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                        {/* Stale / Cold Leads (untouched for 3+ days) */}
                        <div className={`${isPersonalView ? 'lg:col-span-12' : 'lg:col-span-6'} p-4 rounded-2xl bg-card border border-border/50 space-y-3`}>
                            <div className="flex items-center justify-between pb-2 border-b border-border/30">
                                <span className="text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                                    <Clock className="h-3.5 w-3.5" />
                                    {isPersonalView ? 'My Idle Leads (Need Immediate Call / Follow-up)' : 'Stale Leads (Idle for 3+ Days)'}
                                </span>
                                <Badge className="bg-rose-500/10 text-rose-600 border-rose-500/20 text-[10px] font-bold">
                                    {staleCount} {isPersonalView ? 'Pending Call' : 'Leaking Leads'}
                                </Badge>
                            </div>

                            <div className="space-y-2 max-h-[340px] overflow-y-auto custom-scrollbar pr-1">
                                {leakageRadar?.staleLeads && leakageRadar.staleLeads.length > 0 ? (
                                    leakageRadar.staleLeads.map((lead) => (
                                        <div 
                                            key={lead.id}
                                            className="p-3 rounded-xl bg-muted/20 border border-border/40 hover:border-primary/40 transition-all flex items-center justify-between gap-2"
                                        >
                                            <div className="min-w-0">
                                                <span className="font-bold text-xs text-foreground truncate block">
                                                    {lead.name} ({lead.company})
                                                </span>
                                                {!isPersonalView && (
                                                    <span className="text-[10.5px] text-muted-foreground block">
                                                        Assigned to: <strong className="text-foreground">{lead.assignedToName}</strong>
                                                    </span>
                                                )}
                                                <span className="text-[10px] text-rose-600 font-bold block">
                                                    ⚠️ Untouched for {lead.daysIdle} days!
                                                </span>
                                            </div>

                                            <div className="text-right shrink-0 space-y-1">
                                                {lead.value > 0 && (
                                                    <span className="text-xs font-extrabold text-emerald-600 block">
                                                        {formatCurrency(lead.value)}
                                                    </span>
                                                )}
                                                <div className="flex items-center gap-1 justify-end">
                                                    {lead.phone && (
                                                        <>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => openWhatsApp(lead.phone)}
                                                                className="h-6 w-6 rounded-md text-emerald-600 hover:bg-emerald-500/10"
                                                                title="Open WhatsApp"
                                                            >
                                                                <MessageSquare className="h-3 w-3" />
                                                            </Button>
                                                            <a
                                                                href={`tel:${lead.phone}`}
                                                                className="h-6 w-6 inline-flex items-center justify-center rounded-md text-indigo-600 hover:bg-indigo-500/10 transition-colors"
                                                                title="Call"
                                                            >
                                                                <PhoneCall className="h-3 w-3" />
                                                            </a>
                                                        </>
                                                    )}
                                                    {isPersonalView ? (
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => navigate('/leads')}
                                                            className="h-6 px-2 text-[10px] font-bold rounded-lg border-border/60 hover:bg-primary hover:text-white"
                                                        >
                                                            Open Lead
                                                        </Button>
                                                    ) : (
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => {
                                                                setLeadToAssign(lead)
                                                                setSelectedAgentId(agents[0]?.userId || '')
                                                                setAssignModalOpen(true)
                                                            }}
                                                            className="h-6 px-2 text-[10px] font-bold rounded-lg border-border/60 hover:bg-primary hover:text-white"
                                                        >
                                                            Reassign
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="py-12 text-center text-xs text-muted-foreground italic">
                                        🎉 No stale leads! Every active lead has been contacted recently.
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Unassigned Leads (Admins / Owners only) */}
                        {!isPersonalView && (
                            <div className="lg:col-span-6 p-4 rounded-2xl bg-card border border-border/50 space-y-3">
                                <div className="flex items-center justify-between pb-2 border-b border-border/30">
                                    <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                                        <UserPlus className="h-3.5 w-3.5" />
                                        Unassigned Leads (Needs Allocation)
                                    </span>
                                    <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-[10px] font-bold">
                                        {unassignedCount} Unassigned
                                    </Badge>
                                </div>

                                <div className="space-y-2 max-h-[340px] overflow-y-auto custom-scrollbar pr-1">
                                    {leakageRadar?.unassignedLeads && leakageRadar.unassignedLeads.length > 0 ? (
                                        leakageRadar.unassignedLeads.map((lead) => (
                                            <div 
                                                key={lead.id}
                                                className="p-3 rounded-xl bg-muted/20 border border-border/40 hover:border-primary/40 transition-all flex items-center justify-between gap-2"
                                            >
                                                <div className="min-w-0">
                                                    <span className="font-bold text-xs text-foreground truncate block">
                                                        {lead.name} ({lead.company})
                                                    </span>
                                                    <span className="text-[10px] text-muted-foreground block">
                                                        Source: <strong className="text-foreground">{lead.source}</strong> • Stage: {lead.stage}
                                                    </span>
                                                </div>

                                                <div className="text-right shrink-0 space-y-1">
                                                    {lead.value > 0 && (
                                                        <span className="text-xs font-extrabold text-emerald-600 block">
                                                            {formatCurrency(lead.value)}
                                                        </span>
                                                    )}
                                                    <Button
                                                        size="sm"
                                                        onClick={() => {
                                                            setLeadToAssign(lead)
                                                            setSelectedAgentId(agents[0]?.userId || '')
                                                            setAssignModalOpen(true)
                                                        }}
                                                        className="h-6 px-2.5 text-[10px] font-bold rounded-lg bg-primary text-primary-foreground shadow-xs"
                                                    >
                                                        Assign Agent
                                                    </Button>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="py-12 text-center text-xs text-muted-foreground italic">
                                            ✨ All leads are currently assigned to active agents!
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Tab 3: Marketing & Channel ROI */}
            {activeTab === 'sources' && (
                <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                        {sourceAnalytics.map((src) => (
                            <div 
                                key={src.source}
                                className="p-4 rounded-2xl bg-card border border-border/50 space-y-3 shadow-xs"
                            >
                                <div className="flex items-center justify-between pb-2 border-b border-border/30">
                                    <span className="font-bold text-sm text-foreground">{src.source}</span>
                                    <Badge variant="outline" className="text-[10px] font-bold">
                                        {src.conversionRate}% Win Rate
                                    </Badge>
                                </div>

                                <div className="space-y-1 text-xs">
                                    <div className="flex items-center justify-between text-muted-foreground">
                                        <span>Total Leads Received:</span>
                                        <strong className="text-foreground">{src.totalLeads}</strong>
                                    </div>
                                    <div className="flex items-center justify-between text-muted-foreground">
                                        <span>Deals Won:</span>
                                        <strong className="text-emerald-600">{src.dealsWon}</strong>
                                    </div>
                                    <div className="flex items-center justify-between text-muted-foreground pt-1 border-t border-border/20">
                                        <span>Revenue Generated:</span>
                                        <strong className="text-emerald-600 font-extrabold text-sm">
                                            {formatCurrency(src.revenueWon)}
                                        </strong>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Tab 4: Hot High-Value Opportunities */}
            {activeTab === 'hot' && (
                <div className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                        {hotOpportunities.map((lead) => (
                            <div 
                                key={lead.id}
                                className="p-4 rounded-2xl bg-card border border-border/50 hover:border-orange-500/40 transition-all space-y-2.5 shadow-xs group"
                            >
                                <div className="flex items-center justify-between pb-2 border-b border-border/30">
                                    <span 
                                        className="font-bold text-sm text-foreground truncate group-hover:text-primary transition-colors cursor-pointer"
                                        onClick={() => navigate('/leads')}
                                    >
                                        {lead.name}
                                    </span>
                                    <Badge className="bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/30 text-[9.5px] font-bold">
                                        🔥 Hot Deal
                                    </Badge>
                                </div>

                                <div className="space-y-1 text-xs">
                                    <span className="text-[11px] text-muted-foreground block truncate">{lead.company}</span>
                                    <div className="flex items-center justify-between pt-1">
                                        <span className="text-muted-foreground text-[10px]">Deal Value:</span>
                                        <span className="font-extrabold text-emerald-600 text-sm">
                                            {formatCurrency(lead.value)}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                                        <span>Agent: {lead.assignedToName}</span>
                                        <span className="capitalize font-semibold">{lead.stage}</span>
                                    </div>

                                    {lead.phone && (
                                        <div className="flex items-center gap-1.5 pt-2 border-t border-border/20">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => openWhatsApp(lead.phone)}
                                                className="flex-1 h-7 text-[10px] font-bold text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/10"
                                            >
                                                <MessageSquare className="h-3 w-3 mr-1" /> WhatsApp
                                            </Button>
                                            <a
                                                href={`tel:${lead.phone}`}
                                                className="flex-1 h-7 text-[10px] font-bold inline-flex items-center justify-center rounded-lg border border-indigo-500/30 text-indigo-600 hover:bg-indigo-500/10 transition-colors"
                                            >
                                                <PhoneCall className="h-3 w-3 mr-1" /> Call
                                            </a>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}

                        {hotOpportunities.length === 0 && (
                            <div className="col-span-full py-12 text-center text-xs text-muted-foreground italic">
                                No hot high-value opportunities detected in active stages.
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Quick Assign / Reassign Dialog */}
            <Dialog open={assignModalOpen} onOpenChange={setAssignModalOpen}>
                <DialogContent className="max-w-md rounded-2xl">
                    <DialogHeader>
                        <DialogTitle className="font-bold text-base flex items-center gap-2">
                            <UserCheck className="h-4 w-4 text-primary" />
                            Assign Lead to Telecaller
                        </DialogTitle>
                        <DialogDescription className="text-xs text-muted-foreground">
                            Assign <strong>"{leadToAssign?.name}"</strong> ({leadToAssign?.company}) to an active sales agent.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        <div className="space-y-1.5">
                            <span className="text-xs font-semibold text-foreground">Select Agent / Telecaller:</span>
                            <Select value={selectedAgentId} onValueChange={setSelectedAgentId}>
                                <SelectTrigger className="h-9 rounded-xl text-xs">
                                    <SelectValue placeholder="Choose an agent..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {agents.map((ag) => (
                                        <SelectItem key={ag.userId || ag.name} value={ag.userId || ag.name} className="text-xs">
                                            {ag.name} ({ag.totalAssignedLeads} leads in hand, {ag.dealsWon} won)
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setAssignModalOpen(false)}
                                className="h-8 rounded-xl text-xs"
                            >
                                Cancel
                            </Button>
                            <Button
                                size="sm"
                                onClick={handleAssignLead}
                                disabled={assignLoading || !selectedAgentId}
                                className="h-8 rounded-xl text-xs font-bold bg-primary text-primary-foreground"
                            >
                                {assignLoading ? "Assigning..." : "Confirm Assignment"}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}
