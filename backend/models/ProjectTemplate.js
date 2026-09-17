const mongoose = require('mongoose');

const templateCheckpointSchema = new mongoose.Schema({
    title: { type: String, required: true },
    order: { type: Number, default: 0 },
    defaultRole: { type: String, default: 'developer' }, // developer, designer, qa, pm
    defaultDurationDays: { type: Number, default: 1 },
    priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
    isMandatory: { type: Boolean, default: true },
    proofRequired: { type: Boolean, default: false },
    proofType: { type: String, enum: ['url', 'build_file', 'version', 'transaction_ref', 'screenshot', 'any'], default: 'any' },
    approvalRequired: { type: Boolean, default: false },
    dependencyIndices: [{ type: Number }] // Relative indices in the same template
});

const templatePhaseSchema = new mongoose.Schema({
    name: { type: String, required: true },
    order: { type: Number, default: 0 },
    checkpoints: [templateCheckpointSchema]
});

const projectTemplateSchema = new mongoose.Schema({
    name: { type: String, required: true },
    projectType: { type: String, required: true, unique: true }, // website, mobile-app, lms, crm-erp, ecommerce, custom
    description: { type: String },
    phases: [templatePhaseSchema],
    isSystemDefault: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('ProjectTemplate', projectTemplateSchema);
