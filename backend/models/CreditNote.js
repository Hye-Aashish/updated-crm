const mongoose = require('mongoose');

const creditNoteSchema = new mongoose.Schema({
    creditNoteNumber: { type: String, required: true },
    clientId: { type: String, required: true, index: true },
    invoiceId: { type: String },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'INR' },
    reason: { type: String, default: '' },
    status: {
        type: String,
        enum: ['draft', 'issued', 'applied', 'void'],
        default: 'issued'
    },
    appliedToInvoiceId: { type: String },
    appliedAt: Date,
    createdBy: { type: String },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('CreditNote', creditNoteSchema);
