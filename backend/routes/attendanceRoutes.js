const express = require('express');
const router = express.Router();
const Attendance = require('../models/Attendance');
const { protect, authorize } = require('../middleware/authMiddleware');

// Get today's attendance for a user
router.get('/today/:userId', protect, async (req, res) => {
    try {
        // Enforce same user or admin
        if (req.user.role !== 'admin' && req.user.role !== 'owner' && req.params.userId !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized to view this record' });
        }

        const { date } = req.query;
        let today;
        if (date) {
            today = new Date(date);
        } else {
            today = new Date();
        }
        today.setHours(0, 0, 0, 0);

        const attendance = await Attendance.findOne({
            userId: req.params.userId,
            date: today
        });

        res.json(attendance || { status: 'absent' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Check-in
router.post('/check-in', protect, async (req, res) => {
    try {
        const userId = req.user._id.toString(); // Use authenticated user ID for security
        const { localDate } = req.body;
        
        let today;
        if (localDate) {
            today = new Date(localDate);
        } else {
            today = new Date();
        }
        today.setHours(0, 0, 0, 0);

        let attendance = await Attendance.findOne({ userId, date: today });

        if (attendance) {
            if (attendance.status === 'checked-out' || attendance.status === 'half-day') {
                return res.status(400).json({ message: 'Your shift for today is already complete. See you tomorrow! 👋' });
            }
            return res.status(400).json({ message: 'Already checked in today' });
        }

        attendance = new Attendance({
            userId,
            date: today,
            checkIn: new Date(),
            status: 'present'
        });
        await attendance.save();
        res.status(201).json(attendance);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Break Start
router.post('/break-start', protect, async (req, res) => {
    try {
        const userId = req.user._id.toString();
        const { localDate } = req.body;
        let today;
        if (localDate) {
            today = new Date(localDate);
        } else {
            today = new Date();
        }
        today.setHours(0, 0, 0, 0);

        const attendance = await Attendance.findOne({ userId, date: today });

        if (!attendance) {
            return res.status(404).json({ message: 'No attendance record found for today' });
        }

        if (attendance.status === 'on-break') {
            return res.status(400).json({ message: 'Already on break' });
        }

        attendance.breaks.push({ start: new Date() });
        attendance.status = 'on-break';
        await attendance.save();

        // --- AUTOMATIC TIMER PAUSE ON BREAK START ---
        try {
            const Task = require('../models/Task');
            const TimeEntry = require('../models/TimeEntry');
            const runningTasks = await Task.find({ assigneeId: userId, isTimerRunning: true });
            for (const task of runningTasks) {
                const now = Date.now();
                const elapsed = now - (task.lastStartTime || now);
                task.isTimerRunning = false;
                task.totalTimeSpent = (task.totalTimeSpent || 0) + elapsed;
                task.lastStartTime = null;
                task.wasPausedByBreak = true; // Set flag to auto-resume later

                if (task.timeEntryId) {
                    const timeEntry = await TimeEntry.findById(task.timeEntryId);
                    if (timeEntry && timeEntry.isRunning) {
                        timeEntry.endTime = new Date();
                        timeEntry.isRunning = false;
                        const start = new Date(timeEntry.startTime);
                        timeEntry.duration = Math.max(0, Math.floor((timeEntry.endTime - start) / 1000 / 60)); // minutes
                        await timeEntry.save();
                    }
                }
                await task.save();
            }
        } catch (timerErr) {
            console.error('Failed to auto-pause timers on break start:', timerErr);
        }

        res.json(attendance);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Break End
router.post('/break-end', protect, async (req, res) => {
    try {
        const userId = req.user._id.toString();
        const { localDate } = req.body;
        let today;
        if (localDate) {
            today = new Date(localDate);
        } else {
            today = new Date();
        }
        today.setHours(0, 0, 0, 0);

        const attendance = await Attendance.findOne({ userId, date: today });

        if (!attendance || attendance.status !== 'on-break') {
            return res.status(400).json({ message: 'Not on break' });
        }

        const lastBreak = attendance.breaks[attendance.breaks.length - 1];
        lastBreak.end = new Date();

        const breakDuration = Math.floor((lastBreak.end - lastBreak.start) / 1000 / 60);
        attendance.totalBreakTime += breakDuration;
        attendance.status = 'present';

        await attendance.save();

        // --- AUTOMATIC TIMER RESUME ON BREAK END ---
        try {
            const Task = require('../models/Task');
            const TimeEntry = require('../models/TimeEntry');
            const pausedTasks = await Task.find({ assigneeId: userId, wasPausedByBreak: true });
            
            for (const task of pausedTasks) {
                // Create a new TimeEntry in the database
                const timeEntry = new TimeEntry({
                    userId,
                    projectId: task.projectId,
                    taskId: task._id,
                    startTime: new Date(),
                    isRunning: true,
                    note: `Resumed after break: ${task.title}`
                });
                await timeEntry.save();

                task.isTimerRunning = true;
                task.lastStartTime = Date.now();
                task.timeEntryId = timeEntry._id.toString();
                task.wasPausedByBreak = false; // Reset the flag
                await task.save();
            }
        } catch (timerErr) {
            console.error('Failed to auto-resume timers on break end:', timerErr);
        }

        res.json(attendance);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Check-out
router.post('/check-out', protect, async (req, res) => {
    try {
        const userId = req.user._id.toString();
        const { localDate } = req.body;
        let today;
        if (localDate) {
            today = new Date(localDate);
        } else {
            today = new Date();
        }
        today.setHours(0, 0, 0, 0);

        const attendance = await Attendance.findOne({ userId, date: today });

        if (!attendance) {
            return res.status(404).json({ message: 'No attendance record found' });
        }

        if (attendance.checkOut) {
            return res.status(400).json({ message: 'Already checked out' });
        }

        if (attendance.status === 'on-break') {
            return res.status(400).json({ message: 'Finish your break first' });
        }

        attendance.checkOut = new Date();
        attendance.status = 'checked-out';

        // Calculate total work time
        const totalDuration = Math.floor((attendance.checkOut - attendance.checkIn) / 1000 / 60);
        attendance.totalWorkTime = totalDuration - attendance.totalBreakTime;

        // Half-day Logic (e.g., < 4 hours)
        if (attendance.totalWorkTime < 240) {
            attendance.isHalfDay = true;
            attendance.status = 'half-day';
        }

        await attendance.save();

        // --- AUTOMATIC TIMER STOP ON CHECK-OUT ---
        try {
            const Task = require('../models/Task');
            const TimeEntry = require('../models/TimeEntry');
            const runningTasks = await Task.find({ assigneeId: userId, isTimerRunning: true });
            for (const task of runningTasks) {
                const now = Date.now();
                const elapsed = now - (task.lastStartTime || now);
                task.isTimerRunning = false;
                task.totalTimeSpent = (task.totalTimeSpent || 0) + elapsed;
                task.lastStartTime = null;

                if (task.timeEntryId) {
                    const timeEntry = await TimeEntry.findById(task.timeEntryId);
                    if (timeEntry && timeEntry.isRunning) {
                        timeEntry.endTime = new Date();
                        timeEntry.isRunning = false;
                        const start = new Date(timeEntry.startTime);
                        timeEntry.duration = Math.max(0, Math.floor((timeEntry.endTime - start) / 1000 / 60)); // minutes
                        await timeEntry.save();
                    }
                }
                task.timeEntryId = null;
                await task.save();
            }
        } catch (timerErr) {
            console.error('Failed to auto-stop timers on check-out:', timerErr);
        }
        // ------------------------------------------

        res.json(attendance);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Get monthly attendance data
router.get('/monthly', protect, async (req, res) => {
    try {
        const { month, year, userId } = req.query;
        const targetMonth = month ? parseInt(month) : new Date().getMonth();
        const targetYear = year ? parseInt(year) : new Date().getFullYear();

        const startDate = new Date(targetYear, targetMonth, 1);
        const endDate = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59);

        const filter = {
            date: { $gte: startDate, $lte: endDate }
        };

        // RBAC: Non-admins can only see their own records
        if (req.user.role !== 'admin' && req.user.role !== 'owner') {
            filter.userId = req.user._id.toString();
        } else if (userId) {
            filter.userId = userId;
        }

        const attendance = await Attendance.find(filter);
        res.json(attendance);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Manual Attendance Management (Admin only)
router.post('/manual', protect, authorize('admin', 'owner'), async (req, res) => {
    try {
        const { userId, date, status } = req.body;
        const targetDate = new Date(date);
        targetDate.setHours(0, 0, 0, 0);

        let attendance = await Attendance.findOne({ userId, date: targetDate });

        if (attendance) {
            attendance.status = status;
            attendance.isHalfDay = (status === 'half-day');
            await attendance.save();
        } else {
            attendance = new Attendance({
                userId,
                date: targetDate,
                status,
                isHalfDay: (status === 'half-day'),
                checkIn: status !== 'absent' ? targetDate : undefined,
                checkOut: status === 'present' ? targetDate : undefined
            });
            await attendance.save();
        }

        res.json({ message: 'Attendance updated successfully', attendance });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Get attendance history for a user
router.get('/history/:userId', protect, async (req, res) => {
    try {
        // Enforce same user or admin
        if (req.user.role !== 'admin' && req.user.role !== 'owner' && req.params.userId !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        const { month, year } = req.query;
        const filter = { userId: req.params.userId };

        if (month !== undefined && year !== undefined) {
            const targetMonth = parseInt(month);
            const targetYear = parseInt(year);
            const startDate = new Date(targetYear, targetMonth, 1);
            const endDate = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59);
            filter.date = { $gte: startDate, $lte: endDate };
        }

        const history = await Attendance.find(filter)
            .sort({ date: -1 })
            .limit(month !== undefined ? 100 : 30);
        res.json(history);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
