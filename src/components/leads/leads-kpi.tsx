import { Card, CardContent } from '@/components/ui/card'
import { AlertCircle, Clock, CalendarCheck, HelpCircle, Users } from 'lucide-react'
import type { Lead } from '@/types'
import { getLeadFollowUpInfo } from '@/lib/followup-utils'

interface LeadsKPIProps {
    allLeads: Lead[]
    selectedFollowUpFilter: string
    onSelectFollowUpFilter: (filter: string) => void
}

export function LeadsKPI({ allLeads, selectedFollowUpFilter, onSelectFollowUpFilter }: LeadsKPIProps) {
    let overdueCount = 0
    let todayCount = 0
    let upcomingCount = 0
    let noFollowUpCount = 0

    allLeads.forEach(l => {
        const info = getLeadFollowUpInfo(l.reminder)
        if (info.status === 'overdue') overdueCount++
        else if (info.status === 'today') todayCount++
        else if (info.status === 'future') upcomingCount++
        else noFollowUpCount++
    })

    const cards = [
        {
            id: 'all',
            title: 'All Leads',
            count: allLeads.length,
            icon: Users,
            activeColor: 'bg-blue-500/15 border-blue-500/50 text-blue-600 dark:text-blue-400 ring-2 ring-blue-500/30',
            inactiveColor: 'bg-card hover:bg-blue-500/5 border-border/60 text-foreground',
            badgeBg: 'bg-blue-500/20 text-blue-700 dark:text-blue-300',
            iconColor: 'text-blue-600 dark:text-blue-400',
            indicator: '🔵'
        },
        {
            id: 'overdue',
            title: 'Overdue Follow-ups',
            count: overdueCount,
            icon: AlertCircle,
            activeColor: 'bg-red-500/15 border-red-500/50 text-red-600 dark:text-red-400 ring-2 ring-red-500/30',
            inactiveColor: 'bg-card hover:bg-red-500/5 border-border/60 text-foreground',
            badgeBg: 'bg-red-500/20 text-red-700 dark:text-red-300',
            iconColor: 'text-red-600 dark:text-red-400',
            indicator: '🔴'
        },
        {
            id: 'today',
            title: "Today's Follow-ups",
            count: todayCount,
            icon: Clock,
            activeColor: 'bg-amber-500/15 border-amber-500/50 text-amber-600 dark:text-amber-400 ring-2 ring-amber-500/30',
            inactiveColor: 'bg-card hover:bg-amber-500/5 border-border/60 text-foreground',
            badgeBg: 'bg-amber-500/20 text-amber-700 dark:text-amber-300',
            iconColor: 'text-amber-600 dark:text-amber-400',
            indicator: '🟠'
        },
        {
            id: 'future',
            title: 'Upcoming Follow-ups',
            count: upcomingCount,
            icon: CalendarCheck,
            activeColor: 'bg-emerald-500/15 border-emerald-500/50 text-emerald-600 dark:text-emerald-400 ring-2 ring-emerald-500/30',
            inactiveColor: 'bg-card hover:bg-emerald-500/5 border-border/60 text-foreground',
            badgeBg: 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300',
            iconColor: 'text-emerald-600 dark:text-emerald-400',
            indicator: '🟢'
        },
        {
            id: 'none',
            title: 'No Follow-up',
            count: noFollowUpCount,
            icon: HelpCircle,
            activeColor: 'bg-slate-500/15 border-slate-500/50 text-slate-700 dark:text-slate-300 ring-2 ring-slate-500/30',
            inactiveColor: 'bg-card hover:bg-slate-500/5 border-border/60 text-foreground',
            badgeBg: 'bg-slate-500/20 text-slate-700 dark:text-slate-300',
            iconColor: 'text-muted-foreground',
            indicator: '⚪'
        }
    ]

    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 flex-shrink-0 animate-in fade-in duration-500">
            {cards.map((c) => {
                const Icon = c.icon
                const isSelected = selectedFollowUpFilter === c.id

                return (
                    <Card
                        key={c.id}
                        onClick={() => onSelectFollowUpFilter(c.id)}
                        className={`cursor-pointer transition-all duration-200 border rounded-2xl shadow-sm hover:shadow-md ${
                            isSelected ? c.activeColor : c.inactiveColor
                        }`}
                    >
                        <CardContent className="p-3.5 flex items-center justify-between">
                            <div className="space-y-1 overflow-hidden">
                                <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                    <span>{c.indicator}</span>
                                    <span className="truncate">{c.title}</span>
                                </div>
                                <div className="flex items-baseline gap-1.5">
                                    <h3 className="text-xl font-extrabold tracking-tight">{c.count}</h3>
                                    <span className="text-[10px] font-semibold text-muted-foreground">leads</span>
                                </div>
                            </div>
                            <div className={`p-2 rounded-xl border ${c.badgeBg} ${c.iconColor} shrink-0`}>
                                <Icon className="h-4 w-4" />
                            </div>
                        </CardContent>
                    </Card>
                )
            })}
        </div>
    )
}
