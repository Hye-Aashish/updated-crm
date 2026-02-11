const express = require('express');
const router = express.Router();
const TimeEntry = require('../models/TimeEntry');
const { protect, authorize } = require('../middleware/authMiddleware');

// Get all time entries with filters
router.get('/', protect, async (req, res) => {
    try {
        const { userId, projectId, taskId, startDate, endDate } = req.query;

        let query = {};

        // Enforcement: If not admin/owner, force the user's own ID
        if (req.user.role !== 'admin' && req.user.role !== 'owner') {
            query.userId = req.user._id;
        } else if (userId) {
            query.userId = userId;
        }

        if (projectId) query.projectId = projectId;
        if (taskId) query.taskId = taskId;

        // Date range filter
        if (startDate || endDate) {
            query.startTime = {};
            if (startDate) query.startTime.$gte = new Date(startDate);
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                query.startTime.$lte = end;
            }
        }

        const timeEntries = await TimeEntry.find(query)
            .populate('userId', 'name email')
            .populate('projectId', 'name status')
            .populate('taskId', 'title status')
            .sort({ startTime: -1 });

        res.json(timeEntries);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get a single time entry
router.get('/:id', protect, async (req, res) => {
    try {
        const timeEntry = await TimeEntry.findById(req.params.id)
            .populate('userId', 'name email')
            .populate('projectId', 'name status')
            .populate('taskId', 'title status');

        if (!timeEntry) {
            return res.status(404).json({ message: 'Time entry not found' });
        }

        // Authorization check
        if (req.user.role !== 'admin' && req.user.role !== 'owner' && timeEntry.userId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        res.json(timeEntry);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Create a new time entry (start timer)
router.post('/', protect, async (req, res) => {
    try {
        const timeEntry = new TimeEntry({
            userId: req.user._id, // Enforce current user
            projectId: req.body.projectId,
            taskId: req.body.taskId,
            startTime: req.body.startTime || new Date(),
            note: req.body.note || '',
            isRunning: req.body.isRunning !== undefined ? req.body.isRunning : true,
            duration: req.body.duration || 0
        });

        const newTimeEntry = await timeEntry.save();
        const populated = await TimeEntry.findById(newTimeEntry._id)
            .populate('userId', 'name email')
            .populate('projectId', 'name status')
            .populate('taskId', 'title status');

        res.status(201).json(populated);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Update a time entry (stop timer, update note, etc.)
router.put('/:id', protect, async (req, res) => {
    try {
        const timeEntry = await TimeEntry.findById(req.params.id);

        if (!timeEntry) {
            return res.status(404).json({ message: 'Time entry not found' });
        }

        // Authorization check
        if (req.user.role !== 'admin' && req.user.role !== 'owner' && timeEntry.userId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        // Update fields
        if (req.body.endTime !== undefined) timeEntry.endTime = req.body.endTime;
        if (req.body.duration !== undefined) timeEntry.duration = req.body.duration;
        if (req.body.note !== undefined) timeEntry.note = req.body.note;
        if (req.body.isRunning !== undefined) timeEntry.isRunning = req.body.isRunning;

        // If stopping the timer, calculate duration
        if (req.body.isRunning === false && !req.body.duration) {
            const start = new Date(timeEntry.startTime);
            const end = req.body.endTime ? new Date(req.body.endTime) : new Date();
            timeEntry.endTime = end;
            timeEntry.duration = Math.floor((end - start) / 1000 / 60); // minutes
        }

        const updatedTimeEntry = await timeEntry.save();
        const populated = await TimeEntry.findById(updatedTimeEntry._id)
            .populate('userId', 'name email')
            .populate('projectId', 'name status')
            .populate('taskId', 'title status');

        res.json(populated);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Delete a time entry
router.delete('/:id', protect, async (req, res) => {
    try {
        const timeEntry = await TimeEntry.findById(req.params.id);

        if (!timeEntry) {
            return res.status(404).json({ message: 'Time entry not found' });
        }

        // Authorization check
        if (req.user.role !== 'admin' && req.user.role !== 'owner' && timeEntry.userId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        await timeEntry.deleteOne();
        res.json({ message: 'Time entry deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get running timer for current user
router.get('/running/me', protect, async (req, res) => {
    try {
        const runningTimer = await TimeEntry.findOne({
            userId: req.user._id,
            isRunning: true
        })
            .populate('userId', 'name email')
            .populate('projectId', 'name status')
            .populate('taskId', 'title status');

        res.json(runningTimer);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// General summary for user
router.get('/stats/summary', protect, async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        let query = {};
        if (req.user.role !== 'admin' && req.user.role !== 'owner') {
            query.userId = req.user._id;
        }

        if (startDate || endDate) {
            query.startTime = {};
            if (startDate) query.startTime.$gte = new Date(startDate);
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                query.startTime.$lte = end;
            }
        }

        const entries = await TimeEntry.find(query);

        const totalMinutes = entries.reduce((sum, entry) => sum + entry.duration, 0);
        const totalHours = Math.floor(totalMinutes / 60);

        // Today's hours
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayEntries = entries.filter(e => {
            const entryDate = new Date(e.startTime);
            return entryDate >= today;
        });
        const todayMinutes = todayEntries.reduce((sum, entry) => sum + entry.duration, 0);
        const todayHours = Math.floor(todayMinutes / 60);

        // Active timers count
        const activeTimers = await TimeEntry.countDocuments({ ...query, isRunning: true });

        res.json({
            totalHours,
            todayHours,
            activeTimers,
            totalEntries: entries.length
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
