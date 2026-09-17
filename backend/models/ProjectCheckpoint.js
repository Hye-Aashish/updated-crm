const mongoose = require('mongoose');

const projectCheckpointSchema = new mongoose.Schema({
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    phase: { type: String, required: true },
    phaseOrder: { type: Number, default: 0 },
    title: { type: String, required: true },
    description: { type: String },
    order: { type: Number, default: 0 },
    assignedTo: { type: String }, // User ID
    assignedRole: { type: String, default: 'developer' },
    startDate: { type: Date },
    dueDate: { type: Date },
    completionDate: { type: Date },
    status: {
        type: String,
        enum: ['not_started', 'in_progress', 'blocked', 'pending_review', 'completed', 'rejected', 'overdue'],
        default: 'not_started'
    },
    isMandatory: { type: Boolean, default: true },
    priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
    
    // Proof Requirements
    proofRequired: { type: Boolean, default: false },
    proofType: { type: String, enum: ['url', 'build_file', 'version', 'transaction_ref', 'screenshot', 'any'], default: 'any' },
    proofUrl: { type: String },
    proofFile: { type: String },
    proofVersion: { type: String },
    proofRef: { type: String },
    remarks: { type: String },

    // Dependencies
    dependencies: [{ type: mongoose.Schema.Types.ObjectId, ref: 'ProjectCheckpoint' }],

    // Review & Approval
    approvalRequired: { type: Boolean, default: false },
    approvedBy: { type: String }, // User ID
    approvedAt: { type: Date },
    rejectionReason: { type: String },

    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

projectCheckpointSchema.index({ projectId: 1, status: 1 });

module.exports = mongoose.model('ProjectCheckpoint', projectCheckpointSchema);
