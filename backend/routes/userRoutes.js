const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { protect, authorize } = require('../middleware/authMiddleware');

// GET all users (Admin only)
router.get('/', protect, authorize('admin', 'owner'), async (req, res) => {
    try {
        const users = await User.find().select('-password'); // Exclude password
        res.json(users);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// CREATE a new user (Admin only)
router.post('/', protect, authorize('admin', 'owner'), async (req, res) => {
    const user = new User(req.body);
    try {
        const newUser = await user.save();
        res.status(201).json(newUser);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// UPDATE user (Admin or Self)
router.put('/:id', protect, async (req, res) => {
    try {
        const userId = req.params.id;
        // Only admin/owner or self can update
        if (req.user.role !== 'admin' && req.user.role !== 'owner' && userId !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: 'User not found' });

        const updateData = { ...req.body };

        // Prevent role escalation
        if (req.user.role !== 'admin' && req.user.role !== 'owner') {
            delete updateData.role;
        }

        // Apply updates
        Object.keys(updateData).forEach(key => {
            if (key !== '_id' && key !== 'password') {
                user[key] = updateData[key];
            }
        });

        // Handle password update separately to ensure hashing
        if (updateData.password) {
            user.password = updateData.password;
        }

        await user.save();

        const userResponse = user.toObject();
        delete userResponse.password;
        res.json(userResponse);
    } catch (err) {
        console.error("Update User Error:", err);
        res.status(400).json({ message: err.message });
    }
});

// DELETE user (Admin only)
router.delete('/:id', protect, authorize('admin', 'owner'), async (req, res) => {
    try {
        await User.findByIdAndDelete(req.params.id);
        res.json({ message: 'User deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
