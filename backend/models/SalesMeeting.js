const mongoose = require('mongoose');

const salesMeetingSchema = new mongoose.Schema({
    leadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead', required: true, index: true },
    leadName: { type: String },
    company: { type: String },
    phone: { type: String },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    ownerName: { type: String, required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    scheduledAt: { type: Date, required: true, index: true },
    endedAt: { type: Date },
    durationMinutes: { type: Number, default: 30 },
    meetingType: { type: String, enum: ['online_demo', 'phone_briefing', 'in_person', 'discovery', 'closing'], default: 'online_demo' },
    status: { 
        type: String, 
        enum: ['scheduled', 'completed', 'cancelled', 'no_show', 'rescheduled'], 
        default: 'scheduled',
        index: true
    },
    outcome: { type: String },
    notes: { type: String, default: '' },
    sourceCallId: { type: mongoose.Schema.Types.ObjectId, ref: 'SalesCallLog' },
    rescheduledFromId: { type: mongoose.Schema.Types.ObjectId, ref: 'SalesMeeting' },
    rescheduleHistory: [{
        previousDate: Date,
        reason: String,
        rescheduledBy: String,
        rescheduledAt: { type: Date, default: Date.now }
    }],
    createdAt: { type: Date, default: Date.now, index: true },
    updatedAt: { type: Date, default: Date.now }
});

salesMeetingSchema.index({ ownerId: 1, scheduledAt: 1 });
salesMeetingSchema.index({ status: 1, scheduledAt: 1 });

module.exports = mongoose.model('SalesMeeting', salesMeetingSchema);
