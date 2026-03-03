import { useMemo, useState } from 'react'
import {
    DndContext,
    DragOverlay,
    closestCorners,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragStartEvent,
    DragEndEvent,
    DragOverEvent,
} from '@dnd-kit/core'
import {
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { Task, TaskStatus } from '@/types'
import { useAppStore } from '@/store'
import { TaskCard } from './task-card'

interface TaskBoardProps {
    tasks: Task[]
}

const columns: { id: TaskStatus; title: string }[] = [
    { id: 'todo', title: 'To Do' },
    { id: 'in-progress', title: 'In Progress' },
    { id: 'review', title: 'Review' },
    { id: 'client-approval', title: 'Client Approval' },
    { id: 'done', title: 'Done' },
]

export function TaskBoard({ tasks }: TaskBoardProps) {
    const { updateTask, users } = useAppStore()
    const [activeId, setActiveId] = useState<string | null>(null)

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: { distance: 8 },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    )

    const tasksByStatus = useMemo(() => {
        const grouped: Record<TaskStatus, Task[]> = {
            todo: [],
            'in-progress': [],
            review: [],
            'client-approval': [],
            done: [],
        }
        tasks.forEach((task) => {
            if (grouped[task.status]) {
                grouped[task.status].push(task)
            }
        })
        return grouped
    }, [tasks])

    const handleDragStart = (event: DragStartEvent) => {
        setActiveId(event.active.id as string)
    }

    const handleDragOver = (_event: DragOverEvent) => {
        // Keep empty for now
    }

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event

        if (!over) {
            setActiveId(null)
            return
        }

        const activeTask = tasks.find((t) => t.id === active.id)
        if (!activeTask) return

        let newStatus: TaskStatus | undefined

        // If dropped on a column container
        if (columns.some(col => col.id === over.id)) {
            newStatus = over.id as TaskStatus
        }
        // If dropped on another task
        else {
            const overTask = tasks.find((t) => t.id === over.id)
            if (overTask) {
                newStatus = overTask.status
            }
        }

        if (newStatus && newStatus !== activeTask.status) {
            const updates: Partial<Task> = { status: newStatus }

            // Timer Logic
            if (newStatus === 'in-progress' && activeTask.status === 'todo') {
                // START TIMER
                updates.isTimerRunning = true
                updates.lastStartTime = Date.now()
            } else if (newStatus === 'done') {
                // STOP TIMER
                if (activeTask.isTimerRunning) {
                    const elapsed = Date.now() - (activeTask.lastStartTime || Date.now())
                    updates.isTimerRunning = false
                    updates.totalTimeSpent = (activeTask.totalTimeSpent || 0) + elapsed
                    updates.lastStartTime = undefined
                }
            } else if (activeTask.isTimerRunning && newStatus !== 'in-progress') {
                // PAUSE TIMER (if moving from In Progress to Todo/Review etc)
                const elapsed = Date.now() - (activeTask.lastStartTime || Date.now())
                updates.isTimerRunning = false
                updates.totalTimeSpent = (activeTask.totalTimeSpent || 0) + elapsed
                updates.lastStartTime = undefined
            }
            // Logic for resuming if moving back to in-progress from done?
            // The user only specified Todo -> InProgress. But generally back to InProgress should resume.
            else if (newStatus === 'in-progress' && !activeTask.isTimerRunning) {
                updates.isTimerRunning = true
                updates.lastStartTime = Date.now()
            }

            updateTask(activeTask.id, updates)
        }

        setActiveId(null)
    }

    const activeTask = activeId ? tasks.find((t) => t.id === activeId) : null

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
        >
            <div className="flex gap-6 h-full items-start overflow-x-auto pb-4">
                {columns.map((col) => (
                    <div key={col.id} className="bg-muted/30 rounded-lg p-4 min-h-[500px] w-80 shrink-0">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
                                {col.title}
                            </h3>
                            <span className="bg-muted text-xs font-bold px-2 py-1 rounded-full">
                                {tasksByStatus[col.id]?.length || 0}
                            </span>
                        </div>

                        <SortableContext
                            id={col.id}
                            items={tasksByStatus[col.id]?.map((t) => t.id) || []}
                            strategy={verticalListSortingStrategy}
                        >
                            <div className="space-y-3 min-h-[100px]">
                                {tasksByStatus[col.id]?.map((task) => (
                                    <TaskCard
                                        key={task.id}
                                        task={task}
                                        userName={users.find(u => u.id === task.assigneeId)?.name}
                                    />
                                ))}
                            </div>
                        </SortableContext>
                    </div>
                ))}
            </div>

            <DragOverlay>
                {activeTask ? (
                    <TaskCard
                        task={activeTask}
                        userName={users.find(u => u.id === activeTask.assigneeId)?.name}
                    />
                ) : null}
            </DragOverlay>
        </DndContext>
    )
}
