const express = require('express');
const router = express.Router();
const clientController = require('../controllers/clientController');
const { protect, authorize, checkPermission } = require('../middleware/authMiddleware');
const { assertClientAccess } = require('../utils/assertAccess');
const upload = require('../utils/multerConfig');

// Public routes for onboarding & self-registration
router.post('/public/onboarding', clientController.createPublicClient);
router.get('/public/onboarding-config', clientController.getPublicGeneralOnboardingConfig);
router.post('/public/onboarding/upload', upload.uploadPrivate.single('file'), clientController.uploadGeneralOnboardingFile);

// Public routes for tailored client-specific onboarding forms
router.get('/public/onboarding-form/:token', clientController.getPublicOnboardingForm);
router.post('/public/onboarding-form/:token/upload', upload.uploadPrivate.single('file'), clientController.uploadOnboardingFile);
router.post('/public/onboarding-form/:token/submit', clientController.submitPublicOnboardingForm);

const allowClientRoleOrPermission = (action) => (req, res, next) => {
    if (req.user && req.user.role === 'client') return next();
    return checkPermission('clients', action)(req, res, next);
};

// Onboarding template management routes (MUST be before /:id)
router.get('/onboarding-templates', protect, clientController.getOnboardingTemplates);
router.post('/onboarding-templates', protect, checkPermission('clients', 'edit'), clientController.createOnboardingTemplate);
router.put('/onboarding-templates/:id', protect, checkPermission('clients', 'edit'), clientController.updateOnboardingTemplate);
router.delete('/onboarding-templates/:id', protect, checkPermission('clients', 'edit'), clientController.deleteOnboardingTemplate);

// Protected routes for managing client onboarding
router.post('/:id/onboarding/generate', protect, checkPermission('clients', 'edit'), clientController.generateOnboardingLink);
router.put('/:id/onboarding/config', protect, checkPermission('clients', 'edit'), clientController.updateOnboardingConfig);
router.post('/:id/onboarding/reset', protect, checkPermission('clients', 'edit'), clientController.resetOnboardingStatus);

// Protected routes for managing client portal credentials (Admin ID/Password assignment)
router.get('/:id/portal-access', protect, allowClientRoleOrPermission('view'), clientController.getClientPortalAccess);
router.post('/:id/portal-access', protect, checkPermission('clients', 'edit'), clientController.setClientPortalAccess);
router.delete('/:id/portal-access', protect, checkPermission('clients', 'edit'), clientController.disableClientPortalAccess);

router.get('/', protect, allowClientRoleOrPermission('view'), clientController.getClients);

