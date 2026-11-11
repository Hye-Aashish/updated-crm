const mongoose = require('mongoose');

const amcSchema = new mongoose.Schema({
    name: { type: String, required: true },                          // AMC contract name
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
    clientProductId: { type: mongoose.Schema.Types.ObjectId, ref: 'ClientProduct' },
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
        previousEndDate: { type: Date },
        effectiveStartDate: { type: Date },
        newEndDate: { type: Date },
        durationLabel: { type: String },
        amount: { type: Number },
        invoiceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice' },
        note: { type: String }
    }],

    notes: { type: String },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

function computeAmcStatus(endDate, currentStatus) {
    if (currentStatus === 'cancelled') return 'cancelled';
    if (!endDate) return currentStatus || 'pending';

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const endDay = new Date(endDate);
    endDay.setHours(0, 0, 0, 0);

    const thirtyDaysLater = new Date(startOfToday);
    thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);

    if (endDay < startOfToday) return 'expired';
    if (endDay <= thirtyDaysLater) return 'expiring-soon';
    return 'active';
}

amcSchema.statics.computeStatus = computeAmcStatus;

// Auto-update status based on dates
amcSchema.pre('save', function () {
    if (!this.projectId && !this.clientProductId) {
        throw new Error('AMC must be associated with either a Project or a Digital Product (ClientProduct)');
    }

    this.status = computeAmcStatus(this.endDate, this.status);
    this.updatedAt = new Date();
});

module.exports = mongoose.model('Amc', amcSchema);
