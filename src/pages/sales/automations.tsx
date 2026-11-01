import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Plus, Trash2, Loader2, Zap, ListOrdered } from 'lucide-react'
import api from '@/lib/api-client'
import { useToast } from '@/hooks/use-toast'

export default function SalesAutomationsPage() {
    const { toast } = useToast()
    const [loading, setLoading] = useState(true)
    const [rules, setRules] = useState<any[]>([])
    const [sequences, setSequences] = useState<any[]>([])
    const [stages, setStages] = useState<any[]>([])
    const [saving, setSaving] = useState(false)

    const [ruleForm, setRuleForm] = useState({
        name: '',
        onStage: '',
        taskTitle: 'Follow up with lead',
        reminderInHours: 24
    })
    const [seqForm, setSeqForm] = useState({
        name: '',
        step1Day: 0,
        step1Msg: 'Initial follow-up',
        step2Day: 3,
        step2Msg: 'Second follow-up',
        step3Day: 7,
        step3Msg: 'Final follow-up'
    })

    const load = async () => {
        setLoading(true)
        try {
            const [r, s, st] = await Promise.all([
                api.get('/sales-automation/pipeline-rules'),
                api.get('/sales-automation/sequences'),
                api.get('/leads/stages')
            ])
            setRules(r.data || [])
            setSequences(s.data || [])
            setStages(st.data || [])
            if (!ruleForm.onStage && st.data?.[0]) {
                setRuleForm(f => ({ ...f, onStage: st.data[0].id || st.data[0]._id }))
            }
        } catch (e: any) {
            toast({ title: 'Failed to load', description: e.message, variant: 'destructive' })
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { load() }, [])

    const createRule = async () => {
        if (!ruleForm.name || !ruleForm.onStage) return
        setSaving(true)
        try {
            await api.post('/sales-automation/pipeline-rules', {
                name: ruleForm.name,
                onStage: ruleForm.onStage,
                actions: [
                    { type: 'createTask', taskTitle: ruleForm.taskTitle, dueInDays: 1, taskPriority: 'medium' },
                    { type: 'setReminder', reminderInHours: Number(ruleForm.reminderInHours) || 24 }
                ]
            })
            toast({ title: 'Rule created' })
            setRuleForm(f => ({ ...f, name: '' }))
            load()
        } catch (e: any) {
            toast({ title: 'Error', description: e.message, variant: 'destructive' })
        } finally {
            setSaving(false)
        }
    }

    const createSequence = async () => {
        if (!seqForm.name) return
        setSaving(true)
        try {
            await api.post('/sales-automation/sequences', {
                name: seqForm.name,
                steps: [
                    { dayOffset: Number(seqForm.step1Day), message: seqForm.step1Msg, channel: 'reminder' },
                    { dayOffset: Number(seqForm.step2Day), message: seqForm.step2Msg, channel: 'reminder' },
                    { dayOffset: Number(seqForm.step3Day), message: seqForm.step3Msg, channel: 'reminder' },
                ]
            })
            toast({ title: 'Sequence created' })
            setSeqForm(f => ({ ...f, name: '' }))
            load()
        } catch (e: any) {
            toast({ title: 'Error', description: e.message, variant: 'destructive' })
        } finally {
            setSaving(false)
        }
    }

    if (loading) {
        return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
    }

    return (
        <div className="space-y-6 max-w-5xl mx-auto min-w-0">
            <div>
                <h1 className="text-xl font-extrabold tracking-tight">Sales Automations</h1>
                <p className="text-sm text-muted-foreground">Pipeline rules & follow-up sequences (additive — existing lead flow unchanged)</p>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
                <Card className="border-border/60">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2"><Zap className="h-4 w-4 text-primary" /> Pipeline Rules</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>Rule name</Label>
                            <Input value={ruleForm.name} onChange={e => setRuleForm({ ...ruleForm, name: e.target.value })} placeholder="e.g. Proposal follow-up" />
                        </div>
                        <div className="space-y-2">
                            <Label>When stage becomes</Label>
                            <select
                                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                                value={ruleForm.onStage}
                                onChange={e => setRuleForm({ ...ruleForm, onStage: e.target.value })}
                            >
                                {stages.map((s: any) => (
                                    <option key={s.id || s._id} value={s.id || s._id}>{s.label || s.id}</option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <Label>Auto task title</Label>
                            <Input value={ruleForm.taskTitle} onChange={e => setRuleForm({ ...ruleForm, taskTitle: e.target.value })} />
                        </div>
                        <div className="space-y-2">
                            <Label>Reminder in hours</Label>
                            <Input type="number" value={ruleForm.reminderInHours} onChange={e => setRuleForm({ ...ruleForm, reminderInHours: Number(e.target.value) })} />
                        </div>
                        <Button onClick={createRule} disabled={saving} className="w-full">
                            <Plus className="h-4 w-4 mr-1" /> Create Rule
                        </Button>

                        <div className="space-y-2 pt-2 border-t">
                            {rules.length === 0 && <p className="text-xs text-muted-foreground">No rules yet.</p>}
                            {rules.map(r => (
                                <div key={r._id} className="flex items-center justify-between gap-2 p-2.5 rounded-xl border bg-card">
                                    <div className="min-w-0">
                                        <p className="text-sm font-bold truncate">{r.name}</p>
                                        <p className="text-[11px] text-muted-foreground">On stage: {r.onStage}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Badge variant="secondary">{r.enabled ? 'On' : 'Off'}</Badge>
                                        <Button size="icon" variant="ghost" className="h-8 w-8 text-rose-500" onClick={async () => {
                                            await api.delete(`/sales-automation/pipeline-rules/${r._id}`)
                                            load()
                                        }}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-border/60">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2"><ListOrdered className="h-4 w-4 text-primary" /> Follow-up Sequences</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>Sequence name</Label>
                            <Input value={seqForm.name} onChange={e => setSeqForm({ ...seqForm, name: e.target.value })} placeholder="e.g. 7-day nurture" />
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                            <div>
                                <Label className="text-[10px]">Day 1</Label>
                                <Input type="number" value={seqForm.step1Day} onChange={e => setSeqForm({ ...seqForm, step1Day: Number(e.target.value) })} />
                            </div>
                            <div className="col-span-2">
                                <Label className="text-[10px]">Message</Label>
                                <Input value={seqForm.step1Msg} onChange={e => setSeqForm({ ...seqForm, step1Msg: e.target.value })} />
                            </div>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                            <div>
                                <Label className="text-[10px]">Day 2</Label>
                                <Input type="number" value={seqForm.step2Day} onChange={e => setSeqForm({ ...seqForm, step2Day: Number(e.target.value) })} />
                            </div>
                            <div className="col-span-2">
                                <Label className="text-[10px]">Message</Label>
                                <Input value={seqForm.step2Msg} onChange={e => setSeqForm({ ...seqForm, step2Msg: e.target.value })} />
                            </div>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                            <div>
                                <Label className="text-[10px]">Day 3</Label>
                                <Input type="number" value={seqForm.step3Day} onChange={e => setSeqForm({ ...seqForm, step3Day: Number(e.target.value) })} />
                            </div>
                            <div className="col-span-2">
                                <Label className="text-[10px]">Message</Label>
                                <Input value={seqForm.step3Msg} onChange={e => setSeqForm({ ...seqForm, step3Msg: e.target.value })} />
                            </div>
                        </div>
                        <Button onClick={createSequence} disabled={saving} className="w-full">
                            <Plus className="h-4 w-4 mr-1" /> Create Sequence
                        </Button>

                        <div className="space-y-2 pt-2 border-t">
                            {sequences.length === 0 && <p className="text-xs text-muted-foreground">No sequences yet. Enroll leads via API or lead panel.</p>}
                            {sequences.map(s => (
                                <div key={s._id} className="flex items-center justify-between gap-2 p-2.5 rounded-xl border bg-card">
                                    <div className="min-w-0">
                                        <p className="text-sm font-bold truncate">{s.name}</p>
                                        <p className="text-[11px] text-muted-foreground">{s.steps?.length || 0} steps</p>
                                    </div>
                                    <Button size="icon" variant="ghost" className="h-8 w-8 text-rose-500" onClick={async () => {
                                        await api.delete(`/sales-automation/sequences/${s._id}`)
                                        load()
                                    }}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
