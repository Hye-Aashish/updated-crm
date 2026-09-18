const express = require('express');
const router = express.Router();
const clientController = require('../controllers/clientController');
const { protect, authorize, checkPermission } = require('../middleware/authMiddleware');

// Public route for onboarding form
router.post('/public/onboarding', clientController.createPublicClient);

const allowClientRoleOrPermission = (action) => (req, res, next) => {
    if (req.user && req.user.role === 'client') return next();
    return checkPermission('clients', action)(req, res, next);
};

router.get('/', protect, allowClientRoleOrPermission('view'), clientController.getClients);
router.get('/:id', protect, allowClientRoleOrPermission('view'), clientController.getClientById);
router.post('/', protect, checkPermission('clients', 'create'), clientController.createClient);
router.put('/:id', protect, checkPermission('clients', 'edit'), clientController.updateClient);
router.delete('/:id', protect, checkPermission('clients', 'delete'), clientController.deleteClient);

module.exports = router;
