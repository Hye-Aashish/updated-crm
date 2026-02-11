const mongoose = require('mongoose');

const leadSchema = new mongoose.Schema({
    name: { type: String, required: true },
    company: { type: String, required: true },
    value: { type: Number, default: 0 },
    source: { type: String, default: 'Direct' },
    stage: { type: String, required: true }, // Links to PipelineStage id
    email: String,
    phone: String,
    customFields: { type: Map, of: String },
    activities: [{
        content: String,
        type: { type: String, enum: ['note', 'call', 'meeting', 'email'], default: 'note' },
        createdAt: { type: Date, default: Date.now }
    }],
    reminder: {
        date: Date,
        tone: { type: String, default: 'default' },
        completed: { type: Boolean, default: false }
    },
    assignedTo: { type: String }, // User ID
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Lead', leadSchema);
