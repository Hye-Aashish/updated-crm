const express = require('express');
const router = express.Router();
const controller = require('../controllers/projectTemplateController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.post('/seed', protect, authorize('admin', 'owner'), controller.seedTemplates);
router.get('/', protect, controller.getTemplates);
router.get('/:id', protect, controller.getTemplateById);
router.post('/', protect, authorize('admin', 'owner'), controller.createTemplate);
router.put('/:id', protect, authorize('admin', 'owner'), controller.updateTemplate);
router.delete('/:id', protect, authorize('admin', 'owner'), controller.deleteTemplate);

module.exports = router;
