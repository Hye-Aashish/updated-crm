import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import {
    Phone, PhoneOff, PhoneCall, MessageSquare, Mail, Calendar,
    CheckCircle2, XCircle, Clock, AlertTriangle, Loader2, UserCheck
} from 'lucide-react'
import type { Lead, PipelineStage } from '@/types'
import { addDays, setHours, setMinutes, format } from 'date-fns'

interface FollowUpDialogProps {
    lead: Lead | null
    isOpen: boolean
    onClose: () => void
    stages: PipelineStage[]
    onSaveFollowUp: (leadId: string, payload: any) => Promise<any>
}

const OUTCOMES = [
    { id: 'connected', label: 'Connected / Successful', icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30' },
    { id: 'call_connected', label: 'Call Connected', icon: PhoneCall, color: 'text-blue-600 bg-blue-50 border-blue-200 dark:bg-blue-950/30' },
    { id: 'call_not_answered', label: 'Call Not Answered', icon: PhoneOff, color: 'text-rose-600 bg-rose-50 border-rose-200 dark:bg-rose-950/30' },
    { id: 'busy', label: 'Busy', icon: AlertTriangle, color: 'text-amber-600 bg-amber-50 border-amber-200 dark:bg-amber-950/30' },
    { id: 'call_back_later', label: 'Call Back Later', icon: Clock, color: 'text-purple-600 bg-purple-50 border-purple-200 dark:bg-purple-950/30' },
    { id: 'whatsapp_sent', label: 'WhatsApp Sent', icon: MessageSquare, color: 'text-green-600 bg-green-50 border-green-200 dark:bg-green-950/30' },
    { id: 'email_sent', label: 'Email Sent', icon: Mail, color: 'text-cyan-600 bg-cyan-50 border-cyan-200 dark:bg-cyan-950/30' },
    { id: 'meeting_scheduled', label: 'Meeting Scheduled', icon: Calendar, color: 'text-indigo-600 bg-indigo-50 border-indigo-200 dark:bg-indigo-950/30' },
    { id: 'not_interested', label: 'Not Interested', icon: XCircle, color: 'text-slate-600 bg-slate-50 border-slate-200 dark:bg-slate-900/30' },
    { id: 'follow_up_required', label: 'Follow-up Required', icon: UserCheck, color: 'text-amber-700 bg-amber-100 border-amber-300 dark:bg-amber-900/30' },
]

export function FollowUpDialog({ lead, isOpen, onClose, stages, onSaveFollowUp }: FollowUpDialogProps) {
    const [outcome, setOutcome] = useState<string>('call_connected')
    const [note, setNote] = useState<string>('')
    const [hasNextFollowUp, setHasNextFollowUp] = useState<boolean>(true)
    const [nextDate, setNextDate] = useState<string>('')
    const [reminderMinutes, setReminderMinutes] = useState<number>(30)
    const [reminderTone, setReminderTone] = useState<string>('default')
    const [followUpType, setFollowUpType] = useState<string>('call')
    const [newStage, setNewStage] = useState<string>('')
    const [saving, setSaving] = useState<boolean>(false)

    // Pre-fill defaults when dialog opens or lead changes
    useEffect(() => {
        if (isOpen && lead) {
            setOutcome('call_connected')
            setNote('')
            setHasNextFollowUp(true)
            setFollowUpType('call')
            setReminderMinutes(30)
            setReminderTone('default')
            setNewStage(lead.stage || (stages[0]?.id || 'new'))

            // Default next follow-up: Tomorrow 11:30 AM
            const defaultNext = setMinutes(setHours(addDays(new Date(), 1), 11), 30)
            const localIso = new Date(defaultNext.getTime() - (defaultNext.getTimezoneOffset() * 60000)).toISOString().slice(0, 16)
            setNextDate(localIso)
        }
    }, [isOpen, lead, stages])

    // Special auto-handling when Outcome changes
    const handleOutcomeSelect = (selectedId: string) => {
        setOutcome(selectedId)

        if (selectedId === 'call_not_answered' || selectedId === 'busy' || selectedId === 'call_back_later') {
            setHasNextFollowUp(true)
            setFollowUpType('call')
            // Pre-fill tomorrow 11:30 AM for call not answered
            const tomorrow1130 = setMinutes(setHours(addDays(new Date(), 1), 11), 30)
            const localIso = new Date(tomorrow1130.getTime() - (tomorrow1130.getTimezoneOffset() * 60000)).toISOString().slice(0, 16)
            setNextDate(localIso)
        } else if (selectedId === 'not_interested') {
            setHasNextFollowUp(false)
            const closedOrLost = stages.find(s => s.id.includes('closed') || s.label.toLowerCase().includes('closed') || s.label.toLowerCase().includes('lost'))?.id || lead?.stage || 'closed'
            setNewStage(closedOrLost)
        }
    }

    const setQuickPreset = (daysAhead: number, hour: number = 10) => {
        const target = setMinutes(setHours(addDays(new Date(), daysAhead), hour), 0)
        const localIso = new Date(target.getTime() - (target.getTimezoneOffset() * 60000)).toISOString().slice(0, 16)
        setNextDate(localIso)
    }

    const handleSubmit = async () => {
        if (!lead) return
        setSaving(true)
        try {
            const selectedOutcomeObj = OUTCOMES.find(o => o.id === outcome)
            const payload = {
                outcome: selectedOutcomeObj?.label || outcome,
                note: note.trim(),
                followUpType,
                nextFollowUpDate: hasNextFollowUp && nextDate ? new Date(nextDate) : null,
                reminderMinutes,
                reminderTone,
                noNextFollowUp: !hasNextFollowUp,
                newStage: !hasNextFollowUp ? newStage : undefined
            }

            const result = await onSaveFollowUp(lead.id, payload)
            if (result) {
                onClose()
            }
        } finally {
            setSaving(false)
        }
    }

    if (!lead) return null

    return (
        <Dialog open={isOpen} onOpenChange={(v) => !v && onClose()}>
            <DialogContent className="max-w-lg rounded-2xl p-6 gap-5 max-h-[92vh] overflow-y-auto custom-scrollbar">
                <DialogHeader className="space-y-1">
                    <DialogTitle className="text-xl font-bold flex items-center justify-between">
                        <span>Log Follow-up Interaction</span>
                    </DialogTitle>
                    <DialogDescription className="text-xs text-muted-foreground font-medium">
                        Recording follow-up for <strong className="text-foreground">{lead.name}</strong> ({lead.company})
                    </DialogDescription>
                </DialogHeader>

                {/* 1. Outcome Selection */}
                <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-primary">
                        1. Follow-up Outcome *
                    </Label>
                    <div className="grid grid-cols-2 gap-2">
                        {OUTCOMES.map((o) => {
                            const Icon = o.icon
                            const isSelected = outcome === o.id
                            return (
                                <button
                                    key={o.id}
                                    type="button"
                                    onClick={() => handleOutcomeSelect(o.id)}
                                    className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-semibold transition-all text-left ${
                                        isSelected
                                            ? `${o.color} ring-2 ring-primary shadow-sm`
                                            : 'bg-card border-border/60 hover:bg-muted/40 text-foreground'
                                    }`}
                                >
                                    <Icon className={`h-4 w-4 shrink-0 ${isSelected ? '' : 'text-muted-foreground'}`} />
                                    <span className="truncate">{o.label}</span>
                                </button>
                            )
                        })}
                    </div>
                </div>

                {/* 2. Interaction Note */}
                <div className="space-y-1.5">
                    <Label className="text-xs font-bold uppercase tracking-wider text-primary">
                        2. Interaction Notes
                    </Label>
                    <Textarea
                        placeholder="e.g. Discussed pricing details. Customer requested brochure via WhatsApp..."
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        className="min-h-[80px] text-xs rounded-xl border-border/60 focus:border-primary"
                    />
                </div>

                {/* 3. Next Follow-up Choice */}
                <div className="space-y-3 pt-3 border-t border-border/40">
                    <div className="flex items-center justify-between">
                        <Label className="text-xs font-bold uppercase tracking-wider text-primary">
                            3. Set Next Follow-up?
                        </Label>
                        <div className="flex bg-muted rounded-lg p-1 text-xs font-semibold">
                            <button
                                type="button"
                                onClick={() => setHasNextFollowUp(true)}
                                className={`px-3 py-1 rounded-md transition-all ${hasNextFollowUp ? 'bg-background shadow text-primary font-bold' : 'text-muted-foreground'}`}
                            >
                                Yes (Schedule Date)
                            </button>
                            <button
                                type="button"
                                onClick={() => setHasNextFollowUp(false)}
                                className={`px-3 py-1 rounded-md transition-all ${!hasNextFollowUp ? 'bg-background shadow text-primary font-bold' : 'text-muted-foreground'}`}
                            >
                                No (Close/Finish)
                            </button>
                        </div>
                    </div>

                    {hasNextFollowUp ? (
                        <div className="space-y-3 bg-muted/30 p-4 rounded-xl border border-border/50 animate-in fade-in duration-200">
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold">Next Follow-up Date & Time</Label>
                                <Input
                                    type="datetime-local"
                                    value={nextDate}
                                    onChange={(e) => setNextDate(e.target.value)}
                                    className="h-10 rounded-lg text-xs font-semibold bg-background"
                                />
                            </div>

                            {/* Quick Presets */}
                            <div className="flex flex-wrap gap-1.5">
                                <Button type="button" variant="outline" size="sm" onClick={() => setQuickPreset(1, 11)} className="h-7 text-[10px] font-bold rounded-lg">
                                    Tomorrow 11 AM
                                </Button>
                                <Button type="button" variant="outline" size="sm" onClick={() => setQuickPreset(2, 15)} className="h-7 text-[10px] font-bold rounded-lg">
                                    In 2 Days (3 PM)
                                </Button>
                                <Button type="button" variant="outline" size="sm" onClick={() => setQuickPreset(7, 11)} className="h-7 text-[10px] font-bold rounded-lg">
                                    Next Week
                                </Button>
                            </div>

                            <div className="grid grid-cols-2 gap-3 pt-1">
                                <div className="space-y-1">
                                    <Label className="text-[11px] font-semibold text-muted-foreground">Follow-up Mode</Label>
                                    <Select value={followUpType} onValueChange={setFollowUpType}>
                                        <SelectTrigger className="h-8 text-xs font-semibold bg-background">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="call" className="text-xs font-semibold">📞 Phone Call</SelectItem>
                                            <SelectItem value="whatsapp" className="text-xs font-semibold">💬 WhatsApp</SelectItem>
                                            <SelectItem value="email" className="text-xs font-semibold">📧 Email</SelectItem>
                                            <SelectItem value="meeting" className="text-xs font-semibold">📝 Meeting</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-1">
                                    <Label className="text-[11px] font-semibold text-muted-foreground">Reminder Notification</Label>
                                    <Select value={String(reminderMinutes)} onValueChange={(v) => setReminderMinutes(Number(v))}>
                                        <SelectTrigger className="h-8 text-xs font-semibold bg-background">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="15" className="text-xs font-semibold">15 Minutes Before</SelectItem>
                                            <SelectItem value="30" className="text-xs font-semibold">30 Minutes Before</SelectItem>
                                            <SelectItem value="60" className="text-xs font-semibold">1 Hour Before</SelectItem>
                                            <SelectItem value="1440" className="text-xs font-semibold">1 Day Before</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-2 bg-muted/30 p-4 rounded-xl border border-border/50 animate-in fade-in duration-200">
                            <Label className="text-xs font-semibold">Update Lead Stage / Status</Label>
                            <Select value={newStage} onValueChange={setNewStage}>
                                <SelectTrigger className="h-9 text-xs font-semibold bg-background">
                                    <SelectValue placeholder="Select Stage" />
                                </SelectTrigger>
                                <SelectContent>
                                    {stages.map((stage) => (
                                        <SelectItem key={stage.id} value={stage.id} className="text-xs font-semibold">
                                            {stage.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                </div>

                {/* Footer Buttons */}
                <div className="flex justify-end gap-2 pt-2 border-t border-border/40">
                    <Button variant="ghost" size="sm" onClick={onClose} disabled={saving} className="h-9 px-4 font-semibold text-xs">
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit} disabled={saving} className="h-9 px-5 font-bold text-xs bg-primary text-primary-foreground shadow-md hover:bg-primary/90">
                        {saving && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
                        Save Follow-up
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
