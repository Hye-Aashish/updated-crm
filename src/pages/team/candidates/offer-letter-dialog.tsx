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
    FileText, Download, Send, Loader2, Eye, Sparkles, Plus, Trash2, RotateCcw
} from 'lucide-react'
import api from '@/lib/api-client'
import { useToast } from '@/hooks/use-toast'

interface OfferLetterDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    candidate: any
    onSaved?: () => void
}

const DEFAULT_NEXPRISM_SECTIONS = [
    {
        id: 'place_of_work',
        title: 'Place of Work',
        content: `Your primary place of work will be {{work_location}}. You are expected to have a reliable internet connection and a suitable workspace to effectively perform your job duties. While your role is remote, you may be required to attend meetings, training sessions, or other events at the company's office or another designated location as needed, with reasonable notice.`,
        enabled: true
    },
    {
        id: 'working_hours',
        title: 'Working Hours',
        content: `Your regular working hours will be from 10:00am to 6:00pm, Monday to Saturday. You may be required to work additional hours based on the needs of the business.`,
        enabled: true
    },
    {
        id: 'confidentiality_nda',
        title: 'Confidentiality and Non-Disclosure',
        content: `You will be required to sign a Confidentiality Agreement as a condition of your employment. This agreement outlines your responsibility to protect the company's confidential information both during and after your employment.`,
        enabled: true
    },
    {
        id: 'code_data_usage',
        title: 'Code and Data Usage',
        content: `You are strictly prohibited from using any code, software, or proprietary information from the company for personal use without prior written consent. Furthermore, you may not share, leak, or disclose any code, company details, or confidential information to any third party or external entity without explicit permission from the company. Violating this term will be considered a serious breach of your employment agreement and may result in immediate termination and potential legal action.`,
        enabled: true
    },
    {
        id: 'client_communication',
        title: 'Client Communication and Reporting',
        content: `As a developer, you are not permitted to directly connect with clients without prior approval from the company. If a client reaches out to you directly, you are required to inform the company immediately. Any communication with clients must be conducted in accordance with the company’s guidelines and procedures.\nFailure to report such communication to the company may result in disciplinary action, up to and including legal action against you.`,
        enabled: true
    },
    {
        id: 'notice_period',
        title: 'Notice Period:',
        content: `The company may terminate the employee employment at any time without any reason by giving notice period of {{notice_period}} days or by payment of salary in lie there of.\nIf the employee is willing to leave the organization then he must inform before {{notice_period}} days and he must be transfer all his work to the new employee.`,
        enabled: true
    },
    {
        id: 'probation_period',
        title: 'Probationary Period',
        content: `Your initial employment will be subject to a probationary period of {{probation_period}} months. During this period, either party may terminate the employment with 7 days notice.`,
        enabled: true
    },
    {
        id: 'termination',
        title: 'Termination',
        content: `Your employment may be terminated by either party by providing {{notice_period}}days' written notice. In the event of gross misconduct or breach of contract, termination may be immediate and without notice.`,
        enabled: true
    },
    {
        id: 'code_of_conduct',
        title: 'Code of Conduct',
        content: `You are expected to adhere to the company's Code of Conduct, which includes guidelines on behavior, dress code, and professional interactions. Any violations may result in disciplinary action, up to and including termination.`,
        enabled: true
    },
    {
        id: 'non_solicitation',
        title: 'Confidentiality and Non-Solicitation',
        content: `While employed with the company, and even after your employment ends, you are strictly prohibited from using any client data whether it be contact information, project details, or any other information for personal benefit. You are also not permitted to share any client data with third parties.\nFurthermore, after leaving the company, you are not allowed to pitch or approach the company’s clients for any purpose. If you do so, the company reserves the right to take legal action against you.`,
        enabled: true
    },
    {
        id: 'dual_employment',
        title: 'Dual Employment / Outside Work Clause',
        content: `During your employment with the company, you are required to dedicate your full working hours exclusively to the duties assigned by the company. You shall not engage in any other employment, freelance work, business activity, or service paid or unpaid during working hours.\nIf you are found involved in any such activity, the company reserves the right to terminate your employment immediately. Additionally, any financial or reputational loss caused to the company due to such actions will be fully recoverable from you.`,
        enabled: true
    },
    {
        id: 'internal_politics',
        title: 'Internal/Company Politics Clause',
        content: `The Employee shall not engage in any form of office or internal company politics, including spreading rumors, creating conflicts among colleagues, favoring or influencing decisions for personal gain, or interfering in the Company’s management or decision-making processes. Any breach of this clause may result in disciplinary action, including termination, and the Company reserves the right to take legal action if deemed necessary.`,
        enabled: true
    },
    {
        id: 'other_conditions',
        title: 'Other Conditions',
        content: `Your employment is subject to the company’s standard terms and conditions, which may be amended from time to time. This offer is contingent upon successful completion of any pre-employment checks.\nPlease sign and return a copy of this letter by {{acceptance_deadline}} to confirm your acceptance of this offer.\nWe are excited about the prospect of you joining our team and look forward to your contributions to the continued success of Nexprism\nIf you have any questions or need further clarification, please do not hesitate to contact us.`,
        enabled: true
    }
]

