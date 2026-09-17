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
import { ChevronLeft, Globe, Smartphone, Server, Layers2 } from 'lucide-react'
import type { ProjectStatus, ProjectType, PaymentModel } from '@/types'
import api from '@/lib/api-client'
import { mapProject, mapClient, mapUser } from '@/lib/mappers'
import { getCurrencySymbol } from '@/lib/utils'

export function NewProjectPage() {
    const navigate = useNavigate()
    const { toast } = useToast()
    const addProject = useAppStore((state) => state.addProject)
    const setClients = useAppStore((state) => state.setClients)
    const clients = useAppStore((state) => state.clients)
    const users = useAppStore((state) => state.users)
    const setUsers = useAppStore((state) => state.setUsers)
    const currentUser = useAppStore((state) => state.currentUser)
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        if (clients.length === 0) {
            api.get('/clients').then(res => setClients(res.data.map(mapClient))).catch(console.error)
        }
        if (users.length === 0) {
            api.get('/users').then(res => setUsers(res.data.map(mapUser))).catch(console.error)
        }
    }, [clients.length, users.length, setClients, setUsers])

    const [formData, setFormData] = useState({
        name: '',
        description: '',
        clientId: '',
        pmId: currentUser?.id || '',
        developers: [] as string[],
        designers: [] as string[],
        status: 'planning' as ProjectStatus,
        startDate: new Date().toISOString().split('T')[0],
        deadline: '',
        budget: '',
        advanceAmount: '',
        milestoneAmount: '',
        finalAmount: '',
        type: 'lms' as ProjectType,
        paymentModel: 'milestone' as PaymentModel,
        priority: 'medium',
        autoInvoice: false,

        // Deliverables
        websiteRequired: true,
        androidRequired: true,
        iosRequired: false,
        adminPanelRequired: true,
        apiRequired: true,
        hostingRequired: true,
        maintenanceRequired: false,
        domain: '',
    })



    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            const response = await api.post('/projects', {
                ...formData,
                budget: parseFloat(formData.budget) || 0,
                advanceAmount: parseFloat(formData.advanceAmount) || 0,
                milestoneAmount: parseFloat(formData.milestoneAmount) || 0,
                finalAmount: parseFloat(formData.finalAmount) || 0,
                dueDate: formData.deadline,
                pmId: formData.pmId || currentUser.id,
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
                title: "Project Initialized",
                description: `${formData.name} created! Automatic template checkpoints generated.`,
            })

            navigate(`/projects/${savedProject.id || savedProject._id}`)
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
        <div className="space-y-6 max-w-4xl mx-auto font-sans pb-10">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => navigate('/projects')}>
                    <ChevronLeft className="h-4 w-4" />
                </Button>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Create New Project</h1>
                    <p className="text-sm text-muted-foreground font-medium">Initiate client project with automatic template checkpoints & deliverable tracking.</p>
                </div>
            </div>

            <Card className="border border-border/60">
                <CardHeader>
                    <CardTitle className="text-lg font-bold">1. Project & Client Info</CardTitle>
                    <CardDescription>Select project type to automatically load corresponding workflow checkpoints.</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="name" className="text-xs font-bold uppercase">Project Name</Label>
                                <Input
                                    id="name"
                                    name="name"
                                    placeholder="e.g. Acme Online Academy LMS"
                                    required
                                    value={formData.name}
                                    onChange={handleChange}
                                    className="h-10 text-sm"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="clientId" className="text-xs font-bold uppercase">Client</Label>
                                <Select
                                    value={formData.clientId}
                                    onValueChange={(value) => setFormData(prev => ({ ...prev, clientId: value }))}
                                    required
                                >
                                    <SelectTrigger className="h-10 text-sm font-medium">
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
                        </div>

                        {/* Template Picker */}
                        <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 space-y-2">
                            <Label className="text-xs font-bold uppercase text-primary flex items-center gap-1.5">
                                <Layers2 className="h-4 w-4" /> Template & Workflow Selection
                            </Label>
                            <Select
                                value={formData.type}
                                onValueChange={(value: ProjectType) => setFormData(prev => ({ ...prev, type: value }))}
                            >
                                <SelectTrigger className="h-10 bg-card text-sm font-bold">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="lms" className="font-bold">🎓 LMS (Learning Management System - 53 Checkpoints Auto-Generated)</SelectItem>
                                    <SelectItem value="website" className="font-bold">🌐 Website Project (Design, SEO, Live Domain Workflow)</SelectItem>
                                    <SelectItem value="mobile-app" className="font-bold">📱 Mobile Application (Android & iOS Stores)</SelectItem>
                                    <SelectItem value="crm-erp" className="font-bold">💼 CRM / ERP Software System</SelectItem>
                                    <SelectItem value="ecommerce" className="font-bold">🛒 E-Commerce Platform</SelectItem>
                                    <SelectItem value="custom" className="font-bold">⚙️ Custom Project (No pre-loaded template)</SelectItem>
                                </SelectContent>
                            </Select>
                            <p className="text-[11px] text-muted-foreground font-medium">
                                Selected template will automatically generate all phases, mandatory checkpoints, proof rules, and dependency chains upon creation.
                            </p>
                        </div>

                        <div className="grid gap-4 md:grid-cols-3">
                            <div className="space-y-2">
                                <Label htmlFor="startDate" className="text-xs font-bold uppercase">Start Date</Label>
                                <Input
                                    id="startDate"
                                    name="startDate"
                                    type="date"
                                    required
                                    value={formData.startDate}
                                    onChange={handleChange}
                                    className="h-10 text-sm"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="deadline" className="text-xs font-bold uppercase">Expected Deadline</Label>
                                <Input
                                    id="deadline"
                                    name="deadline"
                                    type="date"
                                    required
                                    value={formData.deadline}
                                    onChange={handleChange}
                                    className="h-10 text-sm"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="pmId" className="text-xs font-bold uppercase">Project Manager</Label>
                                <Select
                                    value={formData.pmId}
                                    onValueChange={(value) => setFormData(prev => ({ ...prev, pmId: value }))}
                                >
                                    <SelectTrigger className="h-10 text-sm font-semibold">
                                        <SelectValue placeholder="Assign PM" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {users.map(u => (
                                            <SelectItem key={u.id || u._id} value={u.id || u._id || ''}>
                                                {u.name} ({u.role})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Deliverables Toggles */}
                        <div className="space-y-3 pt-4 border-t">
                            <Label className="text-xs font-bold uppercase tracking-wider block text-foreground">Required Deliverables & Modules</Label>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
                                    <Label className="text-xs font-bold flex items-center gap-1.5"><Globe className="h-3.5 w-3.5 text-blue-500" /> Website</Label>
                                    <Switch checked={formData.websiteRequired} onCheckedChange={(v) => setFormData(p => ({ ...p, websiteRequired: v }))} />
                                </div>
                                <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
                                    <Label className="text-xs font-bold flex items-center gap-1.5"><Smartphone className="h-3.5 w-3.5 text-emerald-500" /> Android App</Label>
                                    <Switch checked={formData.androidRequired} onCheckedChange={(v) => setFormData(p => ({ ...p, androidRequired: v }))} />
                                </div>
                                <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
                                    <Label className="text-xs font-bold flex items-center gap-1.5"><Smartphone className="h-3.5 w-3.5 text-purple-500" /> iOS App</Label>
                                    <Switch checked={formData.iosRequired} onCheckedChange={(v) => setFormData(p => ({ ...p, iosRequired: v }))} />
                                </div>
                                <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
                                    <Label className="text-xs font-bold flex items-center gap-1.5"><Server className="h-3.5 w-3.5 text-amber-500" /> Admin Panel</Label>
                                    <Switch checked={formData.adminPanelRequired} onCheckedChange={(v) => setFormData(p => ({ ...p, adminPanelRequired: v }))} />
                                </div>
                            </div>
                        </div>

                        {/* Financials & Budget */}
                        <div className="space-y-4 pt-4 border-t">
                            <Label className="text-xs font-bold uppercase tracking-wider block text-foreground">Financial & Payment Setup</Label>
                            <div className="grid gap-4 md:grid-cols-4">
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-bold">Total Budget ({getCurrencySymbol()})</Label>
                                    <Input
                                        name="budget"
                                        type="number"
                                        placeholder="100000"
                                        required
                                        value={formData.budget}
                                        onChange={handleChange}
                                        className="h-9 text-sm font-bold"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-bold">Advance Amount</Label>
                                    <Input
                                        name="advanceAmount"
                                        type="number"
                                        placeholder="30000"
                                        value={formData.advanceAmount}
                                        onChange={handleChange}
                                        className="h-9 text-sm font-semibold"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-bold">Milestone Amount</Label>
                                    <Input
                                        name="milestoneAmount"
                                        type="number"
                                        placeholder="40000"
                                        value={formData.milestoneAmount}
                                        onChange={handleChange}
                                        className="h-9 text-sm font-semibold"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-bold">Final Amount</Label>
                                    <Input
                                        name="finalAmount"
                                        type="number"
                                        placeholder="30000"
                                        value={formData.finalAmount}
                                        onChange={handleChange}
                                        className="h-9 text-sm font-semibold"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2 pt-2">
                            <Label htmlFor="description" className="text-xs font-bold uppercase">Project Description & Scope</Label>
                            <Textarea
                                id="description"
                                name="description"
                                placeholder="Key goals, technical stack, and client expectations..."
                                className="min-h-[90px] text-sm"
                                value={formData.description}
                                onChange={handleChange}
                            />
                        </div>

                        <div className="flex justify-end gap-3 pt-4">
                            <Button type="button" variant="outline" onClick={() => navigate('/projects')}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={loading} className="font-bold px-6">
                                {loading ? 'Initializing Project & Checkpoints...' : 'Create Project'}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}

export default NewProjectPage
