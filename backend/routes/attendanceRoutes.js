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

        const today = new Date();
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
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        let attendance = await Attendance.findOne({ userId, date: today });

        if (attendance) {
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
        const today = new Date();
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

        res.json(attendance);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Break End
router.post('/break-end', protect, async (req, res) => {
    try {
        const userId = req.user._id.toString();
        const today = new Date();
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
        res.json(attendance);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Check-out
router.post('/check-out', protect, async (req, res) => {
    try {
        const userId = req.user._id.toString();
        const today = new Date();
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
        res.json(attendance);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Get monthly attendance for all users (Admin only)
router.get('/monthly', protect, authorize('admin', 'owner'), async (req, res) => {
    try {
        const { month, year } = req.query;
        const targetMonth = month ? parseInt(month) : new Date().getMonth();
        const targetYear = year ? parseInt(year) : new Date().getFullYear();

        const startDate = new Date(targetYear, targetMonth, 1);
        const endDate = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59);

        const attendance = await Attendance.find({
            date: { $gte: startDate, $lte: endDate }
        });

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

        const history = await Attendance.find({ userId: req.params.userId })
            .sort({ date: -1 })
            .limit(30);
        res.json(history);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
