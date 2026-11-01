const mongoose = require('mongoose');

const clientOnboardingTemplateSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String },
    icon: { type: String, default: 'Globe' },
    fields: [
        {
            id: { type: String, required: true },
            label: { type: String, required: true },
            type: { 
                type: String, 
                enum: ['text', 'textarea', 'select', 'number', 'date', 'file'], 
                default: 'text' 
            },
            placeholder: { type: String },
            required: { type: Boolean, default: false },
            options: [{ type: String }],
            helpText: { type: String }
        }
    ],
    standardFields: {
        company: { type: Boolean, default: true },
        website: { type: Boolean, default: true },
        gstNumber: { type: Boolean, default: true },
        address: { type: Boolean, default: true },
        city: { type: Boolean, default: true },
        state: { type: Boolean, default: true },
        country: { type: Boolean, default: true },
        industry: { type: Boolean, default: true },
        services: { type: Boolean, default: true },
        budget: { type: Boolean, default: true },
        expectedDeadline: { type: Boolean, default: true }
    },
    isDefault: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('ClientOnboardingTemplate', clientOnboardingTemplateSchema);

