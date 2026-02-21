import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowLeft, Download, Edit,
    History, CheckCircle, Clock, Plus, AlertCircle,
    ShieldCheck, User, Calendar, ExternalLink,
    Box, Milestone, Info
} from 'lucide-react';
import axios from 'axios';

export default function QuotationDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [quotation, setQuotation] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [showCRModal, setShowCRModal] = useState(false);
    const [crData, setCrData] = useState({ title: '', description: '', estimatedCost: 0 });

    useEffect(() => {
        if (id) fetchQuotation();
    }, [id]);

    const fetchQuotation = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`http://localhost:5000/api/quotations/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setQuotation(res.data);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    const handleApprove = async () => {
        if (!confirm('Are you sure you want to approve this proposal? This will LOCK the project scope and activate Milestone Tracking.')) return;
        setActionLoading(true);
        try {
            const token = localStorage.getItem('token');
            await axios.patch(`http://localhost:5000/api/quotations/${id}/approve`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchQuotation();
        } catch (e) { alert('Approval failed'); }
        finally { setActionLoading(false); }
    };

    const handleDownloadPDF = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(`http://localhost:5000/api/quotations/${id}/pdf`, {
                headers: { Authorization: `Bearer ${token}` },
                responseType: 'blob'
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `Proposal_${quotation.quotationNumber}.pdf`);
            document.body.appendChild(link);
            link.click();
        } catch (e) { console.error(e); }
    };

    const submitChangeRequest = async () => {
        if (!crData.title) return alert('Title is required');
        setActionLoading(true);
        try {
            const token = localStorage.getItem('token');
            await axios.post(`http://localhost:5000/api/quotations/${id}/change-request`, crData, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setShowCRModal(false);
            setCrData({ title: '', description: '', estimatedCost: 0 });
            fetchQuotation();
        } catch (e) { alert('Failed to submit change request'); }
        finally { setActionLoading(false); }
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-white">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">Assembling Proposal Details...</p>
        </div>
    );

    if (!quotation) return <div className="p-12 text-center text-red-500 font-bold">Proposal data extraction failed.</div>;

    const getStatusStyle = (status: string) => {
        const map: any = {
            draft: 'bg-gray-100 text-gray-500',
            sent: 'bg-blue-50 text-blue-600',
            approved: 'bg-green-50 text-green-600',
            rejected: 'bg-red-50 text-red-600',
            revision: 'bg-orange-50 text-orange-600',
            expired: 'bg-gray-900 text-white'
        };
        return map[status] || 'bg-gray-100 text-gray-500';
    };

    return (
        <div className="min-h-screen bg-[#FAFBFF] pb-24">
            {/* Contextual Header */}
            <div className="bg-white border-b sticky top-0 z-30">
                <div className="max-w-7xl mx-auto px-8 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        <button onClick={() => navigate('/quotations')} className="p-2 hover:bg-gray-50 rounded-lg transition-colors">
                            <ArrowLeft className="w-5 h-5 text-gray-400" />
                        </button>
                        <div className="h-8 w-px bg-gray-100"></div>
                        <div>
                            <div className="flex items-center gap-2 mb-0.5">
                                <h1 className="text-lg font-black text-gray-900">{quotation.quotationNumber}</h1>
                                <span className="bg-gray-50 text-gray-400 px-2 py-0.5 rounded-md text-[9px] font-black tracking-widest uppercase border border-gray-100">REV-{quotation.version}</span>
                            </div>
                            <p className="text-xs font-bold text-gray-400 truncate max-w-[300px]">{quotation.projectTitle}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className={`px-4 py-1.5 rounded-full text-[10px] font-black tracking-widest uppercase border ${getStatusStyle(quotation.status)}`}>
                            {quotation.status}
                        </div>
                        <button
                            onClick={() => {
                                navigator.clipboard.writeText(`${window.location.origin}/q/${id}`);
                                alert('Proposal link copied to clipboard!');
                            }}
                            className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-xs tracking-widest uppercase hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all flex items-center gap-2"
                        >
                            <ExternalLink className="w-4 h-4" /> Share
                        </button>
                        <button onClick={handleDownloadPDF} className="p-2.5 bg-white border border-gray-100 rounded-xl hover:shadow-lg transition-all text-gray-600 outline-none">
                            <Download className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-8 mt-10">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">

                    {/* Primary Content (Left) */}
                    <div className="lg:col-span-8 space-y-10">

                        {/* Summary Deck */}
                        <div className="grid grid-cols-3 gap-6">
                            <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm flex items-center gap-4">
                                <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600"><User className="w-6 h-6" /></div>
                                <div>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Client</p>
                                    <p className="text-sm font-bold text-gray-900 truncate">{quotation.clientName}</p>
                                </div>
                            </div>
                            <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm flex items-center gap-4">
                                <div className="w-12 h-12 bg-purple-50 rounded-2xl flex items-center justify-center text-purple-600"><Calendar className="w-6 h-6" /></div>
                                <div>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Timeline</p>
                                    <p className="text-sm font-bold text-gray-900">{quotation.timeline || 'TBD'}</p>
                                </div>
                            </div>
                            <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm flex items-center gap-4">
                                <div className="w-12 h-12 bg-green-50 rounded-2xl flex items-center justify-center text-green-600"><Info className="w-6 h-6" /></div>
                                <div>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Warranty</p>
                                    <p className="text-sm font-bold text-gray-900">{quotation.warrantyPeriod}</p>
                                </div>
                            </div>
                        </div>

                        {/* Objective & Scope Group */}
                        <div className="bg-white rounded-[2.5rem] p-10 border border-gray-100 shadow-sm space-y-10">
                            <section>
                                <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Project Objective</h3>
                                <p className="text-gray-600 text-sm leading-relaxed">{quotation.objective || 'Objective details not provided in this revision.'}</p>
                            </section>
                            <div className="h-px bg-gray-50"></div>

                            {/* Dynamic Sections (Skip first 2 if they are redundant with Objective/Scope) */}
                            {quotation.sections?.slice(2).map((s: any, i: number) => (
                                <section key={i} className="pt-2">
                                    <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-4">{s.title}</h3>
                                    <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-wrap">{s.content}</p>
                                    <div className="h-px bg-gray-50 mt-10"></div>
                                </section>
                            ))}

                            <section>
                                <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Core Deliverables & Scope</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                                    {quotation.deliverables.map((d: any, i: number) => d.included && (
                                        <div key={i} className="flex items-center gap-3 text-sm text-gray-600">
                                            <div className="p-1 bg-green-50 rounded-full"><CheckCircle className="w-3 h-3 text-green-500" /></div>
                                            <span className="font-medium">{d.name}</span>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        </div>

                        {/* Modules Breakdown */}
                        <div className="bg-white rounded-[2.5rem] p-10 border border-gray-100 shadow-sm">
                            <div className="flex items-center justify-between mb-8">
                                <h3 className="text-xl font-black text-gray-900 tracking-tight">Requirement Breakdown</h3>
                                <span className="bg-blue-50 text-blue-600 px-4 py-1.5 rounded-full text-xs font-black">₹{quotation.grandTotal.toLocaleString()} TOTAL</span>
                            </div>

                            <div className="space-y-6">
                                {quotation.modules.map((m: any, idx: number) => m.included && (
                                    <div key={idx} className="group flex items-start gap-6 p-6 rounded-3xl border border-gray-50 hover:border-blue-100 hover:bg-blue-50/20 transition-all">
                                        <div className="w-10 h-10 bg-white border border-gray-100 rounded-xl flex items-center justify-center text-gray-400 font-black text-xs shadow-sm group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-600 transition-colors">
                                            {String(idx + 1).padStart(2, '0')}
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex justify-between items-center mb-1.5">
                                                <h4 className="font-bold text-gray-900">{m.name}</h4>
                                                <span className="font-black text-gray-900 group-hover:text-blue-600 transition-colors">₹{m.cost.toLocaleString()}</span>
                                            </div>
                                            <p className="text-xs text-gray-500 leading-relaxed font-medium">{m.description || 'Deliverable details locked into this module specification.'}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Milestones Flow */}
                        <div className="bg-white rounded-[2.5rem] p-10 border border-gray-100 shadow-sm relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-10 opacity-5"><Milestone className="w-32 h-32" /></div>
                            <h3 className="text-xl font-black text-gray-900 mb-10 tracking-tight flex items-center gap-3">
                                <span className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center text-white"><Milestone className="w-5 h-5" /></span>
                                Financial Road Map
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
                                {quotation.milestones.map((m: any, idx: number) => (
                                    <div key={idx} className="p-8 bg-gray-50/50 rounded-[2rem] border border-gray-50 flex flex-col items-center text-center">
                                        <div className={`px-4 py-1 rounded-full text-[9px] font-black uppercase tracking-widest mb-6 ${m.status === 'paid' ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'}`}>
                                            {m.status}
                                        </div>
                                        <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2">{m.name}</p>
                                        <h4 className="text-2xl font-black text-gray-900 mb-1">{m.percentage}%</h4>
                                        <p className="text-sm font-bold text-blue-600 tracking-tight">₹{m.amount.toLocaleString()}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Meta Sidebar (Right) */}
                    <div className="lg:col-span-4 space-y-10">

                        {/* Versioning & History Container */}
                        <div className="bg-gray-900 rounded-[2.5rem] p-10 text-white shadow-2xl relative overflow-hidden">
                            <div className="absolute -bottom-10 -right-10 opacity-10"><Box className="w-40 h-40" /></div>

                            <div className="flex items-center gap-3 mb-8">
                                <History className="w-5 h-5 text-blue-400" />
                                <h3 className="text-lg font-black tracking-tight">Version Control</h3>
                            </div>

                            <div className="space-y-4 relative z-10">
                                <div className="p-5 bg-white/5 border border-white/10 rounded-2xl">
                                    <div className="flex justify-between items-center mb-4">
                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Active Scope</span>
                                        <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase ${quotation.scopeLocked ? "bg-green-500/20 text-green-400 border border-green-500/30" : "bg-blue-500/20 text-blue-400 border border-blue-500/30"}`}>
                                            {quotation.scopeLocked ? "Protected" : "In Negotiation"}
                                        </span>
                                    </div>
                                    <p className="text-sm font-bold text-gray-200 mb-1">Iteration v{quotation.version}</p>
                                    <p className="text-[10px] text-gray-500 font-medium tracking-wide">Last modified {new Date(quotation.updatedAt).toLocaleDateString()}</p>
                                </div>

                                {quotation.parentQuotation && (
                                    <button
                                        onClick={() => navigate(`/quotations/${quotation.parentQuotation._id}`)}
                                        className="w-full flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 rounded-2xl transition-all text-xs font-bold text-gray-400"
                                    >
                                        <span>View Previous Revision (v{quotation.version - 1})</span>
                                        <ExternalLink className="w-3 h-3" />
                                    </button>
                                )}
                            </div>

                            {!quotation.scopeLocked && (
                                <button
                                    onClick={handleApprove}
                                    disabled={actionLoading}
                                    className="w-full mt-8 h-14 bg-blue-600 hover:bg-blue-700 rounded-2xl font-black text-sm tracking-widest uppercase transition-all shadow-xl shadow-blue-500/20 flex items-center justify-center gap-3"
                                >
                                    {actionLoading ? 'Approving...' : <><ShieldCheck className="w-5 h-5" /> Lock & Approve</>}
                                </button>
                            )}
                        </div>

                        {/* Change Requests Section */}
                        {quotation.scopeLocked && (
                            <div className="bg-white rounded-[2.5rem] p-10 border border-gray-100 shadow-sm">
                                <div className="flex items-center justify-between mb-8">
                                    <h3 className="text-base font-black text-gray-900 tracking-tight">Active Add-ons</h3>
                                    <button
                                        onClick={() => setShowCRModal(true)}
                                        className="p-1.5 bg-gray-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                                    >
                                        <Plus className="w-4 h-4" />
                                    </button>
                                </div>

                                {quotation.changeRequests.length === 0 ? (
                                    <div className="px-6 py-10 bg-gray-50/50 rounded-3xl border border-dashed border-gray-200 text-center">
                                        <AlertCircle className="w-8 h-8 text-gray-200 mx-auto mb-3" />
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-relaxed">System following strictly approved scope</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {quotation.changeRequests.map((cr: any, idx: number) => (
                                            <div key={idx} className="p-5 bg-gray-50 rounded-2xl border border-gray-50">
                                                <div className="flex justify-between items-start mb-2">
                                                    <h4 className="text-xs font-black text-gray-900 uppercase tracking-tight">{cr.title}</h4>
                                                    <span className="text-[9px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded tracking-widest">{cr.status}</span>
                                                </div>
                                                <p className="text-[10px] text-gray-500 font-medium mb-3 line-clamp-2">{cr.description}</p>
                                                <p className="text-xs font-black text-gray-900">₹{cr.estimatedCost.toLocaleString()}</p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Action Deck */}
                        <div className="space-y-4">
                            {!quotation.scopeLocked && (
                                <button
                                    onClick={() => navigate(`/quotations/${id}/edit`)}
                                    className="w-full h-14 bg-white border border-gray-100 hover:border-blue-100 hover:bg-blue-50 rounded-2xl text-xs font-black text-blue-600 uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3"
                                >
                                    <Edit className="w-4 h-4" /> Modify Scope
                                </button>
                            )}
                            <button className="w-full h-14 bg-white border border-gray-100 rounded-2xl text-xs font-black text-gray-400 uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 opacity-50 cursor-not-allowed">
                                <Clock className="w-4 h-4" /> Share Client Portal
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Change Request Modal */}
            {showCRModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
                    <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={() => setShowCRModal(false)}></div>
                    <div className="bg-white w-full max-w-md rounded-[2.5rem] p-10 relative z-10 shadow-2xl border border-gray-100">
                        <div className="mb-8">
                            <h3 className="text-2xl font-black text-gray-900 tracking-tight">Scope Augmentation</h3>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Request new module for v{quotation.version}</p>
                        </div>
                        <div className="space-y-6">
                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Request Heading</label>
                                <input
                                    value={crData.title}
                                    onChange={e => setCrData({ ...crData, title: e.target.value })}
                                    className="w-full h-12 px-5 bg-gray-50 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-blue-500"
                                    placeholder="e.g. Additional Cloud Storage"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Technical Description</label>
                                <textarea
                                    value={crData.description}
                                    onChange={e => setCrData({ ...crData, description: e.target.value })}
                                    className="w-full h-24 p-5 bg-gray-50 border-none rounded-2xl text-sm font-medium focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Estimated Cost (₹)</label>
                                <input
                                    type="number"
                                    value={crData.estimatedCost}
                                    onChange={e => setCrData({ ...crData, estimatedCost: Number(e.target.value) })}
                                    className="w-full h-12 px-5 bg-gray-50 border-none rounded-2xl text-sm font-black text-blue-600 focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <button
                                onClick={submitChangeRequest}
                                disabled={actionLoading}
                                className="w-full h-14 bg-gray-900 hover:bg-black text-white rounded-2xl font-black text-xs tracking-widest uppercase transition-all flex items-center justify-center gap-3 shadow-xl"
                            >
                                {actionLoading ? 'Deploying Request...' : 'Submit Add-on Request'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
