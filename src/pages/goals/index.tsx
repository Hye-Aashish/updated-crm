import { useState, useEffect } from 'react'
import api from '@/lib/api-client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Target, Trophy, AlertTriangle, Plus, CheckCircle2, RefreshCw, Flame, Calendar, Trash2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { formatCurrency } from '@/lib/utils'

export function GoalsPage() {
    const { toast } = useToast()
    const [goals, setGoals] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [createModalOpen, setCreateModalOpen] = useState(false)

    // Form state
    const [title, setTitle] = useState('')
    const [category, setCategory] = useState('revenue')
    const [targetValue, setTargetValue] = useState('')
    const [unit, setUnit] = useState('₹')
    const [endDate, setEndDate] = useState('')

    const fetchGoals = async () => {
        setLoading(true)
        try {
            const res = await api.get('/goals')
            setGoals(res.data || [])
        } catch (err) {
            console.error('Failed to load goals', err)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchGoals()
    }, [])

    const handleCreateGoal = async (e: any) => {
        e.preventDefault()
        try {
            await api.post('/goals', {
                title,
                category,
                targetValue: Number(targetValue),
                unit,
                endDate
            })
            toast({ title: 'Goal Established', description: 'New OKR target added successfully.' })
            setCreateModalOpen(false)
            setTitle('')
            setTargetValue('')
            setEndDate('')
            fetchGoals()
        } catch (err: any) {
            toast({ title: 'Error', description: err.response?.data?.message || 'Failed to create goal', variant: 'destructive' })
        }
    }

    const handleDeleteGoal = async (id: string) => {
        try {
            await api.delete(`/goals/${id}`)
            toast({ title: 'Goal Removed' })
            fetchGoals()
        } catch (err) {
            console.error(err)
        }
    }

    return (
        <div className="space-y-6 pb-12">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground flex items-center gap-3">
                        <div className="p-2.5 bg-primary/10 rounded-2xl text-primary">
                            <Target className="h-6 w-6" />
                        </div>
                        OKRs & Company Goals
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Track quarterly targets, revenue benchmarks, and team performance milestones.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Button variant="outline" size="sm" onClick={fetchGoals} disabled={loading} className="rounded-xl">
                        <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> Sync Metrics
                    </Button>
                    <Button onClick={() => setCreateModalOpen(true)} className="rounded-xl font-bold">
                        <Plus className="h-4 w-4 mr-2" /> Add Target Goal
                    </Button>
                </div>
            </div>

            {/* Goals Grid */}
            {loading ? (
                <div className="p-12 text-center text-muted-foreground animate-pulse">Syncing company targets & live metrics...</div>
            ) : goals.length === 0 ? (
                <Card className="p-12 text-center text-muted-foreground rounded-2xl">
                    <Trophy className="h-10 w-10 mx-auto mb-3 opacity-30" />
                    <p className="font-bold">No active company goals established yet</p>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {goals.map(goal => {
                        const pct = Math.min(100, Math.round(((goal.currentValue || 0) / (goal.targetValue || 1)) * 100))

                        return (
                            <Card key={goal._id} className="rounded-2xl border bg-card/60 backdrop-blur-sm hover:shadow-lg transition-all duration-300 relative overflow-hidden">
                                <CardHeader className="pb-2 flex flex-row items-start justify-between gap-2">
                                    <div>
                                        <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-wider mb-2">
                                            {goal.category} Target
                                        </Badge>
                                        <h3 className="font-bold text-base text-foreground leading-snug">{goal.title}</h3>
                                    </div>
                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-rose-600" onClick={() => handleDeleteGoal(goal._id)}>
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="flex items-baseline justify-between">
                                        <div className="space-y-0.5">
                                            <p className="text-[10px] font-bold text-muted-foreground uppercase">Current Achievement</p>
                                            <h4 className="text-xl font-black text-foreground">
                                                {goal.unit === '₹' ? formatCurrency(goal.currentValue || 0) : `${goal.currentValue || 0} ${goal.unit}`}
                                            </h4>
                                        </div>
                                        <div className="text-right space-y-0.5">
                                            <p className="text-[10px] font-bold text-muted-foreground uppercase">Target</p>
                                            <p className="text-sm font-bold text-muted-foreground">
                                                {goal.unit === '₹' ? formatCurrency(goal.targetValue || 0) : `${goal.targetValue} ${goal.unit}`}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Progress Bar */}
                                    <div className="space-y-1.5">
                                        <div className="flex justify-between text-xs font-bold">
                                            <span className="text-muted-foreground">Progress</span>
                                            <span className={pct >= 100 ? 'text-emerald-600' : 'text-primary'}>{pct}%</span>
                                        </div>
                                        <div className="h-3 w-full bg-muted rounded-full overflow-hidden">
                                            <div
                                                className={`h-full rounded-full transition-all duration-700 ${pct >= 100 ? 'bg-emerald-500' : 'bg-primary'}`}
                                                style={{ width: `${pct}%` }}
                                            />
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-dashed">
                                        <span className="flex items-center gap-1">
                                            <Calendar className="w-3.5 h-3.5" /> Due {new Date(goal.endDate).toLocaleDateString()}
                                        </span>
                                        {goal.status === 'achieved' && (
                                            <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-200 font-bold text-[10px]">
                                                <Trophy className="w-3 h-3 mr-1" /> Achieved
                                            </Badge>
                                        )}
                                        {goal.status === 'missed' && (
                                            <Badge className="bg-rose-500/10 text-rose-600 border-rose-200 font-bold text-[10px]">
                                                <AlertTriangle className="w-3 h-3 mr-1" /> Missed
                                            </Badge>
                                        )}
                                        {goal.status === 'in_progress' && (
                                            <Badge variant="outline" className="font-bold text-[10px]">
                                                In Progress
                                            </Badge>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        )
                    })}
                </div>
            )}

            {/* Create Goal Modal */}
            <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
                <DialogContent className="sm:max-w-md rounded-2xl">
                    <DialogHeader>
                        <DialogTitle className="font-black text-xl">Set New OKR Target Goal</DialogTitle>
                        <DialogDescription className="text-xs">
                            Define a measurable target for revenue, leads, or completed projects.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleCreateGoal} className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold uppercase text-muted-foreground">Goal Title</label>
                            <Input value={title} onChange={e => setTitle(e.target.value)} required placeholder="e.g. Q3 Total Revenue Target" className="rounded-xl" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold uppercase text-muted-foreground">Category</label>
                                <Select value={category} onValueChange={setCategory}>
                                    <SelectTrigger className="rounded-xl">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="revenue">Revenue</SelectItem>
                                        <SelectItem value="leads">Leads Won</SelectItem>
                                        <SelectItem value="projects">Completed Projects</SelectItem>
                                        <SelectItem value="tasks">Done Tasks</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold uppercase text-muted-foreground">Unit Symbol</label>
                                <Input value={unit} onChange={e => setUnit(e.target.value)} placeholder="e.g. ₹, count, %" className="rounded-xl" />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold uppercase text-muted-foreground">Target Value</label>
                                <Input type="number" value={targetValue} onChange={e => setTargetValue(e.target.value)} required placeholder="e.g. 1000000" className="rounded-xl" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold uppercase text-muted-foreground">End / Target Date</label>
                                <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} required className="rounded-xl" />
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 pt-3">
                            <Button type="button" variant="outline" onClick={() => setCreateModalOpen(false)} className="rounded-xl">Cancel</Button>
                            <Button type="submit" className="rounded-xl font-bold">Set Target</Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    )
}
