const mongoose = require('mongoose');

const pipelineRuleSchema = new mongoose.Schema({
    name: { type: String, required: true },
    onStage: { type: String, required: true },
    enabled: { type: Boolean, default: true },
    actions: [{
        type: {
            type: String,
            enum: ['createTask', 'setAssignee', 'setReminder'],
            required: true
        },
        // createTask
        taskTitle: String,
        taskPriority: { type: String, default: 'medium' },
        dueInDays: { type: Number, default: 1 },
        // setAssignee
        assigneeId: String,
        assigneeName: String,
        // setReminder
        reminderInHours: { type: Number, default: 24 },
        reminderTone: { type: String, default: 'default' }
    }],
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('PipelineRule', pipelineRuleSchema);
