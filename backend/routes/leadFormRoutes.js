const express = require('express');
const router = express.Router();
const LeadForm = require('../models/LeadForm');
const Lead = require('../models/Lead');
const { protect, checkPermission } = require('../middleware/authMiddleware');
const { applyCreatorScope, assertCreatorAccess } = require('../utils/dataScope');

// Get all forms — creator-scoped unless view_all / admin
router.get('/', protect, checkPermission('leads_form', 'view'), async (req, res) => {
    try {
        const filter = await applyCreatorScope({}, req.user, 'leads_form');
        const forms = await LeadForm.find(filter).sort({ createdAt: -1 });
        res.json(forms);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Create form
router.post('/', protect, checkPermission('leads_form', 'create'), async (req, res) => {
    const { title, description, fields, isActive } = req.body;
    try {
        const newForm = new LeadForm({
            title,
            description,
            fields,
            isActive,
            createdBy: req.user._id
        });
        const savedForm = await newForm.save();
        res.status(201).json(savedForm);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Update form
router.put('/:id', protect, checkPermission('leads_form', 'edit'), async (req, res) => {
    try {
        const existing = await LeadForm.findById(req.params.id);
        if (!existing) return res.status(404).json({ message: 'Form not found' });
        const access = await assertCreatorAccess(req.user, existing, 'leads_form');
        if (!access.ok) return res.status(access.status).json({ message: access.message });

        const updateData = { ...req.body };
        delete updateData._id;
        delete updateData.__v;
        delete updateData.createdBy;

        const form = await LeadForm.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true }
        );

        if (!form) return res.status(404).json({ message: 'Form not found' });
        res.json(form);
    } catch (err) {
        console.error('Update Form Error:', err);
        res.status(400).json({ message: err.message });
    }
});

// Delete form
router.delete('/:id', protect, checkPermission('leads_form', 'delete'), async (req, res) => {
    try {
        const existing = await LeadForm.findById(req.params.id);
        if (!existing) return res.status(404).json({ message: 'Form not found' });
        const access = await assertCreatorAccess(req.user, existing, 'leads_form');
        if (!access.ok) return res.status(access.status).json({ message: access.message });
        await LeadForm.findByIdAndDelete(req.params.id);
        res.json({ message: 'Form deleted successfully' });
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Public: Get form config
router.get('/public/:id', async (req, res) => {
    try {
        const form = await LeadForm.findById(req.params.id);
        if (!form || !form.isActive) {
            return res.status(404).json({ message: 'Form not found or inactive' });
        }
        res.json(form);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Public: Submit lead
router.post('/public/:id/submit', async (req, res) => {
    try {
        const form = await LeadForm.findById(req.params.id);
        if (!form || !form.isActive) {
            return res.status(404).json({ message: 'Form not found or inactive' });
        }

        const submission = req.body;
        const mainFields = ['name', 'company', 'email', 'phone', 'value', 'source', 'stage'];
        const customFields = {};

        Object.keys(submission).forEach(key => {
            if (!mainFields.includes(key)) {
                customFields[key] = submission[key];
            }
        });

        const newLead = new Lead({
            name: submission.name || 'Anonymous',
            company: submission.company || 'N/A',
            email: submission.email,
            phone: submission.phone,
            customFields,
            formId: form._id,
            formTitle: form.title,
            source: `Form: ${form.title}`,
            stage: 'new',
            createdBy: form.createdBy || undefined,
            activities: [{
                content: `Lead submitted via form: ${form.title}`,
                type: 'note'
            }]
        });

        await newLead.save();
        res.json({ success: true, message: 'Form submitted successfully' });
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

module.exports = router;
