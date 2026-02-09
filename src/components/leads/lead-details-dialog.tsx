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
        const activities = await onAddActivity(lead.id, newActivityContent)
        if (activities) {
            onUpdate({ ...lead, activities })
            setNewActivityContent('')
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
