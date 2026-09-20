import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Copy, Plus, Trash2, ExternalLink, Code, CheckCircle2, Settings } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import api from '@/lib/api-client'
import type { LeadForm } from '@/types'
import React from 'react'

interface LeadFormBuilderProps {
    isOpen: boolean
    onClose: () => void
    leadForms: LeadForm[]
    setLeadForms: React.Dispatch<React.SetStateAction<LeadForm[]>>
}

export function LeadFormBuilder({ isOpen, onClose, leadForms, setLeadForms }: LeadFormBuilderProps) {
    const { toast } = useToast()
    const [isBuildingForm, setIsBuildingForm] = useState(false)
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
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                <DialogHeader className="border-b pb-4 flex flex-row items-center justify-between">
                    <div>
                        <DialogTitle className="text-xl font-bold uppercase tracking-tight">Lead Capture Forms</DialogTitle>
                        <p className="text-xs text-muted-foreground mt-1">Create forms to capture leads from your website automatically.</p>
                    </div>
                    {!isBuildingForm && (
                        <Button onClick={() => { setCurrentForm(DEFAULT_FORM); setIsBuildingForm(true); }} className="rounded-lg font-bold">
                            <Plus className="mr-2 h-4 w-4" />
                            Create New Form
                        </Button>
                    )}
                    {isBuildingForm && (
                        <Button variant="ghost" onClick={() => { setIsBuildingForm(false); setCurrentForm(DEFAULT_FORM); }} className="rounded-lg font-semibold">Back to List</Button>
                    )}
                </DialogHeader>

                <div className="flex-1 overflow-y-auto py-6">
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
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            {leadForms.map((form: any) => (
                                <div key={form._id} className="group p-5 bg-card border border-border/60 rounded-2xl shadow-sm hover:shadow-md hover:border-primary/40 transition-all">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${form.isActive ? 'bg-emerald-500/10 text-emerald-600' : 'bg-muted text-muted-foreground'}`}>
                                            <CheckCircle2 className="h-5 w-5" />
                                        </div>
                                        <Badge variant={form.isActive ? "secondary" : "outline"} className="text-[9px] font-bold uppercase">
                                            {form.isActive ? 'Active' : 'Offline'}
                                        </Badge>
                                    </div>
                                    <h3 className="font-bold text-foreground mb-1 group-hover:text-primary transition-colors">{form.title}</h3>
                                    <p className="text-xs text-muted-foreground line-clamp-2 mb-6 h-8">{form.description || 'Standard lead capture form.'}</p>

                                    <div className="grid grid-cols-5 gap-2 mt-4">
                                        <Button variant="outline" size="icon" title="View Public Link" onClick={() => window.open(`${window.location.origin}/f/${form._id}`, '_blank')} className="h-8 w-full border-border/40 hover:bg-primary/5 hover:text-primary transition-all">
                                            <ExternalLink className="h-3.5 w-3.5" />
                                        </Button>
                                        <Button variant="outline" size="icon" title="Copy URL" onClick={() => copyToClipboard(`${window.location.origin}/f/${form._id}`, 'Link copied!')} className="h-8 w-full border-border/40 hover:bg-primary/5 hover:text-primary transition-all">
                                            <Copy className="h-3.5 w-3.5" />
                                        </Button>
                                        <Button variant="outline" size="icon" title="Get Embed Code" onClick={() => copyToClipboard(`<iframe src="${window.location.origin}/f/${form._id}" width="100%" height="800px" frameborder="0"></iframe>`, 'Embed code copied!')} className="h-8 w-full border-border/40 hover:bg-primary/5 hover:text-primary transition-all">
                                            <Code className="h-3.5 w-3.5" />
                                        </Button>
                                        <Button variant="outline" size="icon" title="Edit Form" onClick={() => { setCurrentForm(form); setIsBuildingForm(true); }} className="h-8 w-full border-border/40 hover:bg-amber-500/10 hover:text-amber-600 transition-all">
                                            <Settings className="h-3.5 w-3.5" />
                                        </Button>
                                        <Button variant="outline" size="icon" title="Delete Form" onClick={() => handleDeleteForm(form._id)} className="h-8 w-full border-border/40 hover:bg-destructive/10 hover:text-destructive transition-all">
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                            {leadForms.length === 0 && (
                                <div className="col-span-full py-12 text-center">
                                    <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4 opacity-50">
                                        <Plus className="h-8 w-8 text-muted-foreground" />
                                    </div>
                                    <p className="text-sm font-medium text-muted-foreground">No capture engines deployed yet.</p>
                                    <Button variant="link" onClick={() => setIsBuildingForm(true)} className="mt-2">Create your first form</Button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}
