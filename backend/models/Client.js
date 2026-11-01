const mongoose = require('mongoose');

const clientSchema = new mongoose.Schema({
    name: { type: String, required: true },
    company: { type: String },
    phone: { type: String, required: true },
    email: { type: String },
    type: {
        type: String,
        enum: ['one-time', 'retainer'],
        default: 'one-time'
    },
    status: {
        type: String,
        enum: ['new', 'in-discussion', 'confirmed', 'on-hold', 'closed', 'active', 'inactive'],
        default: 'new'
    },

    // Business Details
    industry: { type: String },
    city: { type: String },
    state: { type: String },
    country: { type: String },
    website: { type: String },
    gstNumber: { type: String },
    address: { type: String },

    // Project/Payment
    services: [{ type: String }],
    budget: { type: String },
    paymentModel: { type: String },
    expectedDeadline: { type: Date },

    // Communication
    leadSource: { type: String },
    followUpDate: { type: Date },
    assignedTo: { type: String }, // User ID

    // Dynamic Client Onboarding Hub
    onboardingToken: { type: String, sparse: true, index: true },
    onboardingStatus: {
        type: String,
        enum: ['not_sent', 'sent', 'completed'],
        default: 'not_sent'
    },
    onboardingSentAt: { type: Date },
    onboardingCompletedAt: { type: Date },
    customOnboardingConfig: { type: mongoose.Schema.Types.Mixed, default: null },
    onboardingData: { type: mongoose.Schema.Types.Mixed, default: {} },
    onboardingFiles: [
        {
            fieldId: { type: String },
            fieldName: { type: String },
            fileName: { type: String },
            fileUrl: { type: String },
            uploadedAt: { type: Date, default: Date.now }
        }
    ],

    notes: { type: String },
    // Additive CRM fields
    referredBy: { type: String },
    partnerId: { type: String },
    partnerName: { type: String },
    healthScore: { type: Number, min: 0, max: 100 },
    healthUpdatedAt: { type: Date },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

clientSchema.index({ assignedTo: 1 });
clientSchema.index({ status: 1 });
clientSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Client', clientSchema);
