import { useState, useEffect } from 'react'
import {
    Plus, Package, Edit, Trash2, Calendar, Clock, DollarSign,
    CreditCard, AlertTriangle, Sparkles, Search, Filter
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAppStore } from '@/store'
import api from '@/lib/api-client'
import { formatCurrency } from '@/lib/utils'
import { ProductForm } from '@/components/products/product-form'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useToast } from '@/hooks/use-toast'
import { usePermissions } from '@/hooks/use-permissions'
import { ClientProductForm } from '@/components/clients/client-product-dialog'
import { ClientProductManagerDialog } from '@/components/clients/client-product-manager-dialog'
import { Link } from 'react-router-dom'
import type { Product, ClientProduct } from '@/types'

export function ProductsPage() {
    const { products, setProducts, currentUser } = useAppStore()
    const { toast } = useToast()
    const { canView, canCreate, canEdit, canDelete } = usePermissions()
    const canViewFinances = currentUser?.role === 'owner' || currentUser?.role === 'admin' || canView('invoices')
    const [isFormOpen, setIsFormOpen] = useState(false)
    const [editingProduct, setEditingProduct] = useState<Product | undefined>(undefined)
    const [isLoading, setIsLoading] = useState(false)

    // Client Assignments state
    const { clientProducts, setClientProducts } = useAppStore()
    const [isGlobalProductDialogOpen, setIsGlobalProductDialogOpen] = useState(false)
    const [editingGlobalCP, setEditingGlobalCP] = useState<ClientProduct | undefined>(undefined)
    const [selectedManagerCP, setSelectedManagerCP] = useState<ClientProduct | null>(null)
    const [isManagerOpen, setIsManagerOpen] = useState(false)
    const [isCPLoading, setIsCPLoading] = useState(false)

    // Filter & Search state for assignments
    const [searchQuery, setSearchQuery] = useState('')
    const [filterWorkStatus, setFilterWorkStatus] = useState('all')
    const [filterPaymentStatus, setFilterPaymentStatus] = useState('all')

    useEffect(() => {
        if (products.length === 0) fetchProducts()
        if (clientProducts.length === 0) fetchClientProducts()
    }, [])

    const fetchClientProducts = async () => {
        try {
            setIsCPLoading(true)
            const res = await api.get('/client-products')
            setClientProducts(res.data.map((cp: any) => ({ ...cp, id: cp._id })))
        } catch (error) {
            console.error('Failed to fetch client products', error)
        } finally {
            setIsCPLoading(false)
        }
    }

    const fetchProducts = async () => {
        try {
            setIsLoading(true)
            const res = await api.get('/products')
            const fetched = res.data.map((p: any) => ({ ...p, id: p._id }))
            setProducts(fetched)
        } catch (error) {
            console.error('Failed to fetch products', error)
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to load digital products' })
        } finally {
            setIsLoading(false)
        }
    }

    const handleDelete = async (id: string) => {
        if (!window.confirm('Are you sure you want to delete this product?')) return
        try {
            await api.delete(`/products/${id}`)
            setProducts(products.filter(p => p.id !== id))
            toast({ title: 'Success', description: 'Product deleted successfully' })
        } catch (error) {
            console.error('Delete product error', error)
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete product' })
        }
    }

    const handleFormSuccess = () => {
        setIsFormOpen(false)
        fetchProducts()
    }

    const handleDeleteCP = async (id: string) => {
        if (!window.confirm('Are you sure you want to delete this assignment?')) return
        try {
            await api.delete(`/client-products/${id}`)
            setClientProducts(clientProducts.filter(cp => cp.id !== id))
            toast({ title: 'Success', description: 'Assignment deleted successfully' })
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete assignment' })
        }
    }

    const handleManagerUpdate = (updated: ClientProduct) => {
        const cpId = updated.id || updated._id
        const mapped = { ...updated, id: updated._id || updated.id }
        setClientProducts(clientProducts.map(cp => (cp.id === cpId || (cp as any)._id === cpId) ? mapped : cp))
        setSelectedManagerCP(mapped)
    }

    const openManager = (cp: ClientProduct) => {
        setSelectedManagerCP(cp)
        setIsManagerOpen(true)
    }

    // Filter client products
    const filteredClientProducts = clientProducts.filter(cp => {
        const client: any = cp.client
        const prod: any = cp.product
        const q = searchQuery.toLowerCase()

        const matchQuery = !searchQuery ||
            client?.name?.toLowerCase().includes(q) ||
            client?.company?.toLowerCase().includes(q) ||
            prod?.name?.toLowerCase().includes(q)

        const matchWork = filterWorkStatus === 'all' ||
            (filterWorkStatus === 'not_started' && (!cp.workStatus || cp.workStatus === 'not_started')) ||
            cp.workStatus === filterWorkStatus

        const matchPayment = filterPaymentStatus === 'all' ||
            (filterPaymentStatus === 'unpaid' && (!cp.paymentStatus || cp.paymentStatus === 'unpaid')) ||
            cp.paymentStatus === filterPaymentStatus

        return matchQuery && matchWork && matchPayment
    })

    // Totals calculations across all assignments
    const totalAssignedValue = clientProducts.reduce((sum, cp) => sum + (Number(cp.customPrice) || 0), 0)
    const totalCollectedValue = clientProducts.reduce((sum, cp) => sum + (Number(cp.paidAmount) || 0), 0)
    const totalPendingValue = Math.max(0, totalAssignedValue - totalCollectedValue)
    const activeDeliveriesCount = clientProducts.filter(cp => cp.workStatus === 'in_progress' || cp.workStatus === 'review').length
    const totalTasksCount = clientProducts.reduce((sum, cp) => sum + (cp.tasks?.length || 0), 0)
    const pendingTasksCount = clientProducts.reduce((sum, cp) => sum + (cp.tasks?.filter(t => t.status !== 'completed').length || 0), 0)
    const completedDeliveriesCount = clientProducts.filter(cp => cp.workStatus === 'completed').length

    return (
        <div className="space-y-6 animate-in fade-in duration-500 p-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Digital Products</h1>
                    <p className="text-muted-foreground mt-1">
                        {canViewFinances
                            ? "Manage catalog offerings, client assignments, work progress, timelines, and payment collections."
                            : "Manage assigned digital products, milestone deliverables, work progress, and delivery timelines."}
                    </p>
                </div>
                {canCreate('projects') && (
                    <Button onClick={() => { setEditingProduct(undefined); setIsFormOpen(true); }} className="shadow-lg">
                        <Plus className="mr-2 h-4 w-4" /> Add Product to Catalog
                    </Button>
                )}
            </div>

            <Tabs defaultValue="assignments" className="w-full">
                <TabsList className="mb-4">
                    <TabsTrigger value="assignments" className="font-semibold">
                        Client Assignments ({clientProducts.length})
                    </TabsTrigger>
                    {canView('projects') && (
                        <TabsTrigger value="catalog">Product Catalog ({products.length})</TabsTrigger>
                    )}
                </TabsList>

                {/* ── CLIENT ASSIGNMENTS TAB ────────────────────────────────────────────── */}
                <TabsContent value="assignments" className="space-y-5">
                    {/* Summary KPI Cards */}
                    {canViewFinances ? (
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                            <div className="p-4 rounded-xl border bg-card shadow-xs">
                                <div className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1.5">
                                    <Package className="h-3.5 w-3.5 text-blue-500" /> Active Deliveries
                                </div>
                                <div className="text-2xl font-bold text-foreground mt-1">{activeDeliveriesCount} in progress</div>
                                <span className="text-xs text-muted-foreground mt-0.5 block">{clientProducts.length} Total Assignments</span>
                            </div>

                            <div className="p-4 rounded-xl border bg-card shadow-xs">
                                <div className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1.5">
                                    <DollarSign className="h-3.5 w-3.5 text-foreground" /> Total Revenue
                                </div>
                                <div className="text-2xl font-bold text-foreground mt-1">{formatCurrency(totalAssignedValue)}</div>
                                <span className="text-xs text-muted-foreground mt-0.5 block">Across all client deals</span>
                            </div>

                            <div className="p-4 rounded-xl border bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/40">
                                <div className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 uppercase flex items-center gap-1.5">
                                    <CreditCard className="h-3.5 w-3.5 text-emerald-600" /> Collected (Paid)
                                </div>
                                <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-400 mt-1">{formatCurrency(totalCollectedValue)}</div>
                                <span className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5 block">
                                    {totalAssignedValue > 0 ? `${Math.round((totalCollectedValue / totalAssignedValue) * 100)}% Collected` : 'Received'}
                                </span>
                            </div>

                            <div className={`p-4 rounded-xl border shadow-xs ${
                                totalPendingValue === 0
                                    ? 'bg-emerald-50/30 dark:bg-emerald-950/10 border-emerald-200'
                                    : 'bg-rose-50/60 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/40'
                            }`}>
                                <div className={`text-xs font-semibold uppercase flex items-center gap-1.5 ${
                                    totalPendingValue === 0 ? 'text-emerald-700' : 'text-rose-700 dark:text-rose-400'
                                }`}>
                                    <AlertTriangle className="h-3.5 w-3.5" /> Pending Balance
                                </div>
                                <div className={`text-2xl font-bold mt-1 ${
                                    totalPendingValue === 0 ? 'text-emerald-700' : 'text-rose-700 dark:text-rose-400'
                                }`}>
                                    {formatCurrency(totalPendingValue)}
                                </div>
                                <span className="text-xs text-muted-foreground mt-0.5 block">Outstanding collections</span>
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                            <div className="p-4 rounded-xl border bg-card shadow-xs">
                                <div className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1.5">
                                    <Package className="h-3.5 w-3.5 text-blue-500" /> Active Deliveries
                                </div>
                                <div className="text-2xl font-bold text-foreground mt-1">{activeDeliveriesCount} in progress</div>
                                <span className="text-xs text-muted-foreground mt-0.5 block">Currently active</span>
                            </div>

                            <div className="p-4 rounded-xl border bg-card shadow-xs">
                                <div className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1.5">
                                    <Package className="h-3.5 w-3.5 text-purple-500" /> Assigned Products
                                </div>
                                <div className="text-2xl font-bold text-foreground mt-1">{clientProducts.length} Products</div>
                                <span className="text-xs text-muted-foreground mt-0.5 block">{completedDeliveriesCount} Completed</span>
                            </div>

                            <div className="p-4 rounded-xl border bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/40">
                                <div className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 uppercase flex items-center gap-1.5">
                                    <Sparkles className="h-3.5 w-3.5 text-emerald-600" /> Total Tasks
                                </div>
                                <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-400 mt-1">{totalTasksCount} Items</div>
                                <span className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5 block">Deliverable milestones</span>
                            </div>

                            <div className="p-4 rounded-xl border bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/40">
                                <div className="text-xs font-semibold text-amber-700 dark:text-amber-300 uppercase flex items-center gap-1.5">
                                    <Clock className="h-3.5 w-3.5 text-amber-600" /> Pending Tasks
                                </div>
                                <div className="text-2xl font-bold text-amber-700 dark:text-amber-400 mt-1">{pendingTasksCount} Pending</div>
                                <span className="text-xs text-muted-foreground mt-0.5 block">Needs completion</span>
                            </div>
                        </div>
                    )}

                    {/* Filter & Search Bar */}
                    <div className="flex flex-col sm:flex-row gap-3 items-center justify-between p-3.5 bg-card rounded-xl border shadow-xs">
                        <div className="relative w-full sm:w-80">
                            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search by client or product..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="pl-9 text-xs h-9 bg-muted/30"
                            />
                        </div>

                        <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                <Filter className="h-3.5 w-3.5" /> Filter:
                            </div>
                            <Select value={filterWorkStatus} onValueChange={setFilterWorkStatus}>
                                <SelectTrigger className="text-xs h-9 w-[140px] bg-muted/30">
                                    <SelectValue placeholder="Work Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Work Status</SelectItem>
                                    <SelectItem value="not_started">⏳ Not Started</SelectItem>
                                    <SelectItem value="in_progress">⚙️ In Progress</SelectItem>
                                    <SelectItem value="review">🔍 In Review</SelectItem>
                                    <SelectItem value="completed">✅ Completed</SelectItem>
                                    <SelectItem value="on_hold">⏸️ On Hold</SelectItem>
                                </SelectContent>
                            </Select>

                            {canViewFinances && (
                                <Select value={filterPaymentStatus} onValueChange={setFilterPaymentStatus}>
                                    <SelectTrigger className="text-xs h-9 w-[140px] bg-muted/30">
                                        <SelectValue placeholder="Payment Status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Payments</SelectItem>
                                        <SelectItem value="paid">💳 Paid</SelectItem>
                                        <SelectItem value="partial">⚡ Partial</SelectItem>
                                        <SelectItem value="unpaid">⚠️ Unpaid</SelectItem>
                                    </SelectContent>
                                </Select>
                            )}
                        </div>
                    </div>

                    {/* Table View */}
                    <Card>
                        <CardContent className="p-0">
                            {isCPLoading ? (
                                <div className="text-center py-12">Loading assigned products...</div>
                            ) : filteredClientProducts.length === 0 ? (
                                <div className="text-center py-16 text-muted-foreground">
                                    <Package className="h-10 w-10 mx-auto mb-2 opacity-40 text-primary" />
                                    <p className="font-medium text-foreground">No assignments match your criteria.</p>
                                    <p className="text-xs mt-1">Assign products to clients directly from their Client Details page.</p>
                                </div>
                            ) : (
                                <div className="rounded-md border-0 overflow-x-auto">
                                    <Table>
                                        <TableHeader className="bg-muted/40">
                                            <TableRow>
                                                <TableHead>Client</TableHead>
                                                <TableHead>Digital Product</TableHead>
                                                <TableHead>Timeline & Due Date</TableHead>
                                                <TableHead>Work Progress & Status</TableHead>
                                                <TableHead>Tasks / Deliverables</TableHead>
                                                {canViewFinances && (
                                                    <TableHead>Commercials (Price / Paid / Pending)</TableHead>
                                                )}
                                                <TableHead className="text-right">Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {filteredClientProducts.map((cp) => {
                                                const client: any = cp.client
                                                const prod: any = cp.product
                                                const cpId = cp.id || (cp as any)._id
                                                const customPrice = Number(cp.customPrice) || 0
                                                const paidAmount = Number(cp.paidAmount) || 0
                                                const pendingAmount = Math.max(0, customPrice - paidAmount)
                                                const tasks = cp.tasks || []
                                                const completedTasks = tasks.filter(t => t.status === 'completed')
                                                const pendingTasks = tasks.filter(t => t.status !== 'completed')
                                                const progressPercent = cp.progress !== undefined ? cp.progress : (
                                                    tasks.length > 0 ? Math.round((completedTasks.length / tasks.length) * 100) : 0
                                                )

                                                // Due countdown badge
                                                let dueText = 'No date set'
                                                let dueColor = 'text-muted-foreground'
                                                if (cp.dueDate) {
                                                    const diffDays = Math.ceil((new Date(cp.dueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
                                                    if (cp.workStatus === 'completed') {
                                                        dueText = 'Delivered'
                                                        dueColor = 'text-emerald-600 font-semibold'
                                                    } else if (diffDays < 0) {
                                                        dueText = `Overdue ${Math.abs(diffDays)}d`
                                                        dueColor = 'text-red-600 font-bold'
                                                    } else if (diffDays === 0) {
                                                        dueText = 'Due Today'
                                                        dueColor = 'text-amber-600 font-bold'
                                                    } else {
                                                        dueText = `${diffDays}d left`
                                                        dueColor = 'text-blue-600'
                                                    }
                                                }

                                                return (
                                                    <TableRow key={cpId} className="hover:bg-muted/30">
                                                        <TableCell>
                                                            {client ? (
                                                                <Link to={`/clients/${client._id || client.id}`} className="font-semibold text-blue-600 hover:underline">
                                                                    {client.name}
                                                                    {client.company && <div className="text-xs text-muted-foreground font-normal">{client.company}</div>}
                                                                </Link>
                                                            ) : 'Unknown Client'}
                                                        </TableCell>

                                                        <TableCell>
                                                            <div className="font-medium text-foreground">{prod?.name || 'Unknown'}</div>
                                                            {cp.customizations && (
                                                                <div className="text-[11px] text-muted-foreground line-clamp-1 max-w-[180px]" title={cp.customizations}>
                                                                    {cp.customizations}
                                                                </div>
                                                            )}
                                                        </TableCell>

                                                        <TableCell>
                                                            <div className="text-xs space-y-0.5">
                                                                <div className="flex items-center gap-1 text-muted-foreground">
                                                                    <Calendar className="h-3 w-3 text-blue-500" />
                                                                    Start: {cp.startDate ? new Date(cp.startDate).toLocaleDateString() : 'N/A'}
                                                                </div>
                                                                <div className="flex items-center gap-1">
                                                                    <Clock className="h-3 w-3 text-amber-500" />
                                                                    Due: {cp.dueDate ? new Date(cp.dueDate).toLocaleDateString() : 'None'}
                                                                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full border bg-muted/60 ml-1 ${dueColor}`}>
                                                                        {dueText}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </TableCell>

                                                        <TableCell>
                                                            <div className="space-y-1.5 min-w-[150px]">
                                                                <div className="flex items-center justify-between text-xs">
                                                                    <Badge
                                                                        variant="secondary"
                                                                        className={`text-[10px] py-0 ${
                                                                            cp.workStatus === 'completed'
                                                                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                                                                : cp.workStatus === 'in_progress'
                                                                                ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                                                                                : cp.workStatus === 'review'
                                                                                ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300'
                                                                                : cp.workStatus === 'on_hold'
                                                                                ? 'bg-amber-100 text-amber-800'
                                                                                : 'bg-muted'
                                                                        }`}
                                                                    >
                                                                        {cp.workStatus === 'completed' && 'Completed'}
                                                                        {cp.workStatus === 'in_progress' && 'In Progress'}
                                                                        {cp.workStatus === 'review' && 'In Review'}
                                                                        {cp.workStatus === 'on_hold' && 'On Hold'}
                                                                        {(!cp.workStatus || cp.workStatus === 'not_started') && 'Not Started'}
                                                                    </Badge>
                                                                    <span className="font-bold text-xs">{progressPercent}%</span>
                                                                </div>
                                                                <Progress value={progressPercent} className="h-1.5" />
                                                            </div>
                                                        </TableCell>

                                                        <TableCell>
                                                            <div className="text-xs">
                                                                {tasks.length === 0 ? (
                                                                    <span className="text-muted-foreground italic">No tasks set</span>
                                                                ) : (
                                                                    <div className="space-y-0.5">
                                                                        <div className="font-medium">
                                                                            {completedTasks.length}/{tasks.length} Done
                                                                        </div>
                                                                        {pendingTasks.length > 0 ? (
                                                                            <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                                                                                {pendingTasks.length} task{pendingTasks.length > 1 ? 's' : ''} pending
                                                                            </span>
                                                                        ) : (
                                                                            <span className="text-[11px] text-emerald-600 font-medium">
                                                                                All finished!
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </TableCell>

                                                        {canViewFinances && (
                                                            <TableCell>
                                                                <div className="text-xs space-y-0.5 min-w-[150px]">
                                                                    <div className="font-bold text-foreground">
                                                                        {formatCurrency(customPrice)}
                                                                    </div>
                                                                    <div className="flex items-center gap-2 text-[11px]">
                                                                        <span className="text-emerald-600">Paid: {formatCurrency(paidAmount)}</span>
                                                                        <span className="text-muted-foreground">•</span>
                                                                        <span className={pendingAmount === 0 ? 'text-emerald-600' : 'text-rose-600 font-semibold'}>
                                                                            Due: {formatCurrency(pendingAmount)}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            </TableCell>
                                                        )}

                                                        <TableCell className="text-right space-x-1.5">
                                                            <Button
                                                                variant="default"
                                                                size="sm"
                                                                className="text-xs h-8 px-2.5 shadow-xs"
                                                                onClick={() => openManager(cp)}
                                                            >
                                                                <Sparkles className="h-3.5 w-3.5 mr-1 text-amber-300" /> Track & Manage
                                                            </Button>
                                                            {canEdit('projects') && (
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    className="text-xs h-8 px-2"
                                                                    onClick={() => { setEditingGlobalCP(cp); setIsGlobalProductDialogOpen(true); }}
                                                                    title="Edit details"
                                                                >
                                                                    <Edit className="h-3.5 w-3.5" />
                                                                </Button>
                                                            )}
                                                            {canDelete('projects') && (
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    className="text-xs h-8 px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                                                                    onClick={() => handleDeleteCP(cpId)}
                                                                    title="Delete assignment"
                                                                >
                                                                    <Trash2 className="h-3.5 w-3.5" />
                                                                </Button>
                                                            )}
                                                        </TableCell>
                                                    </TableRow>
                                                )
                                            })}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* ── PRODUCT CATALOG TAB ──────────────────────────────────────────────── */}
                <TabsContent value="catalog">
                    {isLoading ? (
                        <div className="text-center py-10">Loading products...</div>
                    ) : products.length === 0 ? (
                        <div className="text-center py-12 bg-card rounded-lg border border-dashed">
                            <Package className="mx-auto h-12 w-12 text-muted-foreground opacity-50 mb-4" />
                            <h3 className="text-lg font-medium">No Products Yet</h3>
                            <p className="text-muted-foreground mb-4 max-w-sm mx-auto">You haven't added any digital products to your catalog yet.</p>
                            {canCreate('projects') && (
                                <Button onClick={() => { setEditingProduct(undefined); setIsFormOpen(true); }} variant="outline">
                                    Create First Product
                                </Button>
                            )}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {products.map(product => (
                                <Card key={product.id} className="hover:shadow-md transition-all flex flex-col group relative overflow-hidden">
                                    <div className={`absolute top-0 left-0 right-0 h-1 ${product.status === 'active' ? 'bg-green-500' : 'bg-gray-400'}`} />
                                    <CardHeader className="pb-3">
                                        <div className="flex justify-between items-start gap-4">
                                            <div className="space-y-1">
                                                <CardTitle className="text-xl line-clamp-1" title={product.name}>{product.name}</CardTitle>
                                                {canViewFinances && (
                                                    <div className="font-bold text-lg text-primary">{formatCurrency(product.basePrice)}</div>
                                                )}
                                            </div>
                                            <Badge variant={product.status === 'active' ? 'default' : 'secondary'} className={product.status === 'active' ? 'bg-green-100 text-green-800 hover:bg-green-200 border-green-200' : ''}>
                                                {product.status}
                                            </Badge>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="flex-1 flex flex-col pt-0">
                                        <p className="text-sm text-muted-foreground mb-4 line-clamp-2" title={product.description}>
                                            {product.description || "No description provided."}
                                        </p>
                                        
                                        {product.features && product.features.length > 0 && (
                                            <div className="mb-4">
                                                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Features</p>
                                                <ul className="text-sm space-y-1">
                                                    {product.features.slice(0, 3).map((f, i) => (
                                                        <li key={i} className="flex items-start gap-2">
                                                            <span className="text-primary mt-0.5">•</span>
                                                            <span className="line-clamp-1" title={f}>{f}</span>
                                                        </li>
                                                    ))}
                                                    {product.features.length > 3 && (
                                                        <li className="text-xs text-muted-foreground italic mt-1">+{product.features.length - 3} more</li>
                                                    )}
                                                </ul>
                                            </div>
                                        )}
                                        
                                        {(canEdit('projects') || canDelete('projects')) && (
                                            <div className="mt-auto pt-4 flex gap-2 border-t opacity-0 group-hover:opacity-100 transition-opacity">
                                                {canEdit('projects') && (
                                                    <Button variant="outline" size="sm" className="flex-1" onClick={() => { setEditingProduct(product); setIsFormOpen(true); }}>
                                                        <Edit className="h-4 w-4 mr-2" /> Edit
                                                    </Button>
                                                )}
                                                {canDelete('projects') && (
                                                    <Button variant="destructive" size="sm" onClick={() => handleDelete(product.id)}>
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                )}
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </TabsContent>
            </Tabs>

            {/* Catalog Add/Edit Product Dialog */}
            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>{editingProduct ? 'Edit Product' : 'Add Digital Product'}</DialogTitle>
                        <DialogDescription>
                            {editingProduct ? 'Update the details for this product.' : 'Create a new digital product for your catalog.'}
                        </DialogDescription>
                    </DialogHeader>
                    <ProductForm 
                        initialData={editingProduct} 
                        onSuccess={handleFormSuccess} 
                        onCancel={() => setIsFormOpen(false)} 
                    />
                </DialogContent>
            </Dialog>

            {/* Edit Assignment Dialog */}
            <Dialog open={isGlobalProductDialogOpen} onOpenChange={setIsGlobalProductDialogOpen}>
                <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                        <DialogTitle>Edit Client Product Assignment</DialogTitle>
                        <DialogDescription>
                            Configure pricing, delivery timeline, and work status for this client's product.
                        </DialogDescription>
                    </DialogHeader>
                    {editingGlobalCP && (
                        <ClientProductForm 
                            clientId={(editingGlobalCP.client as any)?._id || (editingGlobalCP.client as any)?.id}
                            initialData={editingGlobalCP}
                            onSuccess={() => { setIsGlobalProductDialogOpen(false); fetchClientProducts(); }}
                            onCancel={() => setIsGlobalProductDialogOpen(false)}
                        />
                    )}
                </DialogContent>
            </Dialog>

            {/* Comprehensive Product Manager Dialog */}
            <Dialog open={isManagerOpen} onOpenChange={setIsManagerOpen}>
                <DialogContent className="sm:max-w-[750px] p-6">
                    {selectedManagerCP && (
                        <ClientProductManagerDialog
                            clientProduct={selectedManagerCP}
                            onUpdate={handleManagerUpdate}
                            onClose={() => setIsManagerOpen(false)}
                        />
                    )}
                </DialogContent>
            </Dialog>
        </div>
    )
}
