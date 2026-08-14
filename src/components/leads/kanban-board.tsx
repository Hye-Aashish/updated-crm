import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { MoreHorizontal, Trash2, ExternalLink, Users } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import type { Lead, PipelineStage } from '@/types'

interface KanbanBoardProps {
    stages: PipelineStage[]
    leads: Lead[]
    onDragStart: (lead: Lead) => void
    onDrop: (stageId: string) => void
    onLeadClick: (lead: Lead) => void
    onDeleteLead: (id: string) => void
}

export function KanbanBoard({ stages, leads, onDragStart, onDrop, onLeadClick, onDeleteLead }: KanbanBoardProps) {
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
                            className="w-[280px] flex flex-col h-full bg-muted/20 rounded-xl border border-border/40 transition-colors"
                            onDragOver={handleDragOver}
                            onDrop={() => onDrop(stage.id)}
                        >
                            {/* Stage Header */}
                            <div className="p-4 border-b border-border/20">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <div className={`w-2 h-2 rounded-full ${stage.color}`} />
                                        <h3 className="font-bold text-xs uppercase tracking-wider">{stage.label}</h3>
                                    </div>
                                    <Badge variant="secondary" className="text-[10px] font-semibold px-2 py-0 h-5 min-w-[20px] justify-center">{stageLeads.length}</Badge>
                                </div>
                                <div className="text-[10px] text-muted-foreground font-medium">
                                    Total: <span className="text-foreground font-semibold">{formatCurrency(stageValue)}</span>
                                </div>
                            </div>

                            {/* Cards Container */}
                            <div className="p-3 flex-1 overflow-y-auto space-y-3 custom-scrollbar">
                                {stageLeads.map((lead) => (
                                    <Card
                                        key={lead.id}
                                        draggable
                                        onDragStart={() => onDragStart(lead)}
                                        onClick={() => onLeadClick(lead)}
                                        className={`dashboard-card cursor-grab active:cursor-grabbing group border border-l-4 transition-all duration-300 ${
                                            lead.aiPriority === 'green'
                                                ? 'border-emerald-500/30 border-l-emerald-500 bg-emerald-500/[0.02] dark:bg-emerald-500/[0.01] hover:bg-emerald-500/[0.04]'
                                                : lead.aiPriority === 'yellow'
                                                ? 'border-yellow-500/30 border-l-yellow-500 bg-yellow-500/[0.02] dark:bg-yellow-500/[0.01] hover:bg-yellow-500/[0.04]'
                                                : 'border-red-500/30 border-l-red-500 bg-red-500/[0.02] dark:bg-red-500/[0.01] hover:bg-red-500/[0.04]'
                                        }`}
                                    >
                                        <CardContent className="p-4 relative">
                                            <div className="flex justify-between items-start mb-2">
                                                <div className="font-bold text-sm text-foreground tracking-tight group-hover:text-primary transition-colors pr-6">
                                                    {lead.company}
                                                </div>
                                                <div className="absolute top-3 right-3">
                                                    <DropdownMenu modal={false}>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-muted" onClick={(e) => e.stopPropagation()}>
                                                                <MoreHorizontal className="h-4 w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end" className="w-40">
                                                            <DropdownMenuItem className="text-xs cursor-pointer" onClick={(e) => { e.stopPropagation(); onLeadClick(lead); }}>
                                                                <ExternalLink className="mr-2 h-3 w-3" /> View Details
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem className="text-xs text-destructive focus:text-destructive cursor-pointer" onClick={(e) => { e.stopPropagation(); onDeleteLead(lead.id); }}>
                                                                <Trash2 className="mr-2 h-3 w-3" /> Delete Lead
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </div>
                                            </div>

                                            <div className="space-y-3">
                                                <div className="text-[11px] text-muted-foreground font-medium flex items-center gap-2">
                                                    <Users className="h-3 w-3" />
                                                    {lead.name}
                                                </div>
                                                
                                                {lead.tags && lead.tags.length > 0 && (
                                                    <div className="flex flex-wrap gap-1 mt-1">
                                                        {lead.tags.map(tag => (
                                                            <span key={tag} className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-secondary/80 text-secondary-foreground border border-border/20">
                                                                {tag}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}

                                                <div className="flex items-center justify-between pt-3 border-t border-border/10">
                                                    <span className="text-base font-bold text-foreground">{formatCurrency(lead.value)}</span>
                                                    {lead.source && (
                                                        <Badge variant="outline" className="text-[9px] font-medium px-1.5 py-0 border-primary/20 bg-primary/5 text-primary rounded-md">
                                                            {lead.source}
                                                        </Badge>
                                                    )}
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                                {stageLeads.length === 0 && (
                                    <div className="flex flex-col items-center justify-center py-10 border-2 border-dashed border-border/40 rounded-lg bg-muted/5">
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
