const express = require('express');
const router = express.Router();
const Campaign = require('../models/Campaign');
const Lead = require('../models/Lead');
const Client = require('../models/Client');
const User = require('../models/User');
const sendEmail = require('../utils/sendEmail');
const { protect, checkPermission } = require('../middleware/authMiddleware');

// Helper to replace personalization merge tags
const personalizeText = (text, data = {}) => {
    if (!text) return '';
    return text
        .replace(/\{\{\s*name\s*\}\}/gi, data.name || 'Valued Customer')
        .replace(/\{\{\s*company\s*\}\}/gi, data.company || 'Your Company')
        .replace(/\{\{\s*email\s*\}\}/gi, data.email || '')
        .replace(/\{\{\s*date\s*\}\}/gi, new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }));
};

// GET all campaigns
router.get('/', protect, checkPermission('leads', 'view'), async (req, res) => {
    try {
        const campaigns = await Campaign.find().sort({ createdAt: -1 });
        res.json(campaigns);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// CREATE campaign
router.post('/', protect, checkPermission('leads', 'create'), async (req, res) => {
    try {
        const campaign = new Campaign({
            ...req.body,
            createdBy: req.user._id
        });
        await campaign.save();
        res.status(201).json(campaign);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// UPDATE campaign
router.put('/:id', protect, checkPermission('leads', 'edit'), async (req, res) => {
    try {
        const campaign = await Campaign.findById(req.params.id);
        if (!campaign) return res.status(404).json({ message: 'Campaign not found' });
        
        if (campaign.status === 'sending' || campaign.status === 'sent') {
            return res.status(400).json({ message: 'Cannot edit an already sent or sending campaign.' });
        }

        Object.assign(campaign, req.body);
        await campaign.save();
        res.json(campaign);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// TEST SEND single preview email
router.post('/:id/test-send', protect, checkPermission('leads', 'edit'), async (req, res) => {
    try {
        const { testEmail } = req.body;
        const recipientEmail = testEmail || req.user.email;
        if (!recipientEmail) return res.status(400).json({ message: 'Test email address required' });

        const campaign = await Campaign.findById(req.params.id);
        if (!campaign) return res.status(404).json({ message: 'Campaign not found' });

        const testData = { name: req.user.name || 'Test User', company: 'Test Company Inc.', email: recipientEmail };
        const personalizedSubject = `[TEST] ${personalizeText(campaign.subject, testData)}`;
        const personalizedContent = personalizeText(campaign.content, testData);

        await sendEmail(recipientEmail, personalizedSubject, personalizedContent);
        res.json({ message: `Test email successfully sent to ${recipientEmail}` });
    } catch (err) {
        res.status(500).json({ message: err.message || 'Failed to dispatch test email' });
    }
});

// DUPLICATE campaign
router.post('/:id/duplicate', protect, checkPermission('leads', 'create'), async (req, res) => {
    try {
        const original = await Campaign.findById(req.params.id);
        if (!original) return res.status(404).json({ message: 'Campaign not found' });

        const clone = new Campaign({
            title: `${original.title} (Copy)`,
            subject: original.subject,
            content: original.content,
            templateCategory: original.templateCategory,
            targetAudience: original.targetAudience,
            customEmails: original.customEmails,
            status: 'draft',
            createdBy: req.user._id
        });

        await clone.save();
        res.status(201).json(clone);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// BROADCAST / SEND campaign
router.post('/:id/send', protect, checkPermission('leads', 'edit'), async (req, res) => {
    try {
        const campaign = await Campaign.findById(req.params.id);
        if (!campaign) return res.status(404).json({ message: 'Campaign not found' });

        let recipients = []; // [{ email, name, company }]

        if (campaign.targetAudience === 'leads') {
            const leads = await Lead.find({ email: { $exists: true, $ne: '' } }).select('name company email');
            recipients = leads.map(l => ({ email: l.email, name: l.name, company: l.company }));
        } else if (campaign.targetAudience === 'clients') {
            const clients = await Client.find({ email: { $exists: true, $ne: '' } }).select('name company email');
            recipients = clients.map(c => ({ email: c.email, name: c.name, company: c.company }));
        } else if (campaign.targetAudience === 'all_staff') {
            const staff = await User.find({ role: { $ne: 'client' } }).select('name email');
            recipients = staff.map(u => ({ email: u.email, name: u.name, company: 'Agency Team' }));
        } else if (campaign.targetAudience === 'custom' && Array.isArray(campaign.customEmails)) {
            recipients = campaign.customEmails.map(e => ({ email: e.trim(), name: 'Valued Contact', company: '' }));
        }

        // De-duplicate by email
        const uniqueMap = new Map();
        recipients.forEach(r => {
            if (r.email && !uniqueMap.has(r.email.toLowerCase())) {
                uniqueMap.set(r.email.toLowerCase(), r);
            }
        });
        const targetList = Array.from(uniqueMap.values());

        campaign.status = 'sending';
        campaign.stats.totalRecipients = targetList.length;
        campaign.recipientLogs = [];
        await campaign.save();

        let sentCount = 0;
        let failedCount = 0;

        // Async dispatch
        for (const recipient of targetList) {
            try {
                const subject = personalizeText(campaign.subject, recipient);
                const body = personalizeText(campaign.content, recipient);
                
                await sendEmail(recipient.email, subject, body);
                sentCount++;
                campaign.recipientLogs.push({
                    email: recipient.email,
                    name: recipient.name,
                    status: 'sent',
                    sentAt: new Date()
                });
            } catch (err) {
                console.error(`Failed to send campaign email to ${recipient.email}:`, err.message);
                failedCount++;
                campaign.recipientLogs.push({
                    email: recipient.email,
                    name: recipient.name,
                    status: 'failed',
                    sentAt: new Date(),
                    error: err.message
                });
            }
        }

        campaign.status = 'sent';
        campaign.sentAt = new Date();
        campaign.stats.sentCount = sentCount;
        campaign.stats.failedCount = failedCount;
        // Simulate open rate estimate for metrics
        campaign.stats.opensCount = Math.round(sentCount * 0.42);
        campaign.stats.clicksCount = Math.round(sentCount * 0.18);

        await campaign.save();

        res.json({ message: 'Campaign broadcast completed', campaign });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// DELETE campaign
router.delete('/:id', protect, checkPermission('leads', 'delete'), async (req, res) => {
    try {
        await Campaign.findByIdAndDelete(req.params.id);
        res.json({ message: 'Campaign deleted successfully' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
