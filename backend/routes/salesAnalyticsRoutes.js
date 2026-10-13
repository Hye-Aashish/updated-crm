const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { protect, authorize, checkPermission } = require('../middleware/authMiddleware');

const Lead = require('../models/Lead');
const User = require('../models/User');
const SalesCallLog = require('../models/SalesCallLog');
const SalesMeeting = require('../models/SalesMeeting');
const SalesTarget = require('../models/SalesTarget');
const SalesActivityAudit = require('../models/SalesActivityAudit');
const Setting = require('../models/Setting');

const {
    resolveDateRange,
    formatDuration,
    resolveAuthorizedAgents,
    calculateOverviewKPIs
} = require('../services/salesAnalyticsService');

// ── GET /overview — Complete Dashboard KPIs for custom date ranges ──────────
router.get('/overview', protect, async (req, res) => {
    try {
        const { startDate, endDate, timezone, agentIds, agentId, leadSource, pipelineStage } = req.query;
        const requestedAgent = agentIds || agentId;
        const { start, end } = resolveDateRange(startDate, endDate, timezone);
        const authResolution = await resolveAuthorizedAgents(req.user, requestedAgent);

        const overviewData = await calculateOverviewKPIs({
            start,
            end,
            agentIds: authResolution.agentIds,
            agentNames: authResolution.agentNames,
            leadSource,
            pipelineStage
        });

        res.json({
            ...overviewData,
            isPersonalView: !authResolution.canViewAll,
            timezone: timezone || 'Asia/Kolkata'
        });
    } catch (err) {
        console.error('Sales Analytics Overview Error:', err);
        res.status(500).json({ message: err.message });
    }
});

// ── GET /calls — Calling report with search, pagination & filters ───────────
router.get('/calls', protect, async (req, res) => {
    try {
        const {
            startDate,
            endDate,
            agentId,
            leadId,
            outcome,
            direction,
            verificationStatus,
            search,
            page = 1,
            limit = 50
        } = req.query;

        const { start, end } = resolveDateRange(startDate, endDate);
        const authResolution = await resolveAuthorizedAgents(req.user, agentId);

        const filter = {
            callStartedAt: { $gte: start, $lte: end }
        };

        if (authResolution.agentIds && authResolution.agentIds.length > 0) {
            filter.agentId = { $in: authResolution.agentIds };
        }
        if (leadId && mongoose.Types.ObjectId.isValid(leadId)) {
            filter.leadId = new mongoose.Types.ObjectId(leadId);
        }
        if (outcome && outcome !== 'all') {
            filter.outcome = outcome;
        }
        if (direction && direction !== 'all') {
            filter.direction = direction;
        }
        if (verificationStatus && verificationStatus !== 'all') {
            filter.verificationStatus = verificationStatus;
        }
        if (search) {
            const regex = new RegExp(search.trim(), 'i');
            filter.$or = [
                { leadName: regex },
                { company: regex },
                { phone: regex },
                { agentName: regex },
                { notes: regex }
            ];
        }

        const skip = (Math.max(1, parseInt(page)) - 1) * Math.max(1, parseInt(limit));
        const [calls, totalCount] = await Promise.all([
            SalesCallLog.find(filter)
                .sort({ callStartedAt: -1 })
                .skip(skip)
                .limit(Math.max(1, parseInt(limit)))
                .lean(),
            SalesCallLog.countDocuments(filter)
        ]);

        const formattedCalls = calls.map(c => ({
            ...c,
            durationFormatted: formatDuration(c.durationSeconds)
        }));

        res.json({
            calls: formattedCalls,
            pagination: {
                totalCount,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(totalCount / parseInt(limit))
            }
        });
    } catch (err) {
        console.error('Calls Report Error:', err);
        res.status(500).json({ message: err.message });
    }
});

