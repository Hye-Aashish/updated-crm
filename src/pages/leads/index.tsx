import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Plus, Settings, List, LayoutGrid, FileText, Trash2, CalendarClock, Search, ArrowUp, ArrowDown } from 'lucide-react'
import api from '@/lib/api-client'
import { useToast } from '@/hooks/use-toast'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

import { useLeadsData } from '@/hooks/use-leads-data'
import { LeadsKPI } from '@/components/leads/leads-kpi'
import { KanbanBoard } from '@/components/leads/kanban-board'
import { LeadsList } from '@/components/leads/leads-list'
import { LeadDetailsDialog } from '@/components/leads/lead-details-dialog'
import { LeadFormBuilder } from '@/components/leads/lead-form-builder'
import { FollowUpDialog } from '@/components/leads/follow-up-dialog'
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
    const {
        leads, stages, leadForms, setLeads, setStages, setLeadForms,
        updateLeadStage, deleteLead, addActivity, logFollowUp, reorderStages, fetchData, loading
    } = useLeadsData()

    const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban')
    const [draggedLead, setDraggedLead] = useState<Lead | null>(null)
    const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
    const [followUpLead, setFollowUpLead] = useState<Lead | null>(null)
    const [isFollowUpModalOpen, setIsFollowUpModalOpen] = useState<boolean>(false)

    // Filters state
    const [selectedTagFilter] = useState<string>('all')
    const [selectedFollowUpFilter, setSelectedFollowUpFilter] = useState<string>('all')
    const [searchQuery, setSearchQuery] = useState<string>('')

    // 1. Filter Leads
    const rawFilteredLeads = leads.filter(l => {
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
            matchesActivities = l.activities.some(a => a.content?.toLowerCase().includes(q) || a.outcome?.toLowerCase().includes(q))
        }
        
        const matchesSearch = !q || 
                              l.name?.toLowerCase().includes(q) || 
                              (cleanPhone && cleanQ && cleanPhone.includes(cleanQ)) || 
                              matchesCustomField || 
                              matchesActivities ||
                              l.company?.toLowerCase().includes(q) ||
                              l.email?.toLowerCase().includes(q)
        return matchesTag && matchesFollowUp && matchesSearch
    })

    // 2. Sort Leads by Follow-up Priority Rules (Overdue -> Today -> Upcoming -> No Follow-up)
    const filteredLeads = sortLeadsByFollowUpPriority(rawFilteredLeads)

    // Dialog States
    const [isLeadDialogOpen, setIsLeadDialogOpen] = useState(false)
    const [isStageDialogOpen, setIsStageDialogOpen] = useState(false)
    const [isLeadFormDialogOpen, setIsLeadFormDialogOpen] = useState(false)
    const [viewLeadDialogOpen, setViewLeadDialogOpen] = useState(false)

    // Form States
    const [newLead, setNewLead] = useState({ name: '', company: '', value: '', source: '', email: '', phone: '', project: '' })
    const [newStage, setNewStage] = useState({ label: '', color: 'bg-blue-500' })

    const handleAddLead = async () => {
        if (!newLead.name || !newLead.company) return
        try {
            const payload = {
                ...newLead,
                value: parseInt(newLead.value) || 0,
                source: newLead.source || 'Direct',
                stage: stages[0]?.id || 'new'
            }
            const res = await api.post('/leads', payload)
            setLeads([...leads, { id: res.data._id, _id: res.data._id, ...payload, activities: [], customFields: {} }])
            setNewLead({ name: '', company: '', value: '', source: '', email: '', phone: '', project: '' })
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
                    <div className="relative w-[180px] sm:w-[220px] shrink-0">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search lead or phone..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="h-9 pl-9 rounded-xl border-border/60 text-xs font-semibold bg-card w-full"
                        />
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
                                    <Button onClick={handleAddLead} className="w-full mt-2 font-bold rounded-lg h-11 tracking-wide">Create Lead</Button>
                                </div>
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>
            </div>

            {/* 2. Interactive Follow-up Counter Header Cards */}
            <LeadsKPI
                allLeads={leads}
                selectedFollowUpFilter={selectedFollowUpFilter}
                onSelectFollowUpFilter={setSelectedFollowUpFilter}
            />

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
                    />
                ) : (
                    <LeadsList
                        leads={filteredLeads}
                        stages={stages}
                        onLeadClick={(l) => { setSelectedLead(l); setViewLeadDialogOpen(true); }}
                        onOpenFollowUp={handleOpenFollowUp}
                        onDeleteLead={deleteLead}
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
            />

            <FollowUpDialog
                lead={followUpLead}
                isOpen={isFollowUpModalOpen}
                onClose={() => { setIsFollowUpModalOpen(false); setFollowUpLead(null); }}
                stages={stages}
                onSaveFollowUp={logFollowUp}
            />

            <LeadFormBuilder
                isOpen={isLeadFormDialogOpen}
                onClose={() => setIsLeadFormDialogOpen(false)}
                leadForms={leadForms}
                setLeadForms={setLeadForms}
            />
        </div>
    )
}
