const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String },
    status: {
        type: String,
        enum: ['planning', 'in-progress', 'completed', 'on-hold'],
        default: 'planning'
    },
    health: {
        type: String,
        enum: ['green', 'yellow', 'red', 'blue', 'completed'],
        default: 'green'
    },
    startDate: { type: Date, default: Date.now },
    dueDate: { type: Date, required: true },
    budget: { type: Number, default: 0 },
    advanceAmount: { type: Number, default: 0 },
    milestoneAmount: { type: Number, default: 0 },
    finalAmount: { type: Number, default: 0 },
    paymentStatus: {
        type: String,
        enum: ['paid', 'partially-paid', 'pending', 'overdue'],
        default: 'pending'
    },
    clientId: { type: String, required: true },
    pmId: { type: String },
    members: [{ type: String }],
    developers: [{ type: String }],
    designers: [{ type: String }],
    clientProductId: { type: String },
    type: { type: String, default: 'custom' }, // website, mobile-app, lms, crm-erp, ecommerce, custom
    paymentModel: { type: String, default: 'milestone' },
    progress: { type: Number, default: 0 },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high', 'urgent'],
        default: 'medium'
    },

    // Technical Deliverables & Requirements
    websiteRequired: { type: Boolean, default: false },
    websiteStatus: {
        type: String,
        enum: ['not-started', 'development', 'testing', 'ready', 'deployed', 'live', 'down'],
        default: 'not-started'
    },
    domain: { type: String },
    websiteUrl: { type: String },
    stagingUrl: { type: String },
    productionUrl: { type: String },

    androidRequired: { type: Boolean, default: false },
    androidStatus: {
        type: String,
        enum: ['not-started', 'development', 'build-generated', 'testing', 'production-build', 'submitted', 'live'],
        default: 'not-started'
    },
    androidAppUrl: { type: String },
    androidVersion: { type: String },
    androidBuildNumber: { type: String },

    iosRequired: { type: Boolean, default: false },
    iosStatus: {
        type: String,
        enum: ['not-started', 'development', 'build-generated', 'testing', 'production-build', 'submitted', 'live'],
        default: 'not-started'
    },
    iosAppUrl: { type: String },
    iosVersion: { type: String },
    iosBuildNumber: { type: String },

    adminPanelRequired: { type: Boolean, default: false },
    apiRequired: { type: Boolean, default: false },
    hostingRequired: { type: Boolean, default: false },
    maintenanceRequired: { type: Boolean, default: false },

    // Client Communication
    lastClientUpdate: { type: Date },
    lastCallDate: { type: Date },
    lastWhatsAppDate: { type: Date },
    lastEmailDate: { type: Date },
    clientResponse: { type: String },
    nextFollowUpDate: { type: Date },
    followUpNotes: { type: String },

    // Handover & Approval
    sourceCodeHandover: { type: Boolean, default: false },
    credentialsHandover: { type: Boolean, default: false },
    documentationHandover: { type: Boolean, default: false },
    clientApproved: { type: Boolean, default: false },

    milestones: [{
        name: { type: String, required: true },
        description: { type: String },
        dueDate: { type: Date },
        amount: { type: Number, default: 0 },
        completed: { type: Boolean, default: false },
        status: {
            type: String,
            enum: ['pending', 'in-progress', 'completed'],
            default: 'pending'
        },
        paidAmount: { type: Number, default: 0 },
        paymentStatus: {
            type: String,
            enum: ['unpaid', 'partial', 'paid'],
            default: 'unpaid'
        },
        invoiceId: { type: String },
        paidDate: { type: Date },
        paymentMethod: { type: String, default: 'Bank Transfer' },
        paymentReference: { type: String },
        paymentNotes: { type: String },
        completedAt: { type: Date }
    }],
    autoInvoice: { type: Boolean, default: false },
    notes: [{
        text: { type: String, required: true },
        createdBy: { type: String, required: true },
        creatorName: { type: String, required: true },
        createdAt: { type: Date, default: Date.now }
    }],
    credentials: [{
        title: { type: String, required: true },
        type: { type: String, default: 'other' },
        url: { type: String },
        username: { type: String, required: true },
        password: { type: String, required: true },
        createdBy: { type: String, required: true },
        createdAt: { type: Date, default: Date.now }
    }],
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Project', projectSchema);
