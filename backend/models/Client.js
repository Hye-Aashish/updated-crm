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

    notes: { type: String },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

clientSchema.index({ assignedTo: 1 });
clientSchema.index({ status: 1 });
clientSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Client', clientSchema);
