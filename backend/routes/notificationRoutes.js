const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const { protect } = require('../middleware/authMiddleware');

// Get all notifications for current user
router.get('/', protect, async (req, res) => {
    try {
        const notifications = await Notification.find({ userId: req.user._id })
            .sort({ createdAt: -1 })
            .limit(50);
        res.json(notifications);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Mark one as read
router.put('/:id/read', protect, async (req, res) => {
    try {
        const notif = await Notification.findOneAndUpdate(
            { _id: req.params.id, userId: req.user._id },
            { read: true },
            { new: true }
        );
        if (!notif) return res.status(404).json({ message: 'Notification not found' });
        res.json(notif);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Mark all as read
router.put('/mark-all-read', protect, async (req, res) => {
    try {
        await Notification.updateMany(
            { userId: req.user._id, read: false },
            { read: true }
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
