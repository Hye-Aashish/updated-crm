const express = require('express');
const router = express.Router();
const Setting = require('../models/Setting');
const { protect, authorize } = require('../middleware/authMiddleware');

const defaultRoles = [
    {
        name: 'admin', label: 'Administrator',
        permissions: {
            dashboard: { view: true },
            user_tracker: { view: true },
            clients: { view: true, create: true, edit: true, delete: true },
            leads: { view: true, create: true, edit: true, delete: true },
            projects: { view: true, create: true, edit: true, delete: true },
            tasks: { view: true, create: true, edit: true, delete: true },
            team: { view: true, create: true, edit: true, delete: true },
            attendance: { view: true, manage: true },
            time_tracking: { view: true, manage: true },
            invoices: { view: true, create: true, edit: true, delete: true },
            quotations: { view: true, create: true, edit: true, delete: true },
            templates: { view: true, create: true, edit: true, delete: true },
            expenses: { view: true, create: true, edit: true, delete: true },
            payroll: { view: true, manage: true },
            tickets: { view: true, create: true, edit: true, delete: true },
            chat: { view: true, reply: true },
            reports: { view: true },
            files: { view: true, upload: true, delete: true },
            settings: { view: true, edit: true }
        }
    },
    {
        name: 'employee', label: 'Employee',
        permissions: {
            dashboard: { view: true },
            user_tracker: { view: false },
            clients: { view: true, create: false, edit: false, delete: false },
            leads: { view: false, create: false, edit: false, delete: false },
            projects: { view: true, create: false, edit: false, delete: false },
            tasks: { view: true, create: true, edit: true, delete: false },
            team: { view: false, create: false, edit: false, delete: false },
            attendance: { view: true, manage: false },
            time_tracking: { view: true, manage: false },
            invoices: { view: false, create: false, edit: false, delete: false },
            quotations: { view: true, create: true, edit: false, delete: false },
            templates: { view: true, create: false, edit: false, delete: false },
            expenses: { view: true, create: true, edit: false, delete: false },
            payroll: { view: true, manage: false },
            tickets: { view: true, create: true, edit: true, delete: false },
            chat: { view: true, reply: true },
            reports: { view: false },
            files: { view: true, upload: true, delete: false },
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

        const userRole = req.user.role;
        if (userRole === 'admin' || userRole === 'owner') {
            return res.json(settings);
        }

        // For non-admin, filter out sensitive data
        const publicSettings = settings.toObject();

        // Remove sensitive billing data
        if (publicSettings.billing) {
            delete publicSettings.billing.razorpaySecret;
        }

        // Remove sensitive email data
        if (publicSettings.emailSettings) {
            delete publicSettings.emailSettings.pass;
        }

        // Return limited view
        res.json(publicSettings);

    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Update Settings (Admin Only)
router.put('/', protect, authorize('admin', 'owner'), async (req, res) => {
    try {
        let settings = await Setting.findOne({ type: 'general' });
        if (!settings) settings = new Setting({ type: 'general' });

        // Deep merge or overwrite sections with safety guards
        if (req.body.companyProfile) {
            const current = settings.companyProfile ? settings.companyProfile.toObject() : {};
            settings.companyProfile = { ...current, ...req.body.companyProfile };
        }
        if (req.body.billing) {
            const current = settings.billing ? settings.billing.toObject() : {};
            settings.billing = { ...current, ...req.body.billing };
        }
        if (req.body.notifications) {
            const current = settings.notifications ? settings.notifications.toObject() : {};
            settings.notifications = { ...current, ...req.body.notifications };
        }
        if (req.body.emailSettings) {
            const current = settings.emailSettings ? settings.emailSettings.toObject() : {};
            settings.emailSettings = { ...current, ...req.body.emailSettings };
        }
        if (req.body.roles) {
            settings.roles = req.body.roles;
        }
        if (req.body.dashboardLayouts) {
            settings.dashboardLayouts = req.body.dashboardLayouts;
            settings.markModified('dashboardLayouts');
        }
        if (req.body.payroll) {
            const current = settings.payroll ? settings.payroll.toObject() : {};
            settings.payroll = { ...current, ...req.body.payroll };
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
