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
import { ArrowLeft, Printer, Mail, Loader2, Building2, LayoutTemplate, Palette, Check, Type, Image as ImageIcon, Ban } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'
import api from '@/lib/api-client'
import type { Invoice, Client } from '@/types'
import { useToast } from '@/hooks/use-toast'

type InvoiceTemplate = 'corporate' | 'creative' | 'elegant' | 'nexus'

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


    // Customization State
    const [template, setTemplate] = useState<InvoiceTemplate>('nexus')
    const [themeColor, setThemeColor] = useState('#0047AB')
    const [showColorPicker, setShowColorPicker] = useState(false)
    const [sending, setSending] = useState(false)
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

                if (mappedInvoice.clientId) {
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

    const handlePrint = () => window.print()

    if (loading) return <div className="flex justify-center h-screen items-center"><Loader2 className="animate-spin" /></div>
    if (!invoice) return <div>Invoice not found</div>
    // --- TEMPLATES ---

    // 1. NEXUS TEMPLATE (Improved Design)
    const NexusTemplate = () => (
        <Card className="overflow-hidden shadow-none border-0 bg-white relative min-h-[1000px] flex flex-col font-sans">
            {/* Header Shapes */}
            <div className="absolute top-0 left-0 w-full h-32 overflow-hidden pointer-events-none">
                <div className="absolute top-0 left-0 w-[45%] h-8 z-10 shadow-sm" style={{ backgroundColor: themeColor }}></div>
                <div className="absolute top-6 left-0 w-[25%] h-2.5 z-10 opacity-80" style={{ backgroundColor: themeColor }}></div>
                <div className="absolute top-0 left-[42%] w-24 h-32 origin-top-left -rotate-45 transform" style={{ backgroundColor: themeColor }}></div>
            </div>

            <div className="absolute top-0 right-0 w-full h-32 overflow-hidden pointer-events-none">
                <div className="absolute top-0 right-0 w-[100%] h-20 bg-white z-0"></div>
                <div className="absolute -top-16 -right-10 w-96 h-48 transform rotate-12 z-0 opacity-100 shadow-md" style={{ backgroundColor: themeColor }}></div>
            </div>

            <CardContent className="p-12 pt-28 flex-1 relative z-10">
                {/* Watermark */}
                {watermarkType !== 'none' && (
                    <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none z-0 overflow-hidden">
                        {watermarkType === 'logo' ? (
                            <Building2 className="w-[600px] h-[600px]" />
                        ) : (
                            <span className="text-[150px] font-black rotate-[-35deg] whitespace-nowrap uppercase tracking-widest select-none">
                                {watermarkText}
                            </span>
                        )}
                    </div>
                )}

                {/* Header Content */}
                <div className="flex justify-between items-start mb-16 relative z-10">
                    <div className="w-1/2">
                        <div className="flex items-center gap-1 mb-8">
                            <span className="text-4xl font-extrabold tracking-tight" style={{ color: themeColor }}>NEX</span>
                            <span className="text-4xl font-light text-slate-400">PRISM</span>
                        </div>

                        <div className="mb-6 space-y-1">
                            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-400 mb-2">Bill From</h3>
                            <h4 className="font-bold text-xl text-slate-900">NEXPRISM</h4>
                            <div className="text-sm text-slate-500 font-medium leading-relaxed max-w-sm">
                                <p>13th Floor, IT Park, Digital Valley,</p>
                                <p>B-1307-1308, Mota Varachha,</p>
                                <p>Surat, Gujarat 394105 (India)</p>
                            </div>
                            <p className="text-sm font-bold mt-3 text-slate-700 bg-slate-100 inline-block px-2 py-1 rounded">GSTIN: 09LYDPS7688N1ZX</p>
                        </div>
                    </div>

                    <div className="w-1/2 text-right">
                        <h1 className="text-6xl font-black text-slate-900/90 mb-8 tracking-tighter">INVOICE</h1>
                        <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm justify-end mb-8 items-center">
                            <div className="text-slate-500 font-medium text-right">Invoice No</div>
                            <div className="font-bold text-lg text-slate-800 text-left">#{invoice.invoiceNumber}</div>
                            <div className="text-slate-500 font-medium text-right">Date</div>
                            <div className="font-bold text-lg text-slate-800 text-left">{formatDate(invoice.date)}</div>
                        </div>

                        <div className="text-left ml-auto max-w-xs bg-slate-50 p-4 rounded-lg border border-slate-100">
                            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-400 mb-2">Bill To</h3>
                            <h4 className="font-bold text-xl text-slate-900 mb-1">{client ? (client.company || client.name) : 'Client Name'}</h4>
                            <div className="text-sm text-slate-500 font-medium leading-relaxed">
                                <p>{client?.address || 'Client Address'}</p>
                            </div>
                            <p className="text-xs font-bold mt-3 text-slate-400">GSTIN: 06AKTPV5045K2ZD</p>
                        </div>
                    </div>
                </div>

                {/* Table */}
                <div className="mb-12 relative z-10">
                    <div className="flex text-white font-bold py-4 px-6 rounded-t-lg shadow-sm" style={{ backgroundColor: themeColor }}>
                        <div className="w-[55%] uppercase text-xs tracking-wider">Description</div>
                        <div className="w-[15%] text-center uppercase text-xs tracking-wider">Qty</div>
                        <div className="w-[15%] text-right uppercase text-xs tracking-wider">Rate</div>
                        <div className="w-[15%] text-right uppercase text-xs tracking-wider">Amount</div>
                    </div>
                    <div className="border border-t-0 border-slate-200 bg-white rounded-b-lg overflow-hidden">
                        {invoice.lineItems.map((item, i) => (
                            <div key={i} className="flex py-5 px-6 border-b border-slate-100 last:border-0 items-center even:bg-slate-50/50 hover:bg-slate-50 transition-colors">
                                <div className="w-[55%] font-semibold text-slate-700">{item.name}</div>
                                <div className="w-[15%] text-center text-slate-500 font-medium">{item.quantity}</div>
                                <div className="w-[15%] text-right text-slate-500">{formatCurrency(item.rate)}</div>
                                <div className="w-[15%] text-right font-bold text-slate-800">{formatCurrency(item.quantity * item.rate)}</div>
                            </div>
                        ))}
                        {invoice.lineItems.length < 3 && Array.from({ length: 3 - invoice.lineItems.length }).map((_, i) => (
                            <div key={`spacer-${i}`} className="flex py-6 px-6 border-slate-100 even:bg-slate-50/50">
                                <div className="w-full h-6"></div>
                            </div>
                        ))}
                    </div>
                    <div className="h-1 w-full mt-1 bg-gradient-to-r from-transparent via-slate-200 to-transparent"></div>
                </div>

                {/* Lower Section */}
                <div className="flex justify-between relative z-10 items-start gap-12">
                    {/* Terms */}
                    <div className="w-[55%] pt-2">
                        <div className="mb-8">
                            <h3 className="font-bold text-sm uppercase mb-3 text-slate-800 flex items-center gap-2">
                                <Check className="w-4 h-4 text-green-500" /> Terms & Conditions
                            </h3>
                            <ul className="list-disc list-outside ml-4 text-xs text-slate-500 space-y-2 leading-relaxed font-medium">
                                <li>The client is responsible for covering any bank charges or transaction fees related to the payment.</li>
                                <li>Any applicable taxes (e.g. GST) are included or excluded in the total amount unless specified otherwise.</li>
                                <li>Payment terms are net 15 days unless otherwise agreed.</li>
                            </ul>
                        </div>

                        <div className="mt-12 space-y-4">
                            <h3 className="font-bold text-sm uppercase mb-2 text-slate-800">Contact Us</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="flex items-center gap-3 text-xs font-semibold text-slate-600 bg-slate-50 p-2 rounded border border-slate-100">
                                    <div className="w-6 h-6 rounded flex items-center justify-center text-white shadow-sm" style={{ backgroundColor: themeColor }}>P</div>
                                    +91 7505974545
                                </div>
                                <div className="flex items-center gap-3 text-xs font-semibold text-slate-600 bg-slate-50 p-2 rounded border border-slate-100">
                                    <div className="w-6 h-6 rounded flex items-center justify-center text-white shadow-sm" style={{ backgroundColor: themeColor }}>E</div>
                                    Info@nexprism.com
                                </div>
                                <div className="flex items-center gap-3 text-xs font-semibold text-slate-600 bg-slate-50 p-2 rounded border border-slate-100">
                                    <div className="w-6 h-6 rounded flex items-center justify-center text-white shadow-sm" style={{ backgroundColor: themeColor }}>W</div>
                                    nexprism.com
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Totals & Bank */}
                    <div className="w-[45%]">
                        <div className="space-y-3 mb-8 px-4 py-4 bg-slate-50 rounded-xl border border-slate-100">
                            <div className="flex justify-between text-sm items-center">
                                <span className="font-bold text-slate-600">Subtotal</span>
                                <span className="font-bold text-slate-800 text-lg">{formatCurrency(invoice.subtotal)}</span>
                            </div>
                            <div className="flex justify-between text-sm items-center">
                                <span className="font-bold text-slate-600">GST (18%)</span>
                                <span className="text-slate-600 font-medium">{formatCurrency(invoice.tax)}</span>
                            </div>
                            <div className="flex justify-between text-sm items-center pt-2 border-t border-slate-200 mt-2">
                                <span className="font-bold text-slate-600">Paid Amount</span>
                                <span className="text-slate-500 font-medium">₹0.00</span>
                            </div>
                        </div>

                        {/* Total Strip */}
                        <div className="flex justify-between items-center text-white py-4 px-6 shadow-lg mb-10 rounded-xl relative overflow-hidden transform scale-105"
                            style={{ background: `linear-gradient(135deg, ${themeColor}, ${themeColor}dd)` }}>
                            <span className="font-bold text-sm uppercase tracking-wider opacity-90">Total Due</span>
                            <span className="font-black text-3xl tracking-tight">{formatCurrency(invoice.total)}</span>
                        </div>

                        {/* Stamp */}
                        {invoice.status !== 'paid' && (
                            <div className="absolute right-0 top-40 transform rotate-[-12deg] border-[6px] border-red-600/80 text-red-600/90 font-black text-2xl px-6 py-2 rounded-lg shadow-xl tracking-[0.2em] z-50 mix-blend-multiply bg-white/40 backdrop-blur-[1px] border-double">
                                UNPAID
                            </div>
                        )}

                        <div className="text-left text-xs space-y-1 mt-8 pb-4 bg-slate-50 p-5 rounded-xl border border-slate-100 relative overflow-hidden">
                            <div className="h-1 w-full absolute top-0 left-0" style={{ backgroundColor: themeColor }}></div>
                            <div className="font-bold text-sm uppercase mb-4 text-slate-800 flex items-center gap-2">
                                <Building2 className="w-4 h-4" /> Bank Details
                            </div>
                            <div className="grid grid-cols-3 gap-y-3 gap-x-2">
                                <span className="text-slate-500 font-medium col-span-1">Bank Name</span>
                                <span className="font-bold text-slate-700 col-span-2">Axis Bank</span>

                                <span className="text-slate-500 font-medium col-span-1">Account No.</span>
                                <span className="font-bold text-slate-700 col-span-2 tracking-wide">921020039123451</span>

                                <span className="text-slate-500 font-medium col-span-1">IFSC Code</span>
                                <span className="font-bold text-slate-700 col-span-2">UTIB0000359</span>

                                <span className="text-slate-500 font-medium col-span-1">UPI ID</span>
                                <span className="font-bold col-span-2 bg-white px-2 py-1 rounded border border-slate-200 inline-block" style={{ color: themeColor }}>nexprism@axisbank</span>
                            </div>
                        </div>
                    </div>
                </div>
            </CardContent>

            {/* Footer Shapes */}
            <div className="absolute bottom-0 left-0 w-full h-24 overflow-hidden pointer-events-none z-0">
                <div className="absolute bottom-0 left-0 w-[45%] h-12 z-10 shadow-sm" style={{ backgroundColor: themeColor }}></div>
                <div className="absolute bottom-0 left-[42%] w-24 h-24 origin-bottom-left rotate-45 transform opacity-90" style={{ backgroundColor: themeColor }}></div>

                <div className="absolute bottom-4 right-0 w-[35%] h-6 z-10 opacity-90" style={{ backgroundColor: themeColor }}></div>
                <div className="absolute bottom-12 right-0 w-[20%] h-2.5 z-10 opacity-60" style={{ backgroundColor: themeColor }}></div>
                <div className="absolute bottom-0 right-0 w-16 h-16 bg-slate-100 z-0"></div>
            </div>
        </Card>
    )

    // 2. CORPORATE (Modern Professional)
    const CorporateTemplate = () => (
        <Card className="overflow-hidden shadow-none border-0 bg-white relative">
            {/* Watermark */}
            {watermarkType !== 'none' && (
                <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none z-0 overflow-hidden">
                    {watermarkType === 'logo' ? (
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
                    </div>
                </div>
                <div className="mt-16 pt-8 border-t border-slate-100 text-center text-slate-400 text-sm">
                    <p>Thank you for doing business with us.</p>
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
                {watermarkType !== 'none' && (
                    <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none z-0 overflow-hidden">
                        {watermarkType === 'logo' ? (
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
                    <div className="flex justify-end border-t border-slate-100 pt-8">
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
                        </div>
                    </div>
                </div>
            </div>
        </Card>
    )

    // 4. ELEGANT
    const ElegantTemplate = () => (
        <Card className="overflow-hidden shadow-none border border-slate-200 bg-white relative">
            {watermarkType !== 'none' && (
                <div className="absolute inset-0 flex items-center justify-center opacity-[0.02] pointer-events-none z-0 overflow-hidden">
                    {watermarkType === 'logo' ? (
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
                    <div className="flex justify-between text-xl font-serif font-bold text-slate-900 pt-2">
                        <span>Total</span>
                        <span>{formatCurrency(invoice.total)}</span>
                    </div>
                </div>
                <div className="mt-16">
                    <p className="text-slate-400 text-xs uppercase tracking-widest">Thank you for your business</p>
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
            toast({ description: "Invoice sent to client successfully!" })
        } catch (error: any) {
            console.error("Failed to send invoice", error)
            toast({
                title: "Error sending invoice",
                description: error.response?.data?.message || "Could not send email. Check SMTP settings.",
                variant: "destructive"
            })
        } finally {
            setSending(false)
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
                                        <SelectItem value="nexus">Nexus (New)</SelectItem>
                                        <SelectItem value="corporate">Corporate</SelectItem>
                                        <SelectItem value="creative">Creative</SelectItem>
                                        <SelectItem value="elegant">Elegant</SelectItem>
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
                </div>
                <div className="flex items-center gap-2 w-full lg:w-auto">
                    <Button variant="outline" onClick={handlePrint} className="flex-1 lg:flex-none">
                        <Printer className="mr-2 h-4 w-4" /> Print
                    </Button>
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
                </div>
            </div>

            <div className={`transition-all duration-500 ease-in-out ${template === 'nexus' ? 'bg-muted/30 dark:bg-card/50 p-6 md:p-8 rounded-xl ring-1 ring-border shadow-inner' : ''}`}>
                {template === 'nexus' && <NexusTemplate />}
                {template === 'corporate' && <CorporateTemplate />}
                {template === 'creative' && <CreativeTemplate />}
                {template === 'elegant' && <ElegantTemplate />}
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
