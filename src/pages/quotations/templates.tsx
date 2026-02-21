import { useState, useEffect } from 'react';
import {
    Plus, Trash2, ArrowLeft, CheckCircle,
    Layout, Settings, Sparkles
} from 'lucide-react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

export default function QuotationTemplates() {
    const navigate = useNavigate();
    const [templates, setTemplates] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState<any>({
        name: '',
        sections: [
            { title: 'Project Objective', content: 'This quotation outlines the proposed solution and pricing for the requested services.' },
            { title: 'Project Scope', content: 'The project will be developed following industry best practices and quality standards.' }
        ],
        defaultDeliverables: [
            { name: 'Source Code', included: true },
            { name: 'Admin Access', included: true },
            { name: 'Deployment', included: true },
            { name: 'Training Document', included: true },
            { name: '3 Month Technical Support (Bug Fix Only)', included: true }
        ],
        modules: [],
        branding: {
            headerText: 'NEXPRISM IT SOLUTIONS',
            footerText: 'This is a computer-generated document. Digital signatures are legally binding as per the IT Act.',
            showCoverPage: true,
            coverPageTitle: 'Project Proposal',
            coverPageSubtitle: 'Custom Solutions for Your Business'
        },
        isActive: true
    });

    useEffect(() => {
        fetchTemplates();
    }, []);

    const fetchTemplates = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('http://localhost:5000/api/quotations/templates/all', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setTemplates(res.data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!formData.name) return alert('Template name is required');
        try {
            const token = localStorage.getItem('token');
            if ((formData as any)._id) {
                await axios.put(`http://localhost:5000/api/quotations/templates/${(formData as any)._id}`, formData, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            } else {
                await axios.post('http://localhost:5000/api/quotations/templates', formData, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            }
            setShowModal(false);
            fetchTemplates();
        } catch (e) {
            alert('Failed to save template');
        }
    };

    const addSection = () => {
        setFormData({ ...formData, sections: [...formData.sections, { title: 'New Section', content: '' }] });
    };

    const updateSection = (idx: number, upd: any) => {
        const newSec = [...formData.sections];
        newSec[idx] = { ...newSec[idx], ...upd };
        setFormData({ ...formData, sections: newSec });
    };

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-10 min-h-screen bg-[#FDFDFF]">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-6">
                    <button onClick={() => navigate('/quotations')} className="p-3 bg-white border border-gray-100 rounded-2xl hover:bg-gray-50 shadow-sm transition-all">
                        <ArrowLeft className="w-5 h-5 text-gray-400" />
                    </button>
                    <div>
                        <h1 className="text-3xl font-black text-gray-900 tracking-tight">Proposal Blueprints</h1>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Manage reusable quotation frameworks</p>
                    </div>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="px-8 py-3.5 bg-blue-600 text-white font-black text-sm tracking-widest uppercase rounded-2xl hover:bg-blue-700 shadow-xl shadow-blue-100 transition-all flex items-center gap-2"
                >
                    <Plus className="w-5 h-5" /> Design New Blueprint
                </button>
            </div>

            {/* Template Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {templates.map(t => (
                    <div key={t._id} className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm hover:shadow-xl hover:border-blue-100 transition-all group">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                <Layout className="w-6 h-6" />
                            </div>
                            <div className="flex-1">
                                <h3 className="font-black text-gray-900 tracking-tight">{t.name}</h3>
                                <div className="flex gap-2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => { setFormData(t); setShowModal(true); }} className="text-[10px] font-black uppercase text-blue-600 hover:underline">Edit</button>
                                    <button
                                        onClick={async () => {
                                            if (confirm('Delete blueprint?')) {
                                                await axios.delete(`http://localhost:5000/api/quotations/templates/${t._id}`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
                                                fetchTemplates();
                                            }
                                        }}
                                        className="text-[10px] font-black uppercase text-red-600 hover:underline"
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div className="space-y-3 mb-8">
                            <div className="flex items-center gap-2 text-xs font-bold text-gray-400">
                                <CheckCircle className="w-3 h-3 text-green-500" /> {t.sections?.length || 0} Dynamic Sections
                            </div>
                            <div className="flex items-center gap-2 text-xs font-bold text-gray-400">
                                <CheckCircle className="w-3 h-3 text-green-500" /> {t.defaultDeliverables?.length || 0} Deliverables
                            </div>
                        </div>
                        <div className="flex items-center gap-2 overflow-hidden opacity-50">
                            {t.sections?.map((s: any, i: number) => (
                                <span key={i} className="px-2 py-0.5 bg-gray-100 text-[8px] font-black uppercase tracking-widest text-gray-400 rounded-md truncate max-w-[80px]">
                                    {s.title}
                                </span>
                            ))}
                        </div>
                    </div>
                ))}

                {templates.length === 0 && !loading && (
                    <div className="col-span-full py-20 bg-gray-50/50 border-2 border-dashed border-gray-100 rounded-[3rem] text-center">
                        <Sparkles className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                        <p className="text-sm font-bold text-gray-400">No blueprints architected yet.</p>
                    </div>
                )}
            </div>

            {/* Template Constructor Modal */}
            {showModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-8 overflow-y-auto">
                    <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-md" onClick={() => setShowModal(false)}></div>
                    <div className="bg-white w-full max-w-5xl rounded-[3rem] shadow-2xl relative z-10 border border-gray-100 overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-10 border-b flex items-center justify-between bg-white sticky top-0">
                            <div>
                                <h2 className="text-2xl font-black text-gray-900 tracking-tight">Blueprint Architect</h2>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Configure global quotation sections</p>
                            </div>
                            <div className="flex gap-4">
                                <button onClick={() => setShowModal(false)} className="px-6 h-12 text-xs font-black text-gray-400 uppercase hover:text-gray-900">Cancel</button>
                                <button onClick={handleSave} className="px-10 h-12 bg-gray-900 text-white rounded-2xl font-black text-xs tracking-widest uppercase hover:bg-black transition-all">
                                    Finalize Blueprint
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-10 custom-scrollbar grid grid-cols-1 lg:grid-cols-2 gap-12">
                            {/* Left: General & Sections */}
                            <div className="space-y-10">
                                <div>
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 block">Blueprint Name</label>
                                    <input
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full h-14 px-5 bg-gray-50 border-none rounded-2xl text-lg font-black text-gray-900 focus:ring-2 focus:ring-blue-500"
                                        placeholder="e.g. Standard SaaS Proposal"
                                    />
                                </div>

                                <div className="space-y-6">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">Dynamic Sections</h3>
                                        <button onClick={addSection} className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100">
                                            <Plus className="w-4 h-4" />
                                        </button>
                                    </div>
                                    <div className="space-y-4">
                                        {formData.sections.map((s: any, idx: number) => (
                                            <div key={idx} className="p-6 bg-gray-50/50 rounded-3xl border border-gray-100 group">
                                                <div className="flex justify-between mb-3">
                                                    <input
                                                        value={s.title}
                                                        onChange={e => updateSection(idx, { title: e.target.value })}
                                                        className="bg-transparent border-none p-0 text-sm font-black text-gray-900 focus:ring-0 w-full"
                                                    />
                                                    <button onClick={() => setFormData({ ...formData, sections: formData.sections.filter((_: any, i: number) => i !== idx) })} className="text-gray-200 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                                <textarea
                                                    value={s.content}
                                                    onChange={e => updateSection(idx, { content: e.target.value })}
                                                    className="w-full h-32 bg-white border border-gray-100 rounded-2xl p-4 text-xs text-gray-500 font-medium focus:ring-2 focus:ring-blue-100 resize-none shadow-sm"
                                                    placeholder="Section body content with {{variables}} supported..."
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Right: Default Deliverables */}
                            <div className="space-y-10">
                                <div className="p-8 bg-blue-50 rounded-[2.5rem] border border-blue-100">
                                    <h3 className="text-xs font-black text-blue-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                                        <Settings className="w-4 h-4" /> Global Default Deliverables
                                    </h3>
                                    <div className="space-y-3">
                                        {formData.defaultDeliverables.map((d: any, idx: number) => (
                                            <div key={idx} className="flex items-center justify-between p-3.5 bg-white rounded-xl border border-blue-100">
                                                <input
                                                    value={d.name}
                                                    onChange={e => {
                                                        const nd = [...formData.defaultDeliverables];
                                                        nd[idx].name = e.target.value;
                                                        setFormData({ ...formData, defaultDeliverables: nd });
                                                    }}
                                                    className="bg-transparent border-none p-0 text-[11px] font-bold text-gray-700 focus:ring-0 flex-1"
                                                />
                                                <button onClick={() => setFormData({ ...formData, defaultDeliverables: formData.defaultDeliverables.filter((_: any, i: number) => i !== idx) })} className="text-red-200 hover:text-red-500 transition-colors">
                                                    <Trash2 className="w-3 h-3" />
                                                </button>
                                            </div>
                                        ))}
                                        <button
                                            onClick={() => setFormData({ ...formData, defaultDeliverables: [...formData.defaultDeliverables, { name: 'New Item', included: true }] })}
                                            className="w-full p-3.5 border border-dashed border-blue-200 text-[10px] font-black text-blue-400 uppercase tracking-widest hover:bg-blue-100 rounded-xl transition-all"
                                        >
                                            + Add Item
                                        </button>
                                    </div>
                                </div>

                                <div className="p-8 bg-white rounded-[2.5rem] border border-gray-100 shadow-sm">
                                    <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                                        <CheckCircle className="w-4 h-4 text-blue-500" /> Module Blueprint
                                    </h3>
                                    <div className="space-y-4">
                                        {formData.modules?.map((m: any, idx: number) => (
                                            <div key={idx} className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-3">
                                                <div className="flex justify-between gap-2">
                                                    <input
                                                        value={m.name}
                                                        onChange={e => {
                                                            const nm = [...formData.modules];
                                                            nm[idx].name = e.target.value;
                                                            setFormData({ ...formData, modules: nm });
                                                        }}
                                                        className="bg-transparent border-none p-0 text-sm font-bold text-gray-900 focus:ring-0 w-full"
                                                        placeholder="Module Name"
                                                    />
                                                    <button onClick={() => setFormData({ ...formData, modules: formData.modules.filter((_: any, i: number) => i !== idx) })} className="text-red-300 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                                                </div>
                                                <div className="flex gap-4">
                                                    <input
                                                        type="number"
                                                        value={m.cost}
                                                        onChange={e => {
                                                            const nm = [...formData.modules];
                                                            nm[idx].cost = Number(e.target.value);
                                                            setFormData({ ...formData, modules: nm });
                                                        }}
                                                        className="w-24 h-8 px-2 bg-white border rounded-lg text-xs font-black"
                                                        placeholder="Cost"
                                                    />
                                                    <input
                                                        value={m.description}
                                                        onChange={e => {
                                                            const nm = [...formData.modules];
                                                            nm[idx].description = e.target.value;
                                                            setFormData({ ...formData, modules: nm });
                                                        }}
                                                        className="flex-1 h-8 px-2 bg-white border rounded-lg text-xs font-medium"
                                                        placeholder="Short description..."
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                        <button
                                            onClick={() => setFormData({ ...formData, modules: [...(formData.modules || []), { name: 'New Module', cost: 0, description: '', included: true }] })}
                                            className="w-full p-4 border-2 border-dashed border-gray-200 rounded-2xl text-[10px] font-black text-gray-400 uppercase hover:bg-gray-50 transition-all"
                                        >
                                            + Add Module Blueprint
                                        </button>
                                    </div>
                                </div>

                                <div className="p-8 bg-white rounded-[2.5rem] border border-gray-100 shadow-sm">
                                    <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                                        <Sparkles className="w-4 h-4 text-purple-500" /> Branding & Layout
                                    </h3>
                                    <div className="space-y-6">
                                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                                            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Show Cover Page</span>
                                            <button
                                                onClick={() => setFormData({ ...formData, branding: { ...formData.branding, showCoverPage: !formData.branding?.showCoverPage } })}
                                                className={`w-12 h-6 rounded-full transition-all relative ${formData.branding?.showCoverPage ? 'bg-blue-600' : 'bg-gray-300'}`}
                                            >
                                                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${formData.branding?.showCoverPage ? 'right-1' : 'left-1'}`}></div>
                                            </button>
                                        </div>

                                        {formData.branding?.showCoverPage && (
                                            <div className="grid grid-cols-1 gap-4">
                                                <input
                                                    value={formData.branding?.coverPageTitle}
                                                    onChange={e => setFormData({ ...formData, branding: { ...formData.branding, coverPageTitle: e.target.value } })}
                                                    className="w-full h-10 px-4 bg-gray-50 border-none rounded-xl text-xs font-bold"
                                                    placeholder="Cover Page Title"
                                                />
                                                <input
                                                    value={formData.branding?.coverPageSubtitle}
                                                    onChange={e => setFormData({ ...formData, branding: { ...formData.branding, coverPageSubtitle: e.target.value } })}
                                                    className="w-full h-10 px-4 bg-gray-50 border-none rounded-xl text-xs font-bold"
                                                    placeholder="Cover Page Subtitle"
                                                />
                                            </div>
                                        )}

                                        <div>
                                            <label className="text-[8px] font-black text-gray-400 uppercase tracking_widest mb-1.5 block ml-1">Global Header Text</label>
                                            <input
                                                value={formData.branding?.headerText}
                                                onChange={e => setFormData({ ...formData, branding: { ...formData.branding, headerText: e.target.value } })}
                                                className="w-full h-10 px-4 bg-gray-50 border-none rounded-xl text-xs font-bold"
                                                placeholder="e.g. NEXPRISM IT SOLUTIONS"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[8px] font-black text-gray-400 uppercase tracking_widest mb-1.5 block ml-1">Global Footer Text</label>
                                            <textarea
                                                value={formData.branding?.footerText}
                                                onChange={e => setFormData({ ...formData, branding: { ...formData.branding, footerText: e.target.value } })}
                                                className="w-full h-20 p-4 bg-gray-50 border-none rounded-xl text-xs font-medium resize-none"
                                                placeholder="Legal terms or company address..."
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="p-8 bg-gray-900 rounded-[2.5rem] text-white">
                                    <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-4">Supported Variables</h4>
                                    <div className="grid grid-cols-2 gap-2">
                                        {['client_name', 'project_title', 'timeline', 'grand_total', 'warranty'].map(v => (
                                            <div key={v} className="px-3 py-2 bg-white/5 rounded-lg text-[9px] font-black uppercase text-blue-400 tracking-tighter border border-white/5">
                                                {`{{${v}}}`}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )
            }
        </div >
    );
}

