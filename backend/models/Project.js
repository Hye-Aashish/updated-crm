const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String },
    status: {
        type: String,
        enum: ['planning', 'in-progress', 'completed', 'on-hold'],
        default: 'planning'
    },
    startDate: { type: Date, default: Date.now },
    dueDate: { type: Date, required: true },
    budget: { type: Number, default: 0 },
    clientId: { type: String, required: true },
    pmId: { type: String },
    members: [{ type: String }],
    clientProductId: { type: String }, // Link to ClientProduct if this is a digital product
    type: { type: String, default: 'web-development' }, // Added
    paymentModel: { type: String, default: 'milestone' }, // Added
    progress: { type: Number, default: 0 },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high', 'urgent'],
        default: 'medium'
    },
    milestones: [{
        name: { type: String, required: true },
        description: { type: String },
        dueDate: { type: Date },
        amount: { type: Number, default: 0 },
        completed: { type: Boolean, default: false },
        status: {
            type: String,
            enum: ['pending', 'in-progress', 'completed'],
            default: 'pending'
        },
        paidAmount: { type: Number, default: 0 },
        paymentStatus: {
            type: String,
            enum: ['unpaid', 'partial', 'paid'],
            default: 'unpaid'
        },
        invoiceId: { type: String },
        paidDate: { type: Date },
        paymentMethod: { type: String, default: 'Bank Transfer' },
        paymentReference: { type: String }, // Transaction / UTR ID
        paymentNotes: { type: String },
        completedAt: { type: Date }
    }],
    autoInvoice: { type: Boolean, default: false },
    notes: [{
        text: { type: String, required: true },
        createdBy: { type: String, required: true },
        creatorName: { type: String, required: true },
        createdAt: { type: Date, default: Date.now }
    }],
    credentials: [{
        title: { type: String, required: true },
        type: { type: String, default: 'other' },
        url: { type: String },
        username: { type: String, required: true },
        password: { type: String, required: true },
        createdBy: { type: String, required: true },
        createdAt: { type: Date, default: Date.now }
    }],
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Project', projectSchema);
