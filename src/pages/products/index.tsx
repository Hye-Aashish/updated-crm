import { useState, useEffect, useMemo } from 'react'
import {
    Plus, Package, Edit, Trash2, Calendar, Clock, DollarSign,
    CreditCard, AlertTriangle, Sparkles, Search, Filter, Globe,
    Smartphone, Layers, ShoppingCart, Palette, CheckCircle2,
    ArrowUpRight, CheckSquare, LayoutGrid, Table as TableIcon,
    Activity, ExternalLink, User, ShieldCheck, Briefcase
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAppStore } from '@/store'
import api from '@/lib/api-client'
import { formatCurrency, getInitials } from '@/lib/utils'
import { ProductForm } from '@/components/products/product-form'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useToast } from '@/hooks/use-toast'
import { usePermissions } from '@/hooks/use-permissions'
import { ClientProductForm } from '@/components/clients/client-product-dialog'
import { ClientProductManagerDialog } from '@/components/clients/client-product-manager-dialog'
import { Link, useNavigate } from 'react-router-dom'
import type { Product, ClientProduct } from '@/types'

import { appConfirm } from '@/lib/app-dialog'

export function ProductsPage() {
    const navigate = useNavigate()
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

    // Category & View Filter state
    const [selectedCategory, setSelectedCategory] = useState<string>('All Categories')
    const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards')

    // Filter & Search state for assignments
    const [searchQuery, setSearchQuery] = useState('')
    const [filterWorkStatus, setFilterWorkStatus] = useState<string>('all')
    const [filterPaymentStatus, setFilterPaymentStatus] = useState<string>('all')

    useEffect(() => {
        fetchProducts()
        fetchClientProducts()
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
        if (!await appConfirm('Are you sure you want to delete this product?')) return
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
        if (!await appConfirm('Are you sure you want to delete this assignment?')) return
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

    // Dynamic Category Extraction across Products & Client Assignments
    const allCategories = useMemo(() => {
        const cats = new Set<string>()
        products.forEach(p => { 
            if (p.category && p.category.trim()) cats.add(p.category.trim()) 
        })
        clientProducts.forEach(cp => {
            const prod: any = cp.product
            if (prod?.category && prod.category.trim()) cats.add(prod.category.trim())
        })
        const list = Array.from(cats).sort()
        return ['All Categories', ...list]
    }, [products, clientProducts])

    // Category Icon Resolver
    const getCategoryIcon = (cat: string) => {
        const l = cat.toLowerCase()
        if (l.includes('web') || l.includes('site')) return Globe
        if (l.includes('app') || l.includes('mobile') || l.includes('ios') || l.includes('android')) return Smartphone
        if (l.includes('saas') || l.includes('crm') || l.includes('soft') || l.includes('platform')) return Layers
        if (l.includes('commerce') || l.includes('shop') || l.includes('store')) return ShoppingCart
        if (l.includes('design') || l.includes('ui') || l.includes('ux') || l.includes('brand')) return Palette
        if (l.includes('seo') || l.includes('market')) return Sparkles
        return Package
    }

    // Get stats for a category
    const getCategoryStats = (cat: string) => {
        if (cat === 'All Categories') {
            return {
                clientsCount: clientProducts.length,
                productsCount: products.length
            }
        }
        const matchingProds = products.filter(p => p.category?.trim().toLowerCase() === cat.trim().toLowerCase())
        const matchingCPs = clientProducts.filter(cp => {
            const p: any = cp.product
            return p?.category?.trim().toLowerCase() === cat.trim().toLowerCase()
        })
        return {
            clientsCount: matchingCPs.length,
            productsCount: matchingProds.length
        }
    }

    // Filter client products by selected Category, Search Query, and Statuses
    const filteredClientProducts = clientProducts.filter(cp => {
        const client: any = cp.client
        const prod: any = cp.product
        const q = searchQuery.toLowerCase().trim()

        // 1. Category Filter
        const matchCategory = selectedCategory === 'All Categories' ||
            (prod?.category && prod.category.trim().toLowerCase() === selectedCategory.trim().toLowerCase())

        // 2. Query Search
        const matchQuery = !q ||
            client?.name?.toLowerCase().includes(q) ||
            client?.company?.toLowerCase().includes(q) ||
            prod?.name?.toLowerCase().includes(q) ||
            prod?.category?.toLowerCase().includes(q) ||
            cp.customizations?.toLowerCase().includes(q)

        // 3. Work Status
        const matchWork = filterWorkStatus === 'all' ||
            (filterWorkStatus === 'not_started' && (!cp.workStatus || cp.workStatus === 'not_started')) ||
            cp.workStatus === filterWorkStatus

        // 4. Payment Status
        const matchPayment = filterPaymentStatus === 'all' ||
            (filterPaymentStatus === 'unpaid' && (!cp.paymentStatus || cp.paymentStatus === 'unpaid')) ||
            cp.paymentStatus === filterPaymentStatus

        return matchCategory && matchQuery && matchWork && matchPayment
    })

    // Filter catalog products by selected Category
    const filteredProducts = products.filter(p => {
        if (selectedCategory === 'All Categories') return true
        return p.category?.trim().toLowerCase() === selectedCategory.trim().toLowerCase()
    })

    // Totals calculations across filtered assignments
    const totalAssignedValue = filteredClientProducts.reduce((sum, cp) => sum + (Number(cp.customPrice) || 0), 0)
    const totalCollectedValue = filteredClientProducts.reduce((sum, cp) => sum + (Number(cp.paidAmount) || 0), 0)
    const totalPendingValue = Math.max(0, totalAssignedValue - totalCollectedValue)
    const activeDeliveriesCount = filteredClientProducts.filter(cp => cp.workStatus === 'in_progress' || cp.workStatus === 'review').length
    const completedDeliveriesCount = filteredClientProducts.filter(cp => cp.workStatus === 'completed').length

    // Average progress in active category
    const avgProgress = filteredClientProducts.length > 0
        ? Math.round(filteredClientProducts.reduce((sum, cp) => sum + (cp.progress || 0), 0) / filteredClientProducts.length)
        : 0

    return (
        <div className="space-y-6 p-4 sm:p-6 max-w-[1600px] mx-auto animate-in fade-in duration-300">
            {/* 1. Header Strip with Actions */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-2 border-b border-border/40">
                <div className="flex items-center gap-3.5">
                    <div className="clay-icon h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0 shadow-sm">
                        <Package className="h-6 w-6" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-foreground">
                                Digital Products & Deliverables
                            </h1>
                            <Badge className="clay-badge bg-primary/15 text-primary border-primary/20 text-[10px] font-bold px-2 py-0.5">
                                Category Hub
                            </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 font-medium">
                            Category-wise client tracking: Monitor project status, completion progress, and deliverables.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2.5 flex-wrap self-end sm:self-auto">
                    {canCreate('projects') && (
                        <Button 
                            onClick={() => { setEditingProduct(undefined); setIsFormOpen(true); }}
                            className="clay-btn bg-primary hover:bg-primary/95 text-white h-9 px-4 rounded-xl text-xs font-bold gap-2 shadow-md active:scale-95"
                        >
                            <Plus className="h-4 w-4" /> Add Digital Product
                        </Button>
                    )}
                </div>
            </div>

            {/* 2. Top Summary KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 w-full">
                <div className="clay-card p-4 rounded-2xl flex flex-col justify-between">
                    <div className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 whitespace-nowrap shrink-0">
                        <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse shrink-0" />
                        Active Deliveries
                    </div>
                    <div className="text-2xl font-black text-foreground mt-2 tabular-nums whitespace-nowrap">
                        {activeDeliveriesCount}
                    </div>
                    <span className="text-[11px] text-muted-foreground font-medium mt-0.5 whitespace-nowrap truncate">
                        {filteredClientProducts.length} Total in {selectedCategory === 'All Categories' ? 'All' : selectedCategory}
                    </span>
                </div>

                <div className="clay-card p-4 rounded-2xl flex flex-col justify-between">
                    <div className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5 whitespace-nowrap shrink-0">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                        Avg Completion
                    </div>
                    <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-2 tabular-nums whitespace-nowrap">
                        {avgProgress}%
                    </div>
                    <div className="w-full bg-muted/60 h-1.5 rounded-full overflow-hidden mt-1.5">
                        <div 
                            className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
                            style={{ width: `${avgProgress}%` }}
                        />
                    </div>
                </div>

                {canViewFinances ? (
                    <>
                        <div className="clay-card p-4 rounded-2xl flex flex-col justify-between">
                            <div className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 whitespace-nowrap shrink-0">
                                <DollarSign className="h-3.5 w-3.5 text-foreground shrink-0" /> Total Value
                            </div>
                            <div className="text-2xl font-black text-foreground mt-2 tabular-nums whitespace-nowrap">
                                {formatCurrency(totalAssignedValue)}
                            </div>
                            <span className="text-[11px] text-muted-foreground font-medium mt-0.5 whitespace-nowrap truncate">
                                Across selected category
                            </span>
                        </div>

                        <div className={`clay-card p-4 rounded-2xl flex flex-col justify-between ${
                            totalPendingValue === 0
                                ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200'
                                : 'bg-amber-50/40 dark:bg-amber-950/20 border-amber-200'
                        }`}>
                            <div className={`text-[11px] font-extrabold uppercase tracking-wider flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                                totalPendingValue === 0 ? 'text-emerald-700' : 'text-amber-700 dark:text-amber-300'
                            }`}>
                                <CreditCard className="h-3.5 w-3.5 shrink-0" /> Pending Balance
                            </div>
                            <div className={`text-2xl font-black mt-2 tabular-nums whitespace-nowrap ${
                                totalPendingValue === 0 ? 'text-emerald-700' : 'text-amber-700 dark:text-amber-300'
                            }`}>
                                {formatCurrency(totalPendingValue)}
                            </div>
                            <span className="text-[11px] text-muted-foreground font-medium mt-0.5 whitespace-nowrap truncate">
                                {formatCurrency(totalCollectedValue)} Collected
                            </span>
                        </div>
                    </>
                ) : (
                    <>
                        <div className="clay-card p-4 rounded-2xl flex flex-col justify-between">
                            <div className="text-[11px] font-extrabold uppercase tracking-wider text-purple-700 dark:text-purple-300 flex items-center gap-1.5 whitespace-nowrap shrink-0">
                                <Package className="h-3.5 w-3.5 text-purple-600 shrink-0" /> Catalog Offerings
                            </div>
                            <div className="text-2xl font-black text-purple-600 dark:text-purple-400 mt-2 tabular-nums whitespace-nowrap">
                                {filteredProducts.length}
                            </div>
                            <span className="text-[11px] text-muted-foreground font-medium mt-0.5 whitespace-nowrap truncate">
                                Products in this category
                            </span>
                        </div>

                        <div className="clay-card p-4 rounded-2xl flex flex-col justify-between">
                            <div className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Delivered
                            </div>
                            <div className="text-2xl font-black text-foreground mt-2 tabular-nums">
                                {completedDeliveriesCount}
                            </div>
                            <span className="text-[11px] text-muted-foreground font-medium mt-0.5">
                                Completed deliverables
                            </span>
                        </div>
                    </>
                )}
            </div>

            {/* 3. Interactive Category Selector (Clay Pill Bar) */}
            <div className="space-y-2">
                <div className="flex items-center justify-between px-1">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <Layers className="h-3.5 w-3.5 text-primary" />
                        Select Category ({allCategories.length})
                    </span>
                    <span className="text-xs text-muted-foreground font-medium">
                        Click category to filter clients & deliverables
                    </span>
                </div>

                <div className="clay-inset p-1.5 bg-muted/40 flex items-center gap-2 overflow-x-auto scrollbar-thin scrollbar-thumb-muted-foreground/20 rounded-2xl">
                    {allCategories.map(cat => {
                        const Icon = getCategoryIcon(cat)
                        const isSelected = selectedCategory === cat
                        const stats = getCategoryStats(cat)

                        return (
                            <button
                                key={cat}
                                onClick={() => setSelectedCategory(cat)}
                                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all shrink-0 cursor-pointer select-none active:scale-95 ${
                                    isSelected
                                        ? 'clay-nav-active text-white shadow-md'
                                        : 'text-foreground/80 hover:text-foreground hover:bg-card/80 hover:shadow-xs'
                                }`}
                            >
                                <Icon className={`h-4 w-4 shrink-0 ${isSelected ? 'text-white' : 'text-primary'}`} />
                                <span className="whitespace-nowrap">{cat}</span>
                                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ml-1 ${
                                    isSelected
                                        ? 'bg-white/20 text-white'
                                        : 'bg-muted text-muted-foreground'
                                }`}>
                                    {stats.clientsCount} Clients
                                </span>
                            </button>
                        )
                    })}
                </div>
            </div>

            {/* 4. Main Tabs: Category Clients & Catalog */}
            <Tabs defaultValue="clients" className="w-full space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1 border-b border-border/30">
                    <TabsList className="clay-inset p-1 bg-muted/50 rounded-xl h-auto">
                        <TabsTrigger 
                            value="clients" 
                            className="rounded-lg text-xs font-bold py-1.5 px-3.5 data-[state=active]:clay-card data-[state=active]:bg-card data-[state=active]:text-primary"
                        >
                            Clients in {selectedCategory === 'All Categories' ? 'All' : selectedCategory} ({filteredClientProducts.length})
                        </TabsTrigger>
                        {canView('projects') && (
                            <TabsTrigger 
                                value="catalog" 
                                className="rounded-lg text-xs font-bold py-1.5 px-3.5 data-[state=active]:clay-card data-[state=active]:bg-card data-[state=active]:text-primary"
                            >
                                Products Catalog ({filteredProducts.length})
                            </TabsTrigger>
                        )}
                    </TabsList>

                    {/* Secondary Filters & View Switcher */}
                    <div className="flex items-center gap-2 flex-wrap">
                        {/* Search Input */}
                        <div className="relative w-48 sm:w-60">
                            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                            <Input
                                placeholder="Search client, product..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="pl-8 text-xs h-8 bg-card rounded-xl font-medium border-border/60"
                            />
                        </div>

                        {/* Work Status Filter */}
                        <Select value={filterWorkStatus} onValueChange={setFilterWorkStatus}>
                            <SelectTrigger className="h-8 text-xs font-semibold rounded-xl w-[130px] bg-card">
                                <SelectValue placeholder="Work Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Status</SelectItem>
                                <SelectItem value="in_progress">🚀 In Progress</SelectItem>
                                <SelectItem value="review">🎯 In Review</SelectItem>
                                <SelectItem value="not_started">⏳ Not Started</SelectItem>
                                <SelectItem value="completed">✅ Completed</SelectItem>
                                <SelectItem value="on_hold">⏸️ On Hold</SelectItem>
                            </SelectContent>
                        </Select>

                        {/* Payment Filter (if financial visibility allowed) */}
                        {canViewFinances && (
                            <Select value={filterPaymentStatus} onValueChange={setFilterPaymentStatus}>
                                <SelectTrigger className="h-8 text-xs font-semibold rounded-xl w-[120px] bg-card">
                                    <SelectValue placeholder="Payment" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Payments</SelectItem>
                                    <SelectItem value="paid">💳 Paid</SelectItem>
                                    <SelectItem value="partial">⚡ Partial</SelectItem>
                                    <SelectItem value="unpaid">⚠️ Unpaid</SelectItem>
                                </SelectContent>
                            </Select>
                        )}

                        {/* View Switcher: Slim Cards vs Table */}
                        <div className="clay-inset p-1 bg-muted/40 flex items-center gap-1">
                            <button
                                onClick={() => setViewMode('cards')}
                                className={`p-1.5 rounded-lg transition-all ${
                                    viewMode === 'cards' 
                                        ? 'clay-card bg-card text-primary shadow-xs' 
                                        : 'text-muted-foreground hover:text-foreground'
                                }`}
                                title="Slim Cards View"
                            >
                                <LayoutGrid className="h-3.5 w-3.5" />
                            </button>
                            <button
                                onClick={() => setViewMode('table')}
                                className={`p-1.5 rounded-lg transition-all ${
                                    viewMode === 'table' 
                                        ? 'clay-card bg-card text-primary shadow-xs' 
                                        : 'text-muted-foreground hover:text-foreground'
                                }`}
                                title="Slim Table View"
                            >
                                <TableIcon className="h-3.5 w-3.5" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* ── 4A. CATEGORY CLIENTS TAB ────────────────────────────────────────── */}
                <TabsContent value="clients" className="space-y-4">
                    {isCPLoading ? (
                        <div className="text-center py-16 text-muted-foreground animate-pulse">
                            <Activity className="h-8 w-8 mx-auto mb-2 opacity-50 animate-spin text-primary" />
                            Loading category clients and deliverable statuses...
                        </div>
                    ) : filteredClientProducts.length === 0 ? (
                        <Card className="p-12 text-center text-muted-foreground">
                            <Package className="h-10 w-10 mx-auto mb-3 opacity-30 text-primary" />
                            <h4 className="font-extrabold text-base text-foreground">
                                No clients found in {selectedCategory}
                            </h4>
                            <p className="text-xs mt-1 max-w-md mx-auto">
                                No clients are currently assigned to digital products in this category. You can assign products to clients directly from their Client Profile or add a new product.
                            </p>
                        </Card>
                    ) : viewMode === 'cards' ? (
                        /* ── SLIM CLAY CARDS VIEW (EXECUTIVE SLIM UI) ───────────── */
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                            {filteredClientProducts.map((cp) => {
                                const client: any = cp.client
                                const prod: any = cp.product
                                const cpId = cp.id || (cp as any)._id
                                const customPrice = Number(cp.customPrice) || 0
                                const paidAmount = Number(cp.paidAmount) || 0
                                const pendingAmount = Math.max(0, customPrice - paidAmount)
                                const tasks = cp.tasks || []
                                const completedTasks = tasks.filter(t => t.status === 'completed')
                                const progressPercent = cp.progress !== undefined ? cp.progress : (
                                    tasks.length > 0 ? Math.round((completedTasks.length / tasks.length) * 100) : 0
                                )

                                // Due Date Countdown helper
                                let dueText = 'No deadline'
                                let dueBadgeColor = 'bg-muted text-muted-foreground border-border/50'
                                if (cp.dueDate) {
                                    const diffDays = Math.ceil((new Date(cp.dueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
                                    if (cp.workStatus === 'completed') {
                                        dueText = 'Delivered'
                                        dueBadgeColor = 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300'
                                    } else if (diffDays < 0) {
                                        dueText = `Overdue ${Math.abs(diffDays)}d`
                                        dueBadgeColor = 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-300'
                                    } else if (diffDays === 0) {
                                        dueText = 'Due Today'
                                        dueBadgeColor = 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300'
                                    } else {
                                        dueText = `${diffDays}d left`
                                        dueBadgeColor = 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-300'
                                    }
                                }

                                // Status badge configuration
                                const getStatusConfig = () => {
                                    switch (cp.workStatus) {
                                        case 'completed':
                                            return {
                                                label: 'Completed',
                                                pillBg: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-400/60',
                                                dot: 'bg-emerald-500'
                                            }
                                        case 'in_progress':
                                            return {
                                                label: 'In Progress',
                                                pillBg: 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-400/60',
                                                dot: 'bg-blue-500 animate-pulse'
                                            }
                                        case 'review':
                                            return {
                                                label: 'Review / QA',
                                                pillBg: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-400/60',
                                                dot: 'bg-amber-500 animate-bounce'
                                            }
                                        case 'on_hold':
                                            return {
                                                label: 'On Hold',
                                                pillBg: 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-400/60',
                                                dot: 'bg-rose-500'
                                            }
                                        default:
                                            return {
                                                label: 'Not Started',
                                                pillBg: 'bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-400 border-slate-300',
                                                dot: 'bg-slate-400'
                                            }
                                    }
                                }

                                const statusCfg = getStatusConfig()

                                return (
                                    <div 
                                        key={cpId} 
                                        className="clay-card p-4 sm:p-4.5 rounded-2xl flex flex-col justify-between space-y-3.5 hover:shadow-lg transition-all"
                                    >
                                        {/* 1. TOP STATUS STRIP: Shows where project is at & completion */}
                                        <div className="space-y-2 pb-2.5 border-b border-border/40">
                                            <div className="flex items-center justify-between gap-2">
                                                <div className={`clay-badge px-2.5 py-0.5 text-[11px] font-extrabold flex items-center gap-1.5 ${statusCfg.pillBg}`}>
                                                    <span className={`h-2 w-2 rounded-full ${statusCfg.dot}`} />
                                                    <span>{statusCfg.label}</span>
                                                </div>

                                                <span className={`clay-badge text-[10px] font-bold px-2 py-0.5 border ${dueBadgeColor}`}>
                                                    <Clock className="h-3 w-3 inline mr-1" />
                                                    {dueText}
                                                </span>
                                            </div>

                                            {/* Live Completion Progress Bar */}
                                            <div className="space-y-1">
                                                <div className="flex justify-between items-center text-xs font-bold">
                                                    <span className="text-muted-foreground flex items-center gap-1">
                                                        <Activity className="h-3 w-3 text-primary" /> Delivery Progress
                                                    </span>
                                                    <span className="text-primary font-extrabold tabular-nums">
                                                        {progressPercent}% Complete
                                                    </span>
                                                </div>
                                                <div className="w-full bg-muted/60 h-2 rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full rounded-full transition-all duration-500 ${
                                                            cp.workStatus === 'completed'
                                                                ? 'bg-emerald-500'
                                                                : cp.workStatus === 'review'
                                                                ? 'bg-amber-500'
                                                                : 'bg-primary'
                                                        }`}
                                                        style={{ width: `${progressPercent}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* 2. CLIENT & PRODUCT PROFILE */}
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className="clay-icon h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-extrabold text-xs shrink-0">
                                                    {client ? getInitials(client.name) : 'C'}
                                                </div>
                                                <div className="min-w-0">
                                                    <h4 className="font-extrabold text-sm text-foreground truncate leading-snug">
                                                        {client ? (
                                                            <Link 
                                                                to={`/clients/${client._id || client.id}`} 
                                                                className="hover:text-primary transition-colors hover:underline"
                                                            >
                                                                {client.name}
                                                            </Link>
                                                        ) : 'Unknown Client'}
                                                    </h4>
                                                    <p className="text-[11px] text-muted-foreground font-semibold truncate mt-0.5">
                                                        {client?.company || 'Direct Client'}
                                                    </p>
                                                </div>
                                            </div>

                                            <Badge className="clay-badge bg-primary/10 text-primary border-primary/20 text-[10px] font-bold px-2 py-0.5 shrink-0">
                                                {prod?.category || 'Digital'}
                                            </Badge>
                                        </div>

                                        {/* Product Offering Title */}
                                        <div className="bg-muted/30 p-2.5 rounded-xl space-y-1">
                                            <div className="text-xs font-extrabold text-foreground flex items-center gap-1.5">
                                                <Package className="h-3.5 w-3.5 text-primary" />
                                                <span>{prod?.name || 'Digital Product'}</span>
                                            </div>
                                            {cp.customizations ? (
                                                <p className="text-[11px] text-muted-foreground line-clamp-1 italic">
                                                    "{cp.customizations}"
                                                </p>
                                            ) : (
                                                <p className="text-[11px] text-muted-foreground">
                                                    Standard deliverable package
                                                </p>
                                            )}
                                        </div>

                                        {/* Deliverables Tasks summary & Project link */}
                                        <div className="flex items-center justify-between text-xs font-semibold pt-1 text-muted-foreground border-t border-border/30">
                                            <span className="flex items-center gap-1">
                                                <CheckSquare className="h-3.5 w-3.5 text-emerald-600" />
                                                <span>{completedTasks.length}/{tasks.length} Deliverables Done</span>
                                            </span>

                                            {cp.projectId && (
                                                <Link 
                                                    to={`/projects/${cp.projectId}`}
                                                    className="text-[11px] font-bold text-primary hover:underline flex items-center gap-1"
                                                >
                                                    <Briefcase className="h-3 w-3" /> Board <ArrowUpRight className="h-3 w-3" />
                                                </Link>
                                            )}
                                        </div>

                                        {/* 3. COMMERCIALS STRIP (IF ALLOWED) */}
                                        {canViewFinances && (
                                            <div className="clay-inset p-2 bg-muted/30 grid grid-cols-3 gap-2 text-center rounded-xl text-xs">
                                                <div>
                                                    <span className="text-[10px] text-muted-foreground block uppercase font-bold">Deal Price</span>
                                                    <span className="font-extrabold text-foreground">{formatCurrency(customPrice)}</span>
                                                </div>
                                                <div>
                                                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block uppercase font-bold">Paid</span>
                                                    <span className="font-extrabold text-emerald-600 dark:text-emerald-400">{formatCurrency(paidAmount)}</span>
                                                </div>
                                                <div>
                                                    <span className={`text-[10px] block uppercase font-bold ${pendingAmount === 0 ? 'text-emerald-600' : 'text-rose-600 dark:text-rose-400'}`}>Due</span>
                                                    <span className={`font-extrabold ${pendingAmount === 0 ? 'text-emerald-600' : 'text-rose-600 dark:text-rose-400'}`}>
                                                        {formatCurrency(pendingAmount)}
                                                    </span>
                                                </div>
                                            </div>
                                        )}

                                        {/* 4. ACTIONS ROW */}
                                        <div className="flex items-center gap-2 pt-1 border-t border-border/30">
                                            <Button
                                                size="sm"
                                                onClick={() => openManager(cp)}
                                                className="flex-1 clay-btn bg-primary hover:bg-primary/95 text-white h-8.5 rounded-xl text-xs font-extrabold gap-1.5 shadow-sm active:scale-95"
                                            >
                                                <Sparkles className="h-3.5 w-3.5 text-amber-300" /> Track & Manage
                                            </Button>

                                            {canEdit('projects') && (
                                                <button
                                                    onClick={() => { setEditingGlobalCP(cp); setIsGlobalProductDialogOpen(true); }}
                                                    className="clay-btn h-8.5 w-8.5 rounded-xl bg-card hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-all shrink-0 active:scale-95"
                                                    title="Edit configuration"
                                                >
                                                    <Edit className="h-3.5 w-3.5" />
                                                </button>
                                            )}

                                            {canDelete('projects') && (
                                                <button
                                                    onClick={() => handleDeleteCP(cpId)}
                                                    className="clay-btn h-8.5 w-8.5 rounded-xl bg-card hover:bg-rose-500 hover:text-white text-destructive flex items-center justify-center transition-all shrink-0 active:scale-95"
                                                    title="Delete assignment"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    ) : (
                        /* ── SLIM TABLE VIEW ────────────────────────────────────── */
                        <Card className="p-0 overflow-hidden">
                            <Table>
                                <TableHeader className="bg-muted/40">
                                    <TableRow>
                                        <TableHead className="text-xs font-extrabold">Client</TableHead>
                                        <TableHead className="text-xs font-extrabold">Product & Category</TableHead>
                                        <TableHead className="text-xs font-extrabold">Status & Completion</TableHead>
                                        <TableHead className="text-xs font-extrabold">Timeline</TableHead>
                                        <TableHead className="text-xs font-extrabold">Deliverables</TableHead>
                                        {canViewFinances && (
                                            <TableHead className="text-xs font-extrabold">Commercials</TableHead>
                                        )}
                                        <TableHead className="text-right text-xs font-extrabold">Actions</TableHead>
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
                                        const progressPercent = cp.progress !== undefined ? cp.progress : (
                                            tasks.length > 0 ? Math.round((completedTasks.length / tasks.length) * 100) : 0
                                        )

                                        return (
                                            <TableRow key={cpId} className="hover:bg-muted/30">
                                                <TableCell>
                                                    {client ? (
                                                        <Link to={`/clients/${client._id || client.id}`} className="font-extrabold text-primary hover:underline block text-xs">
                                                            {client.name}
                                                            {client.company && <span className="text-[11px] text-muted-foreground font-normal block">{client.company}</span>}
                                                        </Link>
                                                    ) : 'Unknown Client'}
                                                </TableCell>

                                                <TableCell>
                                                    <div className="font-extrabold text-xs text-foreground">{prod?.name || 'Unknown'}</div>
                                                    <Badge className="clay-badge text-[9px] font-bold px-1.5 py-0 mt-0.5">
                                                        {prod?.category || 'General'}
                                                    </Badge>
                                                </TableCell>

                                                <TableCell>
                                                    <div className="space-y-1 min-w-[140px]">
                                                        <div className="flex items-center justify-between text-[11px] font-bold">
                                                            <span className="capitalize">{cp.workStatus?.replace('_', ' ') || 'Not Started'}</span>
                                                            <span className="text-primary font-extrabold">{progressPercent}%</span>
                                                        </div>
                                                        <Progress value={progressPercent} className="h-1.5 rounded-full" />
                                                    </div>
                                                </TableCell>

                                                <TableCell>
                                                    <div className="text-[11px] font-medium text-muted-foreground space-y-0.5">
                                                        <div>Due: {cp.dueDate ? new Date(cp.dueDate).toLocaleDateString() : 'No date'}</div>
                                                    </div>
                                                </TableCell>

                                                <TableCell>
                                                    <span className="text-xs font-semibold text-muted-foreground">
                                                        {completedTasks.length}/{tasks.length} tasks
                                                    </span>
                                                </TableCell>

                                                {canViewFinances && (
                                                    <TableCell>
                                                        <div className="text-xs space-y-0.5">
                                                            <div className="font-extrabold text-foreground">{formatCurrency(customPrice)}</div>
                                                            <div className="text-[10px] text-emerald-600 font-semibold">Paid: {formatCurrency(paidAmount)}</div>
                                                        </div>
                                                    </TableCell>
                                                )}

                                                <TableCell className="text-right space-x-1.5">
                                                    <Button
                                                        size="sm"
                                                        className="text-xs h-7.5 px-2.5 clay-btn bg-primary text-white font-bold"
                                                        onClick={() => openManager(cp)}
                                                    >
                                                        <Sparkles className="h-3 w-3 mr-1 text-amber-300" /> Manage
                                                    </Button>
                                                    {canEdit('projects') && (
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="text-xs h-7.5 px-2"
                                                            onClick={() => { setEditingGlobalCP(cp); setIsGlobalProductDialogOpen(true); }}
                                                        >
                                                            <Edit className="h-3 w-3" />
                                                        </Button>
                                                    )}
                                                    {canDelete('projects') && (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="text-xs h-7.5 px-2 text-destructive hover:bg-destructive/10"
                                                            onClick={() => handleDeleteCP(cpId)}
                                                        >
                                                            <Trash2 className="h-3 w-3" />
                                                        </Button>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        )
                                    })}
                                </TableBody>
                            </Table>
                        </Card>
                    )}
                </TabsContent>

                {/* ── 4B. PRODUCT CATALOG TAB ────────────────────────────────────────── */}
                {canView('projects') && (
                    <TabsContent value="catalog" className="space-y-4">
                        <div className="flex items-center justify-between px-1">
                            <div>
                                <h3 className="text-sm font-extrabold uppercase tracking-wider text-foreground">
                                    Catalog Offerings ({filteredProducts.length})
                                </h3>
                                <p className="text-xs text-muted-foreground font-medium">
                                    {selectedCategory === 'All Categories' ? 'All digital products in catalog' : `Products filtered by ${selectedCategory}`}
                                </p>
                            </div>
                        </div>

                        {isLoading ? (
                            <div className="text-center py-12 text-muted-foreground animate-pulse">Loading catalog...</div>
                        ) : filteredProducts.length === 0 ? (
                            <Card className="p-10 text-center text-muted-foreground">
                                <Package className="h-10 w-10 mx-auto mb-2 opacity-30 text-primary" />
                                <p className="font-extrabold text-foreground">No digital products in {selectedCategory}.</p>
                                <p className="text-xs mt-1">Click "Add Digital Product" above to create an offering in this category.</p>
                            </Card>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {filteredProducts.map(product => (
                                    <div 
                                        key={product.id} 
                                        className="clay-card p-4 sm:p-5 rounded-2xl flex flex-col justify-between space-y-3 hover:shadow-md transition-all"
                                    >
                                        <div className="space-y-2">
                                            <div className="flex items-start justify-between gap-2">
                                                <div>
                                                    <h4 className="font-extrabold text-base text-foreground line-clamp-1" title={product.name}>
                                                        {product.name}
                                                    </h4>
                                                    <Badge className="clay-badge text-[10px] font-bold px-2 py-0.5 mt-1 bg-primary/10 text-primary border-primary/20">
                                                        {product.category || 'General'}
                                                    </Badge>
                                                </div>
                                                <div className="font-black text-base text-emerald-600 dark:text-emerald-400 shrink-0">
                                                    {formatCurrency(product.basePrice)}
                                                </div>
                                            </div>

                                            <p className="text-xs text-muted-foreground line-clamp-2 font-medium">
                                                {product.description || 'No description provided.'}
                                            </p>

                                            {product.features && product.features.length > 0 && (
                                                <div className="space-y-1 pt-1">
                                                    <span className="text-[10px] font-extrabold uppercase text-muted-foreground">Included Deliverables:</span>
                                                    <ul className="text-xs text-foreground/80 space-y-0.5">
                                                        {product.features.slice(0, 3).map((f, i) => (
                                                            <li key={i} className="flex items-center gap-1.5 truncate">
                                                                <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                                                                <span className="truncate">{f}</span>
                                                            </li>
                                                        ))}
                                                        {product.features.length > 3 && (
                                                            <li className="text-[11px] text-primary font-bold">
                                                                +{product.features.length - 3} more items
                                                            </li>
                                                        )}
                                                    </ul>
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-2 pt-2 border-t border-border/30">
                                            <Button 
                                                variant="outline" 
                                                size="sm" 
                                                className="flex-1 h-8 rounded-xl text-xs font-bold clay-card" 
                                                onClick={() => { setEditingProduct(product); setIsFormOpen(true); }}
                                            >
                                                <Edit className="h-3 w-3 mr-1" /> Edit Product
                                            </Button>
                                            <Button 
                                                variant="ghost" 
                                                size="sm" 
                                                className="h-8 px-2.5 rounded-xl text-xs text-destructive hover:bg-destructive/10" 
                                                onClick={() => handleDelete(product.id)}
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </TabsContent>
                )}
            </Tabs>

            {/* ── DIALOGS ──────────────────────────────────────────────────────────── */}
            {/* Catalog Add/Edit Product Dialog */}
            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>{editingProduct ? 'Edit Product Offering' : 'Add Digital Product'}</DialogTitle>
                        <DialogDescription>
                            {editingProduct ? 'Update product details and category classification.' : 'Create a new digital product and assign it to a category.'}
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
