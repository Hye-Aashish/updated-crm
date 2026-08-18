import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '@/store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/hooks/use-toast'
import { ChevronLeft, Plus, Trash2 } from 'lucide-react'
import type { Invoice } from '@/types'
import { formatCurrency } from '@/lib/utils'
import api from '@/lib/api-client'

interface InvoiceFormItem {
    id: string
    description: string
    quantity: number
    rate: number
    amount: number
}

export function NewInvoicePage() {
    const navigate = useNavigate()
    const { toast } = useToast()
    const addInvoice = useAppStore((state) => state.addInvoice)
    const { clients, projects, setClients, setProjects, settings } = useAppStore()
    const [clientProducts, setClientProducts] = useState<any[]>([])
    const currency = settings?.companyProfile?.currency || 'INR'
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        const loadData = async () => {
            if (clients.length === 0) {
                try {
                    const res = await api.get('/clients')
                    setClients(res.data.map((c: any) => ({
                        id: c._id,
                        name: c.name,
                        company: c.company,
                        email: c.email,
                        phone: c.phone,
                        address: c.address,
                        gstNumber: c.gstNumber || c.gstin,
                        type: c.type || 'one-time',
                        status: c.status || 'active',
                        createdAt: new Date(c.createdAt),
                        updatedAt: new Date(c.updatedAt)
                    })))
                } catch (e) {
                    console.error("Failed to load clients", e)
                }
            }

            if (projects.length === 0) {
                try {
                    const res = await api.get('/projects')
                    // Map backend projects to store format
                    setProjects(res.data.map((p: any) => ({
                        id: p._id,
                        name: p.name,
                        clientId: p.clientId?._id || p.clientId, // Handle populated or ID
                        type: p.type,
                        status: p.status,
                        startDate: new Date(p.startDate),
                        deadline: new Date(p.deadline),
                        dueDate: new Date(p.deadline),
                        budget: p.budget,
                        paymentModel: p.paymentModel,
                        description: p.description,
                        milestones: p.milestones || [],
                        pmId: p.pmId,
                        progress: p.progress,
                        createdAt: new Date(p.createdAt),
                        updatedAt: new Date(p.updatedAt)
                    })))
                } catch (e) {
                    console.error("Failed to load projects", e)
                }
            }

            try {
                const cpRes = await api.get('/client-products');
                setClientProducts(cpRes.data.map((cp: any) => ({ ...cp, id: cp._id || cp.id })));
            } catch (e) {
                console.error("Failed to load client products", e);
            }

            try {
                const res = await api.get('/settings');
                if (res.data?.billing?.termsAndConditions) {
                    setFormData(prev => ({ ...prev, termsAndConditions: res.data.billing.termsAndConditions }));
                }
            } catch (e) {
                console.error("Failed to load settings", e);
            }
        }
        loadData()
    }, [])

    const [formData, setFormData] = useState({
        clientId: '',
        referenceId: '',
        dueDate: '',
        taxRate: 18,
        frequency: 'once',
        autoSend: false,
        termsAndConditions: 'Thank you for your business. Payment is expected within due date. Late payments may incur fees.',
        billingInfo: {
            name: '',
            address: '',
            gstNumber: ''
        },
        currency: settings?.companyProfile?.currency || 'INR',
        status: 'draft'
    })

    const [items, setItems] = useState<InvoiceFormItem[]>([
        { id: '1', description: 'Development Services', quantity: 1, rate: 0, amount: 0 }
    ])

    const [applyGST, setApplyGST] = useState(true)

    // Generate Invoice Number (Mock)
    const invoiceNumber = `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`

    // Filter projects based on selected client
    const clientProjects = projects.filter(p => p.clientId === formData.clientId)
    const clientProductsList = clientProducts.filter(cp => (typeof cp.client === 'object' ? cp.client?._id : cp.client) === formData.clientId)

    const handleItemChange = (id: string, field: keyof InvoiceFormItem, value: string | number) => {
        setItems(items.map(item => {
            if (item.id === id) {
                const updates = { [field]: value }
                if (field === 'quantity' || field === 'rate') {
                    const qty = field === 'quantity' ? Number(value) : item.quantity
                    const rate = field === 'rate' ? Number(value) : item.rate
                    if (!isNaN(qty) && !isNaN(rate)) {
                        updates.amount = qty * rate
                    }
                }
                return { ...item, ...updates }
            }
            return item
        }))
    }

    const addItem = () => {
        setItems([
            ...items,
            { id: Date.now().toString(), description: '', quantity: 1, rate: 0, amount: 0 }
        ])
    }

    const removeItem = (id: string) => {
        if (items.length > 1) {
            setItems(items.filter(item => item.id !== id))
        }
    }

    const subtotal = items.reduce((sum, item) => sum + item.amount, 0)
    const taxAmount = applyGST ? (subtotal * formData.taxRate) / 100 : 0
    const total = subtotal + taxAmount

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!formData.clientId) {
            toast({ title: "Validation Error", description: "Please select a client.", variant: "destructive" })
            return
        }
        if (!formData.referenceId) {
            toast({ title: "Validation Error", description: "Please select a project or digital product.", variant: "destructive" })
            return
        }
        if (!formData.dueDate) {
            toast({ title: "Validation Error", description: "Please select a due date.", variant: "destructive" })
            return
        }
        if (subtotal === 0) {
            toast({ title: "Validation Error", description: "Invoice total cannot be zero.", variant: "destructive" })
            return
        }

        setLoading(true)

        try {
            const isProject = formData.referenceId.startsWith('project_');
            const refId = formData.referenceId.replace(/^(project_|cp_)/, '');

            const payload = {
                invoiceNumber,
                clientId: formData.clientId,
                projectId: isProject ? refId : undefined,
                clientProductId: !isProject ? refId : undefined,
                type: 'milestone', // Defaulting for now
                status: formData.status,
                date: new Date(),
                dueDate: new Date(formData.dueDate),
                paidDate: formData.status === 'paid' ? new Date() : undefined,
                lineItems: items.map(item => ({
                    name: item.description,
                    quantity: item.quantity,
                    rate: item.rate,
                    taxPercentage: 0 // Mock for now as UI handles global tax
                })),
                subtotal,
                tax: taxAmount,
                total,
                frequency: formData.frequency,
                autoSend: formData.autoSend,
                termsAndConditions: formData.termsAndConditions,
                billingInfo: formData.billingInfo,
                currency: formData.currency
            }

            const response = await api.post('/invoices', payload)
            const saved = response.data

            const newInvoice: Invoice = {
                id: saved._id,
                invoiceNumber: saved.invoiceNumber,
                number: saved.invoiceNumber, // Alias
                clientId: saved.clientId,
                projectId: saved.projectId,
                clientProductId: saved.clientProductId,
                status: saved.status,
                type: saved.type,
                date: new Date(saved.date),
                dueDate: new Date(saved.dueDate),
                lineItems: saved.lineItems.map((i: any) => ({
                    id: i._id || Math.random().toString(),
                    name: i.name,
                    quantity: i.quantity,
                    rate: i.rate,
                    taxPercentage: i.taxPercentage
                })),
                subtotal: saved.subtotal,
                tax: saved.tax,
                total: saved.total,
                billingInfo: saved.billingInfo,
                currency: saved.currency,
                createdAt: new Date(saved.createdAt),
                updatedAt: new Date(saved.updatedAt),
            }

            addInvoice(newInvoice)

            toast({
                title: "Invoice created",
                description: `Invoice ${invoiceNumber} created successfully.`,
            })

            navigate('/invoices')
        } catch (error) {
            console.error(error)
            toast({
                title: "Error",
                description: "Failed to create invoice.",
                variant: "destructive"
            })
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => navigate('/invoices')}>
                    <ChevronLeft className="h-4 w-4" />
                </Button>
                <div>
                    <h1 className="text-3xl font-bold">Create Invoice</h1>
                    <p className="text-muted-foreground">Draft a new invoice for a client</p>
                </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
                <div className="lg:col-span-2 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Invoice Details</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Company</Label>
                                    <Select
                                        value={formData.clientId}
                                        onValueChange={(value) => {
                                            const selectedClient = clients.find(c => c.id === value);
                                            setFormData(prev => ({ 
                                                ...prev, 
                                                clientId: value, 
                                                referenceId: '',
                                                billingInfo: {
                                                    name: selectedClient?.company || selectedClient?.name || '',
                                                    address: selectedClient?.address || '',
                                                    gstNumber: selectedClient?.gstNumber || ''
                                                }
                                            }))
                                        }}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select Client" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {clients.map(c => (
                                                <SelectItem key={c.id} value={c.id}>{c.company}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Project / Digital Product</Label>
                                    <Select
                                        value={formData.referenceId}
                                        onValueChange={(value) => setFormData(prev => ({ ...prev, referenceId: value }))}
                                        disabled={!formData.clientId}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select Project/Product" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {clientProjects.map(p => (
                                                <SelectItem key={`project_${p.id}`} value={`project_${p.id}`}>{p.name} (Project)</SelectItem>
                                            ))}
                                            {clientProductsList.map(cp => (
                                                <SelectItem key={`cp_${cp.id}`} value={`cp_${cp.id}`}>{cp.product?.name || 'Digital Product'} (Service)</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="grid sm:grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <Label>Due Date</Label>
                                    <Input type="date" value={formData.dueDate} onChange={(e) => setFormData(prev => ({ ...prev, dueDate: e.target.value }))} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Frequency (Recurring)</Label>
                                    <Select
                                        value={formData.frequency}
                                        onValueChange={(value) => setFormData(prev => ({ ...prev, frequency: value }))}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select Frequency" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="once">Once (One-time)</SelectItem>
                                            <SelectItem value="monthly">Monthly</SelectItem>
                                            <SelectItem value="quarterly">Quarterly</SelectItem>
                                            <SelectItem value="half-yearly">Half-Yearly (6 Months)</SelectItem>
                                            <SelectItem value="yearly">Yearly</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Currency</Label>
                                    <Select
                                        value={formData.currency}
                                        onValueChange={(value) => setFormData(prev => ({ ...prev, currency: value }))}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select Currency" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="INR">INR (₹)</SelectItem>
                                            <SelectItem value="USD">USD ($)</SelectItem>
                                            <SelectItem value="EUR">EUR (€)</SelectItem>
                                            <SelectItem value="GBP">GBP (£)</SelectItem>
                                            <SelectItem value="AUD">AUD (A$)</SelectItem>
                                            <SelectItem value="CAD">CAD (C$)</SelectItem>
                                            <SelectItem value="SGD">SGD (S$)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {/* Prominent Status Selection */}
                            <div className="space-y-3 pt-4 pb-2">
                                <Label className="text-base font-semibold text-slate-800">Invoice Status</Label>
                                <div className="flex gap-4">
                                    <Button
                                        type="button"
                                        variant={formData.status === 'draft' ? 'default' : 'outline'}
                                        onClick={() => setFormData(prev => ({ ...prev, status: 'draft' }))}
                                        className={`flex-1 h-12 text-base font-bold ${formData.status === 'draft' ? 'bg-slate-800' : 'text-slate-600 hover:text-slate-800'}`}
                                    >
                                        Draft
                                    </Button>
                                    <Button
                                        type="button"
                                        variant={formData.status === 'pending' ? 'default' : 'outline'}
                                        onClick={() => setFormData(prev => ({ ...prev, status: 'pending' }))}
                                        className={`flex-1 h-12 text-base font-bold ${formData.status === 'pending' ? 'bg-amber-500 hover:bg-amber-600 text-white' : 'text-slate-600 hover:text-slate-800'}`}
                                    >
                                        Unpaid
                                    </Button>
                                    <Button
                                        type="button"
                                        variant={formData.status === 'paid' ? 'default' : 'outline'}
                                        onClick={() => setFormData(prev => ({ ...prev, status: 'paid' }))}
                                        className={`flex-1 h-12 text-base font-bold ${formData.status === 'paid' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'text-slate-600 hover:text-slate-800'}`}
                                    >
                                        Paid
                                    </Button>
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">Select the initial status of the invoice you are creating.</p>
                            </div>

                            <div className="grid sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="autoSend">Auto Send Email</Label>
                                    <div className="flex items-center space-x-2 h-10">
                                        <Switch
                                            id="autoSend"
                                            checked={formData.autoSend}
                                            onCheckedChange={(checked) => setFormData(prev => ({ ...prev, autoSend: checked }))}
                                        />
                                        <Label htmlFor="autoSend" className="text-sm font-normal cursor-pointer">
                                            Send to Client immediately
                                        </Label>
                                    </div>
                                </div>
                            </div>
                            
                            {formData.clientId && (
                                <div className="mt-6 pt-6 border-t">
                                    <h3 className="text-sm font-semibold mb-4 text-muted-foreground">Bill To Details (Override)</h3>
                                    <div className="grid sm:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>Client Name</Label>
                                            <Input 
                                                value={formData.billingInfo.name} 
                                                onChange={(e) => setFormData(prev => ({ ...prev, billingInfo: { ...prev.billingInfo, name: e.target.value } }))} 
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>GST Number</Label>
                                            <Input 
                                                value={formData.billingInfo.gstNumber} 
                                                onChange={(e) => setFormData(prev => ({ ...prev, billingInfo: { ...prev.billingInfo, gstNumber: e.target.value } }))} 
                                            />
                                        </div>
                                        <div className="sm:col-span-2 space-y-2">
                                            <Label>Address</Label>
                                            <Input 
                                                value={formData.billingInfo.address} 
                                                onChange={(e) => setFormData(prev => ({ ...prev, billingInfo: { ...prev.billingInfo, address: e.target.value } }))} 
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Line Items</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {items.map((item, index) => (
                                <div key={item.id} className="grid gap-3 sm:grid-cols-12 items-end">
                                    <div className="sm:col-span-6 space-y-2">
                                        <Label className={index > 0 ? 'sr-only' : ''}>Description</Label>
                                        <Input
                                            value={item.description}
                                            onChange={(e) => handleItemChange(item.id, 'description', e.target.value)}
                                            placeholder="Item description"
                                        />
                                    </div>
                                    <div className="sm:col-span-2 space-y-2">
                                        <Label className={index > 0 ? 'sr-only' : ''}>Qty</Label>
                                        <Input
                                            type="number"
                                            min="1"
                                            value={item.quantity}
                                            onChange={(e) => handleItemChange(item.id, 'quantity', e.target.value)}
                                        />
                                    </div>
                                    <div className="sm:col-span-3 space-y-2">
                                        <Label className={index > 0 ? 'sr-only' : ''}>Rate</Label>
                                        <Input
                                            type="number"
                                            min="0"
                                            value={item.rate}
                                            onChange={(e) => handleItemChange(item.id, 'rate', e.target.value)}
                                        />
                                    </div>
                                    <div className="sm:col-span-1 text-right pb-2">
                                        <Button variant="ghost" size="icon" className="text-destructive h-8 w-8" onClick={() => removeItem(item.id)}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                            <Button variant="outline" size="sm" onClick={addItem} className="mt-2">
                                <Plus className="mr-2 h-3 w-3" /> Add Item
                            </Button>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Terms & Conditions</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <textarea
                                value={formData.termsAndConditions}
                                onChange={(e) => setFormData(prev => ({ ...prev, termsAndConditions: e.target.value }))}
                                className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                placeholder="Enter specific terms and conditions for this invoice..."
                            />
                        </CardContent>
                    </Card>
                </div>

                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Summary</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Subtotal</span>
                                <span>{formatCurrency(subtotal, formData.currency)}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm py-2">
                                <Label htmlFor="apply-gst" className="text-muted-foreground font-normal">Apply GST</Label>
                                <Switch
                                    id="apply-gst"
                                    checked={applyGST}
                                    onCheckedChange={setApplyGST}
                                />
                            </div>
                            
                            {applyGST && (
                                <div className="flex justify-between text-sm items-center">
                                    <span className="text-muted-foreground">GST ({formData.taxRate}%)</span>
                                    <div className="w-20">
                                        <Input
                                            type="number"
                                            className="h-8 text-right"
                                            value={formData.taxRate}
                                            onChange={(e) => setFormData(prev => ({ ...prev, taxRate: Number(e.target.value) }))}
                                        />
                                    </div>
                                </div>
                            )}
                            <div className="flex justify-between text-lg font-bold pt-4 border-t">
                                <span>Total</span>
                                <span>{formatCurrency(total, formData.currency)}</span>
                            </div>
                            <Button className="w-full mt-4" onClick={handleSubmit} disabled={loading}>
                                {loading ? 'Creating...' : 'Create Invoice'}
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}

export default NewInvoicePage
