import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '@/store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { ChevronLeft, Info, Plus, Trash2, Flag, Calendar, DollarSign } from 'lucide-react'
import type { ProjectStatus, ProjectType, PaymentModel } from '@/types'
import api from '@/lib/api-client'
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"

import { mapProject, mapClient } from '@/lib/mappers'
import { getCurrencySymbol, formatCurrency } from '@/lib/utils'

export function NewProjectPage() {
    const navigate = useNavigate()
    const { toast } = useToast()
    const addProject = useAppStore((state) => state.addProject)
    const setClients = useAppStore((state) => state.setClients)
    const clients = useAppStore((state) => state.clients)
    const currentUser = useAppStore((state) => state.currentUser)
    const [loading, setLoading] = useState(false)

    // Fetch if missing
    useEffect(() => {
        if (clients.length === 0) {
            api.get('/clients').then(res => {
                setClients(res.data.map(mapClient))
            }).catch(console.error)
        }
    }, [clients.length, setClients])

    const [formData, setFormData] = useState({
        name: '',
        description: '',
        clientId: '',
        status: 'planning' as ProjectStatus,
        deadline: '',
        budget: '',
        type: 'web-development' as ProjectType,
        paymentModel: 'milestone' as PaymentModel,
        autoInvoice: false,
    })

    const [milestones, setMilestones] = useState<Array<{ name: string; dueDate: string; amount: string; description?: string }>>([])

    const addMilestoneRow = () => {
        setMilestones(prev => [
            ...prev,
            {
                name: `Milestone ${prev.length + 1}: `,
                dueDate: formData.deadline || '',
                amount: '',
                description: ''
            }
        ])
    }

    const updateMilestoneRow = (index: number, field: string, value: string) => {
        setMilestones(prev => {
            const copy = [...prev]
            copy[index] = { ...copy[index], [field]: value }
            return copy
        })
    }

    const removeMilestoneRow = (index: number) => {
        setMilestones(prev => prev.filter((_, i) => i !== index))
    }

    const totalMilestoneSum = milestones.reduce((sum, m) => sum + (parseFloat(m.amount) || 0), 0)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            // Send data to Backend API
            const response = await api.post('/projects', {
                ...formData,
                dueDate: formData.deadline,
                pmId: currentUser.id, // Set current user as PM by default
                milestones: milestones.map(m => ({
                    name: m.name,
                    dueDate: m.dueDate ? new Date(m.dueDate) : undefined,
                    amount: parseFloat(m.amount) || 0,
                    description: m.description,
                    completed: false,
                    status: 'pending'
                }))
            })

            const savedProject = mapProject(response.data)

            addProject(savedProject)

            toast({
                title: "Project created",
                description: `${formData.name} has been initiated successfully.`,
            })

            navigate('/projects')
        } catch (error) {
            console.error(error)
            toast({
                title: "Error",
                description: "Failed to create project.",
                variant: "destructive"
            })
        } finally {
            setLoading(false)
        }
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target
        setFormData((prev) => ({ ...prev, [name]: value }))
    }

    return (
        <div className="space-y-6 max-w-2xl mx-auto">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => navigate('/projects')}>
                    <ChevronLeft className="h-4 w-4" />
                </Button>
                <div>
                    <h1 className="text-3xl font-bold">New Project</h1>
                    <p className="text-muted-foreground">Start a new project for a client</p>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Project Details</CardTitle>
                    <CardDescription>Define the scope and timeline of the project</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="name">Project Name</Label>
                            <Input
                                id="name"
                                name="name"
                                placeholder="e.g. Corporate Website Redesign"
                                required
                                value={formData.name}
                                onChange={handleChange}
                            />
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="clientId">Client</Label>
                                <Select
                                    value={formData.clientId}
                                    onValueChange={(value) => setFormData(prev => ({ ...prev, clientId: value }))}
                                    required
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a client" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {clients.map(client => (
                                            <SelectItem key={client.id} value={client.id}>
                                                {client.company} ({client.name})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="deadline">Deadline</Label>
                                <Input
                                    id="deadline"
                                    name="deadline"
                                    type="date"
                                    required
                                    value={formData.deadline}
                                    onChange={handleChange}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="description">Description</Label>
                            <Textarea
                                id="description"
                                name="description"
                                placeholder="Project goals, scope, and key deliverables..."
                                className="min-h-[100px]"
                                value={formData.description}
                                onChange={handleChange}
                            />
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                            {['owner', 'admin'].includes(currentUser?.role) && (
                                <div className="space-y-2">
                                    <Label htmlFor="budget">Budget ({getCurrencySymbol()})</Label>
                                    <Input
                                        id="budget"
                                        name="budget"
                                        type="number"
                                        placeholder="50000"
                                        required
                                        value={formData.budget}
                                        onChange={handleChange}
                                    />
                                </div>
                            )}

                            <div className="space-y-2">
                                <Label htmlFor="type">Project Type</Label>
                                <Select
                                    value={formData.type}
                                    onValueChange={(value: ProjectType) => setFormData(prev => ({ ...prev, type: value }))}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="web-development">Web Development</SelectItem>
                                        <SelectItem value="app-development">App Development</SelectItem>
                                        <SelectItem value="design">Design</SelectItem>
                                        <SelectItem value="marketing">Marketing</SelectItem>
                                        <SelectItem value="seo">SEO</SelectItem>
                                        <SelectItem value="other">Other</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="paymentModel">Payment Model</Label>
                                <Select
                                    value={formData.paymentModel}
                                    onValueChange={(value: PaymentModel) => setFormData(prev => ({ ...prev, paymentModel: value }))}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="advance">Advance</SelectItem>
                                        <SelectItem value="milestone">Milestone</SelectItem>
                                        <SelectItem value="retainer">Retainer</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="status">Initial Status</Label>
                                <Select
                                    value={formData.status}
                                    onValueChange={(value: ProjectStatus) => setFormData(prev => ({ ...prev, status: value }))}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="planning">Planning</SelectItem>
                                        <SelectItem value="in-progress">In Progress</SelectItem>
                                        <SelectItem value="on-hold">On Hold</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Milestone Setup Section */}
                        <div className="space-y-4 pt-2 border-t">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h4 className="text-base font-semibold flex items-center gap-2">
                                        <Flag className="h-4 w-4 text-primary" />
                                        Project Milestones & Payment Stages
                                    </h4>
                                    <p className="text-xs text-muted-foreground">
                                        Configure deliverables, target dates, and payment amounts for each milestone stage.
                                    </p>
                                </div>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={addMilestoneRow}
                                    className="h-8 text-xs font-medium"
                                >
                                    <Plus className="h-3.5 w-3.5 mr-1" /> Add Milestone
                                </Button>
                            </div>

                            {milestones.length > 0 && (
                                <div className="space-y-3">
                                    {milestones.map((m, idx) => (
                                        <div key={idx} className="p-3.5 rounded-lg border bg-card/60 space-y-3">
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="text-xs font-bold text-primary px-2 py-0.5 rounded bg-primary/10">
                                                    Stage #{idx + 1}
                                                </span>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => removeMilestoneRow(idx)}
                                                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                            </div>

                                            <div className="grid gap-3 sm:grid-cols-12">
                                                <div className="sm:col-span-6 space-y-1">
                                                    <Label className="text-xs">Milestone Title</Label>
                                                    <Input
                                                        placeholder="e.g. Design & Wireframes"
                                                        value={m.name}
                                                        onChange={(e) => updateMilestoneRow(idx, 'name', e.target.value)}
                                                        className="h-8 text-sm"
                                                        required
                                                    />
                                                </div>
                                                <div className="sm:col-span-3 space-y-1">
                                                    <Label className="text-xs">Target Due Date</Label>
                                                    <Input
                                                        type="date"
                                                        value={m.dueDate}
                                                        onChange={(e) => updateMilestoneRow(idx, 'dueDate', e.target.value)}
                                                        className="h-8 text-sm"
                                                        required
                                                    />
                                                </div>
                                                <div className="sm:col-span-3 space-y-1">
                                                    <Label className="text-xs">Amount ({getCurrencySymbol()})</Label>
                                                    <Input
                                                        type="number"
                                                        placeholder="e.g. 25000"
                                                        value={m.amount}
                                                        onChange={(e) => updateMilestoneRow(idx, 'amount', e.target.value)}
                                                        className="h-8 text-sm"
                                                        min="0"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    ))}

                                    {/* Milestone Total Tally */}
                                    <div className="flex items-center justify-between p-3 rounded-lg bg-primary/5 border border-primary/20 text-xs">
                                        <span className="font-medium text-foreground">
                                            Total Milestone Sum: <strong>{formatCurrency(totalMilestoneSum)}</strong>
                                        </span>
                                        {parseFloat(formData.budget) > 0 && (
                                            <span className={`font-semibold ${totalMilestoneSum === parseFloat(formData.budget) ? 'text-emerald-600' : 'text-amber-600'}`}>
                                                {Math.round((totalMilestoneSum / parseFloat(formData.budget)) * 100)}% of Project Budget ({formatCurrency(parseFloat(formData.budget))})
                                            </span>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="flex items-center justify-between p-4 rounded-lg border bg-slate-50/50">
                            <div className="space-y-0.5">
                                <div className="flex items-center gap-2">
                                    <Label className="text-base">Auto-Generate Invoice</Label>
                                    <Popover>
                                        <PopoverTrigger>
                                            <Info className="h-4 w-4 text-slate-400" />
                                        </PopoverTrigger>
                                        <PopoverContent className="text-xs">
                                            When project matches 'Completed' status, an invoice will be automatically generated and sent to the client's email.
                                        </PopoverContent>
                                    </Popover>
                                </div>
                                <p className="text-sm text-muted-foreground">Automatically bill the client upon completion</p>
                            </div>
                            <Switch
                                checked={formData.autoInvoice}
                                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, autoInvoice: checked }))}
                            />
                        </div>

                        <div className="flex justify-end gap-3 pt-4">
                            <Button type="button" variant="outline" onClick={() => navigate('/projects')}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={loading}>
                                {loading ? 'Creating...' : 'Create Project'}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}

export default NewProjectPage
