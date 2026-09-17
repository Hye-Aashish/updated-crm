import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { MoreHorizontal, Trash2, ExternalLink, Star, Clock } from 'lucide-react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { formatCurrency } from '@/lib/utils'
import { getLeadFollowUpInfo } from '@/lib/followup-utils'
import { format } from 'date-fns'
import type { Lead, PipelineStage } from '@/types'

interface LeadsListProps {
    leads: Lead[]
    stages: PipelineStage[]
    onLeadClick: (lead: Lead) => void
    onDeleteLead: (id: string) => void
}

export function LeadsList({ leads, stages, onLeadClick, onDeleteLead }: LeadsListProps) {
    return (
        <div className="flex-1 bg-card border border-border/60 rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-muted/40 text-[11px] uppercase font-bold tracking-wider text-muted-foreground border-b border-border/40">
                        <tr>
                            <th className="px-6 py-4">Company</th>
                            <th className="hidden md:table-cell px-6 py-4">Rating</th>
                            <th className="hidden md:table-cell px-6 py-4">Contact</th>
                            <th className="hidden lg:table-cell px-6 py-4">Follow-up Status</th>
                            <th className="hidden sm:table-cell px-6 py-4">Value</th>
                            <th className="px-6 py-4">Stage</th>
                            <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border/30 text-sm">
                        {leads.map((lead) => {
                            const stage = stages.find(s => s.id === lead.stage)
                            const followUpInfo = getLeadFollowUpInfo(lead.reminder)

                            return (
                                <tr key={lead.id} className={`hover:bg-accent/5 transition-colors group cursor-pointer ${followUpInfo.cardBg}`} onClick={() => onLeadClick(lead)}>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                                                followUpInfo.status === 'overdue' ? 'bg-red-500 animate-pulse' :
                                                followUpInfo.status === 'today' ? 'bg-amber-500' :
                                                followUpInfo.status === 'future' ? 'bg-emerald-500' :
                                                lead.aiPriority === 'green' ? 'bg-emerald-500' :
                                                lead.aiPriority === 'yellow' ? 'bg-yellow-500' : 'bg-red-500'
                                            }`} title={followUpInfo.label} />
                                            <div className="font-bold text-foreground group-hover:text-primary transition-colors">{lead.company}</div>
                                        </div>
                                        <div className="text-[10px] text-muted-foreground font-medium mt-0.5">
                                            {lead.source} {lead.project ? `• ${lead.project}` : ''}
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
                                    <td className="hidden md:table-cell px-6 py-4">
                                        <div className="flex items-center gap-0.5" title={`${lead.rating || 0} Stars`}>
                                            {[1, 2, 3, 4, 5].map(star => (
                                                <Star key={star} className={`h-3 w-3 ${star <= (lead.rating || 0) ? 'fill-yellow-400 text-yellow-500' : 'text-muted-foreground/30'}`} />
                                            ))}
                                        </div>
                                    </td>
                                    <td className="hidden md:table-cell px-6 py-4">
                                        <div className="font-semibold text-foreground">{lead.name}</div>
                                        <div className="text-[10px] text-muted-foreground">{lead.email}</div>
                                    </td>
                                    <td className="hidden lg:table-cell px-6 py-4">
                                        {lead.reminder?.date ? (
                                            <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold border ${followUpInfo.badgeBg} ${followUpInfo.badgeText} ${followUpInfo.badgeBorder}`}>
                                                <Clock className="h-3 w-3 shrink-0" />
                                                <span>{followUpInfo.label} ({format(new Date(lead.reminder.date), 'MMM d, h:mm a')})</span>
                                            </div>
                                        ) : (
                                            <span className="text-xs text-muted-foreground italic">No Follow-up</span>
                                        )}
                                    </td>
                                    <td className="hidden sm:table-cell px-6 py-4">
                                        <div className="font-bold text-foreground">{formatCurrency(lead.value)}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <Badge variant="secondary" className={`rounded-md font-bold text-[9px] uppercase tracking-wider ${stage?.color?.replace('bg-', 'text-') || ''} bg-opacity-10 border-none`}>
                                            {stage?.label || lead.stage}
                                        </Badge>
                                    </td>
                                    <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                                        <div className="flex justify-end gap-1">
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => onLeadClick(lead)}>
                                                <ExternalLink className="h-4 w-4" />
                                            </Button>
                                            <DropdownMenu modal={false}>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
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
                                <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground font-medium">
                                    No leads found in this view
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
