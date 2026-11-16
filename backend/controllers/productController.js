const Product = require('../models/Product');
const { applyCreatorScope, assertCreatorAccess } = require('../utils/dataScope');

// Get all products
exports.getProducts = async (req, res) => {
    try {
        const filter = await applyCreatorScope({}, req.user, 'products');
        const products = await Product.find(filter).sort({ createdAt: -1 });
        res.status(200).json(products);
    } catch (err) {
        console.error('Error fetching products:', err);
        res.status(500).json({ message: 'Error fetching products' });
    }
};

// Get single product
exports.getProductById = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }
        const access = await assertCreatorAccess(req.user, product, 'products');
        if (!access.ok) return res.status(access.status).json({ message: access.message });
        res.status(200).json(product);
    } catch (err) {
        console.error('Error fetching product:', err);
        res.status(500).json({ message: 'Error fetching product' });
    }
};

// Create product
exports.createProduct = async (req, res) => {
    try {
        const { name, category, description, features, basePrice, status } = req.body;
        const newProduct = new Product({
            name,
            category: category?.trim() || 'General',
            description,
            features: features || [],
            basePrice: basePrice || 0,
            status,
            createdBy: req.user._id
        });
        const savedProduct = await newProduct.save();
        res.status(201).json(savedProduct);
    } catch (err) {
        console.error('Error creating product:', err);
        res.status(500).json({ message: 'Error creating product' });
    }
};

// Update product
exports.updateProduct = async (req, res) => {
    try {
        const existing = await Product.findById(req.params.id);
        if (!existing) {
            return res.status(404).json({ message: 'Product not found' });
        }
        const access = await assertCreatorAccess(req.user, existing, 'products');
        if (!access.ok) return res.status(access.status).json({ message: access.message });

        const { name, category, description, features, basePrice, status } = req.body;
        const updatedProduct = await Product.findByIdAndUpdate(
            req.params.id,
            {
                name,
                category: category?.trim() || 'General',
                description,
                features,
                basePrice,
                status,
                updatedAt: Date.now()
            },
            { new: true }
        );
        
        if (!updatedProduct) {
            return res.status(404).json({ message: 'Product not found' });
        }
        res.status(200).json(updatedProduct);
    } catch (err) {
        console.error('Error updating product:', err);
        res.status(500).json({ message: 'Error updating product' });
    }
};

// Delete product
exports.deleteProduct = async (req, res) => {
    try {
        const existing = await Product.findById(req.params.id);
        if (!existing) {
            return res.status(404).json({ message: 'Product not found' });
        }
        const access = await assertCreatorAccess(req.user, existing, 'products');
        if (!access.ok) return res.status(access.status).json({ message: access.message });
        const product = await Product.findByIdAndDelete(req.params.id);
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }
        res.status(200).json({ message: 'Product deleted successfully' });
    } catch (err) {
        console.error('Error deleting product:', err);
        res.status(500).json({ message: 'Error deleting product' });
    }
};
