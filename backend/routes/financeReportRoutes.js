const express = require('express');
const router = express.Router();
const Invoice = require('../models/Invoice');
const Expense = require('../models/Expense');
const VendorBill = require('../models/VendorBill');
const Client = require('../models/Client');
const Project = require('../models/Project');
const Setting = require('../models/Setting');
const { protect, authorize } = require('../middleware/authMiddleware');
const { assertProjectAccess } = require('../utils/assertAccess');

function inRange(date, from, to) {
    const d = new Date(date);
    if (from && d < new Date(from)) return false;
    if (to && d > new Date(to)) return false;
    return true;
}

function convertAmount(amount, currency, rates, base = 'INR') {
    const cur = (currency || base).toUpperCase();
    if (cur === base) return amount;
    const rate = rates?.[cur];
    if (!rate || !Number(rate)) return amount;
    return amount * Number(rate);
}

// GST-style report from invoice tax lines
router.get('/gst', protect, authorize('admin', 'owner'), async (req, res) => {
    try {
        const { from, to } = req.query;
        const invoices = await Invoice.find({
            status: { $in: ['paid', 'partially-paid', 'pending', 'overdue'] }
        }).lean();

        const rows = [];
        for (const inv of invoices) {
            if (!inRange(inv.date || inv.createdAt, from, to)) continue;
            const client = await Client.findById(inv.clientId).select('name company gstNumber').lean().catch(() => null);
            rows.push({
                invoiceNumber: inv.invoiceNumber,
                date: inv.date,
                clientName: client?.company || client?.name || inv.billingInfo?.name || '',
                gstNumber: inv.billingInfo?.gstNumber || client?.gstNumber || '',
                taxableValue: inv.subtotal || 0,
                tax: inv.tax || 0,
                total: inv.total || 0,
                currency: inv.currency || 'INR',
                status: inv.status
            });
        }

        const summary = rows.reduce((acc, r) => {
            acc.taxableValue += r.taxableValue;
            acc.tax += r.tax;
            acc.total += r.total;
            return acc;
        }, { taxableValue: 0, tax: 0, total: 0, count: rows.length });

        res.json({ rows, summary });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// P&L by client / project / month
router.get('/pnl', protect, authorize('admin', 'owner'), async (req, res) => {
    try {
        const { from, to, groupBy = 'month' } = req.query;
        const settings = await Setting.findOne({ type: 'general' }).lean();
        const rates = settings?.billing?.exchangeRates || settings?.exchangeRates || { USD: 83, EUR: 90 };

        const invoices = await Invoice.find({ status: { $in: ['paid', 'partially-paid'] } }).lean();
        const expenses = await Expense.find().lean().catch(() => []);
        const vendorBills = await VendorBill.find({ status: 'paid' }).lean().catch(() => []);

        const buckets = {};

        const keyFor = (date, clientId, projectId) => {
            const d = new Date(date);
            if (groupBy === 'client') return clientId || 'unknown';
            if (groupBy === 'project') return projectId || 'none';
            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        };

        for (const inv of invoices) {
            if (!inRange(inv.paidDate || inv.date, from, to)) continue;
            const key = keyFor(inv.paidDate || inv.date, inv.clientId, inv.projectId);
            if (!buckets[key]) buckets[key] = { key, revenue: 0, expenses: 0, vendorBills: 0 };
            buckets[key].revenue += convertAmount(inv.amountPaid || inv.total || 0, inv.currency, rates);
        }

        for (const exp of expenses) {
            if (!inRange(exp.date || exp.createdAt, from, to)) continue;
            const key = keyFor(exp.date || exp.createdAt, exp.clientId, exp.projectId);
            if (!buckets[key]) buckets[key] = { key, revenue: 0, expenses: 0, vendorBills: 0 };
            buckets[key].expenses += Number(exp.amount || 0);
        }

        for (const bill of vendorBills) {
            if (!inRange(bill.paidDate || bill.billDate, from, to)) continue;
            const key = keyFor(bill.paidDate || bill.billDate, bill.clientId, bill.projectId);
            if (!buckets[key]) buckets[key] = { key, revenue: 0, expenses: 0, vendorBills: 0 };
            buckets[key].vendorBills += convertAmount(bill.total || 0, bill.currency, rates);
        }

        const rows = Object.values(buckets).map(b => ({
            ...b,
            profit: b.revenue - b.expenses - b.vendorBills
        })).sort((a, b) => String(a.key).localeCompare(String(b.key)));

        res.json({ groupBy, rows, baseCurrency: 'INR' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Budget vs actual for a project
router.get('/budget/:projectId', protect, async (req, res) => {
    try {
        const project = await Project.findById(req.params.projectId).lean();
        if (!project) return res.status(404).json({ message: 'Project not found' });

        const access = await assertProjectAccess(req, project);
        if (!access.ok) {
            return res.status(access.status).json({ message: access.message });
        }

        const invoices = await Invoice.find({
            projectId: req.params.projectId,
            status: { $in: ['paid', 'partially-paid', 'pending', 'overdue'] }
        }).lean();

        const billed = invoices.reduce((s, i) => s + (i.total || 0), 0);
        const collected = invoices.reduce((s, i) => s + (i.amountPaid || (i.status === 'paid' ? i.total : 0) || 0), 0);
        const budget = Number(project.budget || 0);

        res.json({
            projectId: project._id,
            projectName: project.name,
            budget,
            billed,
            collected,
            variance: budget - billed,
            utilizationPct: budget > 0 ? Math.round((billed / budget) * 100) : null
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
