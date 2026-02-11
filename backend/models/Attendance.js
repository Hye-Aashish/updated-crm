const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true
    },
    date: {
        type: Date,
        required: true
    },
    checkIn: {
        type: Date
    },
    checkOut: {
        type: Date
    },
    breaks: [{
        start: { type: Date },
        end: { type: Date }
    }],
    status: {
        type: String,
        enum: ['present', 'absent', 'on-break', 'checked-out', 'half-day', 'holiday', 'leave', 'late', 'off'],
        default: 'present'
    },
    isHalfDay: {
        type: Boolean,
        default: false
    },
    totalWorkTime: {
        type: Number, // minutes
        default: 0
    },
    totalBreakTime: {
        type: Number, // minutes
        default: 0
    },
    note: String
}, {
    timestamps: true
});

// Compound index for user and date
attendanceSchema.index({ userId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', attendanceSchema);
