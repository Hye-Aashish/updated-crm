import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { useAppStore } from '@/store'
import { MoreHorizontal, Trash2, Clock, Video, FileText, Calendar as CalendarIcon } from 'lucide-react'
import { formatDate } from '@/lib/utils'

interface TaskBoardCardProps {
    task: any
    users: any[]
    setSelectedTask: (task: any) => void
    handleDragStart: (task: any) => void
    handleDeleteTask: (taskId: string) => void
}

export function TaskBoardCardV2({ task, users, setSelectedTask, handleDragStart, handleDeleteTask }: TaskBoardCardProps) {
    const { currentUser, projects } = useAppStore()
    const assignee = users.find(u => u.id === task.assigneeId)
    const project = projects.find(p => p.id === task.projectId)

    const canDelete = currentUser?.role === 'admin' || currentUser?.role === 'owner' || (project && project.pmId === currentUser?.id)

    const [elapsed, setElapsed] = useState(task.totalTimeSpent || 0)

    useEffect(() => {
        let interval: NodeJS.Timeout

        if (task.isTimerRunning && task.lastStartTime) {
            // Update immediately
            const now = Date.now()
            setElapsed((task.totalTimeSpent || 0) + (now - task.lastStartTime))

            interval = setInterval(() => {
                const now = Date.now()
                // Calculate current session duration based on lastStartTime
                const currentSession = now - (task.lastStartTime || now)
                setElapsed((task.totalTimeSpent || 0) + currentSession)
            }, 1000)
        } else {
            setElapsed(task.totalTimeSpent || 0)
        }

        return () => clearInterval(interval)
    }, [task.isTimerRunning, task.lastStartTime, task.totalTimeSpent])

    // Short format for card
    const formatTimeShort = (ms: number) => {
        const seconds = Math.floor((ms / 1000) % 60)
        const minutes = Math.floor((ms / (1000 * 60)) % 60)
        const hours = Math.floor(ms / (1000 * 60 * 60))
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
    }

    return (
        <Card
            draggable
            onClick={() => setSelectedTask(task)}
            onDragStart={() => handleDragStart(task)}
            className="shadow-sm hover:shadow-md transition-shadow cursor-pointer active:cursor-grabbing border-l-4"
            style={{ borderLeftColor: task.isTimerRunning ? '#22c55e' : 'transparent' }}
        >
            <CardContent className="p-3">
                <div className="flex justify-between items-start">
                    <div className="font-medium text-sm flex-1">{task.title}</div>
                    {canDelete && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-6 w-6 -mr-2 -mt-2 focus:ring-0 ring-offset-0" onClick={(e) => e.stopPropagation()}>
                                    <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleDeleteTask(task.id) }} className="text-destructive focus:text-destructive cursor-pointer">
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Delete
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}
                </div>

                {task.attachments && task.attachments.length > 0 && (
                    <div className="mt-2 flex gap-1 flex-wrap">
                        {task.attachments.slice(0, 3).map((att: any, idx: number) => (
                            att.fileType === 'image' ? (
                                <div key={idx} className="w-8 h-8 rounded overflow-hidden">
                                    <img src={att.data} alt="" className="w-full h-full object-cover" />
                                </div>
                            ) : (
                                <div key={idx} className="w-8 h-8 rounded overflow-hidden bg-gray-100 flex items-center justify-center border">
                                    {att.fileType === 'video' ? (
                                        <Video className="w-4 h-4 text-gray-500" />
                                    ) : (
                                        <FileText className="w-4 h-4 text-gray-500" />
                                    )}
                                </div>
                            )
                        ))}
                        {task.attachments.length > 3 && <span className="text-xs text-muted-foreground flex items-center">+{task.attachments.length - 3}</span>}
                    </div>
                )}

                <div className="mt-3 flex items-center justify-between text-xs">
                    <Badge variant="outline" className={`font-normal px-1.5 py-0 h-5 capitalize ${task.priority === 'urgent' ? 'border-red-500 text-red-500' :
                        task.priority === 'high' ? 'border-orange-500 text-orange-500' :
                            task.priority === 'medium' ? 'border-yellow-500 text-yellow-500' :
                                'border-gray-500 text-gray-500'
                        }`}>
                        {task.priority}
                    </Badge>

                    {/* Timer / Date Display */}
                    {task.isTimerRunning || elapsed > 0 ? (
                        <span className={`flex items-center gap-1 font-mono font-medium ${task.isTimerRunning ? 'text-green-600' : 'text-blue-600'}`}>
                            <Clock className={`h-3 w-3 ${task.isTimerRunning ? 'animate-pulse' : ''}`} />
                            {formatTimeShort(elapsed)}
                        </span>
                    ) : (
                        <span className="text-muted-foreground flex items-center gap-1">
                            <CalendarIcon className="h-3 w-3" />
                            {formatDate(task.dueDate)}
                        </span>
                    )}
                </div>

                {assignee && (
                    <div className="mt-3 pt-3 border-t flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                            <AvatarFallback className="text-xs bg-primary/10 text-primary">
                                {assignee.name.charAt(0)}
                            </AvatarFallback>
                        </Avatar>
                        <span className="text-xs text-muted-foreground">{assignee.name}</span>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
