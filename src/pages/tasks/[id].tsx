import { useEffect, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Loader2, Plus, Star, Mic, CheckSquare, Square } from 'lucide-react'
import api from '@/lib/api-client'
import { useToast } from '@/hooks/use-toast'
import { format } from 'date-fns'
import { isSpeechSupported, startVoiceInput } from '@/lib/voice-input'
import { saveDraft, loadDraft, clearDraft } from '@/lib/offline-drafts'
import { usePortalPrefix } from '@/lib/nav-utils'

export function TaskDetailPage() {
    const { id } = useParams()
    const navigate = useNavigate()
    const portalPrefix = usePortalPrefix()
    const { toast } = useToast()
    const [task, setTask] = useState<any>(null)
    const [subtasks, setSubtasks] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [newCheck, setNewCheck] = useState('')
    const [newSub, setNewSub] = useState('')
    const [desc, setDesc] = useState('')

    const load = async () => {
        if (!id) return
        setLoading(true)
        try {
            const [t, s] = await Promise.all([
                api.get(`/tasks/${id}`),
                api.get(`/tasks/${id}/subtasks`).catch(() => ({ data: [] }))
            ])
            setTask(t.data)
            setDesc(t.data.description || '')
            setSubtasks(s.data || [])
            const draft = loadDraft<string>(`task-desc-${id}`)
            if (draft) setDesc(draft)
        } catch {
            toast({ title: 'Task not found', variant: 'destructive' })
            navigate(`${portalPrefix}/tasks`)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { load() }, [id])
    useEffect(() => {
        if (!id) return
        saveDraft(`task-desc-${id}`, desc)
    }, [desc, id])

    const saveTask = async (patch: any) => {
        const res = await api.put(`/tasks/${id}`, patch)
        setTask(res.data)
        if (patch.description !== undefined) clearDraft(`task-desc-${id}`)
        toast({ description: 'Saved' })
    }

    if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
    if (!task) return null

    const checklist = task.checklist || []
    const slaOver = task.slaDueAt && new Date(task.slaDueAt) < new Date()

    return (
        <div className="max-w-3xl mx-auto space-y-4 min-w-0">
            <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="h-4 w-4" /></Button>
                <div className="min-w-0 flex-1">
                    <h1 className="text-xl font-extrabold truncate">{task.title}</h1>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                        <Badge variant="secondary">{task.status}</Badge>
                        <Badge variant="outline">{task.priority}</Badge>
                        {task.dueDate && <Badge variant="outline">Due {format(new Date(task.dueDate), 'MMM d')}</Badge>}
                        {slaOver && <Badge className="bg-rose-500/15 text-rose-700">SLA overdue</Badge>}
                        {task.slaDueAt && !slaOver && <Badge variant="outline">SLA {format(new Date(task.slaDueAt), 'MMM d HH:mm')}</Badge>}
                    </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => saveTask({ starred: !task.starred })}>
                    <Star className={`h-4 w-4 ${task.starred ? 'fill-amber-500 text-amber-500' : ''}`} />
                </Button>
            </div>

            <Card>
                <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
                    <CardTitle className="text-sm">Description (supports @mentions)</CardTitle>
                    <div className="flex gap-1">
                        {isSpeechSupported() && (
                            <Button size="sm" variant="outline" onClick={() => startVoiceInput(t => setDesc(d => d ? `${d} ${t}` : t))}>
                                <Mic className="h-3.5 w-3.5 mr-1" /> Voice
                            </Button>
                        )}
                        <Button size="sm" onClick={() => saveTask({ description: desc })}>Save</Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <textarea
                        className="w-full min-h-[120px] rounded-xl border border-input bg-background p-3 text-sm"
                        value={desc}
                        onChange={e => setDesc(e.target.value)}
                        placeholder="Details… mention teammates with @Name"
                    />
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Checklist</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                    {checklist.map((c: any, i: number) => (
                        <button
                            key={i}
                            type="button"
                            className="flex items-center gap-2 w-full text-left text-sm p-2 rounded-lg hover:bg-muted/50"
                            onClick={async () => {
                                const next = checklist.map((x: any, idx: number) => idx === i ? { ...x, completed: !x.completed } : x)
                                await saveTask({ checklist: next })
                            }}
                        >
                            {c.completed ? <CheckSquare className="h-4 w-4 text-emerald-600" /> : <Square className="h-4 w-4 text-muted-foreground" />}
                            <span className={c.completed ? 'line-through text-muted-foreground' : ''}>{c.text}</span>
                        </button>
                    ))}
                    <div className="flex gap-2">
                        <Input value={newCheck} onChange={e => setNewCheck(e.target.value)} placeholder="New checklist item" className="h-9" />
                        <Button size="sm" className="h-9" onClick={async () => {
                            if (!newCheck.trim()) return
                            await saveTask({ checklist: [...checklist, { text: newCheck.trim(), completed: false }] })
                            setNewCheck('')
                        }}><Plus className="h-4 w-4" /></Button>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Subtasks</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                    {subtasks.map(s => (
                        <Link key={s._id} to={`${portalPrefix}/tasks/${s._id}`} className="flex items-center justify-between p-2 rounded-lg border text-sm hover:bg-muted/40">
                            <span className="font-semibold truncate">{s.title}</span>
                            <Badge variant="secondary">{s.status}</Badge>
                        </Link>
                    ))}
                    <div className="flex gap-2">
                        <Input value={newSub} onChange={e => setNewSub(e.target.value)} placeholder="Add subtask" className="h-9" />
                        <Button size="sm" className="h-9" onClick={async () => {
                            if (!newSub.trim()) return
                            await api.post(`/tasks/${id}/subtasks`, { title: newSub.trim() })
                            setNewSub('')
                            load()
                        }}><Plus className="h-4 w-4" /></Button>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Recurrence</CardTitle></CardHeader>
                <CardContent className="flex flex-wrap gap-2 items-center">
                    <select
                        className="h-9 rounded-md border px-2 text-sm bg-background"
                        value={task.recurrence?.frequency || 'none'}
                        onChange={e => {
                            const frequency = e.target.value
                            saveTask({
                                recurrence: {
                                    enabled: frequency !== 'none',
                                    frequency: frequency === 'none' ? 'none' : frequency,
                                    interval: 1,
                                    nextRunAt: frequency === 'none' ? undefined : new Date(Date.now() + 86400000),
                                    templateTitle: task.title
                                }
                            })
                        }}
                    >
                        <option value="none">Off</option>
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                    </select>
                    <span className="text-xs text-muted-foreground">Cron clones when due</span>
                </CardContent>
            </Card>
        </div>
    )
}
