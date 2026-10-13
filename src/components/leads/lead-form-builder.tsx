import { useState, useMemo } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { 
    Copy, Plus, Trash2, ExternalLink, Code, CheckCircle2, Settings, 
    TrendingUp, Users, DollarSign, Award, ChevronDown, ChevronUp, 
    Phone, Mail, ArrowUpRight, Sparkles 
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import api from '@/lib/api-client'
import type { LeadForm, Lead } from '@/types'
import React from 'react'

interface LeadFormBuilderProps {
    isOpen: boolean
    onClose: () => void
    leadForms: LeadForm[]
    setLeadForms: React.Dispatch<React.SetStateAction<LeadForm[]>>
    leads?: Lead[]
    onSelectLead?: (lead: Lead) => void
}

export function LeadFormBuilder({ 
    isOpen, 
    onClose, 
    leadForms, 
    setLeadForms,
    leads = [],
    onSelectLead
}: LeadFormBuilderProps) {
    const { toast } = useToast()
    const [isBuildingForm, setIsBuildingForm] = useState(false)
    const [expandedFormId, setExpandedFormId] = useState<string | null>(null)

    const DEFAULT_FORM: Partial<LeadForm> = {
        title: '',
        description: '',
        fields: [
            { id: 'name', label: 'Full Name', type: 'text', required: true, placeholder: 'Enter your name' },
            { id: 'email', label: 'Email Address', type: 'email', required: true, placeholder: 'your@email.com' }
        ],
        isActive: true
    }

    const [currentForm, setCurrentForm] = useState<Partial<LeadForm>>(DEFAULT_FORM)

    const [customFieldLabel, setCustomFieldLabel] = useState('')
    const [customFieldType, setCustomFieldType] = useState('text')
    const [customFieldOptions, setCustomFieldOptions] = useState('')

    // Per-form analytics calculation
    const formsWithStats = useMemo(() => {
        return leadForms.map((form: any) => {
            const formIdStr = String(form._id || '')
            const formTitleLower = (form.title || '').trim().toLowerCase()

            const matchingLeads = leads.filter(l => {
                if (l.formId && String(l.formId) === formIdStr) return true
                if (l.formTitle && l.formTitle.trim().toLowerCase() === formTitleLower) return true
                if (l.source && l.source.toLowerCase().includes(formTitleLower)) return true
                return false
            })

            const wonLeads = matchingLeads.filter(l => 
                (l.stage && l.stage.toLowerCase().includes('won')) || 
                (l.status && l.status.toLowerCase() === 'won')
            )
            const wonRevenue = wonLeads.reduce((acc, l) => acc + (Number(l.value) || 0), 0)
            const winRate = matchingLeads.length > 0 ? Math.round((wonLeads.length / matchingLeads.length) * 100) : 0

            return {
                form,
                matchingLeads,
                totalCount: matchingLeads.length,
                wonCount: wonLeads.length,
                wonRevenue,
                winRate
            }
        })
    }, [leadForms, leads])

    // Overall stats
    const totalCapturedLeads = useMemo(() => {
        return formsWithStats.reduce((sum, item) => sum + item.totalCount, 0)
    }, [formsWithStats])

    const totalWonRevenue = useMemo(() => {
        return formsWithStats.reduce((sum, item) => sum + item.wonRevenue, 0)
    }, [formsWithStats])

    const topPerformerTitle = useMemo(() => {
        if (formsWithStats.length === 0) return null
        const sorted = [...formsWithStats].sort((a, b) => (b.totalCount * 10 + b.wonCount * 20) - (a.totalCount * 10 + a.wonCount * 20))
        return sorted[0]?.totalCount > 0 ? sorted[0].form.title : null
    }, [formsWithStats])

    const handleAddCustomField = () => {
        if (!customFieldLabel.trim()) return
        const id = customFieldLabel.toLowerCase().replace(/\s+/g, '_')
        if (currentForm.fields?.some(f => f.id === id)) {
            toast({ title: 'Error', description: 'Field already exists', variant: 'destructive' })
            return
        }

        const options = customFieldType === 'select' || customFieldType === 'multiselect'
            ? customFieldOptions.split(',').map(o => o.trim()).filter(Boolean)
            : []

        setCurrentForm({
            ...currentForm,
            fields: [...(currentForm.fields || []), {
                id,
                label: customFieldLabel,
                type: customFieldType,
                required: false,
                placeholder: customFieldType === 'select' || customFieldType === 'multiselect' ? 'Select an option' : `Enter ${customFieldLabel}`,
                options: options.length > 0 ? options : undefined
            }]
        })
        setCustomFieldLabel('')
        setCustomFieldType('text')
        setCustomFieldOptions('')
    }

    const handleSaveForm = async () => {
        if (!currentForm.title) {
            toast({ title: 'Error', description: 'Form title is required', variant: 'destructive' })
            return
        }

        const formId = (currentForm as any)._id;

        try {
            if (formId) {
                // UPDATE existing form
                const res = await api.put(`/lead-forms/${formId}`, currentForm)
                if (res.data) {
                    setLeadForms((prev: LeadForm[]) => prev.map((f: LeadForm) => (f as any)._id === formId ? res.data : f))
                    toast({ title: 'Success', description: 'Lead form updated' })
                }
            } else {
                // CREATE new form
                const res = await api.post('/lead-forms', currentForm)
                if (res.data) {
                    setLeadForms((prev: LeadForm[]) => [res.data, ...prev])
                    toast({ title: 'Success', description: 'Lead form published' })
                }
            }

            setIsBuildingForm(false)
            setCurrentForm(DEFAULT_FORM)
        } catch (err: any) {
            console.error('Save Form Error:', err)
            toast({
                title: 'Error',
                description: err.response?.data?.message || 'Failed to save form',
                variant: 'destructive'
            })
        }
    }

    const handleDeleteForm = async (id: string) => {
        if (!confirm('Are you sure you want to delete this form?')) return
        try {
            await api.delete(`/lead-forms/${id}`)
            setLeadForms(leadForms.filter(f => (f as any)._id !== id))
            toast({ title: 'Success', description: 'Lead form deleted' })
        } catch (err) {
            toast({ title: 'Error', description: 'Failed to delete form', variant: 'destructive' })
        }
    }

    const copyToClipboard = (text: string, msg: string) => {
        navigator.clipboard.writeText(text)
        toast({ description: msg })
    }

    return (
        <Dialog open={isOpen} onOpenChange={(v) => !v && onClose()}>
            <DialogContent className="max-w-5xl max-h-[92vh] overflow-hidden flex flex-col p-6">
                <DialogHeader className="border-b pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                        <DialogTitle className="text-xl font-extrabold uppercase tracking-tight flex items-center gap-2">
                            <span>Lead Capture Forms & Engine</span>
                            <Badge variant="secondary" className="text-[10px] uppercase font-bold tracking-wider">
                                Inbound Tracking
                            </Badge>
                        </DialogTitle>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            Forms create karein, website par embed karein, aur track karein kis form se kitne leads aa rahe hain aur conversion kitna hai.
                        </p>
                    </div>
                    {!isBuildingForm && (
                        <Button 
                            onClick={() => { setCurrentForm(DEFAULT_FORM); setIsBuildingForm(true); }} 
                            className="rounded-xl font-bold bg-primary text-primary-foreground shadow-sm hover:shadow"
                        >
                            <Plus className="mr-2 h-4 w-4" />
                            Create New Form
                        </Button>
                    )}
                    {isBuildingForm && (
                        <Button variant="ghost" onClick={() => { setIsBuildingForm(false); setCurrentForm(DEFAULT_FORM); }} className="rounded-xl font-semibold">
                            Back to Forms List
                        </Button>
                    )}
                </DialogHeader>

                {/* Overall KPI Ribbon (when in list mode) */}
                {!isBuildingForm && leadForms.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-3 border-b border-border/50">
                        <div className="p-2.5 rounded-xl bg-muted/30 border border-border/40 flex items-center gap-3">
                            <div className="h-8 w-8 rounded-lg bg-indigo-500/10 text-indigo-600 flex items-center justify-center shrink-0">
                                <Code className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                                <span className="text-[10px] uppercase font-bold text-muted-foreground block">Active Forms</span>
                                <span className="font-extrabold text-foreground text-sm">{leadForms.length} Engine{leadForms.length > 1 ? 's' : ''}</span>
                            </div>
                        </div>

                        <div className="p-2.5 rounded-xl bg-muted/30 border border-border/40 flex items-center gap-3">
                            <div className="h-8 w-8 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
                                <Users className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                                <span className="text-[10px] uppercase font-bold text-muted-foreground block">Total Leads Captured</span>
                                <span className="font-extrabold text-blue-600 dark:text-blue-400 text-sm">{totalCapturedLeads} Leads</span>
                            </div>
                        </div>

                        <div className="p-2.5 rounded-xl bg-muted/30 border border-border/40 flex items-center gap-3">
                            <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                                <DollarSign className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                                <span className="text-[10px] uppercase font-bold text-muted-foreground block">Won Revenue</span>
                                <span className="font-extrabold text-emerald-600 dark:text-emerald-400 text-sm">₹{totalWonRevenue.toLocaleString('en-IN')}</span>
                            </div>
                        </div>

                        <div className="p-2.5 rounded-xl bg-muted/30 border border-border/40 flex items-center gap-3">
                            <div className="h-8 w-8 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
                                <Award className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                                <span className="text-[10px] uppercase font-bold text-muted-foreground block">Top Converting Form</span>
                                <span className="font-extrabold text-foreground text-xs truncate block" title={topPerformerTitle || 'None yet'}>
                                    {topPerformerTitle || 'Collecting data...'}
                                </span>
                            </div>
                        </div>
                    </div>
                )}

                <div className="flex-1 overflow-y-auto py-4 custom-scrollbar">
                    {isBuildingForm ? (
                        <div className="grid lg:grid-cols-2 gap-8">
                            {/* Editor */}
                            <div className="space-y-6 animate-in slide-in-from-left-4 duration-500">
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label className="text-xs font-bold uppercase tracking-wider">Form Title</Label>
                                        <Input
                                            value={currentForm.title}
                                            onChange={(e) => setCurrentForm({ ...currentForm, title: e.target.value })}
                                            placeholder="e.g., Website Contact Form"
                                            className="h-10"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs font-bold uppercase tracking-wider">Description (Optional)</Label>
                                        <Input
                                            value={currentForm.description}
                                            onChange={(e) => setCurrentForm({ ...currentForm, description: e.target.value })}
                                            placeholder="What is this form for?"
                                            className="h-10"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-4 pt-4 border-t">
                                    <h4 className="text-sm font-bold uppercase tracking-widest text-primary">Capture Fields</h4>
                                    <div className="space-y-2">
                                        {currentForm.fields?.map((field, idx) => (
                                            <div key={idx} className="flex items-center justify-between p-3 bg-muted/40 border border-border/40 rounded-lg group">
                                                <div className="flex items-center gap-3">
                                                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                                    <span className="text-sm font-medium">{field.label}</span>
                                                    <Badge variant="outline" className="text-[9px] uppercase font-bold">{field.type}</Badge>
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    disabled={field.id === 'name'}
                                                    onClick={() => setCurrentForm({ ...currentForm, fields: currentForm.fields?.filter((_, i) => i !== idx) })}
                                                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-4 pt-4 border-t p-4 bg-muted/20 rounded-lg border border-border/40">
                                    <h4 className="text-xs font-bold uppercase tracking-wider">Add Custom Field</h4>
                                    <div className="grid grid-cols-2 gap-3">
                                        <Input value={customFieldLabel} onChange={(e) => setCustomFieldLabel(e.target.value)} placeholder="Field Label (e.g. Budget)" className="h-9 rounded-md" />
                                        <Select value={customFieldType} onValueChange={setCustomFieldType}>
                                            <SelectTrigger className="h-9 rounded-md"><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="text">Short Text</SelectItem>
                                                <SelectItem value="number">Number</SelectItem>
                                                <SelectItem value="email">Email</SelectItem>
                                                <SelectItem value="select">Dropdown</SelectItem>
                                                <SelectItem value="textarea">Long Text</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    {(customFieldType === 'select') && (
                                        <Input value={customFieldOptions} onChange={(e) => setCustomFieldOptions(e.target.value)} placeholder="Options (comma separated)" className="h-9 rounded-md" />
                                    )}
                                    <Button onClick={handleAddCustomField} variant="secondary" className="w-full h-9 font-bold text-xs">
                                        ADD FIELD
                                    </Button>
                                </div>

                                <Button onClick={handleSaveForm} className="w-full h-11 font-bold text-sm uppercase tracking-widest shadow-md">
                                    Publish Form
                                </Button>
                            </div>

                            {/* Preview */}
                            <div className="bg-card border-l h-full p-6 animate-in fade-in duration-700">
                                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-6 text-center">Live Preview</h4>
                                <div className="border rounded-2xl p-6 shadow-sm max-w-sm mx-auto bg-background/50 backdrop-blur-sm">
                                    <h3 className="text-lg font-bold mb-2">{currentForm.title || 'Form Preview'}</h3>
                                    <p className="text-sm text-muted-foreground mb-6">{currentForm.description || 'Fill out the form below.'}</p>
                                    <div className="space-y-4">
                                        {currentForm.fields?.map((f, i) => (
                                            <div key={i} className="space-y-1.5">
                                                <Label className="text-xs font-semibold">{f.label}</Label>
                                                <div className="h-9 bg-muted/30 border rounded-md" />
                                            </div>
                                        ))}
                                        <Button className="w-full h-10 mt-4 pointer-events-none opacity-80">Submit Request</Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            {formsWithStats.map(({ form, matchingLeads, totalCount, wonCount, wonRevenue, winRate }) => {
                                const isExpanded = expandedFormId === form._id
                                const isTopForm = topPerformerTitle && form.title === topPerformerTitle && totalCount > 0

                                return (
                                    <div 
                                        key={form._id} 
                                        className={`group p-4 bg-card border rounded-2xl shadow-xs hover:shadow-md transition-all flex flex-col justify-between ${
                                            isTopForm ? 'border-primary/50 shadow-primary/5 ring-1 ring-primary/20' : 'border-border/60 hover:border-primary/30'
                                        }`}
                                    >
                                        <div className="space-y-3">
                                            {/* Card Top: Status & Badges */}
                                            <div className="flex justify-between items-center gap-2">
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <div className={`h-8 w-8 rounded-xl flex items-center justify-center shrink-0 ${
                                                        form.isActive ? 'bg-emerald-500/10 text-emerald-600' : 'bg-muted text-muted-foreground'
                                                    }`}>
                                                        <CheckCircle2 className="h-4 w-4" />
                                                    </div>
                                                    <Badge variant={form.isActive ? "secondary" : "outline"} className="text-[9px] font-bold uppercase">
                                                        {form.isActive ? 'Active' : 'Offline'}
                                                    </Badge>
                                                </div>

                                                {isTopForm ? (
                                                    <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 text-[9px] font-bold flex items-center gap-1 shrink-0">
                                                        <Sparkles className="h-2.5 w-2.5" />
                                                        Top Performer
                                                    </Badge>
                                                ) : totalCount > 0 ? (
                                                    <Badge variant="outline" className="text-[9px] font-bold text-muted-foreground shrink-0">
                                                        {winRate}% Win Rate
                                                    </Badge>
                                                ) : null}
                                            </div>

                                            {/* Form Info */}
                                            <div>
                                                <h3 className="font-extrabold text-foreground text-base group-hover:text-primary transition-colors truncate" title={form.title}>
                                                    {form.title}
                                                </h3>
                                                <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5" title={form.description}>
                                                    {form.description || 'Standard lead capture form.'}
                                                </p>
                                            </div>

                                            {/* Live Performance Stats for this form */}
                                            <div className="p-3 rounded-xl bg-muted/20 border border-border/40 space-y-2">
                                                <div className="flex items-center justify-between text-[11px] font-bold">
                                                    <span className="text-muted-foreground flex items-center gap-1">
                                                        <Users className="h-3 w-3 text-indigo-500" /> Leads Captured:
                                                    </span>
                                                    <span className="text-indigo-600 dark:text-indigo-400 font-extrabold">
                                                        {totalCount} {totalCount === 1 ? 'Lead' : 'Leads'}
                                                    </span>
                                                </div>

                                                <div className="flex items-center justify-between text-[11px] font-bold">
                                                    <span className="text-muted-foreground flex items-center gap-1">
                                                        <DollarSign className="h-3 w-3 text-emerald-500" /> Deals Won:
                                                    </span>
                                                    <span className="text-emerald-600 dark:text-emerald-400 font-extrabold">
                                                        {wonCount} (₹{wonRevenue.toLocaleString('en-IN')})
                                                    </span>
                                                </div>

                                                <div className="flex items-center justify-between text-[11px] font-bold">
                                                    <span className="text-muted-foreground flex items-center gap-1">
                                                        <TrendingUp className="h-3 w-3 text-primary" /> Conversion Rate:
                                                    </span>
                                                    <span className="text-foreground font-extrabold">
                                                        {winRate}%
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Captured Leads Drawer / Expandable List */}
                                            {totalCount > 0 && (
                                                <div className="space-y-1.5 pt-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => setExpandedFormId(isExpanded ? null : form._id)}
                                                        className="w-full h-7 px-2 text-[10.5px] font-bold text-primary hover:bg-primary/5 flex items-center justify-between"
                                                    >
                                                        <span>{isExpanded ? 'Hide Captured Leads' : `View Captured Leads (${totalCount})`}</span>
                                                        {isExpanded ? <ChevronUp className="h-3.5 w-3.5 ml-1" /> : <ChevronDown className="h-3.5 w-3.5 ml-1" />}
                                                    </Button>

                                                    {isExpanded && (
                                                        <div className="space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar p-1 bg-background/80 rounded-xl border border-border/40">
                                                            {matchingLeads.map((ld) => (
                                                                <div
                                                                    key={ld.id}
                                                                    onClick={() => onSelectLead && onSelectLead(ld)}
                                                                    className="p-2 rounded-lg bg-card border border-border/30 hover:border-primary/50 transition-colors flex items-center justify-between gap-2 cursor-pointer group/lead"
                                                                >
                                                                    <div className="min-w-0">
                                                                        <span className="font-bold text-[11px] text-foreground group-hover/lead:text-primary transition-colors truncate block">
                                                                            {ld.name}
                                                                        </span>
                                                                        <span className="text-[9.5px] text-muted-foreground truncate block">
                                                                            {ld.company || ld.phone || ld.email || 'Web Submission'}
                                                                        </span>
                                                                    </div>
                                                                    <div className="text-right shrink-0">
                                                                        <Badge variant="outline" className="text-[8.5px] uppercase font-bold py-0 block">
                                                                            {ld.stage}
                                                                        </Badge>
                                                                        <span className="text-[8.5px] text-muted-foreground block mt-0.5">
                                                                            {ld.assignedToName ? `Agent: ${ld.assignedToName}` : 'Unassigned'}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {totalCount === 0 && (
                                                <div className="text-center py-2 px-3 bg-muted/10 rounded-xl border border-border/20 text-[10.5px] text-muted-foreground">
                                                    Abhi tak is form se koi lead capture nahi hui hai.
                                                </div>
                                            )}
                                        </div>

                                        {/* Action buttons bar */}
                                        <div className="grid grid-cols-5 gap-1.5 pt-3 mt-3 border-t border-border/30">
                                            <Button 
                                                variant="outline" 
                                                size="icon" 
                                                title="View Public Form" 
                                                onClick={() => window.open(`${window.location.origin}/f/${form._id}`, '_blank')} 
                                                className="h-8 w-full rounded-lg border-border/40 hover:bg-primary/5 hover:text-primary transition-all"
                                            >
                                                <ExternalLink className="h-3.5 w-3.5" />
                                            </Button>
                                            <Button 
                                                variant="outline" 
                                                size="icon" 
                                                title="Copy Form URL" 
                                                onClick={() => copyToClipboard(`${window.location.origin}/f/${form._id}`, 'Form link copied to clipboard!')} 
                                                className="h-8 w-full rounded-lg border-border/40 hover:bg-primary/5 hover:text-primary transition-all"
                                            >
                                                <Copy className="h-3.5 w-3.5" />
                                            </Button>
                                            <Button 
                                                variant="outline" 
                                                size="icon" 
                                                title="Get Embed Code" 
                                                onClick={() => copyToClipboard(`<iframe src="${window.location.origin}/f/${form._id}" width="100%" height="800px" frameborder="0"></iframe>`, 'Embed iframe code copied!')} 
                                                className="h-8 w-full rounded-lg border-border/40 hover:bg-primary/5 hover:text-primary transition-all"
                                            >
                                                <Code className="h-3.5 w-3.5" />
                                            </Button>
                                            <Button 
                                                variant="outline" 
                                                size="icon" 
                                                title="Edit Form Fields" 
                                                onClick={() => { setCurrentForm(form); setIsBuildingForm(true); }} 
                                                className="h-8 w-full rounded-lg border-border/40 hover:bg-amber-500/10 hover:text-amber-600 transition-all"
                                            >
                                                <Settings className="h-3.5 w-3.5" />
                                            </Button>
                                            <Button 
                                                variant="outline" 
                                                size="icon" 
                                                title="Delete Form" 
                                                onClick={() => handleDeleteForm(form._id)} 
                                                className="h-8 w-full rounded-lg border-border/40 hover:bg-destructive/10 hover:text-destructive transition-all"
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </Button>
                                        </div>
                                    </div>
                                )
                            })}

                            {leadForms.length === 0 && (
                                <div className="col-span-full py-12 text-center">
                                    <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4 opacity-50">
                                        <Plus className="h-8 w-8 text-muted-foreground" />
                                    </div>
                                    <p className="text-sm font-medium text-muted-foreground">No capture forms deployed yet.</p>
                                    <Button variant="link" onClick={() => setIsBuildingForm(true)} className="mt-2 font-bold">
                                        Create your first lead capture form
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}

