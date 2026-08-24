const mongoose = require('mongoose');

const taskItemSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String },
    status: {
        type: String,
        enum: ['pending', 'in_progress', 'completed'],
        default: 'pending'
    },
    dueDate: { type: Date },
    completedAt: { type: Date },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

const paymentRecordSchema = new mongoose.Schema({
    amount: { type: Number, required: true },
    date: { type: Date, default: Date.now },
    paymentMethod: { type: String, default: 'Bank Transfer' },
    reference: { type: String }, // Transaction / UTR ID
    notes: { type: String },
    recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

const milestoneSchema = new mongoose.Schema({
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
    paidDate: { type: Date },
    paymentMethod: { type: String, default: 'Bank Transfer' },
    paymentReference: { type: String }, // Transaction / UTR ID
    paymentNotes: { type: String },
    invoiceId: { type: String },
    completedAt: { type: Date }
}, { timestamps: true });

const clientProductSchema = new mongoose.Schema({
    client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    customPrice: { type: Number, required: true, default: 0 },
    paidAmount: { type: Number, default: 0 },
    paymentStatus: {
        type: String,
        enum: ['unpaid', 'partial', 'paid', 'overdue'],
        default: 'unpaid'
    },
    workStatus: {
        type: String,
        enum: ['not_started', 'in_progress', 'review', 'completed', 'on_hold'],
        default: 'not_started'
    },
    progress: { type: Number, min: 0, max: 100, default: 0 },
    startDate: { type: Date, default: Date.now },
    dueDate: { type: Date },
    assignedTo: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    customizations: { type: String },
    tasks: [taskItemSchema],
    milestones: [milestoneSchema],
    paymentHistory: [paymentRecordSchema],
    status: {
        type: String,
        enum: ['active', 'cancelled', 'suspended', 'completed'],
        default: 'active'
    },
    assignedAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

clientProductSchema.index({ client: 1 });
clientProductSchema.index({ product: 1 });
clientProductSchema.index({ status: 1 });
clientProductSchema.index({ workStatus: 1 });
clientProductSchema.index({ paymentStatus: 1 });
clientProductSchema.index({ dueDate: 1 });

module.exports = mongoose.model('ClientProduct', clientProductSchema);
