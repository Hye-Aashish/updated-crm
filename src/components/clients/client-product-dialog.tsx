import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAppStore } from '@/store'
import api from '@/lib/api-client'
import { useToast } from '@/hooks/use-toast'
import { Plus, Trash2, Calendar, DollarSign, User as UserIcon, ListTodo } from 'lucide-react'
import type { ClientProduct } from '@/types'

interface ClientProductDialogProps {
    clientId: string
    initialData?: ClientProduct
    onSuccess: () => void
    onCancel: () => void
}

interface NewTaskItem {
    title: string
    dueDate?: string
}

export function ClientProductForm({ clientId, initialData, onSuccess, onCancel }: ClientProductDialogProps) {
    const { products, setProducts, users, setUsers } = useAppStore()
    const { toast } = useToast()
    const [isLoading, setIsLoading] = useState(false)

    // Form fields
    const [productId, setProductId] = useState<string>(() => {
        if (!initialData?.product) return ''
        if (typeof initialData.product === 'object') {
            return (initialData.product as any).id || (initialData.product as any)._id || ''
        }
        return String(initialData.product)
    })
    const [customPrice, setCustomPrice] = useState<number>(initialData?.customPrice || 0)
    const [paidAmount, setPaidAmount] = useState<number>(initialData?.paidAmount || 0)
    const [workStatus, setWorkStatus] = useState<string>(initialData?.workStatus || 'not_started')
    const [progress, setProgress] = useState<number>(initialData?.progress || 0)
    const [startDate, setStartDate] = useState<string>(
        initialData?.startDate
            ? new Date(initialData.startDate).toISOString().split('T')[0]
            : new Date().toISOString().split('T')[0]
    )
    const [dueDate, setDueDate] = useState<string>(
        initialData?.dueDate
            ? new Date(initialData.dueDate).toISOString().split('T')[0]
            : ''
    )
    const [assignedTo, setAssignedTo] = useState<string[]>(
        initialData?.assignedTo?.map((u: any) => u._id || u.id || u) || []
    )
    const [customizations, setCustomizations] = useState<string>(initialData?.customizations || '')
    const [status] = useState<string>(initialData?.status || 'active')

    // Initial tasks builder when creating new
    const [initialTasks, setInitialTasks] = useState<NewTaskItem[]>([])
    const [newTaskTitle, setNewTaskTitle] = useState('')

    useEffect(() => {
        if (products.length === 0) {
            api.get('/products').then(res => {
                setProducts(res.data.map((p: any) => ({ ...p, id: p._id })))
            }).catch(err => console.error("Failed to load products", err))
        }
        if (users.length === 0) {
            api.get('/users').then(res => {
                setUsers(res.data.map((u: any) => ({ ...u, id: u._id })))
            }).catch(err => console.error("Failed to load users", err))
        }
    }, [])

    const handleProductSelect = (pid: string) => {
        const prod = products.find(p => p.id === pid || p._id === pid)
        setProductId(pid)
        if (prod && !initialData) {
            setCustomPrice(prod.basePrice || 0)
            if (prod.features && prod.features.length > 0 && initialTasks.length === 0) {
                setInitialTasks(prod.features.map(f => ({ title: f })))
            }
        }
    }

    const handleAddInitialTask = () => {
        if (!newTaskTitle.trim()) return
        setInitialTasks([...initialTasks, { title: newTaskTitle.trim() }])
        setNewTaskTitle('')
    }

    const handleRemoveInitialTask = (index: number) => {
        setInitialTasks(initialTasks.filter((_, i) => i !== index))
    }

    const toggleAssignedUser = (userId: string) => {
        if (assignedTo.includes(userId)) {
            setAssignedTo(assignedTo.filter(id => id !== userId))
        } else {
            setAssignedTo([...assignedTo, userId])
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!productId) {
            toast({ variant: 'destructive', title: 'Validation Error', description: 'Please select a digital product' })
            return
        }

        setIsLoading(true)
        try {
            const payload: any = {
                productId,
                customPrice: Number(customPrice) || 0,
                paidAmount: Number(paidAmount) || 0,
                workStatus,
                progress: Number(progress) || 0,
                startDate: startDate || new Date().toISOString(),
                dueDate: dueDate || undefined,
                assignedTo,
                customizations,
                status
            }

            if (!initialData && initialTasks.length > 0) {
                payload.tasks = initialTasks.map(t => ({
                    title: t.title,
                    status: 'pending',
                    dueDate: t.dueDate || dueDate || undefined
                }))
            }

            const id = initialData?.id || initialData?._id
            if (id) {
                await api.put(`/client-products/${id}`, payload)
                toast({ title: 'Success', description: 'Assigned product updated successfully' })
            } else {
                await api.post(`/client-products/client/${clientId}`, payload)
                toast({ title: 'Success', description: 'Digital product assigned to client' })
            }
            onSuccess()
        } catch (error: any) {
            const msg = error.response?.data?.message || 'An error occurred'
            toast({ variant: 'destructive', title: 'Error', description: msg })
        } finally {
            setIsLoading(false)
        }
    }

    const pendingBalance = Math.max(0, (customPrice || 0) - (paidAmount || 0))

    return (
        <form onSubmit={handleSubmit} className="space-y-5 max-h-[75vh] overflow-y-auto pr-2">
            {!initialData && (
                <div className="space-y-2">
                    <Label htmlFor="productId" className="font-semibold text-sm">
                        Select Digital Product <span className="text-destructive">*</span>
                    </Label>
                    <Select value={productId} onValueChange={handleProductSelect}>
                        <SelectTrigger id="productId" className="h-11">
                            <SelectValue placeholder="Choose product from catalog" />
                        </SelectTrigger>
                        <SelectContent>
                            {products.filter(p => p.status === 'active').map(p => (
                                <SelectItem key={p.id || p._id} value={p.id || p._id as string}>
                                    <div className="flex items-center justify-between w-full gap-4">
                                        <span>{p.name}</span>
                                        <span className="text-muted-foreground text-xs font-mono">₹{(p.basePrice || 0).toLocaleString('en-IN')}</span>
                                    </div>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            )}

            {/* Timeline: Start Date & Due Date */}
            <div className="p-3.5 bg-muted/40 rounded-xl border space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <Calendar className="h-4 w-4 text-blue-500" />
                    Timeline & Delivery Dates
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                        <Label htmlFor="startDate" className="text-xs text-muted-foreground">Start Date</Label>
                        <Input
                            id="startDate"
                            type="date"
                            value={startDate}
                            onChange={e => setStartDate(e.target.value)}
                        />
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="dueDate" className="text-xs text-muted-foreground">Due / Delivery Date</Label>
                        <Input
                            id="dueDate"
                            type="date"
                            value={dueDate}
                            onChange={e => setDueDate(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {/* Pricing & Payments */}
            <div className="p-3.5 bg-muted/40 rounded-xl border space-y-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                        <DollarSign className="h-4 w-4 text-emerald-500" />
                        Commercials & Payments
                    </div>
                    {customPrice > 0 && (
                        <div className="text-xs font-medium">
                            Pending Balance: <span className="font-bold text-amber-600 dark:text-amber-400">₹{pendingBalance.toLocaleString('en-IN')}</span>
                        </div>
                    )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                        <Label htmlFor="customPrice" className="text-xs text-muted-foreground">Total Deal Price (₹)</Label>
                        <Input
                            id="customPrice"
                            type="number"
                            min="0"
                            value={customPrice}
                            onChange={e => setCustomPrice(Number(e.target.value))}
                            placeholder="0"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="paidAmount" className="text-xs text-muted-foreground">
                            {initialData ? 'Total Paid so far (₹)' : 'Advance / Paid Amount (₹)'}
                        </Label>
                        <Input
                            id="paidAmount"
                            type="number"
                            min="0"
                            value={paidAmount}
                            onChange={e => setPaidAmount(Number(e.target.value))}
                            placeholder="0"
                        />
                    </div>
                </div>
            </div>

            {/* Work Status & Progress */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="workStatus" className="text-sm font-medium">Work Status</Label>
                    <Select value={workStatus} onValueChange={setWorkStatus}>
                        <SelectTrigger id="workStatus">
                            <SelectValue placeholder="Select work status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="not_started">⏳ Not Started (शुरू नहीं हुआ)</SelectItem>
                            <SelectItem value="in_progress">⚙️ In Progress (काम चालू है)</SelectItem>
                            <SelectItem value="review">🔍 Review / Testing (जांच में है)</SelectItem>
                            <SelectItem value="completed">✅ Completed (पूर्ण हो गया)</SelectItem>
                            <SelectItem value="on_hold">⏸️ On Hold (रुका हुआ)</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <div className="flex justify-between items-center">
                        <Label htmlFor="progress" className="text-sm font-medium">Progress ({progress}%)</Label>
                    </div>
                    <div className="flex items-center gap-3">
                        <input
                            id="progress"
                            type="range"
                            min="0"
                            max="100"
                            step="5"
                            value={progress}
                            onChange={e => setProgress(Number(e.target.value))}
                            className="w-full accent-primary h-2 bg-muted rounded-lg cursor-pointer"
                        />
                        <Input
                            type="number"
                            min="0"
                            max="100"
                            value={progress}
                            onChange={e => setProgress(Math.min(100, Math.max(0, Number(e.target.value))))}
                            className="w-20 text-center font-mono"
                        />
                    </div>
                </div>
            </div>

            {/* Assign Team Members */}
            <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-1.5">
                    <UserIcon className="h-4 w-4 text-primary" />
                    Assign Team Members
                </Label>
                <div className="flex flex-wrap gap-1.5 p-2 bg-muted/30 rounded-lg border min-h-[42px] max-h-28 overflow-y-auto">
                    {users.filter(u => u.role !== 'client').map(u => {
                        const isSelected = assignedTo.includes(u.id || (u as any)._id)
                        return (
                            <button
                                key={u.id || (u as any)._id}
                                type="button"
                                onClick={() => toggleAssignedUser(u.id || (u as any)._id)}
                                className={`text-xs px-2.5 py-1 rounded-full border transition-all ${
                                    isSelected
                                        ? 'bg-primary text-primary-foreground border-primary font-medium shadow-xs'
                                        : 'bg-background hover:bg-muted text-muted-foreground'
                                }`}
                            >
                                {u.name} ({u.role})
                            </button>
                        )
                    })}
                </div>
            </div>

            {/* Initial Tasks / Checklist when creating new */}
            {!initialData && (
                <div className="p-3.5 bg-muted/40 rounded-xl border space-y-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                            <ListTodo className="h-4 w-4 text-purple-500" />
                            Deliverable Tasks & Milestones
                        </div>
                        <span className="text-xs text-muted-foreground">{initialTasks.length} tasks</span>
                    </div>

                    <div className="flex gap-2">
                        <Input
                            placeholder="Add task/deliverable (e.g. Domain Setup, UI Design, Deployment)..."
                            value={newTaskTitle}
                            onChange={e => setNewTaskTitle(e.target.value)}
                            onKeyDown={e => {
                                if (e.key === 'Enter') {
                                    e.preventDefault()
                                    handleAddInitialTask()
                                }
                            }}
                            className="text-xs"
                        />
                        <Button type="button" size="sm" onClick={handleAddInitialTask} variant="secondary">
                            <Plus className="h-4 w-4 mr-1" /> Add
                        </Button>
                    </div>

                    {initialTasks.length > 0 && (
                        <div className="space-y-1.5 max-h-36 overflow-y-auto pt-1">
                            {initialTasks.map((t, idx) => (
                                <div key={idx} className="flex items-center justify-between text-xs bg-background p-2 rounded-md border group">
                                    <span className="font-medium truncate flex-1">{idx + 1}. {t.title}</span>
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveInitialTask(idx)}
                                        className="text-muted-foreground hover:text-destructive p-1"
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Customizations & Notes */}
            <div className="space-y-2">
                <Label htmlFor="customizations" className="text-sm font-medium">Customizations & Requirements</Label>
                <Textarea
                    id="customizations"
                    value={customizations}
                    onChange={e => setCustomizations(e.target.value)}
                    placeholder="Specify modules, credentials, design preferences, or client requirements..."
                    rows={3}
                />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t">
                <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>Cancel</Button>
                <Button type="submit" disabled={isLoading} className="shadow-md">
                    {isLoading ? 'Saving...' : (initialData ? 'Update Digital Product' : 'Assign & Start Tracking')}
                </Button>
            </div>
        </form>
    )
}
