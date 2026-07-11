const express = require('express');
const router = express.Router();
const TimeEntry = require('../models/TimeEntry');
const Task = require('../models/Task');
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
        // Allow admin/owner to specify userId, otherwise use requester's ID
        let userId = req.user._id;
        if ((req.user.role === 'admin' || req.user.role === 'owner') && req.body.userId) {
            userId = req.body.userId;
        }

        const timeEntry = new TimeEntry({
            userId,
            projectId: req.body.projectId,
            taskId: req.body.taskId,
            startTime: req.body.startTime || new Date(),
            note: req.body.note || '',
            isRunning: req.body.isRunning !== undefined ? req.body.isRunning : true,
            duration: req.body.duration || 0
        });

        const newTimeEntry = await timeEntry.save();

        if (req.body.taskId && (req.body.isRunning !== false)) {
            const task = await Task.findById(req.body.taskId);
            if (task) {
                const oldStatus = task.status;
                task.isTimerRunning = true;
                task.lastStartTime = new Date(newTimeEntry.startTime).getTime();
                task.timeEntryId = newTimeEntry._id.toString();
                if (task.status === 'todo') {
                    task.status = 'in-progress';
                }
                await task.save();

                // Log task activity
                try {
                    const TaskActivity = require('../models/TaskActivity');
                    const User = require('../models/User');
                    let assigneeName = '';
                    if (task.assigneeId) {
                        const assignee = await User.findById(task.assigneeId);
                        if (assignee) assigneeName = assignee.name;
                    }
                    await TaskActivity.create({
                        taskId: task._id.toString(),
                        taskTitle: task.title,
                        userId: req.user._id.toString(),
                        userName: req.user.name,
                        taskAssigneeId: task.assigneeId ? task.assigneeId.toString() : '',
                        taskAssigneeName: assigneeName,
                        taskStatus: task.status,
                        actionType: 'timer_start',
                        oldStatus,
                        newStatus: task.status,
                        details: `started timer (status changed from "${oldStatus}" to "${task.status}")`
                    });
                } catch (actErr) {
                    console.error('Task activity timer_start error:', actErr);
                }
            }
        }

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

        if (req.body.isRunning === false && timeEntry.taskId) {
            const task = await Task.findById(timeEntry.taskId);
            if (task) {
                const oldStatus = task.status;
                const now = Date.now();
                const start = new Date(timeEntry.startTime).getTime();
                const elapsed = now - (task.lastStartTime || start);
                
                task.isTimerRunning = false;
                task.totalTimeSpent = (task.totalTimeSpent || 0) + elapsed;
                task.lastStartTime = null;
                task.timeEntryId = null;
                if (task.status === 'in-progress') {
                    task.status = 'todo';
                }
                await task.save();

                // Log task activity
                try {
                    const TaskActivity = require('../models/TaskActivity');
                    const User = require('../models/User');
                    let assigneeName = '';
                    if (task.assigneeId) {
                        const assignee = await User.findById(task.assigneeId);
                        if (assignee) assigneeName = assignee.name;
                    }
                    await TaskActivity.create({
                        taskId: task._id.toString(),
                        taskTitle: task.title,
                        userId: req.user._id.toString(),
                        userName: req.user.name,
                        taskAssigneeId: task.assigneeId ? task.assigneeId.toString() : '',
                        taskAssigneeName: assigneeName,
                        taskStatus: task.status,
                        actionType: 'timer_stop',
                        oldStatus,
                        newStatus: task.status,
                        details: `stopped timer (status changed from "${oldStatus}" to "${task.status}")`
                    });
                } catch (actErr) {
                    console.error('Task activity timer_stop error:', actErr);
                }
            }
        }

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

        if (timeEntry.isRunning && timeEntry.taskId) {
            const task = await Task.findById(timeEntry.taskId);
            if (task) {
                const oldStatus = task.status;
                task.isTimerRunning = false;
                task.lastStartTime = null;
                task.timeEntryId = null;
                if (task.status === 'in-progress') {
                    task.status = 'todo';
                }
                await task.save();

                // Log task activity
                try {
                    const TaskActivity = require('../models/TaskActivity');
                    const User = require('../models/User');
                    let assigneeName = '';
                    if (task.assigneeId) {
                        const assignee = await User.findById(task.assigneeId);
                        if (assignee) assigneeName = assignee.name;
                    }
                    await TaskActivity.create({
                        taskId: task._id.toString(),
                        taskTitle: task.title,
                        userId: req.user._id.toString(),
                        userName: req.user.name,
                        taskAssigneeId: task.assigneeId ? task.assigneeId.toString() : '',
                        taskAssigneeName: assigneeName,
                        taskStatus: task.status,
                        actionType: 'timer_stop',
                        oldStatus,
                        newStatus: task.status,
                        details: `stopped timer due to entry deletion (status changed from "${oldStatus}" to "${task.status}")`
                    });
                } catch (actErr) {
                    console.error('Task activity timer_stop (delete) error:', actErr);
                }
            }
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

const stopAllRunningTimers = async (userId, details) => {
    const TimeEntry = require('../models/TimeEntry');
    const Task = require('../models/Task');
    const TaskActivity = require('../models/TaskActivity');
    const User = require('../models/User');

    const runningEntries = await TimeEntry.find({ userId, isRunning: true });
    for (const entry of runningEntries) {
        entry.endTime = new Date();
        entry.isRunning = false;
        const start = new Date(entry.startTime);
        entry.duration = Math.max(0, Math.floor((entry.endTime - start) / 1000 / 60)); // minutes
        await entry.save();

        if (entry.taskId) {
            const task = await Task.findById(entry.taskId);
            if (task) {
                const oldStatus = task.status;
                const now = Date.now();
                const elapsed = now - (task.lastStartTime || start.getTime());

                task.isTimerRunning = false;
                task.totalTimeSpent = (task.totalTimeSpent || 0) + elapsed;
                task.lastStartTime = null;
                task.timeEntryId = null;
                if (task.status === 'in-progress') {
                    task.status = 'todo';
                }
                if (details.includes('break')) {
                    task.wasPausedByBreak = true;
                    task.pausedByUserId = userId.toString();
                }
                await task.save();

                // Log task activity
                try {
                    let assigneeName = '';
                    if (task.assigneeId) {
                        const assignee = await User.findById(task.assigneeId);
                        if (assignee) assigneeName = assignee.name;
                    }
                    const user = await User.findById(userId);
                    await TaskActivity.create({
                        taskId: task._id.toString(),
                        taskTitle: task.title,
                        userId: userId.toString(),
                        userName: user ? user.name : 'System',
                        taskAssigneeId: task.assigneeId ? task.assigneeId.toString() : '',
                        taskAssigneeName: assigneeName,
                        taskStatus: task.status,
                        actionType: 'timer_stop',
                        oldStatus,
                        newStatus: task.status,
                        details
                    });
                } catch (actErr) {
                    console.error('Task activity timer_stop error:', actErr);
                }
            }
        }
    }
};

// Stop all running timers for current user (e.g. on logout)
router.post('/stop-running', protect, async (req, res) => {
    try {
        await stopAllRunningTimers(req.user._id, 'stopped timer automatically on logout');
        res.json({ message: 'Stopped all running timers successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.stopAllRunningTimers = stopAllRunningTimers;

module.exports = router;
