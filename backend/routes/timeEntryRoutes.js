const express = require('express');
const router = express.Router();
const TimeEntry = require('../models/TimeEntry');
const Task = require('../models/Task');
const { protect, checkPermission } = require('../middleware/authMiddleware');

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

// Detailed Time & Employee Work Speed Analytics Report (Must be before GET /:id)
router.get('/reports/detailed', protect, async (req, res) => {
    try {
        const { startDate, endDate, userId, projectId } = req.query;

        let query = {};

        // Enforcement: If not admin/owner, force user's own ID
        if (req.user.role !== 'admin' && req.user.role !== 'owner') {
            query.userId = req.user._id;
        } else if (userId && userId !== 'all') {
            query.userId = userId;
        }

        if (projectId && projectId !== 'all') query.projectId = projectId;

        // Filter date range with local day boundary precision
        let reqStart;
        if (startDate) {
            const parts = String(startDate).split('-').map(Number);
            if (parts.length === 3 && !parts.some(isNaN)) {
                reqStart = new Date(parts[0], parts[1] - 1, parts[2], 0, 0, 0, 0);
            } else {
                reqStart = new Date(startDate);
                reqStart.setHours(0, 0, 0, 0);
            }
        } else {
            reqStart = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
            reqStart.setHours(0, 0, 0, 0);
        }

        let reqEnd;
        if (endDate) {
            const parts = String(endDate).split('-').map(Number);
            if (parts.length === 3 && !parts.some(isNaN)) {
                reqEnd = new Date(parts[0], parts[1] - 1, parts[2], 23, 59, 59, 999);
            } else {
                reqEnd = new Date(endDate);
                reqEnd.setHours(23, 59, 59, 999);
            }
        } else {
            reqEnd = new Date();
            reqEnd.setHours(23, 59, 59, 999);
        }

        query.startTime = { $gte: reqStart, $lte: reqEnd };

        const entries = await TimeEntry.find(query)
            .populate('userId', 'name email role designation')
            .populate('projectId', 'name status')
            .populate('taskId', 'title status estimatedHours totalTimeSpent priority')
            .sort({ startTime: -1 });

        // Calculate Yesterday vs Today dates
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
        const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

        const startOfYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0, 0);
        const endOfYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999);

        // Fetch Yesterday & Today entries for comparison
        let yesterdayQuery = { startTime: { $gte: startOfYesterday, $lte: endOfYesterday } };
        let todayQuery = { startTime: { $gte: startOfToday, $lte: endOfToday } };

        if (req.user.role !== 'admin' && req.user.role !== 'owner') {
            yesterdayQuery.userId = req.user._id;
            todayQuery.userId = req.user._id;
        } else if (userId && userId !== 'all') {
            yesterdayQuery.userId = userId;
            todayQuery.userId = userId;
        }
        if (projectId && projectId !== 'all') {
            yesterdayQuery.projectId = projectId;
            todayQuery.projectId = projectId;
        }

        const yesterdayEntries = await TimeEntry.find(yesterdayQuery)
            .populate('userId', 'name email')
            .populate('projectId', 'name')
            .populate('taskId', 'title status');

        const todayEntries = await TimeEntry.find(todayQuery)
            .populate('userId', 'name email')
            .populate('projectId', 'name')
            .populate('taskId', 'title status');

        // Aggregation per employee
        const employeeStatsMap = {};

        entries.forEach(entry => {
            if (!entry.userId) return;
            const uId = entry.userId._id ? entry.userId._id.toString() : entry.userId.toString();
            const uName = entry.userId.name || 'Unknown User';
            const uEmail = entry.userId.email || '';

            if (!employeeStatsMap[uId]) {
                employeeStatsMap[uId] = {
                    userId: uId,
                    userName: uName,
                    userEmail: uEmail,
                    totalDurationMinutes: 0,
                    completedTasksCount: 0,
                    totalEntriesCount: 0,
                    tasksWorked: new Set(),
                    projectsWorked: new Set(),
                    estimatedMinutesTotal: 0,
                    todayMinutes: 0,
                    yesterdayMinutes: 0,
                    runningTimersCount: 0
                };
            }

            const emp = employeeStatsMap[uId];
            let dur = entry.duration || 0;
            if (entry.isRunning && entry.startTime) {
                dur = Math.floor((Date.now() - new Date(entry.startTime).getTime()) / 1000 / 60);
                emp.runningTimersCount += 1;
            }

            emp.totalDurationMinutes += dur;
            emp.totalEntriesCount += 1;

            if (entry.taskId) {
                const taskIdStr = entry.taskId._id ? entry.taskId._id.toString() : entry.taskId.toString();
                emp.tasksWorked.add(taskIdStr);
                if (entry.taskId.status === 'completed' || entry.taskId.status === 'done') {
                    emp.completedTasksCount += 1;
                }
                if (entry.taskId.estimatedHours) {
                    emp.estimatedMinutesTotal += (entry.taskId.estimatedHours * 60);
                }
            }

            if (entry.projectId) {
                const projIdStr = entry.projectId._id ? entry.projectId._id.toString() : entry.projectId.toString();
                emp.projectsWorked.add(projIdStr);
            }
        });

        // Add yesterday & today minutes per employee
        yesterdayEntries.forEach(entry => {
            if (!entry.userId) return;
            const uId = entry.userId._id ? entry.userId._id.toString() : entry.userId.toString();
            if (employeeStatsMap[uId]) {
                employeeStatsMap[uId].yesterdayMinutes += (entry.duration || 0);
            }
        });

        todayEntries.forEach(entry => {
            if (!entry.userId) return;
            const uId = entry.userId._id ? entry.userId._id.toString() : entry.userId.toString();
            let dur = entry.duration || 0;
            if (entry.isRunning && entry.startTime) {
                dur = Math.floor((Date.now() - new Date(entry.startTime).getTime()) / 1000 / 60);
            }
            if (employeeStatsMap[uId]) {
                employeeStatsMap[uId].todayMinutes += dur;
            }
        });

        // Convert employee stats to list with Speed Calculation
        const employeeLeaderboard = Object.values(employeeStatsMap).map(emp => {
            const totalHours = emp.totalDurationMinutes / 60;
            const uniqueTasksCount = emp.tasksWorked.size;
            const uniqueProjectsCount = emp.projectsWorked.size;

            const tasksPerHour = totalHours > 0 ? (uniqueTasksCount / totalHours) : 0;

            let speedRating = 'Standard';
            let speedBadgeColor = 'blue';

            if (tasksPerHour >= 1.5 || (emp.completedTasksCount > 0 && emp.totalDurationMinutes > 0 && (emp.estimatedMinutesTotal > emp.totalDurationMinutes))) {
                speedRating = 'High Speed ⚡';
                speedBadgeColor = 'emerald';
            } else if (tasksPerHour >= 0.8) {
                speedRating = 'Optimal ⏱️';
                speedBadgeColor = 'indigo';
            } else if (totalHours > 4 && uniqueTasksCount <= 1) {
                speedRating = 'Needs Focus ⏳';
                speedBadgeColor = 'amber';
            }

            return {
                userId: emp.userId,
                userName: emp.userName,
                userEmail: emp.userEmail,
                totalHours: Number(totalHours.toFixed(2)),
                todayHours: Number((emp.todayMinutes / 60).toFixed(2)),
                yesterdayHours: Number((emp.yesterdayMinutes / 60).toFixed(2)),
                uniqueTasksCount,
                completedTasksCount: emp.completedTasksCount,
                uniqueProjectsCount,
                totalEntriesCount: emp.totalEntriesCount,
                runningTimersCount: emp.runningTimersCount,
                tasksPerHour: Number(tasksPerHour.toFixed(2)),
                speedRating,
                speedBadgeColor
            };
        }).sort((a, b) => b.totalHours - a.totalHours);

        res.json({
            summary: {
                totalLoggedMinutes: entries.reduce((sum, e) => {
                    let d = e.duration || 0;
                    if (e.isRunning && e.startTime) {
                        d = Math.floor((Date.now() - new Date(e.startTime).getTime()) / 1000 / 60);
                    }
                    return sum + d;
                }, 0),
                yesterdayLoggedMinutes: yesterdayEntries.reduce((sum, e) => sum + (e.duration || 0), 0),
                todayLoggedMinutes: todayEntries.reduce((sum, e) => {
                    let d = e.duration || 0;
                    if (e.isRunning && e.startTime) {
                        d = Math.floor((Date.now() - new Date(e.startTime).getTime()) / 1000 / 60);
                    }
                    return sum + d;
                }, 0),
                totalEntriesCount: entries.length,
                uniqueEmployeesCount: Object.keys(employeeStatsMap).length,
            },
            employeeLeaderboard,
            yesterdayEntries: yesterdayEntries.map(e => ({
                id: e._id,
                userName: e.userId?.name || 'Unknown',
                projectName: e.projectId?.name || 'General',
                taskTitle: e.taskId?.title || 'Direct Work Log',
                startTime: e.startTime,
                endTime: e.endTime,
                durationMinutes: e.duration,
                note: e.note || ''
            })),
            todayEntries: todayEntries.map(e => ({
                id: e._id,
                userName: e.userId?.name || 'Unknown',
                projectName: e.projectId?.name || 'General',
                taskTitle: e.taskId?.title || 'Direct Work Log',
                startTime: e.startTime,
                endTime: e.endTime,
                durationMinutes: e.isRunning ? Math.floor((Date.now() - new Date(e.startTime).getTime()) / 1000 / 60) : e.duration,
                isRunning: e.isRunning,
                note: e.note || ''
            })),
            detailedEntries: entries
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get running timer for current user (Must be before GET /:id)
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

// General summary for user (Must be before GET /:id)
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

// Get a single time entry by ID (Must be after specific GET routes)
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
router.delete('/:id', protect, checkPermission('time_tracking', 'manage_all'), async (req, res) => {
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
