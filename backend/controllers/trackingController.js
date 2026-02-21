const Visitor = require('../models/Visitor');
const VisitSession = require('../models/VisitSession');
const TrackingEvent = require('../models/TrackingEvent');
const { v4: uuidv4 } = require('uuid');
const geoip = require('geoip-lite');

// Helper to parse User Agent (simplified)
const parseUserAgent = (ua) => {
    // In a real APP use 'ua-parser-js'
    const isMobile = /mobile/i.test(ua);
    return {
        device_type: isMobile ? 'mobile' : 'desktop',
        browser: 'Chrome', // Placeholder
        os: 'Windows' // Placeholder
    };
};

// Get country from IP using GeoIP
const getLocationFromIP = (ip) => {
    try {
        const cleanIP = ip.replace(/^::ffff:/, '');
        if (cleanIP === '127.0.0.1' || cleanIP === 'localhost' || cleanIP.startsWith('::1')) {
            return { country: 'Local', city: 'Development', region: 'Internal' };
        }
        const geo = geoip.lookup(cleanIP);
        if (geo) {
            return {
                country: geo.country || 'Unknown',
                city: geo.city || 'Unknown',
                region: geo.region || 'Unknown'
            };
        }
        return { country: 'Unknown', city: 'Unknown', region: 'Unknown' };
    } catch (error) {
        return { country: 'Unknown', city: 'Unknown', region: 'Unknown' };
    }
};

exports.initSession = async (req, res) => {
    try {
        const {
            visitor_unique_id,
            referrer,
            url,
            utm_params = {},
            screen_resolution,
            timezone
        } = req.body;

        const userAgent = req.headers['user-agent'] || '';
        const ip = req.ip || req.connection.remoteAddress;

        // --- PRODUCTION PROTECTION ---
        // Skip tracking for local/internal IPs to prevent dev traffic from polluting DB
        const cleanIP = ip.replace(/^::ffff:/, '');
        const isLocal = cleanIP === '127.0.0.1' || cleanIP === 'localhost' || cleanIP.startsWith('192.168.') || cleanIP.startsWith('10.') || cleanIP.startsWith('::1');

        if (isLocal) {
            console.log('🚫 Skipping tracking for local/internal IP:', cleanIP);
            return res.status(200).json({
                message: 'Tracking skipped for local environment',
                session_id: 'dev_session',
                visitor_unique_id: 'dev_visitor'
            });
        }
        // -----------------------------

        // 1. Find or Create Visitor
        let visitor = await Visitor.findOne({ visitor_unique_id });
        if (!visitor) {
            visitor = new Visitor({
                visitor_unique_id: visitor_unique_id || uuidv4(),
                ip_address: ip,
                first_seen: new Date(),
                // Basic parsing
                ...parseUserAgent(userAgent)
            });
        }

        // Update Visitor stats
        visitor.last_seen = new Date();
        // Only increment visits if it's been more than 30 mins since last seen
        const isNewVisit = !visitor.last_seen || (new Date() - new Date(visitor.last_seen)) > 30 * 60 * 1000;
        if (isNewVisit) {
            visitor.total_visits += 1;
        }

        // Get location from IP using GeoIP
        visitor.location = getLocationFromIP(ip);
        await visitor.save();

        // 2. Find Active Session (Sticky Session Logic - 30 mins window)
        let session = await VisitSession.findOne({
            visitor_id: visitor._id,
            start_time: { $gte: new Date(Date.now() - 30 * 60 * 1000) }
        }).sort({ start_time: -1 });

        if (!session) {
            // Create New Session
            const session_unique_id = uuidv4();
            const uaData = parseUserAgent(userAgent);

            session = new VisitSession({
                visitor_id: visitor._id,
                session_unique_id,
                start_time: new Date(),
                referrer_url: referrer,
                landing_page: url,
                exit_page: url,
                ...utm_params,
                ...uaData,
                screen_resolution
            });
            await session.save();
        } else {
            // Update existing session's exit page
            session.exit_page = url;
            await session.save();
        }

        // 3. Track Page View Event (Always track on init/page load)
        const pageView = new TrackingEvent({
            session_id: session._id,
            visitor_id: visitor._id,
            type: 'pageview',
            url: url,
            event_name: 'Page View'
        });
        await pageView.save();

        res.status(200).json({
            session_id: session._id,
            visitor_unique_id: visitor.visitor_unique_id,
            session_unique_id: session.session_unique_id
        });
    } catch (error) {
        console.error('Tracking Init Error:', error);
        res.status(500).json({ message: 'Tracking initialization failed', error: error.message });
    }
};

