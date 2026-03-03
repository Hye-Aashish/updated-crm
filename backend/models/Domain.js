const mongoose = require('mongoose');

const domainSchema = new mongoose.Schema({
    domainName: { type: String, required: true },
    type: {
        type: String,
        enum: ['domain', 'hosting', 'ssl', 'both', 'other'],
        default: 'domain'
    },
    provider: { type: String, required: true }, // e.g. GoDaddy, Hostinger
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },

    purchaseDate: { type: Date, required: true },
    expiryDate: { type: Date, required: true },
    amount: { type: Number, required: true },

    status: {
        type: String,
        enum: ['active', 'expiring-soon', 'expired', 'suspended', 'cancelled'],
        default: 'active'
    },

    // Invoice Linkage
    invoices: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Invoice' }],
    lastInvoiceDate: { type: Date },

    // Renewals Tracking
    renewals: [{
        renewedAt: { type: Date, default: Date.now },
        newExpiryDate: { type: Date, required: true },
        amount: { type: Number },
        note: { type: String },
        invoiceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice' }
    }],

    autoRenew: { type: Boolean, default: false },
    notes: { type: String },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

// Auto-update status based on dates
domainSchema.pre('save', function () {
    const now = new Date();
    const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    if (this.status !== 'cancelled' && this.status !== 'suspended') {
        if (this.expiryDate < now) {
            this.status = 'expired';
        } else if (this.expiryDate <= thirtyDaysLater) {
            this.status = 'expiring-soon';
        } else {
            this.status = 'active';
        }
    }
    this.updatedAt = new Date();
});

module.exports = mongoose.model('Domain', domainSchema);
