import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Plus, Settings, List, LayoutGrid, FileText, Trash2, Search, ArrowUp, ArrowDown, UserCheck, TrendingUp, Filter } from 'lucide-react'
import api from '@/lib/api-client'
import { useToast } from '@/hooks/use-toast'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { useAppStore } from '@/store'

import { useLeadsData } from '@/hooks/use-leads-data'
import { LeadsKPI } from '@/components/leads/leads-kpi'
import { KanbanBoard } from '@/components/leads/kanban-board'
import { LeadsList } from '@/components/leads/leads-list'
import { LeadDetailsDialog } from '@/components/leads/lead-details-dialog'
import { LeadFormBuilder } from '@/components/leads/lead-form-builder'
import { FollowUpDialog } from '@/components/leads/follow-up-dialog'
import { TelecallerPerformanceDialog } from '@/components/leads/telecaller-performance-dialog'
import { AssignLeadDialog } from '@/components/leads/assign-lead-dialog'
import { PageSkeleton } from '@/components/ui/page-skeleton'
import type { Lead } from '@/types'
import { getLeadFollowUpInfo, sortLeadsByFollowUpPriority } from '@/lib/followup-utils'

const COLOR_OPTIONS = [
    { value: 'bg-blue-500', label: 'Blue' }, { value: 'bg-green-500', label: 'Green' },
    { value: 'bg-yellow-500', label: 'Yellow' }, { value: 'bg-red-500', label: 'Red' },
    { value: 'bg-purple-500', label: 'Purple' }, { value: 'bg-pink-500', label: 'Pink' },
    { value: 'bg-indigo-500', label: 'Indigo' }, { value: 'bg-orange-500', label: 'Orange' },
]

