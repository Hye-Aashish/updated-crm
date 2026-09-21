import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle2, Clock, AlertCircle, Lock, ArrowRight, Calendar, Plus, Edit } from 'lucide-react'
import { format } from 'date-fns'
import type { ProjectCheckpoint, Project } from '@/types'

interface ProjectTimelineViewProps {
    checkpoints: ProjectCheckpoint[]
    project?: Project
    canManage?: boolean
    onCheckpointClick?: (cp: ProjectCheckpoint) => void
    onAddCheckpoint?: () => void
    onEditTimelineDates?: () => void
}

export function ProjectTimelineView({
    checkpoints,
    project,
    canManage = true,
    onCheckpointClick,
    onAddCheckpoint,
    onEditTimelineDates
}: ProjectTimelineViewProps) {
    // Group checkpoints by phase
    const phasesMap = checkpoints.reduce((acc, cp) => {
        if (!acc[cp.phase]) acc[cp.phase] = []
        acc[cp.phase].push(cp)
        return acc
    }, {} as Record<string, ProjectCheckpoint[]>)

    const phaseNames = Object.keys(phasesMap)

    const startDateStr = project?.startDate && !isNaN(new Date(project.startDate).getTime())
        ? format(new Date(project.startDate), 'MMM d, yyyy')
        : 'Not Set'

    const deadlineStr = project?.deadline && !isNaN(new Date(project.deadline).getTime())
        ? format(new Date(project.deadline), 'MMM d, yyyy')
        : 'Not Set'

    return (
        <div className="space-y-6 font-sans">
            {/* Timeline Control & Date Summary Header */}
            <div className="p-4 rounded-2xl border border-border/60 bg-card shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-primary" />
                        <h3 className="text-base font-bold text-foreground">Project Master Timeline</h3>
                    </div>
                    <p className="text-xs text-muted-foreground font-medium">
                        Start: <span className="font-bold text-foreground">{startDateStr}</span> • Deadline: <span className="font-bold text-primary">{deadlineStr}</span>
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    {canManage && onEditTimelineDates && (
                        <Button size="sm" variant="outline" onClick={onEditTimelineDates} className="h-8 text-xs font-bold gap-1.5">
                            <Edit className="h-3.5 w-3.5" /> Edit Timeline Dates
                        </Button>
                    )}
                    {canManage && onAddCheckpoint && (
                        <Button size="sm" onClick={onAddCheckpoint} className="h-8 text-xs font-bold gap-1 bg-primary text-primary-foreground shadow-xs">
                            <Plus className="h-3.5 w-3.5" /> Add Timeline Step
                        </Button>
                    )}
                </div>
            </div>

            {checkpoints.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground text-xs font-semibold border-2 border-dashed rounded-2xl bg-muted/20 space-y-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
                        <Calendar className="h-5 w-5" />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-foreground">No Timeline Steps Configured</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Add your first checkpoint or configure project deadlines to build the timeline sequence.</p>
                    </div>
                    {canManage && onAddCheckpoint && (
                        <Button size="sm" onClick={onAddCheckpoint} className="text-xs font-bold">
                            <Plus className="mr-1.5 h-3.5 w-3.5" /> Add First Checkpoint
                        </Button>
                    )}
                </div>
            ) : (
                <>
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
                </>
            )}
        </div>
    )
}
