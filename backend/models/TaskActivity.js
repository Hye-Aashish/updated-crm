const mongoose = require('mongoose');

const taskActivitySchema = new mongoose.Schema({
    taskId: { type: String, required: true },
    taskTitle: { type: String, required: true },
    userId: { type: String, required: true },
    userName: { type: String, required: true },
    taskAssigneeId: { type: String },
    taskAssigneeName: { type: String },
    taskStatus: { type: String },
    actionType: { 
        type: String, 
        enum: ['create', 'status_change', 'update', 'delete', 'timer_start', 'timer_stop'], 
        required: true 
    },
    oldStatus: { type: String },
    newStatus: { type: String },
    details: { type: String },
    createdAt: { type: Date, default: Date.now }
});

taskActivitySchema.index({ createdAt: -1 });
taskActivitySchema.index({ userId: 1 });
taskActivitySchema.index({ taskAssigneeId: 1 });

module.exports = mongoose.model('TaskActivity', taskActivitySchema);
