import { useState, useEffect } from 'react'
import {
    Dialog, DialogContent, DialogHeader, DialogTitle,
    DialogDescription, DialogFooter
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
    Settings, Plus, Trash2, CheckCircle2, FileText,
    ListFilter, Loader2, Sparkles
} from 'lucide-react'
import api from '@/lib/api-client'
import { useToast } from '@/hooks/use-toast'

interface FormCustomizerProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSaved?: () => void
}

export function OnboardingFormCustomizer({ open, onOpenChange, onSaved }: FormCustomizerProps) {
    const { toast } = useToast()
    const [loading, setLoading] = useState(false)
    const [saving, setSaving] = useState(false)

    const [formConfig, setFormConfig] = useState<any>({
        title: '',
        description: '',
        instructions: '',
        fields: [],
        requiredDocuments: []
    })

    // State for new custom field modal / row
    const [newFieldName, setNewFieldName] = useState('')
    const [newFieldCategory, setNewFieldCategory] = useState('personal')
    const [newFieldType, setNewFieldType] = useState('text')
    const [newFieldRequired, setNewFieldRequired] = useState(false)

    // State for new custom doc requirement
    const [newDocName, setNewDocName] = useState('')
    const [newDocDesc, setNewDocDesc] = useState('')
    const [newDocRequired, setNewDocRequired] = useState(false)

    useEffect(() => {
        if (open) {
            fetchConfig()
        }
    }, [open])

    const fetchConfig = async () => {
        try {
            setLoading(true)
            const res = await api.get('/candidates/forms/config')
            setFormConfig(res.data)
        } catch (err: any) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: err.response?.data?.message || 'Failed to fetch form configuration'
            })
        } finally {
            setLoading(false)
        }
    }

    const handleSave = async () => {
        try {
            setSaving(true)
            await api.put('/candidates/forms/config', formConfig)
            toast({
                title: 'Success',
                description: 'Onboarding form template & document requirements updated.'
            })
            if (onSaved) onSaved()
            onOpenChange(false)
        } catch (err: any) {
            toast({
                variant: 'destructive',
                title: 'Failed to save',
                description: err.response?.data?.message || err.message
            })
        } finally {
            setSaving(false)
        }
    }

    const toggleFieldEnabled = (index: number) => {
        const updated = [...formConfig.fields]
        updated[index].enabled = !updated[index].enabled
        setFormConfig({ ...formConfig, fields: updated })
    }

    const toggleFieldRequired = (index: number) => {
        const updated = [...formConfig.fields]
        updated[index].required = !updated[index].required
        setFormConfig({ ...formConfig, fields: updated })
    }

    const removeField = (index: number) => {
        const updated = formConfig.fields.filter((_: any, i: number) => i !== index)
        setFormConfig({ ...formConfig, fields: updated })
    }

    const addCustomField = () => {
        if (!newFieldName.trim()) return
        const newField = {
            id: 'custom_' + Date.now(),
            label: newFieldName.trim(),
            type: newFieldType,
            category: newFieldCategory,
            required: newFieldRequired,
            enabled: true
        }
        setFormConfig({
            ...formConfig,
            fields: [...formConfig.fields, newField]
        })
        setNewFieldName('')
        setNewFieldRequired(false)
    }

    const toggleDocEnabled = (index: number) => {
        const updated = [...formConfig.requiredDocuments]
        updated[index].enabled = !updated[index].enabled
        setFormConfig({ ...formConfig, requiredDocuments: updated })
    }

    const toggleDocRequired = (index: number) => {
        const updated = [...formConfig.requiredDocuments]
        updated[index].required = !updated[index].required
        setFormConfig({ ...formConfig, requiredDocuments: updated })
    }

    const removeDoc = (index: number) => {
        const updated = formConfig.requiredDocuments.filter((_: any, i: number) => i !== index)
        setFormConfig({ ...formConfig, requiredDocuments: updated })
    }

    const addCustomDoc = () => {
        if (!newDocName.trim()) return
        const newDoc = {
            id: 'doc_' + Date.now(),
            name: newDocName.trim(),
            description: newDocDesc.trim(),
            required: newDocRequired,
            enabled: true
        }
        setFormConfig({
            ...formConfig,
            requiredDocuments: [...formConfig.requiredDocuments, newDoc]
        })
        setNewDocName('')
        setNewDocDesc('')
        setNewDocRequired(false)
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
                <DialogHeader className="px-6 pt-6 pb-2 border-b">
                    <DialogTitle className="text-lg flex items-center gap-2">
                        <Settings className="h-5 w-5 text-primary" /> Customize Candidate Onboarding Form
                    </DialogTitle>
                    <DialogDescription className="text-xs">
                        Configure which details and documents candidates must provide before receiving their Offer Letter.
                    </DialogDescription>
                </DialogHeader>

                {loading ? (
                    <div className="p-12 text-center text-sm text-slate-500 flex items-center justify-center gap-2">
                        <Loader2 className="h-5 w-5 animate-spin text-primary" /> Loading form template...
                    </div>
                ) : (
                    <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
                        <Tabs defaultValue="fields" className="w-full">
                            <TabsList className="grid grid-cols-3 mb-4">
                                <TabsTrigger value="fields" className="text-xs">
                                    <ListFilter className="h-3.5 w-3.5 mr-1.5" /> Form Fields ({formConfig.fields?.length || 0})
                                </TabsTrigger>
                                <TabsTrigger value="documents" className="text-xs">
                                    <FileText className="h-3.5 w-3.5 mr-1.5" /> Document Checklist ({formConfig.requiredDocuments?.length || 0})
                                </TabsTrigger>
                                <TabsTrigger value="general" className="text-xs">
                                    <Sparkles className="h-3.5 w-3.5 mr-1.5" /> Instructions & Branding
                                </TabsTrigger>
                            </TabsList>

                            {/* 1. FORM FIELDS TAB */}
                            <TabsContent value="fields" className="space-y-4">
                                <div className="border rounded-lg overflow-hidden">
                                    <div className="bg-slate-50 px-4 py-2.5 border-b text-xs font-semibold text-slate-700 grid grid-cols-12 gap-2 items-center">
                                        <div className="col-span-6">Field Name / Label</div>
                                        <div className="col-span-2">Category</div>
                                        <div className="col-span-2 text-center">Required</div>
                                        <div className="col-span-2 text-right">Enabled</div>
                                    </div>
                                    <div className="divide-y divide-slate-100 max-h-[320px] overflow-y-auto">
                                        {formConfig.fields?.map((f: any, idx: number) => (
                                            <div key={f.id || idx} className="px-4 py-2.5 text-xs grid grid-cols-12 gap-2 items-center hover:bg-slate-50/60">
                                                <div className="col-span-6 flex items-center gap-2">
                                                    <span className="font-medium text-slate-800">{f.label}</span>
                                                    <Badge variant="outline" className="text-[10px] py-0 px-1.5">{f.type}</Badge>
                                                </div>
                                                <div className="col-span-2">
                                                    <Badge variant="secondary" className="text-[10px] capitalize">{f.category || 'personal'}</Badge>
                                                </div>
                                                <div className="col-span-2 text-center">
                                                    <input
                                                        type="checkbox"
                                                        checked={f.required}
                                                        onChange={() => toggleFieldRequired(idx)}
                                                        className="rounded border-slate-300 text-primary cursor-pointer"
                                                    />
                                                </div>
                                                <div className="col-span-2 flex items-center justify-end gap-2">
                                                    <input
                                                        type="checkbox"
                                                        checked={f.enabled}
                                                        onChange={() => toggleFieldEnabled(idx)}
                                                        className="rounded border-slate-300 text-primary cursor-pointer"
                                                    />
                                                    {f.id?.startsWith('custom_') && (
                                                        <button
                                                            type="button"
                                                            onClick={() => removeField(idx)}
                                                            className="text-slate-400 hover:text-red-500 p-1"
                                                        >
                                                            <Trash2 className="h-3 w-3" />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Add Custom Field Box */}
                                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-2">
                                    <div className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                                        <Plus className="h-3.5 w-3.5 text-primary" /> Add Custom Form Field
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                                        <div className="sm:col-span-5">
                                            <Input
                                                value={newFieldName}
                                                onChange={e => setNewFieldName(e.target.value)}
                                                placeholder="e.g. LinkedIn Profile URL"
                                                className="text-xs h-8"
                                            />
                                        </div>
                                        <div className="sm:col-span-2">
                                            <select
                                                value={newFieldType}
                                                onChange={e => setNewFieldType(e.target.value)}
                                                className="w-full h-8 rounded-md border border-input bg-background px-2 text-xs"
                                            >
                                                <option value="text">Text</option>
                                                <option value="number">Number</option>
                                                <option value="date">Date</option>
                                                <option value="url">URL / Link</option>
                                                <option value="file">File Upload</option>
                                            </select>
                                        </div>
                                        <div className="sm:col-span-2">
                                            <select
                                                value={newFieldCategory}
                                                onChange={e => setNewFieldCategory(e.target.value)}
                                                className="w-full h-8 rounded-md border border-input bg-background px-2 text-xs"
                                            >
                                                <option value="personal">Personal</option>
                                                <option value="address">Address</option>
                                                <option value="education">Education</option>
                                                <option value="bank">Bank / Statutory</option>
                                                <option value="other">Other</option>
                                            </select>
                                        </div>
                                        <div className="sm:col-span-2 flex items-center gap-1.5">
                                            <label className="text-[11px] text-slate-600 flex items-center gap-1 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={newFieldRequired}
                                                    onChange={e => setNewFieldRequired(e.target.checked)}
                                                    className="rounded border-slate-300 text-primary"
                                                />
                                                Required
                                            </label>
                                        </div>
                                        <div className="sm:col-span-2">
                                            <Button type="button" onClick={addCustomField} size="sm" className="w-full h-8 text-xs">
                                                Add
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </TabsContent>

                            {/* 2. REQUIRED DOCUMENTS TAB */}
                            <TabsContent value="documents" className="space-y-4">
                                <div className="border rounded-lg overflow-hidden">
                                    <div className="bg-slate-50 px-4 py-2.5 border-b text-xs font-semibold text-slate-700 grid grid-cols-12 gap-2 items-center">
                                        <div className="col-span-7">Document Name & Description</div>
                                        <div className="col-span-3 text-center">Required (Mandatory)</div>
                                        <div className="col-span-2 text-right">Enabled</div>
                                    </div>
                                    <div className="divide-y divide-slate-100 max-h-[320px] overflow-y-auto">
                                        {formConfig.requiredDocuments?.map((d: any, idx: number) => (
                                            <div key={d.id || idx} className="px-4 py-2.5 text-xs grid grid-cols-12 gap-2 items-center hover:bg-slate-50/60">
                                                <div className="col-span-7">
                                                    <div className="font-semibold text-slate-800">{d.name}</div>
                                                    {d.description && <div className="text-[11px] text-slate-500">{d.description}</div>}
                                                </div>
                                                <div className="col-span-3 text-center">
                                                    <input
                                                        type="checkbox"
                                                        checked={d.required}
                                                        onChange={() => toggleDocRequired(idx)}
                                                        className="rounded border-slate-300 text-primary cursor-pointer"
                                                    />
                                                </div>
                                                <div className="col-span-2 flex items-center justify-end gap-2">
                                                    <input
                                                        type="checkbox"
                                                        checked={d.enabled}
                                                        onChange={() => toggleDocEnabled(idx)}
                                                        className="rounded border-slate-300 text-primary cursor-pointer"
                                                    />
                                                    {d.id?.startsWith('doc_') && (
                                                        <button
                                                            type="button"
                                                            onClick={() => removeDoc(idx)}
                                                            className="text-slate-400 hover:text-red-500 p-1"
                                                        >
                                                            <Trash2 className="h-3 w-3" />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Add Custom Document Box */}
                                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-2">
                                    <div className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                                        <Plus className="h-3.5 w-3.5 text-primary" /> Add Document Requirement
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                                        <div className="sm:col-span-5">
                                            <Input
                                                value={newDocName}
                                                onChange={e => setNewDocName(e.target.value)}
                                                placeholder="Document Title (e.g. Relieving Letter)"
                                                className="text-xs h-8"
                                            />
                                        </div>
                                        <div className="sm:col-span-4">
                                            <Input
                                                value={newDocDesc}
                                                onChange={e => setNewDocDesc(e.target.value)}
                                                placeholder="Short instruction for candidate"
                                                className="text-xs h-8"
                                            />
                                        </div>
                                        <div className="sm:col-span-2 flex items-center gap-1">
                                            <label className="text-[11px] text-slate-600 flex items-center gap-1 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={newDocRequired}
                                                    onChange={e => setNewDocRequired(e.target.checked)}
                                                    className="rounded border-slate-300 text-primary"
                                                />
                                                Mandatory
                                            </label>
                                        </div>
                                        <div className="sm:col-span-1">
                                            <Button type="button" onClick={addCustomDoc} size="sm" className="w-full h-8 text-xs p-0">
                                                Add
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </TabsContent>

                            {/* 3. INSTRUCTIONS & GENERAL TAB */}
                            <TabsContent value="general" className="space-y-4">
                                <div>
                                    <Label className="text-xs font-semibold">Form Title</Label>
                                    <Input
                                        value={formConfig.title || ''}
                                        onChange={e => setFormConfig({ ...formConfig, title: e.target.value })}
                                        placeholder="Candidate Onboarding Form"
                                        className="text-xs mt-1"
                                    />
                                </div>

                                <div>
                                    <Label className="text-xs font-semibold">Subtitle / Description</Label>
                                    <Textarea
                                        value={formConfig.description || ''}
                                        onChange={e => setFormConfig({ ...formConfig, description: e.target.value })}
                                        placeholder="Explanation of onboarding purpose"
                                        rows={2}
                                        className="text-xs mt-1"
                                    />
                                </div>

                                <div>
                                    <Label className="text-xs font-semibold">Instructions for Candidates</Label>
                                    <Textarea
                                        value={formConfig.instructions || ''}
                                        onChange={e => setFormConfig({ ...formConfig, instructions: e.target.value })}
                                        placeholder="Guidelines regarding clear scans, verification, etc."
                                        rows={3}
                                        className="text-xs mt-1"
                                    />
                                </div>
                            </TabsContent>
                        </Tabs>
                    </div>
                )}

                <DialogFooter className="px-6 py-3 border-t bg-slate-50 flex items-center justify-between">
                    <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button
                        size="sm"
                        onClick={handleSave}
                        disabled={saving || loading}
                        className="bg-primary text-white font-semibold text-xs"
                    >
                        {saving ? (
                            <>
                                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> Saving Changes...
                            </>
                        ) : (
                            <>
                                <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" /> Save Form Configuration
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
export default OnboardingFormCustomizer
