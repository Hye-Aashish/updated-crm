const Client = require('../models/Client');
const Project = require('../models/Project');

function isPrivileged(user) {
    return user && (user.role === 'admin' || user.role === 'owner');
}

/**
 * Invoice access: client → own clientId; staff → assigned client / PM; admin/owner → all.
 */
async function assertInvoiceAccess(req, invoice) {
    if (!req.user || !invoice) {
        return { ok: false, status: 401, message: 'Not authorized' };
    }
    if (isPrivileged(req.user)) return { ok: true };

    const userId = req.user._id.toString();
    const invoiceClientId = invoice.clientId?.toString?.() || String(invoice.clientId || '');

    if (req.user.role === 'client') {
        const own = req.user.clientId?.toString?.() || '';
        if (!own || own !== invoiceClientId) {
            return { ok: false, status: 403, message: 'Not authorized' };
        }
        return { ok: true };
    }

    const client = await Client.findById(invoice.clientId);
    const project = invoice.projectId ? await Project.findById(invoice.projectId) : null;
    const isClientOwner = client && client.assignedTo === userId;
    const isPM = project && project.pmId === userId;
    const memberList = project?.members || project?.teamMembers || [];
    const isMember = Array.isArray(memberList) && memberList.map(String).includes(userId);

    if (!isClientOwner && !isPM && !isMember) {
        return { ok: false, status: 403, message: 'Not authorized to access this invoice' };
    }
    return { ok: true };
}

/**
 * Client record access (mirrors getClientById rules).
 */
async function assertClientAccess(req, client) {
    if (!req.user || !client) {
        return { ok: false, status: 401, message: 'Not authorized' };
    }
    if (isPrivileged(req.user)) return { ok: true };

    const clientId = client._id.toString();

    if (req.user.role === 'client') {
        const own = req.user.clientId?.toString?.() || '';
        if (!own || own !== clientId) {
            return { ok: false, status: 403, message: 'Not authorized to view this client' };
        }
        return { ok: true };
    }

    const userId = req.user._id.toString();
    if (client.assignedTo === userId) return { ok: true };

    const linked = await Project.exists({
        clientId: clientId,
        $or: [{ pmId: userId }, { members: userId }]
    });
    if (!linked) {
        return { ok: false, status: 403, message: 'Not authorized to view this client' };
    }
    return { ok: true };
}

module.exports = { assertInvoiceAccess, assertClientAccess, isPrivileged };
