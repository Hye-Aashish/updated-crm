import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import api from '@/lib/api-client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { Loader2, CheckCircle2 } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'


export function PublicLeadForm() {
    const { id } = useParams()
    const { toast } = useToast()
    const [formConfig, setFormConfig] = useState<any>(null)
    const [formData, setFormData] = useState<any>({})
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [submitted, setSubmitted] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        fetchFormConfig()
    }, [id])

    const fetchFormConfig = async () => {
        try {
            setLoading(true)
            const res = await api.get(`/lead-forms/public/${id}`)
            setFormConfig(res.data)
            // Initialize form data
            const initialData = {} as any
            res.data.fields.forEach((f: any) => {
                initialData[f.id] = ''
            })
            setFormData(initialData)
        } catch (err: any) {
            setError(err.response?.data?.message || 'Form not found')
        } finally {
            setLoading(false)
        }
    }

    const handleChange = (fieldId: string, value: string) => {
        setFormData((prev: any) => ({ ...prev, [fieldId]: value }))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setSubmitting(true)
        try {
            await api.post(`/lead-forms/public/${id}/submit`, formData)
            setSubmitted(true)
            toast({ title: 'Success', description: 'Thank you! We will contact you soon.' })
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
                    <CardTitle className="text-2xl mb-2">Submitted Successfully!</CardTitle>
                    <CardDescription className="text-lg">
                        We have received your details. Our team will get back to you shortly.
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
                        <CardDescription className="text-md mt-2 italic">
                            {formConfig.description}
                        </CardDescription>
                    )}
                </CardHeader>
                <CardContent className="pt-8 pb-10 px-8">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {formConfig.fields.map((field: any) => (
                            <div key={field.id} className="space-y-2">
                                <Label htmlFor={field.id} className="text-sm font-semibold flex items-center gap-1">
                                    {field.label}
                                    {field.required && <span className="text-destructive">*</span>}
                                </Label>
                                {field.type === 'textarea' ? (
                                    <Textarea
                                        id={field.id}
                                        placeholder={field.placeholder}
                                        required={field.required}
                                        value={formData[field.id] || ''}
                                        onChange={(e) => handleChange(field.id, e.target.value)}
                                        className="min-h-[100px] transition-all focus:ring-2 focus:ring-primary/20"
                                    />
                                ) : field.type === 'select' ? (
                                    <Select
                                        required={field.required}
                                        onValueChange={(val) => handleChange(field.id, val)}
                                        value={formData[field.id] || ''}
                                    >
                                        <SelectTrigger className="h-11">
                                            <SelectValue placeholder={field.placeholder || "Select an option..."} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {field.options?.map((opt: string) => (
                                                <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                ) : field.type === 'multiselect' ? (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 border rounded-lg bg-muted/20">
                                        {field.options?.map((opt: string) => (
                                            <div key={opt} className="flex items-center space-x-2">
                                                <Checkbox
                                                    id={`${field.id}-${opt}`}
                                                    checked={(formData[field.id] || '').split(', ').includes(opt)}
                                                    onCheckedChange={(checked) => {
                                                        const current = formData[field.id] ? formData[field.id].split(', ') : []
                                                        let next;
                                                        if (checked) {
                                                            next = [...current, opt]
                                                        } else {
                                                            next = current.filter((c: string) => c !== opt)
                                                        }
                                                        handleChange(field.id, next.join(', '))
                                                    }}
                                                />
                                                <label
                                                    htmlFor={`${field.id}-${opt}`}
                                                    className="text-sm font-medium leading-none cursor-pointer"
                                                >
                                                    {opt}
                                                </label>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <Input
                                        id={field.id}
                                        type={field.type}
                                        placeholder={field.placeholder}
                                        required={field.required}
                                        value={formData[field.id] || ''}
                                        onChange={(e) => handleChange(field.id, e.target.value)}
                                        className="h-11 transition-all focus:ring-2 focus:ring-primary/20"
                                    />
                                )}
                            </div>
                        ))}
                        <Button
                            type="submit"
                            className="w-full h-12 text-lg font-bold shadow-lg mt-4 transition-transform active:scale-[0.98]"
                            disabled={submitting}
                        >
                            {submitting ? (
                                <>
                                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                    Submitting...
                                </>
                            ) : (
                                'Submit'
                            )}
                        </Button>
                    </form>
                    <p className="text-center text-xs text-muted-foreground mt-8">
                        Protected by SecureCRM • {new Date().getFullYear()}
                    </p>
                </CardContent>
            </Card>
        </div>
    )
}
