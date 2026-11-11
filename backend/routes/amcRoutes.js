const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Amc = require('../models/Amc');
const Invoice = require('../models/Invoice');
const { protect, checkPermission } = require('../middleware/authMiddleware');

// Helper: generate next invoice number
const getNextInvoiceNumber = async () => {
    const last = await Invoice.findOne().sort({ createdAt: -1 }).select('invoiceNumber');
    if (!last || !last.invoiceNumber) return 'INV-001';
    const num = parseInt(last.invoiceNumber.replace(/\D/g, ''), 10) || 0;
    return `INV-${String(num + 1).padStart(3, '0')}`;
};

// ─── Static routes BEFORE /:id routes ───────────────────────────────────────

// Helper: format readable contract/renewal duration
const formatDurationLabel = (fromDate, toDate) => {
    const start = new Date(fromDate);
    const end = new Date(toDate);
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    const totalDays = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    if (totalDays <= 0) return '0 Days';

    let months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
    const anchor = new Date(start);
    anchor.setMonth(anchor.getMonth() + months);
    if (anchor > end) {
        months--;
        anchor.setTime(start.getTime());
        anchor.setMonth(anchor.getMonth() + months);
    }
    const remDays = Math.round((end.getTime() - anchor.getTime()) / (1000 * 60 * 60 * 24));

    if (months >= 12 && months % 12 === 0 && remDays <= 1) {
        const yrs = Math.round(months / 12);
        return `${yrs} ${yrs === 1 ? 'Year' : 'Years'}`;
    }
    if (months >= 1 && remDays <= 2) {
        return `${months} ${months === 1 ? 'Month' : 'Months'}`;
    }
    if (months >= 12) {
        const yrs = Math.floor(months / 12);
        const remM = months % 12;
        return remM > 0 ? `${yrs}Y ${remM}M` : `${yrs} ${yrs === 1 ? 'Year' : 'Years'}`;
    }
    if (months >= 1) {
        return `${months}M ${remDays}D`;
    }
    return `${totalDays} ${totalDays === 1 ? 'Day' : 'Days'}`;
};

// GET AMC stats summary
router.get('/stats/summary', protect, async (req, res, next) => {
    try {
        let baseFilter = {};
        if (req.user.role === 'client') {
            if (!req.user.clientId || !mongoose.Types.ObjectId.isValid(req.user.clientId)) {
                return res.json({ total: 0, active: 0, expiringSoon: 0, expired: 0, totalRevenue: 0 });
            }
            baseFilter = { clientId: new mongoose.Types.ObjectId(String(req.user.clientId)) };
        }

        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);
        const thirtyDaysLater = new Date(startOfToday);
        thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);

        const nonCancelled = { ...baseFilter, status: { $ne: 'cancelled' } };

        const [total, active, expiringSoon, expired] = await Promise.all([
            Amc.countDocuments(baseFilter),
            Amc.countDocuments({ ...nonCancelled, endDate: { $gt: thirtyDaysLater } }),
            Amc.countDocuments({ ...nonCancelled, endDate: { $gte: startOfToday, $lte: thirtyDaysLater } }),
            Amc.countDocuments({ ...nonCancelled, endDate: { $lt: startOfToday } })
        ]);

        const revenuePipeline = [];
        if (Object.keys(baseFilter).length > 0) revenuePipeline.push({ $match: baseFilter });
        revenuePipeline.push({ $group: { _id: null, total: { $sum: '$amount' } } });
        const revenueResult = await Amc.aggregate(revenuePipeline);

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
            .populate({ path: 'clientProductId', populate: { path: 'product', select: 'name' } })
            .populate('clientId', 'name email company')
            .populate('invoices', 'invoiceNumber total status date')
            .sort({ createdAt: -1 });
        const normalized = amcs.map(doc => {
            const obj = doc.toObject();
            obj.status = Amc.computeStatus(obj.endDate, obj.status);
            return obj;
        });
        res.json(normalized);
    } catch (err) {
        next(err);
    }
});

