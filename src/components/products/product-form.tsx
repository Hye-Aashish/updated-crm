import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, X } from 'lucide-react'
import api from '@/lib/api-client'
import { useToast } from '@/hooks/use-toast'
import type { Product } from '@/types'

interface ProductFormProps {
    initialData?: Product
    onSuccess: () => void
    onCancel: () => void
}

export function ProductForm({ initialData, onSuccess, onCancel }: ProductFormProps) {
    const { toast } = useToast()
    const [isLoading, setIsLoading] = useState(false)
    const [formData, setFormData] = useState({
        name: initialData?.name || '',
        description: initialData?.description || '',
        basePrice: initialData?.basePrice || 0,
        status: initialData?.status || 'active',
        features: initialData?.features || []
    })
    const [newFeature, setNewFeature] = useState('')

    const handleAddFeature = () => {
        if (!newFeature.trim()) return
        setFormData(prev => ({
            ...prev,
            features: [...prev.features, newFeature.trim()]
        }))
        setNewFeature('')
    }

    const handleRemoveFeature = (index: number) => {
        setFormData(prev => ({
            ...prev,
            features: prev.features.filter((_, i) => i !== index)
        }))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!formData.name) {
            toast({ variant: 'destructive', title: 'Validation Error', description: 'Product name is required' })
            return
        }

        setIsLoading(true)
        try {
            if (initialData?.id) {
                await api.put(`/products/${initialData.id}`, formData)
                toast({ title: 'Success', description: 'Product updated successfully' })
            } else {
                await api.post('/products', formData)
                toast({ title: 'Success', description: 'Product created successfully' })
            }
            onSuccess()
        } catch (error: any) {
            const msg = error.response?.data?.message || 'An error occurred'
            toast({ variant: 'destructive', title: 'Error', description: msg })
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="name">Product Name <span className="text-destructive">*</span></Label>
                <Input 
                    id="name" 
                    value={formData.name} 
                    onChange={e => setFormData({ ...formData, name: e.target.value })} 
                    placeholder="e.g. CRM Software, SEO Package"
                />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="basePrice">Base Price (₹)</Label>
                    <Input 
                        id="basePrice" 
                        type="number" 
                        min="0"
                        value={formData.basePrice} 
                        onChange={e => setFormData({ ...formData, basePrice: Number(e.target.value) })} 
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Select value={formData.status} onValueChange={(v: any) => setFormData({ ...formData, status: v })}>
                        <SelectTrigger id="status">
                            <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="inactive">Inactive</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea 
                    id="description" 
                    value={formData.description} 
                    onChange={e => setFormData({ ...formData, description: e.target.value })} 
                    placeholder="Brief description of the product"
                    rows={3}
                />
            </div>

            <div className="space-y-2">
                <Label>Features</Label>
                <div className="flex gap-2">
                    <Input 
                        value={newFeature} 
                        onChange={e => setNewFeature(e.target.value)} 
                        placeholder="Add a feature..."
                        onKeyDown={e => {
                            if (e.key === 'Enter') {
                                e.preventDefault()
                                handleAddFeature()
                            }
                        }}
                    />
                    <Button type="button" onClick={handleAddFeature} variant="secondary">
                        <Plus className="h-4 w-4" />
                    </Button>
                </div>
                <div className="mt-2 space-y-2 max-h-[150px] overflow-y-auto">
                    {formData.features.map((feature, i) => (
                        <div key={i} className="flex items-center justify-between bg-muted/50 p-2 rounded-md text-sm">
                            <span>{feature}</span>
                            <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleRemoveFeature(i)}>
                                <X className="h-4 w-4 text-muted-foreground" />
                            </Button>
                        </div>
                    ))}
                </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>Cancel</Button>
                <Button type="submit" disabled={isLoading}>
                    {isLoading ? 'Saving...' : (initialData ? 'Update Product' : 'Create Product')}
                </Button>
            </div>
        </form>
    )
}
