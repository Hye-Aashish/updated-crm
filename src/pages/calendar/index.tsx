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
    ChevronLeft, ChevronRight, Plus, Loader2, Building2, Users, User, MapPin,
    Video, Bell, Trash2, CheckCircle2, PhoneCall, Phone, Clock, AlertCircle,
    ExternalLink, Calendar as CalendarIcon, MessageSquare, ShieldCheck, Check
} from 'lucide-react'
import api from '@/lib/api-client'
import { useToast } from '@/hooks/use-toast'
import { useAppStore } from '@/store'
import { cn } from '@/lib/utils'
import { appConfirm } from '@/lib/app-dialog'
import { FollowUpDialog } from '@/components/leads/follow-up-dialog'
import type { Lead, PipelineStage } from '@/types'
import { useNavigate } from 'react-router-dom'

const EVENT_TYPES = [
    { id: 'meeting', label: '🤝 Client Meeting', category: 'meeting' },
    { id: 'demo', label: '💻 Product Demo', category: 'meeting' },
    { id: 'internal', label: '👥 Internal Discussion', category: 'meeting' },
    { id: 'call', label: '📞 Follow-up Call', category: 'followup' },
    { id: 'reminder', label: '⏰ Lead Reminder', category: 'followup' },
    { id: 'personal', label: '🔒 Personal Task', category: 'meeting' },
    { id: 'other', label: '📌 Other', category: 'meeting' },
]

const REMINDER_OPTS = [
    { v: 5, l: '5 min before' },
    { v: 15, l: '15 min before' },
    { v: 30, l: '30 min before' },
    { v: 60, l: '1 hour before' },
    { v: 1440, l: '1 day before' },
]

const emptyForm = (defaultOwnerId: string = '') => {
    const start = setMinutes(setHours(new Date(), new Date().getHours() + 1), 0)
    const end = new Date(start.getTime() + 30 * 60000)
    return {
        title: '',
        description: '',
        startAt: format(start, "yyyy-MM-dd'T'HH:mm"),
        endAt: format(end, "yyyy-MM-dd'T'HH:mm"),
        type: 'meeting',
        category: 'meeting',
        clientId: '',
        leadId: '',
        attendeeIds: [] as string[],
        location: '',
        meetingLink: '',
        reminderMinutes: 15,
        notes: '',
        ownerId: defaultOwnerId
    }
}

