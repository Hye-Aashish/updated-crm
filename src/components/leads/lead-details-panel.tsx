import { useState, useEffect } from 'react'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
    Bell, Trash2, Edit2, Check, X, Star, MessageSquare, PhoneCall,
    Clock, Calendar, UserCheck, AlertTriangle, PhoneOff, Mail, CheckCircle2, Loader2
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import type { Lead, PipelineStage } from '@/types'
import api from '@/lib/api-client'
import { useToast } from '@/hooks/use-toast'
import { mapLead } from '@/lib/mappers'
import { format } from 'date-fns'

interface LeadDetailsPanelProps {
    lead: Lead
    stages?: PipelineStage[]
    onUpdate: (updatedLead: Lead) => void
    onOpenFollowUp?: (lead: Lead) => void
    onDelete: (leadId: string) => void
    onAddActivity: (leadId: string, content: string) => Promise<any>
}

function ActivityItem({ activity }: { activity: any }) {
    const [expanded, setExpanded] = useState(false)
    const isWhatsApp = activity.content?.includes('[WhatsApp]') || activity.content?.toLowerCase().includes('whatsapp') || activity.outcome?.toLowerCase().includes('whatsapp')
    const isLong = activity.content?.length > 150 || (activity.content?.match(/\n/g) || []).length >= 3

    const outcomeText = activity.outcome || activity.type || 'Interaction'
    
    let Icon = PhoneCall
    let badgeColor = 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20'

    if (outcomeText.includes('Not Answered')) {
        Icon = PhoneOff
        badgeColor = 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20'
    } else if (outcomeText.includes('WhatsApp')) {
        Icon = MessageSquare
        badgeColor = 'bg-green-500/10 text-green-700 dark:text-green-300 border-green-500/20'
    } else if (outcomeText.includes('Email')) {
        Icon = Mail
        badgeColor = 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-500/20'
    } else if (outcomeText.includes('Meeting')) {
        Icon = Calendar
        badgeColor = 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/20'
    } else if (outcomeText.includes('Connected') || outcomeText.includes('Successful')) {
        Icon = CheckCircle2
        badgeColor = 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20'
    } else if (outcomeText.includes('Busy') || outcomeText.includes('Later')) {
        Icon = Clock
        badgeColor = 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20'
    }

    return (
        <div className="p-3.5 rounded-xl border border-border/40 bg-card/60 space-y-2 relative hover:bg-muted/20 transition-colors">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Badge variant="outline" className={`text-[10px] font-bold px-2 py-0.5 border flex items-center gap-1.5 ${badgeColor}`}>
                        <Icon className="h-3 w-3" />
                        <span>{outcomeText}</span>
                    </Badge>
                    {activity.createdByName && (
                        <span className="text-[10px] font-bold text-muted-foreground">
                            by {activity.createdByName}
                        </span>
                    )}
                </div>
                <span className="text-[10px] font-semibold text-muted-foreground uppercase">
                    {activity.createdAt ? format(new Date(activity.createdAt), 'MMM d, h:mm a') : ''}
                </span>
            </div>

            <p className={`text-xs font-medium text-foreground break-words whitespace-pre-wrap leading-relaxed ${!expanded && isLong ? 'line-clamp-3' : ''}`}>
                {activity.content}
            </p>

            {isLong && (
                <button
                    onClick={() => setExpanded(!expanded)}
                    className="text-[10px] text-primary font-bold hover:underline uppercase tracking-wider self-start"
                >
                    {expanded ? 'Show Less' : 'Read More'}
                </button>
            )}

            {activity.nextFollowUpDate && (
                <div className="pt-2 border-t border-border/20 flex items-center gap-1.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                    <Clock className="h-3 w-3" />
                    <span>Next Follow-up set for: {format(new Date(activity.nextFollowUpDate), 'MMM d, yyyy h:mm a')}</span>
                </div>
            )}
        </div>
    )
}

