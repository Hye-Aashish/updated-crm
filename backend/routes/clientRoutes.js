const express = require('express');
const router = express.Router();
const clientController = require('../controllers/clientController');
const { protect, authorize, checkPermission } = require('../middleware/authMiddleware');

router.get('/', protect, checkPermission('clients', 'view'), clientController.getClients);
router.get('/:id', protect, checkPermission('clients', 'view'), clientController.getClientById);
router.post('/', protect, checkPermission('clients', 'create'), clientController.createClient);
router.put('/:id', protect, checkPermission('clients', 'edit'), clientController.updateClient);
router.delete('/:id', protect, checkPermission('clients', 'delete'), clientController.deleteClient);

module.exports = router;