// Client health score (computed; caches optional healthScore)
// Client 360 unified timeline
router.get('/:id/timeline', protect, allowClientRoleOrPermission('view'), async (req, res) => {
    try {
        const Client = require('../models/Client');
        const Project = require('../models/Project');
        const Invoice = require('../models/Invoice');
        const Ticket = require('../models/Ticket');
        const Lead = require('../models/Lead');
        const ProjectActivity = require('../models/ProjectActivity');
        const Amc = require('../models/Amc');
        let Retainer;
        try { Retainer = require('../models/Retainer'); } catch (_) { Retainer = null; }

        const client = await Client.findById(req.params.id).lean();
        if (!client) return res.status(404).json({ message: 'Client not found' });

        const access = await assertClientAccess(req, client);
        if (!access.ok) return res.status(access.status).json({ message: access.message });

        const clientId = req.params.id;
        const projects = await Project.find({ clientId: clientId.toString() }).lean();
        const projectIds = projects.map((p) => p._id.toString());

        const [invoices, tickets, leads, activities, amcs, retainers] = await Promise.all([
            Invoice.find({ clientId: clientId.toString() }).sort({ date: -1 }).limit(50).lean(),
            Ticket.find({ clientId: clientId.toString() }).sort({ createdAt: -1 }).limit(50).select('-screenshot').lean(),
            (client.email || client.company)
                ? Lead.find({
                    $or: [
                        ...(client.email ? [{ email: client.email }] : []),
                        ...(client.company ? [{ company: client.company }] : [])
                    ]
                }).sort({ updatedAt: -1 }).limit(30).lean().catch(() => [])
                : Promise.resolve([]),
            projectIds.length
                ? ProjectActivity.find({ projectId: { $in: projectIds } }).sort({ createdAt: -1 }).limit(80).lean().catch(() => [])
                : Promise.resolve([]),
            Amc.find({ clientId }).sort({ updatedAt: -1 }).limit(20).lean().catch(() => []),
            Retainer
                ? Retainer.find({ clientId }).sort({ updatedAt: -1 }).limit(20).lean().catch(() => [])
                : Promise.resolve([])
        ]);

        const events = [];

        for (const inv of invoices) {
            events.push({
                id: `inv-${inv._id}`,
                type: 'invoice',
                title: `Invoice ${inv.invoiceNumber}`,
                description: `${inv.status} · ₹${Number(inv.total || 0).toLocaleString('en-IN')}`,
                status: inv.status,
                meta: { invoiceId: inv._id, total: inv.total, amountPaid: inv.amountPaid },
                at: inv.date || inv.createdAt
            });
        }

        for (const t of tickets) {
            events.push({
                id: `tkt-${t._id}`,
                type: 'ticket',
                title: t.subject,
                description: `${t.priority} · ${t.status}${t.slaBreached ? ' · SLA breached' : ''}`,
                status: t.status,
                meta: { ticketId: t._id, priority: t.priority, slaDueAt: t.slaDueAt, slaBreached: t.slaBreached },
                at: t.createdAt
            });
        }

        for (const p of projects) {
            events.push({
                id: `prj-${p._id}`,
                type: 'project',
                title: `Project: ${p.name}`,
                description: `${p.status} · ${p.progress || 0}%`,
                status: p.status,
                meta: { projectId: p._id },
                at: p.createdAt || p.startDate
            });
            if (Array.isArray(p.notes)) {
                for (const n of p.notes) {
                    events.push({
                        id: `note-${p._id}-${n.createdAt}`,
                        type: 'note',
                        title: `Note on ${p.name}`,
                        description: n.text,
                        status: null,
                        meta: { projectId: p._id, by: n.creatorName },
                        at: n.createdAt
                    });
                }
            }
        }

        for (const a of activities) {
            events.push({
                id: `act-${a._id}`,
                type: 'activity',
                title: a.action || 'Project activity',
                description: a.description || '',
                status: null,
                meta: { projectId: a.projectId },
                at: a.createdAt
            });
        }

        for (const l of leads) {
            events.push({
                id: `lead-${l._id}`,
                type: 'lead',
                title: `Lead: ${l.company || l.name}`,
                description: `${l.stage || ''} · ${l.source || ''}`,
                status: l.stage,
                meta: { leadId: l._id },
                at: l.updatedAt || l.createdAt
            });
        }

        for (const a of amcs) {
            events.push({
                id: `amc-${a._id}`,
                type: 'amc',
                title: `AMC: ${a.name}`,
                description: `${a.status} · ₹${Number(a.amount || 0).toLocaleString('en-IN')} / ${a.frequency}`,
                status: a.status,
                meta: { amcId: a._id },
                at: a.updatedAt || a.createdAt
            });
        }

        for (const r of retainers) {
            events.push({
                id: `ret-${r._id}`,
                type: 'retainer',
                title: `Retainer: ${r.name}`,
                description: `${r.status} · ₹${Number(r.amount || 0).toLocaleString('en-IN')} / ${r.frequency}`,
                status: r.status,
                meta: { retainerId: r._id, nextBillingDate: r.nextBillingDate },
                at: r.updatedAt || r.createdAt
            });
        }

        if (client.notes) {
            events.push({
                id: `client-notes`,
                type: 'note',
                title: 'Client notes',
                description: String(client.notes).slice(0, 500),
                status: null,
                meta: {},
                at: client.updatedAt || client.createdAt
            });
        }

        events.sort((a, b) => new Date(b.at || 0) - new Date(a.at || 0));

        res.json({
            clientId,
            clientName: client.company || client.name,
            count: events.length,
            events: events.slice(0, 200)
        });
    } catch (err) {
        console.error('Client timeline error:', err);
        res.status(500).json({ message: err.message });
    }
});

router.get('/:id/health', protect, allowClientRoleOrPermission('view'), async (req, res) => {
    try {
        const Client = require('../models/Client');
        const Invoice = require('../models/Invoice');
        const Ticket = require('../models/Ticket');
        const client = await Client.findById(req.params.id);
        if (!client) return res.status(404).json({ message: 'Client not found' });

        const access = await assertClientAccess(req, client);
        if (!access.ok) return res.status(access.status).json({ message: access.message });

        const invoices = await Invoice.find({ clientId: req.params.id }).lean();
        const overdue = invoices.filter(i => ['overdue', 'pending', 'partially-paid'].includes(i.status) && new Date(i.dueDate) < new Date());
        const unpaidTotal = overdue.reduce((s, i) => s + Math.max(0, (i.total || 0) - (i.amountPaid || 0)), 0);
        const openTickets = await Ticket.countDocuments({
            clientId: req.params.id,
            status: { $nin: ['closed', 'resolved', 'done'] }
        }).catch(() => 0);

        let score = 100;
        score -= Math.min(40, overdue.length * 10);
        score -= Math.min(20, openTickets * 5);
        if (unpaidTotal > 50000) score -= 15;
        else if (unpaidTotal > 10000) score -= 8;
        if (client.status === 'inactive' || client.status === 'on-hold') score -= 15;
        if (client.status === 'active' || client.status === 'confirmed') score += 5;
        score = Math.max(0, Math.min(100, Math.round(score)));

        let label = 'Healthy';
        if (score < 40) label = 'At Risk';
        else if (score < 70) label = 'Watch';

        client.healthScore = score;
        client.healthUpdatedAt = new Date();
        await client.save();

        res.json({
            clientId: client._id,
            score,
            label,
            factors: {
                overdueInvoices: overdue.length,
                unpaidTotal,
                openTickets,
                status: client.status
            }
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.get('/:id', protect, allowClientRoleOrPermission('view'), clientController.getClientById);
router.post('/', protect, checkPermission('clients', 'create'), clientController.createClient);
router.put('/:id', protect, checkPermission('clients', 'edit'), clientController.updateClient);
router.delete('/:id', protect, checkPermission('clients', 'delete'), clientController.deleteClient);

module.exports = router;
