const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema({
    subject: { type: String, required: true },
    description: { type: String },
    priority: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
    status: { type: String, enum: ['open', 'in-progress', 'resolved', 'closed'], default: 'open' },
    clientName: { type: String },
    clientId: { type: String }, // Linked to Client model
    projectId: { type: String }, // Linked to Project model
    assignedTo: { type: String },
    screenshot: { type: String }, // Base64 or URL
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Ticket', ticketSchema);
