const express = require('express');
const router = express.Router();
const { initSession, trackEvent, trackPulse, getAnalyticsSummary } = require('../controllers/trackingController');
const { protect, authorize } = require('../middleware/authMiddleware'); // For admin analytics

// Public Tracking Endpoints (Called by tracker.js)
router.post('/init', initSession);
router.post('/event', trackEvent);
router.post('/pulse', trackPulse);
router.post('/identify', require('../controllers/trackingController').identifyVisitor);

// Admin Analytics Endpoints
router.get('/summary', protect, authorize('admin', 'owner'), getAnalyticsSummary);
router.get('/timeline', protect, authorize('admin', 'owner'), require('../controllers/trackingController').getContactWebActivity);
router.get('/visitor-sessions', protect, authorize('admin', 'owner'), require('../controllers/trackingController').getVisitorSessions);
router.get('/heatmap', protect, authorize('admin', 'owner'), require('../controllers/trackingController').getHeatmapData);
router.get('/geo-stats', protect, authorize('admin', 'owner'), require('../controllers/trackingController').getGeoStats);

module.exports = router;
