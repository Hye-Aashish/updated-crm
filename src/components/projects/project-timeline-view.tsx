import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { CheckCircle2, Clock, AlertCircle, Lock, ArrowRight, Flag } from 'lucide-react'
import { format } from 'date-fns'
import type { ProjectCheckpoint } from '@/types'

interface ProjectTimelineViewProps {
    checkpoints: ProjectCheckpoint[]
    onCheckpointClick?: (cp: ProjectCheckpoint) => void
}

export function ProjectTimelineView({ checkpoints, onCheckpointClick }: ProjectTimelineViewProps) {
    // Group checkpoints by phase
    const phasesMap = checkpoints.reduce((acc, cp) => {
        if (!acc[cp.phase]) acc[cp.phase] = []
        acc[cp.phase].push(cp)
        return acc
    }, {} as Record<string, ProjectCheckpoint[]>)

    const phaseNames = Object.keys(phasesMap)

    if (checkpoints.length === 0) {
        return (
            <div className="py-12 text-center text-muted-foreground text-sm font-medium border border-dashed rounded-xl">
                No checkpoints generated for this project timeline yet.
            </div>
        )
    }

    return (
        <div className="space-y-8 font-sans">
            {/* Phase Sequence Header */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 custom-scrollbar">
                {phaseNames.map((phase, idx) => {
                    const phaseCps = phasesMap[phase]
                    const total = phaseCps.length
                    const completed = phaseCps.filter(c => c.status === 'completed').length
                    const isFullyDone = total > 0 && completed === total

                    return (
                        <div key={phase} className="flex items-center gap-2 shrink-0">
                            <div className={`p-3 rounded-xl border transition-all ${
                                isFullyDone 
                                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300' 
                                    : 'bg-card border-border/60'
                            }`}>
                                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Phase {idx + 1}</p>
                                <p className="text-xs font-bold text-foreground truncate max-w-[140px]">{phase}</p>
                                <div className="mt-1 flex items-center justify-between text-[10px] font-semibold">
                                    <span>{completed}/{total} Done</span>
                                    <span>{Math.round((completed / Math.max(1, total)) * 100)}%</span>
                                </div>
                            </div>
                            {idx < phaseNames.length - 1 && (
                                <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                            )}
                        </div>
                    )
                })}
            </div>

            {/* Detailed Phase Checklist Timeline */}
            <div className="space-y-6">
                {phaseNames.map((phase, phaseIdx) => {
                    const phaseCps = phasesMap[phase]

                    return (
                        <div key={phase} className="space-y-3">
                            <div className="flex items-center justify-between border-b pb-2">
                                <h3 className="text-sm font-bold flex items-center gap-2 text-foreground">
                                    <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-black">
                                        {phaseIdx + 1}
                                    </span>
                                    {phase}
                                </h3>
                                <Badge variant="outline" className="text-[10px] font-bold">
                                    {phaseCps.filter(c => c.status === 'completed').length} / {phaseCps.length} Completed
                                </Badge>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {phaseCps.map((cp) => {
                                    const isCompleted = cp.status === 'completed'
                                    const isOverdue = cp.status === 'overdue' || (cp.dueDate && new Date(cp.dueDate) < new Date() && !isCompleted)
                                    const isBlocked = cp.status === 'blocked'

                                    return (
                                        <Card 
                                            key={cp._id || cp.id}
                                            onClick={() => onCheckpointClick && onCheckpointClick(cp)}
                                            className={`transition-all cursor-pointer hover:border-primary/50 relative overflow-hidden ${
                                                isCompleted ? 'bg-emerald-500/5 border-emerald-500/30' :
                                                isOverdue ? 'bg-red-500/5 border-red-500/30' :
                                                isBlocked ? 'bg-amber-500/5 border-amber-500/30' : 'bg-card border-border/60'
                                            }`}
                                        >
                                            <CardContent className="p-3.5 space-y-2">
                                                <div className="flex items-start justify-between gap-2">
                                                    <div className="flex items-center gap-2">
                                                        {isCompleted ? (
                                                            <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                                                        ) : isOverdue ? (
                                                            <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
                                                        ) : isBlocked ? (
                                                            <Lock className="h-4 w-4 text-amber-500 shrink-0" />
                                                        ) : (
                                                            <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                                                        )}
                                                        <span className="text-xs font-bold leading-tight line-clamp-2 text-foreground">
                                                            {cp.title}
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                                                    <Badge variant={isCompleted ? "secondary" : "outline"} className={`text-[9px] font-bold uppercase ${
                                                        isCompleted ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300' :
                                                        isOverdue ? 'bg-red-500/20 text-red-700 dark:text-red-300' : ''
                                                    }`}>
                                                        {cp.status.replace('_', ' ')}
                                                    </Badge>

                                                    {cp.isMandatory && (
                                                        <span className="text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 border border-amber-500/30">
                                                            Mandatory
                                                        </span>
                                                    )}

                                                    {cp.proofRequired && (
                                                        <span className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 border border-blue-500/30">
                                                            Proof Needed
                                                        </span>
                                                    )}
                                                </div>

                                                {cp.dueDate && (
                                                    <div className="text-[10px] text-muted-foreground font-medium flex items-center justify-between pt-1 border-t border-border/20">
                                                        <span>Due: {format(new Date(cp.dueDate), 'MMM d, yyyy')}</span>
                                                        <span className="capitalize">{cp.assignedRole || 'Developer'}</span>
                                                    </div>
                                                )}
                                            </CardContent>
                                        </Card>
                                    )
                                })}
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
