import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Loader2, Star, Calendar, AlertTriangle, CheckSquare } from 'lucide-react'
import api from '@/lib/api-client'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'

export default function MyDayPage() {
    const [loading, setLoading] = useState(true)
    const [tasks, setTasks] = useState<any[]>([])

    const load = async () => {
        setLoading(true)
        try {
            const res = await api.get('/tasks/my-day')
            setTasks(res.data || [])
        } catch {
            setTasks([])
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { load() }, [])

    const toggleStar = async (task: any) => {
        await api.put(`/tasks/${task._id}`, { starred: !task.starred })
        load()
    }

    const markDone = async (task: any) => {
        await api.put(`/tasks/${task._id}`, { status: 'done' })
        load()
    }

    if (loading) {
        return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
    }

    const overdue = tasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date(new Date().setHours(0, 0, 0, 0)))
    const today = tasks.filter(t => {
        if (!t.dueDate) return t.starred
        const d = new Date(t.dueDate)
        const n = new Date()
        return d.toDateString() === n.toDateString()
    })

    return (
        <div className="space-y-6 max-w-3xl mx-auto min-w-0">
            <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                    <h1 className="text-xl font-extrabold tracking-tight">My Day</h1>
                    <p className="text-sm text-muted-foreground">Due today, overdue, and starred tasks</p>
                </div>
                <Button asChild variant="outline" size="sm"><Link to="/tasks">Full board</Link></Button>
            </div>

            {tasks.length === 0 && (
                <Card><CardContent className="py-12 text-center text-muted-foreground text-sm">You're clear for today. Nice work.</CardContent></Card>
            )}

            {overdue.length > 0 && (
                <section className="space-y-2">
                    <h2 className="text-xs font-extrabold uppercase tracking-wider text-rose-600 flex items-center gap-1.5">
                        <AlertTriangle className="h-3.5 w-3.5" /> Overdue ({overdue.length})
                    </h2>
                    {overdue.map(t => <TaskRow key={t._id} task={t} onStar={() => toggleStar(t)} onDone={() => markDone(t)} />)}
                </section>
            )}

            <section className="space-y-2">
                <h2 className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" /> Today ({today.length})
                </h2>
                {today.length === 0 && <p className="text-sm text-muted-foreground px-1">No tasks due today.</p>}
                {today.map(t => <TaskRow key={t._id} task={t} onStar={() => toggleStar(t)} onDone={() => markDone(t)} />)}
            </section>
        </div>
    )
}

function TaskRow({ task, onStar, onDone }: { task: any; onStar: () => void; onDone: () => void }) {
    const slaOver = task.slaDueAt && new Date(task.slaDueAt) < new Date()
    return (
        <Card className={cn('border-border/60', slaOver && 'border-rose-300/60')}>
            <CardContent className="p-3.5 flex items-center gap-3">
                <button type="button" onClick={onDone} className="text-muted-foreground hover:text-emerald-600" title="Mark done">
                    <CheckSquare className="h-5 w-5" />
                </button>
                <div className="min-w-0 flex-1">
                    <Link to={`/tasks/${task._id}`} className="text-sm font-bold hover:text-primary truncate block">{task.title}</Link>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                        <Badge variant="secondary" className="text-[10px]">{task.priority}</Badge>
                        {task.dueDate && <Badge variant="outline" className="text-[10px]">{format(new Date(task.dueDate), 'MMM d')}</Badge>}
                        {slaOver && <Badge className="text-[10px] bg-rose-500/15 text-rose-700">SLA overdue</Badge>}
                    </div>
                </div>
                <button type="button" onClick={onStar} className={cn(task.starred ? 'text-amber-500' : 'text-muted-foreground')}>
                    <Star className={cn('h-4 w-4', task.starred && 'fill-current')} />
                </button>
            </CardContent>
        </Card>
    )
}
