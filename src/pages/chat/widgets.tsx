import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Copy, Plus } from 'lucide-react';
import api from '@/lib/api-client';

import { appAlert } from '@/lib/app-dialog'

export const ChatWidgetsPage = () => {
    const [widgets, setWidgets] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [formData, setFormData] = useState({
        widget_name: '',
        website_url: '',
        primary_color: '#2563eb'
    });

    const getBaseUrl = () => {
        const url = api.defaults.baseURL || '';
        if (url.startsWith('http')) {
            return url.replace('/api', '');
        }
        return window.location.origin;
    };
    const API_BASE = getBaseUrl();

    useEffect(() => {
        fetchWidgets();
    }, []);

    const fetchWidgets = async () => {
        try {
            const res = await api.get('/chat/widgets');
            setWidgets(res.data);
            setLoading(false);
        } catch (error) {
            console.error(error);
        }
    };

    const createWidget = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await api.post('/chat/widgets', formData);
            setWidgets([...widgets, res.data]);
            setFormData({ widget_name: '', website_url: '', primary_color: '#2563eb' });
        } catch (error) {
            console.error(error);
        }
    };

    const copyScript = async (token: string) => {
        const script = `<script src="${API_BASE}/public/widget.js?token=${token}"></script>`;
        navigator.clipboard.writeText(script);
        await appAlert('Script copied to clipboard!');
    };

    return (
        <div className="p-6 max-w-6xl mx-auto space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900">Chat Widgets</h1>
                    <p className="text-gray-500">Manage your live chat widgets here.</p>
                </div>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
                {/* Create Widget Form */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Create New Widget</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={createWidget} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Widget Name</Label>
                                <Input
                                    id="name"
                                    placeholder="e.g. Main Website Support"
                                    value={formData.widget_name}
                                    onChange={e => setFormData({ ...formData, widget_name: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="url">Website URL</Label>
                                <Input
                                    id="url"
                                    placeholder="https://example.com"
                                    value={formData.website_url}
                                    onChange={e => setFormData({ ...formData, website_url: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="color">Primary Color</Label>
                                <div className="flex gap-2 items-center">
                                    <Input
                                        type="color"
                                        id="color"
                                        className="h-10 w-20 p-1"
                                        value={formData.primary_color}
                                        onChange={e => setFormData({ ...formData, primary_color: e.target.value })}
                                    />
                                    <span className="text-sm text-gray-500">{formData.primary_color}</span>
                                </div>
                            </div>
                            <Button type="submit" className="w-full">
                                <Plus className="mr-2 h-4 w-4" /> Create Widget
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                {/* Widgets List */}
                <div className="space-y-4">
                    <h3 className="font-semibold text-lg text-gray-900">Your Widgets</h3>
                    {widgets.map(widget => (
                        <Card key={widget._id} className="overflow-hidden border-l-4" style={{ borderLeftColor: widget.primary_color }}>
                            <CardContent className="p-6">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h4 className="font-bold text-gray-900">{widget.widget_name}</h4>
                                        <p className="text-sm text-gray-500 truncate">{widget.website_url}</p>
                                    </div>
                                    <div
                                        className="h-6 w-6 rounded-full"
                                        style={{ backgroundColor: widget.primary_color }}
                                    />
                                </div>
                                <div className="bg-gray-100 p-3 rounded-md font-mono text-xs text-gray-600 break-all relative group">
                                    {`<script src="${API_BASE}/public/widget.js?token=${widget.widget_token}"></script>`}
                                    <Button
                                        size="icon"
                                        variant="secondary"
                                        className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6"
                                        onClick={() => copyScript(widget.widget_token)}
                                    >
                                        <Copy className="h-3 w-3" />
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                    {widgets.length === 0 && !loading && (
                        <div className="text-center py-10 text-gray-500 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                            No widgets created yet.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ChatWidgetsPage;
