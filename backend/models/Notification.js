const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: {
        type: String,
        enum: ['new_lead', 'new_task', 'new_client', 'reminder', 'status_change', 'system', 'expiry_alert', 'overdue_invoice'],
        default: 'system'
    },
    relatedId: String, // ID of lead, task, etc.
    relatedType: String, // 'amc', 'domain', 'invoice'
    read: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
});

notificationSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
