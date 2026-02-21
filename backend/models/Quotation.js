const mongoose = require('mongoose');

const milestoneSchema = new mongoose.Schema({
    name: { type: String, required: true },
    percentage: { type: Number, required: true },
    amount: { type: Number, required: true },
    dueDate: Date,
    status: {
        type: String,
        enum: ['pending', 'paid', 'overdue'],
        default: 'pending'
    }
});

const moduleSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: String,
    cost: { type: Number, default: 0 },
    included: { type: Boolean, default: true }
});

const changeRequestSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: String,
    estimatedCost: { type: Number, default: 0 },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvedAt: Date,
    createdAt: { type: Date, default: Date.now }
});

const quotationSchema = new mongoose.Schema({
    quotationNumber: { type: String, unique: true },
    version: { type: Number, default: 1 },
    parentQuotation: { type: mongoose.Schema.Types.ObjectId, ref: 'Quotation' },

    clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
    clientName: String,
    clientEmail: String,
    clientPhone: String,
    clientAddress: String,

    projectTitle: { type: String, required: true },
    projectType: { type: String },

    // Proposal Sections
    objective: String,
    projectScope: String,
    sections: [{
        title: String,
        content: String
    }],
    timeline: String,
    warrantyPeriod: { type: String, default: '3 Months' },

    // Components
    modules: [moduleSchema],
    deliverables: [{
        name: { type: String, required: true },
        included: { type: Boolean, default: true }
    }],

    // Financials
    totalAmount: { type: Number, default: 0 },
    gstPercentage: { type: Number, default: 18 },
    gstAmount: { type: Number, default: 0 },
    grandTotal: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },

    // Automation & Logic
    milestones: [milestoneSchema],
    changeRequests: [changeRequestSchema],

    status: {
        type: String,
        enum: ['draft', 'sent', 'approved', 'rejected', 'revision', 'expired'],
        default: 'draft'
    },
    scopeLocked: { type: Boolean, default: false },
    expiryDate: Date,

    companyDetails: {
        name: String,
        address: String,
        phone: String,
        email: String,
        website: String,
        gst: String
    },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    branding: {
        headerText: String,
        footerText: String,
        showCoverPage: { type: Boolean, default: true },
        coverPageTitle: String,
        coverPageSubtitle: String
    },
    approvedAt: Date,
    rejectedReason: String
}, {
    timestamps: true
});

// Auto-generate quotation number & Calculate Totals
quotationSchema.pre('save', async function () {
    // 1. Calculate Financials if not locked
    if (!this.scopeLocked) {
        this.totalAmount = this.modules
            .filter(m => m.included)
            .reduce((sum, m) => sum + (Number(m.cost) || 0), 0);

        this.gstAmount = (this.totalAmount * this.gstPercentage) / 100;
        this.grandTotal = this.totalAmount + this.gstAmount - (Number(this.discount) || 0);

        // 2. Auto-manage milestones if empty (30-30-40)
        if (this.milestones.length === 0 && this.grandTotal > 0) {
            this.milestones = [
                { name: 'Pre Development', percentage: 30, amount: (this.grandTotal * 0.3) },
                { name: 'On Development', percentage: 30, amount: (this.grandTotal * 0.3) },
                { name: 'Post Development', percentage: 40, amount: (this.grandTotal * 0.4) }
            ];
        }
    }

    // 3. Generate Number
    if (!this.quotationNumber) {
        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const lastQuotation = await this.constructor.findOne({
            quotationNumber: new RegExp(`^QT${year}${month}`)
        }).sort({ quotationNumber: -1 });

        let sequence = 1;
        if (lastQuotation && lastQuotation.quotationNumber) {
            const lastPart = lastQuotation.quotationNumber.slice(-4);
            const lastSequence = parseInt(lastPart);
            if (!isNaN(lastSequence)) {
                sequence = lastSequence + 1;
            }
        }
        this.quotationNumber = `QT${year}${month}${String(sequence).padStart(4, '0')}`;
    }
});

module.exports = mongoose.model('Quotation', quotationSchema);
