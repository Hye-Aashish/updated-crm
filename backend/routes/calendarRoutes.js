const express = require('express');
const router = express.Router();
const CalendarEvent = require('../models/CalendarEvent');
const SalesMeeting = require('../models/SalesMeeting');
const Lead = require('../models/Lead');
const Notification = require('../models/Notification');
const Client = require('../models/Client');
const User = require('../models/User');
const { protect } = require('../middleware/authMiddleware');

function userId(req) {
    return req.user._id.toString();
}

function isAdmin(req) {
    return ['owner', 'admin'].includes(req.user.role);
}

function getTargetUserId(req) {
    if (isAdmin(req)) {
        if (req.query.userId && req.query.userId !== 'all' && req.query.userId !== 'me') {
            return req.query.userId;
        }
        if (req.query.scope === 'me' || req.query.userId === 'me') {
            return userId(req);
        }
        // When scope === 'all' or default for admin:
        return null; // All team
    }
    // Regular employee only sees own events
    return userId(req);
}

// ── GET / - List calendar events & follow-ups in date range ──────────────────
router.get('/', protect, async (req, res) => {
    try {
        const { start, end, category = 'all' } = req.query;
        const targetUserId = getTargetUserId(req);
        const startDate = start ? new Date(start) : null;
        const endDate = end ? new Date(end) : null;

        const results = [];

        // 1. Fetch Meetings (CalendarEvent + SalesMeeting)
        if (category === 'all' || category === 'meeting' || category === 'meetings') {
            // A. CalendarEvent
            const ceFilter = { status: { $ne: 'cancelled' } };
            if (startDate || endDate) {
                ceFilter.startAt = {};
                if (startDate) ceFilter.startAt.$gte = startDate;
                if (endDate) ceFilter.startAt.$lte = endDate;
            }
            if (targetUserId) {
                ceFilter.$or = [
                    { ownerId: targetUserId },
                    { attendeeIds: targetUserId },
                    { createdBy: targetUserId }
                ];
            }
            const calEvents = await CalendarEvent.find(ceFilter).sort({ startAt: 1 }).limit(500).lean();
            calEvents.forEach(e => {
                results.push({
                    ...e,
                    id: e._id.toString(),
                    category: 'meeting',
                    isMeeting: true,
                    isFollowUp: false,
                    color: e.color || '#3A6FF8'
                });
            });

            // B. SalesMeeting
            try {
                const smFilter = { status: { $ne: 'cancelled' } };
                if (startDate || endDate) {
                    smFilter.scheduledAt = {};
                    if (startDate) smFilter.scheduledAt.$gte = startDate;
                    if (endDate) smFilter.scheduledAt.$lte = endDate;
                }
                if (targetUserId) {
                    smFilter.$or = [
                        { ownerId: targetUserId },
                        { createdBy: targetUserId }
                    ];
                }
                const salesMeetings = await SalesMeeting.find(smFilter).sort({ scheduledAt: 1 }).limit(500).lean();
                salesMeetings.forEach(sm => {
                    results.push({
                        _id: `sm-${sm._id}`,
                        id: `sm-${sm._id}`,
                        meetingId: sm._id,
                        title: sm.title || `Demo with ${sm.leadName}`,
                        description: sm.notes || '',
                        startAt: sm.scheduledAt,
                        endAt: sm.endedAt || new Date(new Date(sm.scheduledAt).getTime() + (sm.durationMinutes || 30) * 60000),
                        allDay: false,
                        type: 'demo',
                        category: 'meeting',
                        isMeeting: true,
                        isFollowUp: false,
                        status: sm.status,
                        ownerId: sm.ownerId ? sm.ownerId.toString() : '',
                        ownerName: sm.ownerName || 'Sales Agent',
                        createdBy: sm.createdBy ? sm.createdBy.toString() : '',
                        leadId: sm.leadId ? sm.leadId.toString() : '',
                        clientName: sm.company || sm.leadName || '',
                        phone: sm.phone || '',
                        color: '#6366F1'
                    });
                });
            } catch (err) { }
        }

        // 2. Fetch Lead Follow-ups (Lead.reminder)
        if (category === 'all' || category === 'followup' || category === 'followups') {
            const leadFilter = {
                'reminder.date': { $exists: true, $ne: null }
            };
            if (startDate || endDate) {
                leadFilter['reminder.date'] = {};
                if (startDate) leadFilter['reminder.date'].$gte = startDate;
                if (endDate) leadFilter['reminder.date'].$lte = endDate;
            }
            if (targetUserId) {
                leadFilter.$or = [
                    { assignedTo: targetUserId },
                    { createdBy: targetUserId }
                ];
            }
            const leads = await Lead.find(leadFilter)
                .select('name company phone reminder assignedTo assignedToName createdBy createdByName stage lastFollowUpOutcome lastNote')
                .lean();

            const now = new Date();
            leads.forEach(l => {
                const rDate = new Date(l.reminder.date);
                const isOverdue = !l.reminder.completed && rDate < now;
                results.push({
                    _id: `fu-${l._id}`,
                    id: `fu-${l._id}`,
                    leadId: l._id.toString(),
                    title: `Follow-up: ${l.company || l.name}`,
                    description: l.lastNote || (l.lastFollowUpOutcome ? `Outcome: ${l.lastFollowUpOutcome}` : ''),
                    startAt: rDate,
                    endAt: new Date(rDate.getTime() + 30 * 60000),
                    allDay: false,
                    type: 'followup',
                    category: 'followup',
                    isFollowUp: true,
                    isMeeting: false,
                    status: l.reminder.completed ? 'completed' : (isOverdue ? 'overdue' : 'scheduled'),
                    ownerId: l.assignedTo || (l.createdBy ? l.createdBy.toString() : ''),
                    ownerName: l.assignedToName || l.createdByName || 'Sales Team',
                    clientName: l.company || l.name,
                    phone: l.phone || '',
                    stage: l.stage || 'new',
                    lastFollowUpOutcome: l.lastFollowUpOutcome || '',
                    lastNote: l.lastNote || '',
                    color: l.reminder.completed ? '#64748B' : (isOverdue ? '#EF4444' : '#10B981')
                });
            });
        }

        // Sort all by chronological order
        results.sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
        res.json(results);
    } catch (err) {
        console.error('Calendar Fetch Error:', err);
        res.status(500).json({ message: err.message });
    }
});

