import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import {
    Activity,
    Users,
    Clock,
    Globe,
    Smartphone,
    Monitor,
    Tablet,
    Eye,
    ArrowUpRight,
    ArrowDownRight,
    AlertCircle,
    Code
} from 'lucide-react';
import {
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    AreaChart,
    Area,
    PieChart,
    Pie,
    Cell
} from 'recharts';
import api from '@/lib/api-client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogTrigger,
} from '@/components/ui/dialog';
import { GeoMapChart } from '@/components/analytics/geo-map';
import { HeatmapViewer } from '@/components/analytics/heatmap-viewer';

const UserTrackerPage = () => {
    const [summary, setSummary] = useState<any>(null);
    const [activeTab, setActiveTab] = useState('live'); // live | history
    const [timeRange, setTimeRange] = useState('today');
    const [codeOpen, setCodeOpen] = useState(false);

    const formatTime = (seconds: number) => {
        if (!seconds) return '0s';
        const m = Math.floor(seconds / 60);
        const s = Math.round(seconds % 60);
        return `${m}m ${s}s`;
    };

    const getBaseUrl = () => {
        const url = api.defaults.baseURL || '';
        if (url.startsWith('http')) {
            return url.replace('/api', '');
        }
        return window.location.origin;
    };
    const TRACKER_URL = `${getBaseUrl()}/public/tracker.js`;

    // Default fallback data for charts if API is missing content
    const defaultTrafficData = [
        { name: '00:00', visitors: 0 }, { name: '04:00', visitors: 0 },
        { name: '08:00', visitors: 0 }, { name: '12:00', visitors: 0 },
        { name: '16:00', visitors: 0 }, { name: '20:00', visitors: 0 },
    ];
    const defaultDeviceData = [
        { name: 'No Data', value: 100, color: '#e5e7eb' },
    ];

    useEffect(() => {
        fetchAnalytics();
        const interval = setInterval(fetchAnalytics, 120000); // Poll every 2m
        return () => clearInterval(interval);
    }, [timeRange]);

    const fetchAnalytics = async () => {
        try {
            const res = await api.get('/tracking/summary', { params: { range: timeRange } });
            setSummary(res.data);
        } catch (error) {
            console.error("Failed to fetch analytics:", error);
        }
    };

    const KPICard = ({ title, value, change, icon: Icon, time }: any) => (
        <Card>
            <CardContent className="p-6">
                <div className="flex items-center justify-between space-y-0 pb-2">
                    <p className="text-sm font-medium text-muted-foreground">{title}</p>
                    <Icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex items-baseline justify-between">
                    <h2 className="text-3xl font-bold">{value}</h2>
                    {change && (
                        <div className={`flex items-center text-xs font-medium ${change > 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {change > 0 ? <ArrowUpRight className="h-3 w-3 mr-1" /> : <ArrowDownRight className="h-3 w-3 mr-1" />}
                            {Math.abs(change)}%
                        </div>
                    )}
                </div>
                {time && <p className="text-xs text-muted-foreground mt-1">{time}</p>}
            </CardContent>
        </Card>
    );

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
                        <Activity className="h-8 w-8 text-blue-600" />
                        User Tracker
                    </h1>
                    <p className="text-gray-500 mt-1">Real-time visitor behavior analytics and insights.</p>
                </div>

                <div className="flex items-center gap-2 bg-white p-1 rounded-lg border shadow-sm">
                    {['today', 'week', 'month'].map((range) => (
                        <button
                            key={range}
                            onClick={() => setTimeRange(range)}
                            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors capitalize ${timeRange === range
                                ? 'bg-blue-50 text-blue-700 shadow-sm'
                                : 'text-gray-600 hover:bg-gray-50'
                                }`}
                        >
                            {range}
                        </button>
                    ))}
                </div>

                <Dialog open={codeOpen} onOpenChange={setCodeOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <Code className="mr-2 h-4 w-4" /> Get Tracking Code
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                        <DialogHeader>
                            <DialogTitle>Website Tracking Code</DialogTitle>
                            <DialogDescription>
                                Copy and paste this code into the {'<head>'} section of your website to start tracking visitors.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="bg-gray-950 text-gray-100 p-4 rounded-md font-mono text-xs overflow-x-auto relative group mt-4">
                            <pre>{`<script src="${TRACKER_URL}"></script>`}</pre>
                            <Button
                                size="sm"
                                variant="secondary"
                                className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => {
                                    navigator.clipboard.writeText(`<script src="${TRACKER_URL}"></script>`);
                                    alert('Copied to clipboard!');
                                }}
                            >
                                Copy
                            </Button>
                        </div>
                        <div className="space-y-2 mt-4">
                            <h4 className="font-semibold text-sm">How to Identify Users (Optional)</h4>
                            <p className="text-sm text-gray-500">
                                If you want to link tracking data to specific CRM contacts (e.g., after login), call this function:
                            </p>
                            <div className="bg-gray-100 p-3 rounded-md font-mono text-xs text-gray-700">
                                {`// After user logs in or submits a form`}
                                <br />
                                {`if (window.CRMTracker) {`}
                                <br />
                                &nbsp;&nbsp;{`window.CRMTracker.identify(user.email);`}
                                <br />
                                {`}`}
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            {/* KPI Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <KPICard
                    title="Active Users Now"
                    value={summary?.activeSessions || 0}
                    icon={Eye}
                    change={12}
                    time="vs last hour"
                />
                <KPICard
                    title="Total Visitors"
                    value={summary?.totalVisitors || 0}
                    icon={Users}
                    change={5.2}
                    time="vs yesterday"
                />
                <KPICard
                    title="Avg. Session Duration"
                    value={summary ? formatTime(summary.avgDuration) : '0s'}
                    icon={Clock}
                    change={0} // To implement: calculate vs yesterday
                    time="current avg"
                />
                <KPICard
                    title="Bounce Rate"
                    value={summary ? `${summary.bounceRate}%` : '0%'}
                    icon={AlertCircle}
                    change={0} // To implement: calculate vs yesterday
                    time="current avg"
                />
            </div>

            {/* Main Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Traffic Chart */}
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle>Traffic Overview ({summary?.periodLabel || 'Today'})</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={summary?.trafficChart || defaultTrafficData}>
                                    <defs>
                                        <linearGradient id="colorVisitors" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1} />
                                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6b7280' }} dy={10} minTickGap={30} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6b7280' }} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                        itemStyle={{ color: '#111827' }}
                                    />
                                    <Area type="monotone" dataKey="visitors" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorVisitors)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                {/* Device Distribution */}
                <Card>
                    <CardHeader>
                        <CardTitle>Device Breakdown</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[200px] w-full flex items-center justify-center relative">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={summary?.deviceChart?.length > 0 ? summary.deviceChart : defaultDeviceData}
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {(summary?.deviceChart?.length > 0 ? summary.deviceChart : defaultDeviceData).map((entry: any, index: number) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                            {/* Center Text */}
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <div className="text-center">
                                    <span className="text-2xl font-bold text-gray-900">
                                        {summary?.deviceChart?.reduce((acc: number, curr: any) => acc + curr.value, 0) || 0}
                                    </span>
                                    <br />
                                    <span className="text-sm text-gray-500">Devices</span>
                                </div>
                            </div>
                        </div>
                        <div className="mt-6 space-y-3">
                            {(summary?.deviceChart || []).map((item: any) => (
                                <div key={item.name} className="flex items-center justify-between text-sm">
                                    <div className="flex items-center gap-2">
                                        {item.name.toLowerCase() === 'desktop' && <Monitor className="h-4 w-4 text-blue-500" />}
                                        {item.name.toLowerCase() === 'mobile' && <Smartphone className="h-4 w-4 text-emerald-500" />}
                                        {item.name.toLowerCase() === 'tablet' && <Tablet className="h-4 w-4 text-amber-500" />}
                                        <span className="font-medium">{item.name}</span>
                                    </div>
                                    <span className="text-gray-500">
                                        {/* Calculate percentage safe */}
                                        {summary?.deviceChart
                                            ? Math.round((item.value / summary.deviceChart.reduce((a: any, b: any) => a + b.value, 0)) * 100)
                                            : 0
                                        }%
                                    </span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Live Sessions & History Tabs */}
            <Tabs defaultValue="live" value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                <TabsList>
                    <TabsTrigger value="live" className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" /> Live Users
                    </TabsTrigger>
                    <TabsTrigger value="history" className="flex items-center gap-2">
                        <Clock className="h-3 w-3" /> Recent History
                    </TabsTrigger>
                    <TabsTrigger value="geo" className="flex items-center gap-2">
                        <Globe className="h-3 w-3" /> Geo Map
                    </TabsTrigger>
                    <TabsTrigger value="heatmap" className="flex items-center gap-2">
                        <Eye className="h-3 w-3" /> Heatmaps
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="live">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle className="text-base font-medium">Active Sessions</CardTitle>
                            <Badge variant="outline">{summary?.realtime?.length || 0} Online</Badge>
                        </CardHeader>
                        <CardContent>
                            <ScrollArea className="h-[400px]">
                                <table className="w-full text-sm text-left">
                                    <thead className="text-xs text-gray-500 uppercase bg-gray-50 sticky top-0 backdrop-blur-sm z-10">
                                        <tr>
                                            <th className="px-4 py-3 font-medium">Visitor</th>
                                            <th className="px-4 py-3 font-medium">Location</th>
                                            <th className="px-4 py-3 font-medium">Device Info</th>
                                            <th className="px-4 py-3 font-medium">Landing Page</th>
                                            <th className="px-4 py-3 font-medium">Exit Page</th>
                                            <th className="px-4 py-3 font-medium">Source</th>
                                            <th className="px-4 py-3 font-medium text-right">Time On Site</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {summary?.realtime?.map((session: any, i: number) => (
                                            <tr key={session._id || i} className="hover:bg-gray-50/50 transition-colors">
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-3">
                                                        <Avatar className="h-8 w-8 border bg-white">
                                                            <AvatarFallback className="text-[10px] bg-indigo-50 text-indigo-600">
                                                                {session.visitor_id?.visitor_unique_id?.slice(0, 2) || 'V'}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                        <div className="max-w-[120px]">
                                                            <div className="font-medium text-gray-900 truncate" title={session.visitor_id?.visitor_unique_id}>
                                                                {session.visitor_id?.identified_name || 'Guest'}
                                                            </div>
                                                            <div className="text-[10px] text-gray-500 font-mono truncate">
                                                                {session.visitor_id?.ip_address || 'IP Hidden'}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-2 text-gray-600">
                                                        <Globe className="h-3 w-3" />
                                                        {session.visitor_id?.location?.country || 'Unknown'}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex flex-col text-xs text-gray-600">
                                                        <span className="flex items-center gap-1">
                                                            {/* Simple icon logic based on text */}
                                                            {session.device_type?.includes('mobile') ? <Smartphone className="h-3 w-3" /> : <Monitor className="h-3 w-3" />}
                                                            {session.os}
                                                        </span>
                                                        <span className="text-gray-400">{session.browser}</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <a href={session.landing_page} target="_blank" rel="noopener noreferrer" className="font-mono text-xs text-blue-600 hover:underline max-w-[200px] truncate block" title={session.landing_page}>
                                                        {session.landing_page}
                                                    </a>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <a href={session.exit_page || session.landing_page} target="_blank" rel="noopener noreferrer" className="font-mono text-xs text-gray-500 hover:underline max-w-[200px] truncate block" title={session.exit_page || session.landing_page}>
                                                        {session.exit_page || session.landing_page}
                                                    </a>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <Badge variant="secondary" className="font-normal text-xs">
                                                        {session.utm_source || session.referrer_url ? new URL(session.referrer_url || 'http://direct').hostname : 'Direct'}
                                                    </Badge>
                                                </td>
                                                <td className="px-4 py-3 text-right font-mono text-xs text-green-600 font-medium">
                                                    {Math.floor((session.duration || 0) / 60)}m {(session.duration || 0) % 60}s
                                                </td>
                                            </tr>
                                        ))}
                                        {(!summary?.realtime || summary.realtime.length === 0) && (
                                            <tr>
                                                <td colSpan={6} className="px-4 py-8 text-center text-gray-500 italic">
                                                    No active visitors right now.
                                                    <br />
                                                    <span className="text-xs">Try opening your website in incognito mode.</span>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </ScrollArea>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="history">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle className="text-base font-medium">Recent History</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ScrollArea className="h-[400px]">
                                <table className="w-full text-sm text-left">
                                    <thead className="text-xs text-gray-500 uppercase bg-gray-50 sticky top-0 backdrop-blur-sm z-10">
                                        <tr>
                                            <th className="px-4 py-3 font-medium">Session ID</th>
                                            <th className="px-4 py-3 font-medium">Date/Time</th>
                                            <th className="px-4 py-3 font-medium">Duration</th>
                                            <th className="px-4 py-3 font-medium">Page Views</th>
                                            <th className="px-4 py-3 font-medium">Exit Page</th>
                                            <th className="px-4 py-3 font-medium">Source</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {summary?.history?.map((session: any) => (
                                            <tr key={session._id} className="hover:bg-gray-50/50">
                                                <td className="px-4 py-3 font-mono text-xs text-gray-500">
                                                    {session.session_unique_id?.slice(0, 8)}...
                                                </td>
                                                <td className="px-4 py-3 text-gray-600">
                                                    {new Date(session.start_time).toLocaleString()}
                                                </td>
                                                <td className="px-4 py-3 font-mono text-xs">
                                                    {session.duration}s
                                                </td>
                                                <td className="px-4 py-3">
                                                    <Badge variant="outline">{session.page_views || 1} Views</Badge>
                                                </td>
                                                <td className="px-4 py-3 font-mono text-xs text-gray-400 truncate max-w-[150px]">
                                                    {session.exit_page || 'Unknown'}
                                                </td>
                                                <td className="px-4 py-3 text-gray-600 text-xs">
                                                    {session.utm_source || 'Direct'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </ScrollArea>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="geo">
                    <Card>
                        <CardHeader>
                            <CardTitle>Global Visitor Distribution</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <GeoMapChart />
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="heatmap">
                    <Card>
                        <CardHeader>
                            <CardTitle>Click Heatmaps</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <HeatmapViewer />
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
};

export default UserTrackerPage;
