const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Project = require('../models/Project');
const Invoice = require('../models/Invoice');
const TimeEntry = require('../models/TimeEntry');
const Client = require('../models/Client');
const User = require('../models/User');
const { protect, checkPermission } = require('../middleware/authMiddleware');

const WORKING_HOURS_PER_MONTH = 176; // 22 days * 8 hours

function hourlyCostFromSalary(salary) {
    if (!salary || salary <= 0) return 400; // fallback agency blended cost
    return salary / WORKING_HOURS_PER_MONTH;
}

// GET /api/profitability — all projects margin rollup
router.get('/', protect, checkPermission('profitability', 'view'), async (req, res) => {
    try {
        const projects = await Project.find({}).sort({ updatedAt: -1 }).lean();
        const projectIds = projects.map((p) => p._id.toString());

        const [invoices, timeEntries, clients, users] = await Promise.all([
            Invoice.find({
                projectId: { $in: projectIds },
                status: { $ne: 'cancelled' }
            }).lean(),
            TimeEntry.find({
                projectId: { $in: projects.map((p) => p._id) }
            }).lean(),
            Client.find({}).select('name company').lean(),
            User.find({}).select('salary name').lean()
        ]);

        const clientMap = Object.fromEntries(clients.map((c) => [c._id.toString(), c]));
        const userCostMap = Object.fromEntries(
            users.map((u) => [u._id.toString(), hourlyCostFromSalary(u.salary)])
        );

        const invoiceByProject = {};
        for (const inv of invoices) {
            const pid = String(inv.projectId || '');
            if (!pid) continue;
            if (!invoiceByProject[pid]) {
                invoiceByProject[pid] = { billed: 0, collected: 0, count: 0 };
            }
            invoiceByProject[pid].billed += Number(inv.total || 0);
            invoiceByProject[pid].collected += Number(inv.amountPaid || 0);
            invoiceByProject[pid].count += 1;
        }

        const laborByProject = {};
        for (const te of timeEntries) {
            const pid = te.projectId?.toString?.() || String(te.projectId);
            if (!pid) continue;
            const hours = (Number(te.duration) || 0) / 60;
            const rate = userCostMap[te.userId?.toString?.()] ?? 400;
            if (!laborByProject[pid]) laborByProject[pid] = { hours: 0, cost: 0 };
            laborByProject[pid].hours += hours;
            laborByProject[pid].cost += hours * rate;
        }

        const rows = projects.map((p) => {
            const pid = p._id.toString();
            const inv = invoiceByProject[pid] || { billed: 0, collected: 0, count: 0 };
            const labor = laborByProject[pid] || { hours: 0, cost: 0 };
            const budget = Number(p.budget || 0);
            const contractValue = budget || (
                Number(p.advanceAmount || 0) +
                Number(p.milestoneAmount || 0) +
                Number(p.finalAmount || 0)
            );
            const revenue = inv.collected > 0 ? inv.collected : inv.billed;
            const cost = labor.cost;
            const profit = revenue - cost;
            const marginPct = revenue > 0 ? (profit / revenue) * 100 : null;
            const budgetUtilization = contractValue > 0 ? (revenue / contractValue) * 100 : null;
            const client = clientMap[String(p.clientId)] || null;

            return {
                projectId: pid,
                projectName: p.name,
                status: p.status,
                health: p.health,
                clientId: p.clientId,
                clientName: client?.company || client?.name || '—',
                budget: contractValue,
                billed: inv.billed,
                collected: inv.collected,
                invoiceCount: inv.count,
                hoursLogged: Math.round(labor.hours * 10) / 10,
                laborCost: Math.round(labor.cost),
                profit: Math.round(profit),
                marginPct: marginPct == null ? null : Math.round(marginPct * 10) / 10,
                budgetUtilization: budgetUtilization == null ? null : Math.round(budgetUtilization * 10) / 10,
                paymentStatus: p.paymentStatus
            };
        });

        const totals = rows.reduce(
            (acc, r) => {
                acc.budget += r.budget;
                acc.billed += r.billed;
                acc.collected += r.collected;
                acc.laborCost += r.laborCost;
                acc.hoursLogged += r.hoursLogged;
                acc.profit += r.profit;
                return acc;
            },
            { budget: 0, billed: 0, collected: 0, laborCost: 0, hoursLogged: 0, profit: 0 }
        );
        totals.marginPct = totals.collected > 0 || totals.billed > 0
            ? Math.round(((totals.profit / (totals.collected || totals.billed)) * 100) * 10) / 10
            : null;

        res.json({ projects: rows, totals });
    } catch (err) {
        console.error('Profitability error:', err);
        res.status(500).json({ message: err.message });
    }
});

// GET /api/profitability/:projectId
router.get('/:projectId', protect, checkPermission('profitability', 'view'), async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.projectId)) {
            return res.status(400).json({ message: 'Invalid project id' });
        }
        const project = await Project.findById(req.params.projectId).lean();
        if (!project) return res.status(404).json({ message: 'Project not found' });

        const [invoices, timeEntries, client, users] = await Promise.all([
            Invoice.find({ projectId: req.params.projectId, status: { $ne: 'cancelled' } }).sort({ date: -1 }).lean(),
            TimeEntry.find({ projectId: project._id }).lean(),
            Client.findById(project.clientId).select('name company email').lean(),
            User.find({}).select('salary name').lean()
        ]);

        const userMap = Object.fromEntries(users.map((u) => [u._id.toString(), u]));
        let laborCost = 0;
        let hours = 0;
        const byUser = {};

        for (const te of timeEntries) {
            const uid = te.userId?.toString?.();
            const h = (Number(te.duration) || 0) / 60;
            const rate = hourlyCostFromSalary(userMap[uid]?.salary);
            hours += h;
            laborCost += h * rate;
            if (!byUser[uid]) {
                byUser[uid] = { userId: uid, name: userMap[uid]?.name || 'Unknown', hours: 0, cost: 0 };
            }
            byUser[uid].hours += h;
            byUser[uid].cost += h * rate;
        }

        const billed = invoices.reduce((s, i) => s + Number(i.total || 0), 0);
        const collected = invoices.reduce((s, i) => s + Number(i.amountPaid || 0), 0);
        const budget = Number(project.budget || 0) || (
            Number(project.advanceAmount || 0) +
            Number(project.milestoneAmount || 0) +
            Number(project.finalAmount || 0)
        );
        const revenue = collected || billed;
        const profit = revenue - laborCost;

        res.json({
            project: {
                id: project._id,
                name: project.name,
                status: project.status,
                budget,
                paymentStatus: project.paymentStatus
            },
            client,
            billed,
            collected,
            laborCost: Math.round(laborCost),
            hoursLogged: Math.round(hours * 10) / 10,
            profit: Math.round(profit),
            marginPct: revenue > 0 ? Math.round((profit / revenue) * 1000) / 10 : null,
            invoices: invoices.map((i) => ({
                id: i._id,
                invoiceNumber: i.invoiceNumber,
                total: i.total,
                amountPaid: i.amountPaid,
                status: i.status,
                date: i.date
            })),
            laborByUser: Object.values(byUser).map((u) => ({
                ...u,
                hours: Math.round(u.hours * 10) / 10,
                cost: Math.round(u.cost)
            }))
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
