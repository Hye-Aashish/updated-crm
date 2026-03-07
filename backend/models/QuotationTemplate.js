const mongoose = require('mongoose');

const quotationTemplateSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true
    },
    sections: [{
        title: String,
        content: String // Rich text content with variables
    }],
    defaultDeliverables: [{
        name: String,
        included: { type: Boolean, default: true }
    }],
    modules: [{
        name: { type: String, required: true },
        description: String,
        cost: { type: Number, default: 0 },
        included: { type: Boolean, default: true }
    }],
    branding: {
        headerText: String,
        footerText: String,
        showCoverPage: { type: Boolean, default: true },
        coverPageTitle: String,
        coverPageSubtitle: String
    },
    timeline: String,
    warrantyPeriod: { type: String, default: '3 Months' },
    milestones: [{
        name: { type: String, required: true },
        percentage: { type: Number, required: true }
    }],
    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, {
    timestamps: true
});

module.exports = mongoose.model('QuotationTemplate', quotationTemplateSchema);
