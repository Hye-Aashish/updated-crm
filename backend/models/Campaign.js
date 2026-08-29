const mongoose = require('mongoose');

const campaignSchema = new mongoose.Schema({
    title: { type: String, required: true },
    subject: { type: String, required: true },
    content: { type: String, required: true }, // HTML content
    templateCategory: {
        type: String,
        enum: ['promo', 'newsletter', 'feature', 'onboarding', 'renewal', 'custom'],
        default: 'custom'
    },
    targetAudience: {
        type: String,
        enum: ['leads', 'clients', 'all_staff', 'custom'],
        default: 'leads'
    },
    customEmails: [{ type: String }], // Comma-separated or custom list
    status: {
        type: String,
        enum: ['draft', 'scheduled', 'sending', 'sent', 'failed'],
        default: 'draft'
    },
    scheduledAt: { type: Date },
    stats: {
        totalRecipients: { type: Number, default: 0 },
        sentCount: { type: Number, default: 0 },
        failedCount: { type: Number, default: 0 },
        opensCount: { type: Number, default: 0 },
        clicksCount: { type: Number, default: 0 }
    },
    recipientLogs: [{
        email: { type: String },
        name: { type: String },
        status: { type: String, enum: ['sent', 'failed'], default: 'sent' },
        sentAt: { type: Date, default: Date.now },
        error: { type: String }
    }],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    sentAt: { type: Date },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Campaign', campaignSchema);
