import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Bell, Trash2 } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import type { Lead } from '@/types'
import api from '@/lib/api-client'
import { useToast } from '@/hooks/use-toast'
import { mapLead } from '@/lib/mappers'

interface LeadDetailsDialogProps {
    lead: Lead | null
    isOpen: boolean
    onClose: () => void
    onUpdate: (updatedLead: Lead) => void
    onDelete: (leadId: string) => void
    onAddActivity: (leadId: string, content: string) => Promise<any>
}

export function LeadDetailsDialog({ lead, isOpen, onClose, onUpdate, onDelete, onAddActivity }: LeadDetailsDialogProps) {
    const { toast } = useToast()
    const [newActivityContent, setNewActivityContent] = useState('')
    const [reminderDate, setReminderDate] = useState('')
    const [reminderTone, setReminderTone] = useState('default')
    const [newTagInput, setNewTagInput] = useState('')

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
        if (!lead || !reminderDate) return
        try {
            const payload = {
                reminder: {
                    date: new Date(reminderDate),
                    tone: reminderTone,
                    completed: false
                }
            }
            await api.put(`/leads/${lead.id}`, payload)
            onUpdate({ ...lead, reminder: payload.reminder })
            toast({ description: "Reminder set successfully" })
        } catch (error) {
            toast({ title: "Error", description: "Failed to set reminder", variant: "destructive" })
        }
    }

    const handleAddNote = async () => {
        if (!lead || !newActivityContent.trim()) return
        try {
            // Call backend directly to get the updated Lead object containing AI prioritized and parsed fields
            const res = await api.post(`/leads/${lead.id}/activities`, {
                content: newActivityContent,
                type: 'note',
                clientTime: new Date().toISOString()
            })
            const mapped = mapLead(res.data)
            onUpdate(mapped)
            setNewActivityContent('')
            toast({ description: "Note added and analyzed by AI" })
        } catch (error) {
            toast({ title: "Error", description: "Failed to save note", variant: "destructive" })
        }
    }

    const handleAddTag = async () => {
        if (!newTagInput.trim() || !lead) return
        const cleanTag = newTagInput.trim().toUpperCase()
        if ((lead.tags || []).includes(cleanTag)) {
            setNewTagInput('')
            return
        }
        const updatedTags = [...(lead.tags || []), cleanTag]
        try {
            const res = await api.put(`/leads/${lead.id}`, { tags: updatedTags })
            onUpdate(mapLead(res.data))
            setNewTagInput('')
            toast({ description: `Tag "${cleanTag}" added` })
        } catch (err) {
            toast({ title: "Error", description: "Failed to add tag", variant: "destructive" })
        }
    }

    const handleRemoveTag = async (tagToRemove: string) => {
        if (!lead) return
        const updatedTags = (lead.tags || []).filter(t => t !== tagToRemove)
        try {
            const res = await api.put(`/leads/${lead.id}`, { tags: updatedTags })
            onUpdate(mapLead(res.data))
            toast({ description: `Tag "${tagToRemove}" removed` })
        } catch (err) {
            toast({ title: "Error", description: "Failed to remove tag", variant: "destructive" })
        }
    }

    if (!lead) return null

    return (
        <Dialog open={isOpen} onOpenChange={(v) => !v && onClose()}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader className="flex flex-row items-center justify-between border-b pb-4">
                    <DialogTitle className="text-xl font-bold">Lead: {lead.company}</DialogTitle>
                    <Button variant="ghost" size="icon" onClick={() => { onDelete(lead.id); onClose(); }} className="text-destructive hover:bg-destructive/10">
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </DialogHeader>

                <div className="space-y-6 py-4">
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
                            <p className="font-semibold">{lead.name}</p>
                        </div>
                        <div>
                            <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Company</Label>
                            <p className="font-semibold">{lead.company}</p>
                        </div>
                        <div>
                            <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Deal Value</Label>
                            <p className="font-bold text-emerald-600 text-lg">{formatCurrency(lead.value)}</p>
                        </div>
                        <div>
                            <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Source</Label>
                            <div className="mt-1">
                                <Badge variant="secondary" className="font-bold text-[10px] uppercase tracking-wide">{lead.source}</Badge>
                            </div>
                        </div>
                        <div>
                            <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Email</Label>
                            <p className="font-medium text-sm truncate">{lead.email || '-'}</p>
                        </div>
                        <div>
                            <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Phone</Label>
                            <p className="font-medium text-sm">{lead.phone || '-'}</p>
                        </div>
                    </div>

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
                                placeholder="+ Add tag..."
                                value={newTagInput}
                                onChange={(e) => setNewTagInput(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault()
                                        handleAddTag()
                                    }
                                }}
                                className="border border-border/50 bg-transparent text-xs rounded-md px-2 py-0.5 outline-none focus:border-primary/50 w-24"
                            />
                        </div>
                    </div>

                    {lead.customFields && Object.keys(lead.customFields).length > 0 && (
                        <div className="grid grid-cols-2 gap-4 animate-in fade-in duration-500">
                            {Object.entries(lead.customFields).map(([key, value]) => (
                                <div key={key}>
                                    <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{key.replace(/_/g, ' ')}</Label>
                                    <p className="font-medium text-sm">{String(value)}</p>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="space-y-4 pt-4 border-t">
                        <h4 className="font-bold text-sm flex items-center gap-2">
                            <Bell className="h-4 w-4 text-primary" />
                            Next Follow-up & Reminders
                        </h4>
                        <div className="grid grid-cols-2 gap-4 items-end">
                            <div className="space-y-2">
                                <Label className="text-xs font-semibold">Reminder Date</Label>
                                <Input type="datetime-local" value={reminderDate} onChange={(e) => setReminderDate(e.target.value)} className="h-9 rounded-lg" />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs font-semibold">Notification Type</Label>
                                <Select value={reminderTone} onValueChange={setReminderTone}>
                                    <SelectTrigger className="h-9 rounded-lg">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="default">Standard Ring</SelectItem>
                                        <SelectItem value="urgent">Urgent Siren</SelectItem>
                                        <SelectItem value="gentle">Gentle Chime</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="flex justify-end">
                            <Button size="sm" onClick={handleSetReminder} variant="outline" className="h-8 font-semibold text-xs">
                                Set Follow-up
                            </Button>
                        </div>
                    </div>

                    <div className="space-y-4 pt-4 border-t">
                        <h4 className="font-bold text-sm text-muted-foreground uppercase tracking-wider">Interaction History</h4>
                        <div className="space-y-3 max-h-[250px] overflow-y-auto mb-4 pr-2 custom-scrollbar">
                            {lead.activities?.slice().reverse().map((activity: any) => (
                                <div key={activity._id} className="bg-muted/30 p-3 rounded-lg text-sm border border-border/40 transition-colors">
                                    <p className="font-medium text-foreground">{activity.content}</p>
                                    <div className="flex justify-between items-center mt-2">
                                        <span className="text-[10px] font-medium text-muted-foreground uppercase">{new Date(activity.createdAt).toLocaleString()}</span>
                                        <Badge variant="outline" className="text-[9px] font-semibold">{activity.type}</Badge>
                                    </div>
                                </div>
                            ))}
                            {(!lead.activities || lead.activities.length === 0) && (
                                <p className="text-xs text-muted-foreground italic text-center py-4">No records found.</p>
                            )}
                        </div>
                        <div className="space-y-2">
                            <Textarea placeholder="Add a note or update on this lead..." value={newActivityContent} onChange={(e) => setNewActivityContent(e.target.value)} className="min-h-[100px] text-sm rounded-lg" />
                            <div className="flex justify-end">
                                <Button size="sm" onClick={handleAddNote} disabled={!newActivityContent.trim()} className="font-bold text-xs uppercase tracking-wider">Save Note</Button>
                            </div>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
