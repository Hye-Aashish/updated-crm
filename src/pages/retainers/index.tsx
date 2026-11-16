import { useEffect, useState } from 'react'
import api from '@/lib/api-client'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select'
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog'
import { PageSkeleton } from '@/components/ui/page-skeleton'
import { useToast } from '@/hooks/use-toast'
import { formatCurrency } from '@/lib/utils'
import { format, differenceInDays } from 'date-fns'
import { Plus, RefreshCw, FileText, Repeat, Trash2, Pause, Play } from 'lucide-react'
import { useAppStore } from '@/store'
import { mapClient, mapProject } from '@/lib/mappers'

type Retainer = {
    _id: string
    name: string
    clientId: { _id: string; name: string; company?: string; email?: string } | string
    projectId?: { _id: string; name: string } | string
    amount: number
    frequency: string
    startDate: string
    endDate?: string
    nextBillingDate: string
    status: 'active' | 'paused' | 'cancelled' | 'ended'
    autoInvoice: boolean
    description?: string
    services?: string[]
    invoices?: { _id: string; invoiceNumber: string; total: number; status: string }[]
}

const emptyForm = {
    name: '',
    clientId: '',
    projectId: '',
    amount: '',
    frequency: 'monthly',
    startDate: new Date().toISOString().slice(0, 10),
    nextBillingDate: new Date().toISOString().slice(0, 10),
    endDate: '',
    description: '',
    autoInvoice: true,
    status: 'active'
}

