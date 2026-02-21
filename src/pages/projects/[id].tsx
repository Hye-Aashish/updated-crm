import { useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAppStore } from '@/store'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
    ChevronLeft, Calendar, DollarSign, Clock, CheckSquare,
    MoreHorizontal, Edit, Trash2, Plus, FileText, Paperclip,
    Download, ExternalLink, Users, AlertCircle, TrendingUp
} from 'lucide-react'
import { formatCurrency, getInitials } from '@/lib/utils'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import api from '@/lib/api-client'
import { TaskBoard } from '@/components/tasks/task-board'


import { ProjectTeamDialog } from '@/components/projects/project-team-dialog'
import { ProjectFileDialog } from '@/components/projects/project-file-dialog'
import { useState } from 'react'

import { mapProject, mapClient, mapUser, mapInvoice } from '@/lib/mappers'

export function ProjectDetailPage() {
    const { id } = useParams()
    const navigate = useNavigate()
    const [teamDialogOpen, setTeamDialogOpen] = useState(false)
    const [fileDialogOpen, setFileDialogOpen] = useState(false)
    const {
        projects, setProjects,
        tasks,
        users, setUsers,
        files, setFiles,
        invoices, setInvoices,
        clients, setClients,
        currentUser,
        activities,
        deleteProject // Destructure
    } = useAppStore()

    const project = projects.find((p) => p.id === id)

    const handleDelete = async () => {
        if (!project) return
        if (window.confirm("Are you sure you want to delete this project? This action cannot be undone.")) {
            try {
                await api.delete(`/projects/${project.id}`)
                deleteProject(project.id)
                navigate('/projects')
            } catch (error) {
                console.error("Delete failed", error)
                navigate('/projects')
            }
        }
    }

    // Fetch Data on Reload
    useEffect(() => {
        const fetchData = async () => {
            // Only fetch if data is missing. Fresh data is better but length check is simple.
            if (projects.length === 0 || clients.length === 0 || users.length === 0 || files.length === 0 || invoices.length === 0) {
                try {
                    const [projectsRes, clientsRes, usersRes, filesRes, invoicesRes] = await Promise.all([
                        projects.length === 0 ? api.get('/projects') : Promise.resolve({ data: null }),
                        clients.length === 0 ? api.get('/clients') : Promise.resolve({ data: null }),
                        users.length === 0 ? api.get('/users') : Promise.resolve({ data: null }),
                        files.length === 0 ? api.get('/files') : Promise.resolve({ data: null }),
                        invoices.length === 0 ? api.get('/invoices') : Promise.resolve({ data: null })
                    ])

                    if (projectsRes.data) {
                        setProjects(projectsRes.data.map(mapProject))
                    }
                    if (clientsRes.data) {
                        setClients(clientsRes.data.map(mapClient))
                    }
                    if (usersRes?.data) {
                        setUsers(usersRes.data.map(mapUser))
                    }
                    if (filesRes?.data) {
                        setFiles(filesRes.data.map((f: any) => ({
                            id: f._id,
                            name: f.name,
                            type: f.type,
                            size: f.size,
                            url: f.url,
                            projectId: f.projectId,
                            clientId: f.clientId,
                            uploadedBy: f.uploadedBy,
                            uploadedAt: new Date(f.uploadedAt),
                        })))
                    }
                    if (invoicesRes?.data) {
                        setInvoices(invoicesRes.data.map(mapInvoice))
                    }
                } catch (error) {
                    console.error("Error fetching detail data", error)
                }
            }
        }
        fetchData()
    }, [id, projects.length, clients.length, users.length, files.length, invoices.length, setProjects, setClients, setUsers, setFiles, setInvoices])


    if (!project && projects.length > 0) {
        return (
            <div className="flex flex-col items-center justify-center h-[50vh]">
                <h2 className="text-2xl font-bold mb-2">Project Not Found</h2>
                <p className="text-muted-foreground mb-4">The project you are looking for does not exist or has been deleted.</p>
                <Button onClick={() => navigate('/projects')}>Back to Projects</Button>
            </div>
        )
    }

    if (!project) return <div className="p-10 text-center">Loading project details...</div>

    // Derived Data
    const projectTasks = tasks.filter(t => t.projectId === project.id)
    const completedTasks = projectTasks.filter(t => t.status === 'done').length
    const progress = projectTasks.length > 0 ? (completedTasks / projectTasks.length) * 100 : (project.progress || 0)

    const projectFiles = files.filter(f => f.projectId === project.id)
    const projectInvoices = invoices.filter(i => i.projectId === project.id)

    // Team Members (Dynamic)
    const projectMembers = project.members || []
    const assigneeIds = Array.from(new Set(projectTasks.map(t => t.assigneeId).filter(Boolean)))
    const combinedMemberIds = Array.from(new Set([...projectMembers, ...assigneeIds]))

    // Add PM to team if not already
    if (project.pmId && !combinedMemberIds.includes(project.pmId)) combinedMemberIds.push(project.pmId)

    const teamMembers = users.filter(u => combinedMemberIds.includes(u.id))
    const displayTeam = teamMembers.length > 0 ? teamMembers : []
    const pm = users.find(u => u.id === project.pmId)
    const client = clients.find(c => c.id === project.clientId)

    // Project Activities
    const projectActivities = activities.filter(a => a.projectId === project.id || a.metadata?.projectId === project.id).slice(0, 5)


    const getStatusColor = (status: string) => {
        switch (status) {
            case 'completed': return 'bg-green-500 hover:bg-green-600'
            case 'in-progress': return 'bg-blue-500 hover:bg-blue-600'
            case 'on-hold': return 'bg-yellow-500 hover:bg-yellow-600'
            default: return 'bg-gray-500 hover:bg-gray-600'
        }
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col gap-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <button onClick={() => navigate('/projects')} className="hover:text-primary transition-colors">Projects</button>
                    <ChevronLeft className="h-4 w-4 rotate-180" />
                    <span className="text-foreground font-medium truncate">{project.name}</span>
                </div>

                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div className="space-y-1">
                        <div className="flex items-center gap-3">
                            <h1 className="text-3xl font-bold">{project.name}</h1>
                            <Badge className={getStatusColor(project.status)}>
                                {project.status.replace('-', ' ')}
                            </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                                <Users className="h-4 w-4" />
                                <span>{client?.company || client?.name || 'Unknown Client'}</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                <span>Due: {new Date(project.deadline).toLocaleDateString()}</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => navigate(`/projects/${project.id}/edit`)}>
                            <Edit className="mr-2 h-4 w-4" /> Edit Project
                        </Button>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                    <MoreHorizontal className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem className="text-red-600" onClick={handleDelete}>
                                    <Trash2 className="mr-2 h-4 w-4" /> Delete Project
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                {['owner', 'admin'].includes(currentUser?.role) && (
                    <>
                        <Card>
                            <CardContent className="p-6">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="text-sm font-medium text-muted-foreground">Budget</p>
                                        <h3 className="text-2xl font-bold mt-2">{formatCurrency(project.budget)}</h3>
                                    </div>
                                    <div className="p-2 bg-slate-100 dark:bg-slate-900/20 rounded-lg">
                                        <DollarSign className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="p-6">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="text-sm font-medium text-muted-foreground">Received</p>
                                        <h3 className="text-2xl font-bold mt-2 text-emerald-600">
                                            {formatCurrency(projectInvoices.filter(i => i.status === 'paid').reduce((sum, i) => sum + (Number(i.total) || 0), 0))}
                                        </h3>
                                        <p className="text-[10px] text-muted-foreground mt-1">
                                            {projectInvoices.filter(i => i.status === 'paid').length} Paid Invoices
                                        </p>
                                    </div>
                                    <div className="p-2 bg-emerald-100 dark:bg-emerald-900/20 rounded-lg">
                                        <TrendingUp className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </>
                )}
                <Card>
                    <CardContent className="p-6">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Hours Logged</p>
                                <h3 className="text-2xl font-bold mt-2">--</h3>
                                {['owner', 'pm'].includes(currentUser?.role) && (
                                    <p className="text-xs text-muted-foreground mt-1">Billable: --</p>
                                )}
                            </div>
                            <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                                <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-6">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Task Progress</p>
                                <h3 className="text-2xl font-bold mt-2">{Math.round(progress)}%</h3>
                                <Progress value={progress} className="h-2 mt-2 w-24" />
                            </div>
                            <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                                <CheckSquare className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-6">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Pending Items</p>
                                <h3 className="text-2xl font-bold mt-2">{projectTasks.length - completedTasks}</h3>
                                <p className="text-xs text-red-500 mt-1">{projectTasks.filter(t => new Date(t.dueDate) < new Date() && t.status !== 'done').length} Overdue</p>
                            </div>
                            <div className="p-2 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
                                <AlertCircle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Tabs Content */}
            <Tabs defaultValue="overview" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="tasks">Tasks ({projectTasks.length})</TabsTrigger>
                    <TabsTrigger value="team">Team ({displayTeam.length})</TabsTrigger>
                    <TabsTrigger value="files">Files ({projectFiles.length})</TabsTrigger>
                    {['owner', 'admin'].includes(currentUser?.role) && <TabsTrigger value="invoices">Invoices ({projectInvoices.length})</TabsTrigger>}
                </TabsList>

                <TabsContent value="overview" className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="md:col-span-2 space-y-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Description</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-sm text-muted-foreground leading-relaxed">
                                        {project.description || "No description provided for this project."}
                                    </p>
                                    <div className="mt-6">
                                        <h4 className="text-sm font-semibold mb-3">Key Deliverables</h4>
                                        <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                                            {project.milestones && project.milestones.length > 0 ? (
                                                project.milestones.map((m, i) => (
                                                    <li key={i}>{m.name} {m.completed ? '(Completed)' : ''}</li>
                                                ))
                                            ) : (
                                                <>
                                                    {/* Fallback mock deliverables if no milestones, as per user request to not remove anything */}
                                                    <li>Detailed Requirements Specification</li>
                                                    <li>UI/UX Design Mockups</li>
                                                    <li>Functional Prototype</li>
                                                    <li>Production Deployment</li>
                                                </>
                                            )}
                                        </ul>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Recent Activity (Dynamic from store) */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>Recent Activity</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        {projectActivities.length > 0 ? (
                                            projectActivities.map((activity, i) => (
                                                <div key={i} className="flex gap-4 items-start">
                                                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                                                        <Avatar className="h-8 w-8">
                                                            <AvatarFallback>{getInitials(users.find(u => u.id === activity.userId)?.name || 'User')}</AvatarFallback>
                                                        </Avatar>
                                                    </div>
                                                    <div>
                                                        <p className="text-sm text-foreground">
                                                            <span className="font-semibold">{users.find(u => u.id === activity.userId)?.name || 'Someone'}</span> {activity.description}
                                                        </p>
                                                        <p className="text-xs text-muted-foreground">{new Date(activity.createdAt).toLocaleString()}</p>
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <p className="text-sm text-muted-foreground">No recent activity.</p>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        <div className="space-y-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Project Details</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4 text-sm">
                                    <div className="flex justify-between py-2 border-b">
                                        <span className="text-muted-foreground">Client</span>
                                        <span className="font-medium">{client?.company || client?.name || 'Unknown'}</span>
                                    </div>
                                    <div className="flex justify-between py-2 border-b">
                                        <span className="text-muted-foreground">Start Date</span>
                                        <span className="font-medium">{new Date(project.startDate).toLocaleDateString()}</span>
                                    </div>
                                    <div className="flex justify-between py-2 border-b">
                                        <span className="text-muted-foreground">End Date</span>
                                        <span className="font-medium">{new Date(project.deadline).toLocaleDateString()}</span>
                                    </div>
                                    <div className="flex justify-between py-2 border-b">
                                        <span className="text-muted-foreground">Priority</span>
                                        <Badge variant="outline" className="capitalize">{project.priority || 'medium'}</Badge>
                                    </div>
                                    <div className="flex justify-between py-2">
                                        <span className="text-muted-foreground">Team Lead</span>
                                        <div className="flex items-center gap-2">
                                            <Avatar className="h-5 w-5">
                                                <AvatarFallback>{getInitials(pm?.name || 'NA')}</AvatarFallback>
                                            </Avatar>
                                            <span className="font-medium">{pm?.name || 'Unassigned'}</span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="tasks" className="space-y-4">
                    <div className="flex justify-between items-center">
                        <h3 className="text-lg font-semibold">Tasks</h3>
                        <Button size="sm"><Plus className="mr-2 h-4 w-4" /> Add Task</Button>
                    </div>
                    {projectTasks.length === 0 ? (
                        <div className="p-8 text-center text-muted-foreground bg-muted/30 rounded-lg border border-dashed">
                            <p>No tasks found for this project.</p>
                            <Button variant="link" className="mt-2">Create your first task</Button>
                        </div>
                    ) : (
                        <TaskBoard tasks={projectTasks} />
                    )}
                </TabsContent>

                <TabsContent value="team">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {displayTeam.map(user => (
                            <Card key={user.id}>
                                <CardContent className="p-4 flex items-center gap-4">
                                    <Avatar className="h-10 w-10">
                                        <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <p className="font-semibold">{user.name}</p>
                                        <p className="text-xs text-muted-foreground capitalize">{user.role}</p>
                                    </div>
                                    <Button variant="ghost" size="icon" className="ml-auto">
                                        <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                </CardContent>
                            </Card>
                        ))}
                        {['owner', 'admin', 'pm'].includes(currentUser?.role) && (
                            <Card
                                className="border-dashed hover:bg-muted/50 cursor-pointer flex items-center justify-center min-h-[80px]"
                                onClick={() => setTeamDialogOpen(true)}
                            >
                                <div className="flex flex-col items-center text-muted-foreground">
                                    <Plus className="h-6 w-6 mb-1" />
                                    <span className="text-sm">Manage Team</span>
                                </div>
                            </Card>
                        )}
                    </div>
                </TabsContent>

                <ProjectTeamDialog
                    project={project}
                    open={teamDialogOpen}
                    onOpenChange={setTeamDialogOpen}
                />
                <ProjectFileDialog
                    project={project}
                    open={fileDialogOpen}
                    onOpenChange={setFileDialogOpen}
                />

                <TabsContent value="files">
                    <Card>
                        <CardHeader>
                            <div className="flex justify-between items-center">
                                <CardTitle>Files & Documents</CardTitle>
                                {['owner', 'admin', 'pm'].includes(currentUser?.role) && (
                                    <Button size="sm" variant="outline" onClick={() => setFileDialogOpen(true)}>
                                        <Paperclip className="mr-2 h-4 w-4" /> Add Important File
                                    </Button>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                {projectFiles.length === 0 ? (
                                    <div className="text-center py-8 text-muted-foreground border-dashed border-2 rounded-xl">
                                        No files uploaded yet.
                                    </div>
                                ) : (
                                    projectFiles.map((file) => (
                                        <div key={file.id} className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded">
                                                    <FileText className="h-4 w-4 text-blue-600" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium">{file.name}</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {(file.size / 1024 / 1024).toFixed(2)} MB • Uploaded {new Date(file.uploadedAt).toLocaleDateString()}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <Button variant="ghost" size="sm" asChild>
                                                    <a href={file.url} target="_blank" rel="noopener noreferrer">
                                                        <Download className="h-4 w-4" />
                                                    </a>
                                                </Button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {['owner', 'admin'].includes(currentUser?.role) && (
                    <TabsContent value="invoices">
                        <Card>
                            <CardHeader>
                                <div className="flex justify-between items-center">
                                    <CardTitle>Invoices</CardTitle>
                                    <Button size="sm" variant="outline"><Plus className="mr-2 h-4 w-4" /> Create Invoice</Button>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2">
                                    {projectInvoices.length === 0 ? (
                                        <div className="text-center py-8 text-muted-foreground">No invoices generated for this project.</div>
                                    ) : (
                                        projectInvoices.map(inv => (
                                            <div key={inv.id} className="flex justify-between items-center p-3 border rounded-lg">
                                                <div>
                                                    <div className="font-medium">{inv.invoiceNumber}</div>
                                                    <div className="text-xs text-muted-foreground">{new Date(inv.date).toLocaleDateString()}</div>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <Badge variant={inv.status === 'paid' ? 'default' : 'secondary'}>{inv.status}</Badge>
                                                    <span className="font-bold">{formatCurrency(inv.total)}</span>
                                                    <Button variant="ghost" size="icon"><ExternalLink className="h-4 w-4" /></Button>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                )}
            </Tabs>
        </div>
    )
}
