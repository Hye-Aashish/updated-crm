const express = require('express');
const router = express.Router();
const LeadForm = require('../models/LeadForm');
const Lead = require('../models/Lead');
const { protect, authorize } = require('../middleware/authMiddleware');

// Get all forms (All authenticated users for pipeline view)
router.get('/', protect, async (req, res) => {
    try {
        const forms = await LeadForm.find().sort({ createdAt: -1 });
        res.json(forms);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Create form (Admin only)
router.post('/', protect, authorize('admin', 'owner'), async (req, res) => {
    const { title, description, fields, isActive } = req.body;
    try {
        const newForm = new LeadForm({ title, description, fields, isActive });
        const savedForm = await newForm.save();
        res.status(201).json(savedForm);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Update form (Admin only)
router.put('/:id', protect, authorize('admin', 'owner'), async (req, res) => {
    try {
        const updateData = { ...req.body };
        delete updateData._id;
        delete updateData.__v;

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

// Delete form (Admin only)
router.delete('/:id', protect, authorize('admin', 'owner'), async (req, res) => {
    try {
        const form = await LeadForm.findByIdAndDelete(req.params.id);
        if (!form) return res.status(404).json({ message: 'Form not found' });
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

        // Map submission to Lead model
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
            source: `Form: ${form.title}`,
            stage: 'new',
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