// ── POST /calls — Log a manual call with idempotency & audit ────────────────
router.post('/calls', protect, async (req, res) => {
    try {
        const {
            leadId,
            direction = 'outbound',
            callStartedAt,
            callEndedAt,
            durationSeconds = 0,
            outcome = 'connected',
            notes = '',
            followUpRequired = false,
            nextFollowUpAt,
            meetingBooked = false,
            meetingTitle,
            meetingScheduledAt,
            idempotencyKey
        } = req.body;

        if (!leadId || !mongoose.Types.ObjectId.isValid(leadId)) {
            return res.status(400).json({ message: 'Valid leadId is required.' });
        }

        // Check idempotency if provided
        if (idempotencyKey) {
            const existing = await SalesCallLog.findOne({ idempotencyKey });
            if (existing) {
                return res.status(200).json(existing);
            }
        }

        const lead = await Lead.findById(leadId);
        if (!lead) {
            return res.status(404).json({ message: 'Lead not found.' });
        }

        const agentId = req.user._id;
        const agentName = req.user.name || 'Sales Agent';
        const callTime = callStartedAt ? new Date(callStartedAt) : new Date();

        const newCallLog = new SalesCallLog({
            leadId,
            leadName: lead.name,
            company: lead.company,
            phone: lead.phone,
            agentId,
            agentName,
            direction,
            callStartedAt: callTime,
            callEndedAt: callEndedAt ? new Date(callEndedAt) : undefined,
            durationSeconds: Math.max(0, parseInt(durationSeconds) || 0),
            outcome,
            notes: notes.trim(),
            meetingBooked,
            followUpRequired,
            nextFollowUpAt: nextFollowUpAt ? new Date(nextFollowUpAt) : undefined,
            source: 'manual',
            verificationStatus: 'agent_reported',
            idempotencyKey,
            createdBy: agentId
        });

        // If meeting booked, automatically link a SalesMeeting
        if (meetingBooked && meetingScheduledAt) {
            const meeting = new SalesMeeting({
                leadId,
                leadName: lead.name,
                company: lead.company,
                phone: lead.phone,
                ownerId: agentId,
                ownerName: agentName,
                createdBy: agentId,
                title: meetingTitle || `Sales Discovery - ${lead.name}`,
                scheduledAt: new Date(meetingScheduledAt),
                status: 'scheduled',
                sourceCallId: newCallLog._id
            });
            await meeting.save();
            newCallLog.meetingId = meeting._id;
        }

        const savedCall = await newCallLog.save();

        // Sync with Lead model activity & last contacted info
        if (!lead.activities) lead.activities = [];
        lead.activities.push({
            content: notes || `Call Logged: ${outcome}`,
            type: 'call',
            outcome,
            duration: savedCall.durationSeconds,
            nextFollowUpDate: nextFollowUpAt ? new Date(nextFollowUpAt) : null,
            createdByName: agentName,
            createdAt: callTime
        });

        lead.lastContactedBy = agentName;
        lead.lastContactedById = agentId.toString();
        lead.lastFollowUpDate = callTime;
        lead.lastFollowUpOutcome = outcome;
        if (!lead.firstCallAttemptAt) lead.firstCallAttemptAt = callTime;
        if (['connected', 'interested', 'meeting_booked'].includes(outcome) && !lead.firstContactedAt) {
            lead.firstContactedAt = callTime;
        }

        if (nextFollowUpAt) {
            lead.reminder = {
                date: new Date(nextFollowUpAt),
                tone: 'default',
                completed: false,
                sentReminders: []
            };
        }

        await lead.save();

        // Audit Trail
        try {
            await SalesActivityAudit.create({
                eventType: 'call_logged',
                actorId: agentId,
                actorName,
                actorRole: req.user.role,
                leadId,
                leadName: lead.name,
                entityType: 'SalesCallLog',
                entityId: savedCall._id,
                metadata: { outcome, durationSeconds: savedCall.durationSeconds }
            });
        } catch (aErr) {}

        res.status(201).json(savedCall);
    } catch (err) {
        console.error('Log Call Error:', err);
        res.status(400).json({ message: err.message });
    }
});

// ── GET /calendar — Scheduled meetings & follow-ups ─────────────────────────
router.get('/calendar', protect, async (req, res) => {
    try {
        const { startDate, endDate, agentId, type = 'all' } = req.query;
        const { start, end } = resolveDateRange(startDate, endDate);
        const authResolution = await resolveAuthorizedAgents(req.user, agentId);

        const meetingFilter = {
            scheduledAt: { $gte: start, $lte: end }
        };
        if (authResolution.agentIds && authResolution.agentIds.length > 0) {
            meetingFilter.ownerId = { $in: authResolution.agentIds };
        }

        const leadReminderFilter = {
            'reminder.date': { $gte: start, $lte: end }
        };
        if (authResolution.agentIds && authResolution.agentIds.length > 0) {
            const agentIdStrings = authResolution.agentIds.map(id => id.toString());
            leadReminderFilter.$or = [
                { assignedTo: { $in: agentIdStrings } },
                { createdBy: { $in: authResolution.agentIds } }
            ];
        }

        const [meetings, leadsWithReminders] = await Promise.all([
            (type === 'all' || type === 'meeting') ? SalesMeeting.find(meetingFilter).sort({ scheduledAt: 1 }).lean() : [],
            (type === 'all' || type === 'followup') ? Lead.find(leadReminderFilter).select('name company phone reminder assignedTo assignedToName stage').lean() : []
        ]);

        const followups = leadsWithReminders.map(l => ({
            id: `fu-${l._id}`,
            leadId: l._id,
            title: `Follow-up with ${l.name} (${l.company || 'Direct'})`,
            scheduledAt: l.reminder.date,
            type: 'followup',
            status: l.reminder.completed ? 'completed' : (new Date(l.reminder.date) < new Date() ? 'overdue' : 'pending'),
            assignedToName: l.assignedToName || 'Unassigned',
            phone: l.phone,
            stage: l.stage
        }));

        const calendarItems = [
            ...meetings.map(m => ({
                id: `meet-${m._id}`,
                meetingId: m._id,
                leadId: m.leadId,
                title: m.title || `Demo with ${m.leadName}`,
                scheduledAt: m.scheduledAt,
                endedAt: m.endedAt,
                type: 'meeting',
                status: m.status,
                ownerName: m.ownerName,
                phone: m.phone,
                notes: m.notes
            })),
            ...followups
        ].sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());

        res.json({
            range: { start, end },
            items: calendarItems,
            totalCount: calendarItems.length
        });
    } catch (err) {
        console.error('Calendar Fetch Error:', err);
        res.status(500).json({ message: err.message });
    }
});