export function LeadDetailsPanel({ lead, stages, onUpdate, onOpenFollowUp, onDelete, onAddActivity }: LeadDetailsPanelProps) {
    const { toast } = useToast()
    const [newActivityContent, setNewActivityContent] = useState('')
    const [reminderDate, setReminderDate] = useState('')
    const [reminderTone, setReminderTone] = useState('default')
    const [newTagInput, setNewTagInput] = useState('')
    const [savingNote, setSavingNote] = useState(false)
    
    const [isEditing, setIsEditing] = useState(false)
    const [editForm, setEditForm] = useState<Partial<Lead>>(lead)

    useEffect(() => {
        setEditForm(lead)
        setIsEditing(false)
    }, [lead])

    useEffect(() => {
        if (lead?.reminder?.date) {
            try {
                const date = new Date(lead.reminder.date)
                const localIso = new Date(date.getTime() - (date.getTimezoneOffset() * 60000)).toISOString().slice(0, 16)
                setReminderDate(localIso)
                setReminderTone(lead.reminder.tone || 'default')
            } catch (e) {
                setReminderDate('')
            }
        } else {
            setReminderDate('')
            setReminderTone('default')
        }
    }, [lead])

    const handleSetReminder = async () => {
        const targetId = lead?.id || lead?._id
        if (!targetId || !reminderDate) return
        try {
            const payload = {
                reminder: {
                    date: new Date(reminderDate),
                    tone: reminderTone,
                    completed: false
                }
            }
            await api.put(`/leads/${targetId}`, payload)
            onUpdate({ ...lead, reminder: payload.reminder })
            toast({ description: "Reminder set successfully" })
        } catch (error) {
            console.error("Set Reminder Error:", error)
            toast({ title: "Error", description: "Failed to set reminder", variant: "destructive" })
        }
    }

    const handleSaveEdit = async () => {
        const targetId = lead?.id || lead?._id
        if (!targetId) return
        try {
            const payload = {
                name: editForm.name,
                company: editForm.company,
                value: editForm.value,
                source: editForm.source,
                email: editForm.email,
                phone: editForm.phone,
                project: editForm.project,
                customFields: editForm.customFields
            }
            const res = await api.put(`/leads/${targetId}`, payload)
            onUpdate(mapLead(res.data))
            setIsEditing(false)
            toast({ description: "Lead updated successfully" })
        } catch (error) {
            console.error("Update Lead Error:", error)
            toast({ title: "Error", description: "Failed to update lead", variant: "destructive" })
        }
    }

    const handleAddNote = async () => {
        const targetId = lead?.id || lead?._id
        if (!targetId || !newActivityContent.trim()) return
        setSavingNote(true)
        try {
            const updatedLead = await onAddActivity(targetId, newActivityContent)
            if (updatedLead) {
                onUpdate(updatedLead)
                setNewActivityContent('')
            }
        } catch (error) {
            console.error("Add Note Error:", error)
        } finally {
            setSavingNote(false)
        }
    }

    const handleAddTag = async () => {
        const targetId = lead?.id || lead?._id
        if (!newTagInput.trim() || !targetId) return
        const cleanTag = newTagInput.trim().toUpperCase()
        if ((lead.tags || []).includes(cleanTag)) {
            setNewTagInput('')
            return
        }
        const updatedTags = [...(lead.tags || []), cleanTag]
        try {
            const res = await api.put(`/leads/${targetId}`, { tags: updatedTags })
            onUpdate(mapLead(res.data))
            setNewTagInput('')
            toast({ description: `Tag "${cleanTag}" added` })
        } catch (err) {
            console.error("Add Tag Error:", err)
            toast({ title: "Error", description: "Failed to add tag", variant: "destructive" })
        }
    }

    const handleRemoveTag = async (tagToRemove: string) => {
        const targetId = lead?.id || lead?._id
        if (!targetId) return
        const updatedTags = (lead.tags || []).filter(t => t !== tagToRemove)
        try {
            const res = await api.put(`/leads/${targetId}`, { tags: updatedTags })
            onUpdate(mapLead(res.data))
            toast({ description: `Tag "${tagToRemove}" removed` })
        } catch (err) {
            console.error("Remove Tag Error:", err)
            toast({ title: "Error", description: "Failed to remove tag", variant: "destructive" })
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-row items-center justify-between border-b pb-4 gap-2">
                <div className="flex flex-col">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        {lead.company}
                    </h2>
                    <div className="flex items-center gap-1 mt-1" title="Lead Rating">
                        {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                                key={star}
                                className={`h-3.5 w-3.5 ${
                                    star <= (lead.rating || 0) 
                                    ? 'fill-yellow-400 text-yellow-500' 
                                    : 'text-muted-foreground/30'
                                }`}
                            />
                        ))}
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {onOpenFollowUp && (
                        <Button
                            onClick={() => onOpenFollowUp(lead)}
                            className="h-9 px-4 font-bold text-xs bg-primary text-primary-foreground hover:bg-primary/90 shadow-md rounded-xl"
                        >
                            <PhoneCall className="mr-1.5 h-3.5 w-3.5" />
                            Log Follow-up
                        </Button>
                    )}

                    {isEditing ? (
                        <>
                            <Button variant="ghost" size="icon" onClick={() => { setIsEditing(false); setEditForm(lead) }} className="text-muted-foreground hover:bg-muted">
                                <X className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={handleSaveEdit} className="text-green-600 hover:bg-green-50 hover:text-green-700">
                                <Check className="h-4 w-4" />
                            </Button>
                        </>
                    ) : (
                        <>
                            <Button variant="ghost" size="icon" onClick={() => setIsEditing(true)} className="text-muted-foreground hover:bg-muted">
                                <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => onDelete(lead.id)} className="text-destructive hover:bg-destructive/10">
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </>
                    )}
                </div>
            </div>

            {/* AI Priority Banner */}
            {lead.aiPriority && (
                <div className={`p-4 rounded-xl border flex flex-col gap-1.5 backdrop-blur-md text-xs font-sans ${
                    lead.aiPriority === 'green'
                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-400'
                        : lead.aiPriority === 'yellow'
                        ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-700 dark:text-yellow-400'
                        : 'bg-red-500/10 border-red-500/20 text-red-700 dark:text-red-400'
                }`}>
                    <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${
                            lead.aiPriority === 'green' ? 'bg-emerald-500' : lead.aiPriority === 'yellow' ? 'bg-yellow-500' : 'bg-red-500'
                        }`} />
                        <span className="font-bold uppercase tracking-wider text-[10px]">AI Priority Insights</span>
                    </div>
                    <p className="font-semibold leading-relaxed mt-0.5">{lead.aiPriorityReason || 'No interaction insights available.'}</p>
                </div>
            )}

            <div className="grid grid-cols-2 gap-4 bg-muted/30 p-4 rounded-xl border border-border/50">
                <div>
                    <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Contact Name</Label>
                    {isEditing ? <Input value={editForm.name || ''} onChange={e => setEditForm({...editForm, name: e.target.value})} className="h-7 text-sm font-semibold mt-1" /> : <p className="font-semibold">{lead.name}</p>}
                </div>
                <div>
                    <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Project</Label>
                    {isEditing ? <Input value={editForm.project || ''} onChange={e => setEditForm({...editForm, project: e.target.value})} placeholder="e.g. Website" className="h-7 text-sm font-semibold mt-1" /> : <p className="font-semibold text-primary">{lead.project || '-'}</p>}
                </div>
                <div>
                    <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Company</Label>
                    {isEditing ? <Input value={editForm.company || ''} onChange={e => setEditForm({...editForm, company: e.target.value})} className="h-7 text-sm font-semibold mt-1" /> : <p className="font-semibold">{lead.company}</p>}
                </div>
                <div>
                    <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Deal Value</Label>
                    {isEditing ? <Input type="number" value={editForm.value || ''} onChange={e => setEditForm({...editForm, value: Number(e.target.value)})} className="h-7 text-sm font-semibold mt-1" /> : <p className="font-bold text-emerald-600 text-lg">{formatCurrency(lead.value)}</p>}
                </div>
                <div>
                    <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Source</Label>
                    {isEditing ? <Input value={editForm.source || ''} onChange={e => setEditForm({...editForm, source: e.target.value})} className="h-7 text-sm font-semibold mt-1" /> : <div className="mt-1"><Badge variant="secondary" className="font-bold text-[10px] uppercase tracking-wide">{lead.source}</Badge></div>}
                </div>
                <div>
                    <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Email</Label>
                    {isEditing ? <Input value={editForm.email || ''} onChange={e => setEditForm({...editForm, email: e.target.value})} className="h-7 text-sm font-medium mt-1" /> : <p className="font-medium text-sm truncate">{lead.email || '-'}</p>}
                </div>
                <div>
                    <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Phone</Label>
                    {isEditing ? (
                        <Input value={editForm.phone || ''} onChange={e => setEditForm({...editForm, phone: e.target.value})} className="h-7 text-sm font-medium mt-1" />
                    ) : (
                        <div className="flex items-center gap-2 mt-1">
                            <p className="font-medium text-sm">{lead.phone || '-'}</p>
                            {lead.phone && (
                                <a
                                    href={`https://wa.me/${String(lead.phone).replace(/\D/g, '')}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1 text-[10px] font-bold bg-green-500/10 text-green-600 hover:bg-green-500 hover:text-white px-2 py-0.5 rounded-full transition-all border border-green-500/30"
                                >
                                    <MessageSquare className="h-3 w-3" />
                                    <span>WhatsApp</span>
                                </a>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Follow-up Summary Banner */}
            {lead.lastFollowUpOutcome && (
                <div className="p-3.5 bg-card border border-border/60 rounded-xl space-y-1">
                    <div className="flex items-center justify-between">
                        <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Last Interaction Summary</Label>
                        <Badge variant="outline" className="text-[10px] font-bold">
                            {lead.lastFollowUpOutcome}
                        </Badge>
                    </div>
                    {lead.lastNote && (
                        <p className="text-xs font-semibold text-foreground">"{lead.lastNote}"</p>
                    )}
                    {lead.lastFollowUpDate && (
                        <p className="text-[10px] text-muted-foreground">Logged on {format(new Date(lead.lastFollowUpDate), 'MMM d, yyyy h:mm a')}</p>
                    )}
                </div>
            )}

            {/* Tag Editor Section */}
            <div className="p-4 bg-muted/20 border border-border/40 rounded-xl space-y-2">
                <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Lead Tags</Label>
                <div className="flex flex-wrap gap-2 items-center">
                    {(lead.tags || []).map((tag) => (
                        <Badge key={tag} variant="secondary" className="flex items-center gap-1 font-bold text-[10px] uppercase tracking-wide py-1 px-2.5 bg-secondary text-secondary-foreground border border-border/60">
                            {tag}
                            <button onClick={() => handleRemoveTag(tag)} className="text-muted-foreground hover:text-foreground text-[10px] ml-1 font-bold">×</button>
                        </Badge>
                    ))}
                    <input
                        type="text"
                        placeholder="+ Add tag (Enter)"
                        value={newTagInput}
                        onChange={(e) => setNewTagInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault()
                                handleAddTag()
                            }
                        }}
                        onBlur={() => {
                            if (newTagInput.trim()) handleAddTag()
                        }}
                        className="border border-border/50 bg-transparent text-xs rounded-md px-2 py-0.5 outline-none focus:border-primary/50 w-28"
                    />
                </div>
            </div>

            {/* Next Follow-up Quick Setter */}
            <div className="space-y-4 pt-4 border-t">
                <h4 className="font-bold text-sm flex items-center gap-2">
                    <Bell className="h-4 w-4 text-primary" />
                    Scheduled Next Follow-up
                </h4>
                <div className="grid grid-cols-2 gap-4 items-end">
                    <div className="space-y-2">
                        <Label className="text-xs font-semibold">Follow-up Date & Time</Label>
                        <Input type="datetime-local" value={reminderDate} onChange={(e) => setReminderDate(e.target.value)} className="h-9 rounded-lg text-xs font-semibold" />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-xs font-semibold">Notification Tone</Label>
                        <Select value={reminderTone} onValueChange={setReminderTone}>
                            <SelectTrigger className="h-9 rounded-lg text-xs font-semibold">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="default" className="text-xs font-semibold">Standard Ring</SelectItem>
                                <SelectItem value="urgent" className="text-xs font-semibold">Urgent Siren</SelectItem>
                                <SelectItem value="gentle" className="text-xs font-semibold">Gentle Chime</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <div className="flex justify-end">
                    <Button size="sm" onClick={handleSetReminder} variant="outline" className="h-8 font-semibold text-xs rounded-lg">
                        Set Next Date
                    </Button>
                </div>
            </div>

            {/* Follow-up Timeline */}
            <div className="space-y-4 pt-4 border-t">
                <div className="flex items-center justify-between">
                    <h4 className="font-bold text-sm text-foreground uppercase tracking-wider">
                        Follow-up History & Timeline
                    </h4>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">
                        {(lead.activities || []).length} Records
                    </span>
                </div>

                <div className="space-y-2.5 max-h-[300px] overflow-y-auto mb-4 pr-1 custom-scrollbar">
                    {lead.activities?.slice().reverse().map((activity: any, idx: number) => (
                        <ActivityItem key={activity._id || idx} activity={activity} />
                    ))}
                    {(!lead.activities || lead.activities.length === 0) && (
                        <p className="text-xs text-muted-foreground italic text-center py-6 border border-dashed rounded-xl">
                            No follow-up records logged yet. Use the "Log Follow-up" button above to record calls and outcomes.
                        </p>
                    )}
                </div>

                <div className="space-y-2 pt-2 border-t border-border/30">
                    <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Quick Note Entry</Label>
                    <Textarea placeholder="Add a quick note or comment on this lead..." value={newActivityContent} onChange={(e) => setNewActivityContent(e.target.value)} className="min-h-[80px] text-xs rounded-xl" />
                    <div className="flex justify-end">
                        <Button size="sm" onClick={handleAddNote} disabled={!newActivityContent.trim() || savingNote} className="font-bold text-xs uppercase tracking-wider rounded-lg">
                            {savingNote && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
                            {savingNote ? "Saving..." : "Save Note"}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    )
}
