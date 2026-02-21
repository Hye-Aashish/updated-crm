import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    Plus, Trash2, ArrowLeft, FileText,
    Calculator, ChevronRight, Calendar, Sparkles, ShieldCheck
} from 'lucide-react';
import axios from 'axios';

const PROJECT_TYPES = [
    'Multivendor Ecommerce',
    'Corporate Website',
    'Custom SaaS Application',
    'Mobile App (iOS/Android)',
    'Real Estate Portal',
    'Learning Management System'
];

export default function QuotationBuilder() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [clients, setClients] = useState<any[]>([]);
    const [templates, setTemplates] = useState<any[]>([]);
    const [formData, setFormData] = useState<any>({
        clientId: '',
        projectTitle: '',
        projectType: '',
        timeline: '',
        warrantyPeriod: '3 Months',
        gstPercentage: 18,
        discount: 0,
        expiryDate: null,
        objective: 'This quotation outlines the proposed solution and pricing for the requested services.',
        projectScope: 'The project will be developed following industry best practices and quality standards.',
        modules: [],
        milestones: [],
        deliverables: [
            { name: 'Source Code', included: true },
            { name: 'Admin Access', included: true },
            { name: 'Deployment', included: true },
            { name: 'Training Document', included: true },
            { name: '3 Month Technical Support (Bug Fix Only)', included: true }
        ],
        status: 'draft'
    });

    useEffect(() => {
        fetchClients();
        fetchTemplates();
        if (id) fetchQuotation();
    }, [id]);

    const fetchClients = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('http://localhost:5000/api/clients', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setClients(res.data);
        } catch (e) { console.error(e); }
    };

    const fetchTemplates = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('http://localhost:5000/api/quotations/templates/all', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setTemplates(res.data);
        } catch (e) { console.error(e); }
    };

    const fetchQuotation = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`http://localhost:5000/api/quotations/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setFormData(res.data);
        } catch (e) { console.error(e); }
    };

    const handleTemplateApply = (template: any) => {
        if (!confirm('Apply this template? It will override sections like Objective and Deliverables.')) return;

        const client = clients.find(c => c._id === formData.clientId);
        const replaceVars = (text: string) => {
            if (!text) return text;
            return text
                .replace(/{{client_name}}/g, client?.name || '[Client Name]')
                .replace(/{{project_title}}/g, formData.projectTitle || '[Project Title]')
                .replace(/{{timeline}}/g, formData.timeline || '[Timeline]')
                .replace(/{{grand_total}}/g, grandTotal.toLocaleString() || '0')
                .replace(/{{warranty}}/g, formData.warrantyPeriod || '3 Months');
        };

        setFormData((prev: any) => ({
            ...prev,
            objective: replaceVars(template.sections?.[0]?.content) || prev.objective,
            projectScope: replaceVars(template.sections?.[1]?.content) || prev.projectScope,
            sections: template.sections?.map((s: any) => ({
                title: s.title,
                content: replaceVars(s.content)
            })) || [],
            deliverables: template.defaultDeliverables?.length > 0
                ? template.defaultDeliverables.map((d: any) => ({ ...d, included: true }))
                : prev.deliverables,
            modules: template.modules?.length > 0 ? template.modules : prev.modules,
            branding: template.branding || prev.branding
        }));
    };

    const handleProjectTypeChange = async (type: string) => {
        setFormData((prev: any) => ({ ...prev, projectType: type }));
        const presets: any = {
            'Multivendor Ecommerce': [
                { name: 'Admin Panel', description: 'Complete administrative control center', cost: 15000, included: true },
                { name: 'Seller Panel', description: 'Vendor management and dashboard', cost: 10000, included: true },
                { name: 'User Panel/App', description: 'Customer facing interface', cost: 10000, included: true },
                { name: 'Commission System', description: 'Automated referral and sale commission', cost: 5000, included: true },
                { name: 'Order Management', description: 'Tracking, logistics, and invoicing', cost: 5000, included: true },
                { name: 'Payment Gateway', description: 'Secure online payment integration', cost: 3000, included: true }
            ],
            'Corporate Website': [
                { name: 'UI/UX Design', description: 'Custom responsive design', cost: 5000, included: true },
                { name: 'CMS Integration', description: 'Content management system', cost: 5000, included: true },
                { name: 'SEO Optimization', description: 'On-page SEO setup', cost: 2000, included: true },
                { name: 'Contact Forms', description: 'Lead capture system', cost: 1000, included: true }
            ]
        };
        if (presets[type]) {
            setFormData((prev: any) => ({ ...prev, modules: presets[type] }));
        }
    };

    const updateModule = (index: number, upd: any) => {
        const newModules = [...formData.modules];
        newModules[index] = { ...newModules[index], ...upd };
        setFormData({ ...formData, modules: newModules });
    };

    const totalAmount = formData.modules.filter((m: any) => m.included).reduce((sum: number, m: any) => sum + (Number(m.cost) || 0), 0);
    const gstAmount = (totalAmount * formData.gstPercentage) / 100;
    const grandTotal = totalAmount + gstAmount - (Number(formData.discount) || 0);

    const handleSubmit = async (statusOverride?: string) => {
        if (!formData.clientId || !formData.projectTitle) {
            alert('Please select a client and project title');
            return;
        }
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const data = { ...formData, totalAmount, gstAmount, grandTotal };
            if (statusOverride) data.status = statusOverride;

            const url = id ? `http://localhost:5000/api/quotations/${id}` : 'http://localhost:5000/api/quotations';
            const method = id ? 'put' : 'post';

            await axios[method](url, data, {
                headers: { Authorization: `Bearer ${token}` }
            });
            navigate('/quotations');
        } catch (error: any) {
            console.error(error);
            const msg = error.response?.data?.error || error.response?.data?.message || 'Error saving quotation';
            alert(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-screen bg-[#FDFDFF] overflow-hidden">
            {/* Top Bar */}
            <div className="bg-white border-b px-6 py-4 flex items-center justify-between shadow-[0_1px_3px_rgba(0,0,0,0.05)] z-10">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('/quotations')} className="p-2.5 hover:bg-gray-100 rounded-xl transition-all">
                        <ArrowLeft className="w-5 h-5 text-gray-600" />
                    </button>
                    <div>
                        <h1 className="text-xl font-black text-gray-900 tracking-tight">{id ? 'Edit Proposal' : 'New Modular Proposal'}</h1>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mt-1">Proposal Engine v2.0</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={() => handleSubmit('draft')} disabled={loading} className="px-5 py-2.5 text-sm font-bold text-gray-500 hover:text-gray-900 transition-colors">
                        Save as Draft
                    </button>
                    <button onClick={() => handleSubmit('sent')} disabled={loading} className="px-8 py-2.5 text-sm font-black text-white bg-blue-600 rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all flex items-center gap-2">
                        {loading ? 'Processing...' : <><Sparkles className="w-4 h-4" /> Send to Client</>}
                    </button>
                </div>
            </div>

            <div className="flex flex-1 overflow-hidden">
                {/* Left Panel - CONFIG */}
                <div className="w-[22rem] bg-white border-r px-6 py-8 overflow-y-auto custom-scrollbar">
                    <div className="space-y-8">
                        {/* Section 0: Company Info */}
                        <div>
                            <div className="flex items-center gap-2 mb-6 text-gray-900">
                                <div className="p-2 bg-gray-50 rounded-lg"><ShieldCheck className="w-4 h-4 text-gray-900" /></div>
                                <h3 className="text-xs font-black uppercase tracking-[0.2em]">Company Identity</h3>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-[11px] font-bold text-gray-400 uppercase mb-1.5 block">Company Name</label>
                                    <input
                                        type="text"
                                        value={formData.companyDetails?.name || ''}
                                        onChange={(e) => setFormData({ ...formData, companyDetails: { ...formData.companyDetails, name: e.target.value } })}
                                        className="w-full h-11 px-4 bg-gray-50 border-none rounded-xl text-sm font-semibold focus:ring-2 focus:ring-blue-500 transition-all"
                                        placeholder="Your Company Name"
                                    />
                                </div>
                                <div>
                                    <label className="text-[11px] font-bold text-gray-400 uppercase mb-1.5 block">GST Number</label>
                                    <input
                                        type="text"
                                        value={formData.companyDetails?.gst || ''}
                                        onChange={(e) => setFormData({ ...formData, companyDetails: { ...formData.companyDetails, gst: e.target.value } })}
                                        className="w-full h-11 px-4 bg-gray-50 border-none rounded-xl text-sm font-semibold focus:ring-2 focus:ring-blue-500 transition-all"
                                        placeholder="27XXXXX..."
                                    />
                                </div>
                            </div>
                        </div>
                        {/* Section 1: Core Info */}
                        <div>
                            <div className="flex items-center gap-2 mb-6">
                                <div className="p-2 bg-blue-50 rounded-lg"><Calendar className="w-4 h-4 text-blue-600" /></div>
                                <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">General settings</h3>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="text-[11px] font-bold text-gray-400 uppercase mb-1.5 block">Target Client</label>
                                    <select
                                        value={formData.clientId}
                                        onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                                        className="w-full h-11 px-4 bg-gray-50 border-none rounded-xl text-sm font-semibold focus:ring-2 focus:ring-blue-500 transition-all"
                                    >
                                        <option value="">Choose client...</option>
                                        {clients.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                                    </select>
                                </div>

                                <div>
                                    <label className="text-[11px] font-bold text-gray-400 uppercase mb-1.5 block">Project Title</label>
                                    <input
                                        type="text"
                                        value={formData.projectTitle}
                                        onChange={(e) => setFormData({ ...formData, projectTitle: e.target.value })}
                                        className="w-full h-11 px-4 bg-gray-50 border-none rounded-xl text-sm font-semibold placeholder:text-gray-300 focus:ring-2 focus:ring-blue-500 transition-all"
                                        placeholder="e.g. Acme Dashboard Revamp"
                                    />
                                </div>

                                <div>
                                    <label className="text-[11px] font-bold text-gray-400 uppercase mb-1.5 block">Expiry Date</label>
                                    <input
                                        type="date"
                                        value={formData.expiryDate}
                                        onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                                        className="w-full h-11 px-4 bg-gray-50 border-none rounded-xl text-sm font-semibold focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Section 2: Templates & Presets */}
                        <div>
                            <div className="flex items-center gap-2 mb-6 text-purple-600">
                                <div className="p-2 bg-purple-50 rounded-lg"><Sparkles className="w-4 h-4" /></div>
                                <h3 className="text-xs font-black uppercase tracking-[0.2em]">Smart Templates</h3>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="text-[11px] font-bold text-gray-400 uppercase mb-1.5 block">Load Quick Template</label>
                                    <select
                                        onChange={(e) => {
                                            const t = templates.find(temp => temp._id === e.target.value);
                                            if (t) handleTemplateApply(t);
                                            e.target.value = "";
                                        }}
                                        className="w-full h-11 px-4 bg-gray-50 border-none rounded-xl text-sm font-semibold border-2 border-purple-100 focus:ring-0"
                                    >
                                        <option value="">Select template...</option>
                                        {templates.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
                                    </select>
                                </div>

                                <div>
                                    <label className="text-[11px] font-bold text-gray-400 uppercase mb-1.5 block">Auto-Load Project Modules</label>
                                    <select
                                        value={formData.projectType}
                                        onChange={(e) => handleProjectTypeChange(e.target.value)}
                                        className="w-full h-11 px-4 bg-blue-50 border-none rounded-xl text-sm font-bold text-blue-700 focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="">Select project type...</option>
                                        {PROJECT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Section 3: Financial Config */}
                        <div>
                            <div className="flex items-center gap-2 mb-6 text-green-600">
                                <div className="p-2 bg-green-50 rounded-lg"><Calculator className="w-4 h-4" /></div>
                                <h3 className="text-xs font-black uppercase tracking-[0.2em]">Pricing Strategy</h3>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[11px] font-bold text-gray-400 uppercase mb-1.5 block">Timeline</label>
                                    <input type="text" value={formData.timeline} onChange={e => setFormData({ ...formData, timeline: e.target.value })} className="w-full h-10 px-3 bg-gray-50 border-none rounded-lg text-sm font-semibold" placeholder="4-6 Weeks" />
                                </div>
                                <div>
                                    <label className="text-[11px] font-bold text-gray-400 uppercase mb-1.5 block">Warranty</label>
                                    <input type="text" value={formData.warrantyPeriod} onChange={e => setFormData({ ...formData, warrantyPeriod: e.target.value })} className="w-full h-10 px-3 bg-gray-50 border-none rounded-lg text-sm font-semibold" placeholder="3 Months" />
                                </div>
                                <div>
                                    <label className="text-[11px] font-bold text-gray-400 uppercase mb-1.5 block">Discount (₹)</label>
                                    <input type="number" value={formData.discount} onChange={e => setFormData({ ...formData, discount: e.target.value })} className="w-full h-10 px-3 bg-red-50 border-none rounded-lg text-sm font-bold text-red-600" />
                                </div>
                                <div>
                                    <label className="text-[11px] font-bold text-gray-400 uppercase mb-1.5 block">GST Rate (%)</label>
                                    <input type="number" value={formData.gstPercentage} onChange={e => setFormData({ ...formData, gstPercentage: e.target.value })} className="w-full h-10 px-3 bg-gray-50 border-none rounded-lg text-sm font-semibold" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Panel - BUILDER CONTENT */}
                <div className="flex-1 bg-gray-50/30 overflow-y-auto px-12 py-10 custom-scrollbar">
                    <div className="max-w-4xl mx-auto space-y-12">
                        {/* Summary Section */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-4">
                                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Project Objective</h4>
                                <textarea
                                    value={formData.objective}
                                    onChange={e => setFormData({ ...formData, objective: e.target.value })}
                                    className="w-full h-32 p-4 bg-white border border-gray-100 rounded-2xl text-sm text-gray-600 focus:ring-2 focus:ring-blue-500 shadow-sm transition-all"
                                />
                            </div>
                            <div className="space-y-4">
                                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Project Scope</h4>
                                <textarea
                                    value={formData.projectScope}
                                    onChange={e => setFormData({ ...formData, projectScope: e.target.value })}
                                    className="w-full h-32 p-4 bg-white border border-gray-100 rounded-2xl text-sm text-gray-600 focus:ring-2 focus:ring-blue-500 shadow-sm transition-all"
                                />
                            </div>
                        </div>

                        {/* Dynamic Blueprint Sections */}
                        {formData.sections?.length > 0 && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {formData.sections.map((s: any, idx: number) => (
                                    <div key={idx} className="space-y-4">
                                        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{s.title}</h4>
                                        <textarea
                                            value={s.content}
                                            onChange={e => {
                                                const ns = [...formData.sections];
                                                ns[idx].content = e.target.value;
                                                setFormData({ ...formData, sections: ns });
                                            }}
                                            className="w-full h-32 p-4 bg-white border border-gray-100 rounded-2xl text-sm text-gray-600 focus:ring-2 focus:ring-blue-500 shadow-sm transition-all"
                                        />
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Modules Table */}
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <h3 className="text-xl font-bold text-gray-900">Breakdown of Modules</h3>
                                <button
                                    onClick={() => setFormData({ ...formData, modules: [...formData.modules, { name: 'Custom Module', cost: 0, included: true }] })}
                                    className="px-4 py-2 bg-white text-blue-600 border border-blue-50 rounded-xl text-xs font-black shadow-sm hover:shadow-md transition-all flex items-center gap-2"
                                >
                                    <Plus className="w-3 h-3" /> Insert Custom Row
                                </button>
                            </div>

                            <div className="bg-white rounded-[2rem] shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-gray-100 overflow-hidden">
                                <table className="w-full text-left">
                                    <thead className="bg-gray-50/50 border-b">
                                        <tr>
                                            <th className="w-16 px-8 py-5"></th>
                                            <th className="px-4 py-5 font-black text-[10px] text-gray-400 uppercase tracking-widest">Module Name</th>
                                            <th className="w-40 px-4 py-5 font-black text-[10px] text-gray-400 uppercase tracking-widest">Pricing (₹)</th>
                                            <th className="w-16 px-4 py-5"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {formData.modules.map((m: any, idx: number) => (
                                            <tr key={idx} className={m.included ? "bg-white" : "bg-gray-50/50 opacity-40"}>
                                                <td className="px-8 py-4">
                                                    <input
                                                        type="checkbox"
                                                        checked={m.included}
                                                        onChange={e => updateModule(idx, { included: e.target.checked })}
                                                        className="w-5 h-5 rounded-lg border-gray-200 text-blue-600 focus:ring-0"
                                                    />
                                                </td>
                                                <td className="px-4 py-4">
                                                    <input
                                                        type="text"
                                                        value={m.name}
                                                        onChange={e => updateModule(idx, { name: e.target.value })}
                                                        className="w-full text-sm font-bold text-gray-900 border-none bg-transparent p-0 mb-1 focus:ring-0"
                                                    />
                                                    <input
                                                        type="text"
                                                        value={m.description}
                                                        onChange={e => updateModule(idx, { description: e.target.value })}
                                                        className="w-full text-[11px] text-gray-400 border-none bg-transparent p-0 focus:ring-0"
                                                        placeholder="Quick description..."
                                                    />
                                                </td>
                                                <td className="px-4 py-4">
                                                    <div className="h-10 px-3 flex items-center bg-gray-50 rounded-lg group focus-within:ring-2 focus-within:ring-blue-100">
                                                        <span className="text-gray-300 font-bold mr-2 text-xs">₹</span>
                                                        <input
                                                            type="number"
                                                            value={m.cost}
                                                            onChange={e => updateModule(idx, { cost: e.target.value })}
                                                            className="w-full bg-transparent border-none text-sm font-black text-gray-900 focus:ring-0 p-0"
                                                        />
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4">
                                                    <button onClick={() => setFormData({ ...formData, modules: formData.modules.filter((_: any, i: number) => i !== idx) })} className="p-2 text-gray-200 hover:text-red-500 transition-colors">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {formData.modules.length === 0 && (
                                    <div className="py-20 text-center">
                                        <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
                                            <FileText className="w-10 h-10 text-gray-200" />
                                        </div>
                                        <p className="text-sm font-bold text-gray-400">Project list is empty. Add modules manually or use presets.</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Deliverables */}
                        <div className="bg-white rounded-[2rem] p-10 border shadow-sm">
                            <div className="flex items-center gap-3 mb-8">
                                <ShieldCheck className="w-6 h-6 text-green-500" />
                                <h3 className="text-xl font-bold text-gray-900">Standard Project Deliverables</h3>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {formData.deliverables.map((d: any, idx: number) => (
                                    <div key={idx} className="flex items-center justify-between p-4 bg-gray-50/50 rounded-2xl border border-gray-50 hover:border-gray-100">
                                        <div className="flex items-center gap-3">
                                            <input
                                                type="checkbox"
                                                checked={d.included}
                                                onChange={e => {
                                                    const nd = [...formData.deliverables];
                                                    nd[idx].included = e.target.checked;
                                                    setFormData({ ...formData, deliverables: nd });
                                                }}
                                                className="w-5 h-5 rounded-full border-gray-200 text-green-600 focus:ring-0"
                                            />
                                            <input
                                                type="text"
                                                value={d.name}
                                                onChange={e => {
                                                    const nd = [...formData.deliverables];
                                                    nd[idx].name = e.target.value;
                                                    setFormData({ ...formData, deliverables: nd });
                                                }}
                                                className="text-sm font-bold text-gray-700 bg-transparent border-none p-0 focus:ring-0 w-full"
                                            />
                                        </div>
                                        <button onClick={() => setFormData({ ...formData, deliverables: formData.deliverables.filter((_: any, i: number) => i !== idx) })} className="text-gray-200 hover:text-red-500 ml-2">
                                            <Trash2 className="w-3 h-3" />
                                        </button>
                                    </div>
                                ))}
                                <button
                                    onClick={() => setFormData({ ...formData, deliverables: [...formData.deliverables, { name: 'New Deliverable', included: true }] })}
                                    className="p-4 border-2 border-dashed border-gray-100 rounded-2xl text-xs font-bold text-gray-400 hover:border-blue-100 hover:text-blue-500 transition-all"
                                >
                                    + Add Deliverable Row
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Counter Bar */}
            <div className="bg-white border-t px-12 py-6 flex items-center justify-between shadow-[0_-5px_20px_rgba(0,0,0,0.03)] z-20">
                <div className="flex items-center gap-10">
                    <div className="flex flex-col">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Subtotal</span>
                        <span className="text-2xl font-black text-gray-900 tracking-tight">₹{totalAmount.toLocaleString()}</span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Tax ({formData.gstPercentage}%)</span>
                        <span className="text-2xl font-black text-gray-900 tracking-tight">₹{gstAmount.toLocaleString()}</span>
                    </div>
                    <ChevronRight className="w-6 h-6 text-gray-200" />
                    <div className="flex flex-col">
                        <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest leading-none mb-1">Grand Project Total</span>
                        <div className="flex items-baseline gap-2">
                            <span className="text-4xl font-black text-blue-600 tracking-tighter">₹{grandTotal.toLocaleString()}</span>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col items-end">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="block w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Pricing Safe & Locked</span>
                    </div>
                    <p className="text-xs font-medium text-gray-500">Working on <span className="text-blue-600 font-bold underline">Iteration v{formData.version || 1}</span></p>
                </div>
            </div>
        </div>
    );
}

