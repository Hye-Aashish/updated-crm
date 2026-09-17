const mongoose = require('mongoose');

const projectBugSchema = new mongoose.Schema({
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    severity: { type: String, enum: ['critical', 'high', 'medium', 'low'], default: 'medium' },
    priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
    assignedDeveloper: { type: String }, // User ID
    status: {
        type: String,
        enum: ['open', 'in_progress', 'fixed', 'retest_required', 'closed'],
        default: 'open'
    },
    attachment: { type: String },
    resolution: { type: String },
    createdBy: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('ProjectBug', projectBugSchema);
