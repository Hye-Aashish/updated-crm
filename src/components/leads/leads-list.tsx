import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { MoreHorizontal, Trash2, ExternalLink, Star, Clock, Phone, MessageSquare, AlertCircle, CalendarClock, PhoneCall } from 'lucide-react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { formatCurrency } from '@/lib/utils'
import { getLeadFollowUpInfo } from '@/lib/followup-utils'
import { format } from 'date-fns'
import type { Lead, PipelineStage } from '@/types'

interface LeadsListProps {
    leads: Lead[]
    stages: PipelineStage[]
    onLeadClick: (lead: Lead) => void
    onOpenFollowUp: (lead: Lead) => void
    onDeleteLead: (id: string) => void
}

export function LeadsList({ leads, stages, onLeadClick, onOpenFollowUp, onDeleteLead }: LeadsListProps) {
    return (
        <div className="flex-1 bg-card border border-border/60 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-muted/40 text-[11px] uppercase font-bold tracking-wider text-muted-foreground border-b border-border/40">
                        <tr>
                            <th className="px-5 py-3.5">Company & Lead</th>
                            <th className="hidden md:table-cell px-5 py-3.5">Contact Details</th>
                            <th className="px-5 py-3.5">Follow-up Priority</th>
                            <th className="hidden lg:table-cell px-5 py-3.5">Last Outcome</th>
                            <th className="hidden sm:table-cell px-5 py-3.5">Value</th>
                            <th className="px-5 py-3.5">Stage</th>
                            <th className="px-5 py-3.5 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border/30 text-xs font-sans">
                        {leads.map((lead) => {
                            const stage = stages.find(s => s.id === lead.stage)
                            const followUpInfo = getLeadFollowUpInfo(lead.reminder)
                            const followUpCount = (lead.activities || []).filter(a => a.outcome || a.type === 'call').length

                            return (
                                <tr
                                    key={lead.id}
                                    className={`hover:bg-accent/10 transition-colors group cursor-pointer ${followUpInfo.cardBg}`}
                                    onClick={() => onLeadClick(lead)}
                                >
                                    {/* Company & Name */}
                                    <td className="px-5 py-4">
                                        <div className="flex items-center gap-2.5">
                                            <span
                                                className={`w-3 h-3 rounded-full shrink-0 ${
                                                    followUpInfo.status === 'overdue' ? 'bg-red-500 animate-pulse' :
                                                    followUpInfo.status === 'today' ? 'bg-amber-500' :
                                                    followUpInfo.status === 'future' ? 'bg-emerald-500' : 'bg-slate-400'
                                                }`}
                                                title={followUpInfo.label}
                                            />
                                            <div>
                                                <div className="font-bold text-foreground text-sm group-hover:text-primary transition-colors flex items-center gap-1.5">
                                                    <span>{lead.company}</span>
                                                    {followUpCount > 0 && (
                                                        <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded-full bg-primary/10 text-primary border border-primary/20">
                                                            {followUpCount} {followUpCount === 1 ? 'call' : 'calls'}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-[11px] font-medium text-muted-foreground mt-0.5">
                                                    Source: <span className="font-semibold text-foreground">{lead.source}</span>
                                                    {lead.project ? ` • ${lead.project}` : ''}
                                                </div>
                                            </div>
                                        </div>

                                        {lead.tags && lead.tags.length > 0 && (
                                            <div className="flex flex-wrap gap-1 mt-1.5">
                                                {lead.tags.map(tag => (
                                                    <span key={tag} className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-secondary/80 text-secondary-foreground border border-border/15">
                                                        {tag}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </td>

                                    {/* Contact */}
                                    <td className="hidden md:table-cell px-5 py-4">
                                        <div className="font-bold text-foreground">{lead.name}</div>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <span className="text-[11px] font-medium text-muted-foreground">{lead.phone || '-'}</span>
                                            {lead.phone && (
                                                <a
                                                    href={`https://wa.me/${String(lead.phone).replace(/\D/g, '')}`}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    onClick={(e) => e.stopPropagation()}
                                                    className="inline-flex items-center gap-0.5 text-[9px] font-bold bg-green-500/10 text-green-600 hover:bg-green-500 hover:text-white px-1.5 py-0.5 rounded-full transition-all border border-green-500/30"
                                                    title="Open WhatsApp chat"
                                                >
                                                    <MessageSquare className="h-2.5 w-2.5" />
                                                    <span>WhatsApp</span>
                                                </a>
                                            )}
                                        </div>
                                    </td>

                                    {/* Follow-up Priority Badge */}
                                    <td className="px-5 py-4">
                                        {lead.reminder?.date && !lead.reminder.completed ? (
                                            <div className="flex flex-col gap-1 items-start">
                                                <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold border ${followUpInfo.badgeBg} ${followUpInfo.badgeText} ${followUpInfo.badgeBorder}`}>
                                                    <Clock className="h-3 w-3 shrink-0" />
                                                    <span>{followUpInfo.label}</span>
                                                </div>
                                                <span className="text-[10px] font-bold text-muted-foreground ml-0.5">
                                                    {followUpInfo.overdueText ? (
                                                        <strong className="text-red-600 dark:text-red-400">{followUpInfo.overdueText}</strong>
                                                    ) : (
                                                        format(new Date(lead.reminder.date), 'MMM d, h:mm a')
                                                    )}
                                                </span>
                                            </div>
                                        ) : (
                                            <div className="inline-flex items-center gap-1 text-[11px] text-muted-foreground italic font-medium">
                                                <span>⚪ No Next Follow-up</span>
                                            </div>
                                        )}
                                    </td>

                                    {/* Last Outcome */}
                                    <td className="hidden lg:table-cell px-5 py-4">
                                        {lead.lastFollowUpOutcome ? (
                                            <div className="space-y-0.5">
                                                <Badge variant="outline" className="text-[10px] font-bold bg-background border-border/60">
                                                    {lead.lastFollowUpOutcome}
                                                </Badge>
                                                {lead.lastNote && (
                                                    <p className="text-[10px] text-muted-foreground font-medium line-clamp-1 max-w-[180px]">
                                                        "{lead.lastNote}"
                                                    </p>
                                                )}
                                            </div>
                                        ) : (
                                            <span className="text-[11px] text-muted-foreground italic">No interactions yet</span>
                                        )}
                                    </td>

                                    {/* Deal Value */}
                                    <td className="hidden sm:table-cell px-5 py-4">
                                        <div className="font-bold text-foreground text-sm">{formatCurrency(lead.value)}</div>
                                    </td>

                                    {/* Stage */}
                                    <td className="px-5 py-4">
                                        <Badge variant="secondary" className={`rounded-md font-bold text-[9px] uppercase tracking-wider ${stage?.color?.replace('bg-', 'text-') || ''} bg-opacity-15 border-none`}>
                                            {stage?.label || lead.stage}
                                        </Badge>
                                    </td>

                                    {/* Actions */}
                                    <td className="px-5 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                                        <div className="flex justify-end items-center gap-1.5">
                                            <Button
                                                size="sm"
                                                onClick={() => onOpenFollowUp(lead)}
                                                className="h-8 px-3 rounded-lg font-bold text-[11px] bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
                                                title="Log Follow-up & Outcome"
                                            >
                                                <PhoneCall className="mr-1.5 h-3.5 w-3.5" />
                                                Follow-up
                                            </Button>

                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-muted-foreground hover:text-primary rounded-lg"
                                                onClick={() => onLeadClick(lead)}
                                                title="View Lead Details"
                                            >
                                                <ExternalLink className="h-4 w-4" />
                                            </Button>

                                            <DropdownMenu modal={false}>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground rounded-lg">
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="rounded-xl">
                                                    <DropdownMenuItem className="text-xs font-semibold text-destructive" onClick={() => onDeleteLead(lead.id)}>
                                                        <Trash2 className="mr-2 h-4 w-4" /> Delete Lead
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    </td>
                                </tr>
                            )
                        })}

                        {leads.length === 0 && (
                            <tr>
                                <td colSpan={7} className="px-6 py-12 text-center text-muted-foreground font-medium">
                                    No leads found for the selected filter.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
