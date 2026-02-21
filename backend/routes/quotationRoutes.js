const express = require('express');
const router = express.Router();
const quotationController = require('../controllers/quotationController');
const { protect } = require('../middleware/authMiddleware');

// Public Route (No Auth required for clients to view)
router.get('/public/:id', quotationController.getQuotationPublic);
router.patch('/public/:id/approve', quotationController.publicApprove);

router.use(protect);

// Template Management
router.get('/templates/all', quotationController.getTemplates);
router.post('/templates', quotationController.createTemplate);
router.put('/templates/:id', quotationController.updateTemplate);
router.delete('/templates/:id', quotationController.deleteTemplate);

// Quotation Operations
router.get('/', quotationController.getAllQuotations);
router.get('/:id', quotationController.getQuotation);
router.post('/', quotationController.createQuotation);
router.put('/:id', quotationController.updateQuotation);

// Approvals & Workflow
router.patch('/:id/approve', quotationController.approveQuotation);
router.post('/:id/change-request', quotationController.addChangeRequest);

// PDF Generation
router.get('/:id/pdf', quotationController.generatePDF);

module.exports = router;
