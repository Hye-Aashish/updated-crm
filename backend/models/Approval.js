const mongoose = require('mongoose');

const approvalSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String },
    category: {
        type: String,
        enum: ['milestone', 'design', 'proposal', 'contract', 'scope_change', 'general'],
        default: 'general'
    },
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client' },
    fileUrl: { type: String },
    attachments: [{
        name: { type: String },
        url: { type: String },
        fileType: { type: String }
    }],
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected', 'expired'],
        default: 'pending'
    },
    dueDate: { type: Date },
    publicToken: { type: String, unique: true },
    requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    requestedByName: { type: String },
    signedBy: { type: String }, // Name of the person who signed
    signedByEmail: { type: String },
    signedAt: { type: Date },
    signatureData: { type: String }, // Base64 data of signature
    signatureMetadata: {
        type: { type: String, enum: ['drawn', 'typed', 'uploaded'], default: 'drawn' },
        typedFont: { type: String },
        ipAddress: { type: String },
        userAgent: { type: String },
        signatureHash: { type: String },
        legalConsent: { type: Boolean, default: true }
    },
    auditLog: [{
        action: { type: String }, // 'created', 'viewed', 'signed', 'rejected'
        timestamp: { type: Date, default: Date.now },
        ip: { type: String },
        userAgent: { type: String },
        actorName: { type: String },
        notes: { type: String }
    }],
    comments: { type: String },
    rejectionReason: { type: String },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Approval', approvalSchema);
