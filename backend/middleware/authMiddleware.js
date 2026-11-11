const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET;

// ── In-Memory Permission Cache (5 min TTL) ───────────────────────────────────
let _permissionCache = null;
let _permissionCacheAt = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

async function getSettingsPermissions() {
    const now = Date.now();
    if (_permissionCache && (now - _permissionCacheAt) < CACHE_TTL_MS) {
        return _permissionCache;
    }
    try {
        const Setting = require('../models/Setting');
        const settings = await Setting.findOne({ type: 'general' });
        if (settings && settings.roles && settings.roles.length > 0) {
            _permissionCache = settings.roles;
            _permissionCacheAt = now;
            return _permissionCache;
        }
    } catch (e) {
        console.error('Permission cache fetch error:', e.message);
    }
    return null;
}

// Call this whenever roles are updated (e.g., from settingRoutes PUT)
function clearPermissionCache() {
    _permissionCache = null;
    _permissionCacheAt = 0;
}

// ── Default permissions fallback (matches settingRoutes.js defaultRoles) ─────
const DEFAULT_ROLE_PERMISSIONS = {
    admin: {
        dashboard: { view: true, view_revenue: true, view_stats: true },
        calendar: { view: true, create: true, edit: true, delete: true },
        sales_dashboard: { view: true, view_revenue: true, view_team_stats: true },
        user_tracker: { view: true, manage: true },
        screen_monitoring: { view: true, view_history: true, delete_logs: true, realtime_watch: true },
        clients: { view: true, create: true, edit: true, delete: true },
        projects: { view: true, create: true, edit: true, delete: true, view_budget: true, manage_team: true },
        products: { view: true, create: true, edit: true, delete: true },
        tasks: { view: true, create: true, edit: true, delete: true, assign_others: true, change_priority: true },
        my_day: { view: true, manage: true },
        templates: { view: true, create: true, edit: true, delete: true },
        leads: { view: true, create: true, edit: true, delete: true, claim: true, change_stage: true, transfer: true },
        leads_form: { view: true, create: true, edit: true, delete: true },
        sales_automations: { view: true, create: true, edit: true, delete: true },
        contracts: { view: true, create: true, edit: true, delete: true, download: true },
        quotations: { view: true, create: true, edit: true, delete: true },
        campaigns: { view: true, create: true, edit: true, delete: true, send: true },
        invoices: { view: true, create: true, edit: true, delete: true, mark_paid: true, send_whatsapp: true, send_email: true },
        credit_notes: { view: true, create: true, edit: true, delete: true },
        vendor_bills: { view: true, create: true, edit: true, delete: true, mark_paid: true },
        gst_reports: { view: true, export: true },
        expenses: { view: true, create: true, edit: true, delete: true },
        payroll: { view: true, manage: true, generate_slips: true, set_salaries: true },
        billing_settings: { view: true, edit: true },
        amc: { view: true, create: true, edit: true, delete: true },
        domains: { view: true, create: true, edit: true, delete: true },
        hosting: { view: true, create: true, edit: true, delete: true },
        expiry_alerts: { view: true, manage: true },
        team: { view: true, create: true, edit: true, delete: true },
        attendance: { view: true, manage: true, manage_all: true, edit_logs: true, approve_leaves: true },
        time_tracking: { view: true, manage: true, manage_all: true, edit_entries: true },
        capacity_planning: { view: true, manage: true },
        approvals: { view: true, approve: true, reject: true },
        offer_letters: { view: true, create: true, edit: true, delete: true, download: true },
        goals: { view: true, create: true, edit: true, delete: true },
        tickets: { view: true, create: true, edit: true, delete: true },
        project_chat: { view: true, message: true, view_others: true },
        chat: { view: true, reply: true, delete_history: true },
        reports: { view: true, export: true, view_financial_reports: true },
        files: { view: true, upload: true, delete: true, download: true },
        ai_assistant: { use: true, manage_keys: true, view_logs: true },
        settings: { view: true, edit: true, edit_profile: true, edit_smtp: true, edit_api: true, manage_billing: true },
        roles: { view: true, create: true, edit: true, delete: true }
    },
    pm: {
        dashboard: { view: true, view_revenue: false, view_stats: true },
        calendar: { view: true, create: true, edit: true, delete: false },
        sales_dashboard: { view: false },
        user_tracker: { view: true, manage: false },
        screen_monitoring: { view: false },
        clients: { view: true, create: true, edit: true, delete: false },
        projects: { view: true, create: true, edit: true, delete: false, view_budget: true, manage_team: true },
        products: { view: true, create: false, edit: false, delete: false },
        tasks: { view: true, create: true, edit: true, delete: true, assign_others: true, change_priority: true },
        my_day: { view: true, manage: true },
        templates: { view: true, create: true, edit: false, delete: false },
        leads: { view: true, create: true, edit: true, delete: false, claim: true, change_stage: true, transfer: false },
        leads_form: { view: true, create: false, edit: false, delete: false },
        sales_automations: { view: false },
        contracts: { view: true, create: false, edit: false, delete: false, download: true },
        quotations: { view: true, create: true, edit: true, delete: false },
        campaigns: { view: false },
        invoices: { view: true, create: true, edit: true, delete: false, mark_paid: false, send_whatsapp: true, send_email: true },
        credit_notes: { view: false },
        vendor_bills: { view: false },
        gst_reports: { view: false },
        expenses: { view: true, create: true, edit: true, delete: false },
        payroll: { view: false, manage: false },
        billing_settings: { view: false, edit: false },
        amc: { view: true, create: true, edit: true, delete: false },
        domains: { view: true, create: false, edit: false, delete: false },
        hosting: { view: true, create: false, edit: false, delete: false },
        expiry_alerts: { view: true, manage: false },
        team: { view: true, create: false, edit: false, delete: false },
        attendance: { view: true, manage: false, manage_all: false, edit_logs: false, approve_leaves: false },
        time_tracking: { view: true, manage: true, manage_all: false, edit_entries: false },
        capacity_planning: { view: true, manage: true },
        approvals: { view: true, approve: true, reject: true },
        offer_letters: { view: false },
        goals: { view: true, create: true, edit: true, delete: false },
        tickets: { view: true, create: true, edit: true, delete: false },
        project_chat: { view: true, message: true, view_others: true },
        chat: { view: true, reply: true },
        reports: { view: true, export: true },
        files: { view: true, upload: true, delete: false, download: true },
        ai_assistant: { use: true, manage_keys: false },
        settings: { view: true, edit: false },
        roles: { view: false }
    },
    developer: {
        dashboard: { view: true, view_revenue: false, view_stats: false },
        calendar: { view: true, create: true, edit: true, delete: false },
        sales_dashboard: { view: false },
        user_tracker: { view: false },
        screen_monitoring: { view: false },
        clients: { view: true, create: false, edit: false, delete: false },
        projects: { view: true, create: false, edit: false, delete: false, view_budget: false, manage_team: false },
        products: { view: true, create: false, edit: false, delete: false },
        tasks: { view: true, create: true, edit: true, delete: false, assign_others: false, change_priority: false },
        my_day: { view: true, manage: true },
        templates: { view: false },
        leads: { view: false },
        leads_form: { view: false },
        sales_automations: { view: false },
        contracts: { view: false },
        quotations: { view: false },
        campaigns: { view: false },
        invoices: { view: false },
        credit_notes: { view: false },
        vendor_bills: { view: false },
        gst_reports: { view: false },
        expenses: { view: true, create: true, edit: false, delete: false },
        payroll: { view: true, manage: false },
        billing_settings: { view: false },
        amc: { view: false },
        domains: { view: false },
        hosting: { view: false },
        expiry_alerts: { view: false },
        team: { view: true, create: false, edit: false, delete: false },
        attendance: { view: true, manage: false },
        time_tracking: { view: true, manage: false },
        capacity_planning: { view: false },
        approvals: { view: false },
        offer_letters: { view: false },
        goals: { view: true, create: false, edit: false, delete: false },
        tickets: { view: true, create: true, edit: true, delete: false },
        project_chat: { view: true, message: true },
        chat: { view: true, reply: true },
        reports: { view: false },
        files: { view: true, upload: true, delete: false, download: true },
        ai_assistant: { use: true, manage_keys: false },
        settings: { view: false },
        roles: { view: false }
    },
    employee: {
        dashboard: { view: true },
        calendar: { view: true, create: true, edit: true, delete: false },
        sales_dashboard: { view: false },
        user_tracker: { view: false },
        screen_monitoring: { view: false },
        clients: { view: true, create: false, edit: false, delete: false },
        projects: { view: true, create: false, edit: false, delete: false },
        products: { view: false },
        tasks: { view: true, create: true, edit: true, delete: false },
        my_day: { view: true, manage: true },
        templates: { view: false },
        leads: { view: false },
        leads_form: { view: false },
        sales_automations: { view: false },
        contracts: { view: false },
        quotations: { view: true, create: true, edit: false, delete: false },
        campaigns: { view: false },
        invoices: { view: false },
        credit_notes: { view: false },
        vendor_bills: { view: false },
        gst_reports: { view: false },
        expenses: { view: true, create: true, edit: false, delete: false },
        payroll: { view: true, manage: false },
        billing_settings: { view: false },
        amc: { view: false },
        domains: { view: false },
        hosting: { view: false },
        expiry_alerts: { view: false },
        team: { view: false },
        attendance: { view: true, manage: false },
        time_tracking: { view: true, manage: false },
        capacity_planning: { view: false },
        approvals: { view: false },
        offer_letters: { view: false },
        goals: { view: false },
        tickets: { view: true, create: true, edit: true, delete: false },
        project_chat: { view: true, message: true },
        chat: { view: true, reply: true },
        reports: { view: false },
        files: { view: true, upload: true, delete: false },
        ai_assistant: { use: false },
        settings: { view: false },
        roles: { view: false }
    },
    client: {
        dashboard: { view: true },
        calendar: { view: false },
        sales_dashboard: { view: false },
        user_tracker: { view: false },
        screen_monitoring: { view: false },
        clients: { view: false },
        projects: { view: true, create: false, edit: false, delete: false },
        products: { view: false },
        tasks: { view: true, create: false, edit: false, delete: false },
        my_day: { view: false },
        templates: { view: false },
        leads: { view: false },
        leads_form: { view: false },
        sales_automations: { view: false },
        contracts: { view: false },
        quotations: { view: false },
        campaigns: { view: false },
        invoices: { view: true, create: false, edit: false, delete: false },
        credit_notes: { view: false },
        vendor_bills: { view: false },
        gst_reports: { view: false },
        expenses: { view: false },
        payroll: { view: false },
        billing_settings: { view: false },
        amc: { view: false },
        domains: { view: false },
        hosting: { view: false },
        expiry_alerts: { view: false },
        team: { view: false },
        attendance: { view: false },
        time_tracking: { view: false },
        capacity_planning: { view: false },
        approvals: { view: false },
        offer_letters: { view: false },
        goals: { view: false },
        tickets: { view: true, create: true, edit: false, delete: false },
        project_chat: { view: true, message: true },
        chat: { view: true, reply: true },
        reports: { view: false },
        files: { view: true, upload: true, delete: false },
        ai_assistant: { use: false },
        settings: { view: true },
        roles: { view: false }
    },
    sales: {
        dashboard: { view: true, view_revenue: true, view_stats: true },
        calendar: { view: true, create: true, edit: true, delete: false },
        sales_dashboard: { view: true, view_revenue: true, view_team_stats: true },
        user_tracker: { view: false },
        screen_monitoring: { view: false },
        clients: { view: true, create: true, edit: true, delete: false },
        projects: { view: false },
        products: { view: true, create: false, edit: false, delete: false },
        tasks: { view: true, create: true, edit: true, delete: false },
        my_day: { view: true, manage: true },
        templates: { view: false },
        leads: { view: true, create: true, edit: true, delete: false, claim: true, change_stage: true, transfer: true },
        leads_form: { view: true, create: true, edit: true, delete: false },
        sales_automations: { view: true, create: true, edit: true, delete: false },
        contracts: { view: true, create: true, edit: true, delete: false, download: true },
        quotations: { view: true, create: true, edit: true, delete: false },
        campaigns: { view: true, create: true, edit: true, delete: false, send: true },
        invoices: { view: true, create: true, edit: false, delete: false, mark_paid: false, send_whatsapp: true, send_email: true },
        credit_notes: { view: false },
        vendor_bills: { view: false },
        gst_reports: { view: false },
        expenses: { view: true, create: true, edit: false, delete: false },
        payroll: { view: true, manage: false },
        billing_settings: { view: false },
        amc: { view: true, create: true, edit: false, delete: false },
        domains: { view: true, create: true, edit: false, delete: false },
        hosting: { view: true, create: true, edit: false, delete: false },
        expiry_alerts: { view: true, manage: false },
        team: { view: false },
        attendance: { view: true, manage: false },
        time_tracking: { view: true, manage: false },
        capacity_planning: { view: false },
        approvals: { view: false },
        offer_letters: { view: false },
        goals: { view: true, create: false, edit: false, delete: false },
        tickets: { view: true, create: true, edit: false, delete: false },
        project_chat: { view: false },
        chat: { view: true, reply: true },
        reports: { view: true, export: true },
        files: { view: true, upload: true, delete: false, download: true },
        ai_assistant: { use: true },
        settings: { view: false },
        roles: { view: false }
    }
};

