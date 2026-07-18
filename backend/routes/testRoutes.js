const express = require('express');
const router = express.Router();
const geoip = require('geoip-lite');
const { protect, authorize } = require('../middleware/authMiddleware');

// Test endpoint to check IP and location (Admin only)
router.get('/check-ip', protect, authorize('admin', 'owner'), (req, res) => {
    const ip = req.ip || req.headers['x-forwarded-for'];
    const cleanIP = ip.replace(/^::ffff:/, '');

    const geo = geoip.lookup(cleanIP);

    res.json({
        cleaned_ip: cleanIP,
        geoip_result: geo,
    });
});

router.get('/db-info', (req, res) => {
    try {
        const mongoose = require('mongoose');
        res.json({
            readyState: mongoose.connection.readyState,
            name: mongoose.connection.name,
            host: mongoose.connection.host,
            port: mongoose.connection.port,
            env_uri: process.env.MONGO_URI ? 'Defined' : 'Undefined'
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

module.exports = router;
