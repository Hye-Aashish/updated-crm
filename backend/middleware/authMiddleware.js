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
        dashboard: { view: true },
        clients: { view: true, create: true, edit: true, delete: true },
        leads: { view: true, create: true, edit: true, delete: true },
        projects: { view: true, create: true, edit: true, delete: true },
        tasks: { view: true, create: true, edit: true, delete: true },
        team: { view: true, create: true, edit: true, delete: true },
        attendance: { view: true, manage: true, manage_all: true },
        time_tracking: { view: true, manage: true, manage_all: true },
        invoices: { view: true, create: true, edit: true, delete: true, mark_paid: true },
        amc: { view: true, create: true, edit: true, delete: true },
        domains: { view: true, create: true, edit: true, delete: true },
        hosting: { view: true, create: true, edit: true, delete: true },
        expiry_alerts: { view: true },
        quotations: { view: true, create: true, edit: true, delete: true },
        expenses: { view: true, create: true, edit: true, delete: true },
        payroll: { view: true, manage: true },
        tickets: { view: true, create: true, edit: true, delete: true },
        chat: { view: true, reply: true },
        project_chat: { view: true, message: true },
        reports: { view: true, export: true },
        files: { view: true, upload: true, delete: true, download: true },
        ai_assistant: { use: true },
        settings: { view: true, edit: true },
        roles: { view: true, create: true, edit: true, delete: true }
    },
    pm: {
        dashboard: { view: true },
        clients: { view: true, create: true, edit: true, delete: false },
        leads: { view: true, create: true, edit: true, delete: false },
        projects: { view: true, create: true, edit: true, delete: false },
        tasks: { view: true, create: true, edit: true, delete: true },
        team: { view: true, create: false, edit: false, delete: false },
        attendance: { view: true, manage: false },
        time_tracking: { view: true, manage: true },
        invoices: { view: true, create: true, edit: true, delete: false },
        amc: { view: true, create: true, edit: true, delete: false },
        domains: { view: true, create: false, edit: false, delete: false },
        hosting: { view: true, create: false, edit: false, delete: false },
        expiry_alerts: { view: true },
        quotations: { view: true, create: true, edit: true, delete: false },
        expenses: { view: true, create: true, edit: true, delete: false },
        payroll: { view: false },
        tickets: { view: true, create: true, edit: true, delete: false },
        chat: { view: true, reply: true },
        project_chat: { view: true, message: true },
        reports: { view: true },
        files: { view: true, upload: true, delete: false, download: true },
        ai_assistant: { use: true },
        settings: { view: true, edit: false },
        roles: { view: false }
    },
    developer: {
        dashboard: { view: true },
        clients: { view: true, create: false, edit: false, delete: false },
        leads: { view: false },
        projects: { view: true, create: false, edit: false, delete: false },
        tasks: { view: true, create: true, edit: true, delete: false },
        team: { view: true, create: false, edit: false, delete: false },
        attendance: { view: true, manage: false },
        time_tracking: { view: true, manage: false },
        invoices: { view: false },
        amc: { view: false },
        domains: { view: false },
        hosting: { view: false },
        expiry_alerts: { view: false },
        quotations: { view: false },
        expenses: { view: true, create: true, edit: false, delete: false },
        payroll: { view: true, manage: false },
        tickets: { view: true, create: true, edit: true, delete: false },
        chat: { view: true, reply: true },
        project_chat: { view: true, message: true },
        reports: { view: false },
        files: { view: true, upload: true, delete: false, download: true },
        ai_assistant: { use: true },
        settings: { view: false },
        roles: { view: false }
    },
    employee: {
        dashboard: { view: true },
        clients: { view: true, create: false, edit: false, delete: false },
        leads: { view: false },
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
        expenses: { view: true, create: true, edit: false, delete: false },
        payroll: { view: true, manage: false },
        tickets: { view: true, create: true, edit: true, delete: false },
        chat: { view: true, reply: true },
        project_chat: { view: true, message: true },
        reports: { view: false },
        files: { view: true, upload: true, delete: false, download: true },
        ai_assistant: { use: false },
        settings: { view: false },
        roles: { view: false }
    },
    client: {
        dashboard: { view: true },
        clients: { view: false },
        leads: { view: false },
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
        expenses: { view: false },
        payroll: { view: false },
        tickets: { view: true, create: true, edit: false, delete: false },
        chat: { view: true, reply: true },
        project_chat: { view: true, message: true },
        reports: { view: false },
        files: { view: true, upload: true, delete: false, download: true },
        ai_assistant: { use: false },
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
            // 1. Try to get permissions from DB (cached)
            const roles = await getSettingsPermissions();
            if (roles) {
                const roleConfig = roles.find(r => r.name === userRole);
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
