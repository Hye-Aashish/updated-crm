import React, { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
    FileText, 
    Users, 
    DollarSign, 
    TrendingUp, 
    CheckCircle2, 
    Sparkles, 
    ChevronDown, 
    ChevronUp, 
    ArrowUpRight,
    ExternalLink,
    Copy,
    Filter
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { formatCurrency } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'

export interface FormAnalyticsItem {
    formTitle: string
    formId?: string | null
    isActive?: boolean
    totalLeads: number
    dealsWon: number
    revenueWon: number
    conversionRate: number
    leads: Array<{
        id: string
        name: string
        company?: string
        phone?: string
        email?: string
        stage: string
        value: number
        assignedToName: string
        createdAt?: string
    }>
}

interface WebFormPerformanceSectionProps {
    formAnalytics: FormAnalyticsItem[]
    onNavigateToLeads?: () => void
}

export function WebFormPerformanceSection({
    formAnalytics = [],
    onNavigateToLeads
}: WebFormPerformanceSectionProps) {
    const navigate = useNavigate()
    const { toast } = useToast()
    const [expandedForm, setExpandedForm] = useState<string | null>(null)
    const [filterSelected, setFilterSelected] = useState<string>('all')

    const totalForms = formAnalytics.length
    const totalCaptured = formAnalytics.reduce((acc, f) => acc + (f.totalLeads || 0), 0)
    const totalWon = formAnalytics.reduce((acc, f) => acc + (f.dealsWon || 0), 0)
    const totalRevenue = formAnalytics.reduce((acc, f) => acc + (f.revenueWon || 0), 0)

    const topPerformer = formAnalytics.length > 0 && formAnalytics[0].totalLeads > 0
        ? formAnalytics[0]
        : null

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text)
        toast({ description: "Public Form Link copied to clipboard!" })
    }

    const filteredForms = formAnalytics.filter(f => 
        filterSelected === 'all' ? true : f.formTitle === filterSelected
    )

    return (
        <Card className="rounded-3xl border border-border/70 shadow-sm overflow-hidden bg-card/60 backdrop-blur-xl p-5 sm:p-6 space-y-5">
            {/* Header & Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/40">
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center font-bold">
                            <FileText className="h-4 w-4" />
                        </div>
                        <h3 className="text-lg font-black text-foreground tracking-tight flex items-center gap-2">
                            Web Lead Capture Forms Performance
                            <Badge className="bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30 text-[10px] font-bold">
                                Inbound ROI
                            </Badge>
                        </h3>
                    </div>
                    <p className="text-xs text-muted-foreground">
                        Track karein kis website form se kitni leads generate hui, kaunsa form best perform kar raha hai, aur kaunse telecaller ko assign hain
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {/* Filter Pills */}
                    {totalForms > 1 && (
                        <div className="flex items-center gap-1 bg-muted/40 p-1 rounded-xl border border-border/40">
                            <Button
                                size="sm"
                                variant={filterSelected === 'all' ? 'secondary' : 'ghost'}
                                onClick={() => setFilterSelected('all')}
                                className="h-7 px-2.5 text-xs font-bold rounded-lg"
                            >
                                All ({totalForms})
                            </Button>
                            {formAnalytics.map(f => (
                                <Button
                                    key={f.formTitle}
                                    size="sm"
                                    variant={filterSelected === f.formTitle ? 'secondary' : 'ghost'}
                                    onClick={() => setFilterSelected(f.formTitle)}
                                    className="h-7 px-2.5 text-xs font-bold rounded-lg truncate max-w-[120px]"
                                    title={f.formTitle}
                                >
                                    {f.formTitle} ({f.totalLeads})
                                </Button>
                            ))}
                        </div>
                    )}

                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onNavigateToLeads ? onNavigateToLeads() : navigate('/leads')}
                        className="h-8 text-xs font-bold rounded-xl border-border/60 hover:bg-primary hover:text-white transition-all"
                    >
                        Form Builder & Settings <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
                    </Button>
                </div>
            </div>

            {/* Quick Metrics Ribbon */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-2xl bg-muted/20 border border-border/40 space-y-1">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1">
                        <FileText className="h-3 w-3 text-indigo-500" /> Active Forms
                    </span>
                    <div className="text-xl font-extrabold text-foreground">{totalForms} Engine{totalForms > 1 ? 's' : ''}</div>
                    <span className="text-[9.5px] text-muted-foreground block">Deployed on website</span>
                </div>

                <div className="p-3 rounded-2xl bg-muted/20 border border-border/40 space-y-1">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1">
                        <Users className="h-3 w-3 text-blue-500" /> Total Inbound Leads
                    </span>
                    <div className="text-xl font-extrabold text-blue-600 dark:text-blue-400">{totalCaptured} Leads</div>
                    <span className="text-[9.5px] text-muted-foreground block">Captured via forms</span>
                </div>

                <div className="p-3 rounded-2xl bg-muted/20 border border-border/40 space-y-1">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1">
                        <DollarSign className="h-3 w-3 text-emerald-500" /> Deals Won & Revenue
                    </span>
                    <div className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400">{totalWon} ({formatCurrency(totalRevenue)})</div>
                    <span className="text-[9.5px] text-muted-foreground block">Converted customers</span>
                </div>

                <div className="p-3 rounded-2xl bg-muted/20 border border-border/40 space-y-1">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1">
                        <Sparkles className="h-3 w-3 text-amber-500" /> Top Performing Form
                    </span>
                    <div className="text-base font-extrabold text-foreground truncate" title={topPerformer ? topPerformer.formTitle : 'None'}>
                        {topPerformer ? topPerformer.formTitle : 'Collecting Data...'}
                    </div>
                    <span className="text-[9.5px] text-amber-600 font-bold block">
                        {topPerformer ? `${topPerformer.conversionRate}% Conversion` : '0 submissions yet'}
                    </span>
                </div>
            </div>

            {/* Form Cards Grid */}
            {filteredForms.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {filteredForms.map((form, idx) => {
                        const isExpanded = expandedForm === form.formTitle
                        const isTop = topPerformer && form.formTitle === topPerformer.formTitle && form.totalLeads > 0

                        return (
                            <div 
                                key={form.formTitle}
                                className={`p-5 rounded-2xl bg-card border transition-all flex flex-col justify-between space-y-4 ${
                                    isTop 
                                        ? 'border-indigo-500/50 ring-1 ring-indigo-500/20 shadow-md' 
                                        : 'border-border/60 hover:border-indigo-500/40 shadow-xs'
                                }`}
                            >
                                <div className="space-y-3.5">
                                    {/* Card Header */}
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                                                <CheckCircle2 className="h-5 w-5" />
                                            </div>
                                            <div className="min-w-0">
                                                <h4 className="font-extrabold text-base text-foreground truncate" title={form.formTitle}>
                                                    {form.formTitle}
                                                </h4>
                                                <span className="text-[10.5px] text-muted-foreground block">
                                                    Standard lead capture form
                                                </span>
                                            </div>
                                        </div>

                                        <div className="flex flex-col items-end gap-1 shrink-0">
                                            <Badge variant={form.isActive !== false ? "secondary" : "outline"} className="text-[9px] font-bold uppercase py-0.5">
                                                {form.isActive !== false ? 'ACTIVE' : 'OFFLINE'}
                                            </Badge>
                                            {isTop && (
                                                <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 text-[8.5px] font-bold flex items-center gap-1">
                                                    <Sparkles className="h-2.5 w-2.5" /> Best Performer
                                                </Badge>
                                            )}
                                        </div>
                                    </div>

                                    {/* Real-Time Metrics Box (Matching User's screenshot) */}
                                    <div className="p-3.5 rounded-xl bg-muted/20 border border-border/40 space-y-2.5">
                                        <div className="flex items-center justify-between text-xs font-bold">
                                            <span className="text-muted-foreground flex items-center gap-1.5">
                                                <Users className="h-3.5 w-3.5 text-indigo-500" /> Leads Captured:
                                            </span>
                                            <span className="text-indigo-600 dark:text-indigo-400 font-extrabold text-sm">
                                                {form.totalLeads} {form.totalLeads === 1 ? 'Lead' : 'Leads'}
                                            </span>
                                        </div>

                                        <div className="flex items-center justify-between text-xs font-bold">
                                            <span className="text-muted-foreground flex items-center gap-1.5">
                                                <DollarSign className="h-3.5 w-3.5 text-emerald-500" /> Deals Won:
                                            </span>
                                            <span className="text-emerald-600 dark:text-emerald-400 font-extrabold text-sm">
                                                {form.dealsWon} ({formatCurrency(form.revenueWon)})
                                            </span>
                                        </div>

                                        <div className="flex items-center justify-between text-xs font-bold">
                                            <span className="text-muted-foreground flex items-center gap-1.5">
                                                <TrendingUp className="h-3.5 w-3.5 text-primary" /> Conversion Rate:
                                            </span>
                                            <span className="text-foreground font-extrabold text-sm">
                                                {form.conversionRate}%
                                            </span>
                                        </div>
                                    </div>

                                    {/* Captured Leads List or Empty State */}
                                    {form.totalLeads > 0 ? (
                                        <div className="space-y-1.5 pt-1">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => setExpandedForm(isExpanded ? null : form.formTitle)}
                                                className="w-full h-7 px-2 text-[11px] font-bold text-primary hover:bg-primary/5 flex items-center justify-between"
                                            >
                                                <span>{isExpanded ? 'Hide Captured Leads' : `View Captured Leads (${form.totalLeads})`}</span>
                                                {isExpanded ? <ChevronUp className="h-3.5 w-3.5 ml-1" /> : <ChevronDown className="h-3.5 w-3.5 ml-1" />}
                                            </Button>

                                            {isExpanded && (
                                                <div className="space-y-1.5 max-h-44 overflow-y-auto custom-scrollbar p-1.5 bg-background/80 rounded-xl border border-border/40">
                                                    {form.leads.map((ld: any) => (
                                                        <div
                                                            key={ld.id}
                                                            onClick={() => navigate('/leads')}
                                                            className="p-2 rounded-lg bg-card border border-border/30 hover:border-primary/50 transition-colors flex items-center justify-between gap-2 cursor-pointer group/lead"
                                                        >
                                                            <div className="min-w-0">
                                                                <span className="font-bold text-xs text-foreground group-hover/lead:text-primary transition-colors truncate block">
                                                                    {ld.name}
                                                                </span>
                                                                <span className="text-[10px] text-muted-foreground truncate block">
                                                                    {ld.company || ld.phone || ld.email || 'Web Lead'}
                                                                </span>
                                                            </div>
                                                            <div className="text-right shrink-0">
                                                                <Badge variant="outline" className="text-[8.5px] uppercase font-bold py-0 block">
                                                                    {ld.stage}
                                                                </Badge>
                                                                <span className="text-[8.5px] text-muted-foreground block mt-0.5">
                                                                    Agent: <strong>{ld.assignedToName || 'Unassigned'}</strong>
                                                                </span>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="text-center py-2.5 px-3 bg-muted/10 rounded-xl border border-border/20 text-[11px] text-muted-foreground">
                                            Abhi tak is form se koi lead capture nahi hui hai.
                                        </div>
                                    )}
                                </div>

                                {/* Bottom Quick Actions */}
                                {form.formId && (
                                    <div className="flex items-center justify-between pt-2 border-t border-border/30 text-xs">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => window.open(`${window.location.origin}/f/${form.formId}`, '_blank')}
                                            className="h-7 px-2 text-[10px] font-bold text-muted-foreground hover:text-primary"
                                        >
                                            <ExternalLink className="h-3 w-3 mr-1" /> View Public Form
                                        </Button>

                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleCopy(`${window.location.origin}/f/${form.formId}`)}
                                            className="h-7 px-2 text-[10px] font-bold text-muted-foreground hover:text-primary"
                                        >
                                            <Copy className="h-3 w-3 mr-1" /> Copy Link
                                        </Button>
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            ) : (
                <div className="py-12 text-center border-2 border-dashed border-border/40 rounded-2xl space-y-2">
                    <FileText className="h-8 w-8 text-muted-foreground/60 mx-auto" />
                    <h5 className="font-bold text-sm text-foreground">No Web Forms Registered</h5>
                    <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                        Lead Capture Forms se aane wale sabhi leads yahan har form ke metrics ke sath live track honge.
                    </p>
                    <Button
                        size="sm"
                        onClick={() => navigate('/leads')}
                        className="h-8 rounded-xl text-xs font-bold bg-primary text-primary-foreground mt-2"
                    >
                        Create Lead Capture Form
                    </Button>
                </div>
            )}
        </Card>
    )
}
