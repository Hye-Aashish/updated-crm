const mongoose = require('mongoose');

const amcSchema = new mongoose.Schema({
    name: { type: String, required: true },                          // AMC contract name
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },

    // Contract Details
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    renewalDate: { type: Date },                                     // Next renewal reminder date
    amount: { type: Number, required: true },                        // Annual AMC amount
    frequency: {
        type: String,
        enum: ['monthly', 'quarterly', 'half-yearly', 'annually'],
        default: 'annually'
    },

    // Status
    status: {
        type: String,
        enum: ['active', 'expired', 'expiring-soon', 'cancelled', 'pending'],
        default: 'pending'
    },

    // Services Covered
    services: [{ type: String }],
    description: { type: String },

    // Invoice Linkage
    invoices: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Invoice' }],
    lastInvoiceDate: { type: Date },
    nextInvoiceDate: { type: Date },

    // Auto-invoice setting
    autoInvoice: { type: Boolean, default: false },

    // Renewal history
    renewalHistory: [{
        renewedAt: { type: Date },
        newEndDate: { type: Date },
        amount: { type: Number },
        invoiceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice' },
        note: { type: String }
    }],

    notes: { type: String },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

// Auto-update status based on dates
amcSchema.pre('save', function () {
    const now = new Date();
    const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    if (this.status !== 'cancelled') {
        if (this.endDate < now) {
            this.status = 'expired';
        } else if (this.endDate <= thirtyDaysLater) {
            this.status = 'expiring-soon';
        } else {
            this.status = 'active';
        }
    }
    this.updatedAt = new Date();
});

module.exports = mongoose.model('Amc', amcSchema);
