import { useCallback, useEffect, useMemo, useState } from 'react'
import {
    addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval,
    isSameMonth, isSameDay, isToday, format, setHours, setMinutes
} from 'date-fns'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
    ChevronLeft, ChevronRight, Plus, Loader2, Building2, Users, MapPin,
    Video, Bell, Trash2, CheckCircle2
} from 'lucide-react'
import api from '@/lib/api-client'
import { useToast } from '@/hooks/use-toast'
import { useAppStore } from '@/store'
import { cn } from '@/lib/utils'

import { appConfirm } from '@/lib/app-dialog'

const TYPES = [
    { id: 'meeting', label: 'Meeting' },
    { id: 'call', label: 'Call' },
    { id: 'demo', label: 'Demo' },
    { id: 'internal', label: 'Internal' },
    { id: 'reminder', label: 'Reminder' },
    { id: 'personal', label: 'Personal' },
    { id: 'other', label: 'Other' },
]

const REMINDER_OPTS = [
    { v: 5, l: '5 min before' },
    { v: 15, l: '15 min before' },
    { v: 30, l: '30 min before' },
    { v: 60, l: '1 hour before' },
    { v: 1440, l: '1 day before' },
]

const emptyForm = () => {
    const start = setMinutes(setHours(new Date(), new Date().getHours() + 1), 0)
    const end = new Date(start.getTime() + 30 * 60000)
    return {
        title: '',
        description: '',
        startAt: format(start, "yyyy-MM-dd'T'HH:mm"),
        endAt: format(end, "yyyy-MM-dd'T'HH:mm"),
        type: 'meeting',
        clientId: '',
        attendeeIds: [] as string[],
        location: '',
        meetingLink: '',
        reminderMinutes: 15,
        notes: '',
        ownerId: ''
    }
}

