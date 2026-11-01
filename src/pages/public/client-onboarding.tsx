import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    Building2,
    User,
    Phone,
    Mail,
    MapPin,
    Globe,
    CreditCard,
    Briefcase,
    Calendar,
    Sparkles,
    UploadCloud,
    CheckCircle2,
    FileText,
    ArrowRight,
    Loader2,
    AlertCircle,
    MessageCircle
} from 'lucide-react';
import { useToast } from '../../hooks/use-toast';
import axios from 'axios';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Badge } from '../../components/ui/badge';

interface UploadedFile {
    fieldId: string;
    fieldName: string;
    fileName: string;
    fileUrl: string;
}

export function PublicClientOnboarding() {
    const { token: routeToken } = useParams<{ token?: string }>();
    const [searchParams] = useSearchParams();
    const token = routeToken || searchParams.get('token');

    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [fetchingForm, setFetchingForm] = useState(!!token);
    const [submitted, setSubmitted] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    // Agency & Form configuration (from API)
    const [agency, setAgency] = useState<any>({
        companyName: 'NexCRM Business Hub',
        logo: '',
        email: '',
        phone: ''
    });
    const [formConfig, setFormConfig] = useState<any>(null);

    // Standard client data
    const [formData, setFormData] = useState({
        name: '',
        company: '',
        phone: '',
        email: '',
        industry: '',
        city: '',
        state: '',
        country: '',
        website: '',
        gstNumber: '',
        address: '',
        services: '',
        budget: '',
        expectedDeadline: ''
    });

    // Custom questions responses
    const [customAnswers, setCustomAnswers] = useState<Record<string, any>>({});
    const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
    const [uploadingFieldId, setUploadingFieldId] = useState<string | null>(null);

    // Fetch form configuration if token is present
    useEffect(() => {
        if (!token) {
            setFetchingForm(false);
            return;
        }

        const fetchForm = async () => {
            setFetchingForm(true);
            setErrorMsg('');
            try {
                const res = await axios.get(
                    `${import.meta.env.VITE_API_URL || '/api'}/clients/public/onboarding-form/${token}`
                );
                const { client, agency: agencyData, config } = res.data;

                if (agencyData) setAgency(agencyData);
                if (config) setFormConfig(config);

                // If already completed
                if (client.onboardingStatus === 'completed') {
                    setSubmitted(true);
                }

                // Prefill standard fields from CRM record
                setFormData({
                    name: client.name || '',
                    company: client.company || '',
                    phone: client.phone || '',
                    email: client.email || '',
                    industry: client.industry || '',
                    city: client.city || '',
                    state: client.state || '',
                    country: client.country || '',
                    website: client.website || '',
                    gstNumber: client.gstNumber || '',
                    address: client.address || '',
                    services: Array.isArray(client.services) ? client.services.join(', ') : client.services || '',
                    budget: client.budget || '',
                    expectedDeadline: client.expectedDeadline ? String(client.expectedDeadline).slice(0, 10) : ''
                });

                // Prefill custom answers and files if any
                if (client.onboardingData) {
                    setCustomAnswers(client.onboardingData);
                }
                if (client.onboardingFiles) {
                    setUploadedFiles(client.onboardingFiles);
                }
            } catch (err: any) {
                console.error('Failed to fetch onboarding form', err);
                setErrorMsg(err.response?.data?.message || 'Invalid or expired onboarding form link.');
            } finally {
                setFetchingForm(false);
            }
        };

        fetchForm();
    }, [token]);

    const handleStandardChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleCustomAnswerChange = (fieldId: string, value: any) => {
        setCustomAnswers(prev => ({ ...prev, [fieldId]: value }));
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, fieldId: string, fieldName: string) => {
        const file = e.target.files?.[0];
        if (!file || !token) return;

        setUploadingFieldId(fieldId);
        const data = new FormData();
        data.append('file', file);
        data.append('fieldId', fieldId);
        data.append('fieldName', fieldName);

        try {
            const res = await axios.post(
                `${import.meta.env.VITE_API_URL || '/api'}/clients/public/onboarding-form/${token}/upload`,
                data,
                { headers: { 'Content-Type': 'multipart/form-data' } }
            );

            const newFile: UploadedFile = {
                fieldId,
                fieldName,
                fileName: res.data.fileName,
                fileUrl: res.data.fileUrl
            };

            setUploadedFiles(prev => [...prev.filter(f => f.fieldId !== fieldId), newFile]);
            setCustomAnswers(prev => ({ ...prev, [fieldId]: res.data.fileUrl }));
            toast({ title: 'File Uploaded', description: `${res.data.fileName} attached successfully!` });
        } catch (err: any) {
            console.error('File upload failed', err);
            toast({
                variant: 'destructive',
                title: 'Upload Failed',
                description: err.response?.data?.message || 'Failed to upload attachment.'
            });
        } finally {
            setUploadingFieldId(null);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const servicesArray = formData.services
                ? formData.services.split(',').map(s => s.trim()).filter(Boolean)
                : [];

            if (token) {
                // Submit to specific client token endpoint
                const payload = {
                    ...formData,
                    services: servicesArray,
                    onboardingData: customAnswers,
                    onboardingFiles: uploadedFiles
                };

                await axios.post(
                    `${import.meta.env.VITE_API_URL || '/api'}/clients/public/onboarding-form/${token}/submit`,
                    payload
                );
            } else {
                // Submit generic intake
                const payload = {
                    ...formData,
                    services: servicesArray
                };

                await axios.post(
                    `${import.meta.env.VITE_API_URL || '/api'}/clients/public/onboarding`,
                    payload
                );
            }

            setSubmitted(true);
            toast({
                title: 'Onboarding Submitted Successfully!',
                description: 'Our team will review your details and begin onboarding.'
            });
        } catch (error: any) {
            console.error('Submission error:', error);
            toast({
                variant: 'destructive',
                title: 'Submission Failed',
                description: error.response?.data?.message || 'There was an error submitting the form. Please try again later.'
            });
        } finally {
            setLoading(false);
        }
    };

    // Loading screen while fetching form config
    if (fetchingForm) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4">
                <div className="clay-card p-8 rounded-3xl bg-card max-w-sm w-full text-center space-y-4">
                    <Loader2 className="h-10 w-10 text-primary animate-spin mx-auto" />
                    <div>
                        <h3 className="font-extrabold text-base text-foreground">Loading Your Onboarding Portal...</h3>
                        <p className="text-xs text-muted-foreground mt-1">Fetching your tailored intake form</p>
                    </div>
                </div>
            </div>
        );
    }

    // Invalid link / error screen
    if (errorMsg) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4">
                <div className="clay-card p-8 rounded-3xl bg-card max-w-md w-full text-center space-y-4 border border-rose-200">
                    <div className="clay-icon h-14 w-14 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
                        <AlertCircle className="h-7 w-7" />
                    </div>
                    <h2 className="text-xl font-extrabold text-foreground">Invalid Onboarding Link</h2>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                        {errorMsg} Please contact your account representative for an updated link.
                    </p>
                    {agency.email && (
                        <div className="pt-2">
                            <a
                                href={`mailto:${agency.email}`}
                                className="clay-btn inline-flex items-center gap-2 bg-primary text-white text-xs font-bold px-4 py-2.5 rounded-xl"
                            >
                                <Mail className="h-4 w-4" /> Contact {agency.companyName || 'Support'}
                            </a>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // Thank you / confirmation screen
    if (submitted) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="clay-card max-w-lg w-full bg-card p-8 sm:p-10 rounded-3xl text-center space-y-5 shadow-xl border border-border/40"
                >
                    <div className="clay-icon w-20 h-20 bg-emerald-100 text-emerald-600 rounded-3xl flex items-center justify-center mx-auto shadow-sm">
                        <CheckCircle2 className="w-10 h-10" />
                    </div>

                    <div className="space-y-2">
                        <Badge className="clay-badge bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 font-extrabold px-3 py-1">
                            Onboarding Completed
                        </Badge>
                        <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground">
                            {formConfig?.successTitle || 'Thank You! Details Received'}
                        </h2>
                        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-md mx-auto">
                            {formConfig?.successMessage ||
                                `We have successfully received your information and assets. Our team has been notified and will proceed with the next steps immediately.`}
                        </p>
                    </div>

                    {/* Agency Contact Card */}
                    <div className="clay-inset p-4 rounded-2xl bg-muted/30 text-left space-y-2">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground block">
                            Direct Agency Support
                        </span>
                        <div className="flex items-center justify-between text-xs">
                            <span className="font-extrabold text-foreground">{agency.companyName}</span>
                            {agency.email && (
                                <a href={`mailto:${agency.email}`} className="text-primary hover:underline font-bold">
                                    {agency.email}
                                </a>
                            )}
                        </div>
                        {agency.phone && (
                            <div className="text-xs text-muted-foreground">
                                Phone: <span className="font-semibold text-foreground">{agency.phone}</span>
                            </div>
                        )}
                    </div>

                    {agency.phone && (
                        <div className="pt-2">
                            <a
                                href={`https://wa.me/${agency.phone.replace(/[^0-9]/g, '')}?text=Hello%2C%20I%20have%20submitted%20the%20onboarding%20form.`}
                                target="_blank"
                                rel="noreferrer"
                                className="clay-btn inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold w-full py-3 rounded-2xl shadow-md"
                            >
                                <MessageCircle className="h-4 w-4" /> Message Agency via WhatsApp
                            </a>
                        </div>
                    )}
                </motion.div>
            </div>
        );
    }

    // Determine field visibility according to config (if config is defined)
    const std = formConfig?.standardFields || {
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
    };

    const customFields = formConfig?.customFields || [];

    return (
        <div className="min-h-screen bg-slate-50/80 dark:bg-slate-950 py-10 px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto space-y-6">
                {/* Agency Brand Header */}
                <div className="text-center space-y-3">
                    {agency.logo ? (
                        <div className="clay-card inline-block p-2.5 rounded-2xl bg-card shadow-xs mx-auto">
                            <img src={agency.logo} alt={agency.companyName} className="h-10 max-w-[160px] object-contain" />
                        </div>
                    ) : (
                        <div className="clay-icon h-12 w-12 rounded-2xl bg-primary text-white flex items-center justify-center mx-auto font-black text-xl shadow-md">
                            {agency.companyName ? agency.companyName.charAt(0) : 'N'}
                        </div>
                    )}
                    <div>
                        <span className="clay-badge text-[10px] font-extrabold uppercase tracking-widest px-3 py-0.5 bg-primary/10 text-primary border-primary/20 inline-block mb-1">
                            {agency.companyName} • Client Intake Portal
                        </span>
                        <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
                            {formConfig?.welcomeTitle || 'Client Onboarding Form'}
                        </h1>
                        <p className="text-xs sm:text-sm text-muted-foreground max-w-xl mx-auto mt-1 leading-relaxed">
                            {formConfig?.welcomeMessage ||
                                'Please review and fill in your details and requirements so our delivery team can configure your account.'}
                        </p>
                    </div>
                </div>

                {/* Form Card */}
                <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="clay-card bg-card p-6 sm:p-9 rounded-3xl shadow-xl border border-border/40 space-y-8"
                >
                    <form onSubmit={handleSubmit} className="space-y-8">
                        {/* Section 1: Primary Contact */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2.5 pb-2.5 border-b border-border/40">
                                <div className="clay-icon h-8 w-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                                    <User className="h-4 w-4" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-extrabold uppercase tracking-wider text-foreground">
                                        1. Primary Contact Information
                                    </h3>
                                    <p className="text-[11px] text-muted-foreground">Main stakeholder and project point of contact</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <Label htmlFor="name" className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                        <User className="w-3.5 h-3.5 text-muted-foreground" /> Full Name *
                                    </Label>
                                    <Input
                                        id="name"
                                        name="name"
                                        required
                                        value={formData.name}
                                        onChange={handleStandardChange}
                                        placeholder="e.g. John Doe"
                                        className="clay-input text-xs h-10 rounded-xl"
                                    />
                                </div>

                                {std.company && (
                                    <div className="space-y-1.5">
                                        <Label htmlFor="company" className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                            <Building2 className="w-3.5 h-3.5 text-muted-foreground" /> Company / Brand Name
                                        </Label>
                                        <Input
                                            id="company"
                                            name="company"
                                            value={formData.company}
                                            onChange={handleStandardChange}
                                            placeholder="e.g. Acme Innovations Pvt Ltd"
                                            className="clay-input text-xs h-10 rounded-xl"
                                        />
                                    </div>
                                )}

                                <div className="space-y-1.5">
                                    <Label htmlFor="email" className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                        <Mail className="w-3.5 h-3.5 text-muted-foreground" /> Email Address *
                                    </Label>
                                    <Input
                                        id="email"
                                        name="email"
                                        type="email"
                                        required
                                        value={formData.email}
                                        onChange={handleStandardChange}
                                        placeholder="e.g. contact@company.com"
                                        className="clay-input text-xs h-10 rounded-xl"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <Label htmlFor="phone" className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                        <Phone className="w-3.5 h-3.5 text-muted-foreground" /> Phone / WhatsApp *
                                    </Label>
                                    <Input
                                        id="phone"
                                        name="phone"
                                        required
                                        value={formData.phone}
                                        onChange={handleStandardChange}
                                        placeholder="e.g. +91 98765 43210"
                                        className="clay-input text-xs h-10 rounded-xl"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Section 2: Business & Legal Details */}
                        {(std.website || std.gstNumber || std.address || std.city || std.industry) && (
                            <div className="space-y-4">
                                <div className="flex items-center gap-2.5 pb-2.5 border-b border-border/40">
                                    <div className="clay-icon h-8 w-8 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
                                        <Building2 className="h-4 w-4" />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-extrabold uppercase tracking-wider text-foreground">
                                            2. Business & Legal Details
                                        </h3>
                                        <p className="text-[11px] text-muted-foreground">Invoicing address and company registration</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {std.industry && (
                                        <div className="space-y-1.5">
                                            <Label htmlFor="industry" className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                                <Briefcase className="w-3.5 h-3.5 text-muted-foreground" /> Business Industry
                                            </Label>
                                            <Input
                                                id="industry"
                                                name="industry"
                                                value={formData.industry}
                                                onChange={handleStandardChange}
                                                placeholder="e.g. Fintech, Healthcare, E-Commerce"
                                                className="clay-input text-xs h-10 rounded-xl"
                                            />
                                        </div>
                                    )}

                                    {std.website && (
                                        <div className="space-y-1.5">
                                            <Label htmlFor="website" className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                                <Globe className="w-3.5 h-3.5 text-muted-foreground" /> Official Website
                                            </Label>
                                            <Input
                                                id="website"
                                                name="website"
                                                value={formData.website}
                                                onChange={handleStandardChange}
                                                placeholder="https://yourwebsite.com"
                                                className="clay-input text-xs h-10 rounded-xl"
                                            />
                                        </div>
                                    )}

                                    {std.gstNumber && (
                                        <div className="space-y-1.5">
                                            <Label htmlFor="gstNumber" className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                                <CreditCard className="w-3.5 h-3.5 text-muted-foreground" /> GSTIN / Tax Identification
                                            </Label>
                                            <Input
                                                id="gstNumber"
                                                name="gstNumber"
                                                value={formData.gstNumber}
                                                onChange={handleStandardChange}
                                                placeholder="e.g. 07AAAAA0000A1Z5 (optional)"
                                                className="clay-input text-xs h-10 rounded-xl"
                                            />
                                        </div>
                                    )}

                                    {std.city && (
                                        <div className="space-y-1.5">
                                            <Label htmlFor="city" className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                                <MapPin className="w-3.5 h-3.5 text-muted-foreground" /> City & State
                                            </Label>
                                            <Input
                                                id="city"
                                                name="city"
                                                value={formData.city}
                                                onChange={handleStandardChange}
                                                placeholder="e.g. Mumbai, Maharashtra"
                                                className="clay-input text-xs h-10 rounded-xl"
                                            />
                                        </div>
                                    )}

                                    {std.address && (
                                        <div className="space-y-1.5 sm:col-span-2">
                                            <Label htmlFor="address" className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                                <MapPin className="w-3.5 h-3.5 text-muted-foreground" /> Registered Billing Address
                                            </Label>
                                            <Textarea
                                                id="address"
                                                name="address"
                                                rows={2}
                                                value={formData.address}
                                                onChange={handleStandardChange}
                                                placeholder="Full street address for legal invoices"
                                                className="clay-input text-xs rounded-xl"
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Section 3: Project Requirements & Investment */}
                        {(std.services || std.budget || std.expectedDeadline) && (
                            <div className="space-y-4">
                                <div className="flex items-center gap-2.5 pb-2.5 border-b border-border/40">
                                    <div className="clay-icon h-8 w-8 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center">
                                        <Sparkles className="h-4 w-4" />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-extrabold uppercase tracking-wider text-foreground">
                                            3. Project Scope & Investment
                                        </h3>
                                        <p className="text-[11px] text-muted-foreground">Deliverables and timeline expectations</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {std.services && (
                                        <div className="space-y-1.5 sm:col-span-2">
                                            <Label htmlFor="services" className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                                <Briefcase className="w-3.5 h-3.5 text-muted-foreground" /> Required Services / Scope
                                            </Label>
                                            <Input
                                                id="services"
                                                name="services"
                                                value={formData.services}
                                                onChange={handleStandardChange}
                                                placeholder="e.g. Web Development, Mobile App, SEO (comma separated)"
                                                className="clay-input text-xs h-10 rounded-xl"
                                            />
                                        </div>
                                    )}

                                    {std.budget && (
                                        <div className="space-y-1.5">
                                            <Label htmlFor="budget" className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                                <CreditCard className="w-3.5 h-3.5 text-muted-foreground" /> Estimated Budget
                                            </Label>
                                            <Input
                                                id="budget"
                                                name="budget"
                                                value={formData.budget}
                                                onChange={handleStandardChange}
                                                placeholder="e.g. ₹1,50,000 or $3,000"
                                                className="clay-input text-xs h-10 rounded-xl"
                                            />
                                        </div>
                                    )}

                                    {std.expectedDeadline && (
                                        <div className="space-y-1.5">
                                            <Label htmlFor="expectedDeadline" className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                                <Calendar className="w-3.5 h-3.5 text-muted-foreground" /> Target Completion Date
                                            </Label>
                                            <Input
                                                id="expectedDeadline"
                                                name="expectedDeadline"
                                                type="date"
                                                value={formData.expectedDeadline}
                                                onChange={handleStandardChange}
                                                className="clay-input text-xs h-10 rounded-xl"
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Section 4: Tailored Questions & File Uploads (if custom fields configured) */}
                        {customFields.length > 0 && (
                            <div className="space-y-4">
                                <div className="flex items-center gap-2.5 pb-2.5 border-b border-border/40">
                                    <div className="clay-icon h-8 w-8 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center">
                                        <FileText className="h-4 w-4" />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-extrabold uppercase tracking-wider text-foreground">
                                            4. Project Intake Questionnaire & Assets
                                        </h3>
                                        <p className="text-[11px] text-muted-foreground">Specific details requested by our team</p>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    {customFields.map((field: any) => {
                                        const currentValue = customAnswers[field.id] || '';
                                        const existingFile = uploadedFiles.find(f => f.fieldId === field.id);

                                        return (
                                            <div key={field.id} className="space-y-1.5">
                                                <Label htmlFor={field.id} className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                                    {field.label} {field.required && <span className="text-rose-500">*</span>}
                                                </Label>
                                                {field.helpText && (
                                                    <p className="text-[11px] text-muted-foreground">{field.helpText}</p>
                                                )}

                                                {field.type === 'textarea' ? (
                                                    <Textarea
                                                        id={field.id}
                                                        required={field.required}
                                                        value={currentValue}
                                                        onChange={e => handleCustomAnswerChange(field.id, e.target.value)}
                                                        placeholder={field.placeholder || 'Your response...'}
                                                        rows={3}
                                                        className="clay-input text-xs rounded-xl"
                                                    />
                                                ) : field.type === 'select' ? (
                                                    <select
                                                        id={field.id}
                                                        required={field.required}
                                                        value={currentValue}
                                                        onChange={e => handleCustomAnswerChange(field.id, e.target.value)}
                                                        className="w-full clay-input text-xs h-10 rounded-xl px-3 bg-card border border-input focus:outline-none focus:ring-2 focus:ring-primary/20"
                                                    >
                                                        <option value="">Select an option...</option>
                                                        {(field.options || []).map((opt: string, i: number) => (
                                                            <option key={i} value={opt}>{opt}</option>
                                                        ))}
                                                    </select>
                                                ) : field.type === 'file' ? (
                                                    <div className="space-y-2">
                                                        <div className="clay-card p-4 rounded-2xl bg-muted/20 border border-dashed border-border/80 text-center hover:bg-muted/30 transition-all relative">
                                                            <input
                                                                type="file"
                                                                id={field.id}
                                                                onChange={e => handleFileUpload(e, field.id, field.label)}
                                                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                                            />
                                                            <div className="flex flex-col items-center justify-center gap-1.5">
                                                                {uploadingFieldId === field.id ? (
                                                                    <>
                                                                        <Loader2 className="h-6 w-6 text-primary animate-spin" />
                                                                        <span className="text-xs font-bold text-primary">Uploading attachment...</span>
                                                                    </>
                                                                ) : existingFile ? (
                                                                    <>
                                                                        <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                                                                        <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                                                                            File Attached: {existingFile.fileName}
                                                                        </span>
                                                                        <span className="text-[10px] text-muted-foreground">Click or drop to replace file</span>
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <UploadCloud className="h-6 w-6 text-muted-foreground" />
                                                                        <span className="text-xs font-bold text-foreground">
                                                                            Click to upload or drag & drop
                                                                        </span>
                                                                        <span className="text-[10px] text-muted-foreground">
                                                                            PDF, PNG, JPG, ZIP, DOCX (Max 25MB)
                                                                        </span>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ) : field.type === 'date' ? (
                                                    <Input
                                                        id={field.id}
                                                        type="date"
                                                        required={field.required}
                                                        value={currentValue}
                                                        onChange={e => handleCustomAnswerChange(field.id, e.target.value)}
                                                        className="clay-input text-xs h-10 rounded-xl"
                                                    />
                                                ) : field.type === 'number' ? (
                                                    <Input
                                                        id={field.id}
                                                        type="number"
                                                        required={field.required}
                                                        value={currentValue}
                                                        onChange={e => handleCustomAnswerChange(field.id, e.target.value)}
                                                        placeholder={field.placeholder || ''}
                                                        className="clay-input text-xs h-10 rounded-xl"
                                                    />
                                                ) : (
                                                    <Input
                                                        id={field.id}
                                                        type="text"
                                                        required={field.required}
                                                        value={currentValue}
                                                        onChange={e => handleCustomAnswerChange(field.id, e.target.value)}
                                                        placeholder={field.placeholder || ''}
                                                        className="clay-input text-xs h-10 rounded-xl"
                                                    />
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Submit Button */}
                        <div className="pt-4">
                            <Button
                                type="submit"
                                disabled={loading || !!uploadingFieldId}
                                className="clay-btn w-full bg-primary hover:bg-primary/95 text-white font-extrabold text-sm py-6 rounded-2xl shadow-lg transition-all gap-2"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" /> Submitting Details...
                                    </>
                                ) : (
                                    <>
                                        Submit Onboarding Details <ArrowRight className="h-4 w-4" />
                                    </>
                                )}
                            </Button>
                            <p className="text-center text-[11px] text-muted-foreground font-medium mt-2.5">
                                By submitting this form, you confirm that the information provided is accurate.
                            </p>
                        </div>
                    </form>
                </motion.div>
            </div>
        </div>
    );
}
