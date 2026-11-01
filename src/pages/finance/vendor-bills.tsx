import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Plus, Loader2, CheckCircle2, Trash2 } from 'lucide-react'
import api from '@/lib/api-client'
import { useToast } from '@/hooks/use-toast'
import { formatCurrency, formatDate } from '@/lib/utils'

export default function VendorBillsPage() {
    const { toast } = useToast()
    const [bills, setBills] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [form, setForm] = useState({
        vendorName: '', billNumber: '', amount: '', tax: '0', category: 'general', notes: ''
    })

    const load = async () => {
        setLoading(true)
        try {
            const res = await api.get('/vendor-bills')
            setBills(res.data || [])
        } catch (e: any) {
            toast({ title: 'Failed to load bills', description: e.message, variant: 'destructive' })
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { load() }, [])

    const create = async () => {
        if (!form.vendorName || !form.amount) return
        try {
            await api.post('/vendor-bills', {
                ...form,
                amount: Number(form.amount),
                tax: Number(form.tax || 0),
                billDate: new Date()
            })
            toast({ title: 'Vendor bill created' })
            setForm({ vendorName: '', billNumber: '', amount: '', tax: '0', category: 'general', notes: '' })
            load()
        } catch (e: any) {
            toast({ title: 'Error', description: e.message, variant: 'destructive' })
        }
    }

    return (
        <div className="space-y-6 max-w-5xl mx-auto min-w-0">
            <div>
                <h1 className="text-xl font-extrabold tracking-tight">Vendor Bills</h1>
                <p className="text-sm text-muted-foreground">Accounts payable — separate from Expenses</p>
            </div>

            <Card>
                <CardHeader className="pb-3"><CardTitle className="text-base">New bill</CardTitle></CardHeader>
                <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    <div className="space-y-1.5"><Label>Vendor</Label><Input value={form.vendorName} onChange={e => setForm({ ...form, vendorName: e.target.value })} /></div>
                    <div className="space-y-1.5"><Label>Bill #</Label><Input value={form.billNumber} onChange={e => setForm({ ...form, billNumber: e.target.value })} placeholder="Optional" /></div>
                    <div className="space-y-1.5"><Label>Amount</Label><Input type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} /></div>
                    <div className="space-y-1.5"><Label>Tax</Label><Input type="number" value={form.tax} onChange={e => setForm({ ...form, tax: e.target.value })} /></div>
                    <div className="space-y-1.5"><Label>Category</Label><Input value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} /></div>
                    <div className="flex items-end"><Button onClick={create} className="w-full"><Plus className="h-4 w-4 mr-1" /> Add Bill</Button></div>
                </CardContent>
            </Card>

            {loading ? (
                <div className="flex justify-center py-12"><Loader2 className="h-7 w-7 animate-spin text-primary" /></div>
            ) : (
                <div className="space-y-2">
                    {bills.length === 0 && <p className="text-sm text-muted-foreground">No vendor bills yet.</p>}
                    {bills.map(b => (
                        <Card key={b._id} className="border-border/60">
                            <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div className="min-w-0">
                                    <p className="font-bold text-sm truncate">{b.vendorName} · {b.billNumber}</p>
                                    <p className="text-xs text-muted-foreground">{formatDate(b.billDate)} · {b.category}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="font-extrabold text-sm">{formatCurrency(b.total || b.amount)}</span>
                                    <Badge variant="secondary">{b.status}</Badge>
                                    {b.status !== 'paid' && (
                                        <Button size="sm" variant="outline" onClick={async () => {
                                            await api.post(`/vendor-bills/${b._id}/mark-paid`)
                                            load()
                                        }}><CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Paid</Button>
                                    )}
                                    <Button size="icon" variant="ghost" className="text-rose-500 h-8 w-8" onClick={async () => {
                                        await api.delete(`/vendor-bills/${b._id}`)
                                        load()
                                    }}><Trash2 className="h-4 w-4" /></Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    )
}
