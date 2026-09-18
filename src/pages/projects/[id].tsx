import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAppStore } from '@/store'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
    ChevronLeft, Edit, Trash2, Plus, FileText, Paperclip,
    Download, Globe, Smartphone, Shield, Flag, RefreshCw
} from 'lucide-react'
import { formatCurrency, getInitials } from '@/lib/utils'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import api from '@/lib/api-client'
import { useToast } from '@/hooks/use-toast'
import { TaskBoard } from '@/components/tasks/task-board'

import { ProjectTeamDialog } from '@/components/projects/project-team-dialog'
import { ProjectFileDialog } from '@/components/projects/project-file-dialog'
import { ProjectTimelineView } from '@/components/projects/project-timeline-view'
import { CheckpointProofDialog } from '@/components/projects/checkpoint-proof-dialog'
import { ProjectMilestonesTab } from '@/components/projects/project-milestones-tab'

import { mapProject, mapClient, mapUser } from '@/lib/mappers'

export function ProjectDetailPage() {
    const { id } = useParams()
    const navigate = useNavigate()
    const { toast } = useToast()

    // Module State
    const [checkpoints, setCheckpoints] = useState<any[]>([])
    const [bugs, setBugs] = useState<any[]>([])
    const [followups, setFollowups] = useState<any[]>([])
    const [activitiesLog, setActivitiesLog] = useState<any[]>([])
    const [completionReadiness, setCompletionReadiness] = useState<any>(null)

    const [fileDialogOpen, setFileDialogOpen] = useState(false)

    // Dialog & Form States
    const [selectedCpForProof, setSelectedCpForProof] = useState<any>(null)
    const [proofDialogOpen, setProofDialogOpen] = useState(false)
    const [newBugDialogOpen, setNewBugDialogOpen] = useState(false)
    const [newBug, setNewBug] = useState({ title: '', description: '', severity: 'medium', priority: 'medium', assignedDeveloper: '' })

    const [newFollowUpDialogOpen, setNewFollowUpDialogOpen] = useState(false)
    const [newFollowUp, setNewFollowUp] = useState({ type: 'update', summary: '', clientResponse: '', followUpDate: '' })

    const {
        projects, setProjects,
        tasks,
        users, setUsers,
        files,
        invoices,
        clients, setClients,
        currentUser,
        updateProject,
        deleteProject
    } = useAppStore()

    const project = projects.find((p) => p.id === id || p._id === id)

    const fetchModuleData = async () => {
        if (!project) return
        const pId = project._id || project.id
        try {
            const [cpRes, bugRes, folRes, actRes, compRes] = await Promise.all([
                api.get(`/projects/${pId}/checkpoints`).catch(() => ({ data: [] })),
                api.get(`/projects/${pId}/bugs`).catch(() => ({ data: [] })),
                api.get(`/projects/${pId}/followups`).catch(() => ({ data: [] })),
                api.get(`/projects/${pId}/activities`).catch(() => ({ data: [] })),
                api.get(`/projects/${pId}/completion-check`).catch(() => ({ data: null }))
            ])
            setCheckpoints(cpRes.data || [])
            setBugs(bugRes.data || [])
            setFollowups(folRes.data || [])
            setActivitiesLog(actRes.data || [])
            setCompletionReadiness(compRes.data)
        } catch (err) {
            console.error("Error loading project module data", err)
        }
    }

    useEffect(() => {
        fetchModuleData()
    }, [id, project?.id])

    // Load initial data
    useEffect(() => {
        const fetchData = async () => {
            if (projects.length === 0 || clients.length === 0 || users.length === 0) {
                try {
                    const [pRes, cRes, uRes] = await Promise.all([
                        api.get('/projects'),
                        api.get('/clients'),
                        api.get('/users')
                    ])
                    if (pRes.data) setProjects(pRes.data.map(mapProject))
                    if (cRes.data) setClients(cRes.data.map(mapClient))
                    if (uRes.data) setUsers(uRes.data.map(mapUser))
                } catch (e) {
                    console.error(e)
                }
            }
        }
        fetchData()
    }, [projects.length, clients.length, users.length, setProjects, setClients, setUsers])

    if (!project) return <div className="p-10 text-center font-bold text-muted-foreground">Loading project workspace...</div>

    const client = clients.find(c => c.id === project.clientId)
    const pm = users.find(u => u.id === project.pmId)
    const projectTasks = tasks.filter(t => t.projectId === project.id)
    const projectFiles = files.filter(f => f.projectId === project.id)

    const health = project.health || 'green'

    const handleDelete = async () => {
        if (window.confirm("Are you sure you want to delete this project? This cannot be undone.")) {
            try {
                await api.delete(`/projects/${project.id}`)
                deleteProject(project.id)
                navigate('/projects')
            } catch (err) {
                navigate('/projects')
            }
        }
    }

    // Checkpoint Status Update
    const handleCheckpointUpdate = async (cpId: string, status: string, extra: any = {}) => {
        const pId = project._id || project.id
        try {
            await api.put(`/projects/${pId}/checkpoints/${cpId}`, { status, ...extra })
            toast({ description: `Checkpoint updated to ${status}` })
            fetchModuleData()
            // Refresh parent project progress & health
            const updatedP = await api.get(`/projects/${pId}`)
            updateProject(project.id, mapProject(updatedP.data))
        } catch (err: any) {
            toast({
                title: 'Operation Blocked',
                description: err.response?.data?.message || 'Failed to update checkpoint',
                variant: 'destructive'
            })
        }
    }

    const handleCreateBug = async () => {
        if (!newBug.title || !newBug.description) return
        const pId = project._id || project.id
        try {
            await api.post(`/projects/${pId}/bugs`, newBug)
            toast({ description: 'QA Bug reported successfully' })
            setNewBug({ title: '', description: '', severity: 'medium', priority: 'medium', assignedDeveloper: '' })
            setNewBugDialogOpen(false)
            fetchModuleData()
        } catch (err) {
            toast({ title: 'Error', description: 'Failed to create bug', variant: 'destructive' })
        }
    }

    const handleCreateFollowUp = async () => {
        if (!newFollowUp.summary || !newFollowUp.followUpDate) return
        const pId = project._id || project.id
        try {
            await api.post(`/projects/${pId}/followups`, newFollowUp)
            toast({ description: 'Client follow-up scheduled' })
            setNewFollowUp({ type: 'update', summary: '', clientResponse: '', followUpDate: '' })
            setNewFollowUpDialogOpen(false)
            fetchModuleData()
        } catch (err) {
            toast({ title: 'Error', description: 'Failed to schedule follow-up', variant: 'destructive' })
        }
    }

    return (
        <div className="space-y-6 font-sans pb-10">
            {/* Breadcrumb Header */}
            <div className="flex flex-col gap-4">
                <div className="flex items-center gap-2 text-xs text-muted-foreground font-semibold">
                    <button onClick={() => navigate('/projects')} className="hover:text-primary transition-colors">Projects</button>
                    <ChevronLeft className="h-3.5 w-3.5 rotate-180" />
                    <span className="text-foreground truncate">{project.name}</span>
                </div>

                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="space-y-1">
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">{project.name}</h1>
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase ${
                                health === 'green' ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/30' :
                                health === 'yellow' ? 'bg-amber-500/10 text-amber-600 border border-amber-500/30 animate-pulse' :
                                health === 'red' ? 'bg-red-500/10 text-red-600 border border-red-500/30 animate-pulse' :
                                health === 'blue' ? 'bg-blue-500/10 text-blue-600 border border-blue-500/30' : 'bg-gray-100 text-gray-600'
                            }`}>
                                ● HEALTH: {health.toUpperCase()}
                            </span>
                        </div>
                        <p className="text-sm text-muted-foreground font-semibold">
                            Client: <span className="text-foreground">{client?.company || client?.name || 'Client'}</span> • PM: <span className="text-foreground">{pm?.name || 'Unassigned'}</span> • Deadline: <span className="text-foreground">{new Date(project.deadline).toLocaleDateString()}</span>
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        {['owner', 'admin', 'pm'].includes(currentUser?.role) && (
                            <Button variant="outline" size="sm" onClick={() => navigate(`/projects/${project.id}/edit`)} className="h-9 font-bold text-xs">
                                <Edit className="mr-1.5 h-3.5 w-3.5" /> Edit Project
                            </Button>
                        )}
                        {['owner', 'admin'].includes(currentUser?.role) && (
                            <Button variant="ghost" size="icon" onClick={handleDelete} className="text-destructive hover:bg-destructive/10">
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        )}
                    </div>
                </div>
            </div>

            {/* Quick KPI Strip */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <Card className="bg-card border-border/60">
                    <CardContent className="p-3.5 space-y-1">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase">Overall Progress</p>
                        <p className="text-xl font-black text-primary">{project.progress || 0}%</p>
                        <Progress value={project.progress || 0} className="h-1.5" />
                    </CardContent>
                </Card>

                <Card className="bg-card border-border/60">
                    <CardContent className="p-3.5 space-y-1">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase">Checkpoints</p>
                        <p className="text-xl font-black text-foreground">
                            {checkpoints.filter(c => c.status === 'completed').length} / {checkpoints.length}
                        </p>
                        <p className="text-[10px] font-semibold text-emerald-600">Automated Pipeline</p>
                    </CardContent>
                </Card>

                <Card className="bg-card border-border/60">
                    <CardContent className="p-3.5 space-y-1">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase">Open QA Bugs</p>
                        <p className="text-xl font-black text-red-600">
                            {bugs.filter(b => b.status !== 'closed').length}
                        </p>
                        <p className="text-[10px] text-muted-foreground font-semibold">
                            {bugs.filter(b => b.severity === 'critical' && b.status !== 'closed').length} Critical
                        </p>
                    </CardContent>
                </Card>

                <Card className="bg-card border-border/60">
                    <CardContent className="p-3.5 space-y-1">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase">Project Budget</p>
                        <p className="text-xl font-black text-foreground">{formatCurrency(project.budget)}</p>
                        <p className="text-[10px] text-emerald-600 font-semibold">
                            Status: {project.paymentStatus || 'Pending'}
                        </p>
                    </CardContent>
                </Card>

                <Card className="bg-card border-border/60">
                    <CardContent className="p-3.5 space-y-1">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase">Deliverables Live</p>
                        <div className="flex items-center gap-2 pt-0.5">
                            {project.websiteRequired && <span title="Website"><Globe className={`h-4 w-4 ${project.websiteStatus === 'live' ? 'text-emerald-500' : 'text-gray-400'}`} /></span>}
                            {project.androidRequired && <span title="Android"><Smartphone className={`h-4 w-4 ${project.androidStatus === 'live' ? 'text-emerald-500' : 'text-gray-400'}`} /></span>}
                            {project.iosRequired && <span title="iOS"><Smartphone className={`h-4 w-4 ${project.iosStatus === 'live' ? 'text-emerald-500' : 'text-gray-400'}`} /></span>}
                        </div>
                        <p className="text-[10px] text-muted-foreground font-semibold">Active Trackers</p>
                    </CardContent>
                </Card>
            </div>

            {/* Functional Tabs */}
            <Tabs defaultValue="overview" className="space-y-4">
                <TabsList className="flex overflow-x-auto w-full justify-start h-11 p-1 bg-muted/40 border border-border/50 rounded-xl custom-scrollbar">
                    <TabsTrigger value="overview" className="text-xs font-bold">Overview</TabsTrigger>
                    <TabsTrigger value="milestones" className="text-xs font-bold text-amber-700 dark:text-amber-300 bg-amber-500/10 data-[state=active]:bg-amber-600 data-[state=active]:text-white flex items-center gap-1.5 px-3">
                        <Flag className="h-3.5 w-3.5" /> Milestones ({project.milestones?.length || 0})
                    </TabsTrigger>
                    {currentUser?.role !== 'client' && (
                        <TabsTrigger value="checkpoints" className="text-xs font-bold">Checkpoints ({checkpoints.length})</TabsTrigger>
                    )}
                    <TabsTrigger value="timeline" className="text-xs font-bold">Timeline</TabsTrigger>
                    <TabsTrigger value="tasks" className="text-xs font-bold">Tasks ({projectTasks.length})</TabsTrigger>
                    <TabsTrigger value="team" className="text-xs font-bold">Team</TabsTrigger>
                    <TabsTrigger value="client-updates" className="text-xs font-bold">Client Updates</TabsTrigger>
                    {currentUser?.role !== 'client' && (
                        <TabsTrigger value="followups" className="text-xs font-bold">Follow-ups ({followups.length})</TabsTrigger>
                    )}
                    <TabsTrigger value="payments" className="text-xs font-bold">Payments</TabsTrigger>
                    <TabsTrigger value="website" className="text-xs font-bold">Website</TabsTrigger>
                    <TabsTrigger value="android" className="text-xs font-bold">Android</TabsTrigger>
                    <TabsTrigger value="ios" className="text-xs font-bold">iOS</TabsTrigger>
                    {currentUser?.role !== 'client' && (
                        <TabsTrigger value="bugs" className="text-xs font-bold">QA & Bugs ({bugs.length})</TabsTrigger>
                    )}
                    <TabsTrigger value="files" className="text-xs font-bold">Files ({projectFiles.length})</TabsTrigger>
                    {currentUser?.role !== 'client' && (
                        <TabsTrigger value="activities" className="text-xs font-bold">Audit Log</TabsTrigger>
                    )}
                </TabsList>

                {/* 1. OVERVIEW TAB */}
                <TabsContent value="overview" className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 space-y-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-base font-bold">Project Scope & Summary</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4 text-sm">
                                    <p className="text-muted-foreground leading-relaxed">
                                        {project.description || 'No detailed description specified.'}
                                    </p>
                                </CardContent>
                            </Card>

                            {/* Readiness Validation Check Card */}
                            {completionReadiness && (
                                <Card className={`border ${completionReadiness.canComplete ? 'bg-emerald-500/5 border-emerald-500/30' : 'bg-amber-500/5 border-amber-500/30'}`}>
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-sm font-bold flex items-center justify-between">
                                            <span className="flex items-center gap-2">
                                                <Shield className="h-4 w-4 text-primary" />
                                                Completion Validation Rules Check
                                            </span>
                                            <Badge variant={completionReadiness.canComplete ? "default" : "secondary"}>
                                                {completionReadiness.canComplete ? '✓ Ready to Complete' : '⚠️ Action Required'}
                                            </Badge>
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="text-xs space-y-2 font-medium">
                                        <div className="flex items-center justify-between">
                                            <span>Uncompleted Mandatory Checkpoints:</span>
                                            <span className="font-bold">{completionReadiness.uncompletedMandatoryCount}</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span>Unresolved Critical QA Bugs:</span>
                                            <span className="font-bold">{completionReadiness.unresolvedCriticalBugsCount}</span>
                                        </div>
                                        {completionReadiness.uncompletedMandatoryList?.length > 0 && (
                                            <div className="p-2.5 bg-amber-500/10 rounded-lg space-y-1 text-[11px] text-amber-700 dark:text-amber-300 border border-amber-500/20">
                                                <p className="font-bold">Pending Mandatory Checkpoints:</p>
                                                {completionReadiness.uncompletedMandatoryList.map((m: any) => (
                                                    <p key={m.id}>• {m.title} ({m.phase})</p>
                                                ))}
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            )}
                        </div>

                        <div className="space-y-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-base font-bold">Deliverables Readiness</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3 text-xs font-semibold">
                                    <div className="flex items-center justify-between p-2.5 rounded-lg border bg-card">
                                        <span className="flex items-center gap-2"><Globe className="h-4 w-4 text-blue-500" /> Website Status</span>
                                        <Badge variant="outline" className="uppercase text-[9px]">{project.websiteStatus || 'Not Started'}</Badge>
                                    </div>
                                    <div className="flex items-center justify-between p-2.5 rounded-lg border bg-card">
                                        <span className="flex items-center gap-2"><Smartphone className="h-4 w-4 text-emerald-500" /> Android App</span>
                                        <Badge variant="outline" className="uppercase text-[9px]">{project.androidStatus || 'Not Started'}</Badge>
                                    </div>
                                    <div className="flex items-center justify-between p-2.5 rounded-lg border bg-card">
                                        <span className="flex items-center gap-2"><Smartphone className="h-4 w-4 text-purple-500" /> iOS App</span>
                                        <Badge variant="outline" className="uppercase text-[9px]">{project.iosStatus || 'Not Started'}</Badge>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </TabsContent>

                {/* 1.5 MILESTONES TAB */}
                <TabsContent value="milestones" className="space-y-4">
                    <ProjectMilestonesTab 
                        project={project} 
                        onProjectUpdate={(updated) => updateProject(project.id, updated)} 
                    />
                </TabsContent>

                {/* 2. CHECKPOINTS TAB */}
                <TabsContent value="checkpoints" className="space-y-4">
                    <div className="flex justify-between items-center">
                        <h3 className="text-base font-bold">Automated Checkpoints & Workflow Rules</h3>
                        <Button size="sm" onClick={fetchModuleData} variant="outline" className="h-8 text-xs font-bold">
                            <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Refresh Pipeline
                        </Button>
                    </div>

                    <div className="space-y-3">
                        {checkpoints.map((cp) => {
                            const isCompleted = cp.status === 'completed'
                            const isOverdue = cp.status === 'overdue' || (cp.dueDate && new Date(cp.dueDate) < new Date() && !isCompleted)

                            return (
                                <Card key={cp._id || cp.id} className={`border transition-all ${
                                    isCompleted ? 'bg-emerald-500/5 border-emerald-500/30' :
                                    isOverdue ? 'bg-red-500/5 border-red-500/30' : 'bg-card border-border/60'
                                }`}>
                                    <CardContent className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{cp.phase}</span>
                                                {cp.isMandatory && <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 border border-amber-500/30">Mandatory</span>}
                                                {cp.proofRequired && <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 border border-blue-500/30">Proof Needed</span>}
                                            </div>
                                            <p className="text-sm font-bold text-foreground">{cp.title}</p>
                                            {cp.dependencies && cp.dependencies.length > 0 && (
                                                <p className="text-[10px] text-muted-foreground">
                                                    Prerequisites: {cp.dependencies.map((d: any) => d.title || d).join(', ')}
                                                </p>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <Badge variant={isCompleted ? "secondary" : "outline"} className={`text-[9px] font-bold uppercase ${
                                                isCompleted ? 'bg-emerald-500/20 text-emerald-700' :
                                                isOverdue ? 'bg-red-500/20 text-red-700' : ''
                                            }`}>
                                                {cp.status.replace('_', ' ')}
                                            </Badge>

                                            {!isCompleted && (
                                                <Button 
                                                    size="sm" 
                                                    onClick={() => {
                                                        if (cp.proofRequired) {
                                                            setSelectedCpForProof(cp)
                                                            setProofDialogOpen(true)
                                                        } else {
                                                            handleCheckpointUpdate(cp._id || cp.id, 'completed')
                                                        }
                                                    }}
                                                    className="h-8 text-xs font-bold"
                                                >
                                                    Complete Step
                                                </Button>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            )
                        })}
                    </div>
                </TabsContent>

                {/* 3. TIMELINE TAB */}
                <TabsContent value="timeline">
                    <ProjectTimelineView 
                        checkpoints={checkpoints} 
                        onCheckpointClick={(cp) => {
                            if (cp.proofRequired) {
                                setSelectedCpForProof(cp)
                                setProofDialogOpen(true)
                            }
                        }}
                    />
                </TabsContent>

                {/* 4. TASKS TAB */}
                <TabsContent value="tasks" className="space-y-4">
                    <div className="flex justify-between items-center">
                        <h3 className="text-base font-bold">Task Management Board</h3>
                        <Button size="sm" onClick={() => navigate('/tasks')} className="h-8 font-bold text-xs">
                            <Plus className="mr-1.5 h-3.5 w-3.5" /> Add Task
                        </Button>
                    </div>
                    {projectTasks.length === 0 ? (
                        <div className="p-8 text-center text-muted-foreground border border-dashed rounded-xl text-xs font-medium">
                            No tasks created for this project yet.
                        </div>
                    ) : (
                        <TaskBoard tasks={projectTasks} />
                    )}
                </TabsContent>

                {/* 5. TEAM TAB */}
                <TabsContent value="team">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {users.filter(u => (project.members || []).includes(u.id) || u.id === project.pmId).map(user => (
                            <Card key={user.id} className="border border-border/60">
                                <CardContent className="p-4 flex items-center gap-4">
                                    <Avatar className="h-10 w-10">
                                        <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <p className="font-bold text-sm text-foreground">{user.name}</p>
                                        <p className="text-xs text-muted-foreground capitalize font-medium">{user.role}</p>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </TabsContent>

                {/* 6. CLIENT UPDATES TAB */}
                <TabsContent value="client-updates" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base font-bold">Client Communication Summary</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3 text-xs font-semibold">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                <div className="p-3 bg-muted/40 rounded-lg border">
                                    <span className="text-muted-foreground text-[10px] uppercase font-bold">Last Call</span>
                                    <p className="font-bold text-sm pt-0.5">{project.lastCallDate ? new Date(project.lastCallDate).toLocaleDateString() : 'No Record'}</p>
                                </div>
                                <div className="p-3 bg-muted/40 rounded-lg border">
                                    <span className="text-muted-foreground text-[10px] uppercase font-bold">Last WhatsApp</span>
                                    <p className="font-bold text-sm pt-0.5">{project.lastWhatsAppDate ? new Date(project.lastWhatsAppDate).toLocaleDateString() : 'No Record'}</p>
                                </div>
                                <div className="p-3 bg-muted/40 rounded-lg border">
                                    <span className="text-muted-foreground text-[10px] uppercase font-bold">Last Email</span>
                                    <p className="font-bold text-sm pt-0.5">{project.lastEmailDate ? new Date(project.lastEmailDate).toLocaleDateString() : 'No Record'}</p>
                                </div>
                                <div className="p-3 bg-muted/40 rounded-lg border">
                                    <span className="text-muted-foreground text-[10px] uppercase font-bold">Next Follow-up</span>
                                    <p className="font-bold text-sm text-primary pt-0.5">{project.nextFollowUpDate ? new Date(project.nextFollowUpDate).toLocaleDateString() : 'Not Set'}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* 7. FOLLOW-UPS TAB */}
                <TabsContent value="followups" className="space-y-4">
                    <div className="flex justify-between items-center">
                        <h3 className="text-base font-bold">Scheduled Follow-ups</h3>
                        <Button size="sm" onClick={() => setNewFollowUpDialogOpen(true)} className="h-8 text-xs font-bold">
                            <Plus className="mr-1.5 h-3.5 w-3.5" /> Schedule Follow-up
                        </Button>
                    </div>

                    <div className="space-y-3">
                        {followups.map((f) => (
                            <Card key={f._id || f.id} className="border border-border/60">
                                <CardContent className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs font-medium">
                                    <div className="space-y-1">
                                        <p className="font-bold text-sm text-foreground">{f.summary}</p>
                                        <p className="text-muted-foreground">Type: <span className="uppercase font-bold text-primary">{f.type}</span> • Scheduled for: <span className="font-bold text-foreground">{new Date(f.followUpDate).toLocaleString()}</span></p>
                                        {f.clientResponse && <p className="text-emerald-600 font-semibold">Client Response: {f.clientResponse}</p>}
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </TabsContent>

                {/* 8. PAYMENTS TAB */}
                <TabsContent value="payments" className="space-y-4">
                    {currentUser?.role !== 'client' && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base font-bold">Financial Summary & Milestone Billing Breakdown</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4 text-xs font-semibold">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    <div className="p-3 bg-muted/40 rounded-lg border">
                                        <span className="text-muted-foreground text-[10px] uppercase font-bold">Total Budget</span>
                                        <p className="font-bold text-lg pt-0.5">{formatCurrency(project.budget)}</p>
                                    </div>
                                    <div className="p-3 bg-muted/40 rounded-lg border">
                                        <span className="text-muted-foreground text-[10px] uppercase font-bold">Advance Amount</span>
                                        <p className="font-bold text-lg text-emerald-600 pt-0.5">{formatCurrency(project.advanceAmount || 0)}</p>
                                    </div>
                                    <div className="p-3 bg-muted/40 rounded-lg border">
                                        <span className="text-muted-foreground text-[10px] uppercase font-bold">Milestone Amount</span>
                                        <p className="font-bold text-lg text-blue-600 pt-0.5">{formatCurrency(project.milestoneAmount || 0)}</p>
                                    </div>
                                    <div className="p-3 bg-muted/40 rounded-lg border">
                                        <span className="text-muted-foreground text-[10px] uppercase font-bold">Final Amount</span>
                                        <p className="font-bold text-lg text-purple-600 pt-0.5">{formatCurrency(project.finalAmount || 0)}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    <ProjectMilestonesTab 
                        project={project} 
                        onProjectUpdate={(updated) => updateProject(project.id, updated)} 
                    />
                </TabsContent>

                {/* 9. WEBSITE TAB */}
                <TabsContent value="website" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base font-bold flex items-center gap-2">
                                <Globe className="h-5 w-5 text-blue-500" /> Website Deployment Tracker
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4 text-xs font-medium">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <Label className="text-xs font-bold">Website Status</Label>
                                    <Input value={project.websiteStatus || 'not-started'} readOnly className="h-9 uppercase font-bold" />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs font-bold">Domain</Label>
                                    <Input value={project.domain || '-'} readOnly className="h-9 font-semibold" />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs font-bold">Production URL</Label>
                                    <Input value={project.productionUrl || project.websiteUrl || '-'} readOnly className="h-9 font-semibold text-primary" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* 10. ANDROID TAB */}
                <TabsContent value="android" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base font-bold flex items-center gap-2">
                                <Smartphone className="h-5 w-5 text-emerald-500" /> Android App Tracker
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4 text-xs font-medium">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-1">
                                    <Label className="text-xs font-bold">Android Status</Label>
                                    <Input value={project.androidStatus || 'not-started'} readOnly className="h-9 uppercase font-bold" />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs font-bold">App Version</Label>
                                    <Input value={project.androidVersion || 'v1.0.0'} readOnly className="h-9 font-semibold" />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs font-bold">Play Store Link</Label>
                                    <Input value={project.androidAppUrl || '-'} readOnly className="h-9 font-semibold text-primary" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* 11. IOS TAB */}
                <TabsContent value="ios" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base font-bold flex items-center gap-2">
                                <Smartphone className="h-5 w-5 text-purple-500" /> iOS App Tracker
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4 text-xs font-medium">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-1">
                                    <Label className="text-xs font-bold">iOS Status</Label>
                                    <Input value={project.iosStatus || 'not-started'} readOnly className="h-9 uppercase font-bold" />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs font-bold">App Version</Label>
                                    <Input value={project.iosVersion || 'v1.0.0'} readOnly className="h-9 font-semibold" />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs font-bold">App Store Link</Label>
                                    <Input value={project.iosAppUrl || '-'} readOnly className="h-9 font-semibold text-primary" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* 12. QA BUGS TAB */}
                <TabsContent value="bugs" className="space-y-4">
                    <div className="flex justify-between items-center">
                        <h3 className="text-base font-bold">QA & Bug Tracker</h3>
                        <Button size="sm" onClick={() => setNewBugDialogOpen(true)} className="h-8 text-xs font-bold">
                            <Plus className="mr-1.5 h-3.5 w-3.5" /> Report Bug
                        </Button>
                    </div>

                    <div className="space-y-3">
                        {bugs.map((b) => (
                            <Card key={b._id || b.id} className="border border-border/60">
                                <CardContent className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <Badge variant={b.severity === 'critical' ? 'destructive' : 'secondary'} className="uppercase text-[9px] font-black">
                                                {b.severity}
                                            </Badge>
                                            <p className="font-bold text-sm text-foreground">{b.title}</p>
                                        </div>
                                        <p className="text-muted-foreground">{b.description}</p>
                                    </div>

                                    <Badge variant="outline" className="uppercase font-bold text-[9px] w-fit">
                                        {b.status.replace('_', ' ')}
                                    </Badge>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </TabsContent>

                {/* 13. FILES TAB */}
                <TabsContent value="files">
                    <Card>
                        <CardHeader>
                            <div className="flex justify-between items-center">
                                <CardTitle className="text-base font-bold">Files & Documents</CardTitle>
                                <Button size="sm" variant="outline" onClick={() => setFileDialogOpen(true)} className="h-8 text-xs font-bold">
                                    <Paperclip className="mr-1.5 h-3.5 w-3.5" /> Add File
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2 text-xs font-medium">
                                {projectFiles.map((file) => (
                                    <div key={file.id} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                                        <div className="flex items-center gap-3">
                                            <FileText className="h-4 w-4 text-primary" />
                                            <div>
                                                <p className="font-bold text-foreground">{file.name}</p>
                                                <p className="text-[10px] text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                                            </div>
                                        </div>
                                        <Button variant="ghost" size="sm" asChild>
                                            <a href={file.url} download target="_blank" rel="noreferrer"><Download className="h-4 w-4" /></a>
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* 14. AUDIT ACTIVITY LOG TAB */}
                <TabsContent value="activities" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base font-bold">Audit & Action History</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {activitiesLog.map((act) => (
                                <div key={act._id || act.id} className="p-3 rounded-lg border bg-card text-xs font-medium space-y-1">
                                    <div className="flex justify-between items-center">
                                        <span className="font-bold text-foreground">{act.userName}</span>
                                        <span className="text-[10px] text-muted-foreground">{new Date(act.createdAt).toLocaleString()}</span>
                                    </div>
                                    <p className="text-muted-foreground">{act.description}</p>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Proof Submission Modal */}
            <CheckpointProofDialog
                open={proofDialogOpen}
                onOpenChange={setProofDialogOpen}
                checkpoint={selectedCpForProof}
                onSubmitProof={async (proofData) => {
                    if (selectedCpForProof) {
                        await handleCheckpointUpdate(selectedCpForProof._id || selectedCpForProof.id, 'completed', proofData)
                    }
                }}
            />

            {/* Bug Report Modal */}
            <Dialog open={newBugDialogOpen} onOpenChange={setNewBugDialogOpen}>
                <DialogContent className="max-w-md rounded-xl font-sans">
                    <DialogHeader>
                        <DialogTitle className="font-bold text-lg">Report QA Bug / Defect</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3 py-2 text-xs">
                        <div className="space-y-1">
                            <Label className="font-bold">Title</Label>
                            <Input placeholder="e.g. Login endpoint fails on invalid token" value={newBug.title} onChange={e => setNewBug({ ...newBug, title: e.target.value })} className="h-9" />
                        </div>
                        <div className="space-y-1">
                            <Label className="font-bold">Severity</Label>
                            <Select value={newBug.severity} onValueChange={v => setNewBug({ ...newBug, severity: v })}>
                                <SelectTrigger className="h-9 font-bold"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="critical" className="font-bold text-red-600">CRITICAL</SelectItem>
                                    <SelectItem value="high" className="font-bold text-amber-600">HIGH</SelectItem>
                                    <SelectItem value="medium" className="font-bold text-blue-600">MEDIUM</SelectItem>
                                    <SelectItem value="low" className="font-bold text-gray-600">LOW</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1">
                            <Label className="font-bold">Description</Label>
                            <Textarea placeholder="Steps to reproduce..." value={newBug.description} onChange={e => setNewBug({ ...newBug, description: e.target.value })} className="min-h-[80px]" />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button size="sm" onClick={handleCreateBug} className="font-bold">Submit Bug</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Follow-up Schedule Modal */}
            <Dialog open={newFollowUpDialogOpen} onOpenChange={setNewFollowUpDialogOpen}>
                <DialogContent className="max-w-md rounded-xl font-sans">
                    <DialogHeader>
                        <DialogTitle className="font-bold text-lg">Schedule Client Follow-up</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3 py-2 text-xs">
                        <div className="space-y-1">
                            <Label className="font-bold">Follow-up Date & Time</Label>
                            <Input type="datetime-local" value={newFollowUp.followUpDate} onChange={e => setNewFollowUp({ ...newFollowUp, followUpDate: e.target.value })} className="h-9" />
                        </div>
                        <div className="space-y-1">
                            <Label className="font-bold">Communication Type</Label>
                            <Select value={newFollowUp.type} onValueChange={v => setNewFollowUp({ ...newFollowUp, type: v })}>
                                <SelectTrigger className="h-9 font-bold"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="call" className="font-bold">Call</SelectItem>
                                    <SelectItem value="whatsapp" className="font-bold">WhatsApp</SelectItem>
                                    <SelectItem value="email" className="font-bold">Email</SelectItem>
                                    <SelectItem value="meeting" className="font-bold">Meeting</SelectItem>
                                    <SelectItem value="update" className="font-bold">Status Update</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1">
                            <Label className="font-bold">Summary / Notes</Label>
                            <Textarea placeholder="Client agenda or discussion points..." value={newFollowUp.summary} onChange={e => setNewFollowUp({ ...newFollowUp, summary: e.target.value })} className="min-h-[80px]" />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button size="sm" onClick={handleCreateFollowUp} className="font-bold">Save Follow-up</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Project File Dialog */}
            {project && <ProjectFileDialog open={fileDialogOpen} onOpenChange={setFileDialogOpen} project={project} />}
        </div>
    )
}
