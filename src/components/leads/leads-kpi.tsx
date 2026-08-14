import { Card, CardContent } from '@/components/ui/card'
import { Users, DollarSign, Target, Coins, TrendingUp } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import type { Lead } from '@/types'

interface LeadsKPIProps {
    leads: Lead[]
}

export function LeadsKPI({ leads }: LeadsKPIProps) {
    const totalLeads = leads.length
    const totalValue = leads.reduce((sum, l) => sum + (l.value || 0), 0)
    const wonDeals = leads.filter(l => l.stage === 'closed' || l.stage === 'won').length
    const wonRevenue = leads.filter(l => l.stage === 'closed' || l.stage === 'won').reduce((sum, l) => sum + (l.value || 0), 0)
    const convertedLeads = leads.filter(l => !!l.reminder?.date).length
    const conversionRate = totalLeads > 0 ? Math.round((convertedLeads / totalLeads) * 100) : 0

    const stats = [
        { title: "Total Leads", value: totalLeads, icon: Users, color: "text-blue-600", bg: "bg-blue-50/50" },
        { title: "Pipeline Value", value: formatCurrency(totalValue), icon: DollarSign, color: "text-amber-600", bg: "bg-amber-50/50" },
        { title: "Won Deals", value: wonDeals, icon: Target, color: "text-purple-600", bg: "bg-purple-50/50" },
        { title: "Won Revenue", value: formatCurrency(wonRevenue), icon: Coins, color: "text-green-600", bg: "bg-green-50/50" },
        { title: "Conversion", value: `${conversionRate}%`, icon: TrendingUp, color: "text-cyan-600", bg: "bg-cyan-50/50" },
    ]

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 flex-shrink-0 animate-in fade-in slide-in-from-top-4 duration-700">
            {stats.map((stat, i) => (
                <Card key={i} className="dashboard-card border-none overflow-hidden group">
                    <CardContent className="p-6 flex items-center justify-between relative z-10">
                        <div className="space-y-1">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{stat.title}</p>
                            <h3 className="text-2xl font-bold tracking-tight">{stat.value}</h3>
                        </div>
                        <div className={`p-3 rounded-xl ${stat.bg} ${stat.color} transition-colors group-hover:bg-background group-hover:shadow-sm`}>
                            <stat.icon className="h-5 w-5" />
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    )
}
