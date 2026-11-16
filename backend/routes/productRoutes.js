const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { protect, checkPermission } = require('../middleware/authMiddleware');

router.use(protect);

router.route('/')
    .get(checkPermission('products', 'view'), productController.getProducts)
    .post(checkPermission('products', 'create'), productController.createProduct);

router.route('/:id')
    .get(checkPermission('products', 'view'), productController.getProductById)
    .put(checkPermission('products', 'edit'), productController.updateProduct)
    .delete(checkPermission('products', 'delete'), productController.deleteProduct);

module.exports = router;
