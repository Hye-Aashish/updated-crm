const express = require('express');
const router = express.Router();
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const { protect } = require('../middleware/authMiddleware');

router.get('/me', protect, async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('-password');
        res.json(user);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    console.log(`LOGIN ATTEMPT: Email=${email}, PassLen=${password?.length}`);
    try {
        console.log(`Finding user ${email}...`);
        const user = await User.findOne({ email });
        if (!user) {
            console.log(`LOGIN FAILED: User not found (${email})`);
            return res.status(404).json({ message: 'User not found' });
        }

        const isMatch = await user.matchPassword(password);
        console.log(`LOGIN Match Result: ${isMatch}`);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        console.log('Generating JWT...');
        const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET || 'secret', { expiresIn: '30d' });
        console.log('JWT Generated.');

        const userObj = user.toObject();
        delete userObj.password;

        console.log('Sending response...');
        res.json({ ...userObj, token });
    } catch (err) {
        console.error('LOGIN ERROR:', err);
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
