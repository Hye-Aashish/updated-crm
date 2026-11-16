const mongoose = require('mongoose');

const retainerSchema = new mongoose.Schema({
    name: { type: String, required: true },
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'INR' },
    frequency: {
        type: String,
        enum: ['weekly', 'monthly', 'quarterly', 'half-yearly', 'annually'],
        default: 'monthly'
    },
    startDate: { type: Date, required: true },
    endDate: { type: Date },
    nextBillingDate: { type: Date, required: true },
    status: {
        type: String,
        enum: ['active', 'paused', 'cancelled', 'ended'],
        default: 'active'
    },
    autoInvoice: { type: Boolean, default: true },
    description: { type: String },
    services: [{ type: String }],
    invoices: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Invoice' }],
    lastInvoiceDate: { type: Date },
    billingHistory: [{
        billedAt: { type: Date, default: Date.now },
        amount: Number,
        invoiceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice' },
        note: String
    }],
    notes: { type: String },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

retainerSchema.pre('save', function () {
    this.updatedAt = new Date();
});

module.exports = mongoose.model('Retainer', retainerSchema);
