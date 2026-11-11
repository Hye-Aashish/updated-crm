const express = require('express');
const router = express.Router();
const quotationController = require('../controllers/quotationController');
const { protect, authorize, checkPermission } = require('../middleware/authMiddleware');

// Public Route (No Auth required for clients to view with token)
router.get('/public/:id', quotationController.getQuotationPublic);
router.patch('/public/:id/approve', quotationController.publicApprove);

router.use(protect);

// Template Management
router.get('/templates/all', checkPermission('quotations', 'view'), quotationController.getTemplates);
router.post('/templates', checkPermission('quotations', 'create'), quotationController.createTemplate);
router.put('/templates/:id', checkPermission('quotations', 'edit'), quotationController.updateTemplate);
router.delete('/templates/:id', checkPermission('quotations', 'delete'), quotationController.deleteTemplate);

// Quotation Operations
router.get('/', checkPermission('quotations', 'view'), quotationController.getAllQuotations);
router.get('/:id', checkPermission('quotations', 'view'), quotationController.getQuotation);
router.post('/', checkPermission('quotations', 'create'), quotationController.createQuotation);
router.put('/:id', checkPermission('quotations', 'edit'), quotationController.updateQuotation);
router.delete('/:id', checkPermission('quotations', 'delete'), quotationController.deleteQuotation);

// Approvals & Workflow
router.patch('/:id/approve', checkPermission('quotations', 'edit'), quotationController.approveQuotation);
router.post('/:id/change-request', checkPermission('quotations', 'edit'), quotationController.addChangeRequest);
router.post('/:id/convert-to-project', authorize('admin', 'owner', 'pm'), quotationController.convertToProject);

// PDF Generation
router.get('/:id/pdf', checkPermission('quotations', 'view'), quotationController.generatePDF);

module.exports = router;
