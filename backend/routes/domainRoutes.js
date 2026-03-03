const express = require('express');
const router = express.Router();
const Domain = require('../models/Domain');
const Invoice = require('../models/Invoice');
const { protect, authorize } = require('../middleware/authMiddleware');

// Helper: generate next invoice number
const getNextInvoiceNumber = async () => {
    const last = await Invoice.findOne().sort({ createdAt: -1 }).select('invoiceNumber');
    if (!last || !last.invoiceNumber) return 'INV-001';
    const num = parseInt(last.invoiceNumber.replace(/\D/g, ''), 10) || 0;
    return `INV-${String(num + 1).padStart(3, '0')}`;
};

// GET Domain & Hosting stats summary
router.get('/stats/summary', protect, async (req, res, next) => {
    try {
        const [total, active, expiringSoon, expired] = await Promise.all([
            Domain.countDocuments(),
            Domain.countDocuments({ status: 'active' }),
            Domain.countDocuments({ status: 'expiring-soon' }),
            Domain.countDocuments({ status: 'expired' })
        ]);

        const totalCostResult = await Domain.aggregate([
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);

        res.json({
            total,
            active,
            expiringSoon,
            expired,
            totalCost: totalCostResult[0]?.total || 0
        });
    } catch (err) {
        next(err);
    }
});

// GET all domains
router.get('/', protect, async (req, res, next) => {
    try {
        let filter = {};
        if (req.user.role === 'client') {
            filter = { clientId: req.user.clientId };
        }
        const domains = await Domain.find(filter)
            .populate('projectId', 'name status')
            .populate('clientId', 'name email company')
            .populate('invoices', 'invoiceNumber total status date')
            .sort({ expiryDate: 1 });
        res.json(domains);
    } catch (err) {
        next(err);
    }
});

// CREATE domain
router.post('/', protect, async (req, res, next) => {
    try {
        if (req.user.role === 'client') {
            return res.status(403).json({ message: 'Clients cannot create Domain/Hosting entries' });
        }

        const { domainName, type, provider, clientId, projectId, purchaseDate, expiryDate, amount, autoRenew, notes } = req.body;

        if (!domainName || !provider || !clientId || !purchaseDate || !expiryDate || !amount) {
            return res.status(400).json({ message: 'Please fill all required fields' });
        }

        const domainRecord = new Domain({
            domainName,
            type: type || 'domain',
            provider,
            clientId,
            projectId: projectId || null,
            purchaseDate: new Date(purchaseDate),
            expiryDate: new Date(expiryDate),
            amount: parseFloat(amount),
            autoRenew: Boolean(autoRenew),
            notes: notes || '',
            createdBy: req.user._id
        });

        const saved = await domainRecord.save();

        const populated = await Domain.findById(saved._id)
            .populate('projectId', 'name status')
            .populate('clientId', 'name email company');

        return res.status(201).json(populated);
    } catch (err) {
        if (err.name === 'ValidationError') {
            const msg = Object.values(err.errors).map(e => e.message).join(', ');
            return res.status(400).json({ message: msg });
        }
        next(err);
    }
});

// GET single domain
router.get('/:id', protect, async (req, res, next) => {
    try {
        const domainRecord = await Domain.findById(req.params.id)
            .populate('projectId', 'name status')
            .populate('clientId', 'name email phone company')
            .populate('invoices', 'invoiceNumber total status date dueDate type');
        if (!domainRecord) return res.status(404).json({ message: 'Record not found' });
        res.json(domainRecord);
    } catch (err) {
        next(err);
    }
});

// UPDATE domain
router.put('/:id', protect, async (req, res, next) => {
    try {
        if (req.user.role === 'client') {
            return res.status(403).json({ message: 'Not authorized' });
        }
        const updated = await Domain.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
            .populate('projectId', 'name status')
            .populate('clientId', 'name email company')
            .populate('invoices', 'invoiceNumber total status date');
        if (!updated) return res.status(404).json({ message: 'Record not found' });
        res.json(updated);
    } catch (err) {
        next(err);
    }
});

// DELETE domain
router.delete('/:id', protect, authorize('admin', 'owner'), async (req, res, next) => {
    try {
        const deleted = await Domain.findByIdAndDelete(req.params.id);
        if (!deleted) return res.status(404).json({ message: 'Record not found' });
        res.json({ message: 'Record deleted successfully' });
    } catch (err) {
        next(err);
    }
});

// GENERATE Domain Invoice
router.post('/:id/generate-invoice', protect, async (req, res, next) => {
    try {
        if (req.user.role === 'client') {
            return res.status(403).json({ message: 'Not authorized' });
        }
        const domainRecord = await Domain.findById(req.params.id)
            .populate('clientId', 'name email')
            .populate('projectId', 'name');
        if (!domainRecord) return res.status(404).json({ message: 'Record not found' });

        const { dueDate, note, taxPercentage = 0 } = req.body;
        const invoiceNumber = await getNextInvoiceNumber();
        const today = new Date();

        const typeLabel = domainRecord.type === 'hosting' ? 'Hosting' : domainRecord.type === 'domain' ? 'Domain' : 'Domain & Hosting';

        const lineItems = [{
            name: `${typeLabel} Renewal - ${domainRecord.domainName}`,
            quantity: 1,
            rate: domainRecord.amount,
            taxPercentage: parseFloat(taxPercentage) || 0
        }];
        if (note) {
            lineItems.push({ name: note, quantity: 1, rate: 0, taxPercentage: 0 });
        }

        const tax = lineItems.reduce((sum, item) => sum + (item.rate * item.quantity * (item.taxPercentage / 100)), 0);
        const total = domainRecord.amount + tax;

        const invoice = new Invoice({
            invoiceNumber,
            clientId: domainRecord.clientId._id,
            projectId: domainRecord.projectId ? domainRecord.projectId._id : domainRecord.clientId._id, // fallback
            type: 'domain',
            status: 'pending',
            lineItems,
            subtotal: domainRecord.amount,
            tax,
            total,
            date: today,
            dueDate: dueDate ? new Date(dueDate) : new Date(today.getTime() + 15 * 24 * 60 * 60 * 1000),
        });

        const savedInvoice = await invoice.save();
        domainRecord.invoices.push(savedInvoice._id);
        domainRecord.lastInvoiceDate = today;
        await domainRecord.save();

        res.status(201).json({ success: true, invoice: savedInvoice, message: 'Invoice generated!' });
    } catch (err) {
        next(err);
    }
});

// RENEW domain
router.post('/:id/renew', protect, async (req, res, next) => {
    try {
        if (req.user.role === 'client') {
            return res.status(403).json({ message: 'Not authorized' });
        }
        const domainRecord = await Domain.findById(req.params.id);
        if (!domainRecord) return res.status(404).json({ message: 'Record not found' });

        const { newExpiryDate, amount, note, generateInvoice, taxPercentage = 0 } = req.body;
        if (!newExpiryDate) return res.status(400).json({ message: 'New expiry date is required' });

        const renewedAt = new Date();
        const renewalAmount = amount ? parseFloat(amount) : domainRecord.amount;

        const renewalEntry = {
            renewedAt,
            newExpiryDate: new Date(newExpiryDate),
            amount: renewalAmount,
            note: note || ''
        };

        if (generateInvoice) {
            const invoiceNumber = await getNextInvoiceNumber();
            const taxAmt = renewalAmount * ((parseFloat(taxPercentage) || 0) / 100);

            const invoice = new Invoice({
                invoiceNumber,
                clientId: domainRecord.clientId,
                projectId: domainRecord.projectId || domainRecord.clientId,
                type: 'domain',
                status: 'pending',
                lineItems: [{
                    name: `Renewal - ${domainRecord.domainName}`,
                    quantity: 1,
                    rate: renewalAmount,
                    taxPercentage: parseFloat(taxPercentage) || 0
                }],
                subtotal: renewalAmount,
                tax: taxAmt,
                total: renewalAmount + taxAmt,
                date: renewedAt,
                dueDate: new Date(renewedAt.getTime() + 15 * 24 * 60 * 60 * 1000)
            });

            const savedInvoice = await invoice.save();
            domainRecord.invoices.push(savedInvoice._id);
            domainRecord.lastInvoiceDate = renewedAt;
            renewalEntry.invoiceId = savedInvoice._id;
        }

        domainRecord.renewals.push(renewalEntry);
        domainRecord.expiryDate = new Date(newExpiryDate);
        domainRecord.amount = renewalAmount; // Update the main current tracked amount

        const updated = await domainRecord.save();
        res.json({ message: 'Successfully renewed', record: updated });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
