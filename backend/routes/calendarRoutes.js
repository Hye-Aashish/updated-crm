const express = require('express');
const router = express.Router();
const CalendarEvent = require('../models/CalendarEvent');
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

function visibilityFilter(req, extra = {}) {
    const uid = userId(req);
    if (isAdmin(req) && req.query.scope === 'all') {
        return { ...extra };
    }
    if (isAdmin(req) && req.query.userId) {
        const target = req.query.userId;
        return {
            ...extra,
            $or: [{ ownerId: target }, { attendeeIds: target }]
        };
    }
    return {
        ...extra,
        $or: [{ ownerId: uid }, { attendeeIds: uid }, { createdBy: uid }]
    };
}

// List events in range
router.get('/', protect, async (req, res) => {
    try {
        const { start, end } = req.query;
        const filter = visibilityFilter(req, {
            status: { $ne: 'cancelled' }
        });
        if (start || end) {
            filter.startAt = {};
            if (start) filter.startAt.$gte = new Date(start);
            if (end) filter.startAt.$lte = new Date(end);
        }
        const events = await CalendarEvent.find(filter).sort({ startAt: 1 }).limit(500);
        res.json(events);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Upcoming for dashboard widget
router.get('/upcoming', protect, async (req, res) => {
    try {
        const limit = Math.min(Number(req.query.limit) || 8, 30);
        const now = new Date();
        const filter = visibilityFilter(req, {
            status: 'scheduled',
            startAt: { $gte: new Date(now.getTime() - 30 * 60000) }
        });
        const events = await CalendarEvent.find(filter).sort({ startAt: 1 }).limit(limit);
        res.json(events);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Due reminders (client polls this)
router.get('/reminders/due', protect, async (req, res) => {
    try {
        const uid = userId(req);
        const now = new Date();
        const windowEnd = new Date(now.getTime() + 2 * 60000); // next 2 min grace

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

router.get('/:id', protect, async (req, res) => {
    try {
        const ev = await CalendarEvent.findById(req.params.id);
        if (!ev) return res.status(404).json({ message: 'Not found' });
        const uid = userId(req);
        const canSee = isAdmin(req) || ev.ownerId === uid || (ev.attendeeIds || []).includes(uid) || ev.createdBy === uid;
        if (!canSee) return res.status(403).json({ message: 'Not authorized' });
        res.json(ev);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

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

        const ownerId = (isAdmin(req) && body.ownerId) ? body.ownerId : userId(req);
        let ownerName = body.ownerName || req.user.name;
        if (ownerId !== userId(req)) {
            const ou = await User.findById(ownerId).select('name');
            if (ou) ownerName = ou.name;
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
            color: body.color || '#3A6FF8',
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

router.put('/:id', protect, async (req, res) => {
    try {
        const ev = await CalendarEvent.findById(req.params.id);
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

router.delete('/:id', protect, async (req, res) => {
    try {
        const ev = await CalendarEvent.findById(req.params.id);
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