export function CalendarPage({ employeeMode = false }: { employeeMode?: boolean }) {
    const { toast } = useToast()
    const navigate = useNavigate()
    const { currentUser } = useAppStore()
    const isAdmin = ['owner', 'admin'].includes(currentUser?.role || '')

    // Active calendar category tab: 'followup' | 'meeting' | 'all'
    const [activeTab, setActiveTab] = useState<'followup' | 'meeting' | 'all'>('followup')
    
    // Admin filter: 'all' (default for admin), 'me', or specific user ID
    const [filterUser, setFilterUser] = useState<string>(isAdmin && !employeeMode ? 'all' : 'me')

    const [month, setMonth] = useState<Date>(new Date())
    const [selectedDay, setSelectedDay] = useState<Date>(new Date())
    const [events, setEvents] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [clients, setClients] = useState<any[]>([])
    const [users, setUsers] = useState<any[]>([])
    const [stages, setStages] = useState<PipelineStage[]>([])

    // Dialogs
    const [dialogOpen, setDialogOpen] = useState(false)
    const [editing, setEditing] = useState<any>(null)
    const [form, setForm] = useState(emptyForm(currentUser?._id || (currentUser as any)?.id || ''))
    const [saving, setSaving] = useState(false)

    // Follow-up interaction logger dialog
    const [activeFollowUpLead, setActiveFollowUpLead] = useState<Lead | null>(null)
    const [isFollowUpModalOpen, setIsFollowUpModalOpen] = useState(false)

    const baseQs = useMemo(() => {
        const params = new URLSearchParams()
        params.set('start', startOfMonth(month).toISOString())
        params.set('end', endOfMonth(month).toISOString())
        params.set('category', 'all') // fetch all so we can compute tab counts locally & switch instantly

        if (isAdmin && !employeeMode) {
            if (filterUser === 'all') params.set('scope', 'all')
            else if (filterUser === 'me') params.set('scope', 'me')
            else params.set('userId', filterUser)
        } else {
            params.set('scope', 'me')
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
        api.get('/leads/stages').then(r => setStages(Array.isArray(r.data) ? r.data : [])).catch(() => {})
    }, [])

    // Filter events by selected category tab
    const filteredEvents = useMemo(() => {
        if (activeTab === 'followup') {
            return events.filter(e => e.category === 'followup' || e.type === 'followup')
        }
        if (activeTab === 'meeting') {
            return events.filter(e => e.category === 'meeting' || e.type !== 'followup')
        }
        return events
    }, [events, activeTab])

    // Overall summary counts for badges
    const followupCount = useMemo(() => events.filter(e => e.category === 'followup' || e.type === 'followup').length, [events])
    const meetingCount = useMemo(() => events.filter(e => e.category === 'meeting' || e.type !== 'followup').length, [events])
    const totalCount = events.length

    // Calendar grid calculations
    const days = eachDayOfInterval({ start: startOfMonth(month), end: endOfMonth(month) })
    const startPad = startOfMonth(month).getDay()

    const eventsForDay = (day: Date) =>
        filteredEvents.filter(e => isSameDay(new Date(e.startAt), day) && e.status !== 'cancelled')

    const selectedEvents = eventsForDay(selectedDay).sort(
        (a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime()
    )

    const openCreate = (day?: Date) => {
        const myId = currentUser?._id || (currentUser as any)?.id || ''
        const f = emptyForm(filterUser !== 'all' && filterUser !== 'me' ? filterUser : myId)
        if (activeTab === 'followup') {
            f.type = 'call'
            f.category = 'followup'
        } else {
            f.type = 'meeting'
            f.category = 'meeting'
        }
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
            endAt: format(new Date(ev.endAt || ev.startAt), "yyyy-MM-dd'T'HH:mm"),
            type: ev.type || 'meeting',
            category: ev.category || 'meeting',
            clientId: ev.clientId || '',
            leadId: ev.leadId || '',
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
            toast({ title: 'Title is required', variant: 'destructive' })
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
                await api.put(`/calendar/${editing._id || editing.id}`, payload)
                toast({ title: 'Event updated successfully' })
            } else {
                await api.post('/calendar', payload)
                toast({ title: 'Event created successfully' })
            }
            setDialogOpen(false)
            load()
        } catch (e: any) {
            toast({ title: 'Save failed', description: e.message, variant: 'destructive' })
        } finally {
            setSaving(false)
        }
    }

    const cancelEvent = async (id: string, isFollowup: boolean) => {
        const itemType = isFollowup ? 'follow-up reminder' : 'meeting'
        if (!await appConfirm({
            title: `Cancel ${itemType}?`,
            description: `This ${itemType} will be removed from the schedule.`,
            confirmLabel: `Cancel ${itemType}`,
            cancelLabel: 'Keep',
            variant: 'destructive',
        })) return
        try {
            await api.delete(`/calendar/${id}`)
            toast({ title: `${isFollowup ? 'Follow-up' : 'Meeting'} cancelled` })
            load()
        } catch (e: any) {
            toast({ title: 'Action failed', description: e.message, variant: 'destructive' })
        }
    }

    const markDone = async (id: string) => {
        try {
            await api.put(`/calendar/${id}`, { status: 'completed' })
            toast({ title: 'Marked as completed' })
            load()
        } catch (e: any) {
            toast({ title: 'Action failed', description: e.message, variant: 'destructive' })
        }
    }

    // Direct Lead Follow-up Action Handler
    const handleOpenFollowUpDialog = (ev: any) => {
        if (!ev.leadId) return
        const leadObj: Partial<Lead> = {
            id: ev.leadId,
            _id: ev.leadId,
            name: ev.clientName || ev.title?.replace('Follow-up: ', ''),
            company: ev.clientName || 'Direct',
            phone: ev.phone || '',
            stage: ev.stage || 'new',
            assignedTo: ev.ownerId,
            assignedToName: ev.ownerName,
            lastFollowUpOutcome: ev.lastFollowUpOutcome,
            lastNote: ev.lastNote,
            reminder: {
                date: new Date(ev.startAt),
                tone: 'default',
                completed: ev.status === 'completed'
            }
        }
        setActiveFollowUpLead(leadObj as Lead)
        setIsFollowUpModalOpen(true)
    }

    const handleSaveFollowUpLog = async (leadId: string, payload: any) => {
        try {
            await api.post(`/leads/${leadId}/followups`, payload)
            toast({ title: 'Success', description: 'Follow-up interaction recorded successfully!' })
            setIsFollowUpModalOpen(false)
            setActiveFollowUpLead(null)
            load()
            return true
        } catch (err: any) {
            toast({ title: 'Error', description: err.message || 'Failed to save follow-up', variant: 'destructive' })
            return false
        }
    }

    const activeUserObj = users.find(u => u._id === filterUser)

    return (
        <div className="space-y-5 max-w-7xl mx-auto min-w-0">
            {/* Header Section */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-5 rounded-3xl bg-card border border-border/60 shadow-xs">
                <div className="space-y-1">
                    <div className="flex items-center gap-2.5">
                        <div className="h-10 w-10 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                            <CalendarIcon className="h-5 w-5" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-xl font-extrabold tracking-tight text-foreground">
                                    {activeTab === 'followup' ? 'Follow-up Calendar' : activeTab === 'meeting' ? 'Meeting Calendar' : 'Full CRM Calendar'}
                                </h1>
                                {isAdmin && !employeeMode && (
                                    <Badge className="bg-primary/10 text-primary border border-primary/20 text-[10px] font-bold">
                                        <ShieldCheck className="h-3 w-3 mr-1" /> Admin Full View
                                    </Badge>
                                )}
                            </div>
                            <p className="text-xs text-muted-foreground">
                                {activeTab === 'followup'
                                    ? 'Lead calls, agenda & telecaller reminders'
                                    : activeTab === 'meeting'
                                    ? 'Client demos, discovery meetings, video conferences & internal syncs'
                                    : 'Complete schedule of all meetings and lead follow-ups'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Top Controls: Admin User Selector & New Event */}
                <div className="flex flex-wrap items-center gap-2.5">
                    {isAdmin && !employeeMode && (
                        <div className="flex items-center gap-1.5 bg-muted/40 p-1 rounded-2xl border border-border/50">
                            <span className="text-[11px] font-bold text-muted-foreground px-2 flex items-center gap-1">
                                <User className="h-3.5 w-3.5 text-primary" /> View:
                            </span>
                            <select
                                className="h-8 rounded-xl border border-border/60 bg-background px-3 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary"
                                value={filterUser}
                                onChange={e => setFilterUser(e.target.value)}
                            >
                                <option value="all">🌐 All Team Members ({users.length})</option>
                                <option value="me">👤 My Schedule Only</option>
                                <optgroup label="Filter by Telecaller / Agent">
                                    {users.map(u => (
                                        <option key={u._id} value={u._id}>
                                            {u.name} ({u.role})
                                        </option>
                                    ))}
                                </optgroup>
                            </select>
                        </div>
                    )}

                    <Button onClick={() => openCreate(selectedDay)} className="h-9 rounded-xl font-bold text-xs shadow-sm bg-primary text-primary-foreground hover:bg-primary/90">
                        <Plus className="h-4 w-4 mr-1" /> New {activeTab === 'followup' ? 'Follow-up' : 'Meeting'}
                    </Button>
                </div>
            </div>

            {/* TAB SWITCHER: Follow-up Calendar vs Meeting Calendar vs All */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-muted/30 p-1.5 rounded-2xl border border-border/50">
                <div className="inline-flex rounded-xl bg-background/80 p-1 border border-border/40 shadow-2xs gap-1">
                    <button
                        type="button"
                        onClick={() => setActiveTab('followup')}
                        className={cn(
                            'flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all',
                            activeTab === 'followup'
                                ? 'bg-emerald-600 text-white shadow-sm'
                                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                        )}
                    >
                        <PhoneCall className="h-3.5 w-3.5" />
                        <span>Follow-up Calendar</span>
                        <span className={cn(
                            'text-[10px] px-1.5 py-0.2 rounded-full font-extrabold',
                            activeTab === 'followup' ? 'bg-white/25 text-white' : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                        )}>
                            {followupCount}
                        </span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setActiveTab('meeting')}
                        className={cn(
                            'flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all',
                            activeTab === 'meeting'
                                ? 'bg-indigo-600 text-white shadow-sm'
                                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                        )}
                    >
                        <Video className="h-3.5 w-3.5" />
                        <span>Meeting Calendar</span>
                        <span className={cn(
                            'text-[10px] px-1.5 py-0.2 rounded-full font-extrabold',
                            activeTab === 'meeting' ? 'bg-white/25 text-white' : 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300'
                        )}>
                            {meetingCount}
                        </span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setActiveTab('all')}
                        className={cn(
                            'flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all',
                            activeTab === 'all'
                                ? 'bg-primary text-primary-foreground shadow-sm'
                                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                        )}
                    >
                        <CalendarIcon className="h-3.5 w-3.5" />
                        <span>All ({totalCount})</span>
                    </button>
                </div>

                {/* Sub-label showing current filter */}
                <div className="text-[11px] font-semibold text-muted-foreground px-2 flex items-center gap-2">
                    {filterUser === 'all' ? (
                        <span>Showing schedule for: <strong className="text-foreground">All Team Members</strong></span>
                    ) : filterUser === 'me' ? (
                        <span>Showing schedule for: <strong className="text-foreground">My Personal Schedule</strong></span>
                    ) : (
                        <span>Showing schedule for: <strong className="text-foreground">{activeUserObj?.name || 'Selected User'}</strong></span>
                    )}
                </div>
            </div>

            {/* Main Calendar Section: Month Grid + Day Schedule Details */}
            <div className="grid gap-4 lg:grid-cols-5">
                {/* 1. Month Grid (Left 3 columns) */}
                <Card className="lg:col-span-3 border-border/60 rounded-3xl overflow-hidden shadow-xs">
                    <CardHeader className="pb-3 flex-row items-center justify-between space-y-0 border-b border-border/40 bg-card">
                        <div className="flex items-center gap-2">
                            <Button size="icon" variant="ghost" className="h-8 w-8 rounded-xl" onClick={() => setMonth(subMonths(month, 1))}>
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <CardTitle className="text-base font-extrabold">{format(month, 'MMMM yyyy')}</CardTitle>
                            <Button size="icon" variant="ghost" className="h-8 w-8 rounded-xl" onClick={() => setMonth(addMonths(month, 1))}>
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                        <Button size="sm" variant="outline" className="h-8 text-xs font-bold rounded-xl" onClick={() => { setMonth(new Date()); setSelectedDay(new Date()) }}>
                            Today
                        </Button>
                    </CardHeader>
                    <CardContent className="p-3">
                        <div className="grid grid-cols-7 gap-1 mb-1">
                            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                                <div key={d} className="text-center text-[10px] font-extrabold uppercase text-muted-foreground py-1">
                                    {d}
                                </div>
                            ))}
                        </div>
                        {loading ? (
                            <div className="flex justify-center py-24"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
                        ) : (
                            <div className="grid grid-cols-7 gap-1">
                                {Array.from({ length: startPad }).map((_, i) => (
                                    <div key={`pad-${i}`} className="min-h-[82px] rounded-2xl bg-muted/10 border border-transparent" />
                                ))}
                                {days.map(day => {
                                    const dayEvents = eventsForDay(day)
                                    const selected = isSameDay(day, selectedDay)
                                    const hasFollowup = dayEvents.some(e => e.category === 'followup' || e.type === 'followup')
                                    const hasMeeting = dayEvents.some(e => e.category === 'meeting' || e.type !== 'followup')

                                    return (
                                        <button
                                            key={day.toISOString()}
                                            type="button"
                                            onClick={() => setSelectedDay(day)}
                                            onDoubleClick={() => openCreate(day)}
                                            className={cn(
                                                'min-h-[82px] rounded-2xl border p-1.5 text-left transition-all flex flex-col justify-between group',
                                                selected
                                                    ? 'border-primary ring-2 ring-primary/20 bg-primary/10 shadow-xs'
                                                    : 'border-border/40 hover:bg-muted/40 hover:border-border',
                                                isToday(day) && !selected && 'border-primary/50 bg-primary/5 font-extrabold',
                                                !isSameMonth(day, month) && 'opacity-30'
                                            )}
                                        >
                                            <div className="flex items-center justify-between w-full">
                                                <span className={cn(
                                                    'text-xs font-extrabold rounded-md px-1',
                                                    isToday(day) ? 'bg-primary text-primary-foreground' : 'text-foreground'
                                                )}>
                                                    {format(day, 'd')}
                                                </span>
                                                <div className="flex gap-1 items-center">
                                                    {hasFollowup && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" title="Follow-up scheduled" />}
                                                    {hasMeeting && <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" title="Meeting scheduled" />}
                                                </div>
                                            </div>

                                            <div className="space-y-1 w-full my-1">
                                                {dayEvents.slice(0, 2).map(ev => {
                                                    const isFu = ev.category === 'followup' || ev.type === 'followup'
                                                    return (
                                                        <div
                                                            key={ev._id || ev.id}
                                                            className={cn(
                                                                'text-[9.5px] font-bold truncate rounded-md px-1.5 py-0.5 flex items-center gap-1 shadow-2xs',
                                                                isFu
                                                                    ? 'bg-emerald-600/90 text-white dark:bg-emerald-700'
                                                                    : 'bg-indigo-600/90 text-white dark:bg-indigo-700'
                                                            )}
                                                            title={`${ev.title} (${ev.ownerName || 'Direct'})`}
                                                        >
                                                            {isFu ? <PhoneCall className="h-2.5 w-2.5 shrink-0" /> : <Video className="h-2.5 w-2.5 shrink-0" />}
                                                            <span className="truncate">{ev.title}</span>
                                                        </div>
                                                    )
                                                })}
                                                {dayEvents.length > 2 && (
                                                    <div className="text-[9px] text-muted-foreground font-extrabold pl-1">
                                                        +{dayEvents.length - 2} more
                                                    </div>
                                                )}
                                            </div>
                                        </button>
                                    )
                                })}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* 2. Selected Day Detail Schedule (Right 2 columns) */}
                <Card className="lg:col-span-2 border-border/60 rounded-3xl overflow-hidden shadow-xs flex flex-col">
                    <CardHeader className="pb-3 border-b border-border/40 bg-card">
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-base font-extrabold flex items-center gap-2">
                                    <Clock className="h-4 w-4 text-primary" />
                                    <span>{format(selectedDay, 'EEEE, MMM d')}</span>
                                </CardTitle>
                                <p className="text-xs text-muted-foreground">
                                    {selectedEvents.length} event(s) in this day's view
                                </p>
                            </div>
                            <Button size="sm" variant="outline" onClick={() => openCreate(selectedDay)} className="h-8 text-xs font-bold rounded-xl">
                                <Plus className="h-3.5 w-3.5 mr-1" /> Add
                            </Button>
                        </div>
                    </CardHeader>

                    <CardContent className="p-3.5 space-y-3 overflow-y-auto max-h-[600px] flex-1 custom-scrollbar">
                        {selectedEvents.length === 0 && (
                            <div className="text-center py-16 space-y-3">
                                <div className="h-12 w-12 rounded-2xl bg-muted/40 border border-border/50 flex items-center justify-center mx-auto text-muted-foreground">
                                    {activeTab === 'followup' ? <PhoneCall className="h-6 w-6" /> : <Video className="h-6 w-6" />}
                                </div>
                                <p className="text-sm font-bold text-foreground">No {activeTab === 'followup' ? 'follow-ups' : activeTab === 'meeting' ? 'meetings' : 'events'} on this date</p>
                                <p className="text-xs text-muted-foreground max-w-[220px] mx-auto">
                                    {activeTab === 'followup' ? 'Schedule a telecaller callback or customer check-in' : 'Book a client discovery meeting or product demo'}
                                </p>
                                <Button size="sm" variant="outline" onClick={() => openCreate(selectedDay)} className="rounded-xl text-xs font-bold">
                                    <Plus className="h-3.5 w-3.5 mr-1" /> Schedule for {format(selectedDay, 'MMM d')}
                                </Button>
                            </div>
                        )}

                        {selectedEvents.map(ev => {
                            const isFu = ev.category === 'followup' || ev.type === 'followup'
                            const isCompleted = ev.status === 'completed'
                            const isOverdue = ev.status === 'overdue'

                            return (
                                <div
                                    key={ev._id || ev.id}
                                    className={cn(
                                        'rounded-2xl border p-3.5 space-y-2.5 transition-all shadow-2xs',
                                        isFu
                                            ? 'border-emerald-500/30 bg-emerald-500/5 hover:border-emerald-500/50'
                                            : 'border-indigo-500/30 bg-indigo-500/5 hover:border-indigo-500/50',
                                        isCompleted && 'opacity-60 bg-muted/20 border-border/40'
                                    )}
                                >
                                    {/* Card Header */}
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="space-y-0.5 min-w-0">
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                {isFu ? (
                                                    <Badge className="bg-emerald-600 text-white text-[9px] font-extrabold uppercase py-0.5">
                                                        <PhoneCall className="h-2.5 w-2.5 mr-1" /> Follow-up
                                                    </Badge>
                                                ) : (
                                                    <Badge className="bg-indigo-600 text-white text-[9px] font-extrabold uppercase py-0.5">
                                                        <Video className="h-2.5 w-2.5 mr-1" /> Meeting / {ev.type || 'Demo'}
                                                    </Badge>
                                                )}

                                                {isCompleted ? (
                                                    <span className="text-[9px] font-bold text-slate-500 bg-slate-200 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                                                        ✓ Completed
                                                    </span>
                                                ) : isOverdue ? (
                                                    <span className="text-[9px] font-bold text-rose-600 bg-rose-100 dark:bg-rose-950/40 px-1.5 py-0.5 rounded animate-pulse">
                                                        🚨 Overdue
                                                    </span>
                                                ) : (
                                                    <span className="text-[9px] font-bold text-emerald-700 bg-emerald-100 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded">
                                                        ⏰ Scheduled
                                                    </span>
                                                )}

                                                {ev.stage && (
                                                    <Badge variant="outline" className="text-[9px] font-bold uppercase">
                                                        {ev.stage}
                                                    </Badge>
                                                )}
                                            </div>

                                            <h4 className="font-extrabold text-sm text-foreground pt-1 truncate">
                                                {ev.title}
                                            </h4>
                                        </div>

                                        <div className="text-right shrink-0">
                                            <div className="text-xs font-bold text-foreground">
                                                {format(new Date(ev.startAt), 'h:mm a')}
                                            </div>
                                            {ev.endAt && !isFu && (
                                                <div className="text-[10px] text-muted-foreground">
                                                    until {format(new Date(ev.endAt), 'h:mm a')}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Attribution & Telecaller details */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs text-muted-foreground pt-1">
                                        <div className="flex items-center gap-1.5 truncate">
                                            <User className="h-3.5 w-3.5 text-primary shrink-0" />
                                            <span>Assigned: <strong className="text-foreground">{ev.ownerName || 'Sales Team'}</strong></span>
                                        </div>

                                        {ev.clientName && (
                                            <div className="flex items-center gap-1.5 truncate">
                                                <Building2 className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                                                <span>Client: <strong className="text-foreground">{ev.clientName}</strong></span>
                                            </div>
                                        )}

                                        {ev.phone && (
                                            <div className="flex items-center gap-1.5 truncate">
                                                <Phone className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                                                <a href={`tel:${ev.phone}`} className="font-bold text-primary hover:underline">{ev.phone}</a>
                                                <a
                                                    href={`https://wa.me/${ev.phone.replace(/[^0-9]/g, '')}`}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="text-[10px] bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-bold px-1 rounded hover:underline"
                                                >
                                                    WhatsApp
                                                </a>
                                            </div>
                                        )}

                                        {ev.attendeeNames && ev.attendeeNames.length > 0 && (
                                            <div className="flex items-center gap-1.5 truncate">
                                                <Users className="h-3.5 w-3.5 text-purple-500 shrink-0" />
                                                <span className="truncate">{ev.attendeeNames.join(', ')}</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Last Outcome / Notes */}
                                    {(ev.lastFollowUpOutcome || ev.lastNote || ev.description) && (
                                        <div className="p-2 rounded-xl bg-background/80 border border-border/40 text-xs space-y-1">
                                            {ev.lastFollowUpOutcome && (
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-[10px] uppercase font-bold text-muted-foreground">Last Outcome:</span>
                                                    <Badge variant="outline" className="text-[9px] font-bold bg-muted/40">
                                                        {ev.lastFollowUpOutcome}
                                                    </Badge>
                                                </div>
                                            )}
                                            {(ev.lastNote || ev.description) && (
                                                <p className="text-[11px] text-muted-foreground italic line-clamp-2">
                                                    "{ev.lastNote || ev.description}"
                                                </p>
                                            )}
                                        </div>
                                    )}

                                    {/* Meeting Links & Location */}
                                    {ev.meetingLink && (
                                        <div className="pt-0.5">
                                            <a
                                                href={ev.meetingLink}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline bg-primary/10 px-2.5 py-1 rounded-lg"
                                            >
                                                <Video className="h-3.5 w-3.5 text-primary" /> Join Video Meeting <ExternalLink className="h-3 w-3" />
                                            </a>
                                        </div>
                                    )}

                                    {/* Action Buttons */}
                                    <div className="flex flex-wrap items-center justify-between gap-1.5 pt-2 border-t border-border/40">
                                        <div className="flex gap-1.5">
                                            {/* For follow-up: Log follow-up modal button */}
                                            {isFu && ev.leadId && (
                                                <Button
                                                    size="sm"
                                                    onClick={() => handleOpenFollowUpDialog(ev)}
                                                    className="h-7 px-2.5 rounded-lg text-[10px] font-bold bg-emerald-600 text-white hover:bg-emerald-700 shadow-2xs"
                                                >
                                                    <PhoneCall className="h-3 w-3 mr-1" /> Log Outcome
                                                </Button>
                                            )}

                                            {/* Mark Done button */}
                                            {!isCompleted && (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => markDone(ev._id || ev.id)}
                                                    className="h-7 px-2.5 rounded-lg text-[10px] font-bold hover:bg-emerald-500/10 hover:text-emerald-600 hover:border-emerald-500/30"
                                                >
                                                    <CheckCircle2 className="h-3 w-3 mr-1" /> Mark Done
                                                </Button>
                                            )}

                                            {/* For follow-up: direct link to open lead */}
                                            {isFu && ev.leadId && (
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => navigate('/leads')}
                                                    className="h-7 px-2 rounded-lg text-[10px] font-bold text-muted-foreground hover:text-foreground"
                                                >
                                                    View Lead <ExternalLink className="h-3 w-3 ml-1" />
                                                </Button>
                                            )}

                                            {/* For meeting: edit button */}
                                            {!isFu && !isCompleted && (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => openEdit(ev)}
                                                    className="h-7 px-2.5 rounded-lg text-[10px] font-bold"
                                                >
                                                    Edit
                                                </Button>
                                            )}
                                        </div>

                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => cancelEvent(ev._id || ev.id, isFu)}
                                            className="h-7 w-7 p-0 text-muted-foreground hover:text-rose-600"
                                            title="Cancel"
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>
                                </div>
                            )
                        })}
                    </CardContent>
                </Card>
            </div>

            {/* CREATE / EDIT EVENT DIALOG */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl p-6">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-extrabold flex items-center gap-2">
                            {editing ? 'Edit Event' : form.category === 'followup' ? 'Schedule Follow-up' : 'Schedule Meeting'}
                        </DialogTitle>
                    </DialogHeader>

                    <div className="grid gap-3.5 py-2">
                        {/* Event Category Type */}
                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Event Type</Label>
                            <select
                                className="w-full h-10 rounded-xl border border-border/60 px-3 text-xs font-semibold bg-background"
                                value={form.type}
                                onChange={e => {
                                    const selected = EVENT_TYPES.find(t => t.id === e.target.value)
                                    setForm({ ...form, type: e.target.value, category: selected?.category || 'meeting' })
                                }}
                            >
                                {EVENT_TYPES.map(t => (
                                    <option key={t.id} value={t.id}>{t.label}</option>
                                ))}
                            </select>
                        </div>

                        {/* Title */}
                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Title *</Label>
                            <Input
                                value={form.title}
                                onChange={e => setForm({ ...form, title: e.target.value })}
                                placeholder={form.category === 'followup' ? 'Follow-up with Client / Demo Call' : 'Product Demo / Strategic Discussion'}
                                className="rounded-xl text-xs"
                            />
                        </div>

                        {/* Admin Host / Assignee selection */}
                        {isAdmin && !employeeMode && (
                            <div className="space-y-1.5 p-3 rounded-2xl bg-primary/5 border border-primary/20">
                                <Label className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                                    <ShieldCheck className="h-3.5 w-3.5" /> Assign Host / Responsible Agent
                                </Label>
                                <select
                                    className="w-full h-9 rounded-xl border border-border/60 px-3 text-xs font-semibold bg-background"
                                    value={form.ownerId}
                                    onChange={e => setForm({ ...form, ownerId: e.target.value })}
                                >
                                    <option value={currentUser?._id || (currentUser as any)?.id}>👤 Super Admin (Myself)</option>
                                    <optgroup label="Assign to Team Member">
                                        {users.map(u => (
                                            <option key={u._id} value={u._id}>
                                                {u.name} ({u.role})
                                            </option>
                                        ))}
                                    </optgroup>
                                </select>
                            </div>
                        )}

                        {/* Start & End Times */}
                        <div className="grid grid-cols-2 gap-2.5">
                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Start Date & Time</Label>
                                <Input
                                    type="datetime-local"
                                    value={form.startAt}
                                    onChange={e => setForm({ ...form, startAt: e.target.value })}
                                    className="rounded-xl text-xs"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">End Date & Time</Label>
                                <Input
                                    type="datetime-local"
                                    value={form.endAt}
                                    onChange={e => setForm({ ...form, endAt: e.target.value })}
                                    className="rounded-xl text-xs"
                                />
                            </div>
                        </div>

                        {/* Client Linking */}
                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Link Client (Optional)</Label>
                            <select
                                className="w-full h-10 rounded-xl border border-border/60 px-3 text-xs font-semibold bg-background"
                                value={form.clientId}
                                onChange={e => setForm({ ...form, clientId: e.target.value })}
                            >
                                <option value="">No linked client</option>
                                {clients.map((c: any) => (
                                    <option key={c._id || c.id} value={c._id || c.id}>{c.company || c.name}</option>
                                ))}
                            </select>
                        </div>

                        {/* Invite Team */}
                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Invite Team Members</Label>
                            <div className="max-h-28 overflow-y-auto rounded-2xl border border-border/60 p-2 space-y-1 custom-scrollbar">
                                {users.map(u => {
                                    const id = u._id
                                    const checked = form.attendeeIds.includes(id)
                                    return (
                                        <label key={id} className="flex items-center gap-2 text-xs py-1 px-1 rounded-lg hover:bg-muted/40 cursor-pointer">
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
                                                className="rounded"
                                            />
                                            <span className="font-semibold text-foreground">{u.name} <span className="text-muted-foreground font-normal">({u.role})</span></span>
                                        </label>
                                    )
                                })}
                            </div>
                        </div>

                        {/* Video Link & Location */}
                        <div className="grid grid-cols-2 gap-2.5">
                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Meeting Link</Label>
                                <Input
                                    value={form.meetingLink}
                                    onChange={e => setForm({ ...form, meetingLink: e.target.value })}
                                    placeholder="https://meet.google.com/..."
                                    className="rounded-xl text-xs"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Location</Label>
                                <Input
                                    value={form.location}
                                    onChange={e => setForm({ ...form, location: e.target.value })}
                                    placeholder="Office / Video Call"
                                    className="rounded-xl text-xs"
                                />
                            </div>
                        </div>

                        {/* Reminder & Notes */}
                        <div className="grid grid-cols-2 gap-2.5">
                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Notification Alert</Label>
                                <select
                                    className="w-full h-10 rounded-xl border border-border/60 px-3 text-xs font-semibold bg-background"
                                    value={form.reminderMinutes}
                                    onChange={e => setForm({ ...form, reminderMinutes: Number(e.target.value) })}
                                >
                                    {REMINDER_OPTS.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Notes / Agenda</Label>
                                <Input
                                    value={form.notes}
                                    onChange={e => setForm({ ...form, notes: e.target.value })}
                                    placeholder="Discussion points"
                                    className="rounded-xl text-xs"
                                />
                            </div>
                        </div>

                        <Button onClick={save} disabled={saving} className="w-full mt-2 h-10 rounded-xl font-bold text-xs uppercase tracking-wider">
                            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                            {editing ? 'Update Event' : 'Save & Schedule'}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* DIRECT FOLLOW-UP OUTCOME LOG MODAL */}
            {activeFollowUpLead && (
                <FollowUpDialog
                    lead={activeFollowUpLead}
                    isOpen={isFollowUpModalOpen}
                    onClose={() => {
                        setIsFollowUpModalOpen(false)
                        setActiveFollowUpLead(null)
                    }}
                    stages={stages}
                    onSaveFollowUp={handleSaveFollowUpLog}
                />
            )}
        </div>
    )
}

export default CalendarPage
