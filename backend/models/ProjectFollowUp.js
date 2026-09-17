const mongoose = require('mongoose');

const projectFollowUpSchema = new mongoose.Schema({
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    type: { type: String, enum: ['call', 'whatsapp', 'email', 'meeting', 'update'], default: 'update' },
    summary: { type: String, required: true },
    clientResponse: { type: String },
    followUpDate: { type: Date, required: true },
    status: { type: String, enum: ['pending', 'completed'], default: 'pending' },
    createdBy: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('ProjectFollowUp', projectFollowUpSchema);
