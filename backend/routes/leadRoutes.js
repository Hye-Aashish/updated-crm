const express = require('express');
const router = express.Router();
const Lead = require('../models/Lead');
const PipelineStage = require('../models/PipelineStage');
const { protect, authorize, checkPermission } = require('../middleware/authMiddleware');

// --- STAGES ROUTES ---

// GET all stages
router.get('/stages', protect, async (req, res) => {
    try {
        const stages = await PipelineStage.find().sort({ order: 1 });
        // If no stages, seed default
        if (stages.length === 0) {
            const defaults = [
                { id: 'new', label: 'New Leads', color: 'bg-blue-500', order: 0 },
                { id: 'discussion', label: 'In Discussion', color: 'bg-yellow-500', order: 1 },
                { id: 'proposal', label: 'Proposal Sent', color: 'bg-purple-500', order: 2 },
                { id: 'closed', label: 'Closed / Won', color: 'bg-green-500', order: 3 },
            ];
            await PipelineStage.insertMany(defaults);
            return res.json(defaults);
        }
        res.json(stages);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// POST new stage
router.post('/stages', protect, authorize('admin', 'owner'), async (req, res) => {
    try {
        const stage = new PipelineStage({
            id: req.body.id,
            label: req.body.label,
            color: req.body.color,
            order: req.body.order || 0
        });
        const newStage = await stage.save();
        res.status(201).json(newStage);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// DELETE stage
router.delete('/stages/:id', protect, authorize('admin', 'owner'), async (req, res) => {
    try {
        await PipelineStage.findOneAndDelete({ id: req.params.id });
        res.json({ message: 'Stage deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});


const isAuthorizedForLead = async (user, lead) => {
    if (!lead) return false;
    if (user.role === 'admin' || user.role === 'owner') return true;

    // Unassigned lead OR assigned to current user
    if (!lead.assignedTo || lead.assignedTo === user._id.toString()) return true;

    // Check if role has view_all permissions in DB
    try {
        const Setting = require('../models/Setting');
        const settings = await Setting.findOne({ type: 'general' });
        const userRoleConfig = settings?.roles?.find(r => r.name === user.role);
        if (userRoleConfig?.permissions?.leads?.view_all || userRoleConfig?.permissions?.dashboard?.scope?.view_all) {
            return true;
        }
    } catch (e) { }

    return false;
};

// --- LEADS ROUTES ---

// GET all leads
router.get('/', protect, checkPermission('leads', 'view'), async (req, res) => {
    try {
        const Setting = require('../models/Setting');
        const settings = await Setting.findOne({ type: 'general' });
        const userRole = settings?.roles?.find(r => r.name === req.user.role);
        const canViewAll = userRole?.permissions?.leads?.view_all || req.user.role === 'owner' || req.user.role === 'admin';

        let filter = {};
        if (!canViewAll) {
            filter = {
                $or: [
                    { assignedTo: req.user._id.toString() },
                    { assignedTo: { $exists: false } },
                    { assignedTo: null },
                    { assignedTo: "" }
                ]
            };
        }
        const leads = await Lead.find(filter).sort({ createdAt: -1 });
        res.json(leads);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// POST new lead
router.post('/', protect, checkPermission('leads', 'create'), async (req, res) => {
    try {
        // Whitelist allowed fields to prevent mass assignment
        const allowedFields = ['name', 'company', 'email', 'phone', 'value', 'source', 'stage',
            'assignedTo', 'notes', 'customFields', 'reminder', 'tags', 'website', 'address',
            'industry', 'designation', 'description', 'project'];
        const safeData = {};
        allowedFields.forEach(f => { if (req.body[f] !== undefined) safeData[f] = req.body[f]; });
        const lead = new Lead(safeData);
        const newLead = await lead.save();

        // Trigger Notification
        try {
            const Notification = require('../models/Notification');
            await Notification.create({
                title: 'New Lead Captured',
                message: `Lead "${newLead.company}" (${newLead.name}) has been added to the pipeline.`,
                type: 'new_lead',
                relatedId: newLead._id
            });
        } catch (nErr) { console.error('Notif Error:', nErr); }

        res.status(201).json(newLead);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// GET lead by id
router.get('/:id', protect, async (req, res) => {
    try {
        const lead = await Lead.findById(req.params.id);
        if (!lead) return res.status(404).json({ message: 'Lead not found' });

        const canAccess = await isAuthorizedForLead(req.user, lead);
        if (!canAccess) {
            return res.status(403).json({ message: 'Not authorized for this lead' });
        }
        res.json(lead);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// UPDATE lead
router.put('/:id', protect, checkPermission('leads', 'edit'), async (req, res) => {
    try {
        const lead = await Lead.findById(req.params.id);
        if (!lead) return res.status(404).json({ message: 'Lead not found' });

        const canAccess = await isAuthorizedForLead(req.user, lead);
        if (!canAccess) {
            return res.status(403).json({ message: 'Not authorized to edit this lead' });
        }

        // Whitelist allowed update fields
        const allowedFields = ['name', 'company', 'email', 'phone', 'value', 'source', 'stage',
            'assignedTo', 'notes', 'customFields', 'reminder', 'tags', 'website', 'address',
            'industry', 'designation', 'description', 'lostReason', 'project'];
        const safeData = {};
        allowedFields.forEach(f => { if (req.body[f] !== undefined) safeData[f] = req.body[f]; });

        const updatedLead = await Lead.findByIdAndUpdate(req.params.id, safeData, { new: true });
        res.json(updatedLead);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// DELETE lead
router.delete('/:id', protect, checkPermission('leads', 'delete'), async (req, res) => {
    try {
        await Lead.findByIdAndDelete(req.params.id);
        res.json({ message: 'Lead deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Add Activity
router.post('/:id/activities', protect, async (req, res) => {
    try {
        const lead = await Lead.findById(req.params.id);
        if (!lead) return res.status(404).json({ message: 'Lead not found' });

        const canAccess = await isAuthorizedForLead(req.user, lead);
        if (!canAccess) {
            return res.status(403).json({ message: 'Not authorized to add activities to this lead' });
        }

        lead.activities.push({
            content: req.body.content,
            type: req.body.type || 'note',
            createdAt: new Date()
        });

        // Run AI Analysis and Schedule Reminders if keywords found
        try {
            const { analyzeLeadPriorityAndExtractReminder } = require('../services/aiService');
            const aiResult = await analyzeLeadPriorityAndExtractReminder(lead.activities, req.body.clientTime);

            lead.aiPriority = aiResult.priority;
            lead.aiPriorityReason = aiResult.reason;

            if (aiResult.extractedReminderDate) {
                const nextReminderDate = new Date(aiResult.extractedReminderDate);
                if (nextReminderDate > new Date()) {
                    lead.reminder = {
                        date: nextReminderDate,
                        tone: 'default',
                        completed: false,
                        sentReminders: []
                    };
                }
            }
        } catch (aiErr) {
            console.error('Lead Activity AI Processing Error:', aiErr);
        }

        const updatedLead = await lead.save();
        res.json(updatedLead);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

module.exports = router;
