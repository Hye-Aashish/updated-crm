import { useState } from 'react'
import { Lead, PipelineStage } from '@/types'
import { format } from 'date-fns'
import { CheckCircle2, Clock, AlertCircle, PhoneCall } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { getLeadFollowUpInfo, sortLeadsByFollowUpPriority } from '@/lib/followup-utils'
import { LeadDetailsPanel } from './lead-details-panel'
import { Button } from '@/components/ui/button'

interface FollowUpsViewProps {
    leads: Lead[]
    stages: PipelineStage[]
    onUpdate: (updatedLead: Lead) => void
    onOpenFollowUp: (lead: Lead) => void
    onDelete: (leadId: string) => void
    onAddActivity: (leadId: string, content: string) => Promise<any>
}

export function FollowUpsView({ leads, stages, onUpdate, onOpenFollowUp, onDelete, onAddActivity }: FollowUpsViewProps) {
    const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null)
    const sortedLeads = sortLeadsByFollowUpPriority(leads)

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
            <div className="w-[42%] h-full flex flex-col border-r border-border/40 pr-3 overflow-y-auto custom-scrollbar space-y-2.5 pb-4">
                <AnimatePresence mode="popLayout">
                    {sortedLeads.map(lead => {
                        const hasReminder = !!lead.reminder?.date && !lead.reminder.completed
                        const info = getLeadFollowUpInfo(lead.reminder)
                        const date = hasReminder ? new Date(lead.reminder!.date) : null

                        let StatusIcon = Clock
                        if (info.status === 'completed') StatusIcon = CheckCircle2
                        else if (info.status === 'overdue') StatusIcon = AlertCircle

                        return (
                            <motion.div 
                                layout
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ duration: 0.2, type: 'spring' }}
                                key={lead.id} 
                                onClick={() => setSelectedLeadId(lead.id)}
                                className={`p-3.5 rounded-xl bg-card shadow-sm border ${selectedLeadId === lead.id ? 'border-primary shadow-md bg-primary/5 ring-1 ring-primary/30' : 'border-border/40 hover:bg-muted/30'} cursor-pointer transition-all ${info.borderLeft || 'border-l-4 border-l-muted'} flex flex-col gap-2 group`}
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <div className="overflow-hidden">
                                        <h4 className="font-bold text-foreground text-sm group-hover:text-primary transition-colors truncate">
                                            {lead.company}
                                        </h4>
                                        <p className="text-xs font-semibold text-muted-foreground">
                                            {lead.name} {lead.phone ? `• ${lead.phone}` : ''}
                                        </p>
                                    </div>
                                    <div className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide border shrink-0 ${info.badgeBg} ${info.badgeText} ${info.badgeBorder}`}>
                                        <StatusIcon className="h-3 w-3" />
                                        <span>
                                            {info.status === 'overdue' ? 'MISSED' :
                                             info.status === 'today' ? 'TODAY' :
                                             info.status === 'future' ? 'UPCOMING' :
                                             info.status === 'completed' ? 'DONE' : 'UNSCHEDULED'}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between pt-2 border-t border-border/20 text-xs">
                                    <div className="flex items-center gap-1.5 text-muted-foreground font-medium text-[11px]">
                                        <Clock className="h-3 w-3 text-primary" />
                                        {hasReminder ? (
                                            info.overdueText ? (
                                                <strong className="text-red-600 dark:text-red-400 font-bold">{info.overdueText}</strong>
                                            ) : (
                                                <span>{format(date!, 'MMM d, h:mm a')}</span>
                                            )
                                        ) : (
                                            <span className="italic">No next date</span>
                                        )}
                                    </div>

                                    <Button
                                        size="sm"
                                        onClick={(e) => { e.stopPropagation(); onOpenFollowUp(lead); }}
                                        className="h-7 px-2.5 rounded-lg text-[10px] font-bold bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"
                                    >
                                        <PhoneCall className="mr-1 h-3 w-3" />
                                        Follow-up
                                    </Button>
                                </div>
                            </motion.div>
                        )
                    })}
                </AnimatePresence>
            </div>
            
            <div className="w-[58%] h-full overflow-y-auto pl-2 custom-scrollbar pb-4">
                {selectedLead ? (
                    <div className="bg-card rounded-2xl border border-border/50 shadow-sm p-6">
                       <LeadDetailsPanel 
                            lead={selectedLead} 
                            stages={stages}
                            onUpdate={onUpdate} 
                            onOpenFollowUp={onOpenFollowUp}
                            onDelete={(id) => { onDelete(id); setSelectedLeadId(null); }} 
                            onAddActivity={onAddActivity} 
                        />
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground bg-muted/10 rounded-2xl border border-border/40 border-dashed">
                        <Clock className="h-10 w-10 mb-3 opacity-20" />
                        <p className="font-semibold text-sm">Select a lead to view details & history</p>
                    </div>
                )}
            </div>
        </div>
    )
}
