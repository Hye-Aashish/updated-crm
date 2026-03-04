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

module.exports = router;
