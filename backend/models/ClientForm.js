const mongoose = require('mongoose');

const clientFormSchema = new mongoose.Schema({
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
    successMessage: {
        type: String,
        default: 'Your details have been submitted. Please wait for some time — our team will contact you shortly.'
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

clientFormSchema.pre('save', function () {
    this.updatedAt = new Date();
});

module.exports = mongoose.model('ClientForm', clientFormSchema);
