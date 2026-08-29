import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
    CheckCircle2, Upload, FileText, AlertCircle, Loader2,
    Building2, ShieldCheck, User, MapPin, GraduationCap, Landmark,
    Eye, Trash2
} from 'lucide-react'
import axios from 'axios'

export function PublicCandidateForm() {
    const { token } = useParams<{ token: string }>()
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState(false)

    const [candidate, setCandidate] = useState<any>(null)
    const [formConfig, setFormConfig] = useState<any>(null)
    const [companyProfile, setCompanyProfile] = useState<any>(null)

    // Form sections state
    const [personal, setPersonal] = useState<any>({
        salutation: 'Mr.',
        gender: 'Male',
        dateOfBirth: '',
        fatherName: '',
        motherName: '',
        bloodGroup: '',
        maritalStatus: 'Single',
        alternatePhone: '',
        emergencyContactName: '',
        emergencyContactPhone: '',
        emergencyContactRelation: ''
    })

    const [address, setAddress] = useState<any>({
        currentAddress: '',
        currentCity: '',
        currentState: '',
        currentPincode: '',
        permanentAddress: '',
        permanentCity: '',
        permanentState: '',
        permanentPincode: '',
        isSameAsCurrent: false
    })

    const [education, setEducation] = useState<any>({
        highestQualification: '',
        institution: '',
        passingYear: '',
        percentageOrCgpa: '',
        totalExperienceYears: '',
        previousCompany: '',
        previousDesignation: '',
        previousSalary: ''
    })

    const [bank, setBank] = useState<any>({
        accountHolderName: '',
        accountNumber: '',
        bankName: '',
        ifscCode: '',
        branchName: '',
        panNumber: '',
        aadharNumber: '',
        uanNumber: ''
    })

    const [documents, setDocuments] = useState<any[]>([])
    const [uploadingDocId, setUploadingDocId] = useState<string | null>(null)
    const [activeTab, setActiveTab] = useState<'personal' | 'address' | 'education' | 'bank' | 'documents'>('personal')

    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

    useEffect(() => {
        const fetchCandidateForm = async () => {
            try {
                setLoading(true)
                const res = await axios.get(`${API_URL}/candidates/public/${token}`)
                setCandidate(res.data.candidate)
                setFormConfig(res.data.formConfig)
                setCompanyProfile(res.data.companyProfile)

                if (res.data.candidate.submittedData) {
                    const sd = res.data.candidate.submittedData
                    if (sd.personal) setPersonal((prev: any) => ({ ...prev, ...sd.personal }))
                    if (sd.address) setAddress((prev: any) => ({ ...prev, ...sd.address }))
                    if (sd.education) setEducation((prev: any) => ({ ...prev, ...sd.education }))
                    if (sd.bank) setBank((prev: any) => ({ ...prev, ...sd.bank }))
                }

                if (res.data.candidate.documents) {
                    setDocuments(res.data.candidate.documents)
                }

                if (res.data.candidate.status !== 'invited' && res.data.candidate.status !== 'submitted') {
                    // Already processed
                }
            } catch (err: any) {
                setError(err.response?.data?.message || 'Invalid or expired onboarding form link.')
            } finally {
                setLoading(false)
            }
        }

        if (token) fetchCandidateForm()
    }, [token])

    const handleFileUpload = async (docId: string, docName: string, file: File) => {
        try {
            setUploadingDocId(docId)
            const formData = new FormData()
            formData.append('file', file)
            formData.append('documentId', docId)
            formData.append('name', docName)

            const res = await axios.post(`${API_URL}/candidates/public/${token}/upload`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            })

            if (res.data.success) {
                setDocuments(prev => {
                    const filtered = prev.filter(d => d.documentId !== docId)
                    return [...filtered, res.data.document]
                })
            }
        } catch (err: any) {
            alert('File upload failed: ' + (err.response?.data?.message || err.message))
        } finally {
            setUploadingDocId(null)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        try {
            setSubmitting(true)
            setError(null)

            // Validate required documents
            const requiredDocs = formConfig?.requiredDocuments?.filter((d: any) => d.enabled && d.required) || []
            const missingDocs = requiredDocs.filter((reqDoc: any) => !documents.some(d => d.documentId === reqDoc.id))

            if (missingDocs.length > 0) {
                setActiveTab('documents')
                alert(`Please upload the required document(s): ${missingDocs.map((d: any) => d.name).join(', ')}`)
                setSubmitting(false)
                return
            }

            const payload = {
                personal,
                address,
                education,
                bank
            }

            const res = await axios.post(`${API_URL}/candidates/public/${token}/submit`, payload)
            if (res.data.success) {
                setSuccess(true)
            }
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to submit form. Please try again.')
        } finally {
            setSubmitting(false)
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                <div className="text-center space-y-3">
                    <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
                    <p className="text-sm font-medium text-slate-600">Loading Onboarding Portal...</p>
                </div>
            </div>
        )
    }

    if (error && !candidate) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                <Card className="max-w-md w-full shadow-lg border-red-100">
                    <CardHeader className="text-center pb-2">
                        <div className="h-12 w-12 rounded-full bg-red-50 text-red-500 flex items-center justify-center mx-auto mb-2">
                            <AlertCircle className="h-6 w-6" />
                        </div>
                        <CardTitle className="text-xl text-red-600">Link Inactive</CardTitle>
                        <CardDescription>{error}</CardDescription>
                    </CardHeader>
                    <CardContent className="text-center text-xs text-slate-500 pb-6">
                        If you believe this is an error, please reach out to the HR department.
                    </CardContent>
                </Card>
            </div>
        )
    }

    if (success) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50/40 flex items-center justify-center p-4">
                <Card className="max-w-lg w-full shadow-xl border-blue-100/60 overflow-hidden">
                    <div className="bg-primary px-6 py-8 text-center text-white">
                        <div className="h-16 w-16 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center mx-auto mb-4">
                            <CheckCircle2 className="h-10 w-10 text-white" />
                        </div>
                        <h2 className="text-2xl font-bold">Submission Complete!</h2>
                        <p className="text-blue-100 text-sm mt-1">Thank you, {candidate?.name}</p>
                    </div>
                    <CardContent className="p-6 space-y-4 text-center">
                        <p className="text-slate-600 text-sm leading-relaxed">
                            Your onboarding information and documents have been securely uploaded to <strong>{companyProfile?.name || 'our system'}</strong>.
                        </p>
                        <div className="bg-blue-50/60 rounded-lg p-4 border border-blue-100 text-left text-xs text-blue-900 space-y-2">
                            <div className="font-semibold flex items-center gap-1.5 text-blue-950">
                                <ShieldCheck className="h-4 w-4 text-blue-600" /> Next Steps:
                            </div>
                            <p>1. Our HR team will review your submitted documents.</p>
                            <p>2. Your official Offer Letter will be prepared and approved by management.</p>
                            <p>3. You will receive your official Offer Letter on <strong>{candidate?.email}</strong>.</p>
                        </div>
                        <p className="text-xs text-slate-400">You may close this window now.</p>
                    </CardContent>
                </Card>
            </div>
        )
    }

    const enabledDocs = formConfig?.requiredDocuments?.filter((d: any) => d.enabled) || []

    return (
        <div className="min-h-screen bg-slate-50/80 pb-16">
            {/* Top Branded Bar */}
            <header className="bg-white border-b sticky top-0 z-30 shadow-sm">
                <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        {companyProfile?.logo ? (
                            <img src={companyProfile.logo} alt="Logo" className="max-h-8 w-auto object-contain" />
                        ) : (
                            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold">
                                <Building2 className="h-5 w-5" />
                            </div>
                        )}
                        <div>
                            <span className="font-bold text-slate-900 text-base">{companyProfile?.name || 'NEXPRISM'}</span>
                            <span className="hidden sm:inline-block text-xs text-slate-400 ml-2">| Candidate Onboarding</span>
                        </div>
                    </div>
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs px-2.5 py-0.5">
                        {candidate?.designation || 'New Candidate'}
                    </Badge>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-4 mt-6">
                {/* Hero Card */}
                <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-xl p-6 text-white shadow-md mb-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h1 className="text-xl md:text-2xl font-bold">{formConfig?.title || 'Candidate Onboarding & Document Verification'}</h1>
                            <p className="text-blue-100 text-xs md:text-sm mt-1 max-w-2xl">
                                Welcome <strong>{candidate?.name}</strong>. Please provide your information and upload verified documents to generate your official offer letter.
                            </p>
                        </div>
                        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-lg px-4 py-2 text-xs text-blue-50 shrink-0">
                            <div>Candidate: <strong>{candidate?.name}</strong></div>
                            <div>Role: <strong>{candidate?.designation || 'Employee'}</strong></div>
                        </div>
                    </div>
                </div>

                {/* Instructions Alert */}
                {formConfig?.instructions && (
                    <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-lg p-3.5 mb-6 text-xs flex items-start gap-2.5 shadow-sm">
                        <ShieldCheck className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                            <span className="font-semibold">Important Instructions: </span>
                            {formConfig.instructions}
                        </div>
                    </div>
                )}

                {/* Section Navigation Tabs */}
                <div className="flex overflow-x-auto gap-2 mb-6 border-b pb-2 no-scrollbar">
                    {[
                        { id: 'personal', label: '1. Personal Details', icon: User },
                        { id: 'address', label: '2. Address Info', icon: MapPin },
                        { id: 'education', label: '3. Education & Work', icon: GraduationCap },
                        { id: 'bank', label: '4. Bank & Statutory', icon: Landmark },
                        { id: 'documents', label: `5. Upload Documents (${documents.length}/${enabledDocs.length})`, icon: FileText }
                    ].map(tab => {
                        const Icon = tab.icon
                        const isActive = activeTab === tab.id
                        return (
                            <button
                                key={tab.id}
                                type="button"
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                                    isActive
                                        ? 'bg-primary text-white shadow-sm'
                                        : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                                }`}
                            >
                                <Icon className="h-3.5 w-3.5" />
                                {tab.label}
                            </button>
                        )
                    })}
                </div>

                <form onSubmit={handleSubmit}>
                    {/* 1. PERSONAL DETAILS TAB */}
                    {activeTab === 'personal' && (
                        <Card className="shadow-sm">
                            <CardHeader className="pb-4">
                                <CardTitle className="text-base flex items-center gap-2">
                                    <User className="h-4 w-4 text-primary" /> Personal Information
                                </CardTitle>
                                <CardDescription>Enter your primary identity and contact details</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <Label className="text-xs">Salutation</Label>
                                        <select
                                            value={personal.salutation || 'Mr.'}
                                            onChange={e => setPersonal({ ...personal, salutation: e.target.value })}
                                            className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs"
                                        >
                                            <option value="Mr.">Mr.</option>
                                            <option value="Ms.">Ms.</option>
                                            <option value="Mrs.">Mrs.</option>
                                            <option value="Dr.">Dr.</option>
                                        </select>
                                    </div>
                                    <div className="md:col-span-2">
                                        <Label className="text-xs">Full Legal Name</Label>
                                        <Input
                                            value={candidate?.name || ''}
                                            disabled
                                            className="bg-slate-50 text-xs"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <Label className="text-xs">Gender *</Label>
                                        <select
                                            value={personal.gender || 'Male'}
                                            onChange={e => setPersonal({ ...personal, gender: e.target.value })}
                                            className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs"
                                            required
                                        >
                                            <option value="Male">Male</option>
                                            <option value="Female">Female</option>
                                            <option value="Other">Other</option>
                                        </select>
                                    </div>
                                    <div>
                                        <Label className="text-xs">Date of Birth *</Label>
                                        <Input
                                            type="date"
                                            value={personal.dateOfBirth ? personal.dateOfBirth.split('T')[0] : ''}
                                            onChange={e => setPersonal({ ...personal, dateOfBirth: e.target.value })}
                                            required
                                            className="text-xs"
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-xs">Blood Group</Label>
                                        <select
                                            value={personal.bloodGroup || ''}
                                            onChange={e => setPersonal({ ...personal, bloodGroup: e.target.value })}
                                            className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs"
                                        >
                                            <option value="">Select Blood Group</option>
                                            <option value="A+">A+</option>
                                            <option value="A-">A-</option>
                                            <option value="B+">B+</option>
                                            <option value="B-">B-</option>
                                            <option value="AB+">AB+</option>
                                            <option value="AB-">AB-</option>
                                            <option value="O+">O+</option>
                                            <option value="O-">O-</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <Label className="text-xs">Father's Name *</Label>
                                        <Input
                                            value={personal.fatherName || ''}
                                            onChange={e => setPersonal({ ...personal, fatherName: e.target.value })}
                                            placeholder="Enter Father's full name"
                                            required
                                            className="text-xs"
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-xs">Mother's Name</Label>
                                        <Input
                                            value={personal.motherName || ''}
                                            onChange={e => setPersonal({ ...personal, motherName: e.target.value })}
                                            placeholder="Enter Mother's full name"
                                            className="text-xs"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <Label className="text-xs">Marital Status</Label>
                                        <select
                                            value={personal.maritalStatus || 'Single'}
                                            onChange={e => setPersonal({ ...personal, maritalStatus: e.target.value })}
                                            className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs"
                                        >
                                            <option value="Single">Single</option>
                                            <option value="Married">Married</option>
                                            <option value="Other">Other</option>
                                        </select>
                                    </div>
                                    <div>
                                        <Label className="text-xs">Primary Email</Label>
                                        <Input value={candidate?.email || ''} disabled className="bg-slate-50 text-xs" />
                                    </div>
                                    <div>
                                        <Label className="text-xs">Alternate Phone No</Label>
                                        <Input
                                            value={personal.alternatePhone || ''}
                                            onChange={e => setPersonal({ ...personal, alternatePhone: e.target.value })}
                                            placeholder="Optional second number"
                                            className="text-xs"
                                        />
                                    </div>
                                </div>

                                <div className="pt-2 border-t mt-4">
                                    <h4 className="text-xs font-semibold text-slate-800 mb-3 flex items-center gap-1.5">
                                        <AlertCircle className="h-3.5 w-3.5 text-blue-600" /> Emergency Contact Details
                                    </h4>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div>
                                            <Label className="text-xs">Contact Person Name *</Label>
                                            <Input
                                                value={personal.emergencyContactName || ''}
                                                onChange={e => setPersonal({ ...personal, emergencyContactName: e.target.value })}
                                                placeholder="e.g. Spouse / Parent / Sibling"
                                                required
                                                className="text-xs"
                                            />
                                        </div>
                                        <div>
                                            <Label className="text-xs">Emergency Phone *</Label>
                                            <Input
                                                value={personal.emergencyContactPhone || ''}
                                                onChange={e => setPersonal({ ...personal, emergencyContactPhone: e.target.value })}
                                                placeholder="10-digit emergency number"
                                                required
                                                className="text-xs"
                                            />
                                        </div>
                                        <div>
                                            <Label className="text-xs">Relationship *</Label>
                                            <Input
                                                value={personal.emergencyContactRelation || ''}
                                                onChange={e => setPersonal({ ...personal, emergencyContactRelation: e.target.value })}
                                                placeholder="e.g. Father / Mother / Wife"
                                                required
                                                className="text-xs"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="flex justify-end pt-4">
                                    <Button type="button" onClick={() => setActiveTab('address')} size="sm">
                                        Next: Address Details &rarr;
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* 2. ADDRESS INFO TAB */}
                    {activeTab === 'address' && (
                        <Card className="shadow-sm">
                            <CardHeader className="pb-4">
                                <CardTitle className="text-base flex items-center gap-2">
                                    <MapPin className="h-4 w-4 text-primary" /> Residential Address Details
                                </CardTitle>
                                <CardDescription>Provide your current and permanent residential address</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-3">
                                    <h4 className="text-xs font-semibold text-slate-800">Current Address</h4>
                                    <div>
                                        <Label className="text-xs">Street / House / Area *</Label>
                                        <Textarea
                                            value={address.currentAddress || ''}
                                            onChange={e => setAddress({ ...address, currentAddress: e.target.value })}
                                            placeholder="Enter complete current street address"
                                            rows={2}
                                            required
                                            className="text-xs"
                                        />
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div>
                                            <Label className="text-xs">City *</Label>
                                            <Input
                                                value={address.currentCity || ''}
                                                onChange={e => setAddress({ ...address, currentCity: e.target.value })}
                                                placeholder="City"
                                                required
                                                className="text-xs"
                                            />
                                        </div>
                                        <div>
                                            <Label className="text-xs">State *</Label>
                                            <Input
                                                value={address.currentState || ''}
                                                onChange={e => setAddress({ ...address, currentState: e.target.value })}
                                                placeholder="State"
                                                required
                                                className="text-xs"
                                            />
                                        </div>
                                        <div>
                                            <Label className="text-xs">Pincode / ZIP *</Label>
                                            <Input
                                                value={address.currentPincode || ''}
                                                onChange={e => setAddress({ ...address, currentPincode: e.target.value })}
                                                placeholder="6-digit Pincode"
                                                required
                                                className="text-xs"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-4 border-t space-y-3">
                                    <div className="flex items-center justify-between">
                                        <h4 className="text-xs font-semibold text-slate-800">Permanent Address</h4>
                                        <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={address.isSameAsCurrent || false}
                                                onChange={e => {
                                                    const checked = e.target.checked
                                                    setAddress({
                                                        ...address,
                                                        isSameAsCurrent: checked,
                                                        permanentAddress: checked ? address.currentAddress : address.permanentAddress,
                                                        permanentCity: checked ? address.currentCity : address.permanentCity,
                                                        permanentState: checked ? address.currentState : address.permanentState,
                                                        permanentPincode: checked ? address.currentPincode : address.permanentPincode
                                                    })
                                                }}
                                                className="rounded border-slate-300 text-primary"
                                            />
                                            Same as Current Address
                                        </label>
                                    </div>

                                    {!address.isSameAsCurrent && (
                                        <>
                                            <div>
                                                <Label className="text-xs">Permanent Street Address</Label>
                                                <Textarea
                                                    value={address.permanentAddress || ''}
                                                    onChange={e => setAddress({ ...address, permanentAddress: e.target.value })}
                                                    placeholder="Permanent address"
                                                    rows={2}
                                                    className="text-xs"
                                                />
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                <div>
                                                    <Label className="text-xs">City</Label>
                                                    <Input
                                                        value={address.permanentCity || ''}
                                                        onChange={e => setAddress({ ...address, permanentCity: e.target.value })}
                                                        placeholder="City"
                                                        className="text-xs"
                                                    />
                                                </div>
                                                <div>
                                                    <Label className="text-xs">State</Label>
                                                    <Input
                                                        value={address.permanentState || ''}
                                                        onChange={e => setAddress({ ...address, permanentState: e.target.value })}
                                                        placeholder="State"
                                                        className="text-xs"
                                                    />
                                                </div>
                                                <div>
                                                    <Label className="text-xs">Pincode</Label>
                                                    <Input
                                                        value={address.permanentPincode || ''}
                                                        onChange={e => setAddress({ ...address, permanentPincode: e.target.value })}
                                                        placeholder="Pincode"
                                                        className="text-xs"
                                                    />
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>

                                <div className="flex justify-between pt-4">
                                    <Button type="button" variant="outline" onClick={() => setActiveTab('personal')} size="sm">
                                        &larr; Back: Personal Details
                                    </Button>
                                    <Button type="button" onClick={() => setActiveTab('education')} size="sm">
                                        Next: Education & Work &rarr;
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* 3. EDUCATION & WORK TAB */}
                    {activeTab === 'education' && (
                        <Card className="shadow-sm">
                            <CardHeader className="pb-4">
                                <CardTitle className="text-base flex items-center gap-2">
                                    <GraduationCap className="h-4 w-4 text-primary" /> Educational & Professional History
                                </CardTitle>
                                <CardDescription>Enter details of your highest education and work experience</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="md:col-span-2">
                                        <Label className="text-xs">Highest Qualification / Degree *</Label>
                                        <Input
                                            value={education.highestQualification || ''}
                                            onChange={e => setEducation({ ...education, highestQualification: e.target.value })}
                                            placeholder="e.g. B.Tech in Computer Science / MCA / MBA"
                                            required
                                            className="text-xs"
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-xs">Year of Passing *</Label>
                                        <Input
                                            value={education.passingYear || ''}
                                            onChange={e => setEducation({ ...education, passingYear: e.target.value })}
                                            placeholder="e.g. 2023"
                                            required
                                            className="text-xs"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <Label className="text-xs">College / University Name *</Label>
                                        <Input
                                            value={education.institution || ''}
                                            onChange={e => setEducation({ ...education, institution: e.target.value })}
                                            placeholder="College or University"
                                            required
                                            className="text-xs"
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-xs">Percentage / CGPA</Label>
                                        <Input
                                            value={education.percentageOrCgpa || ''}
                                            onChange={e => setEducation({ ...education, percentageOrCgpa: e.target.value })}
                                            placeholder="e.g. 8.5 CGPA or 82%"
                                            className="text-xs"
                                        />
                                    </div>
                                </div>

                                <div className="pt-4 border-t space-y-3">
                                    <h4 className="text-xs font-semibold text-slate-800">Prior Work Experience (If applicable)</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div>
                                            <Label className="text-xs">Total Experience (in Years)</Label>
                                            <Input
                                                value={education.totalExperienceYears || ''}
                                                onChange={e => setEducation({ ...education, totalExperienceYears: e.target.value })}
                                                placeholder="e.g. 2.5 Years / Fresher"
                                                className="text-xs"
                                            />
                                        </div>
                                        <div>
                                            <Label className="text-xs">Previous Company Name</Label>
                                            <Input
                                                value={education.previousCompany || ''}
                                                onChange={e => setEducation({ ...education, previousCompany: e.target.value })}
                                                placeholder="Last organization"
                                                className="text-xs"
                                            />
                                        </div>
                                        <div>
                                            <Label className="text-xs">Previous Designation</Label>
                                            <Input
                                                value={education.previousDesignation || ''}
                                                onChange={e => setEducation({ ...education, previousDesignation: e.target.value })}
                                                placeholder="Last Job Title"
                                                className="text-xs"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="flex justify-between pt-4">
                                    <Button type="button" variant="outline" onClick={() => setActiveTab('address')} size="sm">
                                        &larr; Back: Address
                                    </Button>
                                    <Button type="button" onClick={() => setActiveTab('bank')} size="sm">
                                        Next: Bank Details &rarr;
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* 4. BANK & STATUTORY DETAILS TAB */}
                    {activeTab === 'bank' && (
                        <Card className="shadow-sm">
                            <CardHeader className="pb-4">
                                <CardTitle className="text-base flex items-center gap-2">
                                    <Landmark className="h-4 w-4 text-primary" /> Bank & Statutory Details
                                </CardTitle>
                                <CardDescription>Required for payroll setup and tax compliance</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <Label className="text-xs">Account Holder Name *</Label>
                                        <Input
                                            value={bank.accountHolderName || candidate?.name || ''}
                                            onChange={e => setBank({ ...bank, accountHolderName: e.target.value })}
                                            placeholder="As per bank passbook"
                                            required
                                            className="text-xs"
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-xs">Bank Name *</Label>
                                        <Input
                                            value={bank.bankName || ''}
                                            onChange={e => setBank({ ...bank, bankName: e.target.value })}
                                            placeholder="e.g. HDFC Bank, ICICI, SBI"
                                            required
                                            className="text-xs"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <Label className="text-xs">Bank Account Number *</Label>
                                        <Input
                                            value={bank.accountNumber || ''}
                                            onChange={e => setBank({ ...bank, accountNumber: e.target.value })}
                                            placeholder="Account number"
                                            required
                                            className="text-xs"
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-xs">Bank IFSC Code *</Label>
                                        <Input
                                            value={bank.ifscCode || ''}
                                            onChange={e => setBank({ ...bank, ifscCode: e.target.value.toUpperCase() })}
                                            placeholder="11-character IFSC Code"
                                            required
                                            className="text-xs uppercase"
                                        />
                                    </div>
                                </div>

                                <div className="pt-4 border-t space-y-3">
                                    <h4 className="text-xs font-semibold text-slate-800">Government Identity Numbers</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div>
                                            <Label className="text-xs">PAN Card Number *</Label>
                                            <Input
                                                value={bank.panNumber || ''}
                                                onChange={e => setBank({ ...bank, panNumber: e.target.value.toUpperCase() })}
                                                placeholder="10-digit PAN (e.g. ABCDE1234F)"
                                                required
                                                className="text-xs uppercase"
                                            />
                                        </div>
                                        <div>
                                            <Label className="text-xs">Aadhar Card Number *</Label>
                                            <Input
                                                value={bank.aadharNumber || ''}
                                                onChange={e => setBank({ ...bank, aadharNumber: e.target.value })}
                                                placeholder="12-digit Aadhar number"
                                                required
                                                className="text-xs"
                                            />
                                        </div>
                                        <div>
                                            <Label className="text-xs">PF / UAN Number (Optional)</Label>
                                            <Input
                                                value={bank.uanNumber || ''}
                                                onChange={e => setBank({ ...bank, uanNumber: e.target.value })}
                                                placeholder="Universal Account No if any"
                                                className="text-xs"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="flex justify-between pt-4">
                                    <Button type="button" variant="outline" onClick={() => setActiveTab('education')} size="sm">
                                        &larr; Back: Education
                                    </Button>
                                    <Button type="button" onClick={() => setActiveTab('documents')} size="sm">
                                        Next: Upload Documents &rarr;
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* 5. UPLOAD DOCUMENTS TAB */}
                    {activeTab === 'documents' && (
                        <Card className="shadow-sm">
                            <CardHeader className="pb-4">
                                <CardTitle className="text-base flex items-center gap-2">
                                    <FileText className="h-4 w-4 text-primary" /> Verification Documents Upload
                                </CardTitle>
                                <CardDescription>
                                    Upload clear scans or photos of your required verification documents (PDF, PNG, JPG)
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {enabledDocs.map((docDef: any) => {
                                        const uploaded = documents.find(d => d.documentId === docDef.id)
                                        const isUploading = uploadingDocId === docDef.id

                                        return (
                                            <div
                                                key={docDef.id}
                                                className={`border rounded-lg p-4 transition-all ${
                                                    uploaded
                                                        ? 'bg-green-50/50 border-green-200'
                                                        : docDef.required
                                                        ? 'bg-slate-50/50 border-slate-200 hover:border-blue-300'
                                                        : 'bg-white border-slate-200'
                                                }`}
                                            >
                                                <div className="flex items-start justify-between gap-2 mb-2">
                                                    <div>
                                                        <div className="flex items-center gap-1.5 font-semibold text-xs text-slate-800">
                                                            {docDef.name}
                                                            {docDef.required && (
                                                                <span className="text-red-500 font-bold">*</span>
                                                            )}
                                                        </div>
                                                        {docDef.description && (
                                                            <p className="text-[11px] text-slate-500 mt-0.5">{docDef.description}</p>
                                                        )}
                                                    </div>
                                                    {uploaded ? (
                                                        <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300 text-[10px] shrink-0">
                                                            <CheckCircle2 className="h-3 w-3 mr-1" /> Uploaded
                                                        </Badge>
                                                    ) : docDef.required ? (
                                                        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300 text-[10px] shrink-0">
                                                            Required
                                                        </Badge>
                                                    ) : (
                                                        <Badge variant="outline" className="bg-slate-100 text-slate-600 text-[10px] shrink-0">
                                                            Optional
                                                        </Badge>
                                                    )}
                                                </div>

                                                {uploaded ? (
                                                    <div className="bg-white border rounded p-2 flex items-center justify-between mt-3 text-xs">
                                                        <div className="flex items-center gap-2 truncate">
                                                            <FileText className="h-4 w-4 text-green-600 shrink-0" />
                                                            <span className="truncate font-medium text-slate-700">{uploaded.fileName || uploaded.name}</span>
                                                        </div>
                                                        <div className="flex items-center gap-1.5 shrink-0 ml-2">
                                                            <a
                                                                href={uploaded.fileUrl}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                className="text-primary hover:underline flex items-center gap-1 text-[11px]"
                                                            >
                                                                <Eye className="h-3.5 w-3.5" /> View
                                                            </a>
                                                            <label className="cursor-pointer text-slate-500 hover:text-slate-700 text-[11px] ml-1">
                                                                Replace
                                                                <input
                                                                    type="file"
                                                                    className="hidden"
                                                                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                                                                    onChange={e => {
                                                                        const f = e.target.files?.[0]
                                                                        if (f) handleFileUpload(docDef.id, docDef.name, f)
                                                                    }}
                                                                />
                                                            </label>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="mt-3">
                                                        <label className={`w-full flex items-center justify-center gap-2 border border-dashed rounded-md py-3 px-4 cursor-pointer text-xs font-medium transition-all ${
                                                            isUploading
                                                                ? 'bg-blue-50 border-blue-300 text-blue-600'
                                                                : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50 hover:border-slate-400'
                                                        }`}>
                                                            {isUploading ? (
                                                                <>
                                                                    <Loader2 className="h-4 w-4 animate-spin" /> Uploading...
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <Upload className="h-4 w-4 text-slate-400" /> Choose File to Upload
                                                                </>
                                                            )}
                                                            <input
                                                                type="file"
                                                                className="hidden"
                                                                disabled={isUploading}
                                                                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                                                                onChange={e => {
                                                                    const f = e.target.files?.[0]
                                                                    if (f) handleFileUpload(docDef.id, docDef.name, f)
                                                                }}
                                                            />
                                                        </label>
                                                    </div>
                                                )}
                                            </div>
                                        )
                                    })}
                                </div>

                                {error && (
                                    <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded text-xs flex items-center gap-2 mt-4">
                                        <AlertCircle className="h-4 w-4 shrink-0" />
                                        {error}
                                    </div>
                                )}

                                <div className="bg-slate-50 border rounded-lg p-4 mt-6">
                                    <div className="flex items-start gap-2.5">
                                        <input
                                            type="checkbox"
                                            id="declare"
                                            required
                                            className="mt-0.5 rounded border-slate-300 text-primary"
                                        />
                                        <label htmlFor="declare" className="text-xs text-slate-600 leading-relaxed cursor-pointer">
                                            I hereby declare that all information provided above and all uploaded documents are true, accurate, and valid to the best of my knowledge.
                                        </label>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between pt-4">
                                    <Button type="button" variant="outline" onClick={() => setActiveTab('bank')} size="sm">
                                        &larr; Back: Bank Details
                                    </Button>
                                    <Button
                                        type="submit"
                                        disabled={submitting}
                                        className="bg-green-600 hover:bg-green-700 text-white font-semibold px-6 shadow-md"
                                        size="sm"
                                    >
                                        {submitting ? (
                                            <>
                                                <Loader2 className="h-4 w-4 animate-spin mr-2" /> Submitting...
                                            </>
                                        ) : (
                                            <>
                                                <CheckCircle2 className="h-4 w-4 mr-2" /> Submit Onboarding Details
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </form>
            </main>
        </div>
    )
}
