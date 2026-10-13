const mongoose = require('mongoose');

const hostingSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Server name is required'],
        trim: true
    },
    serverIp: {
        type: String,
        trim: true,
        default: ''
    },
    provider: {
        type: String,
        required: [true, 'Hosting provider is required'],
        trim: true,
        default: 'DigitalOcean'
    },
    clientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Client',
        default: null
    },
    projectId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project',
        default: null
    },
    plan: {
        type: String,
        trim: true,
        default: ''
    },
    location: {
        type: String,
        trim: true,
        default: ''
    },
    cost: {
        type: Number,
        required: true,
        default: 0
    },
    billingCycle: {
        type: String,
        enum: ['monthly', 'quarterly', 'half-yearly', 'annually'],
        default: 'monthly'
    },
    purchaseDate: {
        type: Date,
        default: Date.now
    },
    renewalDate: {
        type: Date,
        required: [true, 'Renewal date is required']
    },
    status: {
        type: String,
        enum: ['active', 'expiring-soon', 'suspended', 'terminated'],
        default: 'active'
    },
    os: {
        type: String,
        trim: true,
        default: 'Ubuntu 22.04 LTS'
    },
    sshUser: {
        type: String,
        trim: true,
        default: 'root'
    },
    sshPort: {
        type: Number,
        default: 22
    },
    notes: {
        type: String,
        default: ''
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Hosting', hostingSchema);
