const express = require('express');
const router = express.Router();
const Setting = require('../models/Setting');
const { protect, authorize } = require('../middleware/authMiddleware');

const defaultRoles = [
    {
        name: 'admin', label: 'Administrator',
        permissions: {
            dashboard: { view: true, view_revenue: true, view_stats: true },
            user_tracker: { view: true },
            screen_monitoring: { view: true, view_history: true, delete_logs: true, realtime_watch: true },
            clients: { view: true, create: true, edit: true, delete: true },
            leads: { view: true, create: true, edit: true, delete: true, claim: true, change_stage: true, transfer: true },
            leads_form: { view: true, create: true, edit: true, delete: true },
            projects: { view: true, create: true, edit: true, delete: true, view_budget: true, manage_team: true },
            tasks: { view: true, create: true, edit: true, delete: true, assign_others: true, change_priority: true },
            team: { view: true, create: true, edit: true, delete: true },
            attendance: { view: true, manage: true, manage_all: true, edit_logs: true, approve_leaves: true },
            time_tracking: { view: true, manage: true, manage_all: true, edit_entries: true },
            invoices: { view: true, create: true, edit: true, delete: true, mark_paid: true, send_whatsapp: true, send_email: true },
            amc: { view: true, create: true, edit: true, delete: true },
            domains: { view: true, create: true, edit: true, delete: true },
            hosting: { view: true, create: true, edit: true, delete: true },
            expiry_alerts: { view: true },
            quotations: { view: true, create: true, edit: true, delete: true },
            templates: { view: true, create: true, edit: true, delete: true },
            expenses: { view: true, create: true, edit: true, delete: true },
            payroll: { view: true, manage: true, generate_slips: true, set_salaries: true },
            tickets: { view: true, create: true, edit: true, delete: true },
            chat: { view: true, reply: true, delete_history: true },
            project_chat: { view: true, message: true, view_others: true },
            reports: { view: true, export: true, view_financial_reports: true },
            files: { view: true, upload: true, delete: true, download: true },
            ai_assistant: { use: true, manage_keys: true, view_logs: true },
            settings: { view: true, edit: true, edit_profile: true, edit_smtp: true, edit_api: true, manage_billing: true },
            roles: { view: true, create: true, edit: true, delete: true }
        }
    },
    {
        name: 'pm', label: 'Project Manager',
        permissions: {
            dashboard: { view: true, view_revenue: false, view_stats: true },
            user_tracker: { view: true },
            screen_monitoring: { view: false },
            clients: { view: true, create: true, edit: true, delete: false },
            leads: { view: true, create: true, edit: true, delete: false, claim: true, change_stage: true, transfer: false },
            leads_form: { view: true, create: false, edit: false, delete: false },
            projects: { view: true, create: true, edit: true, delete: false, view_budget: true, manage_team: true },
            tasks: { view: true, create: true, edit: true, delete: true, assign_others: true, change_priority: true },
            team: { view: true, create: false, edit: false, delete: false },
            attendance: { view: true, manage: false, manage_all: false, edit_logs: false, approve_leaves: false },
            time_tracking: { view: true, manage: true, manage_all: false, edit_entries: false },
            invoices: { view: true, create: true, edit: true, delete: false, mark_paid: false, send_whatsapp: true, send_email: true },
            amc: { view: true, create: true, edit: true, delete: false },
            domains: { view: true, create: false, edit: false, delete: false },
            hosting: { view: true, create: false, edit: false, delete: false },
            expiry_alerts: { view: true },
            quotations: { view: true, create: true, edit: true, delete: false },
            templates: { view: true, create: true, edit: false, delete: false },
            expenses: { view: true, create: true, edit: true, delete: false },
            payroll: { view: false, manage: false },
            tickets: { view: true, create: true, edit: true, delete: false },
            chat: { view: true, reply: true },
            project_chat: { view: true, message: true, view_others: true },
            reports: { view: true, export: true },
            files: { view: true, upload: true, delete: false, download: true },
            ai_assistant: { use: true, manage_keys: false },
            settings: { view: true, edit: false },
            roles: { view: false }
        }
    },
    {
        name: 'developer', label: 'Developer',
        permissions: {
            dashboard: { view: true, view_revenue: false, view_stats: false },
            user_tracker: { view: false },
            screen_monitoring: { view: false },
            clients: { view: true, create: false, edit: false, delete: false },
            leads: { view: false },
            leads_form: { view: false },
            projects: { view: true, create: false, edit: false, delete: false, view_budget: false, manage_team: false },
            tasks: { view: true, create: true, edit: true, delete: false, assign_others: false, change_priority: false },
            team: { view: true, create: false, edit: false, delete: false },
            attendance: { view: true, manage: false },
            time_tracking: { view: true, manage: false },
            invoices: { view: false },
            amc: { view: false },
            domains: { view: false },
            hosting: { view: false },
            expiry_alerts: { view: false },
            quotations: { view: false },
            templates: { view: false },
            expenses: { view: true, create: true, edit: false, delete: false },
            payroll: { view: true, manage: false },
            tickets: { view: true, create: true, edit: true, delete: false },
            chat: { view: true, reply: true },
            project_chat: { view: true, message: true },
            reports: { view: false },
            files: { view: true, upload: true, delete: false, download: true },
            ai_assistant: { use: true, manage_keys: false },
            settings: { view: false },
            roles: { view: false }
        }
    },
    {
        name: 'employee', label: 'Employee',
        permissions: {
            dashboard: { view: true },
            user_tracker: { view: false },
            screen_monitoring: { view: false },
            clients: { view: true, create: false, edit: false, delete: false },
            leads: { view: false },
            leads_form: { view: false },
            projects: { view: true, create: false, edit: false, delete: false },
            tasks: { view: true, create: true, edit: true, delete: false },
            team: { view: false },
            attendance: { view: true, manage: false },
            time_tracking: { view: true, manage: false },
            invoices: { view: false },
            amc: { view: false },
            domains: { view: false },
            hosting: { view: false },
            expiry_alerts: { view: false },
            quotations: { view: true, create: true, edit: false, delete: false },
            templates: { view: true, create: false, edit: false, delete: false },
            expenses: { view: true, create: true, edit: false, delete: false },
            payroll: { view: true, manage: false },
            tickets: { view: true, create: true, edit: true, delete: false },
            chat: { view: true, reply: true },
            project_chat: { view: true, message: true },
            reports: { view: false },
            files: { view: true, upload: true, delete: false },
            ai_assistant: { use: false },
            settings: { view: false },
            roles: { view: false }
        }
    },
    {
        name: 'client', label: 'Client',
        permissions: {
            dashboard: { view: true },
            user_tracker: { view: false },
            screen_monitoring: { view: false },
            clients: { view: false },
            leads: { view: false },
            leads_form: { view: false },
            projects: { view: true, create: false, edit: false, delete: false },
            tasks: { view: true, create: false, edit: false, delete: false },
            team: { view: false },
            attendance: { view: false },
            time_tracking: { view: false },
            invoices: { view: true, create: false, edit: false, delete: false },
            amc: { view: false },
            domains: { view: false },
            hosting: { view: false },
            expiry_alerts: { view: false },
            quotations: { view: false },
            templates: { view: false },
            expenses: { view: false },
            payroll: { view: false },
            tickets: { view: true, create: true, edit: false, delete: false },
            chat: { view: true, reply: true },
            project_chat: { view: true, message: true },
            reports: { view: false },
            files: { view: true, upload: true, delete: false },
            ai_assistant: { use: false },
            settings: { view: false },
            roles: { view: false }
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

        // For non-admin, filter out ALL sensitive data
        const publicSettings = settings.toObject();

        // Remove all sensitive billing data
        if (publicSettings.billing) {
            delete publicSettings.billing.razorpaySecret;
            delete publicSettings.billing.razorpayKey;
            delete publicSettings.billing.cashfreeClientId;
            delete publicSettings.billing.cashfreeClientSecret;
            delete publicSettings.billing.cashfreeMode;
        }

        // Remove all sensitive email/SMTP data
        if (publicSettings.emailSettings) {
            delete publicSettings.emailSettings.pass;
            delete publicSettings.emailSettings.user;
            delete publicSettings.emailSettings.host;
            delete publicSettings.emailSettings.port;
        }

        // Remove API keys from non-admin view
        delete publicSettings.apiKeys;

        // Return limited view (roles are kept for frontend sidebar permissions)
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
        if (req.body.apiKeys) {
            const current = settings.apiKeys ? settings.apiKeys.toObject() : {};
            settings.apiKeys = { ...current, ...req.body.apiKeys };
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
            },
            tls: {
                rejectUnauthorized: false // Allow self-signed certs (common on shared hosting)
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
