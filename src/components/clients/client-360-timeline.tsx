import { useEffect, useState } from 'react'
import api from '@/lib/api-client'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { format } from 'date-fns'
import {
    FileText, LifeBuoy, Briefcase, StickyNote, Activity,
    Target, Shield, RefreshCw, Loader2, Repeat
} from 'lucide-react'

type TimelineEvent = {
    id: string
    type: string
    title: string
    description?: string
    status?: string | null
    meta?: Record<string, unknown>
    at?: string
}

const TYPE_META: Record<string, { icon: typeof FileText; label: string; color: string }> = {
    invoice: { icon: FileText, label: 'Invoice', color: 'bg-blue-500/15 text-blue-700 border-blue-500/25' },
    ticket: { icon: LifeBuoy, label: 'Ticket', color: 'bg-amber-500/15 text-amber-700 border-amber-500/25' },
    project: { icon: Briefcase, label: 'Project', color: 'bg-violet-500/15 text-violet-700 border-violet-500/25' },
    note: { icon: StickyNote, label: 'Note', color: 'bg-slate-500/15 text-slate-700 border-slate-500/25' },
    activity: { icon: Activity, label: 'Activity', color: 'bg-emerald-500/15 text-emerald-700 border-emerald-500/25' },
    lead: { icon: Target, label: 'Lead', color: 'bg-pink-500/15 text-pink-700 border-pink-500/25' },
    amc: { icon: Shield, label: 'AMC', color: 'bg-cyan-500/15 text-cyan-700 border-cyan-500/25' },
    retainer: { icon: Repeat, label: 'Retainer', color: 'bg-indigo-500/15 text-indigo-700 border-indigo-500/25' },
}

export function Client360Timeline({ clientId }: { clientId: string }) {
    const [events, setEvents] = useState<TimelineEvent[]>([])
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState<string>('all')

    const load = async () => {
        setLoading(true)
        try {
            const res = await api.get(`/clients/${clientId}/timeline`)
            setEvents(res.data.events || [])
        } catch (err) {
            console.error(err)
            setEvents([])
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { if (clientId) load() }, [clientId])

    const filtered = filter === 'all' ? events : events.filter((e) => e.type === filter)
    const types = Array.from(new Set(events.map((e) => e.type)))

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between gap-2 flex-wrap">
                <div>
                    <h3 className="font-bold text-base">Client 360 Timeline</h3>
                    <p className="text-xs text-muted-foreground">
                        Invoices, tickets, projects, notes, AMC & retainers in one feed
                    </p>
                </div>
                <Button variant="outline" size="sm" onClick={load} className="gap-1.5 h-8">
                    <RefreshCw className="h-3.5 w-3.5" /> Refresh
                </Button>
            </div>

            <div className="flex gap-1.5 overflow-x-auto pb-1">
                <button
                    type="button"
                    onClick={() => setFilter('all')}
                    className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border shrink-0 ${
                        filter === 'all' ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted/40 border-border/50'
                    }`}
                >
                    All ({events.length})
                </button>
                {types.map((t) => (
                    <button
                        key={t}
                        type="button"
                        onClick={() => setFilter(t)}
                        className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border shrink-0 capitalize ${
                            filter === t ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted/40 border-border/50'
                        }`}
                    >
                        {TYPE_META[t]?.label || t}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" /> Loading timeline…
                </div>
            ) : filtered.length === 0 ? (
                <div className="py-12 text-center text-sm text-muted-foreground border border-dashed border-border/60 rounded-2xl">
                    No timeline events yet for this client.
                </div>
            ) : (
                <div className="relative space-y-0 pl-4 border-l border-border/50 ml-2">
                    {filtered.map((ev) => {
                        const meta = TYPE_META[ev.type] || TYPE_META.activity
                        const Icon = meta.icon
                        return (
                            <div key={ev.id} className="relative pb-5 pl-5">
                                <span className="absolute -left-[21px] top-1 flex h-6 w-6 items-center justify-center rounded-full bg-background border border-border/60 shadow-sm">
                                    <Icon className="h-3 w-3 text-muted-foreground" />
                                </span>
                                <div className="rounded-xl border border-border/50 bg-card/80 p-3 space-y-1.5">
                                    <div className="flex items-start justify-between gap-2 flex-wrap">
                                        <div className="min-w-0">
                                            <p className="font-bold text-sm text-foreground">{ev.title}</p>
                                            {ev.description && (
                                                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-3">{ev.description}</p>
                                            )}
                                        </div>
                                        <Badge variant="outline" className={`text-[9px] font-bold uppercase shrink-0 ${meta.color}`}>
                                            {meta.label}
                                        </Badge>
                                    </div>
                                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-medium">
                                        {ev.at && <span>{format(new Date(ev.at), 'dd MMM yyyy, h:mm a')}</span>}
                                        {ev.status && (
                                            <Badge variant="secondary" className="text-[9px] font-bold uppercase">
                                                {ev.status}
                                            </Badge>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
