import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import {
    Plus, Search, Download, Upload, Calendar,
    DollarSign, TrendingUp, Receipt, Zap, Wifi, Home, Code,
    Megaphone, Globe, Car, Coffee, MoreHorizontal, Trash2
} from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'
import axios from 'axios'
import { useToast } from '@/hooks/use-toast'

// Fixed Categories (Admin only can add new)
const EXPENSE_CATEGORIES = [
    { value: 'salary', label: 'Salary', icon: DollarSign },
    { value: 'office-rent', label: 'Office Rent', icon: Home },
    { value: 'electricity', label: 'Electricity', icon: Zap },
    { value: 'internet', label: 'Internet', icon: Wifi },
    { value: 'tools-software', label: 'Tools/Software', icon: Code },
    { value: 'ads-marketing', label: 'Ads/Marketing', icon: Megaphone },
    { value: 'domain-hosting', label: 'Domain/Hosting', icon: Globe },
    { value: 'travel', label: 'Travel', icon: Car },
    { value: 'food-team', label: 'Food/Team', icon: Coffee },
    { value: 'misc', label: 'Misc', icon: MoreHorizontal },
]

const PAYMENT_MODES = ['Cash', 'UPI', 'Bank Transfer', 'Credit Card', 'Debit Card']
const PAID_BY_OPTIONS = ['Company', 'Personal']

// Quick Templates
// Quick Templates
const QUICK_TEMPLATES = [
    { category: 'salary', label: 'Salary', icon: DollarSign, defaultAmount: 50000 },
    { category: 'office-rent', label: 'Office Rent', icon: Home, defaultAmount: 25000 },
    { category: 'electricity', label: 'Electricity', icon: Zap, defaultAmount: 5000 },
    { category: 'internet', label: 'Internet', icon: Wifi, defaultAmount: 1500 },
    { category: 'tools-software', label: 'Software/Tools', icon: Code, defaultAmount: 5000 },
    { category: 'ads-marketing', label: 'Ads/Marketing', icon: Megaphone, defaultAmount: 15000 },
    { category: 'domain-hosting', label: 'Hosting/Server', icon: Globe, defaultAmount: 8000 },
    { category: 'travel', label: 'Travel/Fuel', icon: Car, defaultAmount: 2000 },
    { category: 'food-team', label: 'Team Food', icon: Coffee, defaultAmount: 1000 },
    { category: 'misc', label: 'Other', icon: MoreHorizontal, defaultAmount: 500 },
]

type Expense = {
    id: string
    date: string
    amount: number
    category: string
    paymentMode: string
    paidBy: string
    note: string
    receipt?: string
    createdAt?: string
}



