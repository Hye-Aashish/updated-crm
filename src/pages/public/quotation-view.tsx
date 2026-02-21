import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
    CheckCircle, Download, FileText, ShieldCheck,
    Calendar, User, Sparkles
} from 'lucide-react';
import axios from 'axios';

export default function PublicQuotationView() {
    const { id } = useParams();
    const [quotation, setQuotation] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [accepting, setAccepting] = useState(false);
    const [signature, setSignature] = useState('');
    const [approved, setApproved] = useState(false);

    useEffect(() => {
        if (id) fetchQuotation();
    }, [id]);

    const fetchQuotation = async () => {
        try {
            const res = await axios.get(`http://localhost:5000/api/quotations/public/${id}`);
            setQuotation(res.data);
            if (res.data.status === 'approved') setApproved(true);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    const handleAccept = async () => {
        if (!signature) return alert('Please enter your full name as signature');
        setAccepting(true);
        try {
            await axios.patch(`http://localhost:5000/api/quotations/public/${id}/approve`, { signature });
            setApproved(true);
            setQuotation({ ...quotation, status: 'approved' });
        } catch (e) { alert('Acceptance failed. Please contact support.'); }
        finally { setAccepting(false); }
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
            <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-6"></div>
            <p className="text-gray-400 font-black uppercase tracking-widest text-xs">Accessing Secure Proposal...</p>
        </div>
    );

    if (!quotation) return <div className="p-20 text-center text-red-500 font-black">Proposal link expired or invalid.</div>;

    return (
        <div className="min-h-screen bg-[#F8F9FE] pb-20">
            {/* Premium Header */}
            <div className="bg-white/80 backdrop-blur-md sticky top-0 z-50 border-b border-gray-100">
                <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-200">
                            <FileText className="w-6 h-6" />
                        </div>
                        <h2 className="text-xl font-black text-gray-900 tracking-tight">Project Proposal</h2>
                    </div>
                    {approved ? (
                        <div className="flex items-center gap-2 px-6 py-2 bg-green-50 text-green-600 rounded-full border border-green-100 font-black text-[10px] tracking-widest uppercase shadow-sm">
                            <CheckCircle className="w-4 h-4" /> Officially Accepted
                        </div>
                    ) : (
                        <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest bg-gray-50 px-4 py-2 rounded-full border">
                            Review Required
                        </div>
                    )}
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-6 mt-12 grid grid-cols-1 lg:grid-cols-12 gap-12">

                {/* Main Content Area */}
                <div className="lg:col-span-8 space-y-12">

                    {/* Welcome Card */}
                    <div className="bg-white rounded-[3rem] p-12 border border-blue-50 shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-12 opacity-5"><Sparkles className="w-40 h-40" /></div>
                        <h1 className="text-4xl font-black text-gray-900 mb-4 tracking-tighter leading-tight">
                            Ready to build your <span className="text-blue-600">{quotation.projectTitle}</span>?
                        </h1>
                        <p className="text-gray-500 font-medium leading-relaxed max-w-2xl px-1">
                            {quotation.objective || "We've carefully architected this modular proposal based on our discussions."}
                        </p>
                    </div>

                    {/* Dynamic Blueprint Sections */}
                    {quotation.sections?.slice(2).map((s: any, i: number) => (
                        <div key={i} className="bg-white rounded-[3rem] p-12 border border-gray-100 shadow-sm">
                            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] mb-6 flex items-center gap-3">
                                <div className="w-2 h-2 bg-purple-600 rounded-full"></div> {s.title}
                            </h3>
                            <p className="text-gray-600 font-medium leading-relaxed whitespace-pre-wrap">{s.content}</p>
                        </div>
                    ))}

                    {/* Modules & Pricing View */}
                    <div className="bg-white rounded-[3rem] p-12 border border-gray-100 shadow-sm">
                        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] mb-10 flex items-center gap-3">
                            <div className="w-2 h-2 bg-blue-600 rounded-full"></div> Core Project Breakdown
                        </h3>
                        <div className="space-y-8">
                            {quotation.modules.map((m: any, i: number) => m.included && (
                                <div key={i} className="flex gap-6 items-start">
                                    <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center font-black text-gray-400 border border-gray-100">
                                        {i + 1}
                                    </div>
                                    <div className="flex-1 border-b border-gray-50 pb-8">
                                        <div className="flex justify-between items-center mb-2">
                                            <h4 className="text-lg font-bold text-gray-900">{m.name}</h4>
                                            <span className="font-black text-blue-600">₹{m.cost.toLocaleString()}</span>
                                        </div>
                                        <p className="text-sm text-gray-500 font-medium leading-relaxed">{m.description || 'Deliverable details specified in technical scope.'}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="mt-12 bg-gray-50/50 p-10 rounded-[2.5rem] border border-gray-100 grid grid-cols-1 md:grid-cols-2 gap-10">
                            <div>
                                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Financial Summary</h4>
                                <div className="space-y-3">
                                    <div className="flex justify-between text-sm font-bold text-gray-600">
                                        <span>Subtotal</span>
                                        <span>₹{quotation.totalAmount.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between text-sm font-bold text-gray-600">
                                        <span>GST ({quotation.gstPercentage}%)</span>
                                        <span>₹{quotation.gstAmount.toLocaleString()}</span>
                                    </div>
                                    <div className="h-px bg-gray-200 my-4"></div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Grand Total</span>
                                        <span className="text-3xl font-black text-blue-600">₹{quotation.grandTotal.toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex flex-col justify-center border-l border-gray-200 pl-10">
                                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Milestones</h4>
                                <div className="space-y-4">
                                    {quotation.milestones.map((m: any, i: number) => (
                                        <div key={i} className="flex items-center justify-between">
                                            <span className="text-xs font-bold text-gray-500">{m.name}</span>
                                            <span className="text-xs font-black text-gray-900">{m.percentage}%</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Sidebar - Interactions */}
                <div className="lg:col-span-4 space-y-8">

                    {/* Acceptance Panel */}
                    <div className="bg-gray-900 rounded-[3rem] p-10 text-white shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-8 opacity-10"><ShieldCheck className="w-32 h-32" /></div>
                        <h3 className="text-xl font-black mb-6 tracking-tight">Final Acceptance</h3>

                        {!approved ? (
                            <div className="space-y-6 relative z-10">
                                <p className="text-sm text-gray-400 font-medium leading-relaxed">
                                    By signing below, you agree to the project scope, payment milestones, and terms outlined in this proposal.
                                </p>
                                <div>
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Electronic Signature</label>
                                    <input
                                        type="text"
                                        value={signature}
                                        onChange={(e) => setSignature(e.target.value)}
                                        className="w-full h-14 px-6 bg-white/5 border border-white/10 rounded-2xl text-blue-400 font-black text-lg focus:ring-2 focus:ring-blue-500 transition-all outline-none"
                                        placeholder="Type Full Legal Name"
                                    />
                                    <p className="text-[9px] text-gray-600 font-bold mt-2 text-center uppercase tracking-tighter">Authorized signature as per legal identity</p>
                                </div>
                                <button
                                    onClick={handleAccept}
                                    disabled={accepting}
                                    className="w-full h-16 bg-blue-600 hover:bg-blue-700 text-white rounded-[1.25rem] font-black text-sm tracking-widest uppercase transition-all shadow-xl shadow-blue-500/20"
                                >
                                    {accepting ? 'Authenticating...' : 'Sign & Activate Project'}
                                </button>
                            </div>
                        ) : (
                            <div className="text-center py-6 relative z-10">
                                <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6 border border-green-500/30">
                                    <CheckCircle className="w-10 h-10 text-green-400" />
                                </div>
                                <h4 className="text-2xl font-black mb-2 uppercase tracking-tighter">Approved</h4>
                                <p className="text-xs text-gray-400 font-medium">A copy of the signed proposal has been sent to your email.</p>
                            </div>
                        )}
                    </div>

                    {/* Metadata Card */}
                    <div className="bg-white rounded-[3rem] p-10 border border-gray-100 shadow-sm space-y-8">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400"><Calendar className="w-5 h-5" /></div>
                            <div>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Quotation Date</p>
                                <p className="text-sm font-bold text-gray-900">{new Date(quotation.createdAt).toLocaleDateString()}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400"><User className="w-5 h-5" /></div>
                            <div>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Account Manager</p>
                                <p className="text-sm font-bold text-gray-900">Support Team</p>
                            </div>
                        </div>
                    </div>

                    <button className="w-full py-4 px-6 bg-white border border-gray-100 rounded-2xl flex items-center justify-between group hover:border-blue-100 transition-all font-bold text-gray-600 text-sm">
                        <span>Download Signed PDF</span>
                        <Download className="w-4 h-4 text-gray-300 group-hover:text-blue-500" />
                    </button>
                </div>
            </div>
        </div>
    );
}

