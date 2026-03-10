const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Project = require('../models/Project');
const { protect, authorize } = require('../middleware/authMiddleware');

// GET all users
router.get('/', protect, async (req, res) => {
    try {
        const userRole = req.user.role;
        let query = User.find();

        if (userRole === 'admin' || userRole === 'owner') {
            // Full data for admins
            const users = await query.select('-password');
            res.json(users);
        } else if (['pm', 'developer', 'employee'].includes(userRole)) {
            // Limited data for other staff for assignment purposes
            const users = await query.select('name email role avatar designation department');
            res.json(users);
        } else if (userRole === 'client') {
            // Clients can see users who are part of their projects
            const myProjects = await Project.find({ clientId: req.user.clientId }).select('pmId members');
            const pmIds = myProjects.map(p => p.pmId).filter(Boolean);
            const memberIds = myProjects.flatMap(p => p.members || []);
            const relevantUserIds = Array.from(new Set([...pmIds, ...memberIds]));

            const users = await User.find({
                _id: { $in: relevantUserIds }
            }).select('name email role avatar designation department');
            res.json(users);
        } else {
            // Others shouldn't see user list
            res.status(403).json({ message: 'Not authorized to view user list' });
        }
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// CREATE a new user (Admin only)
router.post('/', protect, authorize('admin', 'owner'), async (req, res) => {
    // Whitelist allowed fields to prevent mass-assignment attacks
    const { name, email, password, role, department, designation, salary, phone, avatar } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({ message: 'Name, email, and password are required' });
    }

    // Prevent creating owner accounts (only existing owners should exist)
    if (role === 'owner' && req.user.role !== 'owner') {
        return res.status(403).json({ message: 'Only owners can create owner accounts' });
    }

    const user = new User({ name, email, password, role, department, designation, salary, phone, avatar });
    try {
        const newUser = await user.save();
        const userResponse = newUser.toObject();
        delete userResponse.password;
        res.status(201).json(userResponse);
    } catch (err) {
        if (err.code === 11000) {
            return res.status(400).json({ message: 'A user with this email already exists' });
        }
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
        // Prevent self-deletion
        if (req.params.id === req.user._id.toString()) {
            return res.status(400).json({ message: 'You cannot delete your own account' });
        }

        const userToDelete = await User.findById(req.params.id);
        if (!userToDelete) return res.status(404).json({ message: 'User not found' });

        // Prevent admin from deleting owner
        if (userToDelete.role === 'owner' && req.user.role !== 'owner') {
            return res.status(403).json({ message: 'Only owners can delete owner accounts' });
        }

        await User.findByIdAndDelete(req.params.id);
        res.json({ message: 'User deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
