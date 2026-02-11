const express = require('express');
const router = express.Router();
const clientController = require('../controllers/clientController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.get('/', protect, clientController.getClients);
router.get('/:id', protect, clientController.getClientById);
router.post('/', protect, authorize('admin', 'owner'), clientController.createClient);
router.put('/:id', protect, authorize('admin', 'owner'), clientController.updateClient);
router.delete('/:id', protect, authorize('admin', 'owner'), clientController.deleteClient);

module.exports = router;