export function LeadsPage() {
    const { toast } = useToast()
    const { currentUser, users } = useAppStore()
    const isAdminOrOwner = currentUser?.role === 'admin' || currentUser?.role === 'owner'

    const {
        leads, stages, leadForms, setLeads, setStages, setLeadForms,
        updateLeadStage, assignLead, bulkAssignLeads, deleteLead, addActivity, logFollowUp, reorderStages, fetchData, loading
    } = useLeadsData()

    const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban')
    const [draggedLead, setDraggedLead] = useState<Lead | null>(null)
    const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
    const [followUpLead, setFollowUpLead] = useState<Lead | null>(null)
    const [isFollowUpModalOpen, setIsFollowUpModalOpen] = useState<boolean>(false)

    // Assign & Bulk Reassign states
    const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([])
    const [leadsToAssign, setLeadsToAssign] = useState<Lead[]>([])
    const [isAssignDialogOpen, setIsAssignDialogOpen] = useState<boolean>(false)

    // Filters state
    const [selectedTagFilter] = useState<string>('all')
    const [selectedFollowUpFilter, setSelectedFollowUpFilter] = useState<string>('all')
    const [searchQuery, setSearchQuery] = useState<string>('')
    const [selectedAgentFilter, setSelectedAgentFilter] = useState<string>('all')
    const [selectedFormFilter, setSelectedFormFilter] = useState<string>('all')
    const [telecallerTab, setTelecallerTab] = useState<'all' | 'my' | 'coverage'>('all')

    // Count fallback leads
    const fallbackLeadsCount = useMemo(() => {
        return leads.filter(l => l.isFallbackFollowUp).length
    }, [leads])

    // Strict Multi-User Isolation & Granular Permission Scoping:
    // Admin / Owner or 'all' scope sees all leads to supervise.
    // 'custom' scope sees own leads + explicitly permitted agents' leads.
    // 'own' scope can STRICTLY ONLY see leads assigned to them (or unassigned leads they created).
    const userScopedLeads = useMemo(() => {
        if (isAdminOrOwner || (currentUser as any)?.leadViewScope === 'all') return leads;
        const currentUserId = String((currentUser as any)?._id || (currentUser as any)?.id || '');
        const currentUserName = currentUser?.name?.toLowerCase().trim();

        const userScope = (currentUser as any)?.leadViewScope || 'own';
        const allowedLeadAgents = (currentUser as any)?.allowedLeadAgents || [];

        if (userScope === 'custom' && allowedLeadAgents.length > 0) {
            const allowedIds = new Set([
                currentUserId,
                ...allowedLeadAgents.map((a: any) => String(typeof a === 'object' ? (a._id || a.id) : a))
            ]);
            const allowedNames = new Set([
                currentUserName,
                ...allowedLeadAgents.map((a: any) => typeof a === 'object' && a.name ? a.name.toLowerCase().trim() : '').filter(Boolean)
            ]);

            return leads.filter(l => {
                const assignedId = String(l.assignedTo || '');
                const createdId = String((typeof l.createdBy === 'object' ? (l.createdBy as any)?._id : l.createdBy) || '');
                const assignedName = (l.assignedToName || '').toLowerCase().trim();
                const createdName = (l.createdByName || '').toLowerCase().trim();

                return allowedIds.has(assignedId) || allowedIds.has(createdId) ||
                       (assignedName && allowedNames.has(assignedName)) ||
                       (createdName && allowedNames.has(createdName));
            });
        }

        return leads.filter(l => {
            const hasAssignee = Boolean(
                (l.assignedTo && l.assignedTo !== 'unassigned' && String(l.assignedTo).trim() !== '') ||
                (l.assignedToName && l.assignedToName.toLowerCase().trim() !== 'unassigned' && l.assignedToName.trim() !== '')
            );

            if (hasAssignee) {
                // Lead is assigned to someone: MUST strictly match current user
                const isMyAssigned = (l.assignedTo && (l.assignedTo === currentUserId || String(l.assignedTo) === String(currentUserId))) ||
                                     (l.assignedToName && currentUserName && l.assignedToName.toLowerCase().trim() === currentUserName);
                return Boolean(isMyAssigned);
            } else {
                // Lead is unassigned: only creator can see it until assigned
                const isMyCreated = (l.createdBy && (l.createdBy === currentUserId || String(l.createdBy) === String(currentUserId) || (typeof l.createdBy === 'object' && (l.createdBy as any)?._id === currentUserId))) ||
                                    (l.createdByName && currentUserName && l.createdByName.toLowerCase().trim() === currentUserName);
                return Boolean(isMyCreated);
            }
        });
    }, [leads, isAdminOrOwner, currentUser]);

    // List of unique forms for Form filter
    const formFilterList = useMemo(() => {
        const map = new Map<string, { id: string, title: string, count: number }>()
        // Initialize from existing leadForms
        leadForms.forEach(f => {
            const key = f.title.trim()
            map.set(key, { id: (f as any)._id || key, title: key, count: 0 })
        })
        // Count from user scoped leads
        userScopedLeads.forEach(l => {
            const formKey = l.formTitle || (l.source && l.source.startsWith('Form: ') ? l.source.replace('Form: ', '').trim() : null)
            if (formKey) {
                const norm = formKey.trim()
                const existing = map.get(norm)
                if (existing) {
                    existing.count++
                } else {
                    map.set(norm, { id: norm, title: norm, count: 1 })
                }
            }
        })
        return Array.from(map.values())
    }, [leadForms, userScopedLeads])

    // Total web form leads count
    const totalWebFormLeads = useMemo(() => {
        return userScopedLeads.filter(l => Boolean(l.formTitle || l.formId || (l.source && l.source.startsWith('Form: ')))).length
    }, [userScopedLeads])

    // List of unique agents for Admin filter
    const agentList = useMemo(() => {
        const map = new Map<string, { id: string, name: string, count: number }>()
        userScopedLeads.forEach(l => {
            const agentName = l.createdByName || l.assignedToName
            const agentId = l.assignedTo || l.createdBy || agentName
            if (agentName && agentId) {
                const existing = map.get(agentName)
                if (existing) {
                    existing.count++
                } else {
                    map.set(agentName, { id: agentName, name: agentName, count: 1 })
                }
            }
        })
        return Array.from(map.values())
    }, [userScopedLeads])

    // 1. Filter Leads
    const rawFilteredLeads = userScopedLeads.filter(l => {
        // Admin Agent Filter
        if (isAdminOrOwner && selectedAgentFilter !== 'all') {
            const matchesAgent = l.createdBy === selectedAgentFilter || 
                                 l.assignedTo === selectedAgentFilter || 
                                 l.createdByName === selectedAgentFilter || 
                                 l.assignedToName === selectedAgentFilter
            if (!matchesAgent) return false
        }

        // Web Lead Form Filter
        if (selectedFormFilter !== 'all') {
            if (selectedFormFilter === 'any_form') {
                const isFormLead = Boolean(l.formTitle || l.formId || (l.source && l.source.startsWith('Form: ')))
                if (!isFormLead) return false
            } else {
                const leadFormKey = (l.formTitle || (l.source && l.source.startsWith('Form: ') ? l.source.replace('Form: ', '').trim() : '')).toLowerCase()
                const targetKey = selectedFormFilter.toLowerCase()
                const matchesForm = leadFormKey === targetKey || (l.formId && String(l.formId) === selectedFormFilter)
                if (!matchesForm) return false
            }
        }

        const matchesTag = selectedTagFilter === 'all' || (l.tags || []).includes(selectedTagFilter)
        
        const matchesFollowUp = selectedFollowUpFilter === 'all' || (() => {
            const info = getLeadFollowUpInfo(l.reminder)
            if (selectedFollowUpFilter === 'none') return !l.reminder?.date || l.reminder.completed
            return info.status === selectedFollowUpFilter
        })()

        const q = searchQuery.toLowerCase()
        const phoneStr = l.phone ? String(l.phone) : ''
        const cleanPhone = phoneStr.replace(/[\s-()+]/g, '')
        const cleanQ = q.replace(/[\s-()+]/g, '')
        
        let matchesCustomField = false
        if (l.customFields && q) {
            matchesCustomField = Object.values(l.customFields).some(val => {
                const strVal = String(val)
                const cleanVal = strVal.replace(/[\s-()+]/g, '')
                return strVal.toLowerCase().includes(q) || (cleanVal && cleanQ && cleanVal.includes(cleanQ))
            })
        }
        
        let matchesActivities = false
        if (l.activities && q) {
            matchesActivities = l.activities.some(a => a.content?.toLowerCase().includes(q) || a.outcome?.toLowerCase().includes(q) || a.createdByName?.toLowerCase().includes(q))
        }
        
        const matchesSearch = !q || 
                              l.name?.toLowerCase().includes(q) || 
                              (cleanPhone && cleanQ && cleanPhone.includes(cleanQ)) || 
                              matchesCustomField || 
                              matchesActivities ||
                              l.company?.toLowerCase().includes(q) ||
                              l.email?.toLowerCase().includes(q) ||
                              l.createdByName?.toLowerCase().includes(q) ||
                              l.assignedToName?.toLowerCase().includes(q)
        return matchesTag && matchesFollowUp && matchesSearch
    })

    // 2. Sort Leads by Follow-up Priority Rules (Overdue -> Today -> Upcoming -> No Follow-up)
    const filteredLeads = sortLeadsByFollowUpPriority(rawFilteredLeads)

    // Dialog States
    const [isLeadDialogOpen, setIsLeadDialogOpen] = useState(false)
    const [isStageDialogOpen, setIsStageDialogOpen] = useState(false)
    const [isLeadFormDialogOpen, setIsLeadFormDialogOpen] = useState(false)
    const [viewLeadDialogOpen, setViewLeadDialogOpen] = useState(false)
    const [isPerformanceDialogOpen, setIsPerformanceDialogOpen] = useState(false)

    // Form States
    const [newLead, setNewLead] = useState({ 
        name: '', 
        company: '', 
        value: '', 
        source: '', 
        email: '', 
        phone: '', 
        project: '',
        assignedTo: ''
    })
    const [newStage, setNewStage] = useState({ label: '', color: 'bg-blue-500' })

    const handleAddLead = async () => {
        if (!newLead.name || !newLead.company) return
        try {
            const currentUserId = currentUser?.id || (currentUser as any)?._id
            const selectedAssignee = users?.find(u => u.id === newLead.assignedTo || u._id === newLead.assignedTo)

            const payload = {
                ...newLead,
                value: parseInt(newLead.value) || 0,
                source: newLead.source || 'Direct',
                stage: stages[0]?.id || 'new',
                assignedTo: newLead.assignedTo || currentUserId,
                assignedToName: selectedAssignee?.name || currentUser?.name
            }
            const res = await api.post('/leads', payload)
            const createdDoc = res.data
            const now = new Date()
            const newLeadDoc = { 
                id: createdDoc._id, 
                _id: createdDoc._id, 
                ...payload, 
                createdBy: createdDoc.createdBy || currentUserId,
                createdByName: createdDoc.createdByName || currentUser?.name,
                assignedToName: createdDoc.assignedToName || payload.assignedToName,
                createdAt: createdDoc.createdAt ? new Date(createdDoc.createdAt) : now,
                updatedAt: createdDoc.updatedAt ? new Date(createdDoc.updatedAt) : now,
                activities: [], 
                customFields: {} 
            }
            // Put newly created lead at the TOP
            setLeads([newLeadDoc, ...leads])
            setNewLead({ name: '', company: '', value: '', source: '', email: '', phone: '', project: '', assignedTo: '' })
            setIsLeadDialogOpen(false)
            toast({ title: "Success", description: "Lead added successfully" })
        } catch (error) {
            toast({ title: "Error", description: "Failed to add lead", variant: "destructive" })
        }
    }

    const handleAddStage = async () => {
        if (!newStage.label) return
        const stageId = newStage.label.toLowerCase().replace(/\s+/g, '-')
        const stagePayload = { id: stageId, label: newStage.label, color: newStage.color, order: stages.length }
        try {
            await api.post('/leads/stages', stagePayload)
            setStages([...stages, stagePayload])
            setNewStage({ label: '', color: 'bg-blue-500' })
            setIsStageDialogOpen(false)
            toast({ title: "Success", description: "Stage added successfully" })
        } catch (error) {
            toast({ title: "Error", description: "Failed to add stage", variant: "destructive" })
        }
    }

    const handleMoveStage = (index: number, direction: 'up' | 'down') => {
        const targetIndex = direction === 'up' ? index - 1 : index + 1
        if (targetIndex < 0 || targetIndex >= stages.length) return
        const newStages = [...stages]
        const [moved] = newStages.splice(index, 1)
        newStages.splice(targetIndex, 0, moved)
        reorderStages(newStages)
    }

    const handleDeleteStage = async (stageId: string) => {
        if (stages.length <= 1) return
        try {
            await api.delete(`/leads/stages/${stageId}`)
            fetchData()
            toast({ description: "Stage deleted and leads migrated" })
        } catch (error) {
            toast({ title: "Error", description: "Process failed", variant: "destructive" })
        }
    }

    const handleOpenFollowUp = (targetLead: Lead) => {
        setFollowUpLead(targetLead)
        setIsFollowUpModalOpen(true)
    }

    const handleOpenAssignLead = (targetLead: Lead) => {
        setLeadsToAssign([targetLead])
        setIsAssignDialogOpen(true)
    }

    const handleOpenBulkAssign = () => {
        const selected = leads.filter(l => selectedLeadIds.includes(l.id))
        if (selected.length > 0) {
            setLeadsToAssign(selected)
            setIsAssignDialogOpen(true)
        }
    }

    const handleConfirmAssign = async (targetUserId: string, targetUserName: string) => {
        if (leadsToAssign.length === 1) {
            await assignLead(leadsToAssign[0].id, targetUserId, targetUserName)
        } else if (leadsToAssign.length > 1) {
            const ids = leadsToAssign.map(l => l.id)
            await bulkAssignLeads(ids, targetUserId, targetUserName)
            setSelectedLeadIds([])
        }
    }

    const handleToggleSelectLead = (leadId: string) => {
        setSelectedLeadIds(prev =>
            prev.includes(leadId) ? prev.filter(id => id !== leadId) : [...prev, leadId]
        )
    }

    const handleToggleSelectAll = () => {
        if (selectedLeadIds.length === filteredLeads.length) {
            setSelectedLeadIds([])
        } else {
            setSelectedLeadIds(filteredLeads.map(l => l.id))
        }
    }

    if (loading && leads.length === 0) {
        return <PageSkeleton />
    }

    return (
        <div className="space-y-5 h-[calc(100vh-100px)] flex flex-col font-sans pb-6">
            {/* 1. Header Navigation */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 flex-shrink-0">
                <div className="space-y-1">
                    <h1 className="text-2xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
                        <span>Lead Pipeline & Follow-ups</span>
                    </h1>
                    <p className="text-sm text-muted-foreground font-medium">
                        Intelligent follow-up priority tracking and sales management
                    </p>
                </div>

                <div className="flex items-center gap-2 sm:gap-3 w-full lg:w-auto overflow-x-auto custom-scrollbar pb-1 sm:pb-0">
                    {/* Search Bar */}
                    <div className="relative w-[160px] sm:w-[200px] shrink-0">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search lead or phone..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="h-9 pl-9 rounded-xl border-border/60 text-xs font-semibold bg-card w-full"
                        />
                    </div>

                    {/* Agent / Telecaller Filter (Admin / Owner view) */}
                    {isAdminOrOwner && (
                        <div className="w-[170px] sm:w-[200px] shrink-0">
                            <Select value={selectedAgentFilter} onValueChange={setSelectedAgentFilter}>
                                <SelectTrigger className="h-9 rounded-xl border-border/60 text-xs font-semibold bg-card">
                                    <div className="flex items-center gap-1.5 truncate">
                                        <UserCheck className="h-3.5 w-3.5 text-primary shrink-0" />
                                        <SelectValue placeholder="All Agents / Telecallers" />
                                    </div>
                                </SelectTrigger>
                                <SelectContent className="rounded-xl text-xs max-h-[260px]">
                                    <SelectItem value="all" className="text-xs font-bold">
                                        All Agents ({leads.length})
                                    </SelectItem>
                                    {agentList.map(a => (
                                        <SelectItem key={a.id} value={a.id} className="text-xs font-semibold">
                                            {a.name} ({a.count})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    {/* Web Lead Form Filter */}
                    <div className="w-[160px] sm:w-[195px] shrink-0">
                        <Select value={selectedFormFilter} onValueChange={setSelectedFormFilter}>
                            <SelectTrigger className="h-9 rounded-xl border-border/60 text-xs font-semibold bg-card">
                                <div className="flex items-center gap-1.5 truncate">
                                    <FileText className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                                    <SelectValue placeholder="All Sources & Forms" />
                                </div>
                            </SelectTrigger>
                            <SelectContent className="rounded-xl text-xs max-h-[260px]">
                                <SelectItem value="all" className="text-xs font-bold">
                                    All Leads ({leads.length})
                                </SelectItem>
                                {totalWebFormLeads > 0 && (
                                    <SelectItem value="any_form" className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                                        ⚡ All Web Forms ({totalWebFormLeads})
                                    </SelectItem>
                                )}
                                {formFilterList.map(f => (
                                    <SelectItem key={f.id} value={f.title} className="text-xs font-semibold">
                                        📝 {f.title} ({f.count})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>


                    <div className="flex bg-muted/40 rounded-xl p-1 border border-border/40">
                        <Button
                            variant={viewMode === 'kanban' ? 'secondary' : 'ghost'}
                            size="sm"
                            onClick={() => setViewMode('kanban')}
                            className={`h-7 px-3 rounded-lg font-bold text-xs ${viewMode === 'kanban' ? 'bg-background shadow-sm text-primary' : 'text-muted-foreground'}`}
                        >
                            <LayoutGrid className="mr-1.5 h-3.5 w-3.5" />
                            Kanban
                        </Button>
                        <Button
                            variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                            size="sm"
                            onClick={() => setViewMode('list')}
                            className={`h-7 px-3 rounded-lg font-bold text-xs ${viewMode === 'list' ? 'bg-background shadow-sm text-primary' : 'text-muted-foreground'}`}
                        >
                            <List className="mr-1.5 h-3.5 w-3.5" />
                            List
                        </Button>
                    </div>

                    <div className="flex gap-2">
                        {isAdminOrOwner && (
                            <Button
                                variant="outline"
                                onClick={() => setIsPerformanceDialogOpen(true)}
                                className="h-9 px-3 rounded-xl font-bold text-[10px] sm:text-xs border-primary/40 bg-primary/10 hover:bg-primary/20 text-primary shadow-xs"
                            >
                                <TrendingUp className="mr-1.5 h-3.5 w-3.5 text-primary" />
                                Agent Performance
                            </Button>
                        )}

                        <Button variant="outline" onClick={() => setIsLeadFormDialogOpen(true)} className="h-9 px-3 rounded-xl font-semibold text-[10px] sm:text-xs border-border/60">
                            <FileText className="mr-1 h-3.5 w-3.5 text-primary" />
                            Forms
                        </Button>

                        <Dialog open={isStageDialogOpen} onOpenChange={setIsStageDialogOpen}>
                            <DialogTrigger asChild>
                                <Button variant="outline" className="h-9 px-3 rounded-xl font-semibold text-[10px] sm:text-xs border-border/60">
                                    <Settings className="mr-1 h-3.5 w-3.5 text-primary" />
                                    Stages
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-sm rounded-2xl">
                                <DialogHeader>
                                    <DialogTitle className="font-bold text-xl">Pipeline Stages</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4 py-4">
                                    <div className="space-y-2">
                                        <Label className="text-xs font-bold uppercase tracking-wider text-primary">New Stage Name</Label>
                                        <Input
                                            value={newStage.label}
                                            onChange={(e) => setNewStage({ ...newStage, label: e.target.value })}
                                            placeholder="e.g., Qualified"
                                            className="rounded-lg border-border/40"
                                        />
                                    </div>
                                    <div className="grid grid-cols-4 gap-2">
                                        {COLOR_OPTIONS.map((color) => (
                                            <button
                                                key={color.value}
                                                onClick={() => setNewStage({ ...newStage, color: color.value })}
                                                className={`h-8 rounded-md ${color.value} ${newStage.color === color.value ? 'ring-2 ring-primary ring-offset-2' : ''} transition-all`}
                                            />
                                        ))}
                                    </div>
                                    <Button onClick={handleAddStage} className="w-full font-bold rounded-lg h-10 shadow-sm">ADD STAGE</Button>

                                    <div className="pt-4 border-t border-border/40">
                                        <h4 className="font-bold text-[10px] uppercase tracking-widest text-muted-foreground mb-3">Existing Stages (Reorder Sequence)</h4>
                                        <div className="space-y-2 max-h-[240px] overflow-y-auto pr-2 custom-scrollbar">
                                            {stages.map((s, idx) => (
                                                <div key={s.id} className="flex items-center justify-between p-2 rounded-lg border border-border/20 bg-muted/5 group hover:bg-muted/10 transition-all">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[10px] font-bold text-muted-foreground w-4">{idx + 1}.</span>
                                                        <div className={`w-2.5 h-2.5 rounded-full ${s.color}`} />
                                                        <span className="text-xs font-semibold uppercase tracking-wider">{s.label}</span>
                                                    </div>
                                                    <div className="flex items-center gap-0.5">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => handleMoveStage(idx, 'up')}
                                                            disabled={idx === 0}
                                                            className="h-7 w-7 p-0 rounded-md text-muted-foreground hover:text-primary disabled:opacity-30"
                                                            title="Move Up"
                                                        >
                                                            <ArrowUp className="h-3.5 w-3.5" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => handleMoveStage(idx, 'down')}
                                                            disabled={idx === stages.length - 1}
                                                            className="h-7 w-7 p-0 rounded-md text-muted-foreground hover:text-primary disabled:opacity-30"
                                                            title="Move Down"
                                                        >
                                                            <ArrowDown className="h-3.5 w-3.5" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => handleDeleteStage(s.id)}
                                                            disabled={stages.length <= 1}
                                                            className="h-7 w-7 p-0 rounded-md text-destructive hover:bg-destructive/10"
                                                            title="Delete Stage"
                                                        >
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </DialogContent>
                        </Dialog>

                        <Dialog open={isLeadDialogOpen} onOpenChange={setIsLeadDialogOpen}>
                            <DialogTrigger asChild>
                                <Button className="h-9 px-3 sm:px-4 rounded-xl font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-md text-[10px] sm:text-xs">
                                    <Plus className="mr-1 sm:mr-1.5 h-3.5 w-3.5" />
                                    Add Lead
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-md rounded-2xl">
                                <DialogHeader>
                                    <DialogTitle className="font-bold text-2xl tracking-tight pt-2">Add New Lead</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4 py-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1.5"><Label className="text-xs font-semibold text-primary uppercase ml-1">Contact Name</Label><Input value={newLead.name} onChange={(e) => setNewLead({ ...newLead, name: e.target.value })} placeholder="John Doe" className="rounded-lg h-10" /></div>
                                        <div className="space-y-1.5"><Label className="text-xs font-semibold text-primary uppercase ml-1">Company</Label><Input value={newLead.company} onChange={(e) => setNewLead({ ...newLead, company: e.target.value })} placeholder="Acme Corp" className="rounded-lg h-10" /></div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1.5"><Label className="text-xs font-semibold text-primary uppercase ml-1">Value</Label><Input type="number" value={newLead.value} onChange={(e) => setNewLead({ ...newLead, value: e.target.value })} placeholder="Ex: 50000" className="rounded-lg h-10" /></div>
                                        <div className="space-y-1.5"><Label className="text-xs font-semibold text-primary uppercase ml-1">Source</Label><Input value={newLead.source} onChange={(e) => setNewLead({ ...newLead, source: e.target.value })} placeholder="e.g. Website" className="rounded-lg h-10" /></div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1.5"><Label className="text-xs font-semibold text-primary uppercase ml-1">Project</Label><Input value={newLead.project} onChange={(e) => setNewLead({ ...newLead, project: e.target.value })} placeholder="e.g. Website" className="rounded-lg h-10" /></div>
                                        <div className="space-y-1.5"><Label className="text-xs font-semibold text-primary uppercase ml-1">Phone</Label><Input value={newLead.phone} onChange={(e) => setNewLead({ ...newLead, phone: e.target.value })} placeholder="+91 98765 43210" className="rounded-lg h-10" /></div>
                                    </div>

                                    {isAdminOrOwner && users && users.length > 0 && (
                                        <div className="space-y-1.5">
                                            <Label className="text-xs font-semibold text-primary uppercase ml-1">Assign to Telecaller / Agent</Label>
                                            <Select value={newLead.assignedTo} onValueChange={(val) => setNewLead({ ...newLead, assignedTo: val })}>
                                                <SelectTrigger className="rounded-lg h-10 text-xs font-semibold">
                                                    <SelectValue placeholder="Assign to Telecaller (or self)" />
                                                </SelectTrigger>
                                                <SelectContent className="rounded-xl">
                                                    {users.filter(u => u.role !== 'client').map(u => (
                                                        <SelectItem key={u.id || (u as any)._id} value={u.id || (u as any)._id} className="text-xs font-semibold">
                                                            {u.name} ({u.role})
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    )}

                                    <Button onClick={handleAddLead} className="w-full mt-2 font-bold rounded-lg h-11 tracking-wide">Create Lead</Button>
                                </div>
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>
            </div>


            {/* 2. Interactive Follow-up Counter Header Cards */}
            <LeadsKPI
                allLeads={userScopedLeads}
                selectedFollowUpFilter={selectedFollowUpFilter}
                onSelectFollowUpFilter={setSelectedFollowUpFilter}
            />

            {/* Active Filter Indicators Banner */}
            {(selectedFormFilter !== 'all' || (isAdminOrOwner && selectedAgentFilter !== 'all')) && (
                <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="font-extrabold text-foreground flex items-center gap-1.5">
                            <Filter className="h-3.5 w-3.5 text-indigo-600" />
                            Active Filters:
                        </span>

                        {selectedFormFilter !== 'all' && (
                            <Badge className="bg-indigo-600 text-white font-bold text-[10px] flex items-center gap-1">
                                📝 Form: {selectedFormFilter === 'any_form' ? 'All Web Forms' : selectedFormFilter}
                                <button 
                                    onClick={() => setSelectedFormFilter('all')} 
                                    className="ml-1 hover:text-rose-200"
                                    title="Clear form filter"
                                >
                                    ×
                                </button>
                            </Badge>
                        )}

                        {isAdminOrOwner && selectedAgentFilter !== 'all' && (
                            <Badge className="bg-primary text-primary-foreground font-bold text-[10px] flex items-center gap-1">
                                👤 Agent: {selectedAgentFilter}
                                <button 
                                    onClick={() => setSelectedAgentFilter('all')} 
                                    className="ml-1 hover:text-rose-200"
                                    title="Clear agent filter"
                                >
                                    ×
                                </button>
                            </Badge>
                        )}

                        <span className="text-muted-foreground text-[11px]">
                            Showing <strong>{filteredLeads.length}</strong> of <strong>{userScopedLeads.length}</strong> total leads
                        </span>
                    </div>

                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                            setSelectedFormFilter('all')
                            setSelectedAgentFilter('all')
                            setSearchQuery('')
                        }}
                        className="h-6 px-2 text-[10px] font-bold text-muted-foreground hover:text-destructive"
                    >
                        Reset All Filters
                    </Button>
                </div>
            )}

            {/* 3. Operational Viewport */}
            <div className="flex-1 min-h-0">
                {viewMode === 'kanban' ? (
                    <KanbanBoard
                        stages={stages}
                        leads={filteredLeads}
                        onDragStart={setDraggedLead}
                        onDrop={async (stageId) => draggedLead && updateLeadStage(draggedLead.id, stageId)}
                        onLeadClick={(l) => { setSelectedLead(l); setViewLeadDialogOpen(true); }}
                        onOpenFollowUp={handleOpenFollowUp}
                        onDeleteLead={deleteLead}
                        isAdminOrOwner={isAdminOrOwner}
                        onOpenAssignLead={handleOpenAssignLead}
                    />
                ) : (
                    <LeadsList
                        leads={filteredLeads}
                        stages={stages}
                        onLeadClick={(l) => { setSelectedLead(l); setViewLeadDialogOpen(true); }}
                        onOpenFollowUp={handleOpenFollowUp}
                        onDeleteLead={deleteLead}
                        isAdminOrOwner={isAdminOrOwner}
                        onOpenAssignLead={handleOpenAssignLead}
                        selectedLeadIds={selectedLeadIds}
                        onToggleSelectLead={handleToggleSelectLead}
                        onToggleSelectAll={handleToggleSelectAll}
                        onOpenBulkAssign={handleOpenBulkAssign}
                        users={users}
                    />
                )}
            </div>

            {/* 4. Global Dialogs */}
            <LeadDetailsDialog
                lead={selectedLead}
                isOpen={viewLeadDialogOpen}
                onClose={() => setViewLeadDialogOpen(false)}
                onUpdate={(updated) => { setSelectedLead(updated); setLeads(leads.map(l => l.id === updated.id ? updated : l)) }}
                onOpenFollowUp={handleOpenFollowUp}
                onDelete={deleteLead}
                onAddActivity={addActivity}
                isAdminOrOwner={isAdminOrOwner}
                users={users}
                onAssignLead={assignLead}
            />

            <FollowUpDialog
                lead={followUpLead}
                isOpen={isFollowUpModalOpen}
                onClose={() => { setIsFollowUpModalOpen(false); setFollowUpLead(null); }}
                stages={stages}
                onSaveFollowUp={logFollowUp}
            />

            <AssignLeadDialog
                open={isAssignDialogOpen}
                onOpenChange={setIsAssignDialogOpen}
                leadsToAssign={leadsToAssign}
                users={users}
                allLeads={leads}
                onConfirmAssign={handleConfirmAssign}
            />

            <LeadFormBuilder
                isOpen={isLeadFormDialogOpen}
                onClose={() => setIsLeadFormDialogOpen(false)}
                leadForms={leadForms}
                setLeadForms={setLeadForms}
                leads={leads}
                onSelectLead={(ld) => {
                    setIsLeadFormDialogOpen(false)
                    setSelectedLead(ld)
                }}
            />

            <TelecallerPerformanceDialog
                open={isPerformanceDialogOpen}
                onOpenChange={setIsPerformanceDialogOpen}
                onFilterByAgent={(agentName) => setSelectedAgentFilter(agentName)}
                onRefreshBoard={fetchData}
            />
        </div>
    )
}
