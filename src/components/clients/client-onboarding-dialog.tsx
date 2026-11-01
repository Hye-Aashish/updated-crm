import { useState, useEffect } from 'react'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from '@/components/ui/select'
import {
    Sparkles,
    Copy,
    Check,
    ExternalLink,
    Plus,
    Trash2,
    Globe,
    Smartphone,
    ShoppingCart,
    TrendingUp,
    Building2,
    FileText,
    MessageCircle,
    CheckCircle2,
    Clock,
    RefreshCw,
    FolderKanban,
    Palette,
    Rocket,
    Code,
    Video,
    Megaphone,
    Briefcase,
    ShieldCheck,
    BookmarkPlus,
    X,
    Layers
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import api from '@/lib/api-client'
import type { Client } from '@/types'

import { appConfirm } from '@/lib/app-dialog'

export interface OnboardingField {
    id: string
    label: string
    type: 'text' | 'textarea' | 'select' | 'number' | 'date' | 'file'
    placeholder?: string
    required: boolean
    options?: string[]
    helpText?: string
}

export interface OnboardingTemplate {
    _id?: string
    id?: string
    name: string
    description?: string
    icon?: string
    fields: OnboardingField[]
    standardFields?: {
        company?: boolean
        website?: boolean
        gstNumber?: boolean
        address?: boolean
        city?: boolean
        state?: boolean
        country?: boolean
        industry?: boolean
        services?: boolean
        budget?: boolean
        expectedDeadline?: boolean
    }
    isDefault?: boolean
    createdAt?: string
}

export interface OnboardingConfig {
    templateId: string
    welcomeTitle: string
    welcomeMessage: string
    successMessage: string
    standardFields: {
        company: boolean
        website: boolean
        gstNumber: boolean
        address: boolean
        city: boolean
        state: boolean
        country: boolean
        industry: boolean
        services: boolean
        budget: boolean
        expectedDeadline: boolean
    }
    customFields: OnboardingField[]
}

const DEFAULT_TEMPLATES: OnboardingTemplate[] = [
    {
        id: 'web_dev',
        name: 'Web Design & Development',
        icon: 'Globe',
        description: 'Brand identity, design preferences, reference websites & target features',
        isDefault: true,
        fields: [
            { id: 'brand_colors', label: 'Brand Color Palette & Aesthetic Preferences', type: 'text', placeholder: 'e.g. Royal Blue & Gold, Minimalist & Modern', required: false },
            { id: 'ref_websites', label: 'Reference Websites You Admire (URLs)', type: 'textarea', placeholder: 'List 2-3 websites and what you like about them', required: true },
            { id: 'target_audience', label: 'Primary Target Audience & Demographics', type: 'text', placeholder: 'e.g. B2B Enterprise Decision Makers in Tech', required: false },
            { id: 'must_have_features', label: 'Must-Have Core Website Features', type: 'textarea', placeholder: 'e.g. Lead capture forms, Client portal, Blog, Payment gateway', required: true },
            { id: 'domain_hosting_status', label: 'Current Domain & Hosting Status', type: 'select', required: true, options: ['I have domain and hosting ready', 'I have domain only (need hosting)', 'I need help purchasing domain and hosting'] },
            { id: 'brand_assets', label: 'Upload Brand Assets (Logo, Guidelines, Media)', type: 'file', required: false, helpText: 'Attach high-res logo (.png, .svg) or zip' }
        ]
    },
    {
        id: 'mobile_app',
        name: 'Mobile App Development',
        icon: 'Smartphone',
        description: 'Platforms (iOS/Android), core user journey & external API integrations',
        isDefault: true,
        fields: [
            { id: 'target_platforms', label: 'Target Platforms', type: 'select', required: true, options: ['Cross-platform (iOS + Android Flutter/React Native)', 'Native iOS Only', 'Native Android Only'] },
            { id: 'app_summary', label: 'Elevator Pitch / Problem the App Solves', type: 'textarea', placeholder: 'Brief summary of what your mobile app does', required: true },
            { id: 'user_roles', label: 'User Roles & Account Types', type: 'text', placeholder: 'e.g. Customer, Vendor, Super Admin', required: false },
            { id: 'third_party_apis', label: 'Required Third-Party APIs / Integrations', type: 'textarea', placeholder: 'e.g. Stripe, Twilio SMS, Google Maps API', required: false },
            { id: 'app_wireframes', label: 'Existing Wireframes / PRD Documents', type: 'file', required: false, helpText: 'Upload PDF, Figma links or wireframe documents' }
        ]
    },
    {
        id: 'ecommerce',
        name: 'E-Commerce Solution',
        icon: 'ShoppingCart',
        description: 'Product catalog size, payment gateways & logistics integration',
        isDefault: true,
        fields: [
            { id: 'approx_skus', label: 'Estimated Number of Products / SKUs', type: 'select', required: true, options: ['1 - 25 Products', '25 - 100 Products', '100 - 1000 Products', '1000+ Enterprise SKUs'] },
            { id: 'payment_gateways', label: 'Preferred Payment Gateways', type: 'text', placeholder: 'e.g. Razorpay, Stripe, PhonePe, Cashfree', required: true },
            { id: 'shipping_partners', label: 'Shipping & Logistics Partners', type: 'text', placeholder: 'e.g. Shiprocket, Delhivery, BlueDart', required: false },
            { id: 'tax_rules', label: 'GST & Invoice Tax Requirements', type: 'textarea', placeholder: 'e.g. Standard 18% GST with HSN codes support', required: false },
            { id: 'product_catalog_sample', label: 'Product Catalog / Sample Inventory File', type: 'file', required: false, helpText: 'Excel, CSV or PDF of product samples' }
        ]
    },
    {
        id: 'marketing_seo',
        name: 'Digital Marketing & SEO',
        icon: 'TrendingUp',
        description: 'Target keywords, competitor analysis & advertising budget',
        isDefault: true,
        fields: [
            { id: 'target_keywords', label: 'Core Target Keywords / Search Queries', type: 'textarea', placeholder: 'List key phrases customers use to find your business', required: true },
            { id: 'top_competitors', label: 'Top 3 Competitor Websites', type: 'textarea', placeholder: 'e.g. competitor1.com, competitor2.com', required: true },
            { id: 'current_ad_spend', label: 'Estimated Monthly Ad Spend Budget', type: 'text', placeholder: 'e.g. ₹50,000 / month on Google Ads', required: false },
            { id: 'active_social_profiles', label: 'Existing Social Media Profiles', type: 'textarea', placeholder: 'Instagram, LinkedIn, Facebook page links', required: false }
        ]
    },
    {
        id: 'corporate_general',
        name: 'General Corporate Intake',
        icon: 'Building2',
        description: 'Standard enterprise onboarding with billing & stakeholder points of contact',
        isDefault: true,
        fields: [
            { id: 'billing_contact_name', label: 'Billing / Accounts Point of Contact', type: 'text', placeholder: 'Accounts Manager Name & Email', required: true },
            { id: 'project_poc', label: 'Primary Technical / Project Decision Maker', type: 'text', placeholder: 'Full Name & Direct Phone', required: true },
            { id: 'project_notes', label: 'Key Goals & Success Criteria', type: 'textarea', placeholder: 'What defines a successful project delivery for you?', required: true },
            { id: 'company_documents', label: 'GST Certificate / Company Registration Document', type: 'file', required: false }
        ]
    }
]

const ICON_MAP: Record<string, any> = {
    Globe,
    Smartphone,
    ShoppingCart,
    TrendingUp,
    Building2,
    Palette,
    Rocket,
    Code,
    Video,
    Megaphone,
    Briefcase,
    ShieldCheck,
    Sparkles,
    FileText,
    Layers
}

const AVAILABLE_ICONS = [
    { id: 'Globe', label: 'Web', icon: Globe },
    { id: 'Smartphone', label: 'Mobile App', icon: Smartphone },
    { id: 'ShoppingCart', label: 'E-Commerce', icon: ShoppingCart },
    { id: 'TrendingUp', label: 'Marketing', icon: TrendingUp },
    { id: 'Building2', label: 'Corporate', icon: Building2 },
    { id: 'Palette', label: 'Design', icon: Palette },
    { id: 'Rocket', label: 'Startup', icon: Rocket },
    { id: 'Code', label: 'SaaS / Dev', icon: Code },
    { id: 'Video', label: 'Video / Media', icon: Video },
    { id: 'Megaphone', label: 'Advertising', icon: Megaphone },
    { id: 'Briefcase', label: 'Consulting', icon: Briefcase },
    { id: 'ShieldCheck', label: 'Legal / Trust', icon: ShieldCheck },
    { id: 'Sparkles', label: 'Creative / AI', icon: Sparkles }
]

const getTemplateIcon = (iconName?: string) => {
    if (iconName && ICON_MAP[iconName]) return ICON_MAP[iconName]
    return Globe
}

interface ClientOnboardingDialogProps {
    client: Client
    isOpen: boolean
    onClose: () => void
    onUpdated?: (updatedClient: Client) => void
}

export function ClientOnboardingDialog({
    client,
    isOpen,
    onClose,
    onUpdated
}: ClientOnboardingDialogProps) {
    const { toast } = useToast()
    const [saving, setSaving] = useState(false)
    const [copied, setCopied] = useState(false)
    const [templates, setTemplates] = useState<OnboardingTemplate[]>(DEFAULT_TEMPLATES)
    const [selectedTemplate, setSelectedTemplate] = useState<string>('web_dev')

    // Template Creator State
    const [isCreatingTemplate, setIsCreatingTemplate] = useState(false)
    const [savingTemplate, setSavingTemplate] = useState(false)
    const [tplName, setTplName] = useState('')
    const [tplDescription, setTplDescription] = useState('')
    const [tplIcon, setTplIcon] = useState('Globe')
    const [tplQuestions, setTplQuestions] = useState<OnboardingField[]>([])

    // Initial configuration state
    const [config, setConfig] = useState<OnboardingConfig>({
        templateId: 'web_dev',
        welcomeTitle: `Welcome to ${client.name}'s Onboarding Portal`,
        welcomeMessage: `Please take a few moments to review and fill in your details and project requirements so our team can immediately begin your project.`,
        successMessage: `Thank you for completing your onboarding form! Our project manager has been notified and will connect with you shortly.`,
        standardFields: {
            company: true,
            website: true,
            gstNumber: true,
            address: true,
            city: true,
            state: true,
            country: true,
            industry: true,
            services: true,
            budget: true,
            expectedDeadline: true
        },
        customFields: DEFAULT_TEMPLATES[0].fields
    })

    // New custom field form state
    const [newFieldLabel, setNewFieldLabel] = useState('')
    const [newFieldType, setNewFieldType] = useState<'text' | 'textarea' | 'select' | 'number' | 'date' | 'file'>('text')
    const [newFieldPlaceholder, setNewFieldPlaceholder] = useState('')
    const [newFieldRequired, setNewFieldRequired] = useState(false)
    const [newFieldOptions, setNewFieldOptions] = useState('')

    // Fetch dynamic templates from backend
    const fetchTemplates = async () => {
        try {
            const res = await api.get('/clients/onboarding-templates')
            if (Array.isArray(res.data) && res.data.length > 0) {
                setTemplates(res.data)
            }
        } catch (err) {
            console.warn('Could not fetch custom templates, using defaults', err)
        }
    }

    useEffect(() => {
        if (isOpen) {
            fetchTemplates()
        }
    }, [isOpen])

    // Load existing config if already customized
    useEffect(() => {
        if (client.customOnboardingConfig) {
            setConfig({
                ...client.customOnboardingConfig,
                standardFields: {
                    company: true,
                    website: true,
                    gstNumber: true,
                    address: true,
                    city: true,
                    state: true,
                    country: true,
                    industry: true,
                    services: true,
                    budget: true,
                    expectedDeadline: true,
                    ...(client.customOnboardingConfig.standardFields || {})
                },
                customFields: client.customOnboardingConfig.customFields || DEFAULT_TEMPLATES[0].fields
            })
            if (client.customOnboardingConfig.templateId) {
                setSelectedTemplate(client.customOnboardingConfig.templateId)
            }
        } else {
            setSelectedTemplate('web_dev')
            setConfig(prev => ({
                ...prev,
                welcomeTitle: `Welcome ${client.name} - Project Intake`,
                customFields: DEFAULT_TEMPLATES[0].fields
            }))
        }
    }, [client])

    const handleSelectTemplate = (templateKey: string) => {
        setSelectedTemplate(templateKey)
        const tpl = templates.find(t => (t._id || t.id) === templateKey) || DEFAULT_TEMPLATES.find(t => (t._id || t.id) === templateKey)
        if (!tpl) return

        setConfig(prev => ({
            ...prev,
            templateId: templateKey,
            customFields: [...tpl.fields]
        }))
        toast({
            title: `Loaded ${tpl.name}`,
            description: 'Custom questions updated to match this template.'
        })
    }

    const handleToggleStandardField = (fieldKey: keyof typeof config.standardFields) => {
        setConfig(prev => ({
            ...prev,
            standardFields: {
                ...prev.standardFields,
                [fieldKey]: !prev.standardFields[fieldKey]
            }
        }))
    }

    const handleAddCustomField = () => {
        if (!newFieldLabel.trim()) {
            toast({ variant: 'destructive', title: 'Question Label Required', description: 'Please enter a name for the question.' })
            return
        }

        const id = 'custom_' + Date.now().toString(36)
        const newField: OnboardingField = {
            id,
            label: newFieldLabel.trim(),
            type: newFieldType,
            placeholder: newFieldPlaceholder.trim() || undefined,
            required: newFieldRequired,
            options: newFieldType === 'select' && newFieldOptions.trim()
                ? newFieldOptions.split(',').map(s => s.trim()).filter(Boolean)
                : undefined
        }

        setConfig(prev => ({
            ...prev,
            customFields: [...prev.customFields, newField]
        }))

        // Reset inputs
        setNewFieldLabel('')
        setNewFieldPlaceholder('')
        setNewFieldRequired(false)
        setNewFieldOptions('')
        setNewFieldType('text')

        toast({ title: 'Question Added', description: 'Your custom question has been added to the onboarding form.' })
    }

    const handleRemoveCustomField = (id: string) => {
        setConfig(prev => ({
            ...prev,
            customFields: prev.customFields.filter(f => f.id !== id)
        }))
    }

    // Save as new template to database
    const handleSaveNewTemplate = async () => {
        if (!tplName.trim()) {
            toast({ variant: 'destructive', title: 'Template Name Required', description: 'Please enter a name for your custom template.' })
            return
        }

        setSavingTemplate(true)
        try {
            const fieldsToSave = tplQuestions.length > 0 ? tplQuestions : config.customFields
            const payload = {
                name: tplName.trim(),
                description: tplDescription.trim() || 'Custom agency onboarding template',
                icon: tplIcon,
                fields: fieldsToSave,
                standardFields: config.standardFields
            }

            const res = await api.post('/clients/onboarding-templates', payload)
            const created = res.data

            setTemplates(prev => [...prev, created])
            const newKey = created._id || created.id
            setSelectedTemplate(newKey)
            setConfig(prev => ({
                ...prev,
                templateId: newKey,
                customFields: [...created.fields]
            }))

            setIsCreatingTemplate(false)
            setTplName('')
            setTplDescription('')
            setTplQuestions([])

            toast({
                title: 'Template Created Successfully!',
                description: `"${created.name}" is now saved and available for all clients.`
            })
        } catch (err: any) {
            console.error('Failed to create template', err)
            toast({
                variant: 'destructive',
                title: 'Could Not Create Template',
                description: err.response?.data?.message || 'Error saving template to server.'
            })
        } finally {
            setSavingTemplate(false)
        }
    }

    const handleDeleteTemplate = async (templateId: string, templateName: string, e: React.MouseEvent) => {
        e.stopPropagation()
        if (!await appConfirm(`Delete template "${templateName}"? This will remove it from your saved templates.`)) {
            return
        }

        try {
            await api.delete(`/clients/onboarding-templates/${templateId}`)
            setTemplates(prev => prev.filter(t => (t._id || t.id) !== templateId))
            if (selectedTemplate === templateId) {
                handleSelectTemplate('web_dev')
            }
            toast({ title: 'Template Deleted', description: `"${templateName}" has been removed.` })
        } catch (err: any) {
            toast({
                variant: 'destructive',
                title: 'Delete Failed',
                description: err.response?.data?.message || 'Could not delete template.'
            })
        }
    }

    const handleOpenSaveCurrentAsTemplate = () => {
        setTplName(`${client.name} Custom Template`)
        setTplDescription(`Customized intake flow with ${config.customFields.length} specialized questions`)
        setTplIcon('Sparkles')
        setTplQuestions([...config.customFields])
        setIsCreatingTemplate(true)
    }

    const publicUrl = client.onboardingToken
        ? `${window.location.origin}/client-onboarding/${client.onboardingToken}`
        : ''

    const handleSaveAndGenerateLink = async (forceNewToken = false) => {
        setSaving(true)
        try {
            const res = await api.post(`/clients/${client.id}/onboarding/generate`, {
                config,
                forceNewToken
            })

            const updated = res.data.client || {
                ...client,
                onboardingToken: res.data.token,
                onboardingStatus: res.data.onboardingStatus,
                onboardingSentAt: res.data.onboardingSentAt,
                customOnboardingConfig: res.data.config
            }

            if (onUpdated) {
                onUpdated(updated)
            }

            toast({
                title: 'Onboarding Form Ready!',
                description: 'Unique client link generated. You can now copy or share it directly via WhatsApp.'
            })
        } catch (err: any) {
            console.error('Failed to generate onboarding link', err)
            toast({
                variant: 'destructive',
                title: 'Failed to Save',
                description: err.response?.data?.message || 'Could not save onboarding configuration.'
            })
        } finally {
            setSaving(false)
        }
    }

    const handleCopyLink = () => {
        if (!publicUrl) return
        navigator.clipboard.writeText(publicUrl)
        setCopied(true)
        toast({ title: 'Link Copied to Clipboard!', description: publicUrl })
        setTimeout(() => setCopied(false), 2500)
    }

    const handleShareWhatsApp = () => {
        if (!publicUrl) return
        const text = `Hello ${client.name},\n\nPlease fill out your onboarding form so we can configure your account and begin your project:\n${publicUrl}\n\nThank you!`
        const waUrl = `https://wa.me/${(client.phone || '').replace(/[^0-9]/g, '')}?text=${encodeURIComponent(text)}`
        window.open(waUrl, '_blank')
    }

    return (
        <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-6 rounded-3xl">
                <DialogHeader className="space-y-2">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                            <div className="clay-icon h-10 w-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                                <Sparkles className="h-5 w-5" />
                            </div>
                            <div>
                                <DialogTitle className="text-xl font-extrabold text-foreground">
                                    Client Onboarding Form Builder
                                </DialogTitle>
                                <DialogDescription className="text-xs text-muted-foreground font-medium">
                                    Tailor intake questions and generate a branded self-serve intake form for {client.name} ({client.company || 'Direct Client'})
                                </DialogDescription>
                            </div>
                        </div>

                        {/* Status Badge */}
                        <div className="flex items-center gap-2">
                            {client.onboardingStatus === 'completed' ? (
                                <Badge className="clay-badge bg-emerald-500/15 text-emerald-600 border-emerald-500/30 font-bold px-3 py-1 gap-1.5 whitespace-nowrap shrink-0">
                                    <CheckCircle2 className="h-3.5 w-3.5" /> Completed
                                </Badge>
                            ) : client.onboardingStatus === 'sent' ? (
                                <Badge className="clay-badge bg-blue-500/15 text-blue-600 border-blue-500/30 font-bold px-3 py-1 gap-1.5 whitespace-nowrap shrink-0">
                                    <Clock className="h-3.5 w-3.5" /> Form Sent
                                </Badge>
                            ) : (
                                <Badge className="clay-badge bg-slate-500/15 text-muted-foreground font-bold px-3 py-1 whitespace-nowrap shrink-0">
                                    Draft / Not Sent
                                </Badge>
                            )}
                        </div>
                    </div>
                </DialogHeader>

                {/* Shareable Link Bar (If already generated) */}
                {publicUrl && (
                    <div className="clay-card p-4 rounded-2xl bg-primary/5 border border-primary/20 space-y-2.5">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-extrabold uppercase tracking-wider text-primary flex items-center gap-1.5 whitespace-nowrap shrink-0">
                                <Globe className="h-3.5 w-3.5" /> Live Public Intake Link
                            </span>
                            <span className="text-[11px] text-muted-foreground font-semibold">
                                {client.onboardingSentAt ? `Sent on ${new Date(client.onboardingSentAt).toLocaleDateString()}` : 'Ready to share'}
                            </span>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                            <Input
                                readOnly
                                value={publicUrl}
                                className="text-xs font-mono bg-card select-all h-9 rounded-xl"
                            />
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={handleCopyLink}
                                className="clay-btn h-9 px-3 text-xs font-bold shrink-0 gap-1.5 whitespace-nowrap"
                            >
                                {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                                {copied ? 'Copied' : 'Copy Link'}
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => window.open(publicUrl, '_blank')}
                                className="clay-btn h-9 px-3 text-xs font-bold shrink-0 gap-1.5 whitespace-nowrap"
                            >
                                <ExternalLink className="h-3.5 w-3.5" /> Preview
                            </Button>
                            <Button
                                size="sm"
                                onClick={handleShareWhatsApp}
                                className="clay-btn bg-emerald-600 hover:bg-emerald-700 text-white h-9 px-3 text-xs font-bold shrink-0 gap-1.5 whitespace-nowrap"
                            >
                                <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                            </Button>
                        </div>
                    </div>
                )}

                <div className="space-y-6 pt-2">
                    {/* 1. Quick Industry Template Presets & Custom Template Creator */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <Label className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 whitespace-nowrap shrink-0">
                                <FolderKanban className="h-3.5 w-3.5 text-primary" /> 1. Select Recommended Industry Template ({templates.length})
                            </Label>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                    setTplName('')
                                    setTplDescription('')
                                    setTplIcon('Sparkles')
                                    setTplQuestions([])
                                    setIsCreatingTemplate(prev => !prev)
                                }}
                                className="clay-btn h-7 px-2.5 text-[11px] font-bold text-primary gap-1 rounded-xl whitespace-nowrap shrink-0"
                            >
                                <Plus className="h-3.5 w-3.5" /> {isCreatingTemplate ? 'Hide Creator' : '+ Create New Template'}
                            </Button>
                        </div>

                        {/* Inline Custom Template Creator */}
                        {isCreatingTemplate && (
                            <div className="clay-card p-4 rounded-2xl bg-primary/5 border border-primary/30 space-y-4 animate-in fade-in-50 duration-200">
                                <div className="flex items-center justify-between border-b border-border/40 pb-2">
                                    <div className="flex items-center gap-2">
                                        <div className="clay-icon h-7 w-7 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                                            <Sparkles className="h-3.5 w-3.5" />
                                        </div>
                                        <div>
                                            <h4 className="text-xs font-extrabold text-foreground">Create Reusable Industry Template</h4>
                                            <p className="text-[11px] text-muted-foreground">Define your own project category, icon, and tailored questions</p>
                                        </div>
                                    </div>
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => setIsCreatingTemplate(false)}
                                        className="h-7 w-7 p-0 rounded-lg text-muted-foreground hover:text-foreground"
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <Label className="text-[11px] font-bold text-foreground">Template Name *</Label>
                                        <Input
                                            value={tplName}
                                            onChange={e => setTplName(e.target.value)}
                                            placeholder="e.g. SaaS Platform, Real Estate, Video Production"
                                            className="text-xs h-8 rounded-lg"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-[11px] font-bold text-foreground">Short Description</Label>
                                        <Input
                                            value={tplDescription}
                                            onChange={e => setTplDescription(e.target.value)}
                                            placeholder="e.g. Cloud architecture, user tiers & roadmap"
                                            className="text-xs h-8 rounded-lg"
                                        />
                                    </div>
                                </div>

                                {/* Icon Picker */}
                                <div className="space-y-1.5">
                                    <Label className="text-[11px] font-bold text-foreground">Select Icon</Label>
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                        {AVAILABLE_ICONS.map(item => {
                                            const IconComp = item.icon
                                            const isSelected = tplIcon === item.id
                                            return (
                                                <button
                                                    key={item.id}
                                                    type="button"
                                                    onClick={() => setTplIcon(item.id)}
                                                    className={`clay-btn h-8 px-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                                                        isSelected
                                                            ? 'bg-primary text-white shadow-xs'
                                                            : 'bg-card text-muted-foreground hover:text-foreground border border-border/40'
                                                    }`}
                                                >
                                                    <IconComp className="h-3.5 w-3.5" />
                                                    <span className="text-[11px] whitespace-nowrap">{item.label}</span>
                                                </button>
                                            )
                                        })}
                                    </div>
                                </div>

                                <div className="flex items-center justify-between pt-1 border-t border-border/30">
                                    <span className="text-[11px] text-muted-foreground">
                                        Template will include <strong>{tplQuestions.length > 0 ? tplQuestions.length : config.customFields.length} questions</strong> from your form.
                                    </span>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setIsCreatingTemplate(false)}
                                            className="text-xs h-8 rounded-lg font-bold"
                                        >
                                            Cancel
                                        </Button>
                                        <Button
                                            type="button"
                                            size="sm"
                                            disabled={savingTemplate}
                                            onClick={handleSaveNewTemplate}
                                            className="clay-btn bg-primary text-white text-xs font-extrabold h-8 px-3 rounded-xl gap-1.5 shadow-sm"
                                        >
                                            <Check className="h-3.5 w-3.5" />
                                            {savingTemplate ? 'Saving...' : 'Save Template to Library'}
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                            {templates.map(tpl => {
                                const key = tpl._id || tpl.id || tpl.name
                                const Icon = getTemplateIcon(tpl.icon)
                                const isSelected = selectedTemplate === key || selectedTemplate === tpl._id || selectedTemplate === tpl.id
                                const isCustom = !tpl.isDefault

                                return (
                                    <div
                                        key={key}
                                        onClick={() => handleSelectTemplate(key)}
                                        className={`clay-card p-3 rounded-2xl text-left transition-all border cursor-pointer relative group ${
                                            isSelected
                                                ? 'border-primary ring-2 ring-primary/20 bg-primary/5'
                                                : 'hover:bg-muted/50 border-border/40'
                                        }`}
                                    >
                                        <div className="flex items-center justify-between gap-1 mb-1">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <div className={`clay-icon h-7 w-7 rounded-xl flex items-center justify-center shrink-0 ${isSelected ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'}`}>
                                                    <Icon className="h-3.5 w-3.5" />
                                                </div>
                                                <span className="font-extrabold text-xs text-foreground truncate">{tpl.name}</span>
                                            </div>
                                            {isCustom && (
                                                <div className="flex items-center gap-1 shrink-0">
                                                    <Badge className="clay-badge text-[9px] px-1.5 py-0 bg-violet-500/10 text-violet-600 border-violet-500/20 whitespace-nowrap shrink-0">
                                                        Custom
                                                    </Badge>
                                                    <button
                                                        type="button"
                                                        onClick={(e) => handleDeleteTemplate(key, tpl.name, e)}
                                                        className="h-6 w-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10 transition-colors"
                                                        title="Delete custom template"
                                                    >
                                                        <Trash2 className="h-3 w-3" />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                        <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                                            {tpl.description || `${tpl.fields?.length || 0} tailored intake questions`}
                                        </p>
                                    </div>
                                )
                            })}

                            {/* "+ Create New Template" button card */}
                            <button
                                type="button"
                                onClick={() => {
                                    setTplName('')
                                    setTplDescription('')
                                    setTplIcon('Sparkles')
                                    setTplQuestions([])
                                    setIsCreatingTemplate(true)
                                }}
                                className="clay-card p-3 rounded-2xl text-left transition-all border border-dashed border-primary/40 hover:border-primary hover:bg-primary/5 flex flex-col items-center justify-center min-h-[82px] text-center gap-1 group"
                            >
                                <div className="clay-icon h-7 w-7 rounded-xl bg-primary/10 text-primary flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <Plus className="h-4 w-4" />
                                </div>
                                <span className="font-extrabold text-xs text-primary whitespace-nowrap">+ Create New Template</span>
                                <span className="text-[10px] text-muted-foreground whitespace-nowrap">Add custom industry preset</span>
                            </button>
                        </div>
                    </div>

                    {/* 2. Welcome Message & Branding Greeting */}
                    <div className="clay-card p-4 rounded-2xl bg-card space-y-3 border border-border/40">
                        <Label className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 whitespace-nowrap shrink-0">
                            <MessageCircle className="h-3.5 w-3.5 text-primary" /> 2. Form Greeting & Welcome Note
                        </Label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <Label className="text-xs font-semibold text-foreground">Header Title</Label>
                                <Input
                                    value={config.welcomeTitle}
                                    onChange={e => setConfig(prev => ({ ...prev, welcomeTitle: e.target.value }))}
                                    placeholder="e.g. Welcome to NexCRM Onboarding"
                                    className="text-xs h-9 rounded-xl"
                                />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs font-semibold text-foreground">Welcome Subtitle / Instructions</Label>
                                <Input
                                    value={config.welcomeMessage}
                                    onChange={e => setConfig(prev => ({ ...prev, welcomeMessage: e.target.value }))}
                                    placeholder="Instructions for client"
                                    className="text-xs h-9 rounded-xl"
                                />
                            </div>
                        </div>
                    </div>

                    {/* 3. Standard Business Details Toggles */}
                    <div className="clay-card p-4 rounded-2xl bg-card space-y-3 border border-border/40">
                        <div className="flex items-center justify-between">
                            <Label className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 whitespace-nowrap shrink-0">
                                <Building2 className="h-3.5 w-3.5 text-primary" /> 3. Standard Business Fields to Request
                            </Label>
                            <span className="text-[11px] text-muted-foreground font-semibold">Toggled fields sync directly to CRM profile</span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                            {Object.entries({
                                company: 'Company Name',
                                website: 'Official Website',
                                gstNumber: 'GSTIN / Tax ID',
                                industry: 'Business Industry',
                                address: 'Registered Address',
                                city: 'City & State',
                                services: 'Services Interested',
                                budget: 'Estimated Budget',
                                expectedDeadline: 'Target Deadline'
                            }).map(([key, label]) => {
                                const isChecked = (config.standardFields as any)[key] ?? true
                                return (
                                    <div
                                        key={key}
                                        onClick={() => handleToggleStandardField(key as any)}
                                        className={`clay-inset p-2.5 rounded-xl flex items-center justify-between cursor-pointer transition-all ${
                                            isChecked ? 'bg-primary/5 border border-primary/20' : 'bg-muted/40 opacity-60'
                                        }`}
                                    >
                                        <span className="text-xs font-bold text-foreground truncate pr-2">{label}</span>
                                        <Switch
                                            checked={isChecked}
                                            onCheckedChange={() => handleToggleStandardField(key as any)}
                                            className="scale-75"
                                        />
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                    {/* 4. Tailored Questions & File Prompts */}
                    <div className="clay-card p-4 rounded-2xl bg-card space-y-3.5 border border-border/40">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                            <div className="flex items-center gap-2">
                                <Label className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 whitespace-nowrap shrink-0">
                                    <FileText className="h-3.5 w-3.5 text-primary" /> 4. Tailored Project Questions ({config.customFields.length})
                                </Label>
                                <Badge className="clay-badge text-[10px] bg-primary/10 text-primary border-primary/20 whitespace-nowrap shrink-0">
                                    Onboarding Tab
                                </Badge>
                            </div>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={handleOpenSaveCurrentAsTemplate}
                                className="clay-btn h-7 px-2.5 text-[11px] font-bold text-primary gap-1.5 rounded-xl whitespace-nowrap shrink-0"
                                title="Save these questions as a new reusable template"
                            >
                                <BookmarkPlus className="h-3.5 w-3.5" /> Save Questions as Template
                            </Button>
                        </div>

                        {/* List of active custom fields */}
                        <div className="space-y-2">
                            {config.customFields.map((field, idx) => (
                                <div
                                    key={field.id}
                                    className="clay-inset p-3 rounded-xl bg-card/60 flex items-center justify-between gap-3 border border-border/30 hover:border-border/60 transition-all"
                                >
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="font-mono text-[10px] text-muted-foreground font-bold">#{idx + 1}</span>
                                            <span className="text-xs font-extrabold text-foreground">{field.label}</span>
                                            {field.required && (
                                                <Badge className="clay-badge text-[9px] px-1.5 py-0 bg-rose-500/10 text-rose-600 border-0 whitespace-nowrap shrink-0">Required</Badge>
                                            )}
                                            <Badge className="clay-badge text-[9px] px-1.5 py-0 bg-muted text-muted-foreground border-0 uppercase whitespace-nowrap shrink-0">
                                                {field.type}
                                            </Badge>
                                        </div>
                                        {field.placeholder && (
                                            <p className="text-[11px] text-muted-foreground truncate mt-0.5 font-medium">Placeholder: "{field.placeholder}"</p>
                                        )}
                                        {field.options && field.options.length > 0 && (
                                            <p className="text-[10px] text-primary truncate mt-0.5 font-medium">
                                                Options: {field.options.join(', ')}
                                            </p>
                                        )}
                                    </div>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => handleRemoveCustomField(field.id)}
                                        className="h-8 w-8 p-0 text-muted-foreground hover:text-rose-600 rounded-lg shrink-0"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))}
                        </div>

                        {/* Add New Custom Question Builder */}
                        <div className="clay-card p-3.5 rounded-2xl bg-muted/20 border border-dashed border-border/60 space-y-3">
                            <span className="text-xs font-bold text-foreground flex items-center gap-1.5 whitespace-nowrap shrink-0">
                                <Plus className="h-3.5 w-3.5 text-primary" /> Add Custom Question / File Upload
                            </span>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                                <div className="sm:col-span-2 space-y-1">
                                    <Label className="text-[11px] font-semibold text-muted-foreground">Question Label *</Label>
                                    <Input
                                        value={newFieldLabel}
                                        onChange={e => setNewFieldLabel(e.target.value)}
                                        placeholder="e.g. Upload Your Brand Guidelines & Logo"
                                        className="text-xs h-8 rounded-lg"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-[11px] font-semibold text-muted-foreground">Field Type</Label>
                                    <Select value={newFieldType} onValueChange={(val: any) => setNewFieldType(val)}>
                                        <SelectTrigger className="text-xs h-8 rounded-lg">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="text">Text (Single line)</SelectItem>
                                            <SelectItem value="textarea">Textarea (Multi-line)</SelectItem>
                                            <SelectItem value="select">Dropdown Select</SelectItem>
                                            <SelectItem value="file">File Upload (Document/Image/Zip)</SelectItem>
                                            <SelectItem value="date">Date Picker</SelectItem>
                                            <SelectItem value="number">Number</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {newFieldType === 'select' && (
                                <div className="space-y-1">
                                    <Label className="text-[11px] font-semibold text-muted-foreground">Dropdown Options (comma separated)</Label>
                                    <Input
                                        value={newFieldOptions}
                                        onChange={e => setNewFieldOptions(e.target.value)}
                                        placeholder="Option 1, Option 2, Option 3"
                                        className="text-xs h-8 rounded-lg"
                                    />
                                </div>
                            )}

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 items-center">
                                <Input
                                    value={newFieldPlaceholder}
                                    onChange={e => setNewFieldPlaceholder(e.target.value)}
                                    placeholder="Helpful placeholder text for client..."
                                    className="text-xs h-8 rounded-lg"
                                />
                                <div className="flex items-center justify-between">
                                    <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-foreground whitespace-nowrap shrink-0">
                                        <Switch
                                            checked={newFieldRequired}
                                            onCheckedChange={setNewFieldRequired}
                                            className="scale-75"
                                        />
                                        Mandatory Field
                                    </label>
                                    <Button
                                        type="button"
                                        size="sm"
                                        onClick={handleAddCustomField}
                                        className="clay-btn bg-primary text-white text-xs font-bold h-8 px-3 rounded-xl gap-1 shadow-xs whitespace-nowrap shrink-0"
                                    >
                                        <Plus className="h-3.5 w-3.5" /> Add
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <DialogFooter className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-border/40">
                    <div className="text-xs text-muted-foreground font-medium">
                        {client.onboardingToken ? 'Link already active for this client' : 'Ready to generate shareable link'}
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <Button
                            variant="outline"
                            onClick={onClose}
                            className="clay-btn text-xs font-bold h-9 rounded-xl flex-1 sm:flex-none whitespace-nowrap"
                        >
                            Close
                        </Button>
                        {client.onboardingToken && (
                            <Button
                                variant="outline"
                                onClick={() => handleSaveAndGenerateLink(true)}
                                disabled={saving}
                                className="clay-btn text-xs font-bold h-9 rounded-xl gap-1.5 flex-1 sm:flex-none whitespace-nowrap"
                                title="Regenerate a brand new link"
                            >
                                <RefreshCw className={`h-3.5 w-3.5 ${saving ? 'animate-spin' : ''}`} />
                                New Token
                            </Button>
                        )}
                        <Button
                            onClick={() => handleSaveAndGenerateLink(false)}
                            disabled={saving}
                            className="clay-btn bg-primary hover:bg-primary/95 text-white text-xs font-extrabold h-9 px-4 rounded-xl shadow-md gap-1.5 flex-1 sm:flex-none whitespace-nowrap"
                        >
                            <Sparkles className="h-3.5 w-3.5" />
                            {saving ? 'Saving...' : publicUrl ? 'Update Configuration' : 'Save & Generate Link'}
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
