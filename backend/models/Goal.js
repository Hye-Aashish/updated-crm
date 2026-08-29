const mongoose = require('mongoose');

const goalSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String },
    category: {
        type: String,
        enum: ['revenue', 'leads', 'projects', 'tasks', 'custom'],
        default: 'revenue'
    },
    targetValue: { type: Number, required: true },
    currentValue: { type: Number, default: 0 },
    unit: { type: String, default: '₹' }, // e.g. ₹, %, count
    startDate: { type: Date, default: Date.now },
    endDate: { type: Date, required: true },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    assignedToName: { type: String, default: 'Company Wide' },
    status: {
        type: String,
        enum: ['in_progress', 'achieved', 'at_risk', 'missed'],
        default: 'in_progress'
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Goal', goalSchema);
