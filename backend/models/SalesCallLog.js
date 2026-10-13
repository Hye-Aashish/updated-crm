const mongoose = require('mongoose');

const salesCallLogSchema = new mongoose.Schema({
    leadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead', required: true, index: true },
    leadName: { type: String },
    company: { type: String },
    phone: { type: String },
    agentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    agentName: { type: String, required: true },
    direction: { type: String, enum: ['outbound', 'inbound'], default: 'outbound' },
    callStartedAt: { type: Date, default: Date.now, index: true },
    callEndedAt: { type: Date },
    durationSeconds: { type: Number, default: 0, min: 0 },
    outcome: { 
        type: String, 
        required: true,
        enum: [
            'connected', 
            'no_answer', 
            'busy', 
            'failed', 
            'wrong_number', 
            'callback_requested', 
            'not_interested', 
            'interested', 
            'meeting_booked', 
            'other'
        ],
        default: 'connected',
        index: true
    },
    outcomeLabel: { type: String }, // Human readable e.g. "Call Connected", "Meeting Booked"
    contactResult: { 
        type: String, 
        enum: ['contacted', 'not_contacted'], 
        default: function() {
            return ['connected', 'interested', 'meeting_booked', 'callback_requested'].includes(this.outcome) 
                ? 'contacted' 
                : 'not_contacted';
        }
    },
    notes: { type: String, default: '' },
    meetingBooked: { type: Boolean, default: false },
    meetingId: { type: mongoose.Schema.Types.ObjectId, ref: 'SalesMeeting' },
    followUpRequired: { type: Boolean, default: false },
    nextFollowUpAt: { type: Date },
    source: { type: String, enum: ['manual', 'telephony'], default: 'manual' },
    verificationStatus: { 
        type: String, 
        enum: ['unverified', 'agent_reported', 'provider_confirmed'], 
        default: 'agent_reported' 
    },
    idempotencyKey: { type: String, index: true, sparse: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

salesCallLogSchema.index({ agentId: 1, callStartedAt: 1 });
salesCallLogSchema.index({ leadId: 1, callStartedAt: -1 });
salesCallLogSchema.index({ outcome: 1, callStartedAt: 1 });
salesCallLogSchema.index({ contactResult: 1, callStartedAt: 1 });

module.exports = mongoose.model('SalesCallLog', salesCallLogSchema);
