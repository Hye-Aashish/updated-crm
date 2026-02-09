import { useState, useEffect } from 'react'
import { Plus, Search, Filter, FileText, AlertCircle, Banknote, Loader2, Mail, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '@/store'
import { formatCurrency, formatDate } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'
import api from '@/lib/api-client'
import type { Invoice } from '@/types'

export function InvoicesPage() {
    const navigate = useNavigate()
    const { toast } = useToast()
    const { invoices, clients, setInvoices, setClients } = useAppStore()
    const [loading, setLoading] = useState(true)

    // Send Modal State
    const [sendModalOpen, setSendModalOpen] = useState(false)
    const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)
    const [recipientEmail, setRecipientEmail] = useState('')
    const [sending, setSending] = useState(false)

    const openSendModal = (e: React.MouseEvent, invoice: Invoice) => {
        e.stopPropagation()
        setSelectedInvoice(invoice)
        const client = clients.find(c => c.id === invoice.clientId)
        setRecipientEmail(client?.email || '')
        setSendModalOpen(true)
    }

    const handleSendEmail = async () => {
        if (!selectedInvoice || !recipientEmail) return
        setSending(true)
        try {
            await api.post(`/invoices/${selectedInvoice.id}/send`, {
                customEmail: recipientEmail
            })
            toast({ title: "Email Sent", description: `Invoice sent to ${recipientEmail}` })
            setSendModalOpen(false)
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.response?.data?.message || "Failed to send email",
                variant: "destructive"
            })
        } finally {
            setSending(false)
        }
    }

    useEffect(() => {
        const fetchInvoicesAndClients = async () => {
            try {
                // Fetch Clients if empty
                if (clients.length === 0) {
                    try {
                        const clientsRes = await api.get('/clients')
                        if (clientsRes.data) {
                            const mappedClients = clientsRes.data.map((c: any) => ({
                                id: c._id,
                                name: c.name,
                                company: c.company,
                                email: c.email,
                                phone: c.phone,
                                type: c.type || 'one-time',
                                status: c.status || 'active',
                                createdAt: new Date(c.createdAt),
                                updatedAt: new Date(c.updatedAt)
                            }))
                            setClients(mappedClients)
                        }
                    } catch (error) {
                        console.error('Failed to fetch clients', error)
                    }
                }

                // Fetch Invoices
                const response = await api.get('/invoices')
                if (response.data) {
                    const mappedInvoices = response.data.map((i: any) => ({
                        id: i._id,
                        invoiceNumber: i.invoiceNumber,
                        number: i.invoiceNumber, // Alias
                        clientId: i.clientId,
                        projectId: i.projectId,
                        type: i.type,
                        status: i.status,
                        lineItems: (i.lineItems || []).map((item: any) => ({
                            id: item._id || item.id,
                            name: item.name,
                            quantity: item.quantity,
                            rate: item.rate,
                            taxPercentage: item.taxPercentage
                        })),
                        subtotal: i.subtotal,
                        tax: i.tax,
                        total: i.total,
                        date: new Date(i.date),
                        dueDate: new Date(i.dueDate),
                        paidDate: i.paidDate ? new Date(i.paidDate) : undefined,
                        createdAt: new Date(i.createdAt),
                        updatedAt: new Date(i.updatedAt)
                    }))
                    setInvoices(mappedInvoices)
                }
            } catch (error) {
                console.error('Failed to fetch invoices', error)
            } finally {
                setLoading(false)
            }
        }

        fetchInvoicesAndClients()
    }, [])

    // --- KPI Calculations ---
    const totalInvoiced = invoices.reduce((sum, i) => sum + i.total, 0)
    const totalPaid = invoices.filter(i => i.status === 'paid').reduce((sum, i) => sum + i.total, 0)
    const totalDue = invoices.filter(i => i.status === 'pending' || i.status === 'overdue').reduce((sum, i) => sum + i.total, 0)

    // --- KPI Card ---
    const StatsCard = ({ title, value, icon: Icon, color, bg }: any) => (
        <Card className="border-l-4 shadow-sm bg-card hover:bg-muted/20 transition-colors" style={{ borderLeftColor: color }}>
            <CardContent className="p-4 flex items-center justify-between">
                <div>
                    <p className="text-sm font-medium text-muted-foreground">{title}</p>
                    <h3 className="text-2xl font-bold mt-1 text-foreground">{value}</h3>
                </div>
                <div className={`p-2 rounded-lg ${bg}`}>
                    <Icon className="h-5 w-5" style={{ color: color }} />
                </div>
            </CardContent>
        </Card>
    )

    if (loading && invoices.length === 0) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Invoices</h1>
                    <p className="text-muted-foreground mt-1">Manage billing and payments.</p>
                </div>
                <Button onClick={() => navigate('/invoices/new')}>
                    <Plus className="mr-2 h-4 w-4" /> Create Invoice
                </Button>
            </div>

            {/* --- Module Specific KPIs --- */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatsCard title="Total Invoiced" value={formatCurrency(totalInvoiced)} icon={FileText} color="#3b82f6" bg="bg-blue-500/15 dark:bg-blue-500/10" />
                <StatsCard title="Received" value={formatCurrency(totalPaid)} icon={Banknote} color="#10b981" bg="bg-emerald-500/15 dark:bg-emerald-500/10" />
                <StatsCard title="Due Amount" value={formatCurrency(totalDue)} icon={AlertCircle} color="#ef4444" bg="bg-rose-500/15 dark:bg-rose-500/10" />
            </div>

            <div className="flex items-center gap-4">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input placeholder="Search invoices..." className="pl-10 bg-card/60 backdrop-blur-sm focus:bg-card transition-all" />
                </div>
                <Button variant="outline" className="bg-card/60 backdrop-blur-sm hover:bg-accent transition-all">
                    <Filter className="mr-2 h-4 w-4" /> Filter
                </Button>
            </div>

            <div className="rounded-md border bg-card shadow-sm overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Invoice</TableHead>
                            <TableHead>Client</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Due Date</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Action</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {invoices.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                                    No invoices found. Create one to get started.
                                </TableCell>
                            </TableRow>
                        ) : (
                            invoices.map((invoice) => {
                                const client = clients.find((c) => c.id === invoice.clientId)
                                return (
                                    <TableRow key={invoice.id} className="cursor-pointer hover:bg-muted/30 transition-colors border-border/50" onClick={() => navigate(`/invoices/${invoice.id}`)}>
                                        <TableCell className="font-bold text-foreground">{invoice.number}</TableCell>
                                        <TableCell className="text-muted-foreground font-medium">{client?.name || 'Unknown'}</TableCell>
                                        <TableCell className="text-muted-foreground/80">{formatDate(invoice.date)}</TableCell>
                                        <TableCell className="text-muted-foreground/80">{formatDate(invoice.dueDate)}</TableCell>
                                        <TableCell className="font-bold text-foreground">{formatCurrency(invoice.total)}</TableCell>
                                        <TableCell>
                                            <Badge
                                                variant="outline"
                                                className={`capitalize px-2.5 py-0.5 rounded-full font-bold text-[10px] tracking-wider border-0 ${invoice.status === 'paid' ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' :
                                                    invoice.status === 'overdue' ? 'bg-rose-500/20 text-rose-600 dark:text-rose-400' :
                                                        'bg-slate-500/20 text-slate-600 dark:text-slate-400'
                                                    }`}
                                            >
                                                {invoice.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="h-8 w-8 p-0"
                                                    onClick={(e) => openSendModal(e, invoice)}
                                                    title="Send Email"
                                                >
                                                    <Mail className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8"
                                                    onClick={() => navigate(`/invoices/${invoice.id}`)}
                                                >
                                                    View
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )
                            })
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* --- Send Email Modal --- */}
            <Dialog open={sendModalOpen} onOpenChange={setSendModalOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Mail className="h-5 w-5 text-blue-600" />
                            Send Invoice via Email
                        </DialogTitle>
                        <DialogDescription>
                            Review the recipient's email address for Invoice <strong>#{selectedInvoice?.invoiceNumber}</strong>.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                Recipient Email Address
                            </label>
                            <Input
                                type="email"
                                placeholder="client@example.com"
                                value={recipientEmail}
                                onChange={(e) => setRecipientEmail(e.target.value)}
                                className="focus-visible:ring-blue-600"
                            />
                        </div>
                    </div>
                    <DialogFooter className="sm:justify-end gap-2">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={() => setSendModalOpen(false)}
                            disabled={sending}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            onClick={handleSendEmail}
                            disabled={sending || !recipientEmail}
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                        >
                            {sending ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Sending...
                                </>
                            ) : (
                                <>
                                    <Send className="mr-2 h-4 w-4" />
                                    Send Invoice
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
