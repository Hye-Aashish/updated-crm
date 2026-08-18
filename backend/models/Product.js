const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String },
    features: [{ type: String }],
    basePrice: { type: Number, required: true, default: 0 },
    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active'
    },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

productSchema.index({ name: 1 });
productSchema.index({ status: 1 });

module.exports = mongoose.model('Product', productSchema);
