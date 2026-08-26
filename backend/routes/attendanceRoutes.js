const express = require('express');
const router = express.Router();
const Attendance = require('../models/Attendance');
const { protect, authorize } = require('../middleware/authMiddleware');
const timeEntryRouter = require('./timeEntryRoutes');

// Helper to normalize any date input to UTC midnight (in IST context)
function getMidnightUTC(dateInput) {
    if (!dateInput) {
        const now = new Date();
        const localTime = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
        return new Date(Date.UTC(localTime.getUTCFullYear(), localTime.getUTCMonth(), localTime.getUTCDate()));
    }
    if (typeof dateInput === 'string' && dateInput.length === 10) {
        return new Date(dateInput); // YYYY-MM-DD parses directly to UTC midnight
    }
    const d = new Date(dateInput);
    const localTime = new Date(d.getTime() + 5.5 * 60 * 60 * 1000);
    return new Date(Date.UTC(localTime.getUTCFullYear(), localTime.getUTCMonth(), localTime.getUTCDate()));
}

// Get live team presence across all staff members (Real-time activity, breaks, work durations)
router.get('/live-presence', protect, async (req, res) => {
    try {
        const { date } = req.query;
        const today = getMidnightUTC(date);
        const User = require('../models/User');
        const TimeEntry = require('../models/TimeEntry');

        const [users, attendanceRecords, runningTimers] = await Promise.all([
            User.find({ role: { $ne: 'client' } }).select('name email role avatar employeeId designation department phone').lean(),
            Attendance.find({ date: today }).lean(),
            TimeEntry.find({ isRunning: true }).populate('taskId', 'title priority').populate('projectId', 'name').lean()
        ]);

        const now = new Date();

        const members = users.map(user => {
            const userIdStr = user._id.toString();
            const att = attendanceRecords.find(a => a.userId === userIdStr);
            const activeTimer = runningTimers.find(t => t.userId?.toString() === userIdStr);

            let status = 'not-joined'; // 'working' | 'on-break' | 'completed' | 'not-joined' | 'half-day' | 'leave'
            let checkIn = null;
            let checkOut = null;
            let currentBreakStart = null;
            let currentBreakMinutes = 0;
            let totalBreakMinutes = 0;
            let totalWorkMinutes = 0;
            let breaks = [];

            if (att) {
                checkIn = att.checkIn;
                checkOut = att.checkOut;
                breaks = att.breaks || [];
                totalBreakMinutes = att.totalBreakTime || 0;

                if (att.status === 'on-break') {
                    status = 'on-break';
                    const lastBreak = breaks.length > 0 ? breaks[breaks.length - 1] : null;
                    if (lastBreak && lastBreak.start && !lastBreak.end) {
                        currentBreakStart = lastBreak.start;
                        currentBreakMinutes = Math.max(0, Math.floor((now.getTime() - new Date(lastBreak.start).getTime()) / 60000));
                    }
                } else if (att.status === 'checked-out' || att.status === 'half-day') {
                    status = 'completed';
                    totalWorkMinutes = att.totalWorkTime || 0;
                } else if (att.status === 'present') {
                    status = 'working';
                    if (checkIn) {
                        const elapsedMins = Math.max(0, Math.floor((now.getTime() - new Date(checkIn).getTime()) / 60000));
                        totalWorkMinutes = Math.max(0, elapsedMins - totalBreakMinutes);
                    }
                } else {
                    status = att.status;
                }
            }

            return {
                id: userIdStr,
                _id: userIdStr,
                name: user.name,
                email: user.email,
                role: user.role,
                avatar: user.avatar,
                designation: user.designation || user.role,
                department: user.department || 'General',
                phone: user.phone,
                employeeId: user.employeeId,
                status,
                rawStatus: att?.status || 'absent',
                checkIn,
                checkOut,
                breaks,
                currentBreakStart,
                currentBreakMinutes,
                totalBreakMinutes: totalBreakMinutes + currentBreakMinutes,
                totalWorkMinutes,
                activeTask: activeTimer ? {
                    taskTitle: activeTimer.taskId?.title,
                    projectName: activeTimer.projectId?.name,
                    startTime: activeTimer.startTime,
                    timerDurationMinutes: Math.max(0, Math.floor((now.getTime() - new Date(activeTimer.startTime).getTime()) / 60000))
                } : null
            };
        });

        // Sort: On Break first, then Working, then Completed, then Not-Joined
        const statusPriority = { 'on-break': 1, 'working': 2, 'completed': 3, 'not-joined': 4 };
        members.sort((a, b) => (statusPriority[a.status] || 99) - (statusPriority[b.status] || 99));

        const summary = {
            totalStaff: members.length,
            working: members.filter(m => m.status === 'working').length,
            onBreak: members.filter(m => m.status === 'on-break').length,
            completed: members.filter(m => m.status === 'completed').length,
            notJoined: members.filter(m => m.status === 'not-joined').length
        };

        res.json({
            date: today,
            summary,
            members
        });
    } catch (error) {
        console.error('Error fetching live presence:', error);
        res.status(500).json({ message: error.message });
    }
});

// Get today's attendance for a user
router.get('/today/:userId', protect, async (req, res) => {
    try {
        // Enforce same user or admin
        if (req.user.role !== 'admin' && req.user.role !== 'owner' && req.params.userId !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized to view this record' });
        }

        const { date } = req.query;
        const today = getMidnightUTC(date);

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
        
        const today = getMidnightUTC(localDate);

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
        const today = getMidnightUTC(localDate);

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
            await timeEntryRouter.stopAllRunningTimers(userId, 'stopped timer automatically on break start');
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
        const today = getMidnightUTC(localDate);

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
            const pausedTasks = await Task.find({ pausedByUserId: userId, wasPausedByBreak: true });
            
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
                task.pausedByUserId = undefined; // Reset who paused
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
        const today = getMidnightUTC(localDate);

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

        // Half-day Logic (dynamic from settings, default 4.5 hours / 270 mins or 4 hours / 240 mins)
        let thresholdMinutes = 270;
        try {
            const Setting = require('../models/Setting');
            const setting = await Setting.findOne({ type: 'general' });
            if (setting?.attendance?.halfDayThresholdHours) {
                thresholdMinutes = Number(setting.attendance.halfDayThresholdHours) * 60;
            }
        } catch (e) {
            console.error('Error fetching half-day threshold setting:', e.message);
        }

        if (attendance.totalWorkTime < thresholdMinutes) {
            attendance.isHalfDay = true;
            attendance.status = 'half-day';
        }

        await attendance.save();

        // --- AUTOMATIC TIMER STOP ON CHECK-OUT ---
        try {
            await timeEntryRouter.stopAllRunningTimers(userId, 'stopped timer automatically on checkout');
        } catch (timerErr) {
            console.error('Failed to auto-stop timers on check-out:', timerErr);
        }

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

        const startDate = new Date(Date.UTC(targetYear, targetMonth, 1));
        const endDate = new Date(Date.UTC(targetYear, targetMonth + 1, 0, 23, 59, 59));

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
        const targetDate = getMidnightUTC(date);

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
