const express = require('express');
const router = express.Router();
const { initSession, trackEvent, trackPulse, getAnalyticsSummary } = require('../controllers/trackingController');
const { protect, authorize } = require('../middleware/authMiddleware'); // For admin analytics

// Public Tracking Endpoints (Called by tracker.js)
router.post('/init', initSession);
router.post('/event', trackEvent);
router.post('/pulse', trackPulse);
router.post('/identify', require('../controllers/trackingController').identifyVisitor);

const rateLimit = require('express-rate-limit');

const analyticsLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 60, // 60 requests per minute
    message: { message: 'Too many analytics requests, please slow down.' },
    standardHeaders: true,
    legacyHeaders: false
});

// Admin Analytics Endpoints
router.get('/summary', protect, authorize('admin', 'owner'), analyticsLimiter, getAnalyticsSummary);
router.get('/timeline', protect, authorize('admin', 'owner'), analyticsLimiter, require('../controllers/trackingController').getContactWebActivity);
router.get('/visitor-sessions', protect, authorize('admin', 'owner'), analyticsLimiter, require('../controllers/trackingController').getVisitorSessions);
router.get('/heatmap', protect, authorize('admin', 'owner'), analyticsLimiter, require('../controllers/trackingController').getHeatmapData);
router.get('/geo-stats', protect, authorize('admin', 'owner'), analyticsLimiter, require('../controllers/trackingController').getGeoStats);

module.exports = router;