// ── GET /upcoming — Upcoming meetings and follow-ups ────────────────────────
router.get('/upcoming', protect, async (req, res) => {
    try {
        const limit = Math.min(Number(req.query.limit) || 8, 30);
        const now = new Date();
        const targetUserId = getTargetUserId(req);

        const ceFilter = {
            status: 'scheduled',
            startAt: { $gte: new Date(now.getTime() - 30 * 60000) }
        };
        if (targetUserId) {
            ceFilter.$or = [{ ownerId: targetUserId }, { attendeeIds: targetUserId }, { createdBy: targetUserId }];
        }
        const events = await CalendarEvent.find(ceFilter).sort({ startAt: 1 }).limit(limit).lean();

        // Also fetch upcoming lead followups
        const leadFilter = {
            'reminder.date': { $gte: new Date(now.getTime() - 30 * 60000) },
            'reminder.completed': { $ne: true }
        };
        if (targetUserId) {
            leadFilter.$or = [{ assignedTo: targetUserId }, { createdBy: targetUserId }];
        }
        const leads = await Lead.find(leadFilter).sort({ 'reminder.date': 1 }).limit(limit).lean();

        const combined = [
            ...events.map(e => ({ ...e, category: 'meeting' })),
            ...leads.map(l => ({
                _id: `fu-${l._id}`,
                id: `fu-${l._id}`,
                leadId: l._id.toString(),
                title: `Follow-up: ${l.company || l.name}`,
                startAt: l.reminder.date,
                endAt: new Date(new Date(l.reminder.date).getTime() + 30 * 60000),
                type: 'followup',
                category: 'followup',
                status: 'scheduled',
                ownerName: l.assignedToName || l.createdByName || 'Sales Team',
                clientName: l.company || l.name,
                phone: l.phone || ''
            }))
        ].sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime()).slice(0, limit);

        res.json(combined);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// ── GET /reminders/due — Due reminders polling ──────────────────────────────
router.get('/reminders/due', protect, async (req, res) => {
    try {
        const uid = userId(req);
        const now = new Date();
        const windowEnd = new Date(now.getTime() + 2 * 60000);

        const candidates = await CalendarEvent.find({
            status: 'scheduled',
            reminderSentAt: { $exists: false },
            $or: [{ ownerId: uid }, { attendeeIds: uid }]
        }).limit(100);

        const due = [];
        for (const ev of candidates) {
            const remindAt = new Date(ev.startAt.getTime() - (Number(ev.reminderMinutes) || 15) * 60000);
            if (remindAt <= windowEnd && remindAt >= new Date(now.getTime() - 5 * 60000)) {
                due.push(ev);
                ev.reminderSentAt = now;
                await ev.save();
                try {
                    await Notification.create({
                        userId: uid,
                        title: `Reminder: ${ev.title}`,
                        message: `${ev.clientName ? `Client: ${ev.clientName} · ` : ''}${new Date(ev.startAt).toLocaleString()}`,
                        type: 'calendar_reminder',
                        relatedId: ev._id.toString()
                    });
                } catch { /* ignore */ }
            }
        }
        res.json({ due });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// ── GET /:id — Get single event or follow-up ────────────────────────────────
router.get('/:id', protect, async (req, res) => {
    try {
        const id = req.params.id;
        if (id.startsWith('fu-')) {
            const leadId = id.replace('fu-', '');
            const lead = await Lead.findById(leadId).lean();
            if (!lead) return res.status(404).json({ message: 'Lead not found' });
            return res.json({
                _id: `fu-${lead._id}`,
                id: `fu-${lead._id}`,
                leadId: lead._id.toString(),
                title: `Follow-up: ${lead.company || lead.name}`,
                startAt: lead.reminder?.date,
                category: 'followup',
                type: 'followup',
                clientName: lead.company || lead.name,
                ownerName: lead.assignedToName || 'Sales Team',
                status: lead.reminder?.completed ? 'completed' : 'scheduled'
            });
        }

        const ev = await CalendarEvent.findById(id);
        if (!ev) return res.status(404).json({ message: 'Not found' });
        const uid = userId(req);
        const canSee = isAdmin(req) || ev.ownerId === uid || (ev.attendeeIds || []).includes(uid) || ev.createdBy === uid;
        if (!canSee) return res.status(403).json({ message: 'Not authorized' });
        res.json(ev);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// ── POST / — Create calendar event or schedule follow-up ────────────────────
router.post('/', protect, async (req, res) => {
    try {
        const body = req.body || {};
        if (!body.title || !body.startAt) {
            return res.status(400).json({ message: 'title and startAt are required' });
        }
        const startAt = new Date(body.startAt);
        const endAt = body.endAt ? new Date(body.endAt) : new Date(startAt.getTime() + (body.durationMinutes || 30) * 60000);

        let clientName = body.clientName || '';
        if (body.clientId && !clientName) {
            const c = await Client.findById(body.clientId).select('name company').lean();
            if (c) clientName = c.company || c.name || '';
        }

        let attendeeNames = body.attendeeNames || [];
        if (Array.isArray(body.attendeeIds) && body.attendeeIds.length && !attendeeNames.length) {
            const users = await User.find({ _id: { $in: body.attendeeIds } }).select('name');
            attendeeNames = users.map(u => u.name);
        }

        // Admin can assign owner to any user
        const ownerId = (isAdmin(req) && body.ownerId) ? body.ownerId : userId(req);
        let ownerName = body.ownerName || req.user.name;
        if (ownerId !== userId(req)) {
            const ou = await User.findById(ownerId).select('name');
            if (ou) ownerName = ou.name;
        }

        // If follow-up with leadId, also update lead reminder
        if ((body.type === 'followup' || body.category === 'followup') && body.leadId) {
            try {
                const lead = await Lead.findById(body.leadId);
                if (lead) {
                    lead.reminder = {
                        date: startAt,
                        tone: 'default',
                        completed: false
                    };
                    if (isAdmin(req) && body.ownerId) {
                        lead.assignedTo = ownerId;
                        lead.assignedToName = ownerName;
                    }
                    await lead.save();
                }
            } catch (lErr) { }
        }

        const event = await CalendarEvent.create({
            title: body.title,
            description: body.description || '',
            startAt,
            endAt,
            allDay: !!body.allDay,
            type: body.type || 'meeting',
            status: 'scheduled',
            ownerId,
            ownerName,
            createdBy: userId(req),
            createdByName: req.user.name,
            attendeeIds: body.attendeeIds || [],
            attendeeNames,
            clientId: body.clientId || '',
            clientName,
            leadId: body.leadId || '',
            leadName: body.leadName || '',
            projectId: body.projectId || '',
            projectName: body.projectName || '',
            location: body.location || '',
            meetingLink: body.meetingLink || '',
            color: body.color || (body.type === 'followup' ? '#10B981' : '#3A6FF8'),
            reminderMinutes: body.reminderMinutes != null ? Number(body.reminderMinutes) : 15,
            notes: body.notes || ''
        });

        // Notify attendees
        for (const aid of event.attendeeIds || []) {
            if (aid === userId(req)) continue;
            try {
                await Notification.create({
                    userId: aid,
                    title: 'New calendar event',
                    message: `${req.user.name} invited you: ${event.title}`,
                    type: 'calendar_invite',
                    relatedId: event._id.toString()
                });
            } catch { /* ignore */ }
        }

        res.status(201).json(event);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// ── PUT /:id — Update or complete meeting / follow-up ────────────────────────
router.put('/:id', protect, async (req, res) => {
    try {
        const id = req.params.id;

        // Follow-up on a Lead
        if (id.startsWith('fu-')) {
            const leadId = id.replace('fu-', '');
            const lead = await Lead.findById(leadId);
            if (!lead) return res.status(404).json({ message: 'Lead not found' });

            const uid = userId(req);
            const canEdit = isAdmin(req) || String(lead.assignedTo || '') === uid || String(lead.createdBy || '') === uid;
            if (!canEdit) return res.status(403).json({ message: 'Not authorized to edit this follow-up' });

            if (!lead.reminder) {
                lead.reminder = { completed: false, tone: 'default' };
            }

            if (req.body.status === 'completed') {
                lead.reminder.completed = true;
            } else if (req.body.status === 'scheduled') {
                lead.reminder.completed = false;
            }

            if (req.body.startAt) {
                lead.reminder.date = new Date(req.body.startAt);
                lead.reminder.completed = false;
            }

            if (req.body.ownerId && isAdmin(req)) {
                lead.assignedTo = req.body.ownerId;
                if (req.body.ownerName) lead.assignedToName = req.body.ownerName;
            }

            if (req.body.notes || req.body.lastNote) {
                lead.lastNote = req.body.notes || req.body.lastNote;
            }
            if (req.body.lastFollowUpOutcome) {
                lead.lastFollowUpOutcome = req.body.lastFollowUpOutcome;
            }

            await lead.save();
            return res.json({ message: 'Follow-up updated successfully', leadId: lead._id });
        }

        // SalesMeeting
        if (id.startsWith('sm-')) {
            const smId = id.replace('sm-', '');
            const sm = await SalesMeeting.findById(smId);
            if (!sm) return res.status(404).json({ message: 'Meeting not found' });
            if (req.body.status) sm.status = req.body.status;
            if (req.body.startAt) sm.scheduledAt = new Date(req.body.startAt);
            if (req.body.notes) sm.notes = req.body.notes;
            await sm.save();
            return res.json(sm);
        }

        // CalendarEvent
        const ev = await CalendarEvent.findById(id);
        if (!ev) return res.status(404).json({ message: 'Not found' });
        const uid = userId(req);
        const canEdit = isAdmin(req) || ev.ownerId === uid || ev.createdBy === uid;
        if (!canEdit) return res.status(403).json({ message: 'Not authorized' });

        const allowed = [
            'title', 'description', 'startAt', 'endAt', 'allDay', 'type', 'status',
            'attendeeIds', 'attendeeNames', 'clientId', 'clientName', 'leadId', 'leadName',
            'projectId', 'projectName', 'location', 'meetingLink', 'color',
            'reminderMinutes', 'notes', 'ownerId', 'ownerName'
        ];
        const patch = {};
        allowed.forEach(k => {
            if (req.body[k] !== undefined) patch[k] = req.body[k];
        });
        if (patch.startAt) patch.startAt = new Date(patch.startAt);
        if (patch.endAt) patch.endAt = new Date(patch.endAt);
        patch.updatedAt = new Date();
        Object.assign(ev, patch);
        if (req.body.startAt || req.body.reminderMinutes != null) {
            ev.reminderSentAt = undefined;
            ev.markModified('reminderSentAt');
        }
        await ev.save();
        res.json(ev);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// ── DELETE /:id — Cancel meeting or follow-up ────────────────────────────────
router.delete('/:id', protect, async (req, res) => {
    try {
        const id = req.params.id;

        // Cancel Lead follow-up
        if (id.startsWith('fu-')) {
            const leadId = id.replace('fu-', '');
            const lead = await Lead.findById(leadId);
            if (!lead) return res.status(404).json({ message: 'Lead not found' });
            const uid = userId(req);
            const canEdit = isAdmin(req) || String(lead.assignedTo || '') === uid || String(lead.createdBy || '') === uid;
            if (!canEdit) return res.status(403).json({ message: 'Not authorized' });

            if (lead.reminder) {
                lead.reminder.date = null;
                lead.reminder.completed = true;
            }
            await lead.save();
            return res.json({ message: 'Follow-up cancelled' });
        }

        // Cancel SalesMeeting
        if (id.startsWith('sm-')) {
            const smId = id.replace('sm-', '');
            const sm = await SalesMeeting.findById(smId);
            if (!sm) return res.status(404).json({ message: 'Meeting not found' });
            sm.status = 'cancelled';
            await sm.save();
            return res.json({ message: 'Meeting cancelled' });
        }

        // Cancel CalendarEvent
        const ev = await CalendarEvent.findById(id);
        if (!ev) return res.status(404).json({ message: 'Not found' });
        const uid = userId(req);
        const canEdit = isAdmin(req) || ev.ownerId === uid || ev.createdBy === uid;
        if (!canEdit) return res.status(403).json({ message: 'Not authorized' });
        ev.status = 'cancelled';
        ev.updatedAt = new Date();
        await ev.save();
        res.json({ message: 'Cancelled', event: ev });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
