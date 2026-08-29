const express = require('express');
const router = express.Router();
const Goal = require('../models/Goal');
const Invoice = require('../models/Invoice');
const Lead = require('../models/Lead');
const Project = require('../models/Project');
const Task = require('../models/Task');
const { protect, checkPermission } = require('../middleware/authMiddleware');

// GET all goals + recalculate auto stats
router.get('/', protect, async (req, res) => {
    try {
        const goals = await Goal.find().sort({ createdAt: -1 });

        // Auto calculate system-driven goals (revenue, leads, projects)
        const totalRevenue = await Invoice.aggregate([
            { $match: { status: 'paid' } },
            { $group: { _id: null, total: { $sum: '$total' } } }
        ]);
        const revAmount = totalRevenue[0]?.total || 0;
        const totalWonLeads = await Lead.countDocuments({ stage: { $in: ['closed', 'won'] } });
        const totalCompletedProjects = await Project.countDocuments({ status: 'completed' });
        const totalDoneTasks = await Task.countDocuments({ status: { $in: ['done', 'completed'] } });

        const updatedGoals = await Promise.all(goals.map(async (goal) => {
            let autoCurrent = goal.currentValue;

            if (goal.category === 'revenue') {
                autoCurrent = revAmount;
            } else if (goal.category === 'leads') {
                autoCurrent = totalWonLeads;
            } else if (goal.category === 'projects') {
                autoCurrent = totalCompletedProjects;
            } else if (goal.category === 'tasks') {
                autoCurrent = totalDoneTasks;
            }

            let status = goal.status;
            if (autoCurrent >= goal.targetValue) {
                status = 'achieved';
            } else if (new Date() > new Date(goal.endDate) && autoCurrent < goal.targetValue) {
                status = 'missed';
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
router.post('/', protect, checkPermission('settings', 'edit'), async (req, res) => {
    try {
        const payload = { ...req.body, createdBy: req.user._id };
        if (payload.assignedTo === '' || payload.assignedTo === 'none') {
            delete payload.assignedTo;
        }
        const goal = new Goal(payload);
        await goal.save();
        res.status(201).json(goal);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// UPDATE goal
router.put('/:id', protect, checkPermission('settings', 'edit'), async (req, res) => {
    try {
        const goal = await Goal.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(goal);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// DELETE goal
router.delete('/:id', protect, checkPermission('settings', 'edit'), async (req, res) => {
    try {
        await Goal.findByIdAndDelete(req.params.id);
        res.json({ message: 'Goal deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
