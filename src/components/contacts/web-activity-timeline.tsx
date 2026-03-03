import { useEffect, useState } from "react";
import api from "@/lib/api-client";
import { format } from "date-fns";
import {
    Activity,
    MousePointer,
    FileText,
    Layout,
    Monitor,
    Smartphone,
    Tablet,
    Calendar,
    BarChart3,
    Globe
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface TimelineEvent {
    _id: string;
    type: string;
    url: string;
    event_name?: string;
    timestamp: string;
    session_id: {
        device_type?: string;
        os?: string;
        browser?: string;
        city?: string;
        country?: string;
    };
    element_text?: string;
}

interface ContactStats {
    lead_source: string;
    first_visit: string;
    last_visit: string;
    total_sessions: number;
    device_type: string;
    location: string;
}

export const ContactWebActivityTimeline = ({ email }: { email: string }) => {
    const [events, setEvents] = useState<TimelineEvent[]>([]);
    const [stats, setStats] = useState<ContactStats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (email) {
            fetchTimeline();
        }
    }, [email]);

    const fetchTimeline = async () => {
        try {
            const res = await api.get(`/tracking/timeline?email=${email}`);
            setStats(res.data.stats);
            setEvents(res.data.events || []);
            setLoading(false);
        } catch (error) {
            console.error(error);
            setLoading(false);
        }
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'pageview': return <Layout className="h-4 w-4" />;
            case 'click': return <MousePointer className="h-4 w-4" />;
            case 'form_submit': return <FileText className="h-4 w-4" />;
            default: return <Activity className="h-4 w-4" />;
        }
    };

    const getDeviceIcon = (device?: string) => {
        switch (device?.toLowerCase()) {
            case 'mobile': return <Smartphone className="h-3 w-3" />;
            case 'tablet': return <Tablet className="h-3 w-3" />;
            default: return <Monitor className="h-3 w-3" />;
        }
    };

    if (loading) return <div className="text-sm text-gray-500">Loading activity...</div>;
    if (!stats && events.length === 0) return <div className="text-sm text-gray-500 italic">No web activity recorded for this contact.</div>;

    return (
        <div className="space-y-6">
            {/* Contact Overview Stats */}
            {stats && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-medium flex items-center gap-2">
                                <Globe className="h-4 w-4 text-blue-600" />
                                Lead Source
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-2xl font-bold">{stats.lead_source}</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-medium flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-green-600" />
                                First Visit
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-lg font-semibold">{format(new Date(stats.first_visit), "MMM d, yyyy")}</p>
                            <p className="text-xs text-gray-500 mt-1">Last: {format(new Date(stats.last_visit), "MMM d, yyyy")}</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-medium flex items-center gap-2">
                                <BarChart3 className="h-4 w-4 text-purple-600" />
                                Total Sessions
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-2xl font-bold">{stats.total_sessions}</p>
                            <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                                {getDeviceIcon(stats.device_type)}
                                {stats.device_type}
                            </p>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Activity Timeline */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Activity className="h-5 w-5" />
                        Activity Timeline
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {events.length === 0 ? (
                        <p className="text-sm text-gray-500 italic">No events recorded yet.</p>
                    ) : (
                        <div className="relative border-l border-gray-200 dark:border-gray-700 space-y-6 ml-3">
                            {events.map((event) => (
                                <div key={event._id} className="mb-4 ml-6 relative">
                                    <span className="absolute -left-[35px] flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-blue-600 ring-4 ring-white dark:ring-gray-900 dark:bg-blue-900 dark:text-blue-300">
                                        {getIcon(event.type)}
                                    </span>
                                    <div className="flex flex-col gap-1">
                                        <div className="flex items-center gap-2 text-sm">
                                            <span className="font-semibold text-gray-900 dark:text-white capitalize">
                                                {event.event_name || event.type.replace('_', ' ')}
                                            </span>
                                            <span className="text-gray-500 text-xs">
                                                {format(new Date(event.timestamp), "MMM d, h:mm a")}
                                            </span>
                                        </div>

                                        {/* URL / Context */}
                                        <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded border border-gray-100 w-fit max-w-full truncate font-mono text-xs">
                                            {event.url}
                                        </div>

                                        {/* Metadata */}
                                        {(event.element_text || event.session_id) && (
                                            <div className="flex gap-3 mt-1">
                                                {event.element_text && (
                                                    <span className="text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-600">
                                                        Clicked: "{event.element_text}"
                                                    </span>
                                                )}
                                                {event.session_id && (
                                                    <div className="flex items-center gap-1 text-xs text-gray-400">
                                                        {getDeviceIcon(event.session_id.device_type)}
                                                        {event.session_id.city && <span>{event.session_id.city}, {event.session_id.country}</span>}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};
