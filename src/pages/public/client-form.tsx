import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import api from '@/lib/api-client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { Loader2, CheckCircle2, Upload } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'

const DEFAULT_SUCCESS =
    'Your details have been submitted. Please wait for some time — our team will contact you shortly.'

export function PublicClientForm() {
    const { id } = useParams()
    const { toast } = useToast()
    const [formConfig, setFormConfig] = useState<any>(null)
    const [formData, setFormData] = useState<Record<string, any>>({})
    const [files, setFiles] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [uploading, setUploading] = useState<string | null>(null)
    const [submitted, setSubmitted] = useState(false)
    const [successMessage, setSuccessMessage] = useState(DEFAULT_SUCCESS)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        fetchFormConfig()
    }, [id])

    const fetchFormConfig = async () => {
        try {
            setLoading(true)
            const res = await api.get(`/client-forms/public/${id}`)
            setFormConfig(res.data)
            setSuccessMessage(res.data.successMessage || DEFAULT_SUCCESS)
            const initialData: Record<string, any> = {}
            ;(res.data.fields || []).forEach((f: any) => {
                initialData[f.id] = f.type === 'multiselect' ? [] : ''
            })
            setFormData(initialData)
        } catch (err: any) {
            setError(err.response?.data?.message || 'Form not found')
        } finally {
            setLoading(false)
        }
    }

    const handleChange = (fieldId: string, value: any) => {
        setFormData((prev) => ({ ...prev, [fieldId]: value }))
    }

    const handleFileUpload = async (field: any, file: File) => {
        if (!id || !file) return
        setUploading(field.id)
        try {
            const body = new FormData()
            body.append('file', file)
            body.append('fieldId', field.id)
            body.append('fieldName', field.label)
            const res = await api.post(`/client-forms/public/${id}/upload`, body, {
                headers: { 'Content-Type': 'multipart/form-data' }
            })
            const entry = {
                fieldId: field.id,
                fieldName: field.label,
                fileName: res.data.fileName,
                fileUrl: res.data.fileUrl
            }
            setFiles((prev) => [...prev.filter((f) => f.fieldId !== field.id), entry])
            handleChange(field.id, res.data.fileName)
            toast({ title: 'Uploaded', description: file.name })
        } catch (err: any) {
            toast({
                title: 'Upload failed',
                description: err.response?.data?.message || 'Could not upload file',
                variant: 'destructive'
            })
        } finally {
            setUploading(null)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!formConfig) return

        for (const field of formConfig.fields || []) {
            if (!field.required) continue
            const val = formData[field.id]
            if (val == null || (typeof val === 'string' && !val.trim()) || (Array.isArray(val) && val.length === 0)) {
                toast({
                    title: 'Missing field',
                    description: `${field.label} is required`,
                    variant: 'destructive'
                })
                return
            }
        }

        setSubmitting(true)
        try {
            const payload = {
                ...formData,
                onboardingFiles: files
            }
            const res = await api.post(`/client-forms/public/${id}/submit`, payload)
            setSuccessMessage(res.data?.message || formConfig.successMessage || DEFAULT_SUCCESS)
            setSubmitted(true)
        } catch (err: any) {
            toast({
                title: 'Error',
                description: err.response?.data?.message || 'Failed to submit form',
                variant: 'destructive'
            })
        } finally {
            setSubmitting(false)
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-muted/30">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
                <Card className="max-w-md w-full text-center p-8">
                    <h2 className="text-2xl font-bold text-destructive mb-2">Error</h2>
                    <p className="text-muted-foreground">{error}</p>
                </Card>
            </div>
        )
    }

    if (submitted) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
                <Card className="max-w-md w-full text-center p-8 border-t-4 border-t-green-500 shadow-xl">
                    <div className="flex justify-center mb-4 text-green-500">
                        <CheckCircle2 className="h-16 w-16" />
                    </div>
                    <CardTitle className="text-2xl mb-2">Submitted Successfully</CardTitle>
                    <CardDescription className="text-base leading-relaxed">
                        {successMessage}
                    </CardDescription>
                </Card>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-muted/30 py-12 px-4 flex justify-center items-start">
            <Card className="max-w-xl w-full shadow-2xl border-t-4 border-t-primary">
                <CardHeader className="text-center pb-8 border-b bg-primary/5 rounded-t-lg">
                    <CardTitle className="text-3xl font-extrabold">{formConfig.title}</CardTitle>
                    {formConfig.description && (
                        <CardDescription className="text-md mt-2">
                            {formConfig.description}
                        </CardDescription>
                    )}
                </CardHeader>
                <CardContent className="pt-8 pb-10 px-8">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {(formConfig.fields || []).map((field: any) => (
                            <div key={field.id} className="space-y-2">
                                <Label htmlFor={field.id} className="text-sm font-semibold flex items-center gap-1">
                                    {field.label}
                                    {field.required && <span className="text-destructive">*</span>}
                                </Label>

                                {field.type === 'textarea' || field.type === 'address' ? (
                                    <Textarea
                                        id={field.id}
                                        value={formData[field.id] || ''}
                                        onChange={(e) => handleChange(field.id, e.target.value)}
                                        placeholder={field.placeholder}
                                        required={field.required}
                                        rows={3}
                                    />
                                ) : field.type === 'select' ? (
                                    <Select
                                        value={formData[field.id] || ''}
                                        onValueChange={(v) => handleChange(field.id, v)}
                                    >
                                        <SelectTrigger id={field.id}>
                                            <SelectValue placeholder={field.placeholder || 'Select'} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {(field.options || []).map((opt: string) => (
                                                <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                ) : field.type === 'multiselect' ? (
                                    <div className="space-y-2 border rounded-lg p-3">
                                        {(field.options || []).map((opt: string) => {
                                            const selected: string[] = Array.isArray(formData[field.id]) ? formData[field.id] : []
                                            const checked = selected.includes(opt)
                                            return (
                                                <label key={opt} className="flex items-center gap-2 text-sm">
                                                    <Checkbox
                                                        checked={checked}
                                                        onCheckedChange={(c) => {
                                                            const next = c
                                                                ? [...selected, opt]
                                                                : selected.filter((x) => x !== opt)
                                                            handleChange(field.id, next)
                                                        }}
                                                    />
                                                    {opt}
                                                </label>
                                            )
                                        })}
                                    </div>
                                ) : field.type === 'file' ? (
                                    <div className="space-y-2">
                                        <label className="flex items-center justify-center gap-2 h-11 border border-dashed rounded-lg cursor-pointer hover:bg-muted/40 text-sm font-medium">
                                            <Upload className="h-4 w-4" />
                                            {uploading === field.id ? 'Uploading…' : (formData[field.id] || 'Choose file')}
                                            <input
                                                type="file"
                                                className="hidden"
                                                disabled={uploading === field.id}
                                                onChange={(e) => {
                                                    const file = e.target.files?.[0]
                                                    if (file) handleFileUpload(field, file)
                                                }}
                                            />
                                        </label>
                                    </div>
                                ) : (
                                    <Input
                                        id={field.id}
                                        type={
                                            field.type === 'email' ? 'email'
                                                : field.type === 'number' ? 'number'
                                                    : field.type === 'date' ? 'date'
                                                        : field.type === 'phone' ? 'tel'
                                                            : 'text'
                                        }
                                        value={formData[field.id] || ''}
                                        onChange={(e) => handleChange(field.id, e.target.value)}
                                        placeholder={field.placeholder}
                                        required={field.required}
                                    />
                                )}
                            </div>
                        ))}

                        <Button type="submit" disabled={submitting} className="w-full h-11 font-bold text-base">
                            {submitting ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting…
                                </>
                            ) : (
                                'Submit Details'
                            )}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}

export default PublicClientForm
