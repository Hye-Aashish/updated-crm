/**
 * Creator-scoped data visibility.
 * - admin / owner → see everything
 * - dashboard.scope.view_all OR module.view_all → see everything in that module
 * - otherwise → only records the user created (plus optional extra OR clauses)
 */

function isAdminOrOwner(user) {
    return !!(user && (user.role === 'admin' || user.role === 'owner'));
}

function ownerIds(user) {
    const id = user?._id;
    if (!id) return [];
    const str = id.toString();
    return [id, str];
}

/**
 * Resolve flat permissions object for a user.
 * Returns null for admin/owner (unrestricted).
 */
async function resolveUserPermissions(user) {
    if (!user) return {};
    if (isAdminOrOwner(user)) return null;

    const { getSettingsPermissions, DEFAULT_ROLE_PERMISSIONS } = require('../middleware/authMiddleware');
    const normalizeRoleKey = (r) => (r || '').toLowerCase().replace(/[\s_-]+/g, '');
    const normUserRole = normalizeRoleKey(user.role);

    try {
        const roles = await getSettingsPermissions();
        if (roles && roles.length) {
            const roleConfig = roles.find(
                (r) =>
                    normalizeRoleKey(r.name) === normUserRole ||
                    normalizeRoleKey(r.label) === normUserRole
            );
            if (roleConfig) return roleConfig.permissions || {};
        }
    } catch (e) {
        console.error('resolveUserPermissions:', e.message);
    }

    return DEFAULT_ROLE_PERMISSIONS[user.role] || {};
}

async function canViewAllRecords(user, module) {
    if (isAdminOrOwner(user)) return true;
    const perms = await resolveUserPermissions(user);
    if (!perms) return true;
    if (perms.dashboard?.scope?.view_all) return true;
    if (module && perms[module]?.view_all) return true;
    // Legacy aliases used in some controllers
    if (module === 'leads' && perms.leads?.view_all) return true;
    if (module === 'clients' && perms.clients?.view_all) return true;
    return false;
}

/**
 * Build / merge a Mongo filter so non-privileged users only see their own rows.
 * @param {object} baseFilter existing filter
 * @param {object} user req.user
 * @param {string} module permission module key
 * @param {object} options
 *   - field: createdBy field name (default 'createdBy')
 *   - extraOr: additional $or clauses (e.g. { assignedTo: userId })
 *   - clientFilter: applied when role === 'client'
 */
async function applyCreatorScope(baseFilter, user, module, options = {}) {
    const field = options.field || 'createdBy';
    const extraOr = Array.isArray(options.extraOr) ? options.extraOr : [];

    if (!user) return { _id: null };

    if (user.role === 'client' && options.clientFilter) {
        return { ...(baseFilter || {}), ...options.clientFilter };
    }

    if (await canViewAllRecords(user, module)) {
        return baseFilter && Object.keys(baseFilter).length ? baseFilter : {};
    }

    const ids = ownerIds(user);
    const ownerOr = [
        { [field]: { $in: ids } },
        ...extraOr
    ];

    if (!baseFilter || Object.keys(baseFilter).length === 0) {
        return { $or: ownerOr };
    }

    return { $and: [baseFilter, { $or: ownerOr }] };
}

/**
 * Guard a single document: creator, view_all, admin, or matching extra predicates.
 */
async function assertCreatorAccess(user, doc, module, options = {}) {
    if (!user || !doc) return { ok: false, status: 401, message: 'Not authorized' };
    if (await canViewAllRecords(user, module)) return { ok: true };

    if (user.role === 'client' && typeof options.clientCheck === 'function') {
        return options.clientCheck(user, doc)
            ? { ok: true }
            : { ok: false, status: 403, message: 'Permission Denied: You do not have access to this record.' };
    }

    const field = options.field || 'createdBy';
    const raw = doc[field];
    const creatorId = raw?._id ? raw._id.toString() : String(raw || '');
    const uid = user._id.toString();

    if (creatorId && creatorId === uid) return { ok: true };

    if (typeof options.extraCheck === 'function' && options.extraCheck(user, doc)) {
        return { ok: true };
    }

    return {
        ok: false,
        status: 403,
        message: 'Permission Denied: You can only access records you created.'
    };
}

module.exports = {
    isAdminOrOwner,
    resolveUserPermissions,
    canViewAllRecords,
    applyCreatorScope,
    assertCreatorAccess,
    ownerIds
};
