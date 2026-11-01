import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Download } from 'lucide-react'
import api from '@/lib/api-client'
import { formatCurrency, formatDate } from '@/lib/utils'

export default function GstReportPage() {
    const [from, setFrom] = useState('')
    const [to, setTo] = useState('')
    const [loading, setLoading] = useState(false)
    const [data, setData] = useState<{ rows: any[]; summary: any } | null>(null)
    const [pnl, setPnl] = useState<any>(null)

    const load = async () => {
        setLoading(true)
        try {
            const qs = new URLSearchParams()
            if (from) qs.set('from', from)
            if (to) qs.set('to', to)
            const [gst, pnlRes] = await Promise.all([
                api.get(`/finance-reports/gst?${qs}`),
                api.get(`/finance-reports/pnl?groupBy=month&${qs}`)
            ])
            setData(gst.data)
            setPnl(pnlRes.data)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { load() }, [])

    const exportCsv = () => {
        if (!data?.rows?.length) return
        const header = 'Invoice,Date,Client,GSTIN,Taxable,Tax,Total,Status\n'
        const body = data.rows.map(r =>
            [r.invoiceNumber, r.date, `"${r.clientName || ''}"`, r.gstNumber, r.taxableValue, r.tax, r.total, r.status].join(',')
        ).join('\n')
        const blob = new Blob([header + body], { type: 'text/csv' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'gst-report.csv'
        a.click()
        URL.revokeObjectURL(url)
    }

    return (
        <div className="space-y-6 max-w-6xl mx-auto min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
                <div>
                    <h1 className="text-xl font-extrabold tracking-tight">GST & P&L Reports</h1>
                    <p className="text-sm text-muted-foreground">Tax lines from invoices + profit by month</p>
                </div>
                <div className="flex flex-wrap gap-2 items-end">
                    <div><Label className="text-[10px]">From</Label><Input type="date" value={from} onChange={e => setFrom(e.target.value)} className="h-9" /></div>
                    <div><Label className="text-[10px]">To</Label><Input type="date" value={to} onChange={e => setTo(e.target.value)} className="h-9" /></div>
                    <Button onClick={load} disabled={loading} size="sm">{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Refresh'}</Button>
                    <Button onClick={exportCsv} variant="outline" size="sm"><Download className="h-4 w-4 mr-1" /> CSV</Button>
                </div>
            </div>

            {data?.summary && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <Card><CardContent className="p-4"><p className="text-[10px] uppercase text-muted-foreground font-bold">Invoices</p><p className="text-lg font-extrabold">{data.summary.count}</p></CardContent></Card>
                    <Card><CardContent className="p-4"><p className="text-[10px] uppercase text-muted-foreground font-bold">Taxable</p><p className="text-lg font-extrabold">{formatCurrency(data.summary.taxableValue)}</p></CardContent></Card>
                    <Card><CardContent className="p-4"><p className="text-[10px] uppercase text-muted-foreground font-bold">Tax</p><p className="text-lg font-extrabold">{formatCurrency(data.summary.tax)}</p></CardContent></Card>
                    <Card><CardContent className="p-4"><p className="text-[10px] uppercase text-muted-foreground font-bold">Total</p><p className="text-lg font-extrabold">{formatCurrency(data.summary.total)}</p></CardContent></Card>
                </div>
            )}

            <Card>
                <CardHeader className="pb-2"><CardTitle className="text-base">GST rows</CardTitle></CardHeader>
                <CardContent className="overflow-x-auto">
                    <table className="w-full text-sm min-w-[640px]">
                        <thead>
                            <tr className="text-left text-[11px] uppercase text-muted-foreground border-b">
                                <th className="py-2 pr-2">Invoice</th>
                                <th className="py-2 pr-2">Date</th>
                                <th className="py-2 pr-2">Client</th>
                                <th className="py-2 pr-2">GSTIN</th>
                                <th className="py-2 pr-2 text-right">Taxable</th>
                                <th className="py-2 pr-2 text-right">Tax</th>
                                <th className="py-2 text-right">Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(data?.rows || []).map((r, i) => (
                                <tr key={i} className="border-b border-border/40">
                                    <td className="py-2 pr-2 font-semibold">{r.invoiceNumber}</td>
                                    <td className="py-2 pr-2">{r.date ? formatDate(r.date) : ''}</td>
                                    <td className="py-2 pr-2 truncate max-w-[140px]">{r.clientName}</td>
                                    <td className="py-2 pr-2 font-mono text-xs">{r.gstNumber}</td>
                                    <td className="py-2 pr-2 text-right">{formatCurrency(r.taxableValue)}</td>
                                    <td className="py-2 pr-2 text-right">{formatCurrency(r.tax)}</td>
                                    <td className="py-2 text-right font-bold">{formatCurrency(r.total)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {!data?.rows?.length && <p className="text-sm text-muted-foreground py-6 text-center">No rows for this range.</p>}
                </CardContent>
            </Card>

            {pnl?.rows?.length > 0 && (
                <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-base">P&L by month (base INR)</CardTitle></CardHeader>
                    <CardContent className="overflow-x-auto">
                        <table className="w-full text-sm min-w-[520px]">
                            <thead>
                                <tr className="text-left text-[11px] uppercase text-muted-foreground border-b">
                                    <th className="py-2">Month</th>
                                    <th className="py-2 text-right">Revenue</th>
                                    <th className="py-2 text-right">Expenses</th>
                                    <th className="py-2 text-right">Vendor Bills</th>
                                    <th className="py-2 text-right">Profit</th>
                                </tr>
                            </thead>
                            <tbody>
                                {pnl.rows.map((r: any) => (
                                    <tr key={r.key} className="border-b border-border/40">
                                        <td className="py-2 font-semibold">{r.key}</td>
                                        <td className="py-2 text-right">{formatCurrency(r.revenue)}</td>
                                        <td className="py-2 text-right">{formatCurrency(r.expenses)}</td>
                                        <td className="py-2 text-right">{formatCurrency(r.vendorBills)}</td>
                                        <td className={cnProfit(r.profit)}>{formatCurrency(r.profit)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}

function cnProfit(n: number) {
    return `py-2 text-right font-extrabold ${n >= 0 ? 'text-emerald-600' : 'text-rose-600'}`
}
