import React from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
    PhoneCall, 
    Users, 
    UserCheck, 
    UserX, 
    CheckCircle2, 
    PhoneOff, 
    CalendarCheck, 
    Calendar, 
    Clock, 
    AlertTriangle, 
    ShieldCheck, 
    Trophy, 
    TrendingUp, 
    Percent, 
    Target,
    Headphones,
    Flame
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface SalesKpiCardsProps {
    kpis: any
    isPersonalView?: boolean
    onCardClick?: (kpiKey: string) => void
}

export function SalesKpiCards({ kpis, isPersonalView = false, onCardClick }: SalesKpiCardsProps) {
    if (!kpis) return null

    const cards = [
        {
            key: 'totalCallAttempts',
            label: isPersonalView ? 'My Call Attempts' : 'Total Call Attempts',
            value: kpis.totalCallAttempts ?? 0,
            subtext: `${kpis.callConnectionRate ?? 0}% connection rate`,
            icon: PhoneCall,
            color: 'text-indigo-600 dark:text-indigo-400',
            bgColor: 'bg-indigo-500/10'
        },
        {
            key: 'uniqueLeadsCalled',
            label: 'Unique Leads Attempted',
            value: kpis.uniqueLeadsCalled ?? 0,
            subtext: `${kpis.uniqueLeadsContacted ?? 0} successfully contacted`,
            icon: Users,
            color: 'text-blue-600 dark:text-blue-400',
            bgColor: 'bg-blue-500/10'
        },
        {
            key: 'uniqueLeadsContacted',
            label: 'Leads Contacted',
            value: kpis.uniqueLeadsContacted ?? 0,
            subtext: 'Spoke directly with lead',
            icon: UserCheck,
            color: 'text-sky-600 dark:text-sky-400',
            bgColor: 'bg-sky-500/10'
        },
        {
            key: 'leadsNotYetContacted',
            label: 'Leads Not Contacted',
            value: kpis.leadsNotYetContacted ?? 0,
            subtext: 'Pending initial outreach',
            icon: UserX,
            color: 'text-slate-600 dark:text-slate-400',
            bgColor: 'bg-slate-500/10'
        },
        {
            key: 'connectedCalls',
            label: 'Connected Calls',
            value: kpis.connectedCalls ?? 0,
            subtext: `Avg: ${kpis.avgCallDurationFormatted || '0s'}`,
            icon: CheckCircle2,
            color: 'text-emerald-600 dark:text-emerald-400',
            bgColor: 'bg-emerald-500/10'
        },
        {
            key: 'unansweredOutgoing',
            label: 'Unanswered Outgoing',
            value: kpis.unansweredOutgoing ?? 0,
            subtext: 'Busy, no-answer or failed',
            icon: PhoneOff,
            color: 'text-rose-600 dark:text-rose-400',
            bgColor: 'bg-rose-500/10'
        },
        {
            key: 'meetingsScheduled',
            label: 'Meetings Scheduled',
            value: kpis.meetingsScheduled ?? 0,
            subtext: `${kpis.meetingsCompleted ?? 0} held & completed`,
            icon: Calendar,
            color: 'text-purple-600 dark:text-purple-400',
            bgColor: 'bg-purple-500/10'
        },
        {
            key: 'meetingsCompleted',
            label: 'Meetings Completed',
            value: kpis.meetingsCompleted ?? 0,
            subtext: `${kpis.meetingAttendanceRate ?? 0}% attendance rate`,
            icon: CalendarCheck,
            color: 'text-amber-600 dark:text-amber-400',
            bgColor: 'bg-amber-500/10'
        },
        {
            key: 'followupsCompleted',
            label: 'Follow-ups Completed',
            value: kpis.followupsCompleted ?? 0,
            subtext: 'Executed on time',
            icon: Clock,
            color: 'text-teal-600 dark:text-teal-400',
            bgColor: 'bg-teal-500/10'
        },
        {
            key: 'overdueFollowups',
            label: 'Overdue Follow-ups',
            value: kpis.overdueFollowups ?? 0,
            subtext: (kpis.overdueFollowups ?? 0) === 0 ? 'Zero overdue (clean)' : 'Immediate attention',
            icon: AlertTriangle,
            color: (kpis.overdueFollowups ?? 0) > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600',
            bgColor: 'bg-rose-500/10'
        },
        {
            key: 'qualifiedLeads',
            label: 'Qualified Leads',
            value: kpis.qualifiedLeads ?? 0,
            subtext: 'Passed BANT / fit criteria',
            icon: ShieldCheck,
            color: 'text-indigo-600 dark:text-indigo-400',
            bgColor: 'bg-indigo-500/10'
        },
        {
            key: 'dealsWon',
            label: 'Deals Won',
            value: kpis.dealsWon ?? 0,
            subtext: `${formatCurrency(kpis.revenueGenerated || 0)}`,
            icon: Trophy,
            color: 'text-emerald-600 dark:text-emerald-400',
            bgColor: 'bg-emerald-500/10'
        },
        {
            key: 'revenueGenerated',
            label: 'Revenue Closed',
            value: formatCurrency(kpis.revenueGenerated ?? 0),
            subtext: kpis.targetAchievement?.revenueTarget ? `Target: ${formatCurrency(kpis.targetAchievement.revenueTarget)}` : 'Closed contracts',
            icon: TrendingUp,
            color: 'text-emerald-600 dark:text-emerald-400',
            bgColor: 'bg-emerald-500/10'
        },
        {
            key: 'conversionRate',
            label: 'Lead Conversion Rate',
            value: `${kpis.conversionRate ?? 0}%`,
            subtext: 'Inflow-to-won ratio',
            icon: Percent,
            color: 'text-blue-600 dark:text-blue-400',
            bgColor: 'bg-blue-500/10'
        },
        {
            key: 'targetAchievement',
            label: 'Target Achievement',
            value: kpis.targetAchievement?.revenue !== null ? `${kpis.targetAchievement.revenue}%` : 'Not Configured',
            subtext: kpis.targetAchievement?.calls !== null ? `Calls: ${kpis.targetAchievement.calls}%` : 'Set monthly targets',
            icon: Target,
            color: 'text-indigo-600 dark:text-indigo-400',
            bgColor: 'bg-indigo-500/10'
        }
    ]

    return (
        <div className="space-y-2.5">
            <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Flame className="h-3.5 w-3.5 text-primary" />
                    Standard Performance & Conversion Metrics ({cards.length} Indicators)
                </span>
                <span className="text-[10px] text-muted-foreground">
                    Consistent across cards, exports & audits
                </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {cards.map((card) => {
                    const Icon = card.icon
                    return (
                        <Card
                            key={card.key}
                            onClick={() => onCardClick && onCardClick(card.key)}
                            className="p-3.5 rounded-2xl border border-border/50 bg-card shadow-xs hover:border-primary/40 hover:shadow-sm transition-all cursor-pointer space-y-1.5 group"
                        >
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider truncate block" title={card.label}>
                                    {card.label}
                                </span>
                                <div className={`h-6 w-6 rounded-lg ${card.bgColor} ${card.color} flex items-center justify-center shrink-0`}>
                                    <Icon className="h-3.5 w-3.5" />
                                </div>
                            </div>

                            <div className={`text-xl font-black ${card.color} truncate`} title={String(card.value)}>
                                {card.value}
                            </div>

                            <span className="text-[9.5px] text-muted-foreground block truncate" title={card.subtext}>
                                {card.subtext}
                            </span>
                        </Card>
                    )
                })}
            </div>
        </div>
    )
}
