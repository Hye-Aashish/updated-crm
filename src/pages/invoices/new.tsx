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
    const { clients, projects, setClients, setProjects } = useAppStore()
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
        }
        loadData()
    }, [])

    const [formData, setFormData] = useState({
        clientId: '',
        projectId: '',
        dueDate: '',
        taxRate: 18,
        frequency: 'once',
        autoSend: false
    })

    const [items, setItems] = useState<InvoiceFormItem[]>([
        { id: '1', description: 'Development Services', quantity: 1, rate: 0, amount: 0 }
    ])

    // Generate Invoice Number (Mock)
    const invoiceNumber = `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`

    // Filter projects based on selected client
    const clientProjects = projects.filter(p => p.clientId === formData.clientId)

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
    const taxAmount = (subtotal * formData.taxRate) / 100
    const total = subtotal + taxAmount

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!formData.clientId) {
            toast({ title: "Validation Error", description: "Please select a client.", variant: "destructive" })
            return
        }
        if (!formData.projectId) {
            toast({ title: "Validation Error", description: "Please select a project.", variant: "destructive" })
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
            const payload = {
                invoiceNumber,
                clientId: formData.clientId,
                projectId: formData.projectId,
                type: 'milestone', // Defaulting for now
                status: 'draft',
                date: new Date(),
                dueDate: new Date(formData.dueDate),
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
                autoSend: formData.autoSend
            }

            const response = await api.post('/invoices', payload)
            const saved = response.data

            const newInvoice: Invoice = {
                id: saved._id,
                invoiceNumber: saved.invoiceNumber,
                number: saved.invoiceNumber, // Alias
                clientId: saved.clientId,
                projectId: saved.projectId,
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
                                    <Label>Client</Label>
                                    <Select
                                        value={formData.clientId}
                                        onValueChange={(value) => setFormData(prev => ({ ...prev, clientId: value, projectId: '' }))}
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
                                    <Label>Project</Label>
                                    <Select
                                        value={formData.projectId}
                                        onValueChange={(value) => setFormData(prev => ({ ...prev, projectId: value }))}
                                        disabled={!formData.clientId}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select Project" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {clientProjects.map(p => (
                                                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
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
                                    <Input value="INR (₹)" disabled />
                                </div>
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
                </div>

                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Summary</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Subtotal</span>
                                <span>{formatCurrency(subtotal)}</span>
                            </div>
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
                            <div className="flex justify-between text-lg font-bold pt-4 border-t">
                                <span>Total</span>
                                <span>{formatCurrency(total)}</span>
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
