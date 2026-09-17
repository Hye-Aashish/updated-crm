const express = require('express');
const router = express.Router();
const projectController = require('../controllers/projectController');
const { protect, checkPermission } = require('../middleware/authMiddleware');

// Developer specific route
router.get('/developer/checkpoints', protect, projectController.getDeveloperCheckpoints);

// Core Project CRUD
router.get('/', protect, projectController.getProjects);
router.get('/:id', protect, projectController.getProjectById);
router.post('/', protect, checkPermission('projects', 'create'), projectController.createProject);
router.put('/:id', protect, checkPermission('projects', 'edit'), projectController.updateProject);
router.delete('/:id', protect, checkPermission('projects', 'delete'), projectController.deleteProject);

// Checkpoints
router.get('/:id/checkpoints', protect, projectController.getCheckpoints);
router.post('/:id/checkpoints', protect, checkPermission('projects', 'edit'), projectController.createCheckpoint);
router.put('/:id/checkpoints/:checkpointId', protect, projectController.updateCheckpointStatus);
router.delete('/:id/checkpoints/:checkpointId', protect, checkPermission('projects', 'edit'), projectController.deleteCheckpoint);

// Bugs / QA
router.get('/:id/bugs', protect, projectController.getBugs);
router.post('/:id/bugs', protect, projectController.createBug);
router.put('/:id/bugs/:bugId', protect, projectController.updateBug);
router.delete('/:id/bugs/:bugId', protect, projectController.deleteBug);

// Follow-ups
router.get('/:id/followups', protect, projectController.getFollowUps);
router.post('/:id/followups', protect, projectController.createFollowUp);
router.put('/:id/followups/:followUpId', protect, projectController.updateFollowUp);

// Audit Activities
router.get('/:id/activities', protect, projectController.getActivities);

// Readiness Validation
router.get('/:id/completion-check', protect, projectController.checkCompletionReadiness);

// Notes & Credentials (Preserved)
router.post('/:id/notes', protect, projectController.addNote);
router.put('/:id/notes/:noteId', protect, projectController.updateNote);
router.delete('/:id/notes/:noteId', protect, projectController.deleteNote);

router.post('/:id/credentials', protect, projectController.addCredential);
router.put('/:id/credentials/:credentialId', protect, projectController.updateCredential);
router.delete('/:id/credentials/:credentialId', protect, projectController.deleteCredential);

module.exports = router;
