const express = require('express');
const router = express.Router();
const projectController = require('../controllers/projectController');
const { protect, checkPermission } = require('../middleware/authMiddleware');

router.get('/', protect, projectController.getProjects);
router.get('/:id', protect, projectController.getProjectById);
router.post('/', protect, checkPermission('projects', 'create'), projectController.createProject);
router.put('/:id', protect, checkPermission('projects', 'edit'), projectController.updateProject);
router.delete('/:id', protect, checkPermission('projects', 'delete'), projectController.deleteProject);

router.post('/:id/notes', protect, projectController.addNote);
router.put('/:id/notes/:noteId', protect, projectController.updateNote);
router.delete('/:id/notes/:noteId', protect, projectController.deleteNote);

router.post('/:id/credentials', protect, projectController.addCredential);
router.put('/:id/credentials/:credentialId', protect, projectController.updateCredential);
router.delete('/:id/credentials/:credentialId', protect, projectController.deleteCredential);

module.exports = router;