export function ExpensesPage() {
    const { toast } = useToast()
    const [expenses, setExpenses] = useState<Expense[]>([])
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [viewExpenseDialogOpen, setViewExpenseDialogOpen] = useState(false)
    const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null)
    const [searchQuery, setSearchQuery] = useState('')
    const [filterCategory, setFilterCategory] = useState('')
    const [filterPaymentMode, setFilterPaymentMode] = useState('')
    const [dateRange, setDateRange] = useState({
        start: '2026-01-01',
        end: '2026-01-31'
    })

    const fileInputRef = useRef<HTMLInputElement>(null)

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            const reader = new FileReader()
            reader.onloadend = () => {
                setNewExpense(prev => ({ ...prev, receipt: reader.result as string }))
                toast({ description: "Receipt attached" })
            }
            reader.readAsDataURL(file)
        }
    }

    const [newExpense, setNewExpense] = useState({
        date: new Date().toISOString().split('T')[0],
        amount: '',
        category: '',
        paymentMode: 'UPI',
        paidBy: 'Company',
        note: '',
        receipt: ''
    })

    // Calculate Monthly Summary
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0)
    const categoryExpenses = expenses.reduce((acc, e) => {
        acc[e.category] = (acc[e.category] || 0) + e.amount
        return acc
    }, {} as Record<string, number>)
    const topCategory = Object.entries(categoryExpenses).sort((a, b) => b[1] - a[1])[0]
    const highestExpense = expenses.length ? Math.max(...expenses.map(e => e.amount)) : 0


    // Fetch Expenses
    const fetchData = async () => {
        try {
            const res = await axios.get('http://localhost:5000/api/expenses')
            const mapped = res.data.map((e: any) => ({
                id: e._id,
                date: e.date.split('T')[0],
                amount: e.amount,
                category: e.category,
                paymentMode: e.paymentMode,
                paidBy: e.paidBy,
                note: e.note || '',
                receipt: e.receipt,
                createdAt: e.createdAt
            }))
            setExpenses(mapped)
        } catch (error) {
            console.error("Failed to fetch expenses", error)
            toast({ title: "Error", description: "Failed to load expenses", variant: "destructive" })
        }
    }

    useEffect(() => {
        fetchData()
    }, [])

    // Add Expense
    const handleAddExpense = async () => {
        if (!newExpense.amount || !newExpense.category) return

        try {
            const payload = {
                date: newExpense.date,
                amount: parseFloat(newExpense.amount),
                category: newExpense.category,
                paymentMode: newExpense.paymentMode,
                paidBy: newExpense.paidBy,
                note: newExpense.note,
                receipt: newExpense.receipt
            }

            await axios.post('http://localhost:5000/api/expenses', payload)

            setNewExpense({
                date: new Date().toISOString().split('T')[0],
                amount: '',
                category: '',
                paymentMode: 'UPI',
                paidBy: 'Company',
                note: '',
                receipt: ''
            })
            setIsDialogOpen(false)
            fetchData()
            toast({ description: "Expense added successfully" })
        } catch (error) {
            console.error("Failed to add expense", error)
            toast({ title: "Error", description: "Failed to add expense", variant: "destructive" })
        }
    }

    // Delete Expense
    const handleDeleteExpense = async (id: string) => {
        try {
            await axios.delete(`http://localhost:5000/api/expenses/${id}`)
            setExpenses(prev => prev.filter(e => e.id !== id))
            toast({ description: "Expense deleted successfully" })
            if (selectedExpense?.id === id) setViewExpenseDialogOpen(false)
        } catch (error) {
            console.error("Failed to delete expense", error)
            toast({ title: "Error", description: "Failed to delete expense", variant: "destructive" })
        }
    }

    // Quick Template Add
    const handleQuickAdd = (template: typeof QUICK_TEMPLATES[0]) => {
        setNewExpense({
            ...newExpense,
            category: template.category,
            amount: template.defaultAmount.toString()
        })
        setIsDialogOpen(true)
    }

    // Filter Expenses
    const filteredExpenses = expenses.filter(expense => {
        const matchesSearch = (expense.note ?? '').toLowerCase().includes(searchQuery.toLowerCase())
        const matchesCategory = !filterCategory || expense.category === filterCategory
        const matchesPayment = !filterPaymentMode || expense.paymentMode === filterPaymentMode
        const expenseDate = new Date(expense.date)
        const matchesDate = expenseDate >= new Date(dateRange.start) && expenseDate <= new Date(dateRange.end)
        return matchesSearch && matchesCategory && matchesPayment && matchesDate
    })

    const getCategoryIcon = (category: string) => {
        const cat = EXPENSE_CATEGORIES.find(c => c.value === category)
        return cat?.icon || MoreHorizontal
    }

    const getCategoryLabel = (category: string) => {
        const cat = EXPENSE_CATEGORIES.find(c => c.value === category)
        return cat?.label || category
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold">Expenses</h1>
                    <p className="text-muted-foreground mt-1">Track company spending - 2 minute daily habit</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline">
                        <Download className="mr-2 h-4 w-4" />
                        Export CSV
                    </Button>
                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                        <DialogTrigger asChild>
                            <Button>
                                <Plus className="mr-2 h-4 w-4" />
                                Add Expense
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Add New Expense</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="date">Date *</Label>
                                        <Input
                                            id="date"
                                            type="date"
                                            value={newExpense.date}
                                            onChange={(e) => setNewExpense({ ...newExpense, date: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="amount">Amount (₹) *</Label>
                                        <Input
                                            id="amount"
                                            type="number"
                                            placeholder="5000"
                                            value={newExpense.amount}
                                            onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="category">Category *</Label>
                                    <select
                                        id="category"
                                        value={newExpense.category}
                                        onChange={(e) => setNewExpense({ ...newExpense, category: e.target.value })}
                                        className="w-full h-10 px-3 rounded-md border border-input bg-background"
                                    >
                                        <option value="">Select category</option>
                                        {EXPENSE_CATEGORIES.map((cat) => (
                                            <option key={cat.value} value={cat.value}>{cat.label}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="payment-mode">Payment Mode *</Label>
                                        <select
                                            id="payment-mode"
                                            value={newExpense.paymentMode}
                                            onChange={(e) => setNewExpense({ ...newExpense, paymentMode: e.target.value })}
                                            className="w-full h-10 px-3 rounded-md border border-input bg-background"
                                        >
                                            {PAYMENT_MODES.map((mode) => (
                                                <option key={mode} value={mode}>{mode}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="paid-by">Paid By *</Label>
                                        <select
                                            id="paid-by"
                                            value={newExpense.paidBy}
                                            onChange={(e) => setNewExpense({ ...newExpense, paidBy: e.target.value })}
                                            className="w-full h-10 px-3 rounded-md border border-input bg-background"
                                        >
                                            {PAID_BY_OPTIONS.map((option) => (
                                                <option key={option} value={option}>{option}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="note">Note (Optional)</Label>
                                    <Input
                                        id="note"
                                        placeholder="Brief description..."
                                        value={newExpense.note}
                                        onChange={(e) => setNewExpense({ ...newExpense, note: e.target.value })}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label>Attach Receipt (Optional)</Label>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="file"
                                            hidden
                                            ref={fileInputRef}
                                            onChange={handleFileChange}
                                            accept="image/*,application/pdf"
                                        />
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="w-full"
                                            onClick={() => fileInputRef.current?.click()}
                                        >
                                            <Upload className="mr-2 h-4 w-4" />
                                            {newExpense.receipt ? 'Receipt Attached (Change)' : 'Upload Receipt'}
                                        </Button>
                                    </div>
                                </div>

                                <Button onClick={handleAddExpense} className="w-full">
                                    Add Expense
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {/* Quick Templates */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Quick Add Templates</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-wrap gap-2">
                        {QUICK_TEMPLATES.map((template) => {
                            const Icon = template.icon
                            return (
                                <Button
                                    key={template.category}
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleQuickAdd(template)}
                                >
                                    <Icon className="mr-2 h-4 w-4" />
                                    {template.label}
                                </Button>
                            )
                        })}
                    </div>
                </CardContent>
            </Card>

            {/* Monthly Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="border-l-4 border-l-red-500">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Total Expenses</p>
                                <h3 className="text-2xl font-bold mt-1">{formatCurrency(totalExpenses)}</h3>
                                <p className="text-xs text-muted-foreground mt-1">This Month</p>
                            </div>
                            <div className="h-12 w-12 rounded-full bg-red-50 flex items-center justify-center">
                                <DollarSign className="h-6 w-6 text-red-500" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-purple-500">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Top Category</p>
                                <h3 className="text-xl font-bold mt-1">{topCategory ? getCategoryLabel(topCategory[0]) : 'N/A'}</h3>
                                <p className="text-xs text-muted-foreground mt-1">{topCategory ? formatCurrency(topCategory[1]) : ''}</p>
                            </div>
                            <div className="h-12 w-12 rounded-full bg-purple-50 flex items-center justify-center">
                                <TrendingUp className="h-6 w-6 text-purple-500" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-orange-500">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Highest Expense</p>
                                <h3 className="text-2xl font-bold mt-1">{formatCurrency(highestExpense)}</h3>
                                <p className="text-xs text-muted-foreground mt-1">Single transaction</p>
                            </div>
                            <div className="h-12 w-12 rounded-full bg-orange-50 flex items-center justify-center">
                                <Receipt className="h-6 w-6 text-orange-500" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-blue-500">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Total Entries</p>
                                <h3 className="text-2xl font-bold mt-1">{expenses.length}</h3>
                                <p className="text-xs text-muted-foreground mt-1">This month</p>
                            </div>
                            <div className="h-12 w-12 rounded-full bg-blue-50 flex items-center justify-center">
                                <Receipt className="h-6 w-6 text-blue-500" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Filters */}
            <Card>
                <CardContent className="p-4">
                    <div className="flex flex-wrap items-center gap-4">
                        <div className="relative flex-1 min-w-[200px]">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                placeholder="Search by note..."
                                className="pl-10"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <Input
                                type="date"
                                className="h-9 w-auto"
                                value={dateRange.start}
                                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                            />
                            <span className="text-muted-foreground">-</span>
                            <Input
                                type="date"
                                className="h-9 w-auto"
                                value={dateRange.end}
                                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                            />
                        </div>
                        <select
                            value={filterCategory}
                            onChange={(e) => setFilterCategory(e.target.value)}
                            className="h-9 px-3 rounded-md border border-input bg-background"
                        >
                            <option value="">All Categories</option>
                            {EXPENSE_CATEGORIES.map((cat) => (
                                <option key={cat.value} value={cat.value}>{cat.label}</option>
                            ))}
                        </select>
                        <select
                            value={filterPaymentMode}
                            onChange={(e) => setFilterPaymentMode(e.target.value)}
                            className="h-9 px-3 rounded-md border border-input bg-background"
                        >
                            <option value="">All Payment Modes</option>
                            {PAYMENT_MODES.map((mode) => (
                                <option key={mode} value={mode}>{mode}</option>
                            ))}
                        </select>
                    </div>
                </CardContent>
            </Card>

            {/* Expense List */}
            <Card>
                <CardHeader>
                    <CardTitle>Expense History</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        {filteredExpenses.map((expense) => {
                            const Icon = getCategoryIcon(expense.category)
                            return (
                                <div
                                    key={expense.id}
                                    className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors group cursor-pointer"
                                    onClick={() => { setSelectedExpense(expense); setViewExpenseDialogOpen(true); }}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                                            <Icon className="h-5 w-5 text-primary" />
                                        </div>
                                        <div>
                                            <div className="font-medium">{getCategoryLabel(expense.category)}</div>
                                            <div className="text-sm text-muted-foreground">{expense.note || 'No description'}</div>
                                            <div className="flex gap-2 mt-1">
                                                <Badge variant="outline" className="text-xs">{expense.paymentMode}</Badge>
                                                <Badge variant="secondary" className="text-xs">{expense.paidBy}</Badge>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right flex items-center gap-4">
                                        <div>
                                            <div className="text-xl font-bold text-red-600">-{formatCurrency(expense.amount)}</div>
                                            <div className="text-xs text-muted-foreground">{formatDate(new Date(expense.date))}</div>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="opacity-50 group-hover:opacity-100 transition-opacity text-destructive hover:bg-destructive/10 hover:text-destructive"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDeleteExpense(expense.id);
                                            }}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </CardContent>
            </Card>

            {/* View Expense Details Dialog */}
            <Dialog open={viewExpenseDialogOpen} onOpenChange={setViewExpenseDialogOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Transaction Details</DialogTitle>
                    </DialogHeader>
                    {selectedExpense && (
                        <div className="space-y-6">
                            {/* Amount Header */}
                            <div className="text-center py-4 bg-muted/30 rounded-lg border border-dashed">
                                <p className="text-sm text-muted-foreground uppercase tracking-wider mb-1">Total Expense</p>
                                <h2 className="text-4xl font-bold text-red-600">-{formatCurrency(selectedExpense.amount)}</h2>
                                <Badge className="mt-2 text-base px-3 py-1" variant="secondary">{getCategoryLabel(selectedExpense.category)}</Badge>
                            </div>

                            {/* Details Grid */}
                            <div className="grid grid-cols-2 gap-y-4 gap-x-8 text-sm">
                                <div>
                                    <p className="text-muted-foreground text-xs">Transaction ID</p>
                                    <p className="font-mono text-xs mt-1 text-primary">{selectedExpense.id}</p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground text-xs">Expense Date</p>
                                    <p className="font-medium mt-1">{formatDate(new Date(selectedExpense.date))}</p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground text-xs">Payment Mode</p>
                                    <p className="font-medium mt-1">{selectedExpense.paymentMode}</p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground text-xs">Paid By</p>
                                    <p className="font-medium mt-1">{selectedExpense.paidBy}</p>
                                </div>
                                <div className="col-span-2">
                                    <p className="text-muted-foreground text-xs">Created At</p>
                                    <p className="font-medium mt-1">
                                        {selectedExpense.createdAt ? new Date(selectedExpense.createdAt).toLocaleString() : 'N/A'}
                                    </p>
                                </div>
                            </div>

                            {/* Note / Description */}
                            <div className="pt-4 border-t">
                                <p className="text-sm font-medium mb-2">Description / Note</p>
                                <div className="p-3 bg-muted/50 rounded-md text-sm whitespace-pre-wrap border">
                                    {selectedExpense.note || 'No notes provided for this transaction.'}
                                </div>
                            </div>

                            {/* Receipt */}
                            {selectedExpense.receipt && (
                                <div className="pt-4 border-t">
                                    <div className="flex items-center justify-between mb-2">
                                        <p className="text-sm font-medium">Attached Receipt</p>
                                        <a
                                            href={selectedExpense.receipt}
                                            download={`receipt-${selectedExpense.id}`}
                                            className="text-xs text-primary hover:underline flex items-center"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <Download className="mr-1 h-3 w-3" /> Download
                                        </a>
                                    </div>
                                    <div className="border rounded-lg overflow-hidden bg-muted/10 p-2">
                                        <img
                                            src={selectedExpense.receipt}
                                            alt="Receipt"
                                            className="w-full max-h-[300px] object-contain rounded"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Actions */}
                            <div className="flex justify-between items-center pt-4 border-t">
                                <Button variant="outline" size="sm" onClick={() => setViewExpenseDialogOpen(false)}>
                                    Close
                                </Button>
                                <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => handleDeleteExpense(selectedExpense.id)}
                                >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Delete Transaction
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* 2 Minute Rule Reminder */}
            <Card className="bg-blue-50 border-blue-200">
                <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                        <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                            <span className="text-white font-bold">💡</span>
                        </div>
                        <div>
                            <h4 className="font-semibold text-blue-900">2 Minute Daily Habit</h4>
                            <p className="text-sm text-blue-700 mt-1">
                                End of day: Take 2 minutes to add today's expenses. Weekly add करोगे तो भूल जाओगे!
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
