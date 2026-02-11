const express = require('express');
const router = express.Router();
const Attendance = require('../models/Attendance');
const User = require('../models/User');
const Setting = require('../models/Setting');
const { protect, authorize } = require('../middleware/authMiddleware');

// Helper to get days in month
const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();

// Get payroll for all employees (Admin/Owner only)
router.get('/all', protect, authorize('admin', 'owner'), async (req, res) => {
    try {
        const { month, year, workingDays } = req.query;
        const targetMonth = month ? parseInt(month) : new Date().getMonth();
        const targetYear = year ? parseInt(year) : new Date().getFullYear();

        // Fetch Settings
        const settings = await Setting.findOne({ type: 'general' });
        const payrollSettings = settings?.payroll || { offDays: [0], holidays: [] };

        const daysInMonth = getDaysInMonth(targetYear, targetMonth);

        // Calculate Standard Working Days if not provided
        let autoWorkingDays = 0;
        for (let d = 1; d <= daysInMonth; d++) {
            const date = new Date(targetYear, targetMonth, d);
            const dateStr = date.toISOString().split('T')[0];
            const isOff = payrollSettings.offDays.includes(date.getDay());
            const isHoliday = payrollSettings.holidays.some(h => h.date === dateStr);
            if (!isOff && !isHoliday) autoWorkingDays++;
        }

        const customWorkingDays = workingDays ? parseInt(workingDays) : autoWorkingDays;

        const startDate = new Date(targetYear, targetMonth, 1);
        const endDate = new Date(targetYear, targetMonth, daysInMonth, 23, 59, 59);

        const users = await User.find({ role: { $ne: 'owner' } });
        const payrollData = [];

        for (const user of users) {
            const attendance = await Attendance.find({
                userId: user.id || user._id,
                date: { $gte: startDate, $lte: endDate }
            });

            const stats = {
                present: 0,
                halfDay: 0,
                absent: 0,
                paidDays: 0
            };

            attendance.forEach(record => {
                if (record.status === 'half-day' || record.isHalfDay) {
                    stats.halfDay++;
                    stats.paidDays += 0.5;
                } else if (record.status === 'present' || record.status === 'checked-out') {
                    stats.present++;
                    stats.paidDays += 1;
                }
            });

            // Add Holidays to paid days
            for (let d = 1; d <= daysInMonth; d++) {
                const date = new Date(targetYear, targetMonth, d);
                const dateStr = date.toISOString().split('T')[0];
                const isOff = payrollSettings.offDays.includes(date.getDay());
                const isHoliday = payrollSettings.holidays.some(h => h.date === dateStr);

                if (isHoliday || isOff) {
                    const hasAttendance = attendance.some(a => new Date(a.date).getDate() === d);
                    if (!hasAttendance) {
                        stats.paidDays += 1;
                    }
                }
            }

            const baseSalary = parseFloat(user.salary) || 0;
            const currentSalary = (baseSalary / daysInMonth) * stats.paidDays;

            payrollData.push({
                userId: user.id || user._id,
                name: user.name,
                role: user.role,
                designation: user.designation,
                baseSalary,
                stats,
                calculatedSalary: Math.round(currentSalary),
                month: targetMonth,
                year: targetYear,
                workingDays: customWorkingDays,
                totalDays: daysInMonth
            });
        }

        res.json(payrollData);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get payroll for specific user (Employee/Personal)
router.get('/my/:userId', protect, async (req, res) => {
    try {
        const { userId } = req.params;

        // Ensure user is admin OR requesting their own data
        if (req.user.role !== 'admin' && req.user.role !== 'owner' && req.user._id.toString() !== userId) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        const { month, year } = req.query;
        const targetMonth = month ? parseInt(month) : new Date().getMonth();
        const targetYear = year ? parseInt(year) : new Date().getFullYear();

        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: 'User not found' });

        const settings = await Setting.findOne({ type: 'general' });
        const payrollSettings = settings?.payroll || { offDays: [0], holidays: [] };

        const daysInMonth = getDaysInMonth(targetYear, targetMonth);
        const startDate = new Date(targetYear, targetMonth, 1);
        const endDate = new Date(targetYear, targetMonth, daysInMonth, 23, 59, 59);

        const attendance = await Attendance.find({
            userId,
            date: { $gte: startDate, $lte: endDate }
        });

        const stats = {
            present: 0,
            halfDay: 0,
            absent: 0,
            paidDays: 0
        };

        attendance.forEach(record => {
            if (record.status === 'half-day' || record.isHalfDay) {
                stats.halfDay++;
                stats.paidDays += 0.5;
            } else if (record.status === 'present' || record.status === 'checked-out') {
                stats.present++;
                stats.paidDays += 1;
            }
        });

        for (let d = 1; d <= daysInMonth; d++) {
            const date = new Date(targetYear, targetMonth, d);
            const dateStr = date.toISOString().split('T')[0];
            const isOff = payrollSettings.offDays.includes(date.getDay());
            const isHoliday = payrollSettings.holidays.some(h => h.date === dateStr);

            if (isHoliday || isOff) {
                const hasAttendance = attendance.some(a => new Date(a.date).getDate() === d);
                if (!hasAttendance) {
                    stats.paidDays += 1;
                }
            }
        }

        const baseSalary = parseFloat(user.salary) || 0;
        const currentSalary = (baseSalary / daysInMonth) * stats.paidDays;

        res.json({
            userId,
            name: user.name,
            baseSalary,
            stats,
            calculatedSalary: Math.round(currentSalary),
            month: targetMonth,
            year: targetYear,
            daysInMonth,
            workingDays: daysInMonth
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