// ── POST /meetings — Schedule or update a meeting ───────────────────────────
router.post('/meetings', protect, async (req, res) => {
    try {
        const { leadId, title, scheduledAt, durationMinutes = 30, meetingType = 'online_demo', notes = '' } = req.body;
        if (!leadId || !scheduledAt) {
            return res.status(400).json({ message: 'leadId and scheduledAt are required.' });
        }

        const lead = await Lead.findById(leadId);
        if (!lead) return res.status(404).json({ message: 'Lead not found.' });

        const meeting = new SalesMeeting({
            leadId,
            leadName: lead.name,
            company: lead.company,
            phone: lead.phone,
            ownerId: req.user._id,
            ownerName: req.user.name,
            createdBy: req.user._id,
            title: title || `Meeting: ${lead.name}`,
            scheduledAt: new Date(scheduledAt),
            durationMinutes: parseInt(durationMinutes) || 30,
            meetingType,
            status: 'scheduled',
            notes
        });

        const savedMeeting = await meeting.save();

        // Audit Trail
        try {
            await SalesActivityAudit.create({
                eventType: 'meeting_scheduled',
                actorId: req.user._id,
                actorName: req.user.name,
                actorRole: req.user.role,
                leadId,
                leadName: lead.name,
                entityType: 'SalesMeeting',
                entityId: savedMeeting._id,
                metadata: { scheduledAt: savedMeeting.scheduledAt }
            });
        } catch (aErr) {}

        res.status(201).json(savedMeeting);
    } catch (err) {
        console.error('Meeting Create Error:', err);
        res.status(400).json({ message: err.message });
    }
});

// ── PUT /meetings/:id — Status changes (completed, rescheduled, no_show) ────
router.put('/meetings/:id', protect, async (req, res) => {
    try {
        const { status, outcome, notes, newScheduledAt, rescheduleReason } = req.body;
        const meeting = await SalesMeeting.findById(req.params.id);
        if (!meeting) return res.status(404).json({ message: 'Meeting not found.' });

        if (status) meeting.status = status;
        if (outcome) meeting.outcome = outcome;
        if (notes) meeting.notes = notes;

        if (status === 'rescheduled' && newScheduledAt) {
            meeting.rescheduleHistory.push({
                previousDate: meeting.scheduledAt,
                reason: rescheduleReason || 'Rescheduled by agent',
                rescheduledBy: req.user.name,
                rescheduledAt: new Date()
            });
            meeting.scheduledAt = new Date(newScheduledAt);
        }

        meeting.updatedAt = new Date();
        const updated = await meeting.save();

        res.json(updated);
    } catch (err) {
        console.error('Meeting Update Error:', err);
        res.status(400).json({ message: err.message });
    }
});

