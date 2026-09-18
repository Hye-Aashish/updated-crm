import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
    CheckCircle2, Download, AlertCircle, Loader2, XCircle, Check
} from 'lucide-react'
import axios from 'axios'

export function PublicOfferView() {
    const { token } = useParams<{ token: string }>()
    const [loading, setLoading] = useState(true)
    const [actionLoading, setActionLoading] = useState(false)
    const [candidate, setCandidate] = useState<any>(null)
    const [companyProfile, setCompanyProfile] = useState<any>(null)
    const [error, setError] = useState<string | null>(null)
    const [actionStatus, setActionStatus] = useState<string | null>(null)
    const [declineReason, setDeclineReason] = useState('')
    const [showDeclineModal, setShowDeclineModal] = useState(false)

    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

    useEffect(() => {
        const fetchOffer = async () => {
            try {
                setLoading(true)
                const res = await axios.get(`${API_URL}/candidates/public/${token}/offer-view`)
                setCandidate(res.data.candidate)
                setCompanyProfile(res.data.companyProfile)
                setActionStatus(res.data.candidate.status)
            } catch (err: any) {
                setError(err.response?.data?.message || 'Failed to load offer letter or offer is not published yet.')
            } finally {
                setLoading(false)
            }
        }

        if (token) fetchOffer()
    }, [token])

    const handleAction = async (action: 'accept' | 'decline') => {
        try {
            setActionLoading(true)
            const res = await axios.post(`${API_URL}/candidates/public/${token}/offer-action`, {
                action,
                reason: declineReason
            })

            if (res.data.success) {
                setActionStatus(res.data.status)
                setShowDeclineModal(false)
            }
        } catch (err: any) {
            alert('Action failed: ' + (err.response?.data?.message || err.message))
        } finally {
            setActionLoading(false)
        }
    }

    const [downloadingPdf, setDownloadingPdf] = useState(false)

    const downloadPDF = async () => {
        try {
            setDownloadingPdf(true)
            const res = await axios.get(`${API_URL}/candidates/public/${token}/pdf`, { responseType: 'blob' })
            const blob = new Blob([res.data], { type: 'application/pdf' })
            const url = window.URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `Offer_Letter_${(candidate?.name || 'Candidate').replace(/\s+/g, '_')}.pdf`
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
        } catch (err: any) {
            alert('Failed to download PDF: ' + (err.response?.data?.message || err.message))
        } finally {
            setDownloadingPdf(false)
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                <div className="text-center space-y-3">
                    <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
                    <p className="text-sm font-medium text-slate-600">Loading Official Employment Agreement...</p>
                </div>
            </div>
        )
    }

    if (error || !candidate) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                <Card className="max-w-md w-full shadow-lg border-amber-200">
                    <CardHeader className="text-center">
                        <AlertCircle className="h-10 w-10 text-amber-500 mx-auto mb-2" />
                        <CardTitle className="text-lg text-slate-800">Offer Letter Not Available</CardTitle>
                        <CardDescription>{error || 'This offer link is not accessible or currently pending approval.'}</CardDescription>
                    </CardHeader>
                </Card>
            </div>
        )
    }

    const offer = candidate.offerLetter || {}
    const formatDate = (d: any) => {
        if (!d) return 'N/A'
        const dateObj = new Date(d)
        const day = String(dateObj.getDate()).padStart(2, '0')
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
        const month = months[dateObj.getMonth()]
        const year = String(dateObj.getFullYear()).slice(-2)
        return `${day}-${month}-${year}`
    }

    const offerDate = formatDate(offer.offerDate || new Date())
    const joiningDate = formatDate(offer.joiningDate || new Date())
    const validUntilDate = formatDate(offer.validUntil || new Date(Date.now() + 3 * 86400000))
    const candidateAddress = candidate.submittedData?.address?.currentAddress
        ? `${candidate.submittedData.address.currentAddress}, ${candidate.submittedData.address.currentCity || ''}, ${candidate.submittedData.address.currentState || ''} - ${candidate.submittedData.address.currentPincode || ''}`
        : '204, raghuvir appartment, hariom society, ved road, Surat City, Surat, Gujarat - 395004'

    const workLocation = offer.workLocation || 'Work from Home'
    const noticePeriodDays = offer.noticePeriodDays || 15
    const probationMonths = offer.probationPeriodMonths || 3

    return (
        <div className="min-h-screen bg-slate-100/90 pb-20">
            {/* Top Bar */}
            <header className="bg-white border-b sticky top-0 z-30 shadow-sm">
                <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="text-xl font-black tracking-tight">
                            <span className="text-[#0047AB]">NEX</span>
                            <span className="text-[#00A699]">PRISM</span>
                        </div>
                        <span className="hidden sm:inline-block text-xs text-slate-400">| Employment Agreement</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={downloadPDF} className="text-xs bg-white text-[#0047AB] border-blue-200 hover:bg-blue-50">
                            <Download className="h-3.5 w-3.5 mr-1.5" /> Download Official PDF
                        </Button>
                    </div>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-4 mt-6 space-y-6">
                {/* Status Banners */}
                {actionStatus === 'accepted' && (
                    <div className="bg-emerald-600 text-white rounded-xl p-4 shadow flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                                <Check className="h-6 w-6" />
                            </div>
                            <div>
                                <h3 className="font-bold text-sm">Agreement Accepted!</h3>
                                <p className="text-emerald-100 text-xs">You have officially accepted the terms of employment at Nexprism. Welcome to the team!</p>
                            </div>
                        </div>
                        <Badge className="bg-white text-emerald-700 hover:bg-white text-xs">Accepted</Badge>
                    </div>
                )}

                {actionStatus === 'declined' && (
                    <div className="bg-slate-700 text-white rounded-xl p-4 shadow flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <XCircle className="h-8 w-8 text-red-400 shrink-0" />
                            <div>
                                <h3 className="font-bold text-sm">Offer Declined</h3>
                                <p className="text-slate-300 text-xs">You have declined this offer letter.</p>
                            </div>
                        </div>
                        <Badge variant="destructive" className="text-xs">Declined</Badge>
                    </div>
                )}

                {/* EXACT EMPLOYMENT AGREEMENT DOCUMENT */}
                <Card className="shadow-2xl border-slate-300 bg-white overflow-hidden text-slate-800">
                    {/* Header Banner with Logos & Government Initiatives */}
                    <div className="px-8 pt-8 pb-4 border-b flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="text-3xl font-black tracking-tight">
                            <span className="text-[#0047AB]">NEX</span>
                            <span className="text-[#00A699]">PRISM</span>
                        </div>
                        <div className="flex items-center gap-3 text-[11px] font-bold text-slate-600 flex-wrap justify-center">
                            <span className="text-[#0047AB] flex items-center gap-1">🌐 Digital India</span>
                            <span className="text-slate-300">|</span>
                            <span className="text-[#E67E22] flex items-center gap-1">🏢 MSME</span>
                            <span className="text-slate-300">|</span>
                            <span className="text-[#27AE60] flex items-center gap-1">⚙️ MAKE IN INDIA</span>
                            <span className="text-slate-300">|</span>
                            <span className="text-[#D35400] font-black">#startupindia</span>
                        </div>
                    </div>

                    <CardContent className="p-8 md:p-12 space-y-6 text-xs md:text-sm leading-relaxed">
                        {/* Title */}
                        <div className="text-center">
                            <h2 className="text-lg md:text-xl font-bold uppercase tracking-wide text-slate-900">
                                EMPLOYEEMENT AGREEMENT
                            </h2>
                        </div>

                        {/* Candidate Information Header */}
                        <div className="space-y-1 pt-2">
                            <h3 className="text-base font-bold text-slate-900">{candidate.name}</h3>
                            <p className="text-slate-700">
                                <strong>Address : </strong>{candidateAddress}
                            </p>
                            <p className="font-bold text-slate-900 pt-1">Sub: Offer Letter.</p>
                            <p className="text-slate-900 font-medium">Dear, {candidate.name}</p>
                        </div>

                        {/* Introductory Body Paragraph */}
                        <p className="text-slate-700 leading-relaxed text-justify">
                            This Employee Agreement is made on <strong>{offerDate}</strong> and will become effective as of <strong>{joiningDate}</strong>. It outlines the terms of employment between <strong>Nexprism</strong> and <strong>{candidate.name}</strong> for the position of <strong>{candidate.designation || 'MERN Developer'}</strong>
                        </p>

                        {/* Render Dynamic Clauses & Sections */}
                        <div className="space-y-4 pt-1">
                            {((offer.sections && offer.sections.length > 0) ? offer.sections.filter((s: any) => s.enabled !== false) : [
                                {
                                    title: 'Place of Work',
                                    content: `Your primary place of work will be ${workLocation}. You are expected to have a reliable internet connection and a suitable workspace to effectively perform your job duties. While your role is remote, you may be required to attend meetings, training sessions, or other events at the company's office or another designated location as needed, with reasonable notice.`
                                },
                                {
                                    title: 'Working Hours',
                                    content: `Your regular working hours will be from 10:00am to 6:00pm, Monday to Saturday. You may be required to work additional hours based on the needs of the business.`
                                },
                                {
                                    title: 'Confidentiality and Non-Disclosure',
                                    content: `You will be required to sign a Confidentiality Agreement as a condition of your employment. This agreement outlines your responsibility to protect the company's confidential information both during and after your employment.`
                                },
                                {
                                    title: 'Code and Data Usage',
                                    content: `You are strictly prohibited from using any code, software, or proprietary information from the company for personal use without prior written consent. Furthermore, you may not share, leak, or disclose any code, company details, or confidential information to any third party or external entity without explicit permission from the company. Violating this term will be considered a serious breach of your employment agreement and may result in immediate termination and potential legal action.`
                                },
                                {
                                    title: 'Client Communication and Reporting',
                                    content: `As a developer, you are not permitted to directly connect with clients without prior approval from the company. If a client reaches out to you directly, you are required to inform the company immediately. Any communication with clients must be conducted in accordance with the company’s guidelines and procedures.\nFailure to report such communication to the company may result in disciplinary action, up to and including legal action against you.`
                                },
                                {
                                    title: 'Notice Period:',
                                    content: `The company may terminate the employee employment at any time without any reason by giving notice period of ${noticePeriodDays} days or by payment of salary in lie there of.\nIf the employee is willing to leave the organization then he must inform before ${noticePeriodDays} days and he must be transfer all his work to the new employee.`
                                },
                                {
                                    title: 'Probationary Period',
                                    content: `Your initial employment will be subject to a probationary period of ${probationMonths} months. During this period, either party may terminate the employment with 7 days notice.`
                                },
                                {
                                    title: 'Termination',
                                    content: `Your employment may be terminated by either party by providing ${noticePeriodDays}days' written notice. In the event of gross misconduct or breach of contract, termination may be immediate and without notice.`
                                },
                                {
                                    title: 'Code of Conduct',
                                    content: `You are expected to adhere to the company's Code of Conduct, which includes guidelines on behavior, dress code, and professional interactions. Any violations may result in disciplinary action, up to and including termination.`
                                },
                                {
                                    title: 'Confidentiality and Non-Solicitation',
                                    content: `While employed with the company, and even after your employment ends, you are strictly prohibited from using any client data whether it be contact information, project details, or any other information for personal benefit. You are also not permitted to share any client data with third parties.\nFurthermore, after leaving the company, you are not allowed to pitch or approach the company’s clients for any purpose. If you do so, the company reserves the right to take legal action against you.`
                                },
                                {
                                    title: 'Dual Employment / Outside Work Clause',
                                    content: `During your employment with the company, you are required to dedicate your full working hours exclusively to the duties assigned by the company. You shall not engage in any other employment, freelance work, business activity, or service paid or unpaid during working hours.\nIf you are found involved in any such activity, the company reserves the right to terminate your employment immediately. Additionally, any financial or reputational loss caused to the company due to such actions will be fully recoverable from you.`
                                },
                                {
                                    title: 'Internal/Company Politics Clause',
                                    content: `The Employee shall not engage in any form of office or internal company politics, including spreading rumors, creating conflicts among colleagues, favoring or influencing decisions for personal gain, or interfering in the Company’s management or decision-making processes. Any breach of this clause may result in disciplinary action, including termination, and the Company reserves the right to take legal action if deemed necessary.`
                                },
                                {
                                    title: 'Other Conditions',
                                    content: `Your employment is subject to the company’s standard terms and conditions, which may be amended from time to time. This offer is contingent upon successful completion of any pre-employment checks.\nPlease sign and return a copy of this letter by ${validUntilDate} to confirm your acceptance of this offer.\nWe are excited about the prospect of you joining our team and look forward to your contributions to the continued success of Nexprism\nIf you have any questions or need further clarification, please do not hesitate to contact us.`
                                }
                            ]).map((sec: any, idx: number) => {
                                const renderText = (txt: string) => {
                                    if (!txt) return ''
                                    return txt
                                        .replace(/{{candidate_name}}/gi, candidate?.name || 'Candidate')
                                        .replace(/{{designation}}/gi, candidate?.designation || 'MERN Developer')
                                        .replace(/{{work_location}}/gi, workLocation)
                                        .replace(/{{notice_period}}/gi, `${noticePeriodDays}`)
                                        .replace(/{{probation_period}}/gi, `${probationMonths}`)
                                        .replace(/{{offer_date}}/gi, offerDate)
                                        .replace(/{{joining_date}}/gi, joiningDate)
                                        .replace(/{{acceptance_deadline}}/gi, validUntilDate)
                                        .replace(/{{company_name}}/gi, 'Nexprism')
                                }

                                return (
                                    <div key={sec.id || idx} className="space-y-1">
                                        <h4 className="font-bold text-slate-900 text-sm">{renderText(sec.title)}</h4>
                                        <p className="text-slate-700 leading-relaxed text-justify whitespace-pre-line">
                                            {renderText(sec.content)}
                                        </p>
                                    </div>
                                )
                            })}
                        </div>

                        {/* Signatures & Execution Section */}
                        <div className="pt-6 border-t space-y-6">
                            {/* Signatory */}
                            <div className="space-y-1 text-slate-900">
                                <h4 className="font-bold text-sm">SINGED AND DELIVERED</h4>
                                <p><strong>Company name: </strong>Nexprism</p>
                                <p><strong>Email: </strong>Info@Nexprism.com</p>
                                <div className="pt-2 font-bold">SIGNED AND DELIVERED</div>
                                <div className="text-xs text-slate-500">Authorized Signatory</div>
                                <div className="h-16 w-32 border border-dashed border-blue-300 bg-blue-50/40 rounded flex flex-col items-center justify-center text-[10px] text-blue-800 font-bold mt-2">
                                    <span>NEXPRISM PVT LTD</span>
                                    <span className="text-[9px] text-slate-400 font-normal">OFFICIAL SEAL</span>
                                </div>
                            </div>

                            {/* Employee Acknowledgment */}
                            <div className="p-4 border-2 border-dashed border-slate-300 rounded-lg bg-slate-50/70 space-y-2">
                                <h4 className="font-bold text-slate-900 text-sm">Employee Acknowledgment:</h4>
                                <p className="text-slate-700">
                                    I, <strong>{candidate.name}</strong> hereby accept the terms and conditions of employment as outlined in this letter.
                                </p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 text-xs font-semibold">
                                    <div>Signature: <span className="underline font-normal text-slate-800">{actionStatus === 'accepted' ? candidate.name : '________________________'}</span></div>
                                    <div>Date: <span className="underline font-normal text-slate-800">{actionStatus === 'accepted' ? new Date().toLocaleDateString() : '________________________'}</span></div>
                                </div>
                            </div>

                            {/* Final Performance Note */}
                            <div className="bg-amber-50 border border-amber-200 text-amber-900 p-3 rounded text-xs font-medium">
                                <strong>Note: </strong>If you fail to perform your duties responsibly or your work performance is found unsatisfactory during the internship/probation, the company reserves the right to cancel/terminate this internship offer at any time without prior notice.
                            </div>
                        </div>

                        {/* Interactive Accept / Decline Bar */}
                        {actionStatus !== 'accepted' && actionStatus !== 'declined' && actionStatus !== 'converted' && (
                            <div className="pt-6 border-t bg-slate-50 -mx-8 md:-mx-12 -mb-8 md:-mb-12 p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                                <div className="text-xs text-slate-600">
                                    Please review all clauses above and confirm your acceptance.
                                </div>
                                <div className="flex items-center gap-3 w-full sm:w-auto">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setShowDeclineModal(true)}
                                        disabled={actionLoading}
                                        className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50 w-full sm:w-auto"
                                    >
                                        Decline Offer
                                    </Button>
                                    <Button
                                        size="sm"
                                        onClick={() => handleAction('accept')}
                                        disabled={actionLoading}
                                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs px-6 shadow-md w-full sm:w-auto"
                                    >
                                        {actionLoading ? (
                                            <>
                                                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> Processing...
                                            </>
                                        ) : (
                                            <>
                                                <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" /> Accept Agreement & Join
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </div>
                        )}
                    </CardContent>

                    {/* Official Multi-Office Footer Banner matching company sample */}
                    <div className="bg-[#0B4F8A] text-white p-6 text-center text-xs space-y-1.5">
                        <div className="font-bold text-sm tracking-wide text-white">Nexprism (Information Technology Company)</div>
                        <div className="text-[11px] text-blue-100">
                            <strong>Mathura (Regd.Office): </strong>C3 moholi pura in behind of BSA Engineering Collage, Mathura (Uttar Pradesh) (281001)
                        </div>
                        <div className="text-[11px] text-blue-100">
                            <strong>Surat (Corporate Office): </strong>B-1307-1308, 13th Floor, IT Park, Digital Valley, Mota Varachha, Surat, (Gujarat) (394105)
                        </div>
                        <div className="text-[11px] text-blue-100">
                            <strong>Mumbai (Sales.Office): </strong>205, Parikh Commercial Centre, Agashi Rd, Gokul Twp, Virar West, Maharashtra (401303)
                        </div>
                        <div className="text-[11px] font-semibold text-white pt-1">
                            | E-mail: info@nexprism.com | www.Nexprism.com | Contact no. (+91) 7505974545
                        </div>
                    </div>
                </Card>

                {/* Decline Modal */}
                {showDeclineModal && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                        <Card className="max-w-md w-full shadow-2xl">
                            <CardHeader>
                                <CardTitle className="text-base text-red-600 flex items-center gap-2">
                                    <XCircle className="h-5 w-5" /> Decline Offer
                                </CardTitle>
                                <CardDescription className="text-xs">
                                    Are you sure you wish to decline this employment agreement?
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div>
                                    <label className="text-xs font-medium text-slate-700 block mb-1">Reason (Optional)</label>
                                    <textarea
                                        value={declineReason}
                                        onChange={e => setDeclineReason(e.target.value)}
                                        placeholder="Let the HR team know why you are declining..."
                                        rows={3}
                                        className="w-full text-xs p-2.5 rounded border border-slate-300"
                                    />
                                </div>
                                <div className="flex justify-end gap-2">
                                    <Button variant="outline" size="sm" onClick={() => setShowDeclineModal(false)}>
                                        Cancel
                                    </Button>
                                    <Button
                                        variant="destructive"
                                        size="sm"
                                        onClick={() => handleAction('decline')}
                                        disabled={actionLoading}
                                    >
                                        Confirm Decline
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}
            </main>
        </div>
    )
}
export default PublicOfferView
