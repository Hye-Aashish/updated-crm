const express = require('express');
const router = express.Router();
const clientProductController = require('../controllers/clientProductController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);

// Global routes
router.route('/')
    .get(clientProductController.getAllClientProducts);

// Specific client's assigned products
router.route('/client/:clientId')
    .get(clientProductController.getClientProducts)
    .post(authorize('admin', 'owner', 'pm'), clientProductController.assignProductToClient);

// Individual client product by ID
router.route('/:id')
    .get(clientProductController.getClientProductById)
    .put(authorize('admin', 'owner', 'pm'), clientProductController.updateClientProduct)
    .delete(authorize('admin', 'owner'), clientProductController.removeClientProduct);

// Tasks sub-routes
router.route('/:id/tasks')
    .post(authorize('admin', 'owner', 'pm', 'developer', 'employee'), clientProductController.addTask);

router.route('/:id/tasks/:taskId')
    .patch(authorize('admin', 'owner', 'pm', 'developer', 'employee'), clientProductController.updateTask)
    .delete(authorize('admin', 'owner', 'pm'), clientProductController.deleteTask);

// Payments sub-routes
router.route('/:id/payments')
    .post(authorize('admin', 'owner', 'pm'), clientProductController.recordPayment);

router.route('/:id/payments/:paymentId')
    .delete(authorize('admin', 'owner'), clientProductController.deletePayment);

module.exports = router;
