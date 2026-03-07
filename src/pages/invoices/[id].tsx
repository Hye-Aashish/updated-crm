import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { ArrowLeft, Printer, Mail, Loader2, Building2, LayoutTemplate, Palette, Check, Type, Image as ImageIcon, Ban, CreditCard, Download, Banknote } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'
import api from '@/lib/api-client'
import type { Invoice, Client } from '@/types'
import { useToast } from '@/hooks/use-toast'
import { useAppStore } from '@/store'

type InvoiceTemplate = 'corporate' | 'creative' | 'elegant' | 'modern' | 'minimal' | 'classic'

const COLOR_PRESETS = [
    { name: 'Nexprism Blue', value: '#0047AB' },
    { name: 'Blue', value: '#2563eb' },
    { name: 'Purple', value: '#7c3aed' },
    { name: 'Emerald', value: '#059669' },
    { name: 'Rose', value: '#e11d48' },
    { name: 'Orange', value: '#ea580c' },
    { name: 'Black', value: '#0f172a' },
]

export function InvoiceDetailPage() {
    const { id } = useParams()
    const navigate = useNavigate()
    const { toast } = useToast()
    const [loading, setLoading] = useState(true)
    const [invoice, setInvoice] = useState<Invoice | null>(null)
    const [client, setClient] = useState<Client | null>(null)
    const { currentUser } = useAppStore()


    // Customization State
    const [template, setTemplate] = useState<InvoiceTemplate>('corporate')
    const [themeColor, setThemeColor] = useState('#0047AB')
    const [showColorPicker, setShowColorPicker] = useState(false)
    const [sending, setSending] = useState(false)
    const [paying, setPaying] = useState(false)
    const [watermarkType, setWatermarkType] = useState<'none' | 'logo' | 'text'>('logo')
    const [watermarkText, setWatermarkText] = useState('PAID')

    useEffect(() => {
        const fetchInvoiceData = async () => {
            if (!id) return;
            try {
                const invoiceRes = await api.get(`/invoices/${id}`)
                const invData = invoiceRes.data
                const mappedInvoice: Invoice = {
                    id: invData._id,
                    invoiceNumber: invData.invoiceNumber,
                    number: invData.invoiceNumber,
                    clientId: invData.clientId,
                    projectId: invData.projectId,
                    status: invData.status,
                    type: invData.type,
                    date: new Date(invData.date),
                    dueDate: new Date(invData.dueDate),
                    paidDate: invData.paidDate ? new Date(invData.paidDate) : undefined,
                    lineItems: (invData.lineItems || []).map((item: any) => ({
                        id: item._id || Math.random().toString(),
                        name: item.name,
                        quantity: item.quantity,
                        rate: item.rate,
                        taxPercentage: item.taxPercentage
                    })),
                    subtotal: invData.subtotal,
                    tax: invData.tax,
                    total: invData.total,
                    createdAt: new Date(invData.createdAt),
                    updatedAt: new Date(invData.updatedAt),
                }
                setInvoice(mappedInvoice)

                // Use pre-populated client/project if available (e.g. from public view)
                if (invData.client) {
                    setClient({ ...invData.client, id: invData.client._id })
                } else if (mappedInvoice.clientId) {
                    try {
                        const clientRes = await api.get(`/clients/${mappedInvoice.clientId}`)
                        setClient({ ...clientRes.data, id: clientRes.data._id })
                    } catch (e) { }
                }

            } catch (error) {
                console.error("Failed to fetch invoice", error)
            } finally {
                setLoading(false)
            }
        }
        fetchInvoiceData()
    }, [id])

    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const status = urlParams.get('status');
        if (status === 'success') {
            const verifyPayment = async () => {
                try {
                    await api.get(`/invoices/${id}/verify-payment`)
                    // Reload invoice data
                    const invoiceRes = await api.get(`/invoices/${id}`)
                    const invData = invoiceRes.data
                    setInvoice({
                        ...invData,
                        id: invData._id,
                        date: new Date(invData.date),
                        dueDate: new Date(invData.dueDate),
                        createdAt: new Date(invData.createdAt),
                        updatedAt: new Date(invData.updatedAt)
                    })

                    toast({
                        title: "Payment Successful!",
                        description: "Your payment has been verified and updated.",
                        variant: "success"
                    })
                } catch (error) {
                    console.error("Verification failed", error)
                } finally {
                    // Clear URL params
                    window.history.replaceState({}, document.title, window.location.pathname);
                }
            }
            verifyPayment();
        }
    }, [id])

    const handlePrint = () => window.print()

    if (loading) return <div className="flex justify-center h-screen items-center"><Loader2 className="animate-spin" /></div>
    if (!invoice) return <div>Invoice not found</div>
    // --- TEMPLATES ---

    // 1. MODERN
    const ModernTemplate = () => (
        <Card className="overflow-hidden shadow-none border border-slate-200 bg-white relative">
            {/* Watermark */}
            {(watermarkType !== 'none' || invoice.status === 'paid') && (
                <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none z-0 overflow-hidden">
                    {invoice.status === 'paid' ? (
                        <span className="text-[120px] font-black rotate-[-35deg] whitespace-nowrap uppercase tracking-widest select-none text-emerald-600 border-[12px] border-emerald-600 px-6 rounded-[24px]">
                            PAID
                        </span>
                    ) : watermarkType === 'logo' ? (
                        <Building2 className="w-[400px] h-[400px]" />
                    ) : (
                        <span className="text-[100px] font-black rotate-[-35deg] whitespace-nowrap uppercase tracking-widest select-none">
                            {watermarkText}
                        </span>
                    )}
                </div>
            )}
            <div className="p-12 relative z-10">
                <div className="flex justify-between items-end border-b-2 pb-8 mb-8" style={{ borderColor: themeColor }}>
                    <div className="flex items-center gap-4">
                        <div className="p-4 rounded-xl text-white shadow-md" style={{ backgroundColor: themeColor }}>
                            <Building2 className="h-8 w-8" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black text-slate-800 tracking-tight">AGENCY PRO</h1>
                            <p className="text-slate-500 font-medium tracking-wide">Digital Solutions</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <h2 className="text-5xl font-black mb-2 opacity-15" style={{ color: themeColor }}>INVOICE</h2>
                        <div className="text-2xl font-bold text-slate-700">#{invoice.invoiceNumber}</div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-8 mb-12 bg-slate-50 p-8 rounded-2xl">
                    <div>
                        <p className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">Invoice To</p>
                        {client ? (
                            <div>
                                <h3 className="text-xl font-bold text-slate-800">{client.company || client.name}</h3>
                                <p className="text-slate-600 mt-1">{client.email}</p>
                                <p className="text-slate-600">{client.address}</p>
                            </div>
                        ) : <p className="text-slate-600">Client Details</p>}
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <p className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-1">Issue Date</p>
                            <p className="font-bold text-slate-700">{formatDate(invoice.date)}</p>
                        </div>
                        <div>
                            <p className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-1">Due Date</p>
                            <p className="font-bold text-slate-700">{formatDate(invoice.dueDate)}</p>
                        </div>
                    </div>
                </div>

                <div className="mb-8 border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
                    <table className="w-full">
                        <thead className="text-white" style={{ backgroundColor: themeColor }}>
                            <tr>
                                <th className="py-4 px-6 text-left font-semibold">Service</th>
                                <th className="py-4 px-6 text-center font-semibold">Qty</th>
                                <th className="py-4 px-6 text-right font-semibold">Rate</th>
                                <th className="py-4 px-6 text-right font-semibold">Amount</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                            {invoice.lineItems.map((item, i) => (
                                <tr key={i} className="hover:bg-slate-50 transition-colors">
                                    <td className="py-5 px-6 font-medium text-slate-800">{item.name}</td>
                                    <td className="py-5 px-6 text-center text-slate-600">{item.quantity}</td>
                                    <td className="py-5 px-6 text-right text-slate-600">{formatCurrency(item.rate)}</td>
                                    <td className="py-5 px-6 text-right font-bold text-slate-800">{formatCurrency(item.quantity * item.rate)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="flex justify-between items-end">
                    <div className="text-xs text-slate-500 bg-slate-50 p-4 rounded-xl max-w-sm">
                        <p className="font-bold text-slate-700 mb-1">Notes / Terms</p>
                        <p className="whitespace-pre-wrap">{invoice.termsAndConditions || 'Thank you for your business. Payment is expected within due date.'}</p>
                    </div>
                    <div className="w-72 space-y-4">
                        <div className="flex justify-between text-slate-600 font-medium">
                            <span>Subtotal</span>
                            <span>{formatCurrency(invoice.subtotal)}</span>
                        </div>
                        <div className="flex justify-between text-slate-600 font-medium pb-4 border-b border-slate-200">
                            <span>Tax (18%)</span>
                            <span>{formatCurrency(invoice.tax)}</span>
                        </div>
                        <div className="flex justify-between text-2xl font-black" style={{ color: themeColor }}>
                            <span>Total</span>
                            <span>{formatCurrency(invoice.total)}</span>
                        </div>
                    </div>
                </div>

                {invoice.status !== 'paid' && (
                    <div className="flex justify-end mt-8 no-print">
                        <Button onClick={handlePayOnline} disabled={paying} className="bg-emerald-600 hover:bg-emerald-700 w-72 h-12 text-lg shadow-md font-bold">
                            {paying ? <Loader2 className="animate-spin mr-2" /> : <CreditCard className="mr-2" />} PAY NOW
                        </Button>
                    </div>
                )}
            </div>
        </Card>
    )

    // 2. MINIMAL
    const MinimalTemplate = () => (
        <Card className="overflow-hidden shadow-none rounded-none border border-black bg-white relative p-16 font-mono">
            {/* Watermark in minimal is subtle */}
            {(watermarkType !== 'none' || invoice.status === 'paid') && (
                <div className="absolute inset-0 flex items-center justify-center opacity-[0.02] pointer-events-none z-0 overflow-hidden">
                    {invoice.status === 'paid' ? (
                        <span className="text-[120px] font-black rotate-[-35deg] whitespace-nowrap uppercase tracking-widest select-none text-emerald-600 border-[8px] border-emerald-600 px-6 rounded-none">
                            PAID
                        </span>
                    ) : watermarkType === 'logo' ? (
                        <Building2 className="w-[300px] h-[300px]" />
                    ) : (
                        <span className="text-[100px] font-black rotate-[-35deg] whitespace-nowrap uppercase tracking-widest select-none">
                            {watermarkText}
                        </span>
                    )}
                </div>
            )}
            <div className="relative z-10">
                <div className="flex justify-between items-start border-b-2 border-black pb-12 mb-12">
                    <div>
                        <h1 className="text-xl font-bold uppercase tracking-widest text-black mb-1">YOUR COMPANY</h1>
                        <p className="text-sm text-gray-500 uppercase tracking-wider">Professional Services</p>
                    </div>
                    <div className="text-right">
                        <h2 className="text-4xl font-light tracking-widest mb-4">INVOICE</h2>
                        <p className="font-bold"># {invoice.invoiceNumber}</p>
                        <p className="text-sm mt-1">{formatDate(invoice.date)}</p>
                    </div>
                </div>

                <div className="mb-16">
                    <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">Billed To</p>
                    {client ? (
                        <div>
                            <p className="font-bold text-xl uppercase tracking-wider">{client.company || client.name}</p>
                            <p className="mt-2 text-sm uppercase tracking-wider text-gray-600">{client.address}</p>
                            <p className="text-sm uppercase tracking-wider text-gray-600">{client.email}</p>
                        </div>
                    ) : <p className="text-sm uppercase tracking-wider text-gray-600">Client Info</p>}
                </div>

                <div className="mb-16 border-t border-b border-gray-200 py-4">
                    <div className="grid grid-cols-12 gap-4 font-bold text-xs uppercase tracking-widest text-gray-400 mb-4">
                        <div className="col-span-6">Description</div>
                        <div className="col-span-2 text-center">Qty</div>
                        <div className="col-span-2 text-right">Rate</div>
                        <div className="col-span-2 text-right">Amount</div>
                    </div>
                    {invoice.lineItems.map((item, i) => (
                        <div key={i} className="grid grid-cols-12 gap-4 py-3 border-b border-gray-50 last:border-0">
                            <div className="col-span-6 font-medium uppercase tracking-wider text-sm">{item.name}</div>
                            <div className="col-span-2 text-center text-gray-500">{item.quantity}</div>
                            <div className="col-span-2 text-right text-gray-500">{formatCurrency(item.rate)}</div>
                            <div className="col-span-2 text-right font-bold">{formatCurrency(item.quantity * item.rate)}</div>
                        </div>
                    ))}
                </div>

                <div className="flex justify-between items-end">
                    <div className="text-xs text-gray-500 uppercase tracking-wider max-w-[300px]">
                        <p className="font-bold text-black mb-2">Terms</p>
                        <p className="whitespace-pre-wrap lowercase first-letter:uppercase normal-case">{invoice.termsAndConditions || 'Due upon receipt.'}</p>
                    </div>
                    <div className="text-right w-64 text-sm uppercase tracking-wider">
                        <div className="flex justify-between mb-2">
                            <span className="text-gray-500">Subtotal</span>
                            <span>{formatCurrency(invoice.subtotal)}</span>
                        </div>
                        <div className="flex justify-between mb-4 pb-4 border-b border-gray-200">
                            <span className="text-gray-500">Tax</span>
                            <span>{formatCurrency(invoice.tax)}</span>
                        </div>
                        <div className="flex justify-between text-2xl font-bold">
                            <span>Total</span>
                            <span>{formatCurrency(invoice.total)}</span>
                        </div>
                    </div>
                </div>

                {invoice.status !== 'paid' && (
                    <div className="flex justify-end mt-12 no-print">
                        <Button onClick={handlePayOnline} disabled={paying} variant="outline" className="border-black text-black hover:bg-black hover:text-white rounded-none uppercase tracking-widest h-12 px-8">
                            {paying ? <Loader2 className="animate-spin mr-2" /> : <CreditCard className="mr-2" />} Pay Online
                        </Button>
                    </div>
                )}
            </div>
        </Card>
    )

    // 3. CLASSIC
    const ClassicTemplate = () => (
        <Card className="overflow-hidden shadow-none border border-gray-200 bg-white p-12 relative text-gray-800 font-serif">
            {/* Watermark */}
            {(watermarkType !== 'none' || invoice.status === 'paid') && (
                <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none z-0 overflow-hidden">
                    {invoice.status === 'paid' ? (
                        <span className="text-[120px] font-black rotate-[-35deg] whitespace-nowrap uppercase tracking-widest select-none text-emerald-600 border-[12px] border-emerald-600 px-6">
                            PAID
                        </span>
                    ) : watermarkType === 'logo' ? (
                        <Building2 className="w-[400px] h-[400px]" />
                    ) : (
                        <span className="text-[100px] font-black rotate-[-35deg] whitespace-nowrap uppercase tracking-widest select-none">
                            {watermarkText}
                        </span>
                    )}
                </div>
            )}
            <div className="relative z-10">
                <div className="flex justify-between items-center mb-10">
                    <h1 className="text-4xl font-bold text-gray-700 tracking-wide">INVOICE</h1>
                    <div className="text-right">
                        <h2 className="text-2xl font-bold" style={{ color: themeColor }}>Business Co.</h2>
                        <p className="text-sm text-gray-500 mt-1">123 Business Road, Corporate District</p>
                    </div>
                </div>

                <div className="flex justify-between border-y border-gray-200 py-8 mb-10">
                    <div className="w-1/2">
                        <h3 className="font-bold text-sm text-gray-500 uppercase tracking-widest mb-3">Bill To</h3>
                        {client ? (
                            <div>
                                <p className="font-bold text-xl">{client.company || client.name}</p>
                                <p className="text-sm mt-1 text-gray-600">{client.address}</p>
                            </div>
                        ) : <p className="text-gray-500 italic">Client details empty</p>}
                    </div>
                    <div className="w-1/2 flex justify-end gap-16 text-sm">
                        <div>
                            <p className="font-bold text-gray-500 uppercase tracking-widest mb-2">Invoice #</p>
                            <p className="font-medium text-lg">{invoice.invoiceNumber}</p>
                        </div>
                        <div>
                            <p className="font-bold text-gray-500 uppercase tracking-widest mb-2">Date</p>
                            <p className="font-medium">{formatDate(invoice.date)}</p>
                            <p className="font-bold text-gray-500 uppercase tracking-widest mt-5 mb-2">Due Date</p>
                            <p className="font-medium">{formatDate(invoice.dueDate)}</p>
                        </div>
                    </div>
                </div>

                <table className="w-full mb-10 border-collapse">
                    <thead>
                        <tr className="bg-gray-100/50 text-gray-600 border-b-2 border-gray-800">
                            <th className="py-3 px-4 text-left font-bold uppercase tracking-wider text-xs">Description</th>
                            <th className="py-3 px-4 text-center font-bold uppercase tracking-wider text-xs">Quantity</th>
                            <th className="py-3 px-4 text-right font-bold uppercase tracking-wider text-xs">Unit Price</th>
                            <th className="py-3 px-4 text-right font-bold uppercase tracking-wider text-xs">Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        {invoice.lineItems.map((item, i) => (
                            <tr key={i} className="border-b border-gray-200">
                                <td className="py-4 px-4 font-medium text-gray-800">{item.name}</td>
                                <td className="py-4 px-4 text-center text-gray-600">{item.quantity}</td>
                                <td className="py-4 px-4 text-right text-gray-600">{formatCurrency(item.rate)}</td>
                                <td className="py-4 px-4 text-right font-bold text-gray-900">{formatCurrency(item.quantity * item.rate)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                <div className="flex justify-between">
                    <div className="w-1/2 pr-8 text-xs text-gray-500 mt-4">
                        <p className="font-bold uppercase tracking-widest mb-2">Terms & Conditions</p>
                        <p className="whitespace-pre-wrap">{invoice.termsAndConditions || 'Thank you for your business. Due upon receipt.'}</p>
                    </div>
                    <div className="w-1/3 min-w-[280px] space-y-3">
                        <div className="flex justify-between text-gray-600">
                            <span>Subtotal</span>
                            <span>{formatCurrency(invoice.subtotal)}</span>
                        </div>
                        <div className="flex justify-between text-gray-600 border-b border-gray-300 pb-4">
                            <span>Tax</span>
                            <span>{formatCurrency(invoice.tax)}</span>
                        </div>
                        <div className="flex justify-between text-xl font-bold pt-3 text-gray-900">
                            <span>Balance Due</span>
                            <span style={{ color: themeColor }}>{formatCurrency(invoice.total)}</span>
                        </div>
                    </div>
                </div>

                {invoice.status !== 'paid' && (
                    <div className="flex justify-end mt-10 no-print">
                        <Button onClick={handlePayOnline} disabled={paying} style={{ backgroundColor: themeColor }} className="text-white hover:opacity-90 min-w-[200px] h-11 font-bold tracking-wide">
                            {paying ? <Loader2 className="animate-spin mr-2" /> : <CreditCard className="mr-2" />} Make Payment
                        </Button>
                    </div>
                )}
            </div>
        </Card>
    )

    // 2. CORPORATE (Modern Professional)
    const CorporateTemplate = () => (
        <Card className="overflow-hidden shadow-none border-0 bg-white relative">
            {/* Watermark */}
            {(watermarkType !== 'none' || invoice.status === 'paid') && (
                <div className="absolute inset-0 flex items-center justify-center opacity-[0.05] pointer-events-none z-0 overflow-hidden">
                    {invoice.status === 'paid' ? (
                        <span className="text-[150px] font-black rotate-[-35deg] whitespace-nowrap uppercase tracking-widest select-none text-emerald-600 border-[15px] border-emerald-600 px-8 rounded-[30px]">
                            PAID
                        </span>
                    ) : watermarkType === 'logo' ? (
                        <Building2 className="w-[500px] h-[500px]" />
                    ) : (
                        <span className="text-[120px] font-black rotate-[-35deg] whitespace-nowrap uppercase tracking-widest select-none">
                            {watermarkText}
                        </span>
                    )}
                </div>
            )}
            <div className="h-4 w-full relative z-10" style={{ backgroundColor: themeColor }}></div>
            <CardContent className="p-10 relative z-10">
                <div className="flex justify-between items-start mb-12">
                    <div className="flex items-center gap-3">
                        <div className="p-3 rounded-lg text-white" style={{ backgroundColor: themeColor }}>
                            <Building2 className="h-6 w-6" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight">Agency Name</h1>
                            <p className="text-muted-foreground text-sm">Professional Digital Services</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <h2 className="text-4xl font-bold text-slate-200 tracking-tighter">INVOICE</h2>
                        <div className="font-medium mt-1 text-lg" style={{ color: themeColor }}>#{invoice.invoiceNumber}</div>
                    </div>
                </div>
                <div className="grid md:grid-cols-2 gap-12 mb-12">
                    <div>
                        <h3 className="text-xs font-semibold uppercase tracking-wider mb-4 text-slate-400">Bill To</h3>
                        {client ? (
                            <div className="space-y-1">
                                <p className="font-bold text-xl text-slate-800">{client.company || client.name}</p>
                                <p className="text-slate-500">{client.email}</p>
                                <p className="text-slate-500">{client.address}</p>
                            </div>
                        ) : <p className="text-muted-foreground">Client Info</p>}
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <h3 className="text-xs font-semibold uppercase tracking-wider mb-2 text-slate-400">Date Issued</h3>
                            <p className="font-medium text-slate-700">{formatDate(invoice.date)}</p>
                        </div>
                        <div>
                            <h3 className="text-xs font-semibold uppercase tracking-wider mb-2 text-slate-400">Due Date</h3>
                            <p className="font-medium text-slate-700">{formatDate(invoice.dueDate)}</p>
                        </div>
                        <div>
                            <h3 className="text-xs font-semibold uppercase tracking-wider mb-2 text-slate-400">Total Amount</h3>
                            <p className="font-bold text-xl" style={{ color: themeColor }}>{formatCurrency(invoice.total)}</p>
                        </div>
                    </div>
                </div>
                <div className="mb-8 rounded-lg overflow-hidden border border-slate-100">
                    <table className="w-full">
                        <thead className="bg-slate-50 border-b border-slate-100">
                            <tr>
                                <th className="text-left py-4 px-6 text-xs font-bold uppercase text-slate-500">Item Description</th>
                                <th className="text-center py-4 px-6 text-xs font-bold uppercase text-slate-500">Qty</th>
                                <th className="text-right py-4 px-6 text-xs font-bold uppercase text-slate-500">Rate</th>
                                <th className="text-right py-4 px-6 text-xs font-bold uppercase text-slate-500">Amount</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {invoice.lineItems.map((item, i) => (
                                <tr key={i}>
                                    <td className="py-4 px-6 font-medium text-slate-700">{item.name}</td>
                                    <td className="py-4 px-6 text-center text-slate-500">{item.quantity}</td>
                                    <td className="py-4 px-6 text-right text-slate-500">{formatCurrency(item.rate)}</td>
                                    <td className="py-4 px-6 text-right font-bold text-slate-700">{formatCurrency(item.quantity * item.rate)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="flex justify-end">
                    <div className="w-full md:w-1/3 space-y-3">
                        <div className="flex justify-between text-sm text-slate-500">
                            <span>Subtotal</span>
                            <span>{formatCurrency(invoice.subtotal)}</span>
                        </div>
                        <div className="flex justify-between text-sm text-slate-500">
                            <span>Tax (18%)</span>
                            <span>{formatCurrency(invoice.tax)}</span>
                        </div>
                        <div className="flex justify-between items-center pt-4 border-t border-slate-100">
                            <span className="font-bold text-slate-700">Total Due</span>
                            <span className="text-2xl font-bold" style={{ color: themeColor }}>{formatCurrency(invoice.total)}</span>
                        </div>

                        {invoice.status !== 'paid' && (
                            <Button
                                onClick={handlePayOnline}
                                disabled={paying}
                                className="w-full mt-6 bg-emerald-600 hover:bg-emerald-700 text-white font-bold no-print"
                            >
                                {paying ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <CreditCard className="mr-2 h-4 w-4" />}
                                Pay Online Now
                            </Button>
                        )}
                    </div>
                </div>
                <div className="mt-16 pt-8 border-t border-slate-100 text-slate-500 text-xs">
                    <p className="font-semibold uppercase tracking-wider mb-2 text-slate-400">Terms & Conditions</p>
                    <p className="whitespace-pre-wrap">{invoice.termsAndConditions || 'Thank you for doing business with us.'}</p>
                </div>
            </CardContent>
        </Card>
    )

    // 3. CREATIVE
    const CreativeTemplate = () => (
        <Card className="overflow-hidden shadow-none border-0 bg-white grid md:grid-cols-12 min-h-[800px] relative">
            <div className="md:col-span-4 text-white p-10 flex flex-col justify-between relative z-10" style={{ backgroundColor: themeColor }}>
                <div className="space-y-8">
                    <div className="flex items-center gap-2 text-2xl font-bold">
                        <Building2 className="h-8 w-8 opacity-80" />
                        <span>AGENCY.</span>
                    </div>
                    <div>
                        <div className="opacity-60 text-xs font-bold uppercase tracking-widest mb-4">Billed To</div>
                        {client ? (
                            <div className="space-y-1">
                                <p className="font-bold text-2xl">{client.company || client.name}</p>
                                <p className="opacity-80">{client.email}</p>
                                <p className="opacity-80">{client.phone}</p>
                                <p className="opacity-80 mt-2 text-sm">{client.address}</p>
                            </div>
                        ) : <p>Client Name</p>}
                    </div>
                    <div>
                        <div className="opacity-60 text-xs font-bold uppercase tracking-widest mb-4">Payment Details</div>
                        <div className="space-y-2 text-sm opacity-80">
                            <p>Bank: HDFC Bank</p>
                            <p>Account: 1234 5678 9000</p>
                            <p>IFSC: HDFC0001234</p>
                        </div>
                    </div>
                </div>
                <div className="mt-12">
                    <div className="opacity-60 text-xs font-bold uppercase tracking-widest mb-2">Total</div>
                    <div className="text-4xl font-bold">{formatCurrency(invoice.total)}</div>
                </div>
            </div>
            <div className="md:col-span-8 p-10 bg-white relative">
                {/* Watermark */}
                {(watermarkType !== 'none' || invoice.status === 'paid') && (
                    <div className="absolute inset-0 flex items-center justify-center opacity-[0.05] pointer-events-none z-0 overflow-hidden">
                        {invoice.status === 'paid' ? (
                            <span className="text-[120px] font-black rotate-[-35deg] whitespace-nowrap uppercase tracking-widest select-none text-emerald-600 border-[12px] border-emerald-600 px-6 rounded-[24px]">
                                PAID
                            </span>
                        ) : watermarkType === 'logo' ? (
                            <Building2 className="w-[400px] h-[400px]" />
                        ) : (
                            <span className="text-[100px] font-black rotate-[-35deg] whitespace-nowrap uppercase tracking-widest select-none text-slate-900">
                                {watermarkText}
                            </span>
                        )}
                    </div>
                )}
                <div className="relative z-10">
                    <div className="flex justify-between items-start mb-16">
                        <div>
                            <h1 className="text-4xl font-black text-slate-900 tracking-tight">INVOICE</h1>
                            <p className="text-slate-400 font-medium mt-1">#{invoice.invoiceNumber}</p>
                        </div>
                        <div className="text-right space-y-1">
                            <p className="text-sm text-slate-400">Date Issued</p>
                            <p className="font-bold text-slate-700">{formatDate(invoice.date)}</p>
                        </div>
                    </div>
                    <div className="mb-12">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b-2 border-slate-100">
                                    <th className="py-3 text-sm font-bold text-slate-400 uppercase">Description</th>
                                    <th className="py-3 text-sm font-bold text-slate-400 uppercase text-center">Qty</th>
                                    <th className="py-3 text-sm font-bold text-slate-400 uppercase text-right">Price</th>
                                    <th className="py-3 text-sm font-bold text-slate-400 uppercase text-right">Total</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {invoice.lineItems.map((item, i) => (
                                    <tr key={i}>
                                        <td className="py-4 font-bold text-slate-700">{item.name}</td>
                                        <td className="py-4 text-center text-slate-500">{item.quantity}</td>
                                        <td className="py-4 text-right text-slate-500">{formatCurrency(item.rate)}</td>
                                        <td className="py-4 text-right font-bold text-slate-900">{formatCurrency(item.quantity * item.rate)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="flex justify-between border-t border-slate-100 pt-8 gap-4">
                        <div className="w-1/2 pr-8 text-xs text-slate-500 mt-2">
                            <p className="font-bold uppercase tracking-widest mb-2 font-mono">Terms</p>
                            <p className="whitespace-pre-wrap">{invoice.termsAndConditions || 'Thank you for your business. Due upon receipt.'}</p>
                        </div>
                        <div className="w-1/2 space-y-3 text-right">
                            <div className="flex justify-between text-slate-500">
                                <span>Subtotal</span>
                                <span>{formatCurrency(invoice.subtotal)}</span>
                            </div>
                            <div className="flex justify-between text-slate-500">
                                <span>Tax</span>
                                <span>{formatCurrency(invoice.tax)}</span>
                            </div>
                            <div className="flex justify-between text-2xl font-black text-slate-900 pt-4">
                                <span>Total</span>
                                <span style={{ color: themeColor }}>{formatCurrency(invoice.total)}</span>
                            </div>

                            {invoice.status !== 'paid' && (
                                <Button
                                    onClick={handlePayOnline}
                                    disabled={paying}
                                    className="w-full mt-6 bg-slate-900 hover:bg-slate-800 text-white font-bold no-print h-12"
                                >
                                    {paying ? <Loader2 className="animate-spin mr-2 h-5 w-5" /> : <CreditCard className="mr-2 h-5 w-5" />}
                                    PAY ONLINE NOW
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </Card>
    )

    // 4. ELEGANT
    const ElegantTemplate = () => (
        <Card className="overflow-hidden shadow-none border border-slate-200 bg-white relative">
            {/* Watermark */}
            {(watermarkType !== 'none' || invoice.status === 'paid') && (
                <div className="absolute inset-0 flex items-center justify-center opacity-[0.04] pointer-events-none z-0 overflow-hidden">
                    {invoice.status === 'paid' ? (
                        <span className="text-[130px] font-black rotate-[-35deg] whitespace-nowrap uppercase tracking-widest select-none text-emerald-600 border-[15px] border-emerald-600 px-10 rounded-[35px]">
                            PAID
                        </span>
                    ) : watermarkType === 'logo' ? (
                        <Building2 className="w-[500px] h-[500px]" />
                    ) : (
                        <span className="text-[100px] font-black rotate-[-35deg] whitespace-nowrap uppercase tracking-widest select-none">
                            {watermarkText}
                        </span>
                    )}
                </div>
            )}
            <CardContent className="p-16 text-center relative z-10">
                <div className="mb-12">
                    <div className="w-16 h-16 mx-auto rounded-full flex items-center justify-center text-white mb-6" style={{ backgroundColor: themeColor }}>
                        <Building2 className="h-8 w-8" />
                    </div>
                    <h1 className="text-3xl font-serif font-bold text-slate-900 tracking-wide mb-2">AGENCY NAME</h1>
                    <p className="text-slate-500 text-sm tracking-widest uppercase">Premium Invoice</p>
                </div>
                <div className="flex justify-center gap-12 mb-12 border-y border-slate-100 py-8">
                    <div className="text-left">
                        <p className="text-xs text-slate-400 uppercase tracking-widest mb-2">Billed To</p>
                        <p className="font-serif text-lg font-medium text-slate-800">{client ? (client.company || client.name) : 'Valued Client'}</p>
                    </div>
                    <div className="h-12 w-px bg-slate-100"></div>
                    <div className="text-left">
                        <p className="text-xs text-slate-400 uppercase tracking-widest mb-2">Invoice No</p>
                        <p className="font-serif text-lg font-medium text-slate-800">{invoice.invoiceNumber}</p>
                    </div>
                    <div className="h-12 w-px bg-slate-100"></div>
                    <div className="text-left">
                        <p className="text-xs text-slate-400 uppercase tracking-widest mb-2">Total Due</p>
                        <p className="font-serif text-lg font-bold" style={{ color: themeColor }}>{formatCurrency(invoice.total)}</p>
                    </div>
                </div>
                <div className="max-w-2xl mx-auto mb-12">
                    <div className="space-y-6">
                        {invoice.lineItems.map((item, i) => (
                            <div key={i} className="flex justify-between items-center text-left group">
                                <div className="flex-1">
                                    <p className="font-medium text-slate-800 text-lg">{item.name}</p>
                                    <p className="text-sm text-slate-400">{item.quantity} x {formatCurrency(item.rate)}</p>
                                </div>
                                <div className="w-full border-b border-dotted border-slate-300 mx-4 mt-2"></div>
                                <div className="font-serif font-bold text-lg text-slate-700">{formatCurrency(item.quantity * item.rate)}</div>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="max-w-xs mx-auto space-y-2 border-t border-slate-200 pt-6">
                    <div className="flex justify-between text-sm text-slate-500">
                        <span>Subtotal</span>
                        <span>{formatCurrency(invoice.subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-slate-500">
                        <span>Tax</span>
                        <span>{formatCurrency(invoice.tax)}</span>
                    </div>
                    <div className="flex justify-between text-xl font-serif font-bold text-slate-900 pt-2 pb-6">
                        <span>Total</span>
                        <span>{formatCurrency(invoice.total)}</span>
                    </div>

                    {invoice.status !== 'paid' && (
                        <Button
                            onClick={handlePayOnline}
                            disabled={paying}
                            variant="outline"
                            className="w-full border-slate-900 text-slate-900 hover:bg-slate-900 hover:text-white font-serif tracking-widest no-print"
                        >
                            {paying ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <CreditCard className="mr-2 h-4 w-4" />}
                            PAY ONLINE
                        </Button>
                    )}
                </div>
                <div className="mt-16 text-left">
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1 border-b border-slate-100 pb-1">Terms & Conditions</p>
                    <p className="text-slate-500 text-xs whitespace-pre-wrap font-serif italic">{invoice.termsAndConditions || 'Thank you for your business. Payment is expected within due date.'}</p>
                </div>
            </CardContent>
            <div className="h-2 w-full" style={{ backgroundColor: themeColor }}></div>
        </Card>
    )



    const handleSendEmail = async () => {
        if (!invoice) return;
        setSending(true)
        try {
            await api.post(`/invoices/${id}/send`)
            toast({
                title: "Invoice Sent!",
                description: "Invoice emailed with PDF attachment.",
                variant: "success"
            })
        } catch (error: any) {
            console.error("Failed to send invoice", error)
            toast({
                title: "Error sending invoice",
                description: error.response?.data?.message || error.message || "Could not send email. Check SMTP settings.",
                variant: "destructive"
            })
        } finally {
            setSending(false)
        }
    }

    const handlePayOnline = async () => {
        if (!invoice) return;
        setPaying(true)
        try {
            // Get Payment Session
            const res = await api.post(`/invoices/${id}/payment-session`)
            const { payment_session_id } = res.data

            // Initialize Cashfree
            const cashfree = (window as any).Cashfree({
                mode: "sandbox" // Change to "production" for live
            })

            // Open Checkout
            await cashfree.checkout({
                paymentSessionId: payment_session_id,
                redirectTarget: "_self"
            })

        } catch (error: any) {
            console.error("Payment failed", error)
            toast({
                title: "Payment Error",
                description: error.response?.data?.message || "Could not initialize payment session.",
                variant: "destructive"
            })
        } finally {
            setPaying(false)
        }
    }

    const handleMarkAsPaid = async () => {
        if (!invoice) return;
        if (!window.confirm("Are you sure you want to mark this invoice as PAID manually? This will reconcile the balance without an online transaction.")) return;

        try {
            await api.post(`/invoices/${id}/manual-payment`)
            // Reload invoice data
            const invoiceRes = await api.get(`/invoices/${id}`)
            const invData = invoiceRes.data
            setInvoice({
                ...invData,
                id: invData._id,
                date: new Date(invData.date),
                dueDate: new Date(invData.dueDate),
                createdAt: new Date(invData.createdAt),
                updatedAt: new Date(invData.updatedAt)
            })

            toast({
                title: "Manual Reconciliation Successful",
                description: "The invoice has been marked as PAID.",
                variant: "success"
            })
        } catch (error) {
            console.error("Manual payment failed", error)
            toast({
                title: "Action Failed",
                description: "Could not update invoice status.",
                variant: "destructive"
            })
        }
    }



    // --- TEMPLATES ---

    return (
        <div className="max-w-5xl mx-auto pb-20 space-y-6">
            <div className="bg-card p-4 rounded-xl shadow-sm border flex flex-col lg:flex-row items-center justify-between gap-4 no-print sticky top-4 z-50 max-h-[80vh] overflow-y-auto lg:overflow-visible">
                <div className="flex flex-col sm:flex-row items-center gap-4 w-full lg:w-auto">
                    <div className="flex items-center justify-between w-full sm:w-auto">
                        <Button variant="ghost" size="icon" onClick={() => navigate('/invoices')} className="shrink-0">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                        <span className="text-sm font-semibold sm:hidden">Customization</span>
                        <div className="w-8 sm:hidden" />
                    </div>
                    {['admin', 'owner'].includes(currentUser?.role || '') && (
                        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">

                            {/* Customization Group */}
                            <div className="flex flex-col sm:flex-row items-center justify-center sm:justify-start w-full sm:w-auto gap-2 border bg-muted/20 p-1.5 rounded-lg border-dashed border-border/60">
                                <div className="flex items-center gap-2">
                                    <Select value={template} onValueChange={(v: any) => setTemplate(v)}>
                                        <SelectTrigger className="h-8 w-[130px] text-xs bg-background border-border shadow-sm">
                                            <LayoutTemplate className="w-3 h-3 mr-2 text-primary" />
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="corporate">Corporate</SelectItem>
                                            <SelectItem value="creative">Creative</SelectItem>
                                            <SelectItem value="elegant">Elegant</SelectItem>
                                            <SelectItem value="modern">Modern</SelectItem>
                                            <SelectItem value="minimal">Minimal</SelectItem>
                                            <SelectItem value="classic">Classic</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="flex items-center gap-1.5 px-2 py-1 bg-background rounded-md border border-border/50 shadow-sm">
                                    {COLOR_PRESETS.slice(0, 5).map((color) => (
                                        <button
                                            key={color.value}
                                            onClick={() => setThemeColor(color.value)}
                                            className={`w-4 h-4 rounded-full cursor-pointer transition-all ${themeColor === color.value ? 'ring-2 ring-offset-1 ring-primary scale-110' : 'hover:scale-110'}`}
                                            style={{ backgroundColor: color.value }}
                                            title={color.name}
                                        />
                                    ))}
                                    <div className="relative ml-1">
                                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center cursor-pointer ${!COLOR_PRESETS.some(c => c.value === themeColor) ? 'ring-2 ring-offset-1 ring-primary' : ''}`}
                                            style={{ background: 'conic-gradient(red, yellow, lime, aqua, blue, magenta, red)' }}
                                            onClick={() => setShowColorPicker(!showColorPicker)}
                                        >
                                            <Palette className="w-2 h-2 text-white drop-shadow-md" />
                                        </div>
                                        {showColorPicker && (
                                            <div className="absolute top-full left-0 mt-2 p-2 bg-card rounded-lg shadow-xl border z-50 translate-x-[-50%] ml-2.5">
                                                <input type="color" value={themeColor} onChange={(e) => setThemeColor(e.target.value)} className="w-8 h-8 cursor-pointer bg-transparent border-0" />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="hidden lg:block h-8 w-px bg-border/60" />

                            {/* Watermark Group */}
                            <div className="flex items-center justify-center sm:justify-start w-full sm:w-auto gap-2 border bg-muted/20 p-1.5 rounded-lg border-dashed border-border/60">
                                <Select value={watermarkType} onValueChange={(v: any) => setWatermarkType(v)}>
                                    <SelectTrigger className="h-8 w-[100px] text-xs bg-background border-border shadow-sm">
                                        {watermarkType === 'none' && <Ban className="w-3 h-3 mr-2 text-muted-foreground" />}
                                        {watermarkType === 'logo' && <ImageIcon className="w-3 h-3 mr-2 text-primary" />}
                                        {watermarkType === 'text' && <Type className="w-3 h-3 mr-2 text-primary" />}
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">None</SelectItem>
                                        <SelectItem value="logo">Logo</SelectItem>
                                        <SelectItem value="text">Text</SelectItem>
                                    </SelectContent>
                                </Select>
                                {watermarkType === 'text' && (
                                    <Input
                                        value={watermarkText}
                                        onChange={(e) => setWatermarkText(e.target.value)}
                                        className="h-8 w-[80px] text-xs bg-background border-border shadow-sm"
                                        placeholder="Text..."
                                    />
                                )}
                            </div>
                        </div>
                    )}
                </div>
                <div className="flex items-center gap-2 w-full lg:w-auto">
                    <Button variant="outline" onClick={handlePrint} className="flex-1 lg:flex-none">
                        <Printer className="mr-2 h-4 w-4" /> Print
                    </Button>
                    <Button variant="outline" onClick={handlePrint} title="Save as PDF" className="flex-1 lg:flex-none">
                        <Download className="mr-2 h-4 w-4" /> Download PDF
                    </Button>

                    {invoice.status !== 'paid' && (
                        <Button
                            onClick={handlePayOnline}
                            disabled={paying}
                            className="flex-1 lg:flex-none bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                            {paying ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <CreditCard className="mr-2 h-4 w-4" />
                            )}
                            {paying ? 'Processing...' : 'Pay Online'}
                        </Button>
                    )}

                    {invoice.status !== 'paid' && ['admin', 'owner'].includes(currentUser?.role || '') && (
                        <Button
                            variant="secondary"
                            onClick={handleMarkAsPaid}
                            className="flex-1 lg:flex-none"
                        >
                            <Banknote className="mr-2 h-4 w-4" /> Mark as Paid
                        </Button>
                    )}

                    {['admin', 'owner'].includes(currentUser?.role || '') && (
                        <Button
                            style={{ backgroundColor: themeColor }}
                            onClick={handleSendEmail}
                            disabled={sending}
                            className="flex-1 lg:flex-none"
                        >
                            {sending ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <Mail className="mr-2 h-4 w-4" />
                            )}
                            {sending ? 'Sending...' : 'Send Invoice'}
                        </Button>
                    )}
                </div>
            </div>

            <div className={`transition-all duration-500 ease-in-out`}>
                {template === 'corporate' && <CorporateTemplate />}
                {template === 'creative' && <CreativeTemplate />}
                {template === 'elegant' && <ElegantTemplate />}
                {template === 'modern' && <ModernTemplate />}
                {template === 'minimal' && <MinimalTemplate />}
                {template === 'classic' && <ClassicTemplate />}
            </div>

            <style>{`
                @media print {
                    .no-print { display: none !important; }
                    body { background: white; }
                    .card { box-shadow: none; border: none; }
                    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                }
            `}</style>
        </div>
    )
}
