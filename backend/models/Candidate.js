const mongoose = require('mongoose');

const candidateSchema = new mongoose.Schema({
    token: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String, trim: true },
    designation: { type: String, trim: true },
    department: { type: String, trim: true },
    status: {
        type: String,
        enum: [
            'invited',          // Link sent to candidate
            'submitted',        // Candidate filled form & uploaded docs
            'offer_drafted',    // Offer letter generated / drafted in CRM
            'pending_approval', // Sent to Admin for approval
            'approved',         // Admin approved the offer letter
            'rejected',         // Admin rejected the offer letter
            'offer_sent',       // Sent to candidate via email / portal
            'accepted',         // Candidate accepted offer
            'declined',         // Candidate declined offer
            'converted'         // Converted to full CRM Employee/User
        ],
        default: 'invited'
    },
    // Form submission data
    submittedData: {
        personal: {
            salutation: { type: String, default: 'Mr.' },
            gender: String,
            dateOfBirth: Date,
            fatherName: String,
            motherName: String,
            bloodGroup: String,
            maritalStatus: String,
            alternatePhone: String,
            emergencyContactName: String,
            emergencyContactPhone: String,
            emergencyContactRelation: String,
        },
        address: {
            currentAddress: String,
            currentCity: String,
            currentState: String,
            currentPincode: String,
            permanentAddress: String,
            permanentCity: String,
            permanentState: String,
            permanentPincode: String,
            isSameAsCurrent: { type: Boolean, default: false }
        },
        education: {
            highestQualification: String,
            institution: String,
            passingYear: String,
            percentageOrCgpa: String,
            totalExperienceYears: String,
            previousCompany: String,
            previousDesignation: String,
            previousSalary: String
        },
        bank: {
            accountHolderName: String,
            accountNumber: String,
            bankName: String,
            ifscCode: String,
            branchName: String,
            panNumber: String,
            aadharNumber: String,
            uanNumber: String
        },
        customFields: { type: Map, of: String }
    },
    // Uploaded Documents
    documents: [{
        documentId: String,      // matches requiredDocuments.id or type
        name: String,            // e.g. "Aadhar Card Front & Back"
        fileName: String,
        fileUrl: String,
        fileType: String,
        fileSize: Number,
        uploadedAt: { type: Date, default: Date.now }
    }],
    // Offer Letter Data
    offerLetter: {
        templateId: { type: mongoose.Schema.Types.ObjectId, ref: 'QuotationTemplate' },
        offerDate: { type: Date, default: Date.now },
        joiningDate: Date,
        reportingTo: String,
        workLocation: { type: String, default: 'Office / On-site' },
        employmentType: { type: String, default: 'Full Time' },
        probationPeriodMonths: { type: Number, default: 3 },
        noticePeriodDays: { type: Number, default: 30 },
        validUntil: Date,
        
        // Financials / CTC Breakdown
        ctcAnnual: { type: Number, default: 0 },
        monthlyGross: { type: Number, default: 0 },
        basicSalary: { type: Number, default: 0 },
        hra: { type: Number, default: 0 },
        specialAllowance: { type: Number, default: 0 },
        conveyanceAllowance: { type: Number, default: 0 },
        medicalAllowance: { type: Number, default: 0 },
        performanceBonusAnnual: { type: Number, default: 0 },
        employerPf: { type: Number, default: 0 },
        employeePf: { type: Number, default: 0 },
        professionalTax: { type: Number, default: 0 },
        netInHandMonthly: { type: Number, default: 0 },
        customSalaryComponents: [{
            name: String,
            amount: Number,
            type: { type: String, enum: ['earning', 'deduction'] }
        }],

        // Content & Terms
        letterHeading: { type: String, default: 'EMPLOYEEMENT AGREEMENT' },
        introText: String,
        termsAndConditions: [String],
        customClauses: String,
        sections: [{
            id: String,
            title: String,
            content: String,
            enabled: { type: Boolean, default: true }
        }],
        signatoryCompany: { type: String, default: 'Nexprism' },
        signatoryEmail: { type: String, default: 'Info@Nexprism.com' },
        footerNote: { type: String, default: 'Note: If you fail to perform your duties responsibly or your work performance is found unsatisfactory during the internship, the company reserves the right to cancel/terminate this internship offer at any time without prior notice.' },
        
        // Generated PDF info
        pdfUrl: String,
        generatedAt: Date
    },
    // Admin Approval
    approval: {
        status: { type: String, enum: ['none', 'pending', 'approved', 'rejected'], default: 'none' },
        requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        requestedAt: Date,
        approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        approvedAt: Date,
        rejectedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        rejectedAt: Date,
        adminNotes: String
    },
    // Dispatch
    sentAt: Date,
    sentBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    emailMessageId: String,
    
    // Converted to Employee
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    convertedAt: Date,
    convertedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    // Audit
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    history: [{
        action: String,
        performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        performerName: String,
        timestamp: { type: Date, default: Date.now },
        notes: String
    }]
}, {
    timestamps: true
});

module.exports = mongoose.model('Candidate', candidateSchema);
