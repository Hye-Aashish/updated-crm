import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import {
    Copy, Plus, Trash2, ExternalLink, CheckCircle2, Settings, MessageCircle
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import api from '@/lib/api-client'
import type { ClientForm } from '@/types'
import { appConfirm } from '@/lib/app-dialog'

interface ClientFormBuilderProps {
    isOpen: boolean
    onClose: () => void
    clientForms: ClientForm[]
    setClientForms: React.Dispatch<React.SetStateAction<ClientForm[]>>
}

const DEFAULT_SUCCESS =
    'Your details have been submitted. Please wait for some time — our team will contact you shortly.'

const DEFAULT_FORM: Partial<ClientForm> = {
    title: '',
    description: '',
    fields: [
        { id: 'name', label: 'Full Name', type: 'text', required: true, placeholder: 'Enter your name' },
        { id: 'email', label: 'Email Address', type: 'email', required: true, placeholder: 'your@email.com' },
        { id: 'phone', label: 'Phone', type: 'phone', required: true, placeholder: '10-digit mobile' },
        { id: 'company', label: 'Company', type: 'company', required: true, placeholder: 'Company / business name' }
    ],
    isActive: true,
    successMessage: DEFAULT_SUCCESS
}

export function ClientFormBuilder({
    isOpen,
    onClose,
    clientForms,
    setClientForms
}: ClientFormBuilderProps) {
    const { toast } = useToast()
    const [isBuildingForm, setIsBuildingForm] = useState(false)
    const [currentForm, setCurrentForm] = useState<Partial<ClientForm>>(DEFAULT_FORM)
    const [customFieldLabel, setCustomFieldLabel] = useState('')
    const [customFieldType, setCustomFieldType] = useState('text')
    const [customFieldOptions, setCustomFieldOptions] = useState('')
    const [saving, setSaving] = useState(false)

    const publicUrl = (id: string) => `${window.location.origin}/cf/${id}`

    const handleAddCustomField = () => {
        if (!customFieldLabel.trim()) return
        const id = customFieldLabel.toLowerCase().replace(/\s+/g, '_')
        if (currentForm.fields?.some((f) => f.id === id)) {
            toast({ title: 'Error', description: 'Field already exists', variant: 'destructive' })
            return
        }

        const options = customFieldType === 'select' || customFieldType === 'multiselect'
            ? customFieldOptions.split(',').map((o) => o.trim()).filter(Boolean)
            : []

        setCurrentForm({
            ...currentForm,
            fields: [
                ...(currentForm.fields || []),
                {
                    id,
                    label: customFieldLabel,
                    type: customFieldType,
                    required: false,
                    placeholder:
                        customFieldType === 'select' || customFieldType === 'multiselect'
                            ? 'Select an option'
                            : `Enter ${customFieldLabel}`,
                    options: options.length > 0 ? options : undefined
                }
            ]
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
        setSaving(true)
        const formId = (currentForm as ClientForm)._id
        try {
            if (formId) {
                const res = await api.put(`/client-forms/${formId}`, currentForm)
                setClientForms((prev) => prev.map((f) => (f._id === formId ? res.data : f)))
                toast({ title: 'Saved', description: 'Client form updated' })
            } else {
                const res = await api.post('/client-forms', currentForm)
                setClientForms((prev) => [res.data, ...prev])
                toast({ title: 'Published', description: 'Client form ready to share' })
            }
            setIsBuildingForm(false)
            setCurrentForm(DEFAULT_FORM)
        } catch (err: any) {
            toast({
                title: 'Error',
                description: err.response?.data?.message || 'Failed to save form',
                variant: 'destructive'
            })
        } finally {
            setSaving(false)
        }
    }

    const handleDeleteForm = async (id: string) => {
        if (!(await appConfirm('Delete this client form?'))) return
        try {
            await api.delete(`/client-forms/${id}`)
            setClientForms((prev) => prev.filter((f) => f._id !== id))
            toast({ title: 'Deleted' })
        } catch {
            toast({ title: 'Error', description: 'Failed to delete', variant: 'destructive' })
        }
    }

    const copyToClipboard = (text: string, msg: string) => {
        navigator.clipboard.writeText(text)
        toast({ description: msg })
    }

    const shareWhatsApp = (id: string, title: string) => {
        const url = publicUrl(id)
        const text = `Hello! Please fill this form to share your details with us: ${title}\n${url}`
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
    }

    return (
        <Dialog open={isOpen} onOpenChange={(v) => !v && onClose()}>
            <DialogContent className="max-w-5xl max-h-[92vh] overflow-hidden flex flex-col p-6">
                <DialogHeader className="border-b pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                        <DialogTitle className="text-xl font-extrabold tracking-tight">
                            Client Forms
                        </DialogTitle>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            Build forms, share the link — client submit pe CRM mein client auto-create hoga.
                        </p>
                    </div>
                    {!isBuildingForm ? (
                        <Button
                            onClick={() => {
                                setCurrentForm(DEFAULT_FORM)
                                setIsBuildingForm(true)
                            }}
                            className="rounded-xl font-bold"
                        >
                            <Plus className="mr-2 h-4 w-4" />
                            New Form
                        </Button>
                    ) : (
                        <Button
                            variant="ghost"
                            onClick={() => {
                                setIsBuildingForm(false)
                                setCurrentForm(DEFAULT_FORM)
                            }}
                            className="rounded-xl font-semibold"
                        >
                            Back to Forms
                        </Button>
                    )}
                </DialogHeader>

                <div className="flex-1 overflow-y-auto py-4 custom-scrollbar">
                    {isBuildingForm ? (
                        <div className="grid lg:grid-cols-2 gap-8">
                            <div className="space-y-6">
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label className="text-xs font-bold uppercase tracking-wider">Form Title</Label>
                                        <Input
                                            value={currentForm.title}
                                            onChange={(e) => setCurrentForm({ ...currentForm, title: e.target.value })}
                                            placeholder="e.g. Website Project Intake"
                                            className="h-10"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs font-bold uppercase tracking-wider">Description</Label>
                                        <Input
                                            value={currentForm.description || ''}
                                            onChange={(e) => setCurrentForm({ ...currentForm, description: e.target.value })}
                                            placeholder="Shown to the client above the form"
                                            className="h-10"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs font-bold uppercase tracking-wider">Success Message</Label>
                                        <Input
                                            value={currentForm.successMessage || DEFAULT_SUCCESS}
                                            onChange={(e) => setCurrentForm({ ...currentForm, successMessage: e.target.value })}
                                            className="h-10"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-4 pt-4 border-t">
                                    <h4 className="text-sm font-bold uppercase tracking-widest text-primary">Form Fields</h4>
                                    <div className="space-y-2">
                                        {currentForm.fields?.map((field, idx) => (
                                            <div
                                                key={`${field.id}-${idx}`}
                                                className="flex items-center justify-between p-3 bg-muted/40 border border-border/40 rounded-lg"
                                            >
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                                                    <span className="text-sm font-medium truncate">{field.label}</span>
                                                    <Badge variant="outline" className="text-[9px] uppercase font-bold shrink-0">
                                                        {field.type}
                                                    </Badge>
                                                    {field.required && (
                                                        <Badge variant="secondary" className="text-[9px] font-bold shrink-0">
                                                            Required
                                                        </Badge>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-1 shrink-0">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-7 text-[10px] font-bold"
                                                        onClick={() =>
                                                            setCurrentForm({
                                                                ...currentForm,
                                                                fields: currentForm.fields?.map((f, i) =>
                                                                    i === idx ? { ...f, required: !f.required } : f
                                                                )
                                                            })
                                                        }
                                                    >
                                                        {field.required ? 'Optional' : 'Required'}
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        disabled={['name', 'email', 'phone', 'company'].includes(field.id)}
                                                        onClick={() =>
                                                            setCurrentForm({
                                                                ...currentForm,
                                                                fields: currentForm.fields?.filter((_, i) => i !== idx)
                                                            })
                                                        }
                                                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-4 pt-4 border-t p-4 bg-muted/20 rounded-lg border border-border/40">
                                    <h4 className="text-xs font-bold uppercase tracking-wider">Add Field Component</h4>
                                    <div className="grid grid-cols-2 gap-3">
                                        <Input
                                            value={customFieldLabel}
                                            onChange={(e) => setCustomFieldLabel(e.target.value)}
                                            placeholder="Label (e.g. GST Number)"
                                            className="h-9"
                                        />
                                        <Select value={customFieldType} onValueChange={setCustomFieldType}>
                                            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="text">Short Text</SelectItem>
                                                <SelectItem value="textarea">Long Text</SelectItem>
                                                <SelectItem value="email">Email</SelectItem>
                                                <SelectItem value="phone">Phone</SelectItem>
                                                <SelectItem value="number">Number</SelectItem>
                                                <SelectItem value="company">Company</SelectItem>
                                                <SelectItem value="address">Address</SelectItem>
                                                <SelectItem value="gst">GST</SelectItem>
                                                <SelectItem value="date">Date</SelectItem>
                                                <SelectItem value="select">Dropdown</SelectItem>
                                                <SelectItem value="multiselect">Multi Select</SelectItem>
                                                <SelectItem value="file">File Upload</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    {(customFieldType === 'select' || customFieldType === 'multiselect') && (
                                        <Input
                                            value={customFieldOptions}
                                            onChange={(e) => setCustomFieldOptions(e.target.value)}
                                            placeholder="Options (comma separated)"
                                            className="h-9"
                                        />
                                    )}
                                    <Button onClick={handleAddCustomField} variant="secondary" className="w-full h-9 font-bold text-xs">
                                        ADD FIELD
                                    </Button>
                                </div>

                                <Button onClick={handleSaveForm} disabled={saving} className="w-full h-11 font-bold">
                                    {saving ? 'Saving…' : 'Save Form'}
                                </Button>
                            </div>

                            <div className="bg-card border-l h-full p-6">
                                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-6 text-center">
                                    Live Preview
                                </h4>
                                <div className="border rounded-2xl p-6 shadow-sm max-w-sm mx-auto bg-background/50">
                                    <h3 className="text-lg font-bold mb-2">{currentForm.title || 'Form Preview'}</h3>
                                    <p className="text-sm text-muted-foreground mb-6">
                                        {currentForm.description || 'Fill out the form below.'}
                                    </p>
                                    <div className="space-y-4">
                                        {currentForm.fields?.map((f, i) => (
                                            <div key={i} className="space-y-1.5">
                                                <Label className="text-xs font-semibold">
                                                    {f.label}{f.required ? ' *' : ''}
                                                </Label>
                                                <div className="h-9 bg-muted/30 border rounded-md" />
                                            </div>
                                        ))}
                                        <Button className="w-full h-10 mt-4 pointer-events-none opacity-80">
                                            Submit Details
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
                            {clientForms.map((form) => (
                                <div
                                    key={form._id}
                                    className="group p-4 bg-card border border-border/60 rounded-2xl shadow-xs hover:shadow-md hover:border-primary/30 transition-all flex flex-col justify-between"
                                >
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-2">
                                            <div className={`h-8 w-8 rounded-xl flex items-center justify-center shrink-0 ${
                                                form.isActive ? 'bg-emerald-500/10 text-emerald-600' : 'bg-muted text-muted-foreground'
                                            }`}>
                                                <CheckCircle2 className="h-4 w-4" />
                                            </div>
                                            <Badge variant={form.isActive ? 'secondary' : 'outline'} className="text-[9px] font-bold uppercase">
                                                {form.isActive ? 'Active' : 'Offline'}
                                            </Badge>
                                            <span className="text-[10px] text-muted-foreground ml-auto">
                                                {form.fields?.length || 0} fields
                                            </span>
                                        </div>
                                        <div>
                                            <h3 className="font-extrabold text-foreground text-base group-hover:text-primary truncate">
                                                {form.title}
                                            </h3>
                                            <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">
                                                {form.description || 'Client intake form'}
                                            </p>
                                        </div>
                                        <div className="text-[10px] font-mono text-muted-foreground bg-muted/40 rounded-lg px-2 py-1.5 truncate">
                                            /cf/{form._id}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-5 gap-1.5 pt-3 mt-3 border-t border-border/30">
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            title="Open public form"
                                            onClick={() => window.open(publicUrl(form._id), '_blank')}
                                            className="h-8 w-full rounded-lg"
                                        >
                                            <ExternalLink className="h-3.5 w-3.5" />
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            title="Copy link"
                                            onClick={() => copyToClipboard(publicUrl(form._id), 'Form link copied')}
                                            className="h-8 w-full rounded-lg"
                                        >
                                            <Copy className="h-3.5 w-3.5" />
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            title="Share on WhatsApp"
                                            onClick={() => shareWhatsApp(form._id, form.title)}
                                            className="h-8 w-full rounded-lg text-green-600"
                                        >
                                            <MessageCircle className="h-3.5 w-3.5" />
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            title="Edit"
                                            onClick={() => {
                                                setCurrentForm(form)
                                                setIsBuildingForm(true)
                                            }}
                                            className="h-8 w-full rounded-lg"
                                        >
                                            <Settings className="h-3.5 w-3.5" />
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            title="Delete"
                                            onClick={() => handleDeleteForm(form._id)}
                                            className="h-8 w-full rounded-lg hover:text-destructive"
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>
                                </div>
                            ))}

                            {clientForms.length === 0 && (
                                <div className="col-span-full py-12 text-center">
                                    <p className="text-sm font-medium text-muted-foreground">No client forms yet.</p>
                                    <Button
                                        variant="link"
                                        onClick={() => {
                                            setCurrentForm(DEFAULT_FORM)
                                            setIsBuildingForm(true)
                                        }}
                                        className="mt-2 font-bold"
                                    >
                                        Create your first client form
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
