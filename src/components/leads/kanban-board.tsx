import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { MoreHorizontal, Trash2, ExternalLink, Users, Star, Clock, Folder, PhoneCall } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { getLeadFollowUpInfo } from '@/lib/followup-utils'
import { format } from 'date-fns'
import type { Lead, PipelineStage } from '@/types'

interface KanbanBoardProps {
    stages: PipelineStage[]
    leads: Lead[]
    onDragStart: (lead: Lead) => void
    onDrop: (stageId: string) => void
    onLeadClick: (lead: Lead) => void
    onOpenFollowUp: (lead: Lead) => void
    onDeleteLead: (id: string) => void
}

export function KanbanBoard({ stages, leads, onDragStart, onDrop, onLeadClick, onOpenFollowUp, onDeleteLead }: KanbanBoardProps) {
    const handleDragOver = (e: React.DragEvent) => e.preventDefault()

    return (
        <div className="flex-1 overflow-x-auto overflow-y-hidden pb-6">
            <div className="flex h-full gap-4 px-4" style={{ minWidth: `${stages.length * 300}px` }}>
                {stages.map((stage) => {
                    const stageLeads = leads.filter(l => l.stage === stage.id)
                    const stageValue = stageLeads.reduce((sum, l) => sum + (l.value || 0), 0)

                    return (
                        <div
                            key={stage.id}
                            className="w-[290px] flex flex-col h-full bg-muted/20 rounded-2xl border border-border/40 transition-colors"
                            onDragOver={handleDragOver}
                            onDrop={() => onDrop(stage.id)}
                        >
                            {/* Stage Header */}
                            <div className="p-4 border-b border-border/20 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className={`w-2.5 h-2.5 rounded-full ${stage.color}`} />
                                    <h3 className="font-bold text-xs uppercase tracking-wider">{stage.label}</h3>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-bold text-muted-foreground">{formatCurrency(stageValue)}</span>
                                    <Badge variant="secondary" className="text-[10px] font-extrabold px-2 py-0.5 rounded-full">{stageLeads.length}</Badge>
                                </div>
                            </div>

                            {/* Cards Container */}
                            <div className="p-3 flex-1 overflow-y-auto space-y-3 custom-scrollbar">
                                {stageLeads.map((lead) => {
                                    const followUpInfo = getLeadFollowUpInfo(lead.reminder)
                                    const borderClass = followUpInfo.borderLeft
                                        ? `${followUpInfo.borderLeft} ${followUpInfo.cardBg}` 
                                        : 'border-border/60 bg-card'

                                    return (
                                        <Card
                                            key={lead.id}
                                            draggable
                                            onDragStart={() => onDragStart(lead)}
                                            onClick={() => onLeadClick(lead)}
                                            className={`dashboard-card cursor-grab active:cursor-grabbing group border transition-all duration-300 rounded-xl ${borderClass}`}
                                        >
                                            <CardContent className="p-3.5 relative space-y-2.5">
                                                <div className="flex justify-between items-start gap-2">
                                                    <div className="font-bold text-sm text-foreground tracking-tight group-hover:text-primary transition-colors">
                                                        {lead.company}
                                                    </div>
                                                    <DropdownMenu modal={false}>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="h-6 w-6 rounded-md text-muted-foreground hover:bg-muted" onClick={(e) => e.stopPropagation()}>
                                                                <MoreHorizontal className="h-3.5 w-3.5" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end" className="w-40 rounded-xl">
                                                            <DropdownMenuItem className="text-xs cursor-pointer font-semibold" onClick={(e) => { e.stopPropagation(); onOpenFollowUp(lead); }}>
                                                                <PhoneCall className="mr-2 h-3.5 w-3.5 text-primary" /> Follow-up
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem className="text-xs cursor-pointer font-semibold" onClick={(e) => { e.stopPropagation(); onLeadClick(lead); }}>
                                                                <ExternalLink className="mr-2 h-3.5 w-3.5" /> View Details
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem className="text-xs text-destructive font-semibold cursor-pointer" onClick={(e) => { e.stopPropagation(); onDeleteLead(lead.id); }}>
                                                                <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete Lead
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </div>

                                                <div className="text-[11px] text-muted-foreground font-medium flex items-center justify-between">
                                                    <span className="flex items-center gap-1.5 font-semibold text-foreground">
                                                        <Users className="h-3 w-3 text-muted-foreground" />
                                                        {lead.name}
                                                    </span>
                                                    {lead.phone && <span className="text-[10px] text-muted-foreground">{lead.phone}</span>}
                                                </div>

                                                {/* Follow-up Badge */}
                                                {lead.reminder?.date && !lead.reminder.completed ? (
                                                    <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-bold border ${followUpInfo.badgeBg} ${followUpInfo.badgeText} ${followUpInfo.badgeBorder}`}>
                                                        <Clock className="h-3 w-3 shrink-0" />
                                                        <span className="truncate">
                                                            {followUpInfo.overdueText || `${followUpInfo.label}: ${format(new Date(lead.reminder.date), 'MMM d, h:mm a')}`}
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <span className="text-[10px] text-muted-foreground italic block">No next follow-up</span>
                                                )}

                                                <div className="flex items-center justify-between pt-2 border-t border-border/20">
                                                    <span className="text-xs font-bold text-foreground">{formatCurrency(lead.value)}</span>

                                                    <Button
                                                        size="sm"
                                                        onClick={(e) => { e.stopPropagation(); onOpenFollowUp(lead); }}
                                                        className="h-6 px-2.5 rounded-lg text-[10px] font-bold bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"
                                                    >
                                                        <PhoneCall className="mr-1 h-3 w-3" />
                                                        Follow-up
                                                    </Button>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    )
                                })}

                                {stageLeads.length === 0 && (
                                    <div className="flex flex-col items-center justify-center py-10 border-2 border-dashed border-border/40 rounded-xl bg-muted/5">
                                        <span className="text-[10px] font-medium text-muted-foreground">No leads in this stage</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
