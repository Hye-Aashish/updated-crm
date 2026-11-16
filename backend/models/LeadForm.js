const mongoose = require('mongoose');

const leadFormSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: String,
    fields: [{
        id: String,
        label: String,
        type: { type: String, default: 'text' },
        required: { type: Boolean, default: false },
        placeholder: String,
        options: [String]
    }],
    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('LeadForm', leadFormSchema);