// ── Middleware: protect (JWT) ─────────────────────────────────────────────────
const protect = async (req, res, next) => {
    let token;

    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
        return res.status(401).json({ message: 'Not authorized, no token' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = await User.findById(decoded.id).select('-password');

        if (!req.user) {
            return res.status(401).json({ message: 'User not found' });
        }

        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ message: 'Token expired, please login again' });
        }
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ message: 'Invalid token' });
        }
        return res.status(401).json({ message: 'Not authorized, token failed' });
    }
};

// ── Middleware: authorize (simple role check) ─────────────────────────────────
const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ message: 'Not authenticated' });
        }
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                message: 'Access denied. Insufficient permissions.'
            });
        }
        next();
    };
};

// ── Middleware: checkPermission (DB-driven, cached, with default fallback) ────
const checkPermission = (module, action) => {
    return async (req, res, next) => {
        if (!req.user) return res.status(401).json({ message: 'Not authenticated' });

        // Owners and Admins always bypass
        if (req.user.role === 'owner' || req.user.role === 'admin') return next();

        const userRole = req.user.role;

        try {
            const normalizeRoleKey = (r) => (r || '').toLowerCase().replace(/[\s_-]+/g, '');
            const normUserRole = normalizeRoleKey(userRole);

            // 1. Try to get permissions from DB (cached)
            const roles = await getSettingsPermissions();
            if (roles) {
                const roleConfig = roles.find(r =>
                    normalizeRoleKey(r.name) === normUserRole || normalizeRoleKey(r.label) === normUserRole
                );
                if (roleConfig) {
                    const perms = roleConfig.permissions || {};
                    const modulePerms = perms[module] || {};
                    if (modulePerms[action]) return next();
                    return res.status(403).json({
                        message: `Permission Denied: No '${action}' access for '${module}'.`
                    });
                }
            }

            // 2. Fallback to hardcoded defaults (safe — DB not configured yet)
            const defaultPerms = DEFAULT_ROLE_PERMISSIONS[userRole];
            if (defaultPerms) {
                const modulePerms = defaultPerms[module] || {};
                if (modulePerms[action]) return next();
                return res.status(403).json({
                    message: `Permission Denied: No '${action}' access for '${module}'.`
                });
            }

            // 3. Unknown role — deny
            return res.status(403).json({ message: `Role '${userRole}' is not recognized.` });
        } catch (error) {
            console.error('Permission check error:', error);
            res.status(500).json({ message: 'Internal Server Error during permission check' });
        }
    };
};

module.exports = { protect, authorize, checkPermission, clearPermissionCache };
