const mongoose = require('mongoose');

const vendorBillSchema = new mongoose.Schema({
    billNumber: { type: String, required: true },
    vendorName: { type: String, required: true },
    vendorEmail: String,
    vendorGst: String,
    category: { type: String, default: 'general' },
    amount: { type: Number, required: true },
    tax: { type: Number, default: 0 },
    total: { type: Number, required: true },
    currency: { type: String, default: 'INR' },
    billDate: { type: Date, required: true },
    dueDate: { type: Date },
    status: {
        type: String,
        enum: ['draft', 'pending', 'paid', 'overdue', 'cancelled'],
        default: 'pending'
    },
    paidDate: Date,
    notes: String,
    projectId: String,
    clientId: String,
    createdBy: String,
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('VendorBill', vendorBillSchema);
