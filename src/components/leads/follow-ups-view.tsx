import { useState } from 'react'
import { Lead } from '@/types'
import { format, isPast, isToday, isFuture } from 'date-fns'
import { CheckCircle2, Clock, AlertCircle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { LeadDetailsPanel } from './lead-details-panel'

interface FollowUpsViewProps {
    leads: Lead[]
    onUpdate: (updatedLead: Lead) => void
    onDelete: (leadId: string) => void
    onAddActivity: (leadId: string, content: string) => Promise<any>
}

export function FollowUpsView({ leads, onUpdate, onDelete, onAddActivity }: FollowUpsViewProps) {
    const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null)
    const sortedLeads = [...leads].sort((a, b) => {
        const timeA = a.reminder?.date ? new Date(a.reminder.date).getTime() : Infinity
        const timeB = b.reminder?.date ? new Date(b.reminder.date).getTime() : Infinity
        return timeA - timeB
    })

    const selectedLead = leads.find(l => l.id === selectedLeadId) || null

    if (sortedLeads.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full p-8 text-muted-foreground">
                <Clock className="h-12 w-12 mb-4 opacity-20" />
                <p>No leads available.</p>
            </div>
        )
    }

    return (
        <div className="flex h-full gap-4 overflow-hidden">
            <div className="w-[40%] h-full flex flex-col border-r border-border/40 pr-4 overflow-y-auto custom-scrollbar space-y-3 pb-4">
                <AnimatePresence mode="popLayout">
                    {sortedLeads.map(lead => {
                        const hasReminder = !!lead.reminder?.date
                        const date = hasReminder ? new Date(lead.reminder!.date) : null
                        const isCompleted = hasReminder && lead.reminder!.completed

                        let statusColor = "border-l-4 border-l-yellow-400"
                        let StatusIcon = Clock
                        let statusText = "UNSCHEDULED"

                        if (isCompleted) {
                            statusColor = "border-l-4 border-l-green-500"
                            StatusIcon = CheckCircle2
                            statusText = "DONE"
                        } else if (hasReminder) {
                            if (isPast(date!)) {
                                statusColor = "border-l-4 border-l-red-500"
                                StatusIcon = AlertCircle
                                statusText = "OVERDUE"
                            } else if (isToday(date!)) {
                                statusColor = "border-l-4 border-l-blue-500"
                                StatusIcon = Clock
                                statusText = "TODAY"
                            } else {
                                statusColor = "border-l-4 border-l-purple-500"
                                StatusIcon = Clock
                                statusText = "UPCOMING"
                            }
                        }

                        return (
                            <motion.div 
                                layout
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ duration: 0.3, type: 'spring' }}
                                key={lead.id} 
                                onClick={() => setSelectedLeadId(lead.id)}
                                className={`p-4 rounded-lg bg-card shadow-sm border ${selectedLeadId === lead.id ? 'border-primary shadow-md bg-primary/5' : 'border-border/40 hover:bg-muted/30'} cursor-pointer transition-colors ${statusColor} flex flex-col xl:flex-row items-start xl:items-center justify-between group gap-2`}
                            >
                                <div className="flex-1 overflow-hidden">
                                    <h4 className="font-bold text-foreground text-base group-hover:text-primary transition-colors">
                                        {lead.name} <span className="text-sm font-medium text-muted-foreground ml-1">({lead.company})</span>
                                    </h4>
                                    <div className="flex items-center gap-1.5 mt-1 text-sm font-medium text-muted-foreground">
                                        <Clock className="h-3.5 w-3.5" />
                                        {hasReminder ? format(date!, 'MMM d, yyyy h:mm a') : 'No follow-up scheduled'}
                                    </div>
                                </div>
                                <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide border bg-background/50 whitespace-nowrap ${
                                    statusText === 'DONE' ? 'text-green-600 border-green-200 bg-green-50' :
                                    statusText === 'OVERDUE' ? 'text-red-600 border-red-200 bg-red-50' :
                                    statusText === 'UNSCHEDULED' ? 'text-yellow-700 border-yellow-200 bg-yellow-50' :
                                    'text-blue-600 border-blue-200 bg-blue-50'
                                }`}>
                                    <StatusIcon className="h-3.5 w-3.5" />
                                    {statusText}
                                </div>
                            </motion.div>
                        )
                    })}
                </AnimatePresence>
            </div>
            
            <div className="w-[60%] h-full overflow-y-auto pl-2 custom-scrollbar pb-4">
                {selectedLead ? (
                    <div className="bg-card rounded-xl border border-border/50 shadow-sm p-6">
                       <LeadDetailsPanel 
                            lead={selectedLead} 
                            onUpdate={onUpdate} 
                            onDelete={(id) => { onDelete(id); setSelectedLeadId(null); }} 
                            onAddActivity={onAddActivity} 
                        />
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground bg-muted/10 rounded-xl border border-border/40 border-dashed">
                        <Clock className="h-10 w-10 mb-4 opacity-20" />
                        <p>Select a lead to view details</p>
                    </div>
                )}
            </div>
        </div>
    )
}
