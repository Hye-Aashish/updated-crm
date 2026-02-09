import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Plus, Settings, List, LayoutGrid, FileText, Trash2 } from 'lucide-react'
import api from '@/lib/api-client'
import { useToast } from '@/hooks/use-toast'

import { useLeadsData } from '@/hooks/use-leads-data'
import { LeadsKPI } from '@/components/leads/leads-kpi'
import { KanbanBoard } from '@/components/leads/kanban-board'
import { LeadsList } from '@/components/leads/leads-list'
import { LeadDetailsDialog } from '@/components/leads/lead-details-dialog'
import { LeadFormBuilder } from '@/components/leads/lead-form-builder'
import type { Lead } from '@/types'

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
        updateLeadStage, deleteLead, addActivity, fetchData
    } = useLeadsData()

    const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban')
    const [draggedLead, setDraggedLead] = useState<Lead | null>(null)
    const [selectedLead, setSelectedLead] = useState<Lead | null>(null)

    // Dialog States
    const [isLeadDialogOpen, setIsLeadDialogOpen] = useState(false)
    const [isStageDialogOpen, setIsStageDialogOpen] = useState(false)
    const [isLeadFormDialogOpen, setIsLeadFormDialogOpen] = useState(false)
    const [viewLeadDialogOpen, setViewLeadDialogOpen] = useState(false)

    // Form States
    const [newLead, setNewLead] = useState({ name: '', company: '', value: '', source: '', email: '', phone: '' })
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
            setLeads([...leads, { id: res.data._id, ...payload, activities: [], customFields: {} }])
            setNewLead({ name: '', company: '', value: '', source: '', email: '', phone: '' })
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

    return (
        <div className="space-y-6 h-[calc(100vh-100px)] flex flex-col font-sans pb-10">
            {/* 1. Header Navigation */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 flex-shrink-0">
                <div className="space-y-1">
                    <h1 className="text-2xl font-bold tracking-tight text-foreground uppercase">
                        Lead Pipeline
                    </h1>
                    <p className="text-sm text-muted-foreground font-medium">
                        Manage your sales pipeline and track conversion stages
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex bg-muted/30 rounded-lg p-1 border border-border/40">
                        <Button
                            variant={viewMode === 'kanban' ? 'secondary' : 'ghost'}
                            size="sm"
                            onClick={() => setViewMode('kanban')}
                            className={`h-8 px-4 rounded-md font-semibold ${viewMode === 'kanban' ? 'bg-background shadow-sm text-primary' : 'text-muted-foreground'}`}
                        >
                            <LayoutGrid className="mr-2 h-4 w-4" />
                            Kanban
                        </Button>
                        <Button
                            variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                            size="sm"
                            onClick={() => setViewMode('list')}
                            className={`h-8 px-4 rounded-md font-semibold ${viewMode === 'list' ? 'bg-background shadow-sm text-primary' : 'text-muted-foreground'}`}
                        >
                            <List className="mr-2 h-4 w-4" />
                            List
                        </Button>
                    </div>

                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => setIsLeadFormDialogOpen(true)} className="h-9 px-4 rounded-lg font-semibold text-xs border-border/60">
                            <FileText className="mr-2 h-4 w-4 text-primary" />
                            Web Forms
                        </Button>

                        <Dialog open={isStageDialogOpen} onOpenChange={setIsStageDialogOpen}>
                            <DialogTrigger asChild>
                                <Button variant="outline" className="h-9 px-4 rounded-lg font-semibold text-xs border-border/60">
                                    <Settings className="mr-2 h-4 w-4 text-primary" />
                                    Stages
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-sm rounded-xl">
                                <DialogHeader>
                                    <DialogTitle className="font-bold text-xl uppercase">Pipeline Stages</DialogTitle>
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
                                        <h4 className="font-bold text-[10px] uppercase tracking-widest text-muted-foreground mb-3">Existing Stages</h4>
                                        <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                                            {stages.map((s) => (
                                                <div key={s.id} className="flex items-center justify-between p-2 rounded-lg border border-border/20 bg-muted/5 group hover:bg-muted/10 transition-all">
                                                    <div className="flex items-center gap-2">
                                                        <div className={`w-2 h-2 rounded-full ${s.color}`} />
                                                        <span className="text-[11px] font-bold uppercase tracking-tight">{s.label}</span>
                                                    </div>
                                                    <Button variant="ghost" size="sm" onClick={() => handleDeleteStage(s.id)} disabled={stages.length <= 1} className="h-7 w-7 rounded-md text-destructive">
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </DialogContent>
                        </Dialog>

                        <Dialog open={isLeadDialogOpen} onOpenChange={setIsLeadDialogOpen}>
                            <DialogTrigger asChild>
                                <Button className="h-9 px-4 rounded-lg font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-md">
                                    <Plus className="mr-2 h-4 w-4" />
                                    Add Lead
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-md rounded-xl">
                                <DialogHeader>
                                    <DialogTitle className="font-bold text-2xl uppercase tracking-tight pt-2">Add New Lead</DialogTitle>
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
                                    <div className="space-y-1.5"><Label className="text-xs font-semibold text-primary uppercase ml-1">Email</Label><Input value={newLead.email} onChange={(e) => setNewLead({ ...newLead, email: e.target.value })} placeholder="john@example.com" className="rounded-lg h-10" /></div>
                                    <Button onClick={handleAddLead} className="w-full mt-2 font-bold rounded-lg h-11 uppercase tracking-wider">Create Lead</Button>
                                </div>
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>
            </div>

            {/* 2. Intelligence Metrics */}
            <LeadsKPI leads={leads} />

            {/* 3. Operational Viewport */}
            <div className="flex-1 min-h-0">
                {viewMode === 'kanban' ? (
                    <KanbanBoard
                        stages={stages}
                        leads={leads}
                        onDragStart={setDraggedLead}
                        onDrop={async (stageId) => draggedLead && updateLeadStage(draggedLead.id, stageId)}
                        onLeadClick={(l) => { setSelectedLead(l); setViewLeadDialogOpen(true); }}
                        onDeleteLead={deleteLead}
                    />
                ) : (
                    <LeadsList
                        leads={leads}
                        stages={stages}
                        onLeadClick={(l) => { setSelectedLead(l); setViewLeadDialogOpen(true); }}
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
                onDelete={deleteLead}
                onAddActivity={addActivity}
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
