const express = require('express');
const router = express.Router();
const Setting = require('../models/Setting');
const { protect, authorize } = require('../middleware/authMiddleware');

const defaultRoles = [
    {
        name: 'admin', label: 'Administrator',
        permissions: {
            dashboard: { view: true },
            projects: { view: true, create: true, edit: true, delete: true },
            tasks: { view: true, create: true, edit: true, delete: true },
            clients: { view: true, create: true, edit: true, delete: true },
            finance: { view: true, create: true, edit: true, delete: true },
            users: { view: true, create: true, edit: true, delete: true },
            settings: { view: true, edit: true }
        }
    },
    {
        name: 'employee', label: 'Employee',
        permissions: {
            dashboard: { view: true },
            projects: { view: true, create: false, edit: false, delete: false },
            tasks: { view: true, create: true, edit: true, delete: false },
            clients: { view: true, create: false, edit: false, delete: false },
            finance: { view: false, create: false, edit: false, delete: false },
            users: { view: false, create: false, edit: false, delete: false },
            settings: { view: false, edit: false }
        }
    }
];

// Get Settings (Create if not exists)
router.get('/', protect, async (req, res) => {
    try {
        let settings = await Setting.findOne({ type: 'general' });
        if (!settings) {
            settings = new Setting({ type: 'general', roles: defaultRoles });
            await settings.save();
        } else if (!settings.roles || settings.roles.length === 0) {
            settings.roles = defaultRoles;
            await settings.save();
        }
        res.json(settings);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Update Settings (Admin Only)
router.put('/', protect, authorize('admin', 'owner'), async (req, res) => {
    try {
        let settings = await Setting.findOne({ type: 'general' });
        if (!settings) settings = new Setting({ type: 'general' });

        // Deep merge or overwrite sections
        if (req.body.companyProfile) {
            settings.companyProfile = { ...settings.companyProfile.toObject(), ...req.body.companyProfile };
        }
        if (req.body.billing) {
            settings.billing = { ...settings.billing.toObject(), ...req.body.billing };
        }
        if (req.body.notifications) {
            settings.notifications = { ...settings.notifications.toObject(), ...req.body.notifications };
        }
        if (req.body.emailSettings) {
            settings.emailSettings = { ...settings.emailSettings.toObject(), ...req.body.emailSettings };
        }
        if (req.body.roles) {
            settings.roles = req.body.roles;
        }
        if (req.body.dashboardLayouts) {
            settings.dashboardLayouts = req.body.dashboardLayouts;
        }
        if (req.body.payroll) {
            settings.payroll = { ...settings.payroll.toObject(), ...req.body.payroll };
        }

        settings.updatedAt = Date.now();
        const updated = await settings.save();
        res.json(updated);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Test SMTP Connection (Admin Only)
router.post('/test-smtp', protect, authorize('admin', 'owner'), async (req, res) => {
    const nodemailer = require('nodemailer');
    const { host, port, user, pass, secure, fromEmail } = req.body;

    try {
        const transporter = nodemailer.createTransport({
            host,
            port,
            secure, // true for 465, false for other ports
            auth: {
                user,
                pass
            }
        });

        // verify connection configuration
        await transporter.verify();

        // Try sending a test email if fromEmail is provided (optional but good for full test)
        if (fromEmail) {
            await transporter.sendMail({
                from: fromEmail,
                to: fromEmail, // Send to self
                subject: 'CRM SMTP Test',
                text: 'Your SMTP settings are working correctly!'
            });
        }

        res.json({ success: true, message: 'SMTP connection successful! Test email sent.' });
    } catch (error) {
        res.status(400).json({ success: false, message: 'SMTP Connection Failed: ' + error.message });
    }
});

module.exports = router;
