import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '@/lib/api-client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { PageSkeleton } from '@/components/ui/page-skeleton'
import { formatCurrency } from '@/lib/utils'
import { usePortalPrefix } from '@/lib/nav-utils'
import { TrendingUp, TrendingDown, RefreshCw, IndianRupee, Clock, Percent } from 'lucide-react'

type ProfitRow = {
    projectId: string
    projectName: string
    status: string
    clientName: string
    budget: number
    billed: number
    collected: number
    hoursLogged: number
    laborCost: number
    profit: number
    marginPct: number | null
    paymentStatus: string
}

type Totals = {
    budget: number
    billed: number
    collected: number
    laborCost: number
    hoursLogged: number
    profit: number
    marginPct: number | null
}

export function ProfitabilityPage() {
    const portalPrefix = usePortalPrefix()
    const [rows, setRows] = useState<ProfitRow[]>([])
    const [totals, setTotals] = useState<Totals | null>(null)
    const [loading, setLoading] = useState(true)

    const load = async () => {
        setLoading(true)
        try {
            const res = await api.get('/profitability')
            setRows(res.data.projects || [])
            setTotals(res.data.totals || null)
        } catch (err) {
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { load() }, [])

    if (loading) return <PageSkeleton />

    return (
        <div className="space-y-6 p-4 sm:p-6 max-w-7xl mx-auto">
            <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Project Profitability</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Budget vs billed vs labor cost — margin per project
                    </p>
                </div>
                <Button variant="outline" size="sm" onClick={load} className="gap-1.5">
                    <RefreshCw className="h-3.5 w-3.5" /> Refresh
                </Button>
            </div>

            {totals && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <Card className="rounded-2xl border-border/60">
                        <CardHeader className="pb-2 pt-4 px-4">
                            <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                                <IndianRupee className="h-3.5 w-3.5" /> Collected
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="px-4 pb-4">
                            <p className="text-xl font-bold">{formatCurrency(totals.collected)}</p>
                            <p className="text-[11px] text-muted-foreground mt-0.5">Billed {formatCurrency(totals.billed)}</p>
                        </CardContent>
                    </Card>
                    <Card className="rounded-2xl border-border/60">
                        <CardHeader className="pb-2 pt-4 px-4">
                            <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                                <Clock className="h-3.5 w-3.5" /> Labor Cost
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="px-4 pb-4">
                            <p className="text-xl font-bold">{formatCurrency(totals.laborCost)}</p>
                            <p className="text-[11px] text-muted-foreground mt-0.5">{totals.hoursLogged}h logged</p>
                        </CardContent>
                    </Card>
                    <Card className="rounded-2xl border-border/60">
                        <CardHeader className="pb-2 pt-4 px-4">
                            <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                                {totals.profit >= 0 ? <TrendingUp className="h-3.5 w-3.5 text-emerald-500" /> : <TrendingDown className="h-3.5 w-3.5 text-red-500" />}
                                Profit
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="px-4 pb-4">
                            <p className={`text-xl font-bold ${totals.profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                {formatCurrency(totals.profit)}
                            </p>
                        </CardContent>
                    </Card>
                    <Card className="rounded-2xl border-border/60">
                        <CardHeader className="pb-2 pt-4 px-4">
                            <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                                <Percent className="h-3.5 w-3.5" /> Margin
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="px-4 pb-4">
                            <p className="text-xl font-bold">
                                {totals.marginPct == null ? '—' : `${totals.marginPct}%`}
                            </p>
                            <p className="text-[11px] text-muted-foreground mt-0.5">Budget {formatCurrency(totals.budget)}</p>
                        </CardContent>
                    </Card>
                </div>
            )}

            <div className="bg-card border border-border/60 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[860px] text-left text-sm">
                        <thead className="bg-muted/40 text-[11px] uppercase font-bold tracking-wider text-muted-foreground border-b border-border/40">
                            <tr>
                                <th className="px-4 py-3">Project</th>
                                <th className="px-4 py-3">Client</th>
                                <th className="px-4 py-3 text-right">Budget</th>
                                <th className="px-4 py-3 text-right">Collected</th>
                                <th className="px-4 py-3 text-right">Labor</th>
                                <th className="px-4 py-3 text-right">Profit</th>
                                <th className="px-4 py-3 text-right">Margin</th>
                                <th className="px-4 py-3">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/30">
                            {rows.map((r) => (
                                <tr key={r.projectId} className="hover:bg-accent/10">
                                    <td className="px-4 py-3">
                                        <Link
                                            to={`${portalPrefix}/projects/${r.projectId}`}
                                            className="font-bold text-foreground hover:text-primary"
                                        >
                                            {r.projectName}
                                        </Link>
                                    </td>
                                    <td className="px-4 py-3 text-muted-foreground">{r.clientName}</td>
                                    <td className="px-4 py-3 text-right font-medium">{formatCurrency(r.budget)}</td>
                                    <td className="px-4 py-3 text-right font-medium">{formatCurrency(r.collected)}</td>
                                    <td className="px-4 py-3 text-right">
                                        <div className="font-medium">{formatCurrency(r.laborCost)}</div>
                                        <div className="text-[10px] text-muted-foreground">{r.hoursLogged}h</div>
                                    </td>
                                    <td className={`px-4 py-3 text-right font-bold ${r.profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                        {formatCurrency(r.profit)}
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        {r.marginPct == null ? '—' : (
                                            <Badge variant="secondary" className={`font-bold ${r.marginPct >= 30 ? 'text-emerald-700' : r.marginPct >= 0 ? 'text-amber-700' : 'text-red-700'}`}>
                                                {r.marginPct}%
                                            </Badge>
                                        )}
                                    </td>
                                    <td className="px-4 py-3">
                                        <Badge variant="outline" className="text-[10px] uppercase font-bold">{r.status}</Badge>
                                    </td>
                                </tr>
                            ))}
                            {rows.length === 0 && (
                                <tr>
                                    <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                                        No projects yet. Create projects and log time / invoices to see margins.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}

export default ProfitabilityPage