export function OfferLetterDialog({ open, onOpenChange, candidate, onSaved }: OfferLetterDialogProps) {
    const { toast } = useToast()
    const [saving, setSaving] = useState(false)
    const [submittingApproval, setSubmittingApproval] = useState(false)
    const [activeTab, setActiveTab] = useState<'details' | 'clauses' | 'preview'>('clauses')

    // State for creating new clause
    const [newClauseTitle, setNewClauseTitle] = useState('')
    const [newClauseContent, setNewClauseContent] = useState('')

    // Form state
    const [formData, setFormData] = useState<any>({
        designation: '',
        department: 'Engineering',
        joiningDate: '',
        reportingTo: 'Management',
        workLocation: 'Work from Home',
        employmentType: 'Full Time',
        probationPeriodMonths: 3,
        noticePeriodDays: 15,
        validUntil: '',

        // Financials
        ctcAnnual: 600000,
        basicSalary: 25000,
        hra: 12500,
        specialAllowance: 12500,
        employeePf: 0,
        professionalTax: 200,

        // Content
        letterHeading: 'EMPLOYEEMENT AGREEMENT',
        introText: '',
        sections: DEFAULT_NEXPRISM_SECTIONS,
        signatoryCompany: 'Nexprism',
        signatoryEmail: 'Info@Nexprism.com',
        footerNote: 'Note: If you fail to perform your duties responsibly or your work performance is found unsatisfactory during the internship, the company reserves the right to cancel/terminate this internship offer at any time without prior notice.'
    })

    useEffect(() => {
        if (candidate) {
            const offer = candidate.offerLetter || {}
            const ctc = offer.ctcAnnual || 600000
            const basic = offer.basicSalary || Math.round((ctc / 12) * 0.5)
            const hra = offer.hra || Math.round(basic * 0.5)
            const special = offer.specialAllowance !== undefined ? offer.specialAllowance : Math.max(0, Math.round((ctc / 12) - basic - hra))

            const existingSections = Array.isArray(offer.sections) && offer.sections.length > 0
                ? offer.sections
                : DEFAULT_NEXPRISM_SECTIONS

            setFormData({
                designation: candidate.designation || 'MERN Developer',
                department: candidate.department || 'Engineering',
                joiningDate: offer.joiningDate ? offer.joiningDate.split('T')[0] : '',
                reportingTo: offer.reportingTo || 'Management',
                workLocation: offer.workLocation || 'Work from Home',
                employmentType: offer.employmentType || 'Full Time',
                probationPeriodMonths: offer.probationPeriodMonths || 3,
                noticePeriodDays: offer.noticePeriodDays || 15,
                validUntil: offer.validUntil ? offer.validUntil.split('T')[0] : '',

                ctcAnnual: ctc,
                basicSalary: basic,
                hra: hra,
                specialAllowance: special,
                employeePf: offer.employeePf || 0,
                professionalTax: offer.professionalTax || 200,

                letterHeading: offer.letterHeading || 'EMPLOYEEMENT AGREEMENT',
                introText: offer.introText || `This Employee Agreement is made on {{offer_date}} and will become effective as of {{joining_date}}. It outlines the terms of employment between Nexprism and ${candidate.name} for the position of {{designation}}`,
                sections: existingSections,
                signatoryCompany: offer.signatoryCompany || 'Nexprism',
                signatoryEmail: offer.signatoryEmail || 'Info@Nexprism.com',
                footerNote: offer.footerNote || 'Note: If you fail to perform your duties responsibly or your work performance is found unsatisfactory during the internship, the company reserves the right to cancel/terminate this internship offer at any time without prior notice.'
            })
        }
    }, [candidate, open])

    const handleSectionChange = (index: number, field: 'title' | 'content' | 'enabled', value: any) => {
        const updated = [...formData.sections]
        updated[index] = { ...updated[index], [field]: value }
        setFormData({ ...formData, sections: updated })
    }

    const handleDeleteSection = (index: number) => {
        const updated = formData.sections.filter((_: any, i: number) => i !== index)
        setFormData({ ...formData, sections: updated })
    }

    const handleAddCustomClause = () => {
        if (!newClauseTitle.trim() || !newClauseContent.trim()) {
            alert('Please enter both Clause Title and Content')
            return
        }
        const newSec = {
            id: 'clause_' + Date.now(),
            title: newClauseTitle.trim(),
            content: newClauseContent.trim(),
            enabled: true
        }
        setFormData({
            ...formData,
            sections: [...formData.sections, newSec]
        })
        setNewClauseTitle('')
        setNewClauseContent('')
        toast({ title: 'Clause Added', description: `Added "${newSec.title}" to agreement.` })
    }

    const resetToDefaultTemplate = () => {
        if (!confirm('Reset all clauses and text back to the exact Nexprism official sample template?')) return
        setFormData((prev: any) => ({
            ...prev,
            letterHeading: 'EMPLOYEEMENT AGREEMENT',
            introText: `This Employee Agreement is made on {{offer_date}} and will become effective as of {{joining_date}}. It outlines the terms of employment between Nexprism and ${candidate?.name} for the position of {{designation}}`,
            sections: DEFAULT_NEXPRISM_SECTIONS,
            footerNote: 'Note: If you fail to perform your duties responsibly or your work performance is found unsatisfactory during the internship, the company reserves the right to cancel/terminate this internship offer at any time without prior notice.'
        }))
        toast({ title: 'Reset Successful', description: 'Restored original Nexprism template content.' })
    }

    const saveOfferLetter = async () => {
        if (!candidate?._id) return
        try {
            setSaving(true)
            const res = await api.post(`/candidates/${candidate._id}/generate-offer`, formData)
            toast({
                title: 'Success',
                description: 'Offer letter content & clauses saved successfully.'
            })
            if (onSaved) onSaved()
            return res.data
        } catch (err: any) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: err.response?.data?.message || 'Failed to save offer letter'
            })
            return null
        } finally {
            setSaving(false)
        }
    }

    const handleRequestApproval = async () => {
        if (!candidate?._id) return
        try {
            setSubmittingApproval(true)
            // First save
            await api.post(`/candidates/${candidate._id}/generate-offer`, formData)
            // Then submit for approval
            await api.post(`/candidates/${candidate._id}/request-approval`, {
                notes: 'Generated with Nexprism official employment agreement template.'
            })
            toast({
                title: 'Submitted for Approval',
                description: 'Offer letter is now pending Admin / Management approval.'
            })
            if (onSaved) onSaved()
            onOpenChange(false)
        } catch (err: any) {
            toast({
                variant: 'destructive',
                title: 'Submission Failed',
                description: err.response?.data?.message || err.message
            })
        } finally {
            setSubmittingApproval(false)
        }
    }

    const [downloadingPdf, setDownloadingPdf] = useState(false)

    const downloadPdf = async () => {
        if (!candidate?._id) return
        try {
            setDownloadingPdf(true)
            toast({ title: 'Generating PDF...', description: 'Preparing official Employment Agreement.' })
            
            // First save current form data so PDF has latest changes
            await api.post(`/candidates/${candidate._id}/generate-offer`, formData)

            const res = await api.get(`/candidates/${candidate._id}/pdf`, { responseType: 'blob' })
            const blob = new Blob([res.data], { type: 'application/pdf' })
            const url = window.URL.createObjectURL(blob)
            
            // Trigger automatic download
            const a = document.createElement('a')
            a.href = url
            a.download = `Offer_Letter_${(candidate.name || 'Candidate').replace(/\s+/g, '_')}.pdf`
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)

            // Also open in new window
            window.open(url, '_blank')
            
            toast({ title: 'PDF Ready', description: 'Offer Letter PDF downloaded successfully.' })
        } catch (err: any) {
            toast({
                variant: 'destructive',
                title: 'PDF Download Failed',
                description: err.response?.data?.message || err.message || 'Could not download PDF'
            })
        } finally {
            setDownloadingPdf(false)
        }
    }

    const replacePlaceholders = (text: string) => {
        if (!text) return ''
        return text
            .replace(/{{candidate_name}}/gi, candidate?.name || 'Candidate')
            .replace(/{{designation}}/gi, formData.designation || 'MERN Developer')
            .replace(/{{work_location}}/gi, formData.workLocation || 'Work from Home')
            .replace(/{{notice_period}}/gi, `${formData.noticePeriodDays || 15}`)
            .replace(/{{probation_period}}/gi, `${formData.probationPeriodMonths || 3}`)
            .replace(/{{offer_date}}/gi, new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }))
            .replace(/{{joining_date}}/gi, formData.joiningDate || 'As discussed')
            .replace(/{{acceptance_deadline}}/gi, formData.validUntil || '16-Jan-25')
            .replace(/{{company_name}}/gi, 'Nexprism')
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-5xl max-h-[94vh] flex flex-col p-0 overflow-hidden">
                {/* Header */}
                <DialogHeader className="px-6 pt-5 pb-3 border-b bg-white">
                    <div className="flex items-center justify-between">
                        <div>
                            <DialogTitle className="text-base flex items-center gap-2">
                                <FileText className="h-5 w-5 text-[#0047AB]" /> Nexprism Employment Agreement & Offer Content Editor
                            </DialogTitle>
                            <DialogDescription className="text-xs">
                                Candidate: <strong>{candidate?.name}</strong> | Position: <strong>{formData.designation}</strong>
                            </DialogDescription>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" onClick={resetToDefaultTemplate} className="text-xs h-7 text-slate-600 hover:text-slate-900">
                                <RotateCcw className="h-3 w-3 mr-1" /> Reset Template
                            </Button>
                            <Badge variant="outline" className="text-xs bg-blue-50 text-blue-800 border-blue-200">
                                Status: {candidate?.status?.replace('_', ' ').toUpperCase()}
                            </Badge>
                        </div>
                    </div>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                    <Tabs value={activeTab} onValueChange={v => setActiveTab(v as any)} className="w-full">
                        <TabsList className="grid grid-cols-3 mb-4">
                            <TabsTrigger value="clauses" className="text-xs">
                                <FileText className="h-3.5 w-3.5 mr-1.5" /> 1. Edit & Add Clauses ({formData.sections?.length || 0})
                            </TabsTrigger>
                            <TabsTrigger value="details" className="text-xs">
                                <Sparkles className="h-3.5 w-3.5 mr-1.5" /> 2. Role, Dates & Work Config
                            </TabsTrigger>
                            <TabsTrigger value="preview" className="text-xs">
                                <Eye className="h-3.5 w-3.5 mr-1.5" /> 3. Live Letterhead Preview
                            </TabsTrigger>
                        </TabsList>

                        {/* 1. CLAUSES & CONTENT EDITOR TAB */}
                        <TabsContent value="clauses" className="space-y-4">
                            {/* Variable Placeholders Tip */}
                            <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-lg text-xs text-blue-900 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                <div className="space-y-1">
                                    <div className="font-semibold flex items-center gap-1.5">
                                        <Sparkles className="h-3.5 w-3.5 text-blue-600" /> Available Dynamic Placeholders:
                                    </div>
                                    <div className="flex flex-wrap gap-1.5 text-[11px]">
                                        <code className="bg-white px-1.5 py-0.5 rounded border border-blue-200">{'{{candidate_name}}'}</code>
                                        <code className="bg-white px-1.5 py-0.5 rounded border border-blue-200">{'{{designation}}'}</code>
                                        <code className="bg-white px-1.5 py-0.5 rounded border border-blue-200">{'{{work_location}}'}</code>
                                        <code className="bg-white px-1.5 py-0.5 rounded border border-blue-200">{'{{joining_date}}'}</code>
                                        <code className="bg-white px-1.5 py-0.5 rounded border border-blue-200">{'{{notice_period}}'}</code>
                                        <code className="bg-white px-1.5 py-0.5 rounded border border-blue-200">{'{{probation_period}}'}</code>
                                        <code className="bg-white px-1.5 py-0.5 rounded border border-blue-200">{'{{acceptance_deadline}}'}</code>
                                    </div>
                                </div>
                            </div>

                            {/* Agreement Title & Intro Paragraph */}
                            <div className="border rounded-lg p-4 bg-slate-50/50 space-y-3">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    <div>
                                        <Label className="text-xs font-semibold">Document Title</Label>
                                        <Input
                                            value={formData.letterHeading}
                                            onChange={e => setFormData({ ...formData, letterHeading: e.target.value })}
                                            className="text-xs mt-1 bg-white font-bold"
                                        />
                                    </div>
                                    <div className="md:col-span-2">
                                        <Label className="text-xs font-semibold">Introductory Agreement Sentence</Label>
                                        <Input
                                            value={formData.introText}
                                            onChange={e => setFormData({ ...formData, introText: e.target.value })}
                                            className="text-xs mt-1 bg-white"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* List of All Clauses / Sections */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                                        Agreement Clauses & Terms ({formData.sections?.length || 0})
                                    </h4>
                                    <span className="text-[11px] text-slate-500">Edit titles & text below or toggle checkboxes to exclude</span>
                                </div>

                                <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                                    {formData.sections?.map((sec: any, idx: number) => (
                                        <div
                                            key={sec.id || idx}
                                            className={`border rounded-lg p-3.5 transition-all ${
                                                sec.enabled !== false
                                                    ? 'bg-white shadow-sm border-slate-200 hover:border-blue-300'
                                                    : 'bg-slate-50 opacity-60 border-dashed border-slate-300'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between gap-3 mb-2">
                                                <div className="flex items-center gap-2 flex-1">
                                                    <input
                                                        type="checkbox"
                                                        checked={sec.enabled !== false}
                                                        onChange={e => handleSectionChange(idx, 'enabled', e.target.checked)}
                                                        className="rounded border-slate-300 text-primary cursor-pointer mt-0.5"
                                                    />
                                                    <Input
                                                        value={sec.title}
                                                        onChange={e => handleSectionChange(idx, 'title', e.target.value)}
                                                        placeholder="Clause Title"
                                                        className="text-xs font-bold h-7 max-w-sm bg-transparent border-slate-200"
                                                    />
                                                    <span className="text-[10px] text-slate-400 font-mono">#{idx + 1}</span>
                                                </div>

                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleDeleteSection(idx)}
                                                    className="h-7 w-7 p-0 text-slate-400 hover:text-red-600"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                            </div>

                                            <Textarea
                                                value={sec.content}
                                                onChange={e => handleSectionChange(idx, 'content', e.target.value)}
                                                placeholder="Write or edit clause content here..."
                                                rows={3}
                                                className="text-xs leading-relaxed text-slate-700 bg-slate-50/50"
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Add New Custom Clause Box */}
                            <div className="border border-dashed border-blue-300 rounded-lg p-4 bg-blue-50/30 space-y-3">
                                <div className="font-semibold text-xs text-blue-950 flex items-center gap-1.5">
                                    <Plus className="h-4 w-4 text-blue-600" /> Add New Clause to Agreement
                                </div>
                                <div className="space-y-2">
                                    <Input
                                        value={newClauseTitle}
                                        onChange={e => setNewClauseTitle(e.target.value)}
                                        placeholder="Clause Title (e.g. Intellectual Property Rights / Equipment Provision)"
                                        className="text-xs h-8 bg-white"
                                    />
                                    <Textarea
                                        value={newClauseContent}
                                        onChange={e => setNewClauseContent(e.target.value)}
                                        placeholder="Write clause details here. You can use placeholders like {{candidate_name}}, {{work_location}}, etc."
                                        rows={2}
                                        className="text-xs bg-white"
                                    />
                                    <div className="flex justify-end">
                                        <Button
                                            type="button"
                                            onClick={handleAddCustomClause}
                                            size="sm"
                                            className="text-xs h-8 bg-[#0047AB] text-white hover:bg-blue-700 font-semibold"
                                        >
                                            <Plus className="h-3 w-3 mr-1" /> Add This Clause
                                        </Button>
                                    </div>
                                </div>
                            </div>

                            {/* Signatory & Bottom Note Configuration */}
                            <div className="border rounded-lg p-4 bg-slate-50/50 space-y-3">
                                <h4 className="text-xs font-bold text-slate-800">Signatory & Footer Note</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div>
                                        <Label className="text-xs">Company Signatory Name</Label>
                                        <Input
                                            value={formData.signatoryCompany}
                                            onChange={e => setFormData({ ...formData, signatoryCompany: e.target.value })}
                                            className="text-xs mt-1 bg-white"
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-xs">Signatory Official Email</Label>
                                        <Input
                                            value={formData.signatoryEmail}
                                            onChange={e => setFormData({ ...formData, signatoryEmail: e.target.value })}
                                            className="text-xs mt-1 bg-white"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <Label className="text-xs">Bottom Performance / Internship Note</Label>
                                    <Textarea
                                        value={formData.footerNote}
                                        onChange={e => setFormData({ ...formData, footerNote: e.target.value })}
                                        rows={2}
                                        className="text-xs mt-1 bg-white"
                                    />
                                </div>
                            </div>
                        </TabsContent>

                        {/* 2. ROLE & CONFIG TAB */}
                        <TabsContent value="details" className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <Label className="text-xs">Designation / Role *</Label>
                                    <Input
                                        value={formData.designation}
                                        onChange={e => setFormData({ ...formData, designation: e.target.value })}
                                        placeholder="e.g. MERN Developer"
                                        className="text-xs mt-1"
                                    />
                                </div>
                                <div>
                                    <Label className="text-xs">Department *</Label>
                                    <Input
                                        value={formData.department}
                                        onChange={e => setFormData({ ...formData, department: e.target.value })}
                                        placeholder="Engineering"
                                        className="text-xs mt-1"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <Label className="text-xs">Effective Joining Date *</Label>
                                    <Input
                                        type="date"
                                        value={formData.joiningDate}
                                        onChange={e => setFormData({ ...formData, joiningDate: e.target.value })}
                                        className="text-xs mt-1"
                                    />
                                </div>
                                <div>
                                    <Label className="text-xs">Acceptance Deadline</Label>
                                    <Input
                                        type="date"
                                        value={formData.validUntil}
                                        onChange={e => setFormData({ ...formData, validUntil: e.target.value })}
                                        className="text-xs mt-1"
                                    />
                                </div>
                                <div>
                                    <Label className="text-xs">Primary Place of Work</Label>
                                    <select
                                        value={formData.workLocation}
                                        onChange={e => setFormData({ ...formData, workLocation: e.target.value })}
                                        className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs mt-1"
                                    >
                                        <option value="Work from Home">Work from Home</option>
                                        <option value="Office / On-site">Office / On-site</option>
                                        <option value="Hybrid">Hybrid</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <Label className="text-xs">Employment Type</Label>
                                    <select
                                        value={formData.employmentType}
                                        onChange={e => setFormData({ ...formData, employmentType: e.target.value })}
                                        className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs mt-1"
                                    >
                                        <option value="Full Time">Full Time</option>
                                        <option value="Part Time">Part Time</option>
                                        <option value="Internship">Internship</option>
                                        <option value="Contract">Contract</option>
                                    </select>
                                </div>
                                <div>
                                    <Label className="text-xs">Probation Period (Months)</Label>
                                    <Input
                                        type="number"
                                        value={formData.probationPeriodMonths}
                                        onChange={e => setFormData({ ...formData, probationPeriodMonths: Number(e.target.value) })}
                                        className="text-xs mt-1"
                                    />
                                </div>
                                <div>
                                    <Label className="text-xs">Notice Period (Days)</Label>
                                    <Input
                                        type="number"
                                        value={formData.noticePeriodDays}
                                        onChange={e => setFormData({ ...formData, noticePeriodDays: Number(e.target.value) })}
                                        className="text-xs mt-1"
                                    />
                                </div>
                            </div>
                        </TabsContent>

                        {/* 3. LIVE PREVIEW TAB */}
                        <TabsContent value="preview" className="space-y-4">
                            <div className="border-2 border-slate-300 rounded-xl p-8 bg-white shadow-xl space-y-6 text-xs text-slate-800 font-sans leading-relaxed">
                                {/* Header with Logo & Government Initiatives */}
                                <div className="border-b pb-4 flex flex-col sm:flex-row justify-between items-center gap-3">
                                    <div className="text-2xl font-black tracking-tight">
                                        <span className="text-[#0047AB]">NEX</span>
                                        <span className="text-[#00A699]">PRISM</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-[10px] font-bold text-slate-600 flex-wrap justify-center">
                                        <span className="text-[#0047AB]">🌐 Digital India</span> |
                                        <span className="text-[#E67E22]">🏢 MSME</span> |
                                        <span className="text-[#27AE60]">⚙️ MAKE IN INDIA</span> |
                                        <span className="text-[#D35400]">#startupindia</span>
                                    </div>
                                </div>

                                <div className="text-center">
                                    <h3 className="text-base font-bold uppercase tracking-wider text-slate-900">
                                        {formData.letterHeading || 'EMPLOYEEMENT AGREEMENT'}
                                    </h3>
                                </div>

                                <div className="space-y-1">
                                    <p className="font-bold text-slate-900 text-sm">{candidate?.name}</p>
                                    <p className="text-slate-700">
                                        <strong>Address : </strong>
                                        {candidate?.submittedData?.address?.currentAddress || '204, raghuvir appartment, hariom society, ved road, Surat City, Surat, Gujarat - 395004'}
                                    </p>
                                    <p className="font-bold text-slate-900 pt-1">Sub: Offer Letter.</p>
                                    <p className="text-slate-900">Dear, {candidate?.name}</p>
                                </div>

                                <p className="text-slate-700 leading-relaxed text-justify">
                                    {replacePlaceholders(formData.introText)}
                                </p>

                                {/* Render All Enabled Sections */}
                                <div className="space-y-4 pt-2">
                                    {formData.sections?.filter((s: any) => s.enabled !== false).map((sec: any, idx: number) => (
                                        <div key={sec.id || idx} className="space-y-1">
                                            <h4 className="font-bold text-slate-900 text-xs">{replacePlaceholders(sec.title)}</h4>
                                            <p className="text-slate-700 leading-relaxed text-justify whitespace-pre-line">
                                                {replacePlaceholders(sec.content)}
                                            </p>
                                        </div>
                                    ))}
                                </div>

                                {/* Signatures */}
                                <div className="pt-6 border-t space-y-4">
                                    <div className="space-y-1 text-slate-900">
                                        <h4 className="font-bold text-xs">SINGED AND DELIVERED</h4>
                                        <p><strong>Company name: </strong>{formData.signatoryCompany || 'Nexprism'}</p>
                                        <p><strong>Email: </strong>{formData.signatoryEmail || 'Info@Nexprism.com'}</p>
                                        <div className="pt-1 font-bold">SIGNED AND DELIVERED</div>
                                        <div className="text-[11px] text-slate-500">Authorized Signatory</div>
                                        <div className="h-14 w-28 border border-dashed border-blue-300 bg-blue-50/40 rounded flex flex-col items-center justify-center text-[9px] text-blue-800 font-bold mt-1">
                                            <span>NEXPRISM PVT LTD</span>
                                            <span className="text-[8px] text-slate-400 font-normal">OFFICIAL SEAL</span>
                                        </div>
                                    </div>

                                    <div className="p-3 border border-dashed border-slate-300 rounded bg-slate-50 space-y-1.5">
                                        <h4 className="font-bold text-slate-900 text-xs">Employee Acknowledgment:</h4>
                                        <p className="text-slate-700 text-[11px]">
                                            I, <strong>{candidate?.name}</strong> hereby accept the terms and conditions of employment as outlined in this letter.
                                        </p>
                                        <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                                            <div>Signature: _______________________</div>
                                            <div>Date: ___________________________</div>
                                        </div>
                                    </div>

                                    <div className="bg-amber-50 border border-amber-200 text-amber-900 p-2.5 rounded text-[11px]">
                                        {formData.footerNote}
                                    </div>
                                </div>

                                {/* Multi-Office Footer Banner */}
                                <div className="bg-[#0B4F8A] text-white p-4 rounded text-[10px] text-center space-y-1">
                                    <div className="font-bold text-[11px]">Nexprism (Information Technology Company)</div>
                                    <div className="text-blue-100 text-[9px]">Mathura (Regd.Office) | Surat (Corporate Office) | Mumbai (Sales.Office)</div>
                                    <div className="font-semibold text-[9px]">| E-mail: info@nexprism.com | www.Nexprism.com | Contact no. (+91) 7505974545</div>
                                </div>
                            </div>
                        </TabsContent>
                    </Tabs>
                </div>

                {/* Footer Actions */}
                <DialogFooter className="px-6 py-3 border-t bg-slate-50 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
                            Close
                        </Button>
                        <Button variant="ghost" size="sm" onClick={downloadPdf} className="text-xs">
                            <Download className="h-3.5 w-3.5 mr-1" /> PDF Preview
                        </Button>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={saveOfferLetter}
                            disabled={saving}
                            className="text-xs"
                        >
                            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
                            Save Content & Clauses
                        </Button>
                        <Button
                            size="sm"
                            onClick={handleRequestApproval}
                            disabled={submittingApproval}
                            className="bg-[#0047AB] text-white hover:bg-blue-700 font-semibold text-xs"
                        >
                            {submittingApproval ? (
                                <>
                                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> Submitting...
                                </>
                            ) : (
                                <>
                                    <Send className="h-3.5 w-3.5 mr-1" /> Submit for Admin Approval
                                </>
                            )}
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
export default OfferLetterDialog
