const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String },
    projectId: { type: String, required: true },
    status: {
        type: String,
        enum: ['todo', 'in-progress', 'in-review', 'done', 'completed'],
        default: 'todo'
    },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high', 'urgent'],
        default: 'medium'
    },
    assigneeId: { type: String },
    dueDate: { type: Date },
    estimatedHours: { type: Number },
    labels: [{ type: String }],
    attachments: [{
        name: String,
        fileType: String, // 'image', 'video', 'other'
        data: String // Base64 string or URL
    }],
    checklist: [{
        text: String,
        completed: { type: Boolean, default: false }
    }],
    // Timer tracking fields
    isTimerRunning: { type: Boolean, default: false },
    lastStartTime: { type: Number },
    totalTimeSpent: { type: Number, default: 0 },
    timeEntryId: { type: String }, // Reference to current time entry
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Task', taskSchema);
