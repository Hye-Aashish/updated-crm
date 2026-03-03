const express = require('express');
const router = express.Router();
const Amc = require('../models/Amc');
const Invoice = require('../models/Invoice');
const { protect, authorize } = require('../middleware/authMiddleware');

// Helper: generate next invoice number
const getNextInvoiceNumber = async () => {
    const last = await Invoice.findOne().sort({ createdAt: -1 }).select('invoiceNumber');
    if (!last || !last.invoiceNumber) return 'INV-001';
    const num = parseInt(last.invoiceNumber.replace(/\D/g, ''), 10) || 0;
    return `INV-${String(num + 1).padStart(3, '0')}`;
};

// ─── Static routes BEFORE /:id routes ───────────────────────────────────────

// GET AMC stats summary
router.get('/stats/summary', protect, async (req, res, next) => {
    try {
        const [total, active, expiringSoon, expired] = await Promise.all([
            Amc.countDocuments(),
            Amc.countDocuments({ status: 'active' }),
            Amc.countDocuments({ status: 'expiring-soon' }),
            Amc.countDocuments({ status: 'expired' })
        ]);

        const revenueResult = await Amc.aggregate([
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);

        res.json({
            total,
            active,
            expiringSoon,
            expired,
            totalRevenue: revenueResult[0]?.total || 0
        });
    } catch (err) {
        next(err);
    }
});

// ─── CRUD Routes ─────────────────────────────────────────────────────────────

// GET all AMCs
router.get('/', protect, async (req, res, next) => {
    try {
        let filter = {};
        if (req.user.role === 'client') {
            filter = { clientId: req.user.clientId };
        }
        const amcs = await Amc.find(filter)
            .populate('projectId', 'name status')
            .populate('clientId', 'name email company')
            .populate('invoices', 'invoiceNumber total status date')
            .sort({ createdAt: -1 });
        res.json(amcs);
    } catch (err) {
        next(err);
    }
});

// CREATE AMC
router.post('/', protect, async (req, res) => {
    try {
        // Block client role
        if (req.user.role === 'client') {
            return res.status(403).json({ message: 'Clients cannot create AMC contracts' });
        }

        const { name, projectId, clientId, startDate, endDate, amount, frequency, services, description, notes, autoInvoice } = req.body;

        // Field-level validation
        if (!name) return res.status(400).json({ message: 'AMC Name is required' });
        if (!clientId) return res.status(400).json({ message: 'Client is required' });
        if (!projectId) return res.status(400).json({ message: 'Project is required' });
        if (!startDate) return res.status(400).json({ message: 'Start Date is required' });
        if (!endDate) return res.status(400).json({ message: 'End Date is required' });
        if (!amount) return res.status(400).json({ message: 'Amount is required' });

        const parsedAmount = parseFloat(amount);
        if (isNaN(parsedAmount) || parsedAmount <= 0) {
            return res.status(400).json({ message: 'Amount must be a valid positive number' });
        }

        const servicesList = Array.isArray(services)
            ? services
            : (services ? String(services).split(',').map(s => s.trim()).filter(Boolean) : []);

        const amc = new Amc({
            name: name.trim(),
            projectId,
            clientId,
            startDate: new Date(startDate),
            endDate: new Date(endDate),
            amount: parsedAmount,
            frequency: frequency || 'annually',
            services: servicesList,
            description: description || '',
            notes: notes || '',
            autoInvoice: Boolean(autoInvoice),
            createdBy: req.user._id
        });

        const saved = await amc.save();

        const populated = await Amc.findById(saved._id)
            .populate('projectId', 'name status')
            .populate('clientId', 'name email company');

        return res.status(201).json(populated);
    } catch (err) {
        console.error('[AMC CREATE ERROR STACK TRACE]', err.stack);
        if (err.name === 'ValidationError') {
            const msg = Object.values(err.errors).map(e => e.message).join(', ');
            return res.status(400).json({ message: msg });
        }
        if (err.name === 'CastError') {
            return res.status(400).json({ message: `Invalid ID for: ${err.path}` });
        }
        // Return 500 without using next()
        return res.status(500).json({ message: err.message || 'Server context error occurred' });
    }
});

// GET single AMC
router.get('/:id', protect, async (req, res, next) => {
    try {
        const amc = await Amc.findById(req.params.id)
            .populate('projectId', 'name status type')
            .populate('clientId', 'name email phone company')
            .populate('invoices', 'invoiceNumber total status date dueDate type')
            .populate('renewalHistory.invoiceId', 'invoiceNumber total status');
        if (!amc) return res.status(404).json({ message: 'AMC not found' });
        res.json(amc);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// UPDATE AMC
router.put('/:id', protect, async (req, res, next) => {
    try {
        if (req.user.role === 'client') {
            return res.status(403).json({ message: 'Not authorized' });
        }
        const updated = await Amc.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
            .populate('projectId', 'name status')
            .populate('clientId', 'name email company')
            .populate('invoices', 'invoiceNumber total status date');
        if (!updated) return res.status(404).json({ message: 'AMC not found' });
        res.json(updated);
    } catch (err) {
        next(err);
    }
});

// DELETE AMC
router.delete('/:id', protect, authorize('admin', 'owner'), async (req, res, next) => {
    try {
        const deleted = await Amc.findByIdAndDelete(req.params.id);
        if (!deleted) return res.status(404).json({ message: 'AMC not found' });
        res.json({ message: 'AMC deleted successfully' });
    } catch (err) {
        next(err);
    }
});

// ─── Special Actions ──────────────────────────────────────────────────────────

// GENERATE AMC Invoice
router.post('/:id/generate-invoice', protect, async (req, res, next) => {
    try {
        if (req.user.role === 'client') {
            return res.status(403).json({ message: 'Not authorized' });
        }
        const amc = await Amc.findById(req.params.id)
            .populate('clientId', 'name email')
            .populate('projectId', 'name');
        if (!amc) return res.status(404).json({ message: 'AMC not found' });

        const { dueDate, note, taxPercentage = 0 } = req.body;
        const invoiceNumber = await getNextInvoiceNumber();
        const today = new Date();

        const lineItems = [{
            name: `AMC - ${amc.name} (${amc.projectId?.name || 'Project'})`,
            quantity: 1,
            rate: amc.amount,
            taxPercentage: parseFloat(taxPercentage) || 0
        }];
        if (note) {
            lineItems.push({ name: note, quantity: 1, rate: 0, taxPercentage: 0 });
        }

        const tax = lineItems.reduce((sum, item) => sum + (item.rate * item.quantity * (item.taxPercentage / 100)), 0);
        const total = amc.amount + tax;

        const invoice = new Invoice({
            invoiceNumber,
            clientId: amc.clientId._id,
            projectId: amc.projectId._id,
            type: 'amc',
            status: 'pending',
            lineItems,
            subtotal: amc.amount,
            tax,
            total,
            date: today,
            dueDate: dueDate ? new Date(dueDate) : new Date(today.getTime() + 15 * 24 * 60 * 60 * 1000),
        });

        const savedInvoice = await invoice.save();
        amc.invoices.push(savedInvoice._id);
        amc.lastInvoiceDate = today;
        await amc.save();

        res.status(201).json({ success: true, invoice: savedInvoice, message: 'Invoice generated!' });
    } catch (err) {
        next(err);
    }
});

// RENEW AMC
router.post('/:id/renew', protect, async (req, res, next) => {
    try {
        if (req.user.role === 'client') {
            return res.status(403).json({ message: 'Not authorized' });
        }
        const amc = await Amc.findById(req.params.id);
        if (!amc) return res.status(404).json({ message: 'AMC not found' });

        const { newEndDate, amount, note, generateInvoice, taxPercentage = 0 } = req.body;
        if (!newEndDate) return res.status(400).json({ message: 'New end date is required' });

        const renewedAt = new Date();
        const renewalAmount = amount ? parseFloat(amount) : amc.amount;

        const renewalEntry = {
            renewedAt,
            newEndDate: new Date(newEndDate),
            amount: renewalAmount,
            note: note || ''
        };

        if (generateInvoice) {
            const invoiceNumber = await getNextInvoiceNumber();
            const taxAmt = renewalAmount * ((parseFloat(taxPercentage) || 0) / 100);
            const invoice = new Invoice({
                invoiceNumber,
                clientId: amc.clientId,
                projectId: amc.projectId,
                type: 'amc',
                status: 'pending',
                lineItems: [{
                    name: `AMC Renewal - ${amc.name}`,
                    quantity: 1,
                    rate: renewalAmount,
                    taxPercentage: parseFloat(taxPercentage) || 0
                }],
                subtotal: renewalAmount,
                tax: taxAmt,
                total: renewalAmount + taxAmt,
                date: renewedAt,
                dueDate: new Date(renewedAt.getTime() + 15 * 24 * 60 * 60 * 1000),
            });
            const savedInv = await invoice.save();
            renewalEntry.invoiceId = savedInv._id;
            amc.invoices.push(savedInv._id);
        }

        amc.renewalHistory.push(renewalEntry);
        amc.endDate = new Date(newEndDate);
        amc.amount = renewalAmount;
        await amc.save();

        const populated = await Amc.findById(amc._id)
            .populate('projectId', 'name status')
            .populate('clientId', 'name email company')
            .populate('invoices', 'invoiceNumber total status date');

        res.json({ success: true, amc: populated, message: 'AMC renewed!' });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