// ── GET /targets & POST /targets — Target management ────────────────────────
router.get('/targets', protect, async (req, res) => {
    try {
        const { agentId } = req.query;
        const authResolution = await resolveAuthorizedAgents(req.user, agentId);
        
        const filter = {};
        if (authResolution.agentIds && authResolution.agentIds.length > 0) {
            filter.agentId = { $in: authResolution.agentIds };
        }

        const targets = await SalesTarget.find(filter).sort({ periodEnd: -1 }).lean();
        res.json(targets);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.post('/targets', protect, authorize('admin', 'owner'), async (req, res) => {
    try {
        const { agentId, metric, targetValue, periodType = 'monthly', periodStart, periodEnd, notes } = req.body;
        if (!agentId || !metric || targetValue === undefined) {
            return res.status(400).json({ message: 'agentId, metric, and targetValue are required.' });
        }

        const targetUser = await User.findById(agentId);
        if (!targetUser) return res.status(404).json({ message: 'Target user not found.' });

        const newTarget = new SalesTarget({
            agentId,
            agentName: targetUser.name,
            metric,
            targetValue: Number(targetValue),
            periodType,
            periodStart: periodStart ? new Date(periodStart) : new Date(),
            periodEnd: periodEnd ? new Date(periodEnd) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            notes,
            createdBy: req.user._id
        });

        const saved = await newTarget.save();
        res.status(201).json(saved);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// ── GET /funnel — Conversion Funnel Cohorts ─────────────────────────────────
router.get('/funnel', protect, async (req, res) => {
    try {
        const { startDate, endDate, agentId } = req.query;
        const { start, end } = resolveDateRange(startDate, endDate);
        const authResolution = await resolveAuthorizedAgents(req.user, agentId);

        const leadFilter = {
            createdAt: { $gte: start, $lte: end }
        };
        if (authResolution.agentIds && authResolution.agentIds.length > 0) {
            const agentIdStrings = authResolution.agentIds.map(id => id.toString());
            leadFilter.$or = [
                { assignedTo: { $in: agentIdStrings } },
                { createdBy: { $in: authResolution.agentIds } }
            ];
        }

        const leadsInCohort = await Lead.find(leadFilter).select('stage value createdAt firstContactedAt qualifiedAt closedAt').lean();
        const total = leadsInCohort.length;

        let contacted = 0;
        let qualified = 0;
        let meetingStage = 0;
        let closedWon = 0;
        let totalRevenue = 0;

        leadsInCohort.forEach(l => {
            const st = (l.stage || 'new').toLowerCase();
            if (st !== 'new' && st !== 'new-lead') contacted++;
            if (st.includes('qualif') || st.includes('meet') || st.includes('close') || st.includes('won')) qualified++;
            if (st.includes('meet') || st.includes('close') || st.includes('won')) meetingStage++;
            if (st === 'closed' || st === 'won' || st.includes('closed') || st.includes('won')) {
                closedWon++;
                totalRevenue += (l.value || 0);
            }
        });

        const funnelSteps = [
            { stage: 'Total Inflow', count: total, percentage: 100 },
            { stage: 'Contacted', count: contacted, percentage: total > 0 ? Math.round((contacted / total) * 100) : 0 },
            { stage: 'Qualified', count: qualified, percentage: total > 0 ? Math.round((qualified / total) * 100) : 0 },
            { stage: 'Meeting & Pitch', count: meetingStage, percentage: total > 0 ? Math.round((meetingStage / total) * 100) : 0 },
            { stage: 'Deals Won', count: closedWon, percentage: total > 0 ? Math.round((closedWon / total) * 100) : 0 }
        ];

        res.json({
            period: { start, end },
            funnelSteps,
            dealsWon: closedWon,
            totalRevenue,
            overallConversionRate: total > 0 ? Math.round((closedWon / total) * 100) : 0
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// ── GET /export — Server-side CSV Export ─────────────────────────────────────
router.get('/export', protect, async (req, res) => {
    try {
        const { startDate, endDate, agentId, type = 'calls' } = req.query;
        const { start, end } = resolveDateRange(startDate, endDate);
        const authResolution = await resolveAuthorizedAgents(req.user, agentId);

        const filter = { callStartedAt: { $gte: start, $lte: end } };
        if (authResolution.agentIds && authResolution.agentIds.length > 0) {
            filter.agentId = { $in: authResolution.agentIds };
        }

        const calls = await SalesCallLog.find(filter).sort({ callStartedAt: -1 }).limit(1000).lean();

        let csv = 'Call Date,Time,Agent,Lead Name,Company,Phone,Duration Seconds,Outcome,Verification,Notes\n';
        calls.forEach(c => {
            const dateStr = new Date(c.callStartedAt).toISOString().split('T')[0];
            const timeStr = new Date(c.callStartedAt).toLocaleTimeString();
            const noteSafe = (c.notes || '').replace(/"/g, '""');
            csv += `"${dateStr}","${timeStr}","${c.agentName || ''}","${c.leadName || ''}","${c.company || ''}","${c.phone || ''}",${c.durationSeconds || 0},"${c.outcome || ''}","${c.verificationStatus || ''}","${noteSafe}"\n`;
        });

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=sales_calling_report_${new Date().toISOString().slice(0, 10)}.csv`);
        res.send(csv);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
