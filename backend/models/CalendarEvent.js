const mongoose = require('mongoose');

const calendarEventSchema = new mongoose.Schema({
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    startAt: { type: Date, required: true, index: true },
    endAt: { type: Date, required: true },
    allDay: { type: Boolean, default: false },
    type: {
        type: String,
        enum: ['meeting', 'call', 'reminder', 'demo', 'internal', 'personal', 'other'],
        default: 'meeting',
        index: true
    },
    status: {
        type: String,
        enum: ['scheduled', 'completed', 'cancelled', 'no_show'],
        default: 'scheduled',
        index: true
    },
    // Who owns / created
    ownerId: { type: String, required: true, index: true },
    ownerName: { type: String, default: '' },
    createdBy: { type: String, required: true },
    createdByName: { type: String, default: '' },
    // Who else is invited
    attendeeIds: [{ type: String }],
    attendeeNames: [{ type: String }],
    // Client / lead context
    clientId: { type: String, index: true },
    clientName: { type: String, default: '' },
    leadId: { type: String },
    leadName: { type: String, default: '' },
    projectId: { type: String },
    projectName: { type: String, default: '' },
    // Logistics
    location: { type: String, default: '' },
    meetingLink: { type: String, default: '' },
    color: { type: String, default: '#3A6FF8' },
    // Reminder: minutes before start
    reminderMinutes: { type: Number, default: 15 },
    reminderSentAt: { type: Date },
    notes: { type: String, default: '' },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

calendarEventSchema.index({ ownerId: 1, startAt: 1 });
calendarEventSchema.index({ attendeeIds: 1, startAt: 1 });
calendarEventSchema.index({ status: 1, startAt: 1 });

module.exports = mongoose.model('CalendarEvent', calendarEventSchema);
