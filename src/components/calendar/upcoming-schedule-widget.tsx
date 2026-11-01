import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Calendar, Clock, Building2, Users, ArrowRight, Loader2 } from 'lucide-react'
import api from '@/lib/api-client'
import { format, isToday, isTomorrow } from 'date-fns'

const TYPE_LABEL: Record<string, string> = {
    meeting: 'Meeting',
    call: 'Call',
    reminder: 'Reminder',
    demo: 'Demo',
    internal: 'Internal',
    personal: 'Personal',
    other: 'Other'
}

export function UpcomingScheduleWidget({
    basePath = '/calendar',
    limit = 6,
    title = 'My Schedule'
}: {
    basePath?: string
    limit?: number
    title?: string
}) {
    const [events, setEvents] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        let alive = true
        api.get(`/calendar/upcoming?limit=${limit}`)
            .then(res => { if (alive) setEvents(res.data || []) })
            .catch(() => { if (alive) setEvents([]) })
            .finally(() => { if (alive) setLoading(false) })
        return () => { alive = false }
    }, [limit])

    const whenLabel = (d: Date) => {
        if (isToday(d)) return `Today · ${format(d, 'h:mm a')}`
        if (isTomorrow(d)) return `Tomorrow · ${format(d, 'h:mm a')}`
        return format(d, 'EEE, MMM d · h:mm a')
    }

    return (
        <Card className="border-border/60 shadow-xs">
            <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
                <CardTitle className="text-base flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-primary" />
                    {title}
                </CardTitle>
                <Button asChild variant="ghost" size="sm" className="h-8 text-xs">
                    <Link to={basePath}>Open calendar <ArrowRight className="h-3.5 w-3.5 ml-1" /></Link>
                </Button>
            </CardHeader>
            <CardContent className="space-y-2">
                {loading && (
                    <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
                )}
                {!loading && events.length === 0 && (
                    <p className="text-sm text-muted-foreground py-6 text-center">
                        No upcoming meetings. <Link to={basePath} className="text-primary font-semibold underline-offset-2 hover:underline">Add one</Link>
                    </p>
                )}
                {events.map(ev => {
                    const start = new Date(ev.startAt)
                    return (
                        <Link
                            key={ev._id}
                            to={basePath}
                            className="block p-3 rounded-2xl border border-border/50 hover:bg-muted/40 transition-colors"
                        >
                            <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                    <p className="text-sm font-bold truncate">{ev.title}</p>
                                    <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                                        <Clock className="h-3 w-3" /> {whenLabel(start)}
                                    </p>
                                    {ev.clientName && (
                                        <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5 truncate">
                                            <Building2 className="h-3 w-3" /> {ev.clientName}
                                        </p>
                                    )}
                                    {(ev.attendeeNames?.length > 0 || ev.ownerName) && (
                                        <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5 truncate">
                                            <Users className="h-3 w-3" />
                                            {[ev.ownerName, ...(ev.attendeeNames || [])].filter(Boolean).slice(0, 3).join(', ')}
                                        </p>
                                    )}
                                </div>
                                <Badge variant="secondary" className="text-[10px] shrink-0">
                                    {TYPE_LABEL[ev.type] || ev.type}
                                </Badge>
                            </div>
                        </Link>
                    )
                })}
            </CardContent>
        </Card>
    )
}
