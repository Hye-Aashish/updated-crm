const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect); // Secure all product routes

router.route('/')
    .get(productController.getProducts)
    .post(authorize('admin', 'owner'), productController.createProduct);

router.route('/:id')
    .get(productController.getProductById)
    .put(authorize('admin', 'owner'), productController.updateProduct)
    .delete(authorize('admin', 'owner'), productController.deleteProduct);

module.exports = router;
