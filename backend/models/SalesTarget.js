const mongoose = require('mongoose');

const salesTargetSchema = new mongoose.Schema({
    agentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    agentName: { type: String, required: true },
    metric: { 
        type: String, 
        required: true, 
        enum: ['calls', 'unique_contacts', 'meetings', 'qualified_leads', 'deals_won', 'revenue'],
        index: true
    },
    targetValue: { type: Number, required: true, min: 0 },
    periodType: { 
        type: String, 
        enum: ['daily', 'weekly', 'monthly', 'quarterly', 'custom'], 
        default: 'monthly' 
    },
    periodStart: { type: Date, required: true, index: true },
    periodEnd: { type: Date, required: true, index: true },
    notes: { type: String },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

salesTargetSchema.index({ agentId: 1, metric: 1, periodStart: 1, periodEnd: 1 });

module.exports = mongoose.model('SalesTarget', salesTargetSchema);
