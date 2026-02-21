import { useState, useEffect } from 'react';
import { Plus, FileText, Download, Mail, Eye, Edit, Trash2 } from 'lucide-react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

interface Quotation {
    _id: string;
    quotationNumber: string;
    version: number;
    clientName: string;
    clientEmail: string;
    totalAmount: number;
    status: 'draft' | 'sent' | 'approved' | 'rejected' | 'revision' | 'expired';
    createdAt: string;
    validUntil?: string;
    createdBy: {
        name: string;
    };
}

export default function QuotationsPage() {
    const [quotations, setQuotations] = useState<Quotation[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<string>('all');
    const navigate = useNavigate();

    useEffect(() => {
        fetchQuotations();
    }, []);

    const fetchQuotations = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get('http://localhost:5000/api/quotations', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setQuotations(response.data);
        } catch (error) {
            console.error('Error fetching quotations:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this quotation?')) return;

        try {
            const token = localStorage.getItem('token');
            await axios.delete(`http://localhost:5000/api/quotations/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchQuotations();
        } catch (error) {
            console.error('Error deleting quotation:', error);
        }
    };

    const handleDownloadPDF = async (id: string, quotationNumber: string) => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(`http://localhost:5000/api/quotations/${id}/pdf`, {
                headers: { Authorization: `Bearer ${token}` },
                responseType: 'blob'
            });

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `quotation-${quotationNumber}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            console.error('Error downloading PDF:', error);
        }
    };

    const getStatusColor = (status: string) => {
        const colors = {
            draft: 'bg-gray-100 text-gray-800',
            sent: 'bg-blue-100 text-blue-800',
            accepted: 'bg-green-100 text-green-800',
            rejected: 'bg-red-100 text-red-800',
            expired: 'bg-orange-100 text-orange-800'
        };
        return colors[status as keyof typeof colors] || colors.draft;
    };

    const filteredQuotations = quotations.filter(q =>
        filter === 'all' || q.status === filter
    );

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Quotations</h1>
                    <p className="text-gray-600 mt-1">Manage and generate professional quotations</p>
                </div>
                <button
                    onClick={() => navigate('/quotations/create')}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                    <Plus className="w-5 h-5" />
                    Create Quotation
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                {[
                    { label: 'All', value: quotations.length, filter: 'all', color: 'bg-gray-50' },
                    { label: 'Sent', value: quotations.filter(q => q.status === 'sent').length, filter: 'sent', color: 'bg-blue-50' },
                    { label: 'Approved', value: quotations.filter(q => q.status === 'approved').length, filter: 'approved', color: 'bg-green-50' },
                    { label: 'Revision', value: quotations.filter(q => q.status === 'revision').length, filter: 'revision', color: 'bg-orange-50' },
                    { label: 'Rejected', value: quotations.filter(q => q.status === 'rejected').length, filter: 'rejected', color: 'bg-red-50' }
                ].map((stat) => (
                    <button
                        key={stat.filter}
                        onClick={() => setFilter(stat.filter)}
                        className={`p-4 rounded-lg border-2 transition-all ${filter === stat.filter
                            ? 'border-blue-600 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                            } ${stat.color}`}
                    >
                        <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
                        <div className="text-sm text-gray-600">{stat.label}</div>
                    </button>
                ))}
            </div>

            {/* Quotations List */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                {filteredQuotations.length === 0 ? (
                    <div className="text-center py-12">
                        <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">No quotations found</h3>
                        <p className="text-gray-600 mb-4">Create your first quotation to get started</p>
                        <button
                            onClick={() => navigate('/quotations/create')}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        >
                            <Plus className="w-5 h-5" />
                            Create Quotation
                        </button>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Quotation #
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Client
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Amount
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Status
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Created
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {filteredQuotations.map((quotation) => (
                                    <tr key={quotation._id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <FileText className="w-5 h-5 text-blue-600 mr-2" />
                                                <div>
                                                    <div className="text-sm font-medium text-gray-900">
                                                        {quotation.quotationNumber}
                                                    </div>
                                                    <div className="text-xs text-gray-500">v{quotation.version}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm font-medium text-gray-900">{quotation.clientName}</div>
                                            <div className="text-xs text-gray-500">{quotation.clientEmail}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-semibold text-gray-900">
                                                ₹{quotation.totalAmount.toLocaleString('en-IN')}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(quotation.status)}`}>
                                                {quotation.status.charAt(0).toUpperCase() + quotation.status.slice(1)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {new Date(quotation.createdAt).toLocaleDateString('en-IN')}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => navigate(`/quotations/${quotation._id}`)}
                                                    className="text-blue-600 hover:text-blue-900"
                                                    title="View"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => navigate(`/quotations/${quotation._id}/edit`)}
                                                    className="text-green-600 hover:text-green-900"
                                                    title="Edit"
                                                >
                                                    <Edit className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDownloadPDF(quotation._id, quotation.quotationNumber)}
                                                    className="text-purple-600 hover:text-purple-900"
                                                    title="Download PDF"
                                                >
                                                    <Download className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => navigate(`/quotations/${quotation._id}/share`)}
                                                    className="text-indigo-600 hover:text-indigo-900"
                                                    title="Share"
                                                >
                                                    <Mail className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(quotation._id)}
                                                    className="text-red-600 hover:text-red-900"
                                                    title="Delete"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
