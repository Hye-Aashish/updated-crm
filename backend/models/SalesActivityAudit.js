const mongoose = require('mongoose');

const salesActivityAuditSchema = new mongoose.Schema({
    eventType: {
        type: String,
        required: true,
        enum: [
            'call_logged',
            'call_updated',
            'meeting_scheduled',
            'meeting_rescheduled',
            'meeting_completed',
            'meeting_cancelled',
            'meeting_noshow',
            'followup_completed',
            'lead_reassigned',
            'stage_changed',
            'deal_won',
            'deal_lost',
            'target_created',
            'target_updated'
        ],
        index: true
    },
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    actorName: { type: String, required: true },
    actorRole: { type: String },
    leadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead', index: true },
    leadName: { type: String },
    entityType: { type: String, enum: ['Lead', 'SalesCallLog', 'SalesMeeting', 'SalesTarget'], required: true },
    entityId: { type: mongoose.Schema.Types.ObjectId, required: true },
    metadata: { type: mongoose.Schema.Types.Mixed },
    timestamp: { type: Date, default: Date.now, index: true }
});

salesActivityAuditSchema.index({ actorId: 1, timestamp: -1 });
salesActivityAuditSchema.index({ leadId: 1, timestamp: -1 });
salesActivityAuditSchema.index({ eventType: 1, timestamp: -1 });

module.exports = mongoose.model('SalesActivityAudit', salesActivityAuditSchema);
