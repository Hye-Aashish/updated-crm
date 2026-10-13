import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { MoreHorizontal, Trash2, ExternalLink, Users, Star, Clock, Folder, PhoneCall, UserCheck, UserPlus, MessageSquare, PhoneOff, CheckCircle2 } from 'lucide-react'
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
    isAdminOrOwner?: boolean
    onOpenAssignLead?: (lead: Lead) => void
}

export function KanbanBoard({
    stages,
    leads,
    onDragStart,
    onDrop,
    onLeadClick,
    onOpenFollowUp,
    onDeleteLead,
    isAdminOrOwner = false,
    onOpenAssignLead
}: KanbanBoardProps) {
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
                                                {/* Top Agent Management Box: Managing Agent & Source Attribution */}
                                                {(() => {
                                                    const isAssignedByAdmin = Boolean(
                                                        lead.assignedToName && 
                                                        ((lead.createdByName && lead.createdByName.toLowerCase().includes('admin')) || 
                                                         (lead.assignedToName !== lead.createdByName))
                                                    );
                                                    const formSource = lead.formTitle || (lead.source && lead.source.startsWith('Form: ') ? lead.source.replace('Form: ', '').trim() : null);
                                                    const managingAgent = lead.assignedToName || lead.createdByName || 'Direct';

                                                    return (
                                                        <div className="bg-muted/40 hover:bg-muted/60 transition-colors rounded-lg p-2 border border-border/60 space-y-1.5">
                                                            {/* Capture Form Banner if lead arrived from Lead Capture Form */}
                                                            {formSource && (
                                                                <div className="flex items-center justify-between bg-indigo-500/10 border border-indigo-500/20 px-2 py-1 rounded-md text-[9.5px]">
                                                                    <div className="flex items-center gap-1.5 font-bold text-indigo-700 dark:text-indigo-300 truncate" title={`Captured from Form: ${formSource}`}>
                                                                        <Folder className="h-3 w-3 text-indigo-600 shrink-0" />
                                                                        <span className="truncate">Form: <strong className="text-foreground">{formSource}</strong></span>
                                                                    </div>
                                                                    <span className="text-[8.5px] uppercase font-extrabold px-1 py-0.2 rounded bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 shrink-0">
                                                                        Web Form
                                                                    </span>
                                                                </div>
                                                            )}

                                                            <div className="flex items-center justify-between gap-1">
                                                                <div className="flex items-center gap-1.5 min-w-0" title={`Managing Agent: ${managingAgent}`}>
                                                                    <UserCheck className="h-3.5 w-3.5 text-primary shrink-0" />
                                                                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Agent:</span>
                                                                    <span className="font-extrabold text-xs text-foreground truncate max-w-[125px]">
                                                                        {managingAgent}
                                                                    </span>
                                                                </div>

                                                                {lead.isFallbackFollowUp ? (
                                                                    <span className="font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-700 dark:text-amber-300 text-[9px] shrink-0 border border-amber-500/30">
                                                                        ⚡ Coverage
                                                                    </span>
                                                                ) : isAssignedByAdmin ? (
                                                                    <span className="font-bold px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-700 dark:text-blue-300 text-[9px] shrink-0 border border-blue-500/30 flex items-center gap-1">
                                                                        🎯 Admin Assigned
                                                                    </span>
                                                                ) : (
                                                                    <span className="font-bold px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-[9px] shrink-0 border border-emerald-500/30 flex items-center gap-1">
                                                                        ✍️ Agent Created
                                                                    </span>
                                                                )}

                                                                {isAdminOrOwner && onOpenAssignLead && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={(e) => { e.stopPropagation(); onOpenAssignLead(lead); }}
                                                                        className="inline-flex items-center gap-0.5 text-[9px] font-bold text-primary hover:text-primary/80 bg-primary/10 hover:bg-primary/20 px-1.5 py-0.5 rounded transition-colors shadow-2xs ml-1"
                                                                        title="Assign lead to any telecaller"
                                                                    >
                                                                        <UserCheck className="h-2.5 w-2.5" />
                                                                        <span>Assign</span>
                                                                    </button>
                                                                )}
                                                            </div>

                                                            <div className="flex items-center justify-between text-[9.5px] text-muted-foreground pt-0.5 border-t border-border/30">
                                                                <span className="truncate">
                                                                    {lead.isFallbackFollowUp ? (
                                                                        <>Absent Colleague: <strong className="text-amber-600 font-semibold">{lead.absentTelecallerName}</strong></>
                                                                    ) : isAssignedByAdmin ? (
                                                                        <>Created by <strong className="text-foreground">{lead.createdByName || 'Admin'}</strong> → Assigned to <strong className="text-primary font-bold">{lead.assignedToName}</strong></>
                                                                    ) : (
                                                                        <>Created & Managed by <strong className="text-primary font-bold">{lead.createdByName || managingAgent}</strong></>
                                                                    )}
                                                                </span>
                                                                {lead.createdAt && (
                                                                    <span className="text-[9px] text-muted-foreground/80 font-medium shrink-0 ml-1">
                                                                        {format(new Date(lead.createdAt), 'MMM d')}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )
                                                })()}

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
                                                        <DropdownMenuContent align="end" className="w-44 rounded-xl">
                                                            <DropdownMenuItem className="text-xs cursor-pointer font-semibold" onClick={(e) => { e.stopPropagation(); onOpenFollowUp(lead); }}>
                                                                <PhoneCall className="mr-2 h-3.5 w-3.5 text-primary" /> Follow-up
                                                            </DropdownMenuItem>
                                                            {isAdminOrOwner && onOpenAssignLead && (
                                                                <DropdownMenuItem className="text-xs cursor-pointer font-semibold" onClick={(e) => { e.stopPropagation(); onOpenAssignLead(lead); }}>
                                                                    <UserCheck className="mr-2 h-3.5 w-3.5 text-primary" /> Assign to Telecaller
                                                                </DropdownMenuItem>
                                                            )}
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

                                                {/* Last Call / Conversation Details Box */}
                                                <div className="bg-muted/40 border border-border/40 rounded-lg p-2 space-y-1 text-[10px]">
                                                    {lead.lastContactedBy ? (
                                                        <>
                                                            <div className="flex items-center justify-between gap-1 font-semibold text-foreground">
                                                                <span className="flex items-center gap-1 text-primary truncate">
                                                                    <PhoneCall className="h-2.5 w-2.5 text-blue-500 shrink-0" />
                                                                    <span>Spoke: <strong className="font-bold text-foreground">{lead.lastContactedBy}</strong></span>
                                                                </span>
                                                                {lead.lastFollowUpDate && (
                                                                    <span className="text-[9px] text-muted-foreground font-normal shrink-0">
                                                                        {format(new Date(lead.lastFollowUpDate), 'MMM d')}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            {lead.lastFollowUpOutcome && (
                                                                <div className="text-[10px] text-muted-foreground font-medium truncate flex items-center gap-1">
                                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                                                                    <span>Status: <strong className="text-foreground font-semibold">{lead.lastFollowUpOutcome}</strong></span>
                                                                </div>
                                                            )}
                                                            {lead.lastNote && (
                                                                <p className="text-muted-foreground italic truncate text-[9.5px] bg-background/50 px-1.5 py-0.5 rounded border border-border/20">
                                                                    "{lead.lastNote}"
                                                                </p>
                                                            )}
                                                        </>
                                                    ) : (
                                                        <div className="flex items-center gap-1 text-muted-foreground italic text-[10px]">
                                                            <PhoneOff className="h-2.5 w-2.5 text-muted-foreground/60 shrink-0" />
                                                            <span>No calls logged yet</span>
                                                        </div>
                                                    )}
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
                                                    <span className="text-[10px] text-muted-foreground italic block px-1">No next follow-up</span>
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
