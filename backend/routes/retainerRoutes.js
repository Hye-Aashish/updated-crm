const express = require('express');
const router = express.Router();
const Retainer = require('../models/Retainer');
const Invoice = require('../models/Invoice');
const Client = require('../models/Client');
const { protect, checkPermission } = require('../middleware/authMiddleware');
const { applyCreatorScope, assertCreatorAccess } = require('../utils/dataScope');

function addBillingPeriod(date, frequency) {
    const next = new Date(date);
    switch (frequency) {
        case 'weekly':
            next.setDate(next.getDate() + 7);
            break;
        case 'quarterly':
            next.setMonth(next.getMonth() + 3);
            break;
        case 'half-yearly':
            next.setMonth(next.getMonth() + 6);
            break;
        case 'annually':
            next.setFullYear(next.getFullYear() + 1);
            break;
        case 'monthly':
        default:
            next.setMonth(next.getMonth() + 1);
            break;
    }
    return next;
}

async function nextInvoiceNumber() {
    const count = await Invoice.countDocuments();
    const year = new Date().getFullYear();
    return `INV-RET-${year}-${String(count + 1).padStart(4, '0')}`;
}

router.get('/', protect, checkPermission('retainers', 'view'), async (req, res) => {
    try {
        let filter = {};
        if (req.query.status) filter.status = req.query.status;
        if (req.query.clientId) filter.clientId = req.query.clientId;
        filter = await applyCreatorScope(filter, req.user, 'retainers');
        const retainers = await Retainer.find(filter)
            .populate('clientId', 'name company email')
            .populate('projectId', 'name status')
            .populate('invoices', 'invoiceNumber total status date dueDate')
            .sort({ nextBillingDate: 1 });
        res.json(retainers);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.get('/:id', protect, checkPermission('retainers', 'view'), async (req, res) => {
    try {
        const retainer = await Retainer.findById(req.params.id)
            .populate('clientId', 'name company email')
            .populate('projectId', 'name status')
            .populate('invoices', 'invoiceNumber total status date dueDate amountPaid');
        if (!retainer) return res.status(404).json({ message: 'Retainer not found' });
        const access = await assertCreatorAccess(req.user, retainer, 'retainers');
        if (!access.ok) return res.status(access.status).json({ message: access.message });
        res.json(retainer);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.post('/', protect, checkPermission('retainers', 'create'), async (req, res) => {
    try {
        const {
            name, clientId, projectId, amount, currency, frequency,
            startDate, endDate, nextBillingDate, autoInvoice,
            description, services, notes, status
        } = req.body;

        if (!name || !clientId || amount == null || !startDate) {
            return res.status(400).json({ message: 'name, clientId, amount and startDate are required' });
        }

        const start = new Date(startDate);
        const retainer = new Retainer({
            name,
            clientId,
            projectId: projectId || undefined,
            amount,
            currency: currency || 'INR',
            frequency: frequency || 'monthly',
            startDate: start,
            endDate: endDate ? new Date(endDate) : undefined,
            nextBillingDate: nextBillingDate ? new Date(nextBillingDate) : start,
            autoInvoice: autoInvoice !== false,
            description,
            services: services || [],
            notes,
            status: status || 'active',
            createdBy: req.user._id
        });

        const saved = await retainer.save();
        const populated = await Retainer.findById(saved._id)
            .populate('clientId', 'name company email')
            .populate('projectId', 'name status');
        res.status(201).json(populated);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

router.put('/:id', protect, checkPermission('retainers', 'edit'), async (req, res) => {
    try {
        const retainer = await Retainer.findById(req.params.id);
        if (!retainer) return res.status(404).json({ message: 'Retainer not found' });
        const access = await assertCreatorAccess(req.user, retainer, 'retainers');
        if (!access.ok) return res.status(access.status).json({ message: access.message });

        const fields = [
            'name', 'clientId', 'projectId', 'amount', 'currency', 'frequency',
            'startDate', 'endDate', 'nextBillingDate', 'status', 'autoInvoice',
            'description', 'services', 'notes'
        ];
        for (const f of fields) {
            if (req.body[f] !== undefined) retainer[f] = req.body[f];
        }
        await retainer.save();
        const populated = await Retainer.findById(retainer._id)
            .populate('clientId', 'name company email')
            .populate('projectId', 'name status')
            .populate('invoices', 'invoiceNumber total status date dueDate');
        res.json(populated);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

router.delete('/:id', protect, checkPermission('retainers', 'delete'), async (req, res) => {
    try {
        const retainer = await Retainer.findById(req.params.id);
        if (!retainer) return res.status(404).json({ message: 'Retainer not found' });
        const access = await assertCreatorAccess(req.user, retainer, 'retainers');
        if (!access.ok) return res.status(access.status).json({ message: access.message });
        await Retainer.findByIdAndDelete(req.params.id);
        res.json({ message: 'Retainer deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Generate invoice for current billing cycle and advance nextBillingDate
router.post('/:id/generate-invoice', protect, checkPermission('retainers', 'create'), async (req, res) => {
    try {
        const retainer = await Retainer.findById(req.params.id);
        if (!retainer) return res.status(404).json({ message: 'Retainer not found' });
        const access = await assertCreatorAccess(req.user, retainer, 'retainers');
        if (!access.ok) return res.status(access.status).json({ message: access.message });
        if (retainer.status !== 'active') {
            return res.status(400).json({ message: 'Only active retainers can be billed' });
        }

        const client = await Client.findById(retainer.clientId);
        if (!client) return res.status(404).json({ message: 'Client not found' });

        const invoiceNumber = await nextInvoiceNumber();
        const due = new Date();
        due.setDate(due.getDate() + 15);

        const invoice = new Invoice({
            invoiceNumber,
            clientId: retainer.clientId.toString(),
            projectId: retainer.projectId ? retainer.projectId.toString() : undefined,
            type: 'amc',
            billingInfo: {
                name: client.company || client.name,
                address: client.address || '',
                gstNumber: client.gstNumber || ''
            },
            currency: retainer.currency || 'INR',
            status: 'pending',
            lineItems: [{
                name: `${retainer.name} (${retainer.frequency})`,
                quantity: 1,
                rate: retainer.amount,
                taxPercentage: 0
            }],
            subtotal: retainer.amount,
            tax: 0,
            total: retainer.amount,
            amountPaid: 0,
            date: new Date(),
            dueDate: due,
            frequency: retainer.frequency,
            nextRecurrenceAt: addBillingPeriod(retainer.nextBillingDate || new Date(), retainer.frequency),
            createdBy: req.user._id
        });

        const savedInvoice = await invoice.save();

        retainer.invoices.push(savedInvoice._id);
        retainer.lastInvoiceDate = new Date();
        retainer.nextBillingDate = addBillingPeriod(retainer.nextBillingDate || new Date(), retainer.frequency);
        retainer.billingHistory.push({
            billedAt: new Date(),
            amount: retainer.amount,
            invoiceId: savedInvoice._id,
            note: req.body.note || 'Retainer billing cycle'
        });
        await retainer.save();

        res.status(201).json({ retainer, invoice: savedInvoice });
    } catch (err) {
        console.error('Retainer invoice error:', err);
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
