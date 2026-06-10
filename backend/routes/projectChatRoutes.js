const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
    getProjectMessages,
    sendProjectMessage,
    getChatProjects,
    deleteProjectMessage
} = require('../controllers/projectChatController');

router.get('/projects', protect, getChatProjects);
router.get('/messages/:projectId', protect, getProjectMessages);
router.post('/messages', protect, sendProjectMessage);
router.delete('/messages/:messageId', protect, deleteProjectMessage);

module.exports = router;
