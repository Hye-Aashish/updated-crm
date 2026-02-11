const express = require('express');
const router = express.Router();
const projectController = require('../controllers/projectController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.get('/', protect, projectController.getProjects);
router.get('/:id', protect, projectController.getProjectById);
router.post('/', protect, authorize('admin', 'owner', 'pm'), projectController.createProject);
router.put('/:id', protect, authorize('admin', 'owner', 'pm'), projectController.updateProject);
router.delete('/:id', protect, authorize('admin', 'owner'), projectController.deleteProject);

module.exports = router;