exports.trackEvent = async (req, res) => {
    try {
        const { session_id, type, url, data } = req.body;

        if (session_id === 'dev_session') return res.status(200).json({ success: true });

        const session = await VisitSession.findById(session_id);
        if (!session) return res.status(404).json({ message: 'Session not found' });

        const event = new TrackingEvent({
            session_id,
            visitor_id: session.visitor_id,
            type,
            url,
            // Map generic 'data' to specific fields based on type
            ...data
        });

        await event.save();

        // Update session stats
        if (type === 'pageview') {
            await VisitSession.findByIdAndUpdate(session_id, {
                $inc: { page_views: 1 },
                exit_page: url
            });
        } else {
            await VisitSession.findByIdAndUpdate(session_id, {
                $inc: { events_count: 1 },
                exit_page: url
            });
        }

        // Basic Lead Scoring Logic
        let scoreInc = 0;
        if (type === 'pageview' && url.includes('pricing')) scoreInc += 20;
        if (type === 'form_submit') scoreInc += 50;

        if (scoreInc > 0) {
            await Visitor.findByIdAndUpdate(session.visitor_id, { $inc: { lead_score: scoreInc } });
        }

        res.status(200).json({ success: true });
    } catch (error) {
        console.error('Track Event Error:', error);
        res.status(500).json({ message: 'Event tracking failed' });
    }
};

exports.trackPulse = async (req, res) => {
    try {
        const { session_id, duration } = req.body;

        if (session_id === 'dev_session') return res.status(200).json({ success: true });

        // Update session duration
        // logic: pulse sent every 10s. update end_time and duration.
        await VisitSession.findByIdAndUpdate(session_id, {
            end_time: new Date(),
            duration: duration,
            is_bounce: duration > 30 ? false : true // Simple bounce logic
        });
        res.status(200).json({ success: true });
    } catch (error) {
        res.status(500).json({ message: 'Pulse failed' });
    }
};

