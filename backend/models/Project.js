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
    type: { type: String, default: 'web-development' }, // Added
    paymentModel: { type: String, default: 'milestone' }, // Added
    progress: { type: Number, default: 0 },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high', 'urgent'],
        default: 'medium'
    },
    milestones: [{
        name: String,
        dueDate: Date,
        amount: Number,
        completed: { type: Boolean, default: false }
    }],
    autoInvoice: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Project', projectSchema);
