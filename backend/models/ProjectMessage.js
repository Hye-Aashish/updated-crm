const mongoose = require('mongoose');

const projectMessageSchema = new mongoose.Schema({
    projectId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project',
        required: true
    },
    senderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    senderName: {
        type: String,
        required: true
    },
    senderRole: {
        type: String,
        required: true
    },
    message: {
        type: String,
        required: true
    },
    attachments: [{
        name: String,
        url: String,
        fileType: String
    }],
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('ProjectMessage', projectMessageSchema);
