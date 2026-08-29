const express = require('express');
const router = express.Router();
const projectController = require('../controllers/projectController');
const { protect, checkPermission } = require('../middleware/authMiddleware');

router.get('/', protect, projectController.getProjects);
router.get('/:id', protect, projectController.getProjectById);
router.post('/', protect, checkPermission('projects', 'create'), projectController.createProject);
router.put('/:id', protect, checkPermission('projects', 'edit'), projectController.updateProject);
router.delete('/:id', protect, checkPermission('projects', 'delete'), projectController.deleteProject);

module.exports = router;
