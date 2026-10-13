import React, { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
    Calendar as CalendarIcon, 
    ChevronLeft, 
    ChevronRight, 
    Clock, 
    User, 
    Phone, 
    CheckCircle2, 
    XCircle, 
    RotateCcw, 
    CalendarCheck, 
    Plus,
    ExternalLink
} from 'lucide-react'
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isToday } from 'date-fns'
import api from '@/lib/api-client'
import { useNavigate } from 'react-router-dom'

interface SalesCalendarProps {
    agents: any[]
    isPersonalView?: boolean
}

export function SalesCalendar({ agents, isPersonalView = false }: SalesCalendarProps) {
    const navigate = useNavigate()
    const [currentMonth, setCurrentMonth] = useState<Date>(new Date())
    const [selectedDate, setSelectedDate] = useState<Date>(new Date())
    const [calendarItems, setCalendarItems] = useState<any[]>([])
    const [loading, setLoading] = useState<boolean>(false)
    const [selectedAgent, setSelectedAgent] = useState<string>('all')
    const [typeFilter, setTypeFilter] = useState<string>('all')

    const fetchCalendarData = async () => {
        try {
            setLoading(true)
            const monthStart = startOfMonth(currentMonth)
            const monthEnd = endOfMonth(currentMonth)

            const params = new URLSearchParams()
            params.append('startDate', monthStart.toISOString())
            params.append('endDate', monthEnd.toISOString())
            if (selectedAgent !== 'all') params.append('agentId', selectedAgent)
            if (typeFilter !== 'all') params.append('type', typeFilter)

            const res = await api.get(`/sales-analytics/calendar?${params.toString()}`)
            setCalendarItems(res.data?.items || [])
        } catch (err) {
            console.error('Error fetching calendar data:', err)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchCalendarData()
    }, [currentMonth, selectedAgent, typeFilter])

    // Generate days for current month grid
    const monthStart = startOfMonth(currentMonth)
    const monthEnd = endOfMonth(currentMonth)
    const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd })

    // Find items for a given day
    const getItemsForDay = (day: Date) => {
        return calendarItems.filter(item => isSameDay(new Date(item.scheduledAt), day))
    }

    // Items for selected date
    const selectedDayItems = getItemsForDay(selectedDate)

    const handleStatusChange = async (meetingId: string, newStatus: string) => {
        try {
            await api.put(`/sales-analytics/meetings/${meetingId}`, { status: newStatus })
            fetchCalendarData()
        } catch (err) {
            console.error('Failed to update meeting status:', err)
        }
    }

    return (
        <Card className="p-5 rounded-3xl border border-border/50 bg-card shadow-xs space-y-5">
            {/* Calendar Header & Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/40">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                        <CalendarCheck className="h-5 w-5" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="font-bold text-base text-foreground">
                                Sales Calendar & Follow-up Agenda
                            </h3>
                            <Badge className="bg-primary/15 text-primary border-primary/30 text-[9px] font-bold">
                                {calendarItems.length} Events
                            </Badge>
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                            Scheduled discovery meetings, client calls, and timed lead follow-ups
                        </p>
                    </div>
                </div>

                {/* Month navigation & Filters */}
                <div className="flex flex-wrap items-center gap-2">
                    {!isPersonalView && agents && agents.length > 1 && (
                        <Select value={selectedAgent} onValueChange={setSelectedAgent}>
                            <SelectTrigger className="h-8 w-36 text-xs font-semibold rounded-xl border-border/60">
                                <SelectValue placeholder="All Agents" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all" className="text-xs font-semibold">All Agents</SelectItem>
                                {agents.map((ag) => (
                                    <SelectItem key={ag.userId || ag.name} value={ag.userId || ag.name} className="text-xs font-semibold">
                                        {ag.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}

                    <Select value={typeFilter} onValueChange={setTypeFilter}>
                        <SelectTrigger className="h-8 w-32 text-xs font-semibold rounded-xl border-border/60">
                            <SelectValue placeholder="All Activities" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all" className="text-xs font-semibold">All Activities</SelectItem>
                            <SelectItem value="meeting" className="text-xs font-semibold">Meetings Only</SelectItem>
                            <SelectItem value="followup" className="text-xs font-semibold">Follow-ups Only</SelectItem>
                        </SelectContent>
                    </Select>

                    <div className="flex items-center gap-1 bg-muted/40 p-1 rounded-xl border border-border/40">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                            className="h-6 w-6 rounded-lg text-muted-foreground hover:text-foreground"
                        >
                            <ChevronLeft className="h-3.5 w-3.5" />
                        </Button>
                        <span className="text-xs font-bold px-2 text-foreground min-w-[90px] text-center">
                            {format(currentMonth, 'MMMM yyyy')}
                        </span>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                            className="h-6 w-6 rounded-lg text-muted-foreground hover:text-foreground"
                        >
                            <ChevronRight className="h-3.5 w-3.5" />
                        </Button>
                    </div>
                </div>
            </div>

            {/* Calendar Main Grid & Selected Day Agenda (2-column layout) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                {/* 1. Month Days Grid (7 cols) */}
                <div className="lg:col-span-7 space-y-2">
                    <div className="grid grid-cols-7 gap-1 text-center text-[10px] uppercase font-bold text-muted-foreground pb-1">
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                            <div key={d}>{d}</div>
                        ))}
                    </div>

                    <div className="grid grid-cols-7 gap-1.5">
                        {daysInMonth.map(day => {
                            const items = getItemsForDay(day)
                            const isSel = isSameDay(day, selectedDate)
                            const isCurrent = isToday(day)
                            const hasMeetings = items.some(i => i.type === 'meeting')
                            const hasFollowups = items.some(i => i.type === 'followup')

                            return (
                                <button
                                    key={day.toISOString()}
                                    type="button"
                                    onClick={() => setSelectedDate(day)}
                                    className={`min-h-[64px] p-1.5 rounded-xl border transition-all text-left flex flex-col justify-between ${
                                        isSel 
                                            ? 'bg-primary/10 border-primary shadow-xs ring-1 ring-primary'
                                            : isCurrent
                                                ? 'bg-blue-500/5 border-blue-500/40 text-foreground'
                                                : 'bg-card border-border/40 hover:bg-muted/40 text-foreground'
                                    }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <span className={`text-[11px] font-bold ${isCurrent ? 'text-blue-600 dark:text-blue-400' : 'text-foreground'}`}>
                                            {format(day, 'd')}
                                        </span>
                                        {items.length > 0 && (
                                            <span className="text-[9px] font-black px-1 rounded-full bg-primary/20 text-primary">
                                                {items.length}
                                            </span>
                                        )}
                                    </div>

                                    {/* Mini indicators */}
                                    <div className="flex flex-wrap gap-1 mt-1">
                                        {hasMeetings && (
                                            <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" title="Meetings" />
                                        )}
                                        {hasFollowups && (
                                            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" title="Follow-ups" />
                                        )}
                                    </div>
                                </button>
                            )
                        })}
                    </div>
                </div>

                {/* 2. Selected Day Timeline / Agenda (5 cols) */}
                <div className="lg:col-span-5 bg-muted/20 border border-border/40 rounded-2xl p-4 space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-border/30">
                        <div>
                            <span className="text-xs font-bold text-foreground block">
                                Agenda for {format(selectedDate, 'EEEE, dd MMMM')}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                                {selectedDayItems.length} activity item(s) scheduled
                            </span>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate('/leads')}
                            className="h-7 text-[10px] font-bold rounded-lg border-border/60 hover:bg-primary hover:text-white"
                        >
                            <Plus className="h-3 w-3 mr-1" /> New Follow-up
                        </Button>
                    </div>

                    <div className="space-y-2 max-h-[360px] overflow-y-auto custom-scrollbar pr-1">
                        {selectedDayItems.length > 0 ? (
                            selectedDayItems.map(item => (
                                <div
                                    key={item.id}
                                    className="p-3 rounded-xl bg-card border border-border/50 shadow-2xs space-y-2"
                                >
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-1.5">
                                            {item.type === 'meeting' ? (
                                                <Badge className="bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30 text-[9px] font-bold">
                                                    Meeting
                                                </Badge>
                                            ) : (
                                                <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 text-[9px] font-bold">
                                                    Follow-up
                                                </Badge>
                                            )}
                                            <span className="text-[10px] text-muted-foreground font-semibold flex items-center gap-1">
                                                <Clock className="h-3 w-3" />
                                                {format(new Date(item.scheduledAt), 'hh:mm a')}
                                            </span>
                                        </div>

                                        <Badge variant="outline" className="text-[9px] font-bold capitalize">
                                            {item.status}
                                        </Badge>
                                    </div>

                                    <div>
                                        <span className="font-bold text-xs text-foreground block">
                                            {item.title}
                                        </span>
                                        {item.ownerName && (
                                            <span className="text-[10px] text-muted-foreground block">
                                                Assigned: <strong className="text-foreground">{item.ownerName}</strong>
                                            </span>
                                        )}
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex items-center justify-between pt-1 border-t border-border/20 text-xs">
                                        {item.meetingId && item.status === 'scheduled' ? (
                                            <div className="flex items-center gap-1">
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => handleStatusChange(item.meetingId, 'completed')}
                                                    className="h-6 px-2 text-[10px] font-bold text-emerald-600 hover:bg-emerald-50"
                                                >
                                                    <CheckCircle2 className="h-3 w-3 mr-1" /> Mark Done
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => handleStatusChange(item.meetingId, 'no_show')}
                                                    className="h-6 px-2 text-[10px] font-bold text-rose-600 hover:bg-rose-50"
                                                >
                                                    <XCircle className="h-3 w-3 mr-1" /> No-Show
                                                </Button>
                                            </div>
                                        ) : (
                                            <span className="text-[10px] text-muted-foreground">
                                                {item.phone || 'Lead Contact'}
                                            </span>
                                        )}

                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => navigate('/leads')}
                                            className="h-6 px-2 text-[10px] font-bold text-primary hover:bg-primary/10 ml-auto"
                                        >
                                            View Lead <ExternalLink className="h-2.5 w-2.5 ml-1" />
                                        </Button>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="py-10 text-center text-xs text-muted-foreground italic space-y-1">
                                <p>No events or follow-ups scheduled for this day.</p>
                                <p className="text-[10px]">Click any date with activity or schedule a new interaction from the Leads board.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </Card>
    )
}