export function RetainersPage() {
    const { toast } = useToast()
    const { clients, projects, setClients, setProjects } = useAppStore()
    const [retainers, setRetainers] = useState<Retainer[]>([])
    const [loading, setLoading] = useState(true)
    const [open, setOpen] = useState(false)
    const [saving, setSaving] = useState(false)
    const [billingId, setBillingId] = useState<string | null>(null)
    const [form, setForm] = useState(emptyForm)

    const load = async () => {
        setLoading(true)
        try {
            const res = await api.get('/retainers')
            setRetainers(res.data || [])
        } catch (err: any) {
            toast({ title: 'Error', description: err?.response?.data?.message || 'Failed to load retainers', variant: 'destructive' })
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        load()
        if (!clients.length) {
            api.get('/clients').then((res) => {
                setClients((res.data || []).map((c: any) => mapClient(c)))
            }).catch(() => {})
        }
        if (!projects.length) {
            api.get('/projects').then((res) => {
                setProjects((res.data || []).map((p: any) => mapProject(p)))
            }).catch(() => {})
        }
    }, [])

    const clientName = (r: Retainer) => {
        if (typeof r.clientId === 'object' && r.clientId) return r.clientId.company || r.clientId.name
        return '—'
    }

    const create = async () => {
        if (!form.name || !form.clientId || !form.amount) {
            toast({ title: 'Missing fields', description: 'Name, client and amount required', variant: 'destructive' })
            return
        }
        setSaving(true)
        try {
            await api.post('/retainers', {
                ...form,
                amount: Number(form.amount),
                projectId: form.projectId || undefined,
                endDate: form.endDate || undefined
            })
            toast({ title: 'Retainer created' })
            setOpen(false)
            setForm(emptyForm)
            load()
        } catch (err: any) {
            toast({ title: 'Error', description: err?.response?.data?.message || 'Create failed', variant: 'destructive' })
        } finally {
            setSaving(false)
        }
    }

    const generateInvoice = async (id: string) => {
        setBillingId(id)
        try {
            const res = await api.post(`/retainers/${id}/generate-invoice`)
            toast({
                title: 'Invoice generated',
                description: res.data?.invoice?.invoiceNumber || 'Billing cycle invoiced'
            })
            load()
        } catch (err: any) {
            toast({ title: 'Error', description: err?.response?.data?.message || 'Billing failed', variant: 'destructive' })
        } finally {
            setBillingId(null)
        }
    }

    const setStatus = async (id: string, status: string) => {
        try {
            await api.put(`/retainers/${id}`, { status })
            load()
        } catch (err: any) {
            toast({ title: 'Error', description: err?.response?.data?.message || 'Update failed', variant: 'destructive' })
        }
    }

    const remove = async (id: string) => {
        if (!confirm('Delete this retainer?')) return
        try {
            await api.delete(`/retainers/${id}`)
            toast({ title: 'Deleted' })
            load()
        } catch (err: any) {
            toast({ title: 'Error', description: err?.response?.data?.message || 'Delete failed', variant: 'destructive' })
        }
    }

    if (loading) return <PageSkeleton />

    const dueSoon = retainers.filter((r) => r.status === 'active' && differenceInDays(new Date(r.nextBillingDate), new Date()) <= 7)

    return (
        <div className="space-y-6 p-4 sm:p-6 max-w-7xl mx-auto">
            <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                        <Repeat className="h-6 w-6 text-primary" /> Retainers
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Recurring monthly / quarterly billing for retainer clients
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={load} className="gap-1.5">
                        <RefreshCw className="h-3.5 w-3.5" /> Refresh
                    </Button>
                    <Button size="sm" onClick={() => setOpen(true)} className="gap-1.5">
                        <Plus className="h-3.5 w-3.5" /> New Retainer
                    </Button>
                </div>
            </div>

            {dueSoon.length > 0 && (
                <Card className="rounded-2xl border-amber-500/30 bg-amber-500/5">
                    <CardContent className="p-4 text-sm">
                        <strong>{dueSoon.length}</strong> retainer{dueSoon.length > 1 ? 's' : ''} due for billing within 7 days.
                    </CardContent>
                </Card>
            )}

            <div className="grid gap-3">
                {retainers.map((r) => {
                    const days = differenceInDays(new Date(r.nextBillingDate), new Date())
                    return (
                        <Card key={r._id} className="rounded-2xl border-border/60">
                            <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
                                <div className="min-w-0 space-y-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <p className="font-bold text-base">{r.name}</p>
                                        <Badge variant="secondary" className="text-[10px] uppercase font-bold">{r.status}</Badge>
                                        <Badge variant="outline" className="text-[10px] font-bold capitalize">{r.frequency}</Badge>
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        {clientName(r)} · Next bill {format(new Date(r.nextBillingDate), 'dd MMM yyyy')}
                                        {r.status === 'active' && (
                                            <span className={days < 0 ? ' text-red-600 font-bold' : days <= 7 ? ' text-amber-600 font-bold' : ''}>
                                                {' '}({days < 0 ? `${Math.abs(days)}d overdue` : `${days}d left`})
                                            </span>
                                        )}
                                    </p>
                                    <p className="text-sm font-bold">{formatCurrency(r.amount)} / {r.frequency}</p>
                                </div>
                                <div className="flex items-center gap-1.5 flex-wrap shrink-0">
                                    {r.status === 'active' && (
                                        <Button
                                            size="sm"
                                            className="h-8 gap-1.5"
                                            disabled={billingId === r._id}
                                            onClick={() => generateInvoice(r._id)}
                                        >
                                            <FileText className="h-3.5 w-3.5" />
                                            {billingId === r._id ? 'Billing…' : 'Generate Invoice'}
                                        </Button>
                                    )}
                                    {r.status === 'active' ? (
                                        <Button size="sm" variant="outline" className="h-8" onClick={() => setStatus(r._id, 'paused')}>
                                            <Pause className="h-3.5 w-3.5" />
                                        </Button>
                                    ) : r.status === 'paused' ? (
                                        <Button size="sm" variant="outline" className="h-8" onClick={() => setStatus(r._id, 'active')}>
                                            <Play className="h-3.5 w-3.5" />
                                        </Button>
                                    ) : null}
                                    <Button size="sm" variant="ghost" className="h-8 text-destructive" onClick={() => remove(r._id)}>
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    )
                })}
                {retainers.length === 0 && (
                    <div className="py-16 text-center text-muted-foreground border border-dashed rounded-2xl">
                        No retainers yet. Create one for recurring client billing.
                    </div>
                )}
            </div>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="max-w-lg rounded-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>New Retainer</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3 py-2">
                        <div className="space-y-1.5">
                            <Label>Name</Label>
                            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Monthly SEO Retainer" />
                        </div>
                        <div className="space-y-1.5">
                            <Label>Client</Label>
                            <Select value={form.clientId} onValueChange={(v) => setForm({ ...form, clientId: v })}>
                                <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                                <SelectContent>
                                    {clients.map((c: any) => (
                                        <SelectItem key={c.id || c._id} value={c.id || c._id}>
                                            {c.company || c.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1.5">
                            <Label>Project (optional)</Label>
                            <Select value={form.projectId || 'none'} onValueChange={(v) => setForm({ ...form, projectId: v === 'none' ? '' : v })}>
                                <SelectTrigger><SelectValue placeholder="Optional project" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">None</SelectItem>
                                    {projects
                                        .filter((p: any) => !form.clientId || p.clientId === form.clientId)
                                        .map((p: any) => (
                                            <SelectItem key={p.id || p._id} value={p.id || p._id}>{p.name}</SelectItem>
                                        ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label>Amount</Label>
                                <Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
                            </div>
                            <div className="space-y-1.5">
                                <Label>Frequency</Label>
                                <Select value={form.frequency} onValueChange={(v) => setForm({ ...form, frequency: v })}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="weekly">Weekly</SelectItem>
                                        <SelectItem value="monthly">Monthly</SelectItem>
                                        <SelectItem value="quarterly">Quarterly</SelectItem>
                                        <SelectItem value="half-yearly">Half-yearly</SelectItem>
                                        <SelectItem value="annually">Annually</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label>Start</Label>
                                <Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
                            </div>
                            <div className="space-y-1.5">
                                <Label>Next billing</Label>
                                <Input type="date" value={form.nextBillingDate} onChange={(e) => setForm({ ...form, nextBillingDate: e.target.value })} />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <Label>Notes</Label>
                            <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                        <Button onClick={create} disabled={saving}>{saving ? 'Saving…' : 'Create'}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}

export default RetainersPage
