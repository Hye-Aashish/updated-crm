import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
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
import type { ProjectStatus, ProjectType, PaymentModel, Milestone } from '@/types'
import api from '@/lib/api-client'
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { mapProject, mapClient } from '@/lib/mappers'
import { getCurrencySymbol, formatCurrency } from '@/lib/utils'

export function EditProjectPage() {
    const { id } = useParams()
    const navigate = useNavigate()
    const { toast } = useToast()
    const { projects, clients, updateProject, setProjects, currentUser } = useAppStore()
    const [loading, setLoading] = useState(false)

    // Find project
    const project = projects.find(p => p.id === id)

    const [formData, setFormData] = useState({
        name: '',
        description: '',
        clientId: '',
        status: 'planning' as ProjectStatus,
        deadline: '',
        budget: '',
        type: 'web-development' as ProjectType,
        paymentModel: 'milestone' as PaymentModel,
        priority: 'medium',
        autoInvoice: false
    })

    const [milestones, setMilestones] = useState<Array<{ name: string; dueDate: string; amount: string; description?: string; completed?: boolean; status?: string }>>([])

    // Fetch if missing
    useEffect(() => {
        const loadData = async () => {
            try {
                const promises = []
                if (!project && projects.length === 0) promises.push(api.get('/projects'))
                if (clients.length === 0) promises.push(api.get('/clients'))

                if (promises.length > 0) {
                    const results = await Promise.all(promises)
                    results.forEach(res => {
                        const url = res.config?.url
                        if (url?.includes('/projects')) setProjects(res.data.map(mapProject))
                        if (url?.includes('/clients')) useAppStore.getState().setClients(res.data.map(mapClient))
                    })
                }
            } catch (error) {
                console.error("Data load error", error)
            }
        }
        loadData()
    }, [project, projects.length, clients.length, setProjects])

    // Populate Form
    useEffect(() => {
        if (project) {
            setFormData({
                name: project.name,
                description: project.description,
                clientId: project.clientId,
                status: project.status,
                deadline: (project.deadline && !isNaN(new Date(project.deadline).getTime()))
                    ? new Date(project.deadline).toISOString().split('T')[0]
                    : '',
                budget: (project.budget || 0).toString(),
                type: project.type,
                paymentModel: project.paymentModel,
                priority: project.priority || 'medium',
                autoInvoice: project.autoInvoice || false
            })

            if (project.milestones && project.milestones.length > 0) {
                setMilestones(project.milestones.map(m => ({
                    name: m.name,
                    dueDate: m.dueDate && !isNaN(new Date(m.dueDate).getTime())
                        ? new Date(m.dueDate).toISOString().split('T')[0]
                        : '',
                    amount: m.amount ? m.amount.toString() : '',
                    description: m.description || '',
                    completed: m.completed || false,
                    status: m.status || (m.completed ? 'completed' : 'pending')
                })))
            }
        }
    }, [project])

    const addMilestoneRow = () => {
        setMilestones(prev => [
            ...prev,
            {
                name: `Milestone ${prev.length + 1}: `,
                dueDate: formData.deadline || '',
                amount: '',
                description: '',
                completed: false,
                status: 'pending'
            }
        ])
    }

    const updateMilestoneRow = (index: number, field: string, value: any) => {
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

        if (!project) return

        try {
            const formattedMilestones = milestones.map(m => ({
                name: m.name,
                dueDate: m.dueDate ? new Date(m.dueDate) : undefined,
                amount: parseFloat(m.amount) || 0,
                description: m.description,
                completed: m.completed || m.status === 'completed',
                status: m.status || (m.completed ? 'completed' : 'pending')
            }))

            // Calculate progress based on milestones if milestones exist
            const completedCount = formattedMilestones.filter(m => m.completed).length
            const newProgress = formattedMilestones.length > 0 ? Math.round((completedCount / formattedMilestones.length) * 100) : project.progress

            // Send data to Backend API
            const response = await api.put(`/projects/${project.id}`, {
                ...formData,
                dueDate: formData.deadline,
                milestones: formattedMilestones,
                progress: newProgress
            })

            const updatedProject = mapProject(response.data)

            // Update Local Store
            updateProject(project.id, updatedProject)

            toast({
                title: "Project Updated",
                description: `${formData.name} has been updated successfully.`,
            })

            navigate(`/projects/${project.id}`)
        } catch (error) {
            console.error(error)
            toast({
                title: "Error",
                description: "Failed to update project.",
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

    if (!project && projects.length > 0) return <div>Project not found</div>
    if (!project) return <div>Loading...</div>

    return (
        <div className="space-y-6 max-w-2xl mx-auto p-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => navigate('/projects')}>
                    <ChevronLeft className="h-4 w-4" />
                </Button>
                <div>
                    <h1 className="text-3xl font-bold">Edit Project</h1>
                    <p className="text-muted-foreground">Update project details</p>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Project Details</CardTitle>
                    <CardDescription>Make changes to the project scope and timeline</CardDescription>
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
                                    disabled={['developer'].includes(currentUser?.role)}
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
                                <Label htmlFor="priority">Priority</Label>
                                <Select
                                    value={formData.priority}
                                    onValueChange={(value: any) => setFormData(prev => ({ ...prev, priority: value }))}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="low">Low</SelectItem>
                                        <SelectItem value="medium">Medium</SelectItem>
                                        <SelectItem value="high">High</SelectItem>
                                        <SelectItem value="urgent">Urgent</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                            {/* Type and Payment Model - usually fixed but editable if needed */}
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

                            <div className="space-y-2">
                                <Label htmlFor="status">Status</Label>
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
                                        <SelectItem value="completed">Completed</SelectItem>
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
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-bold text-primary px-2 py-0.5 rounded bg-primary/10">
                                                        Stage #{idx + 1}
                                                    </span>
                                                    {m.completed && (
                                                        <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded">
                                                            ✓ Completed
                                                        </span>
                                                    )}
                                                </div>
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
                                {loading ? 'Saving...' : 'Save Changes'}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}

export default EditProjectPage
