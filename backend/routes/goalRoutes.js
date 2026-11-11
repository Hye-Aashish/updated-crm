const express = require('express');
const router = express.Router();
const Goal = require('../models/Goal');
const Invoice = require('../models/Invoice');
const Lead = require('../models/Lead');
const Project = require('../models/Project');
const Task = require('../models/Task');
const User = require('../models/User');
const { protect, checkPermission } = require('../middleware/authMiddleware');

// GET all goals + recalculate auto stats
router.get('/', protect, checkPermission('goals', 'view'), async (req, res) => {
    try {
        const goals = await Goal.find().sort({ createdAt: -1 });

        const now = new Date();

        const updatedGoals = await Promise.all(goals.map(async (goal) => {
            let autoCurrent = goal.currentValue;

            // Date boundary for period-bound goals
            const dateFilter = {};
            if (goal.startDate) {
                dateFilter.$gte = new Date(goal.startDate);
            }
            if (goal.endDate) {
                const end = new Date(goal.endDate);
                end.setHours(23, 59, 59, 999);
                dateFilter.$lte = end;
            }
            const hasDateFilter = Object.keys(dateFilter).length > 0;

            if (goal.category === 'revenue') {
                const matchQuery = { status: 'paid' };
                if (hasDateFilter) {
                    matchQuery.$or = [
                        { paidDate: dateFilter },
                        { date: dateFilter }
                    ];
                }
                const totalRevenue = await Invoice.aggregate([
                    { $match: matchQuery },
                    { $group: { _id: null, total: { $sum: '$total' } } }
                ]);
                autoCurrent = totalRevenue[0]?.total || 0;
            } else if (goal.category === 'leads') {
                const leadMatch = {
                    stage: { $in: ['closed', 'won', /won/i, /closed/i] }
                };
                if (hasDateFilter) {
                    leadMatch.$or = [
                        { closedAt: dateFilter },
                        { convertedAt: dateFilter },
                        { updatedAt: dateFilter },
                        { createdAt: dateFilter }
                    ];
                }
                autoCurrent = await Lead.countDocuments(leadMatch);
            } else if (goal.category === 'projects') {
                const projMatch = { status: 'completed' };
                if (hasDateFilter) {
                    projMatch.$or = [
                        { updatedAt: dateFilter },
                        { dueDate: dateFilter },
                        { startDate: dateFilter }
                    ];
                }
                autoCurrent = await Project.countDocuments(projMatch);
            } else if (goal.category === 'tasks') {
                const taskMatch = { status: { $in: ['done', 'completed'] } };
                if (hasDateFilter) {
                    taskMatch.updatedAt = dateFilter;
                }
                autoCurrent = await Task.countDocuments(taskMatch);
            } else {
                // custom category: preserve user's manual currentValue
                autoCurrent = Number(goal.currentValue) || 0;
            }

            // Determine status
            let status = goal.status === 'in-progress' ? 'in_progress' : (goal.status || 'in_progress');
            const targetVal = Number(goal.targetValue) || 1;
            const deadline = new Date(goal.endDate);
            deadline.setHours(23, 59, 59, 999);

            if (autoCurrent >= targetVal) {
                status = 'achieved';
            } else if (now > deadline && autoCurrent < targetVal) {
                status = 'missed';
            } else {
                // Check if pace is at risk (e.g. >65% time elapsed but <40% progress achieved)
                const start = new Date(goal.startDate || goal.createdAt || now);
                const totalTime = deadline.getTime() - start.getTime();
                const elapsedTime = now.getTime() - start.getTime();
                const progressPct = (autoCurrent / targetVal) * 100;

                if (totalTime > 0 && elapsedTime > 0) {
                    const timePct = (elapsedTime / totalTime) * 100;
                    if (timePct >= 65 && progressPct < 40) {
                        status = 'at_risk';
                    } else if (status === 'at_risk' && progressPct >= 50) {
                        status = 'in_progress';
                    }
                }
            }

            goal.currentValue = autoCurrent;
            goal.status = status;
            await goal.save();
            return goal;
        }));

        res.json(updatedGoals);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// CREATE goal
router.post('/', protect, checkPermission('goals', 'create'), async (req, res) => {
    try {
        const payload = { ...req.body, createdBy: req.user._id };
        if (payload.assignedTo === '' || payload.assignedTo === 'none' || payload.assignedTo === 'all') {
            delete payload.assignedTo;
            payload.assignedToName = 'Company Wide';
        } else if (payload.assignedTo) {
            const user = await User.findById(payload.assignedTo).select('name');
            if (user) {
                payload.assignedToName = user.name;
            }
        }

        if (payload.status === 'in-progress') payload.status = 'in_progress';

        const goal = new Goal(payload);
        await goal.save();
        res.status(201).json(goal);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// UPDATE goal
router.put('/:id', protect, checkPermission('goals', 'edit'), async (req, res) => {
    try {
        const updates = { ...req.body };
        if (updates.status === 'in-progress') updates.status = 'in_progress';

        if (updates.assignedTo === '' || updates.assignedTo === 'none' || updates.assignedTo === 'all') {
            updates.assignedTo = null;
            updates.assignedToName = 'Company Wide';
        } else if (updates.assignedTo) {
            const user = await User.findById(updates.assignedTo).select('name');
            if (user) {
                updates.assignedToName = user.name;
            }
        }

        const goal = await Goal.findByIdAndUpdate(req.params.id, updates, { new: true });
        res.json(goal);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// DELETE goal
router.delete('/:id', protect, checkPermission('goals', 'delete'), async (req, res) => {
    try {
        await Goal.findByIdAndDelete(req.params.id);
        res.json({ message: 'Goal deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
