import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Sparkles, UploadCloud, Loader2, FileText, Trash2 } from 'lucide-react';
import api from '@/lib/api-client';

export default function QuotationBuilder() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState<any>({
        clientName: '',
        clientPhone: '',
        grandTotal: '',
        attachmentUrl: '',
        status: 'draft'
    });

    const [uploadingAttachment, setUploadingAttachment] = useState(false);

    useEffect(() => {
        if (id) fetchQuotation();
    }, [id]);

    const fetchQuotation = async () => {
        try {
            const res = await api.get(`/quotations/${id}`);
            setFormData({
                clientName: res.data.clientName || '',
                clientPhone: res.data.clientPhone || '',
                grandTotal: res.data.grandTotal || '',
                attachmentUrl: res.data.attachmentUrl || '',
                status: res.data.status || 'draft'
            });
        } catch (e) { console.error(e); }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const data = new FormData();
        data.append('file', file);

        try {
            setUploadingAttachment(true);
            const res = await api.post('/files/upload', data, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setFormData({ ...formData, attachmentUrl: res.data.url });
        } catch (err) {
            console.error(err);
            alert('Upload failed');
        } finally {
            setUploadingAttachment(false);
        }
    };

    const handleSubmit = async (statusOverride?: string) => {
        if (!formData.clientName) {
            alert('Please provide a Name');
            return;
        }

        setLoading(true);
        try {
            const data = { ...formData };
            if (statusOverride) data.status = statusOverride;

            const url = id ? `/quotations/${id}` : '/quotations';
            const method = id ? 'put' : 'post';

            await api[method](url, data);
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
        <div className="flex flex-col min-h-screen bg-[#FDFDFF]">
            {/* Top Bar */}
            <div className="bg-white border-b px-6 py-4 flex items-center justify-between shadow-[0_1px_3px_rgba(0,0,0,0.05)] z-10 sticky top-0">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('/quotations')} className="p-2.5 hover:bg-gray-100 rounded-xl transition-all">
                        <ArrowLeft className="w-5 h-5 text-gray-600" />
                    </button>
                    <div>
                        <h1 className="text-xl font-black text-gray-900 tracking-tight">{id ? 'Edit Quotation' : 'New Quotation'}</h1>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mt-1">Simple Quick Quote</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={() => handleSubmit('draft')} disabled={loading} className="px-5 py-2.5 text-sm font-bold text-gray-500 hover:text-gray-900 transition-colors">
                        Save as Draft
                    </button>
                    <button onClick={() => handleSubmit('sent')} disabled={loading} className="px-8 py-2.5 text-sm font-black text-white bg-blue-600 rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all flex items-center gap-2">
                        {loading ? 'Processing...' : <><Sparkles className="w-4 h-4" /> Save Quotation</>}
                    </button>
                </div>
            </div>

            <div className="max-w-2xl mx-auto w-full p-8 mt-6">
                <div className="bg-white rounded-[2rem] border border-gray-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)] p-8 space-y-8">
                    
                    {/* Basic Info */}
                    <div>
                        <h3 className="text-lg font-bold text-gray-900 mb-6">Prospect Details</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="text-[11px] font-bold text-gray-400 uppercase mb-1.5 block">Name <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    value={formData.clientName}
                                    onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                                    className="w-full h-12 px-4 bg-gray-50 border-none rounded-xl text-sm font-semibold focus:ring-2 focus:ring-blue-500 transition-all"
                                    placeholder="Enter lead or client name"
                                />
                            </div>

                            <div>
                                <label className="text-[11px] font-bold text-gray-400 uppercase mb-1.5 block">Phone Number</label>
                                <input
                                    type="text"
                                    value={formData.clientPhone}
                                    onChange={(e) => setFormData({ ...formData, clientPhone: e.target.value })}
                                    className="w-full h-12 px-4 bg-gray-50 border-none rounded-xl text-sm font-semibold focus:ring-2 focus:ring-blue-500 transition-all"
                                    placeholder="Enter phone number"
                                />
                            </div>

                            <div>
                                <label className="text-[11px] font-bold text-gray-400 uppercase mb-1.5 block">Amount</label>
                                <input
                                    type="number"
                                    value={formData.grandTotal}
                                    onChange={(e) => setFormData({ ...formData, grandTotal: e.target.value })}
                                    className="w-full h-12 px-4 bg-gray-50 border-none rounded-xl text-sm font-bold text-gray-900 focus:ring-2 focus:ring-blue-500 transition-all"
                                    placeholder="0.00"
                                />
                            </div>
                        </div>
                    </div>

                    <hr className="border-gray-100" />

                    {/* File Attachment */}
                    <div>
                        <div className="flex items-center gap-3 mb-6">
                            <UploadCloud className="w-5 h-5 text-purple-500" />
                            <h3 className="text-lg font-bold text-gray-900">Quotation Document</h3>
                        </div>
                        
                        {formData.attachmentUrl ? (
                            <div className="flex items-center justify-between p-4 bg-gray-50 border border-gray-100 rounded-xl">
                                <a href={formData.attachmentUrl} target="_blank" rel="noreferrer" className="text-sm font-bold text-blue-600 hover:underline flex items-center gap-2">
                                    <FileText className="w-4 h-4" /> View Uploaded File
                                </a>
                                <button onClick={() => setFormData({ ...formData, attachmentUrl: '' })} className="p-2 text-gray-400 hover:text-red-500">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        ) : (
                            <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center hover:border-blue-300 transition-colors">
                                {uploadingAttachment ? (
                                    <div className="flex flex-col items-center gap-2 text-gray-500">
                                        <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                                        <span className="text-sm font-bold">Uploading...</span>
                                    </div>
                                ) : (
                                    <label className="cursor-pointer flex flex-col items-center gap-2 text-gray-500 hover:text-blue-600">
                                        <UploadCloud className="w-8 h-8" />
                                        <span className="text-sm font-bold">Click to upload quotation file (PDF, Doc, Image)</span>
                                        <input type="file" className="hidden" onChange={handleFileUpload} accept=".pdf,.doc,.docx,.jpg,.png" />
                                    </label>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
