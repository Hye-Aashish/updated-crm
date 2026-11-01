const express = require('express');
const router = express.Router();
const PipelineRule = require('../models/PipelineRule');
const { FollowUpSequence, LeadSequenceEnrollment } = require('../models/FollowUpSequence');
const Lead = require('../models/Lead');
const { protect, authorize, checkPermission } = require('../middleware/authMiddleware');

// ── Pipeline Rules ──────────────────────────────────────────
router.get('/pipeline-rules', protect, checkPermission('leads', 'view'), async (req, res) => {
    try {
        const rules = await PipelineRule.find().sort({ createdAt: -1 });
        res.json(rules);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.post('/pipeline-rules', protect, authorize('admin', 'owner'), async (req, res) => {
    try {
        const rule = await PipelineRule.create({
            name: req.body.name,
            onStage: req.body.onStage,
            enabled: req.body.enabled !== false,
            actions: req.body.actions || []
        });
        res.status(201).json(rule);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

router.put('/pipeline-rules/:id', protect, authorize('admin', 'owner'), async (req, res) => {
    try {
        const rule = await PipelineRule.findByIdAndUpdate(
            req.params.id,
            { $set: { ...req.body, updatedAt: new Date() } },
            { new: true }
        );
        if (!rule) return res.status(404).json({ message: 'Rule not found' });
        res.json(rule);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

router.delete('/pipeline-rules/:id', protect, authorize('admin', 'owner'), async (req, res) => {
    try {
        await PipelineRule.findByIdAndDelete(req.params.id);
        res.json({ message: 'Deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// ── Follow-up Sequences ─────────────────────────────────────
router.get('/sequences', protect, checkPermission('leads', 'view'), async (req, res) => {
    try {
        const sequences = await FollowUpSequence.find().sort({ createdAt: -1 });
        res.json(sequences);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.post('/sequences', protect, authorize('admin', 'owner'), async (req, res) => {
    try {
        const seq = await FollowUpSequence.create({
            name: req.body.name,
            enabled: req.body.enabled !== false,
            steps: req.body.steps || []
        });
        res.status(201).json(seq);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

router.put('/sequences/:id', protect, authorize('admin', 'owner'), async (req, res) => {
    try {
        const seq = await FollowUpSequence.findByIdAndUpdate(
            req.params.id,
            { $set: { ...req.body, updatedAt: new Date() } },
            { new: true }
        );
        if (!seq) return res.status(404).json({ message: 'Sequence not found' });
        res.json(seq);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

router.delete('/sequences/:id', protect, authorize('admin', 'owner'), async (req, res) => {
    try {
        await FollowUpSequence.findByIdAndDelete(req.params.id);
        await LeadSequenceEnrollment.deleteMany({ sequenceId: req.params.id });
        res.json({ message: 'Deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.post('/sequences/:id/enroll/:leadId', protect, checkPermission('leads', 'edit'), async (req, res) => {
    try {
        const lead = await Lead.findById(req.params.leadId);
        if (!lead) return res.status(404).json({ message: 'Lead not found' });
        const seq = await FollowUpSequence.findById(req.params.id);
        if (!seq || !seq.enabled) return res.status(404).json({ message: 'Sequence not found' });

        const enrollment = await LeadSequenceEnrollment.create({
            leadId: lead._id,
            sequenceId: seq._id,
            currentStep: 0,
            firedSteps: []
        });
        lead.sequenceEnrollmentId = enrollment._id;
        await lead.save();
        res.status(201).json(enrollment);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

module.exports = router;
