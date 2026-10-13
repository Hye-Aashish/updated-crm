import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog'
import { RefreshCw, Plus, Edit, Trash2, Layers } from 'lucide-react'
import api from '@/lib/api-client'
import { useToast } from '@/hooks/use-toast'
import { PageSkeleton } from '@/components/ui/page-skeleton'
import type { ProjectTemplate } from '@/types'

export function ProjectTemplatesPage() {
    const { toast } = useToast()
    const [templates, setTemplates] = useState<ProjectTemplate[]>([])
    const [loading, setLoading] = useState(true)

    // Create Modal State
    const [isCreateOpen, setIsCreateOpen] = useState(false)
    const [newTemplate, setNewTemplate] = useState({
        name: '',
        projectType: 'web',
        description: '',
        phaseNames: 'Requirements, Design, Development, Testing, Handover'
    })
    const [isCreating, setIsCreating] = useState(false)

    // Edit Modal State
    const [isEditOpen, setIsEditOpen] = useState(false)
    const [editingTemplate, setEditingTemplate] = useState<any | null>(null)
    const [editForm, setEditForm] = useState({
        name: '',
        projectType: 'web',
        description: ''
    })
    const [isUpdating, setIsUpdating] = useState(false)

    const fetchTemplates = async () => {
        try {
            setLoading(true)
            const res = await api.get('/project-templates')
            setTemplates(res.data || [])
        } catch (err) {
            console.error(err)
            toast({ title: 'Error', description: 'Failed to load project templates', variant: 'destructive' })
        } finally {
            setLoading(false)
        }
    }

    const handleSeedTemplates = async () => {
        try {
            await api.post('/project-templates/seed')
            toast({ description: 'System project templates initialized successfully!' })
            fetchTemplates()
        } catch (err) {
            toast({ title: 'Error', description: 'Failed to seed templates', variant: 'destructive' })
        }
    }

    const handleCreateTemplate = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newTemplate.name.trim()) {
            toast({ title: 'Validation Error', description: 'Template name is required', variant: 'destructive' })
            return
        }

        setIsCreating(true)
        try {
            const rawPhases = newTemplate.phaseNames.split(',').map(p => p.trim()).filter(Boolean)
            const phases = rawPhases.map((name, index) => ({
                name,
                order: index + 1,
                checkpoints: [
                    {
                        title: `${name} Started`,
                        order: 1,
                        defaultRole: 'pm',
                        defaultDurationDays: 1,
                        priority: 'medium',
                        isMandatory: true,
                        proofRequired: false
                    },
                    {
                        title: `${name} Completed`,
                        order: 2,
                        defaultRole: 'pm',
                        defaultDurationDays: 2,
                        priority: 'high',
                        isMandatory: true,
                        proofRequired: true,
                        proofType: 'url'
                    }
                ]
            }))

            const payload = {
                name: newTemplate.name,
                projectType: newTemplate.projectType,
                description: newTemplate.description,
                phases
            }

            const res = await api.post('/project-templates', payload)
            setTemplates([...templates, res.data])
            toast({ title: 'Success', description: 'New project template created!' })
            setIsCreateOpen(false)
            setNewTemplate({
                name: '',
                projectType: 'web',
                description: '',
                phaseNames: 'Requirements, Design, Development, Testing, Handover'
            })
        } catch (err: any) {
            toast({ title: 'Error', description: err.response?.data?.message || 'Failed to create template', variant: 'destructive' })
        } finally {
            setIsCreating(false)
        }
    }

    const handleOpenEdit = (t: ProjectTemplate) => {
        setEditingTemplate(t)
        setEditForm({
            name: t.name,
            projectType: t.projectType,
            description: t.description || ''
        })
        setIsEditOpen(true)
    }

    const handleUpdateTemplate = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!editingTemplate) return

        setIsUpdating(true)
        try {
            const id = (editingTemplate as any)._id || editingTemplate.id
            const res = await api.put(`/project-templates/${id}`, editForm)
            setTemplates(templates.map(t => (((t as any)._id || t.id) === id ? { ...t, ...res.data } : t)))
            toast({ title: 'Success', description: 'Template updated successfully' })
            setIsEditOpen(false)
            setEditingTemplate(null)
        } catch (err: any) {
            toast({ title: 'Error', description: err.response?.data?.message || 'Failed to update template', variant: 'destructive' })
        } finally {
            setIsUpdating(false)
        }
    }

    const handleDeleteTemplate = async (id: string) => {
        if (!window.confirm('Are you sure you want to delete this template?')) return
        try {
            await api.delete(`/project-templates/${id}`)
            setTemplates(templates.filter(t => ((t as any)._id || t.id) !== id))
            toast({ title: 'Success', description: 'Template deleted successfully' })
        } catch (err: any) {
            toast({ title: 'Error', description: err.response?.data?.message || 'Failed to delete template', variant: 'destructive' })
        }
    }

    useEffect(() => {
        fetchTemplates()
    }, [])

    if (loading) return <PageSkeleton />

    return (
        <div className="space-y-6 font-sans pb-10">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">Project Template Engine</h1>
                    <p className="text-sm text-muted-foreground font-medium">Configure automated phases, checkpoints, dependencies, and proof rules for new projects.</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={handleSeedTemplates} className="h-9 font-bold text-xs">
                        <RefreshCw className="mr-2 h-3.5 w-3.5" /> Re-seed System Templates
                    </Button>
                    <Button size="sm" onClick={() => setIsCreateOpen(true)} className="h-9 font-bold text-xs">
                        <Plus className="mr-2 h-3.5 w-3.5" /> Create Template
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {templates.map((t) => {
                    const id = (t as any)._id || t.id
                    const totalCheckpoints = t.phases.reduce((sum, p) => sum + (p.checkpoints?.length || 0), 0)

                    return (
                        <Card key={id} className="border border-border/60 bg-card hover:border-primary/50 transition-all flex flex-col justify-between">
                            <div>
                                <CardHeader className="p-5 pb-3">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="space-y-1">
                                            <Badge variant="outline" className="text-[9px] font-bold uppercase tracking-wider text-primary border-primary/30">
                                                {t.projectType}
                                            </Badge>
                                            <CardTitle className="text-lg font-bold text-foreground">
                                                {t.name}
                                            </CardTitle>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <Badge variant="secondary" className="text-xs font-bold">
                                                {totalCheckpoints} Steps
                                            </Badge>
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                className="h-8 w-8 text-muted-foreground hover:text-primary"
                                                title="Edit Template"
                                                onClick={() => handleOpenEdit(t)}
                                            >
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                                title="Delete Template"
                                                onClick={() => handleDeleteTemplate(id)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                    <CardDescription className="text-xs text-muted-foreground line-clamp-2 pt-1">
                                        {t.description || 'Automated project template workflow.'}
                                    </CardDescription>
                                </CardHeader>

                                <CardContent className="p-5 pt-2 space-y-4">
                                    <div className="space-y-2">
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Phases Breakdown:</p>
                                        <div className="space-y-1.5">
                                            {t.phases.map((phase, pIdx) => (
                                                <div key={phase.name} className="flex items-center justify-between p-2 rounded-lg bg-muted/30 text-xs font-semibold border border-border/40">
                                                    <span className="flex items-center gap-2 truncate">
                                                        <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold shrink-0">
                                                            {pIdx + 1}
                                                        </span>
                                                        <span className="truncate">{phase.name}</span>
                                                    </span>
                                                    <span className="text-[10px] text-muted-foreground font-bold shrink-0 ml-2">
                                                        {phase.checkpoints?.length || 0} steps
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </CardContent>
                            </div>
                        </Card>
                    )
                })}
            </div>

            {/* Create Template Dialog */}
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogContent className="sm:max-w-[480px]">
                    <form onSubmit={handleCreateTemplate}>
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <Layers className="h-5 w-5 text-primary" /> Create Project Template
                            </DialogTitle>
                        </DialogHeader>

                        <div className="grid gap-4 py-4">
                            <div className="space-y-1.5">
                                <Label htmlFor="templateName" className="font-semibold text-xs">Template Name *</Label>
                                <Input
                                    id="templateName"
                                    value={newTemplate.name}
                                    onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                                    placeholder="e.g. Mobile App Blueprint"
                                    required
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="projectType" className="font-semibold text-xs">Project Type</Label>
                                <select
                                    id="projectType"
                                    className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                                    value={newTemplate.projectType}
                                    onChange={(e) => setNewTemplate({ ...newTemplate, projectType: e.target.value })}
                                >
                                    <option value="web">Web Application</option>
                                    <option value="mobile">Mobile Application</option>
                                    <option value="lms">Learning Management (LMS)</option>
                                    <option value="ecommerce">E-Commerce</option>
                                    <option value="saas">SaaS Platform</option>
                                    <option value="custom">Custom Solution</option>
                                </select>
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="description" className="font-semibold text-xs">Description</Label>
                                <Textarea
                                    id="description"
                                    value={newTemplate.description}
                                    onChange={(e) => setNewTemplate({ ...newTemplate, description: e.target.value })}
                                    placeholder="Describe the workflow or scope of this template..."
                                    className="text-xs min-h-[70px]"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="phaseNames" className="font-semibold text-xs">Phases (Comma Separated)</Label>
                                <Input
                                    id="phaseNames"
                                    value={newTemplate.phaseNames}
                                    onChange={(e) => setNewTemplate({ ...newTemplate, phaseNames: e.target.value })}
                                    placeholder="Phase 1, Phase 2, Phase 3..."
                                />
                                <p className="text-[11px] text-muted-foreground">Each phase will be automatically pre-populated with checkpoints.</p>
                            </div>
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isCreating}>
                                {isCreating ? 'Creating...' : 'Create Template'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Edit Template Dialog */}
            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                <DialogContent className="sm:max-w-[480px]">
                    <form onSubmit={handleUpdateTemplate}>
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <Edit className="h-5 w-5 text-primary" /> Edit Template
                            </DialogTitle>
                        </DialogHeader>

                        <div className="grid gap-4 py-4">
                            <div className="space-y-1.5">
                                <Label htmlFor="editTemplateName" className="font-semibold text-xs">Template Name *</Label>
                                <Input
                                    id="editTemplateName"
                                    value={editForm.name}
                                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="editProjectType" className="font-semibold text-xs">Project Type</Label>
                                <select
                                    id="editProjectType"
                                    className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                                    value={editForm.projectType}
                                    onChange={(e) => setEditForm({ ...editForm, projectType: e.target.value })}
                                >
                                    <option value="web">Web Application</option>
                                    <option value="mobile">Mobile Application</option>
                                    <option value="lms">Learning Management (LMS)</option>
                                    <option value="ecommerce">E-Commerce</option>
                                    <option value="saas">SaaS Platform</option>
                                    <option value="custom">Custom Solution</option>
                                </select>
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="editDescription" className="font-semibold text-xs">Description</Label>
                                <Textarea
                                    id="editDescription"
                                    value={editForm.description}
                                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                                    className="text-xs min-h-[70px]"
                                />
                            </div>
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isUpdating}>
                                {isUpdating ? 'Saving...' : 'Save Changes'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    )
}

export default ProjectTemplatesPage