// CREATE AMC
router.post('/', protect, checkPermission('amc', 'create'), async (req, res) => {
    try {
        // Block client role
        if (req.user.role === 'client') {
            return res.status(403).json({ message: 'Clients cannot create AMC contracts' });
        }

        const { name, projectId, clientProductId, clientId, startDate, endDate, amount, frequency, services, description, notes, autoInvoice } = req.body;

        // Field-level validation
        if (!name) return res.status(400).json({ message: 'AMC Name is required' });
        if (!clientId) return res.status(400).json({ message: 'Client is required' });
        if (!projectId && !clientProductId) return res.status(400).json({ message: 'Project or Digital Product is required' });
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
            projectId: projectId || undefined,
            clientProductId: clientProductId || undefined,
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
            .populate({ path: 'clientProductId', populate: { path: 'product', select: 'name' } })
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
            .populate({ path: 'clientProductId', populate: { path: 'product', select: 'name' } })
            .populate('clientId', 'name email phone company')
            .populate('invoices', 'invoiceNumber total status date dueDate type')
            .populate('renewalHistory.invoiceId', 'invoiceNumber total status');
        if (!amc) return res.status(404).json({ message: 'AMC not found' });
        if (req.user.role === 'client') {
            const own = req.user.clientId?.toString?.() || '';
            const amcClientId = amc.clientId?._id?.toString?.() || amc.clientId?.toString?.() || '';
            if (!own || own !== amcClientId) {
                return res.status(403).json({ message: 'Not authorized to view this AMC' });
            }
        }
        const obj = amc.toObject();
        obj.status = Amc.computeStatus(obj.endDate, obj.status);
        res.json(obj);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// UPDATE AMC
router.put('/:id', protect, checkPermission('amc', 'edit'), async (req, res, next) => {
    try {
        if (req.user.role === 'client') {
            return res.status(403).json({ message: 'Not authorized' });
        }
        const allowedFields = [
            'name', 'projectId', 'clientProductId', 'clientId', 'startDate', 'endDate',
            'renewalDate', 'amount', 'frequency', 'status', 'services', 'description',
            'autoInvoice', 'notes', 'nextInvoiceDate'
        ];
        const safeUpdate = { updatedAt: new Date() };
        for (const field of allowedFields) {
            if (req.body[field] !== undefined) safeUpdate[field] = req.body[field];
        }
        const existingAmc = await Amc.findById(req.params.id);
        if (!existingAmc) return res.status(404).json({ message: 'AMC not found' });

        const targetEndDate = safeUpdate.endDate ? new Date(safeUpdate.endDate) : existingAmc.endDate;
        const targetStatus = safeUpdate.status !== undefined ? safeUpdate.status : existingAmc.status;
        if (targetStatus !== 'cancelled') {
            safeUpdate.status = Amc.computeStatus(targetEndDate, targetStatus);
        }

        const updated = await Amc.findByIdAndUpdate(req.params.id, safeUpdate, { new: true, runValidators: true })
            .populate('projectId', 'name status')
            .populate({ path: 'clientProductId', populate: { path: 'product', select: 'name' } })
            .populate('clientId', 'name email company')
            .populate('invoices', 'invoiceNumber total status date');
        res.json(updated);
    } catch (err) {
        next(err);
    }
});

// DELETE AMC
router.delete('/:id', protect, checkPermission('amc', 'delete'), async (req, res, next) => {
    try {
        if (req.user.role === 'client') {
            return res.status(403).json({ message: 'Not authorized' });
        }
        const deleted = await Amc.findByIdAndDelete(req.params.id);
        if (!deleted) return res.status(404).json({ message: 'AMC not found' });
        res.json({ message: 'AMC deleted successfully' });
    } catch (err) {
        next(err);
    }
});

// ─── Special Actions ──────────────────────────────────────────────────────────

// GENERATE AMC Invoice
router.post('/:id/generate-invoice', protect, checkPermission('amc', 'edit'), async (req, res, next) => {
    try {
        if (req.user.role === 'client') {
            return res.status(403).json({ message: 'Not authorized' });
        }
        const amc = await Amc.findById(req.params.id)
            .populate('clientId', 'name email')
            .populate('projectId', 'name')
            .populate({ path: 'clientProductId', populate: { path: 'product', select: 'name' } });
        if (!amc) return res.status(404).json({ message: 'AMC not found' });

        const { dueDate, note, taxPercentage = 0 } = req.body;
        const invoiceNumber = await getNextInvoiceNumber();
        const today = new Date();

        const projName = amc.projectId?.name || amc.clientProductId?.product?.name || 'Service';
        const lineItems = [{
            name: `AMC - ${amc.name} (${projName})`,
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
            projectId: amc.projectId ? amc.projectId._id : undefined,
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
router.post('/:id/renew', protect, checkPermission('amc', 'edit'), async (req, res, next) => {
    try {
        if (req.user.role === 'client') {
            return res.status(403).json({ message: 'Not authorized' });
        }
        const amc = await Amc.findById(req.params.id);
        if (!amc) return res.status(404).json({ message: 'AMC not found' });

        const { newEndDate, amount, note, generateInvoice, taxPercentage = 0, durationLabel } = req.body;
        if (!newEndDate) return res.status(400).json({ message: 'New end date is required' });

        const parsedNewEnd = new Date(newEndDate);
        if (isNaN(parsedNewEnd.getTime())) {
            return res.status(400).json({ message: 'Invalid renewal end date' });
        }

        const renewedAt = new Date();
        const startOfToday = new Date(renewedAt);
        startOfToday.setHours(0, 0, 0, 0);
        const prevEndDay = new Date(amc.endDate);
        prevEndDay.setHours(0, 0, 0, 0);
        const effectiveStartDate = prevEndDay >= startOfToday ? amc.endDate : renewedAt;

        const renewalAmount = amount ? parseFloat(amount) : amc.amount;
        const resolvedDuration = (durationLabel && String(durationLabel).trim())
            || formatDurationLabel(effectiveStartDate, parsedNewEnd);

        const renewalEntry = {
            renewedAt,
            previousEndDate: amc.endDate,
            effectiveStartDate,
            newEndDate: parsedNewEnd,
            durationLabel: resolvedDuration,
            amount: renewalAmount,
            note: note || ''
        };

        if (generateInvoice) {
            const invoiceNumber = await getNextInvoiceNumber();
            const taxAmt = renewalAmount * ((parseFloat(taxPercentage) || 0) / 100);
            const invoice = new Invoice({
                invoiceNumber,
                clientId: amc.clientId,
                projectId: amc.projectId || undefined,
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
            .populate({ path: 'clientProductId', populate: { path: 'product', select: 'name' } })
            .populate('clientId', 'name email company')
            .populate('invoices', 'invoiceNumber total status date');

        res.json({ success: true, amc: populated, message: 'AMC renewed!' });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
