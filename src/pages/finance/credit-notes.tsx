import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Loader2, Plus } from 'lucide-react'
import api from '@/lib/api-client'
import { useToast } from '@/hooks/use-toast'
import { formatCurrency, formatDate } from '@/lib/utils'

export default function CreditNotesPage() {
    const { toast } = useToast()
    const [notes, setNotes] = useState<any[]>([])
    const [clients, setClients] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [form, setForm] = useState({ clientId: '', invoiceId: '', amount: '', reason: '' })

    const load = async () => {
        setLoading(true)
        try {
            const [n, c] = await Promise.all([
                api.get('/credit-notes'),
                api.get('/clients')
            ])
            setNotes(n.data || [])
            setClients(Array.isArray(c.data) ? c.data : [])
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { load() }, [])

    const create = async () => {
        if (!form.clientId || !form.amount) return
        try {
            await api.post('/credit-notes', {
                clientId: form.clientId,
                invoiceId: form.invoiceId || undefined,
                amount: Number(form.amount),
                reason: form.reason
            })
            toast({ title: 'Credit note issued' })
            setForm({ clientId: '', invoiceId: '', amount: '', reason: '' })
            load()
        } catch (e: any) {
            toast({ title: 'Error', description: e.message, variant: 'destructive' })
        }
    }

    return (
        <div className="space-y-6 max-w-4xl mx-auto min-w-0">
            <div>
                <h1 className="text-xl font-extrabold tracking-tight">Credit Notes</h1>
                <p className="text-sm text-muted-foreground">Issue and apply credit against invoices</p>
            </div>

            <Card>
                <CardHeader className="pb-3"><CardTitle className="text-base">Issue credit note</CardTitle></CardHeader>
                <CardContent className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                        <Label>Client</Label>
                        <select className="w-full h-10 rounded-md border px-3 text-sm bg-background" value={form.clientId} onChange={e => setForm({ ...form, clientId: e.target.value })}>
                            <option value="">Select client</option>
                            {clients.map((c: any) => (
                                <option key={c._id || c.id} value={c._id || c.id}>{c.company || c.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="space-y-1.5"><Label>Invoice ID (optional)</Label><Input value={form.invoiceId} onChange={e => setForm({ ...form, invoiceId: e.target.value })} placeholder="Mongo id" /></div>
                    <div className="space-y-1.5"><Label>Amount</Label><Input type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} /></div>
                    <div className="space-y-1.5"><Label>Reason</Label><Input value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} /></div>
                    <Button onClick={create} className="sm:col-span-2"><Plus className="h-4 w-4 mr-1" /> Issue</Button>
                </CardContent>
            </Card>

            {loading ? <div className="flex justify-center py-10"><Loader2 className="animate-spin h-7 w-7 text-primary" /></div> : (
                <div className="space-y-2">
                    {notes.map(n => (
                        <Card key={n._id}>
                            <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div>
                                    <p className="font-bold text-sm">{n.creditNoteNumber}</p>
                                    <p className="text-xs text-muted-foreground">{formatDate(n.createdAt)} · {n.reason || '—'}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="font-extrabold">{formatCurrency(n.amount)}</span>
                                    <Badge>{n.status}</Badge>
                                    {n.status === 'issued' && n.invoiceId && (
                                        <Button size="sm" variant="outline" onClick={async () => {
                                            await api.post(`/credit-notes/${n._id}/apply`, { invoiceId: n.invoiceId })
                                            toast({ title: 'Applied to invoice' })
                                            load()
                                        }}>Apply</Button>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    )
}
