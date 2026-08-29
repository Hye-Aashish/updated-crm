const mongoose = require('mongoose');

const onboardingFormSchema = new mongoose.Schema({
    title: { type: String, default: 'Candidate Onboarding & Document Verification Form' },
    description: { type: String, default: 'Please fill in your accurate personal, educational, banking information and upload the required verification documents.' },
    fields: [{
        id: { type: String, required: true },
        label: { type: String, required: true },
        type: { type: String, enum: ['text', 'email', 'phone', 'date', 'select', 'textarea', 'number'], default: 'text' },
        category: { type: String, enum: ['personal', 'address', 'education', 'bank', 'other'], default: 'personal' },
        required: { type: Boolean, default: false },
        enabled: { type: Boolean, default: true },
        placeholder: String,
        options: [String]
    }],
    requiredDocuments: [{
        id: { type: String, required: true },
        name: { type: String, required: true },
        description: String,
        required: { type: Boolean, default: false },
        enabled: { type: Boolean, default: true },
        allowedFormats: { type: [String], default: ['pdf', 'jpg', 'jpeg', 'png', 'doc', 'docx'] }
    }],
    instructions: { type: String, default: 'Ensure all scanned documents are clearly legible. Providing false information may lead to revocation of the offer.' },
    isActive: { type: Boolean, default: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, {
    timestamps: true
});

module.exports = mongoose.model('OnboardingForm', onboardingFormSchema);
