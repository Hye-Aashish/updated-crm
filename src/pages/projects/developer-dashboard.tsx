import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { CheckCircle2, Clock, AlertCircle, Lock, Search, Filter, Folder, Link as LinkIcon, FileText } from 'lucide-react'
import api from '@/lib/api-client'
import { useToast } from '@/hooks/use-toast'
import { CheckpointProofDialog } from '@/components/projects/checkpoint-proof-dialog'
import { PageSkeleton } from '@/components/ui/page-skeleton'
import { format } from 'date-fns'

export function DeveloperDashboardPage() {
    const { toast } = useToast()
    const [checkpoints, setCheckpoints] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')
    const [statusFilter, setStatusFilter] = useState<string>('all')
    const [selectedCpForProof, setSelectedCpForProof] = useState<any | null>(null)
    const [proofDialogOpen, setProofDialogOpen] = useState(false)

    const fetchDeveloperCheckpoints = async () => {
        try {
            setLoading(true)
            const res = await api.get('/projects/developer/checkpoints')
            setCheckpoints(res.data || [])
        } catch (err) {
            console.error(err)
            toast({ title: 'Error', description: 'Failed to load assigned checkpoints', variant: 'destructive' })
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchDeveloperCheckpoints()
    }, [])

    const handleUpdateStatus = async (cp: any, newStatus: string) => {
        try {
            await api.put(`/projects/${cp.projectId._id || cp.projectId}/checkpoints/${cp._id || cp.id}`, {
                status: newStatus
            })
            toast({ description: `Checkpoint marked as ${newStatus}` })
            fetchDeveloperCheckpoints()
        } catch (err: any) {
            toast({ title: 'Update Blocked', description: err.response?.data?.message || 'Failed to update checkpoint', variant: 'destructive' })
        }
    }

    const handleSubmitProof = async (proofData: any) => {
        if (!selectedCpForProof) return
        try {
            const pId = selectedCpForProof.projectId._id || selectedCpForProof.projectId
            const cpId = selectedCpForProof._id || selectedCpForProof.id
            await api.put(`/projects/${pId}/checkpoints/${cpId}`, {
                status: 'completed',
                ...proofData
            })
            toast({ description: 'Proof submitted and checkpoint completed successfully!' })
            fetchDeveloperCheckpoints()
        } catch (err: any) {
            toast({ title: 'Completion Blocked', description: err.response?.data?.message || 'Failed to complete checkpoint', variant: 'destructive' })
            throw err
        }
    }

    const filtered = checkpoints.filter(cp => {
        const matchesSearch = !searchQuery || 
            cp.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
            cp.projectId?.name?.toLowerCase().includes(searchQuery.toLowerCase())
        
        const isOverdue = cp.status === 'overdue' || (cp.dueDate && new Date(cp.dueDate) < new Date() && cp.status !== 'completed')
        
        if (statusFilter === 'overdue') return matchesSearch && isOverdue
        if (statusFilter === 'pending') return matchesSearch && cp.status !== 'completed'
        if (statusFilter === 'completed') return matchesSearch && cp.status === 'completed'
        if (statusFilter === 'proof') return matchesSearch && cp.proofRequired && cp.status !== 'completed'
        return matchesSearch
    })

    const totalAssigned = checkpoints.length
    const completedCount = checkpoints.filter(c => c.status === 'completed').length
    const overdueCount = checkpoints.filter(c => c.status === 'overdue' || (c.dueDate && new Date(c.dueDate) < new Date() && c.status !== 'completed')).length
    const proofNeededCount = checkpoints.filter(c => c.proofRequired && c.status !== 'completed').length

    if (loading) return <PageSkeleton />

    return (
        <div className="space-y-6 font-sans pb-10">
            {/* Page Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">Developer Workspace</h1>
                    <p className="text-sm text-muted-foreground font-medium">Track your assigned checkpoints, submit proofs, and clear dependencies.</p>
                </div>
            </div>

            {/* KPI Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="bg-card border-border/60">
                    <CardContent className="p-4 space-y-1">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Total Assigned</p>
                        <p className="text-2xl font-black text-foreground">{totalAssigned}</p>
                    </CardContent>
                </Card>

                <Card className="bg-emerald-500/10 border-emerald-500/30">
                    <CardContent className="p-4 space-y-1">
                        <p className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider">Completed Tasks</p>
                        <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{completedCount}</p>
                    </CardContent>
                </Card>

                <Card className="bg-red-500/10 border-red-500/30">
                    <CardContent className="p-4 space-y-1">
                        <p className="text-[10px] font-bold text-red-700 dark:text-red-300 uppercase tracking-wider">Overdue Checkpoints</p>
                        <p className="text-2xl font-black text-red-600 dark:text-red-400">{overdueCount}</p>
                    </CardContent>
                </Card>

                <Card className="bg-amber-500/10 border-amber-500/30">
                    <CardContent className="p-4 space-y-1">
                        <p className="text-[10px] font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wider">Proof Required</p>
                        <p className="text-2xl font-black text-amber-600 dark:text-amber-400">{proofNeededCount}</p>
                    </CardContent>
                </Card>
            </div>

            {/* Filter Bar */}
            <div className="flex flex-col sm:flex-row items-center gap-3">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search checkpoint or project..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 h-9 text-xs rounded-lg"
                    />
                </div>
                <div className="flex gap-1.5 overflow-x-auto w-full sm:w-auto">
                    {['all', 'pending', 'overdue', 'proof', 'completed'].map(f => (
                        <Button
                            key={f}
                            variant={statusFilter === f ? 'secondary' : 'outline'}
                            size="sm"
                            onClick={() => setStatusFilter(f)}
                            className="text-xs capitalize h-9 rounded-lg font-bold"
                        >
                            {f}
                        </Button>
                    ))}
                </div>
            </div>

            {/* Assigned Checkpoints Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filtered.map(cp => {
                    const isCompleted = cp.status === 'completed'
                    const isOverdue = cp.status === 'overdue' || (cp.dueDate && new Date(cp.dueDate) < new Date() && !isCompleted)

                    return (
                        <Card key={cp._id || cp.id} className={`border transition-all ${
                            isCompleted ? 'bg-emerald-500/5 border-emerald-500/30' :
                            isOverdue ? 'bg-red-500/5 border-red-500/30' : 'bg-card border-border/60'
                        }`}>
                            <CardHeader className="p-4 pb-2 flex flex-row items-start justify-between gap-2 space-y-0">
                                <div className="space-y-1">
                                    <Badge variant="outline" className="text-[9px] font-bold text-primary border-primary/30 flex items-center gap-1 w-fit">
                                        <Folder className="h-3 w-3" />
                                        {cp.projectId?.name || 'Project'}
                                    </Badge>
                                    <CardTitle className="text-sm font-bold text-foreground leading-snug">
                                        {cp.title}
                                    </CardTitle>
                                </div>
                                <Badge variant={isCompleted ? "secondary" : "outline"} className={`text-[9px] font-bold uppercase ${
                                    isCompleted ? 'bg-emerald-500/20 text-emerald-700' :
                                    isOverdue ? 'bg-red-500/20 text-red-700' : ''
                                }`}>
                                    {cp.status.replace('_', ' ')}
                                </Badge>
                            </CardHeader>

                            <CardContent className="p-4 pt-2 space-y-3">
                                <div className="text-xs text-muted-foreground">
                                    Phase: <span className="font-semibold text-foreground">{cp.phase}</span>
                                </div>

                                <div className="flex flex-wrap gap-1.5">
                                    {cp.isMandatory && (
                                        <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 border border-amber-500/30">
                                            Mandatory
                                        </span>
                                    )}
                                    {cp.proofRequired && (
                                        <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded bg-blue-500/10 text-blue-600 border border-blue-500/30">
                                            Proof Required ({cp.proofType})
                                        </span>
                                    )}
                                </div>

                                {cp.dueDate && (
                                    <div className="text-[11px] font-medium text-muted-foreground flex items-center justify-between pt-2 border-t border-border/20">
                                        <span>Due: {format(new Date(cp.dueDate), 'MMM d, yyyy')}</span>
                                        <span className="capitalize font-bold text-foreground">{cp.priority} Priority</span>
                                    </div>
                                )}

                                {/* Proof Display if submitted */}
                                {(cp.proofUrl || cp.proofFile || cp.proofVersion) && (
                                    <div className="p-2 bg-muted/40 rounded-lg text-[10px] space-y-1 font-medium border border-border/40">
                                        <p className="font-bold text-emerald-600 dark:text-emerald-400">✓ Submitted Proof:</p>
                                        {cp.proofUrl && <p className="truncate"><LinkIcon className="inline h-3 w-3 mr-1" />{cp.proofUrl}</p>}
                                        {cp.proofFile && <p className="truncate"><FileText className="inline h-3 w-3 mr-1" />{cp.proofFile}</p>}
                                        {cp.proofVersion && <p>Version: {cp.proofVersion}</p>}
                                    </div>
                                )}

                                {/* Actions */}
                                {!isCompleted && (
                                    <div className="flex gap-2 pt-2">
                                        {cp.proofRequired ? (
                                            <Button 
                                                size="sm" 
                                                onClick={() => {
                                                    setSelectedCpForProof(cp)
                                                    setProofDialogOpen(true)
                                                }}
                                                className="w-full text-xs font-bold bg-primary hover:bg-primary/90"
                                            >
                                                Submit Proof & Complete
                                            </Button>
                                        ) : (
                                            <Button 
                                                size="sm" 
                                                onClick={() => handleUpdateStatus(cp, 'completed')}
                                                className="w-full text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
                                            >
                                                Mark Completed
                                            </Button>
                                        )}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )
                })}
                {filtered.length === 0 && (
                    <div className="col-span-full py-12 text-center text-muted-foreground font-medium text-sm border border-dashed rounded-xl">
                        No assigned checkpoints match your filter.
                    </div>
                )}
            </div>

            {/* Proof Submission Modal */}
            <CheckpointProofDialog
                open={proofDialogOpen}
                onOpenChange={setProofDialogOpen}
                checkpoint={selectedCpForProof}
                onSubmitProof={handleSubmitProof}
            />
        </div>
    )
}