// Identify Visitor (Link to Email/Contact)
exports.identifyVisitor = async (req, res) => {
    try {
        const { session_id, email, name } = req.body;

        const session = await VisitSession.findById(session_id);
        if (!session) return res.status(404).json({ message: 'Session not found' });

        // Update Visitor with Email/Name
        const visitor = await Visitor.findById(session.visitor_id);
        if (visitor) {
            visitor.identified_email = email; // Ensure schema has this
            visitor.identified_name = name;
            // In a real CRM, you would search for a Contact by email and link the ObjectId here
            // visitor.contact_id = foundContact._id
            await visitor.save();
        }

        res.status(200).json({ success: true });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get Contact Web Activity (For CRM Contact Profile)
exports.getContactWebActivity = async (req, res) => {
    try {
        const { email } = req.query;

        if (!email) return res.status(400).json({ message: 'Email required' });

        const visitorDocs = await Visitor.find({ identified_email: email });
        const visitorIds = visitorDocs.map(v => v._id);

        if (visitorIds.length === 0) return res.status(200).json({ stats: null, events: [] });

        // 1. Calculate Stats
        const firstVisit = visitorDocs.reduce((min, v) => v.first_seen < min ? v.first_seen : min, new Date());
        const lastVisit = visitorDocs.reduce((max, v) => v.last_seen > max ? v.last_seen : max, new Date(0));
        const totalSessions = visitorDocs.reduce((sum, v) => sum + v.total_visits, 0);

        // 2. Fetch Sessions for Device & Source Aggregation
        const sessions = await VisitSession.find({ visitor_id: { $in: visitorIds } });

        // Lead Source (First ever session referrer)
        const firstSession = await VisitSession.findOne({ visitor_id: { $in: visitorIds } }).sort({ start_time: 1 });
        let leadSource = 'Direct';
        if (firstSession) {
            if (firstSession.utm_source) {
                leadSource = firstSession.utm_source;
            } else if (firstSession.referrer_url) {
                try {
                    leadSource = new URL(firstSession.referrer_url).hostname;
                } catch (e) {
                    leadSource = 'Direct';
                }
            }
        }

        // Device Used (Most frequent)
        const devices = sessions.reduce((acc, s) => {
            const type = s.device_type || 'unknown';
            acc[type] = (acc[type] || 0) + 1;
            return acc;
        }, {});
        const topDevice = Object.keys(devices).sort((a, b) => devices[b] - devices[a])[0] || 'Unknown';

        const stats = {
            lead_source: leadSource,
            first_visit: firstVisit,
            last_visit: lastVisit,
            total_sessions: totalSessions,
            device_type: topDevice,
            location: 'Unknown'
        };

        // 3. Fetch Timeline Events
        const events = await TrackingEvent.find({ visitor_id: { $in: visitorIds } })
            .sort({ timestamp: -1 })
            .limit(50)
            .populate('session_id', 'device_type os browser city country');

        res.status(200).json({ stats, events });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get Visitor Sessions (For detailed session history)
exports.getVisitorSessions = async (req, res) => {
    try {
        const { email } = req.query;

        if (!email) return res.status(400).json({ message: 'Email required' });

        const visitorDocs = await Visitor.find({ identified_email: email });
        const visitorIds = visitorDocs.map(v => v._id);

        if (visitorIds.length === 0) return res.status(200).json({ stats: null, sessions: [] });

        // Calculate Stats (same as getContactWebActivity)
        const firstVisit = visitorDocs.reduce((min, v) => v.first_seen < min ? v.first_seen : min, new Date());
        const lastVisit = visitorDocs.reduce((max, v) => v.last_seen > max ? v.last_seen : max, new Date(0));
        const totalSessions = visitorDocs.reduce((sum, v) => sum + v.total_visits, 0);

        // Get location from latest visitor
        const latestVisitor = visitorDocs.sort((a, b) => b.last_seen - a.last_seen)[0];
        const location = latestVisitor.location?.country || 'Unknown';

        // Fetch all sessions with full details
        const sessions = await VisitSession.find({ visitor_id: { $in: visitorIds } })
            .sort({ start_time: -1 })
            .limit(50);

        // Lead Source (First ever session referrer)
        const firstSession = await VisitSession.findOne({ visitor_id: { $in: visitorIds } }).sort({ start_time: 1 });
        let leadSource = 'Direct';
        if (firstSession) {
            if (firstSession.utm_source) {
                leadSource = firstSession.utm_source;
            } else if (firstSession.referrer_url) {
                try {
                    leadSource = new URL(firstSession.referrer_url).hostname;
                } catch (e) {
                    leadSource = 'Direct';
                }
            }
        }

        // Device Used (Most frequent)
        const devices = sessions.reduce((acc, s) => {
            const type = s.device_type || 'unknown';
            acc[type] = (acc[type] || 0) + 1;
            return acc;
        }, {});
        const topDevice = Object.keys(devices).sort((a, b) => devices[b] - devices[a])[0] || 'Unknown';

        const stats = {
            lead_source: leadSource,
            first_visit: firstVisit,
            last_visit: lastVisit,
            total_sessions: totalSessions,
            device_type: topDevice,
            location: location
        };

        res.status(200).json({ stats, sessions });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Admin Analytics API
exports.getAnalyticsSummary = async (req, res) => {
    try {
        const { range = 'today' } = req.query;

        let startDate = new Date();
        // Set start date based on range
        if (range === 'today') {
            startDate.setHours(0, 0, 0, 0); // Since midnight
        } else if (range === 'week') {
            startDate.setDate(startDate.getDate() - 7);
        } else if (range === 'month') {
            startDate.setDate(startDate.getDate() - 30);
        } else {
            startDate.setHours(0, 0, 0, 0);
        }

        // 1. Total Visitors (Active in this period)
        const totalVisitors = await Visitor.countDocuments({ last_seen: { $gte: startDate } });

        // 2. Active Sessions (Realtime - Last 5 mins)
        const fiveMinsAgo = new Date(Date.now() - 5 * 60 * 1000);
        const activeSessionsDocs = await VisitSession.find({
            $or: [
                { end_time: { $gte: fiveMinsAgo } },
                { start_time: { $gte: fiveMinsAgo } }
            ]
        })
            .populate('visitor_id', 'location ip_address identified_name identified_email')
            .sort({ updatedAt: -1 })
            .lean();

        // 3. Recent History (Last 50 sessions)
        const recentHistory = await VisitSession.find({ end_time: { $lt: fiveMinsAgo } })
            .populate('visitor_id', 'location ip_address identified_name identified_email')
            .sort({ end_time: -1 })
            .limit(50)
            .lean();

        // 4. Total Page Views (In this period)
        const totalPageViews = await TrackingEvent.countDocuments({
            type: 'pageview',
            timestamp: { $gte: startDate }
        });

        // 5. KPIs (Avg Duration & Bounce Rate - In this period)
        const periodSessions = await VisitSession.find({ start_time: { $gte: startDate } })
            .select('duration page_views device_type');

        const avgDurationSeconds = periodSessions.length > 0
            ? periodSessions.reduce((acc, curr) => acc + (curr.duration || 0), 0) / periodSessions.length
            : 0;

        const bouncedSessionsCount = periodSessions.filter(s => s.page_views === 1).length;
        const bounceRate = periodSessions.length > 0
            ? Math.round((bouncedSessionsCount / periodSessions.length) * 100)
            : 0;

        // 6. Device Breakdown (In this period)
        const deviceCounts = periodSessions.reduce((acc, session) => {
            const type = session.device_type || 'unknown';
            acc[type] = (acc[type] || 0) + 1;
            return acc;
        }, {});

        const deviceChart = Object.keys(deviceCounts).map(type => ({
            name: type.charAt(0).toUpperCase() + type.slice(1),
            value: deviceCounts[type],
            color: type === 'mobile' ? '#10b981' : type === 'desktop' ? '#3b82f6' : '#f59e0b'
        }));

        // 7. Traffic Overview Chart
        let trafficChart = [];

        if (range === 'today') {
            // Group by Hour (00:00 - 23:00)
            const trafficStats = await VisitSession.aggregate([
                { $match: { start_time: { $gte: startDate } } },
                {
                    $group: {
                        _id: { $hour: "$start_time" },
                        visitors: { $sum: 1 }
                    }
                },
                { $sort: { "_id": 1 } }
            ]);

            trafficChart = Array.from({ length: 24 }, (_, i) => {
                const hourData = trafficStats.find(s => s._id === i);
                return {
                    name: `${i.toString().padStart(2, '0')}:00`,
                    visitors: hourData ? hourData.visitors : 0
                };
            });
        } else {
            // Group by Day (Format: MM-DD)
            const trafficStats = await VisitSession.aggregate([
                { $match: { start_time: { $gte: startDate } } },
                {
                    $group: {
                        _id: { $dateToString: { format: "%m-%d", date: "$start_time" } },
                        visitors: { $sum: 1 }
                    }
                },
                { $sort: { "_id": 1 } }
            ]);

            // Fill missing days
            const days = range === 'week' ? 7 : 30;
            const filledChart = [];
            for (let i = 0; i < days; i++) {
                const d = new Date();
                d.setDate(d.getDate() - (days - 1 - i));
                const dateStr = d.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' }).replace('/', '-');

                const dayData = trafficStats.find(s => s._id === dateStr);
                filledChart.push({
                    name: dateStr,
                    visitors: dayData ? dayData.visitors : 0
                });
            }
            trafficChart = filledChart;
        }

        res.status(200).json({
            totalVisitors,
            activeSessions: activeSessionsDocs.length,
            totalPageViews,
            avgDuration: avgDurationSeconds,
            bounceRate,
            periodLabel: range === 'today' ? "Today" : range === 'week' ? "Last 7 Days" : "Last 30 Days",
            realtime: activeSessionsDocs,
            history: recentHistory,
            deviceChart,
            trafficChart
        });
    } catch (error) {
        console.error('Analytics Error:', error);
        res.status(500).json({ message: error.message });
    }
};

// Heatmap Data (Clicks)
exports.getHeatmapData = async (req, res) => {
    try {
        const { url } = req.query;

        // Aggregate top pages first if no URL
        if (!url) {
            const pages = await VisitSession.aggregate([
                { $group: { _id: "$landing_page", count: { $sum: 1 } } },
                { $sort: { count: -1 } },
                { $limit: 10 }
            ]);
            return res.status(200).json({ pages });
        }

        // Fetch click events for this URL
        const clicks = await TrackingEvent.find({
            type: 'click',
            url: { $regex: url, $options: 'i' },
            x: { $exists: true },
            y: { $exists: true }
        }).select('x y viewport_width viewport_height selector element_text').limit(2000);

        res.status(200).json({ clicks });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Geo Stats (Visitors by Country)
exports.getGeoStats = async (req, res) => {
    try {
        console.log('Getting geo stats...');

        const stats = await Visitor.aggregate([
            {
                $group: {
                    _id: "$location.country",
                    visitors: { $sum: 1 }
                }
            },
            { $sort: { visitors: -1 } }
        ]);

        console.log('Geo stats raw:', stats);

        // Filter out Unknown and format
        const formatted = stats
            .filter(s => s._id && s._id !== 'Unknown')
            .map(s => ({
                id: s._id,
                value: s.visitors
            }));

        console.log('Geo stats formatted:', formatted);

        res.status(200).json(formatted);
    } catch (error) {
        console.error('Geo stats error:', error);
        res.status(500).json({ message: error.message });
    }
};
