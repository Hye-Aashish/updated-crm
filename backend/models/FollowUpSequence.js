const mongoose = require('mongoose');

const followUpSequenceSchema = new mongoose.Schema({
    name: { type: String, required: true },
    enabled: { type: Boolean, default: true },
    steps: [{
        dayOffset: { type: Number, required: true }, // days after enrollment
        channel: { type: String, enum: ['reminder', 'email', 'note'], default: 'reminder' },
        message: { type: String, default: '' },
        tone: { type: String, default: 'default' }
    }],
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

const leadSequenceEnrollmentSchema = new mongoose.Schema({
    leadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead', required: true, index: true },
    sequenceId: { type: mongoose.Schema.Types.ObjectId, ref: 'FollowUpSequence', required: true },
    enrolledAt: { type: Date, default: Date.now },
    currentStep: { type: Number, default: 0 },
    completed: { type: Boolean, default: false },
    lastFiredAt: Date,
    firedSteps: [{ type: Number }]
});

module.exports = {
    FollowUpSequence: mongoose.model('FollowUpSequence', followUpSequenceSchema),
    LeadSequenceEnrollment: mongoose.model('LeadSequenceEnrollment', leadSequenceEnrollmentSchema)
};
