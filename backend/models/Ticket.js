const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema({
    subject: { type: String, required: true },
    description: { type: String },
    priority: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
    status: { type: String, enum: ['open', 'in-progress', 'resolved', 'closed', 'declined', 'live', 'need-discussion'], default: 'open' },
    discussionNote: { type: String },
    clientName: { type: String },
    clientId: { type: String }, // Linked to Client model
    projectId: { type: String }, // Linked to Project model
    assignedTo: { type: String },
    createdBy: { type: String },
    screenshot: { type: String }, // Base64 or URL
    taskId: { type: String }, // Linked Task model ID
    taskTitle: { type: String }, // Title of linked Task
    // SLA tracking
    slaDueAt: { type: Date },
    firstResponseAt: { type: Date },
    resolvedAt: { type: Date },
    slaBreached: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

/** Default response SLA hours by priority */
ticketSchema.statics.slaHoursForPriority = function (priority) {
    return { critical: 4, high: 8, medium: 24, low: 72 }[priority] || 24;
};

module.exports = mongoose.model('Ticket', ticketSchema);