export function CalendarPage({ employeeMode = false }: { employeeMode?: boolean }) {
    const { toast } = useToast()
    const { currentUser } = useAppStore()
    const [month, setMonth] = useState(new Date())
    const [selectedDay, setSelectedDay] = useState(new Date())
    const [events, setEvents] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [clients, setClients] = useState<any[]>([])
    const [users, setUsers] = useState<any[]>([])
    const [dialogOpen, setDialogOpen] = useState(false)
    const [editing, setEditing] = useState<any>(null)
    const [form, setForm] = useState(emptyForm())
    const [saving, setSaving] = useState(false)
    const [filterUser, setFilterUser] = useState('me')

    const isAdmin = ['owner', 'admin'].includes(currentUser?.role || '')
    const baseQs = useMemo(() => {
        const params = new URLSearchParams()
        params.set('start', startOfMonth(month).toISOString())
        params.set('end', endOfMonth(addMonths(month, 0)).toISOString())
        // extend end a bit
        params.set('end', endOfMonth(month).toISOString())
        if (isAdmin && !employeeMode) {
            if (filterUser === 'all') params.set('scope', 'all')
            else if (filterUser !== 'me') params.set('userId', filterUser)
        }
        return params.toString()
    }, [month, filterUser, isAdmin, employeeMode])

    const load = useCallback(async () => {
        setLoading(true)
        try {
            const res = await api.get(`/calendar?${baseQs}`)
            setEvents(res.data || [])
        } catch (e: any) {
            toast({ title: 'Calendar load failed', description: e.message, variant: 'destructive' })
        } finally {
            setLoading(false)
        }
    }, [baseQs])

    useEffect(() => { load() }, [load])

    useEffect(() => {
        api.get('/clients').then(r => setClients(Array.isArray(r.data) ? r.data : [])).catch(() => {})
        api.get('/users').then(r => setUsers((r.data || []).filter((u: any) => u.role !== 'client'))).catch(() => {})
    }, [])

    const days = eachDayOfInterval({ start: startOfMonth(month), end: endOfMonth(month) })
    const startPad = startOfMonth(month).getDay() // 0 Sun

    const eventsForDay = (day: Date) =>
        events.filter(e => isSameDay(new Date(e.startAt), day) && e.status !== 'cancelled')

    const selectedEvents = eventsForDay(selectedDay).sort(
        (a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime()
    )

    const openCreate = (day?: Date) => {
        const f = emptyForm()
        if (day) {
            const s = setMinutes(setHours(day, 10), 0)
            f.startAt = format(s, "yyyy-MM-dd'T'HH:mm")
            f.endAt = format(new Date(s.getTime() + 30 * 60000), "yyyy-MM-dd'T'HH:mm")
        }
        setEditing(null)
        setForm(f)
        setDialogOpen(true)
    }

    const openEdit = (ev: any) => {
        setEditing(ev)
        setForm({
            title: ev.title || '',
            description: ev.description || '',
            startAt: format(new Date(ev.startAt), "yyyy-MM-dd'T'HH:mm"),
            endAt: format(new Date(ev.endAt), "yyyy-MM-dd'T'HH:mm"),
            type: ev.type || 'meeting',
            clientId: ev.clientId || '',
            attendeeIds: ev.attendeeIds || [],
            location: ev.location || '',
            meetingLink: ev.meetingLink || '',
            reminderMinutes: ev.reminderMinutes ?? 15,
            notes: ev.notes || '',
            ownerId: ev.ownerId || ''
        })
        setDialogOpen(true)
    }

    const save = async () => {
        if (!form.title.trim()) {
            toast({ title: 'Title required', variant: 'destructive' })
            return
        }
        setSaving(true)
        try {
            const payload: any = {
                ...form,
                startAt: new Date(form.startAt).toISOString(),
                endAt: new Date(form.endAt).toISOString(),
                reminderMinutes: Number(form.reminderMinutes)
            }
            if (editing) {
                await api.put(`/calendar/${editing._id}`, payload)
                toast({ title: 'Event updated' })
            } else {
                await api.post('/calendar', payload)
                toast({ title: 'Event created' })
            }
            setDialogOpen(false)
            load()
        } catch (e: any) {
            toast({ title: 'Save failed', description: e.message, variant: 'destructive' })
        } finally {
            setSaving(false)
        }
    }

    const cancelEvent = async (id: string) => {
        if (!await appConfirm({
            title: 'Cancel event?',
            description: 'This meeting will be cancelled and removed from your schedule.',
            confirmLabel: 'Cancel event',
            cancelLabel: 'Keep',
            variant: 'destructive',
        })) return
        await api.delete(`/calendar/${id}`)
        toast({ title: 'Event cancelled' })
        load()
    }

    const markDone = async (id: string) => {
        await api.put(`/calendar/${id}`, { status: 'completed' })
        load()
    }

    return (
        <div className="space-y-4 max-w-6xl mx-auto min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h1 className="text-xl font-extrabold tracking-tight">My Calendar</h1>
                    <p className="text-sm text-muted-foreground">
                        Meetings, calls & reminders — client, people, time, alerts
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    {isAdmin && !employeeMode && (
                        <select
                            className="h-9 rounded-xl border bg-background px-3 text-sm"
                            value={filterUser}
                            onChange={e => setFilterUser(e.target.value)}
                        >
                            <option value="me">My schedule</option>
                            <option value="all">All team</option>
                            {users.map(u => (
                                <option key={u._id} value={u._id}>{u.name}</option>
                            ))}
                        </select>
                    )}
                    <Button onClick={() => openCreate(selectedDay)} className="rounded-xl">
                        <Plus className="h-4 w-4 mr-1" /> New event
                    </Button>
                </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-5">
                <Card className="lg:col-span-3 border-border/60">
                    <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
                        <div className="flex items-center gap-2">
                            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setMonth(subMonths(month, 1))}>
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <CardTitle className="text-base">{format(month, 'MMMM yyyy')}</CardTitle>
                            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setMonth(addMonths(month, 1))}>
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                        <Button size="sm" variant="outline" className="h-8" onClick={() => { setMonth(new Date()); setSelectedDay(new Date()) }}>Today</Button>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-7 gap-1 mb-1">
                            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                                <div key={d} className="text-center text-[10px] font-bold uppercase text-muted-foreground py-1">{d}</div>
                            ))}
                        </div>
                        {loading ? (
                            <div className="flex justify-center py-16"><Loader2 className="h-7 w-7 animate-spin text-primary" /></div>
                        ) : (
                            <div className="grid grid-cols-7 gap-1">
                                {Array.from({ length: startPad }).map((_, i) => (
                                    <div key={`pad-${i}`} className="min-h-[72px] rounded-xl bg-transparent" />
                                ))}
                                {days.map(day => {
                                    const dayEvents = eventsForDay(day)
                                    const selected = isSameDay(day, selectedDay)
                                    return (
                                        <button
                                            key={day.toISOString()}
                                            type="button"
                                            onClick={() => setSelectedDay(day)}
                                            onDoubleClick={() => openCreate(day)}
                                            className={cn(
                                                'min-h-[72px] rounded-xl border p-1.5 text-left transition-all',
                                                selected ? 'border-primary bg-primary/10' : 'border-border/40 hover:bg-muted/40',
                                                isToday(day) && !selected && 'ring-1 ring-primary/40',
                                                !isSameMonth(day, month) && 'opacity-40'
                                            )}
                                        >
                                            <div className={cn('text-xs font-bold mb-1', isToday(day) && 'text-primary')}>
                                                {format(day, 'd')}
                                            </div>
                                            <div className="space-y-0.5">
                                                {dayEvents.slice(0, 2).map(ev => (
                                                    <div
                                                        key={ev._id}
                                                        className="text-[9px] font-semibold truncate rounded px-1 py-0.5 text-white"
                                                        style={{ backgroundColor: ev.color || '#3A6FF8' }}
                                                    >
                                                        {ev.title}
                                                    </div>
                                                ))}
                                                {dayEvents.length > 2 && (
                                                    <div className="text-[9px] text-muted-foreground font-bold">+{dayEvents.length - 2}</div>
                                                )}
                                            </div>
                                        </button>
                                    )
                                })}
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card className="lg:col-span-2 border-border/60">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base">{format(selectedDay, 'EEEE, MMM d')}</CardTitle>
                        <p className="text-xs text-muted-foreground">{selectedEvents.length} event(s)</p>
                    </CardHeader>
                    <CardContent className="space-y-2 max-h-[520px] overflow-y-auto">
                        {selectedEvents.length === 0 && (
                            <div className="text-center py-10 space-y-3">
                                <p className="text-sm text-muted-foreground">No events this day</p>
                                <Button size="sm" variant="outline" onClick={() => openCreate(selectedDay)}>
                                    <Plus className="h-4 w-4 mr-1" /> Schedule
                                </Button>
                            </div>
                        )}
                        {selectedEvents.map(ev => (
                            <div key={ev._id} className="rounded-2xl border border-border/50 p-3 space-y-2 hover:bg-muted/20">
                                <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                        <p className="font-bold text-sm truncate">{ev.title}</p>
                                        <p className="text-[11px] text-muted-foreground">
                                            {format(new Date(ev.startAt), 'h:mm a')} – {format(new Date(ev.endAt), 'h:mm a')}
                                        </p>
                                    </div>
                                    <Badge variant="secondary" className="text-[10px] shrink-0">{ev.type}</Badge>
                                </div>
                                {ev.clientName && (
                                    <p className="text-xs flex items-center gap-1.5 text-muted-foreground">
                                        <Building2 className="h-3.5 w-3.5" /> Client: <span className="font-semibold text-foreground">{ev.clientName}</span>
                                    </p>
                                )}
                                <p className="text-xs flex items-center gap-1.5 text-muted-foreground">
                                    <Users className="h-3.5 w-3.5" />
                                    {[ev.ownerName, ...(ev.attendeeNames || [])].filter(Boolean).join(', ') || '—'}
                                </p>
                                {ev.location && <p className="text-xs flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />{ev.location}</p>}
                                {ev.meetingLink && (
                                    <a href={ev.meetingLink} target="_blank" rel="noreferrer" className="text-xs text-primary flex items-center gap-1.5">
                                        <Video className="h-3.5 w-3.5" /> Join link
                                    </a>
                                )}
                                <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                                    <Bell className="h-3 w-3" /> Reminder {ev.reminderMinutes ?? 15} min before
                                </p>
                                <div className="flex gap-1.5 pt-1">
                                    <Button size="sm" variant="outline" className="h-7 text-[10px]" onClick={() => openEdit(ev)}>Edit</Button>
                                    {ev.status === 'scheduled' && (
                                        <Button size="sm" variant="outline" className="h-7 text-[10px]" onClick={() => markDone(ev._id)}>
                                            <CheckCircle2 className="h-3 w-3 mr-1" /> Done
                                        </Button>
                                    )}
                                    <Button size="sm" variant="ghost" className="h-7 text-[10px] text-rose-500" onClick={() => cancelEvent(ev._id)}>
                                        <Trash2 className="h-3 w-3" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            </div>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl">
                    <DialogHeader>
                        <DialogTitle>{editing ? 'Edit event' : 'New schedule event'}</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-3 py-2">
                        <div className="space-y-1.5">
                            <Label>Title *</Label>
                            <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Client kickoff / Demo call" />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1.5">
                                <Label>Type</Label>
                                <select className="w-full h-10 rounded-md border px-3 text-sm bg-background" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                                    {TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <Label>Reminder</Label>
                                <select className="w-full h-10 rounded-md border px-3 text-sm bg-background" value={form.reminderMinutes} onChange={e => setForm({ ...form, reminderMinutes: Number(e.target.value) })}>
                                    {REMINDER_OPTS.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
                                </select>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1.5">
                                <Label>Start</Label>
                                <Input type="datetime-local" value={form.startAt} onChange={e => setForm({ ...form, startAt: e.target.value })} />
                            </div>
                            <div className="space-y-1.5">
                                <Label>End</Label>
                                <Input type="datetime-local" value={form.endAt} onChange={e => setForm({ ...form, endAt: e.target.value })} />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <Label>Client</Label>
                            <select className="w-full h-10 rounded-md border px-3 text-sm bg-background" value={form.clientId} onChange={e => setForm({ ...form, clientId: e.target.value })}>
                                <option value="">No client</option>
                                {clients.map((c: any) => (
                                    <option key={c._id || c.id} value={c._id || c.id}>{c.company || c.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <Label>Invite team</Label>
                            <div className="max-h-28 overflow-y-auto rounded-xl border p-2 space-y-1">
                                {users.map(u => {
                                    const id = u._id
                                    const checked = form.attendeeIds.includes(id)
                                    return (
                                        <label key={id} className="flex items-center gap-2 text-xs py-1 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={checked}
                                                onChange={() => {
                                                    setForm(f => ({
                                                        ...f,
                                                        attendeeIds: checked
                                                            ? f.attendeeIds.filter(x => x !== id)
                                                            : [...f.attendeeIds, id]
                                                    }))
                                                }}
                                            />
                                            <span>{u.name} <span className="text-muted-foreground">({u.role})</span></span>
                                        </label>
                                    )
                                })}
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1.5">
                                <Label>Location</Label>
                                <Input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} placeholder="Office / Cafe" />
                            </div>
                            <div className="space-y-1.5">
                                <Label>Meeting link</Label>
                                <Input value={form.meetingLink} onChange={e => setForm({ ...form, meetingLink: e.target.value })} placeholder="https://..." />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <Label>Notes</Label>
                            <Input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Agenda / prep notes" />
                        </div>
                        <Button onClick={save} disabled={saving} className="w-full mt-1">
                            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                            {editing ? 'Update event' : 'Create event'}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}

export default CalendarPage
