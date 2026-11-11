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
