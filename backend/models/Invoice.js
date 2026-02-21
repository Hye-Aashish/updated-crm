const mongoose = require('mongoose');

const invoiceSchema = new mongoose.Schema({
    invoiceNumber: { type: String, required: true },
    clientId: { type: String, required: true },
    projectId: { type: String, required: true },
    type: {
        type: String,
        enum: ['advance', 'milestone', 'final', 'amc'],
        default: 'milestone'
    },
    status: {
        type: String,
        enum: ['draft', 'pending', 'paid', 'overdue'],
        default: 'draft'
    },
    lineItems: [{
        name: String,
        quantity: Number,
        rate: Number,
        taxPercentage: Number
    }],
    subtotal: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    date: { type: Date, required: true },
    dueDate: { type: Date, required: true },
    paidDate: { type: Date },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    autoSend: { type: Boolean, default: false },
    frequency: { type: String, default: 'once' },
    cashfreeOrderId: { type: String },
    cashfreePaymentSessionId: { type: String }
});

module.exports = mongoose.model('Invoice', invoiceSchema);
