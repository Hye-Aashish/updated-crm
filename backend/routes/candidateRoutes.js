const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const Candidate = require('../models/Candidate');
const OnboardingForm = require('../models/OnboardingForm');
const User = require('../models/User');
const Setting = require('../models/Setting');
const { protect, authorize } = require('../middleware/authMiddleware');
const upload = require('../utils/multerConfig');
const sendEmail = require('../utils/sendEmail');
const generateOfferLetterPDF = require('../utils/generateOfferLetterPDF');

// Default initial onboarding form config
const getDefaultOfferSections = () => [
    {
        id: 'place_of_work',
        title: 'Place of Work',
        content: `Your primary place of work will be {{work_location}}. You are expected to have a reliable internet connection and a suitable workspace to effectively perform your job duties. While your role is remote, you may be required to attend meetings, training sessions, or other events at the company's office or another designated location as needed, with reasonable notice.`,
        enabled: true
    },
    {
        id: 'working_hours',
        title: 'Working Hours',
        content: `Your regular working hours will be from 10:00am to 6:00pm, Monday to Saturday. You may be required to work additional hours based on the needs of the business.`,
        enabled: true
    },
    {
        id: 'confidentiality_nda',
        title: 'Confidentiality and Non-Disclosure',
        content: `You will be required to sign a Confidentiality Agreement as a condition of your employment. This agreement outlines your responsibility to protect the company's confidential information both during and after your employment.`,
        enabled: true
    },
    {
        id: 'code_data_usage',
        title: 'Code and Data Usage',
        content: `You are strictly prohibited from using any code, software, or proprietary information from the company for personal use without prior written consent. Furthermore, you may not share, leak, or disclose any code, company details, or confidential information to any third party or external entity without explicit permission from the company. Violating this term will be considered a serious breach of your employment agreement and may result in immediate termination and potential legal action.`,
        enabled: true
    },
    {
        id: 'client_communication',
        title: 'Client Communication and Reporting',
        content: `As a developer, you are not permitted to directly connect with clients without prior approval from the company. If a client reaches out to you directly, you are required to inform the company immediately. Any communication with clients must be conducted in accordance with the company’s guidelines and procedures.\nFailure to report such communication to the company may result in disciplinary action, up to and including legal action against you.`,
        enabled: true
    },
    {
        id: 'notice_period',
        title: 'Notice Period:',
        content: `The company may terminate the employee employment at any time without any reason by giving notice period of {{notice_period}} days or by payment of salary in lie there of.\nIf the employee is willing to leave the organization then he must inform before {{notice_period}} days and he must be transfer all his work to the new employee.`,
        enabled: true
    },
    {
        id: 'probation_period',
        title: 'Probationary Period',
        content: `Your initial employment will be subject to a probationary period of {{probation_period}} months. During this period, either party may terminate the employment with 7 days notice.`,
        enabled: true
    },
    {
        id: 'termination',
        title: 'Termination',
        content: `Your employment may be terminated by either party by providing {{notice_period}}days' written notice. In the event of gross misconduct or breach of contract, termination may be immediate and without notice.`,
        enabled: true
    },
    {
        id: 'code_of_conduct',
        title: 'Code of Conduct',
        content: `You are expected to adhere to the company's Code of Conduct, which includes guidelines on behavior, dress code, and professional interactions. Any violations may result in disciplinary action, up to and including termination.`,
        enabled: true
    },
    {
        id: 'non_solicitation',
        title: 'Confidentiality and Non-Solicitation',
        content: `While employed with the company, and even after your employment ends, you are strictly prohibited from using any client data whether it be contact information, project details, or any other information for personal benefit. You are also not permitted to share any client data with third parties.\nFurthermore, after leaving the company, you are not allowed to pitch or approach the company’s clients for any purpose. If you do so, the company reserves the right to take legal action against you.`,
        enabled: true
    },
    {
        id: 'dual_employment',
        title: 'Dual Employment / Outside Work Clause',
        content: `During your employment with the company, you are required to dedicate your full working hours exclusively to the duties assigned by the company. You shall not engage in any other employment, freelance work, business activity, or service paid or unpaid during working hours.\nIf you are found involved in any such activity, the company reserves the right to terminate your employment immediately. Additionally, any financial or reputational loss caused to the company due to such actions will be fully recoverable from you.`,
        enabled: true
    },
    {
        id: 'internal_politics',
        title: 'Internal/Company Politics Clause',
        content: `The Employee shall not engage in any form of office or internal company politics, including spreading rumors, creating conflicts among colleagues, favoring or influencing decisions for personal gain, or interfering in the Company’s management or decision-making processes. Any breach of this clause may result in disciplinary action, including termination, and the Company reserves the right to take legal action if deemed necessary.`,
        enabled: true
    },
    {
        id: 'other_conditions',
        title: 'Other Conditions',
        content: `Your employment is subject to the company’s standard terms and conditions, which may be amended from time to time. This offer is contingent upon successful completion of any pre-employment checks.\nPlease sign and return a copy of this letter by {{acceptance_deadline}} to confirm your acceptance of this offer.\nWe are excited about the prospect of you joining our team and look forward to your contributions to the continued success of Nexprism\nIf you have any questions or need further clarification, please do not hesitate to contact us.`,
        enabled: true
    }
];

const getDefaultFormConfig = () => ({
    title: 'Candidate Onboarding & Document Verification',
    description: 'Please fill in your accurate personal, educational, and banking details and upload the required verification documents.',
    fields: [
        { id: 'salutation', label: 'Salutation', type: 'select', category: 'personal', required: true, enabled: true, options: ['Mr.', 'Ms.', 'Mrs.', 'Dr.'] },
        { id: 'gender', label: 'Gender', type: 'select', category: 'personal', required: true, enabled: true, options: ['Male', 'Female', 'Other'] },
        { id: 'dateOfBirth', label: 'Date of Birth', type: 'date', category: 'personal', required: true, enabled: true },
        { id: 'fatherName', label: "Father's Name", type: 'text', category: 'personal', required: true, enabled: true },
        { id: 'motherName', label: "Mother's Name", type: 'text', category: 'personal', required: false, enabled: true },
        { id: 'bloodGroup', label: 'Blood Group', type: 'select', category: 'personal', required: false, enabled: true, options: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] },
        { id: 'maritalStatus', label: 'Marital Status', type: 'select', category: 'personal', required: false, enabled: true, options: ['Single', 'Married', 'Other'] },
        { id: 'alternatePhone', label: 'Alternate Contact Number', type: 'phone', category: 'personal', required: false, enabled: true },
        { id: 'emergencyContactName', label: 'Emergency Contact Person Name', type: 'text', category: 'personal', required: true, enabled: true },
        { id: 'emergencyContactPhone', label: 'Emergency Contact Phone', type: 'phone', category: 'personal', required: true, enabled: true },
        { id: 'emergencyContactRelation', label: 'Relationship with Emergency Contact', type: 'text', category: 'personal', required: true, enabled: true },

        { id: 'currentAddress', label: 'Current Residential Address', type: 'textarea', category: 'address', required: true, enabled: true },
        { id: 'currentCity', label: 'City', type: 'text', category: 'address', required: true, enabled: true },
        { id: 'currentState', label: 'State', type: 'text', category: 'address', required: true, enabled: true },
        { id: 'currentPincode', label: 'Pincode / ZIP', type: 'text', category: 'address', required: true, enabled: true },
        { id: 'permanentAddress', label: 'Permanent Address', type: 'textarea', category: 'address', required: false, enabled: true },

        { id: 'highestQualification', label: 'Highest Degree / Qualification', type: 'text', category: 'education', required: true, enabled: true },
        { id: 'institution', label: 'College / University Name', type: 'text', category: 'education', required: true, enabled: true },
        { id: 'passingYear', label: 'Year of Passing', type: 'text', category: 'education', required: true, enabled: true },
        { id: 'totalExperienceYears', label: 'Total Prior Experience (in Years)', type: 'text', category: 'education', required: false, enabled: true },
        { id: 'previousCompany', label: 'Previous Organization / Employer', type: 'text', category: 'education', required: false, enabled: true },

        { id: 'accountHolderName', label: 'Bank Account Holder Name', type: 'text', category: 'bank', required: true, enabled: true },
        { id: 'accountNumber', label: 'Bank Account Number', type: 'text', category: 'bank', required: true, enabled: true },
        { id: 'bankName', label: 'Bank Name', type: 'text', category: 'bank', required: true, enabled: true },
        { id: 'ifscCode', label: 'Bank IFSC Code', type: 'text', category: 'bank', required: true, enabled: true },
        { id: 'panNumber', label: 'PAN Card Number', type: 'text', category: 'bank', required: true, enabled: true },
        { id: 'aadharNumber', label: 'Aadhar Card Number', type: 'text', category: 'bank', required: true, enabled: true },
    ],
    requiredDocuments: [
        { id: 'resume', name: 'Updated Resume / CV', description: 'Latest updated resume (PDF/DOC)', required: true, enabled: true },
        { id: 'aadhar_card', name: 'Aadhar Card (Front & Back)', description: 'Government issued Aadhar Identity Card', required: true, enabled: true },
        { id: 'pan_card', name: 'PAN Card', description: 'Clear photo/scan of PAN card', required: true, enabled: true },
        { id: 'passport_photo', name: 'Passport Size Photograph', description: 'Recent professional passport size photo', required: true, enabled: true },
        { id: 'degree_certificate', name: 'Highest Degree / Marksheet', description: 'Graduation/Post-Graduation certificate', required: false, enabled: true },
        { id: 'previous_payslips', name: 'Previous 3 Months Payslips', description: 'Salary slips from last employer (if experienced)', required: false, enabled: true },
        { id: 'relieving_letter', name: 'Relieving / Experience Letter', description: 'Relieving letter from previous organization', required: false, enabled: true },
        { id: 'cancelled_cheque', name: 'Cancelled Cheque / Bank Passbook', description: 'For salary account verification', required: false, enabled: true }
    ],
    instructions: 'Please verify all entered details. Scanned documents must be clear and readable. All documents will be stored securely.'
});

// ── 1. FORM CONFIGURATION (HR / ADMIN) ──────────────────────────────────────

router.get('/forms/config', protect, async (req, res) => {
    try {
        let config = await OnboardingForm.findOne();
        if (!config) {
            config = await OnboardingForm.create(getDefaultFormConfig());
        }
        res.json(config);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.put('/forms/config', protect, authorize('admin', 'owner'), async (req, res) => {
    try {
        let config = await OnboardingForm.findOne();
        if (!config) {
            config = new OnboardingForm(getDefaultFormConfig());
        }
        
        config.title = req.body.title || config.title;
        config.description = req.body.description || config.description;
        if (req.body.fields) config.fields = req.body.fields;
        if (req.body.requiredDocuments) config.requiredDocuments = req.body.requiredDocuments;
        if (req.body.instructions !== undefined) config.instructions = req.body.instructions;
        config.updatedBy = req.user._id;

        await config.save();
        res.json(config);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// ── 2. CANDIDATE MANAGEMENT (HR / ADMIN) ────────────────────────────────────

// GET all candidates
router.get('/', protect, async (req, res) => {
    try {
        const { status, search } = req.query;
        let query = {};

        if (status && status !== 'all') {
            query.status = status;
        }

        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { designation: { $regex: search, $options: 'i' } },
                { phone: { $regex: search, $options: 'i' } }
            ];
        }

        const candidates = await Candidate.find(query)
            .populate('approval.approvedBy', 'name email')
            .populate('approval.requestedBy', 'name email')
            .populate('userId', 'name email')
            .sort({ createdAt: -1 });

        res.json(candidates);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// INVITE / CREATE a candidate
router.post('/invite', protect, async (req, res) => {
    try {
        const { name, email, phone, designation, department, sendEmailInvite, ctcAnnual, joiningDate } = req.body;

        if (!name || !email) {
            return res.status(400).json({ message: 'Candidate name and email are required' });
        }

        const token = crypto.randomBytes(24).toString('hex');

        const candidate = new Candidate({
            token,
            name,
            email,
            phone,
            designation,
            department: department || 'Engineering',
            status: 'invited',
            createdBy: req.user._id,
            history: [{
                action: 'Invited / Form Link Generated',
                performedBy: req.user._id,
                performerName: req.user.name,
                notes: 'Candidate invitation created.'
            }]
        });

        if (ctcAnnual || joiningDate) {
            candidate.offerLetter = {
                ctcAnnual: Number(ctcAnnual) || 0,
                joiningDate: joiningDate ? new Date(joiningDate) : null,
                offerDate: new Date()
            };
        }

        await candidate.save();

        const origin = req.headers.origin || `${req.protocol}://${req.get('host')}`;
        const inviteLink = `${origin}/#/candidate-form/${token}`;

        // Send Email if requested
        if (sendEmailInvite) {
            try {
                const settings = await Setting.findOne({ type: 'general' });
                const companyName = settings?.companyProfile?.name || 'NEXPRISM';

                await sendEmail({
                    to: email,
                    subject: `Action Required: Welcome to ${companyName} - Candidate Onboarding Form`,
                    html: `
                        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px; background-color: #ffffff;">
                            <h2 style="color: #1e3a8a; margin-top: 0;">Welcome to ${companyName}!</h2>
                            <p style="color: #334155; font-size: 15px; line-height: 1.5;">Dear <strong>${name}</strong>,</p>
                            <p style="color: #334155; font-size: 14px; line-height: 1.5;">We are thrilled about your candidacy for the <strong>${designation || 'Open'}</strong> position at ${companyName}.</p>
                            <p style="color: #334155; font-size: 14px; line-height: 1.5;">To initiate your official offer letter generation and onboarding process, please click the button below to complete your profile details and upload the required verification documents:</p>
                            <div style="text-align: center; margin: 30px 0;">
                                <a href="${inviteLink}" style="background-color: #2563eb; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 15px; display: inline-block;">Fill Onboarding Form</a>
                            </div>
                            <p style="color: #64748b; font-size: 13px;">Or copy and paste this link in your browser:<br/><a href="${inviteLink}" style="color: #2563eb;">${inviteLink}</a></p>
                            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
                            <p style="color: #94a3b8; font-size: 12px;">This is an automated invitation from ${companyName} Human Resources.</p>
                        </div>
                    `
                });
            } catch (emailErr) {
                console.warn('[INVITE EMAIL WARNING]', emailErr.message);
            }
        }

        res.status(201).json({ candidate, inviteLink });
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// GET candidate by ID
router.get('/:id', protect, async (req, res) => {
    try {
        const candidate = await Candidate.findById(req.params.id)
            .populate('approval.approvedBy', 'name email role')
            .populate('approval.requestedBy', 'name email role')
            .populate('approval.rejectedBy', 'name email role')
            .populate('userId', 'name email role employeeId');

        if (!candidate) return res.status(404).json({ message: 'Candidate not found' });
        res.json(candidate);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// UPDATE candidate basic info / draft
router.put('/:id', protect, async (req, res) => {
    try {
        const candidate = await Candidate.findById(req.params.id);
        if (!candidate) return res.status(404).json({ message: 'Candidate not found' });

        const allowed = ['name', 'email', 'phone', 'designation', 'department', 'status', 'submittedData', 'offerLetter'];
        allowed.forEach(k => {
            if (req.body[k] !== undefined) candidate[k] = req.body[k];
        });

        await candidate.save();
        res.json(candidate);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// DELETE candidate
router.delete('/:id', protect, authorize('admin', 'owner'), async (req, res) => {
    try {
        const candidate = await Candidate.findByIdAndDelete(req.params.id);
        if (!candidate) return res.status(404).json({ message: 'Candidate not found' });
        res.json({ message: 'Candidate record deleted successfully' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// ── 3. OFFER LETTER GENERATION & ADMIN APPROVAL WORKFLOW ────────────────────

// GET Default Offer Letter Template & Sections
router.get('/templates/default', protect, async (req, res) => {
    try {
        res.json({
            letterHeading: 'EMPLOYEEMENT AGREEMENT',
            sections: getDefaultOfferSections(),
            signatoryCompany: 'Nexprism',
            signatoryEmail: 'Info@Nexprism.com',
            footerNote: 'Note: If you fail to perform your duties responsibly or your work performance is found unsatisfactory during the internship, the company reserves the right to cancel/terminate this internship offer at any time without prior notice.'
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// DRAFT / UPDATE OFFER LETTER
router.post('/:id/generate-offer', protect, async (req, res) => {
    try {
        const candidate = await Candidate.findById(req.params.id);
        if (!candidate) return res.status(404).json({ message: 'Candidate not found' });

        const {
            designation,
            department,
            joiningDate,
            reportingTo,
            workLocation,
            employmentType,
            probationPeriodMonths,
            noticePeriodDays,
            validUntil,
            ctcAnnual,
            basicSalary,
            hra,
            specialAllowance,
            employeePf,
            professionalTax,
            introText,
            termsAndConditions,
            customClauses,
            letterHeading,
            sections,
            signatoryCompany,
            signatoryEmail,
            footerNote
        } = req.body;

        if (designation) candidate.designation = designation;
        if (department) candidate.department = department;

        const ctc = Number(ctcAnnual) || 0;
        const basic = Number(basicSalary) || Math.round((ctc / 12) * 0.5);
        const calcHra = Number(hra) || Math.round(basic * 0.5);
        const special = Number(specialAllowance) !== undefined && req.body.specialAllowance !== ''
            ? Number(specialAllowance)
            : Math.max(0, Math.round((ctc / 12) - basic - calcHra));
        const gross = basic + calcHra + special;
        const pf = Number(employeePf) || 0;
        const pt = Number(professionalTax) || 200;
        const net = gross - pf - pt;

        const offerSections = Array.isArray(sections) && sections.length > 0
            ? sections
            : (candidate.offerLetter?.sections && candidate.offerLetter.sections.length > 0
                ? candidate.offerLetter.sections
                : getDefaultOfferSections());

        candidate.offerLetter = {
            offerDate: new Date(),
            joiningDate: joiningDate ? new Date(joiningDate) : candidate.offerLetter?.joiningDate,
            reportingTo: reportingTo || candidate.offerLetter?.reportingTo || 'Management',
            workLocation: workLocation || 'Work from Home',
            employmentType: employmentType || 'Full Time',
            probationPeriodMonths: Number(probationPeriodMonths) || 3,
            noticePeriodDays: Number(noticePeriodDays) || 15,
            validUntil: validUntil ? new Date(validUntil) : null,
            ctcAnnual: ctc,
            monthlyGross: gross,
            basicSalary: basic,
            hra: calcHra,
            specialAllowance: special,
            employeePf: pf,
            professionalTax: pt,
            netInHandMonthly: net,
            letterHeading: letterHeading || candidate.offerLetter?.letterHeading || 'EMPLOYEEMENT AGREEMENT',
            introText: introText || candidate.offerLetter?.introText,
            termsAndConditions: Array.isArray(termsAndConditions) ? termsAndConditions : candidate.offerLetter?.termsAndConditions,
            customClauses: customClauses || '',
            sections: offerSections,
            signatoryCompany: signatoryCompany || candidate.offerLetter?.signatoryCompany || 'Nexprism',
            signatoryEmail: signatoryEmail || candidate.offerLetter?.signatoryEmail || 'Info@Nexprism.com',
            footerNote: footerNote || candidate.offerLetter?.footerNote || 'Note: If you fail to perform your duties responsibly or your work performance is found unsatisfactory during the internship, the company reserves the right to cancel/terminate this internship offer at any time without prior notice.',
            generatedAt: new Date()
        };

        // If candidate was in 'invited' or 'submitted', move to 'offer_drafted'
        if (['invited', 'submitted'].includes(candidate.status)) {
            candidate.status = 'offer_drafted';
        }

        candidate.history.push({
            action: 'Offer Letter Drafted / Updated',
            performedBy: req.user._id,
            performerName: req.user.name,
            notes: `Offer letter drafted with CTC: ₹${ctc.toLocaleString('en-IN')}`
        });

        await candidate.save();
        res.json(candidate);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// DOWNLOAD OFFER LETTER PDF (Admin / HR)
router.get('/:id/pdf', async (req, res) => {
    try {
        const candidate = await Candidate.findById(req.params.id);
        if (!candidate) return res.status(404).json({ message: 'Candidate not found' });

        const settings = await Setting.findOne({ type: 'general' });
        const companyProfile = settings?.companyProfile || {};

        const pdfBuffer = await generateOfferLetterPDF(candidate, companyProfile);

        const safeFilename = `Offer_Letter_${(candidate.name || 'Candidate').replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="${safeFilename}"`);
        res.setHeader('Content-Length', pdfBuffer.length);
        res.send(pdfBuffer);
    } catch (err) {
        console.error('[PDF ERROR]', err);
        res.status(500).json({ message: 'Failed to generate PDF: ' + err.message });
    }
});

// SUBMIT OFFER LETTER FOR ADMIN APPROVAL
router.post('/:id/request-approval', protect, async (req, res) => {
    try {
        const candidate = await Candidate.findById(req.params.id);
        if (!candidate) return res.status(404).json({ message: 'Candidate not found' });

        if (!candidate.offerLetter || !candidate.offerLetter.ctcAnnual) {
            return res.status(400).json({ message: 'Please draft the offer letter details and CTC before requesting approval' });
        }

        candidate.status = 'pending_approval';
        candidate.approval = {
            status: 'pending',
            requestedBy: req.user._id,
            requestedAt: new Date(),
            adminNotes: req.body.notes || ''
        };

        candidate.history.push({
            action: 'Requested Admin Approval',
            performedBy: req.user._id,
            performerName: req.user.name,
            notes: req.body.notes || 'Offer letter submitted for management approval.'
        });

        await candidate.save();
        res.json({ message: 'Offer letter submitted for admin approval', candidate });
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// ADMIN APPROVE / REJECT OFFER LETTER
router.post('/:id/approve', protect, authorize('admin', 'owner'), async (req, res) => {
    try {
        const { action, notes } = req.body; // action: 'approve' | 'reject'
        const candidate = await Candidate.findById(req.params.id);
        if (!candidate) return res.status(404).json({ message: 'Candidate not found' });

        if (action === 'approve') {
            candidate.status = 'approved';
            candidate.approval.status = 'approved';
            candidate.approval.approvedBy = req.user._id;
            candidate.approval.approvedAt = new Date();
            candidate.approval.adminNotes = notes || '';

            candidate.history.push({
                action: 'Offer Letter Approved',
                performedBy: req.user._id,
                performerName: req.user.name,
                notes: notes ? `Approved with notes: ${notes}` : 'Offer letter approved by Admin.'
            });
        } else {
            candidate.status = 'rejected';
            candidate.approval.status = 'rejected';
            candidate.approval.rejectedBy = req.user._id;
            candidate.approval.rejectedAt = new Date();
            candidate.approval.adminNotes = notes || '';

            candidate.history.push({
                action: 'Offer Letter Rejected / Changes Requested',
                performedBy: req.user._id,
                performerName: req.user.name,
                notes: notes ? `Rejected with reason: ${notes}` : 'Offer letter rejected.'
            });
        }

        await candidate.save();
        res.json({ message: `Offer letter ${action === 'approve' ? 'approved' : 'rejected'} successfully`, candidate });
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// SEND APPROVED OFFER LETTER TO CANDIDATE (EMAIL + PDF)
router.post('/:id/send-offer', protect, async (req, res) => {
    try {
        const candidate = await Candidate.findById(req.params.id);
        if (!candidate) return res.status(404).json({ message: 'Candidate not found' });

        if (candidate.status !== 'approved' && candidate.approval?.status !== 'approved') {
            return res.status(400).json({ message: 'Offer letter must be approved by Admin before sending to candidate' });
        }

        const settings = await Setting.findOne({ type: 'general' });
        const companyProfile = settings?.companyProfile || {};
        const companyName = companyProfile.name || 'NEXPRISM';

        // Generate PDF Buffer for attachment
        const pdfBuffer = await generateOfferLetterPDF(candidate, companyProfile);

        const origin = req.headers.origin || `${req.protocol}://${req.get('host')}`;
        const offerPortalLink = `${origin}/#/offer/${candidate.token}`;

        let emailSent = false;
        let emailErrMessage = '';

        try {
            await sendEmail({
                to: candidate.email,
                subject: `Offer of Employment: ${candidate.designation || 'Position'} at ${companyName}`,
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px; background-color: #ffffff;">
                        <h2 style="color: #1e3a8a; margin-top: 0;">Congratulations ${candidate.name}!</h2>
                        <p style="color: #334155; font-size: 15px; line-height: 1.5;">We are delighted to extend you an official Offer of Employment for the position of <strong>${candidate.designation || 'Team Member'}</strong> at <strong>${companyName}</strong>.</p>
                        
                        <div style="background-color: #f8fafc; padding: 16px; border-radius: 6px; border-left: 4px solid #2563eb; margin: 20px 0;">
                            <p style="margin: 4px 0; color: #1e293b; font-size: 14px;"><strong>Designation:</strong> ${candidate.designation || 'Specialist'}</p>
                            <p style="margin: 4px 0; color: #1e293b; font-size: 14px;"><strong>Annual CTC:</strong> ₹${(candidate.offerLetter?.ctcAnnual || 0).toLocaleString('en-IN')}</p>
                            <p style="margin: 4px 0; color: #1e293b; font-size: 14px;"><strong>Joining Date:</strong> ${candidate.offerLetter?.joiningDate ? new Date(candidate.offerLetter.joiningDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }) : 'As agreed'}</p>
                        </div>

                        <p style="color: #334155; font-size: 14px; line-height: 1.5;">Please review the attached official Offer Letter document. You can also view and accept your offer online through your candidate portal:</p>

                        <div style="text-align: center; margin: 25px 0;">
                            <a href="${offerPortalLink}" style="background-color: #16a34a; color: #ffffff; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 15px; display: inline-block;">View & Accept Offer Letter</a>
                        </div>

                        <p style="color: #64748b; font-size: 13px;">Direct link: <a href="${offerPortalLink}" style="color: #2563eb;">${offerPortalLink}</a></p>
                        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
                        <p style="color: #94a3b8; font-size: 12px;">Warm regards,<br/><strong>${companyName} HR Team</strong></p>
                    </div>
                `,
                attachments: [{
                    filename: `Offer_Letter_${candidate.name.replace(/\s+/g, '_')}.pdf`,
                    content: pdfBuffer,
                    contentType: 'application/pdf'
                }]
            });
            emailSent = true;
        } catch (emailErr) {
            console.error('[OFFER EMAIL DISPATCH ERROR]', emailErr);
            emailErrMessage = emailErr.message;
        }

        candidate.status = 'offer_sent';
        candidate.sentAt = new Date();
        candidate.sentBy = req.user._id;
        candidate.history.push({
            action: 'Offer Letter Sent to Candidate',
            performedBy: req.user._id,
            performerName: req.user.name,
            notes: emailSent ? 'Offer letter dispatched via Email with PDF attachment.' : `Email dispatch issue: ${emailErrMessage}. Link generated.`
        });

        await candidate.save();
        res.json({
            message: emailSent ? 'Offer letter sent successfully to candidate via email' : `Offer letter marked sent. (Email: ${emailErrMessage})`,
            candidate,
            offerPortalLink
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// CONVERT CANDIDATE TO FULL CRM EMPLOYEE / USER (1-CLICK)
router.post('/:id/convert-to-employee', protect, authorize('admin', 'owner'), async (req, res) => {
    try {
        const candidate = await Candidate.findById(req.params.id);
        if (!candidate) return res.status(404).json({ message: 'Candidate not found' });

        // Check if user already exists
        let user = await User.findOne({ email: candidate.email });
        if (!user) {
            // Generate temporary password
            const tempPassword = 'User@' + Math.floor(100000 + Math.random() * 900000);
            
            // Map documents
            const aadharDoc = candidate.documents?.find(d => d.documentId === 'aadhar_card' || d.name?.toLowerCase().includes('aadhar'))?.fileUrl;
            const panDoc = candidate.documents?.find(d => d.documentId === 'pan_card' || d.name?.toLowerCase().includes('pan'))?.fileUrl;
            const photoDoc = candidate.documents?.find(d => d.documentId === 'passport_photo' || d.name?.toLowerCase().includes('photo'))?.fileUrl;

            user = new User({
                name: candidate.name,
                email: candidate.email,
                password: tempPassword,
                role: 'employee',
                designation: candidate.designation || 'Software Engineer',
                department: candidate.department || 'Engineering',
                phone: candidate.phone || candidate.submittedData?.personal?.alternatePhone,
                salutation: candidate.submittedData?.personal?.salutation || 'Mr.',
                gender: candidate.submittedData?.personal?.gender || 'Male',
                dateOfBirth: candidate.submittedData?.personal?.dateOfBirth,
                joiningDate: candidate.offerLetter?.joiningDate || new Date(),
                address: candidate.submittedData?.address?.currentAddress,
                aadharNumber: candidate.submittedData?.bank?.aadharNumber,
                panNumber: candidate.submittedData?.bank?.panNumber,
                salary: candidate.offerLetter?.ctcAnnual ? Math.round(candidate.offerLetter.ctcAnnual / 12) : 0,
                avatar: photoDoc || '',
                documentAadhar: aadharDoc || '',
                documentPan: panDoc || '',
                documentOfferLetter: `${req.protocol}://${req.get('host')}/api/candidates/${candidate._id}/pdf`
            });

            await user.save();
        }

        candidate.status = 'converted';
        candidate.userId = user._id;
        candidate.convertedAt = new Date();
        candidate.convertedBy = req.user._id;
        candidate.history.push({
            action: 'Converted to Employee',
            performedBy: req.user._id,
            performerName: req.user.name,
            notes: `Candidate converted to active CRM Employee account (${user.email}).`
        });

        await candidate.save();
        res.json({ message: 'Candidate converted to employee successfully', user, candidate });
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// ── 4. PUBLIC CANDIDATE ENDPOINTS (TOKEN-BASED) ─────────────────────────────

// GET Public Onboarding Form config and Candidate Info
router.get('/public/:token', async (req, res) => {
    try {
        const candidate = await Candidate.findOne({ token: req.params.token });
        if (!candidate) {
            return res.status(404).json({ message: 'Invalid or expired onboarding link' });
        }

        let formConfig = await OnboardingForm.findOne();
        if (!formConfig) {
            formConfig = getDefaultFormConfig();
        }

        const settings = await Setting.findOne({ type: 'general' });
        const companyProfile = settings?.companyProfile || {};

        res.json({
            candidate: {
                id: candidate._id,
                name: candidate.name,
                email: candidate.email,
                phone: candidate.phone,
                designation: candidate.designation,
                department: candidate.department,
                status: candidate.status,
                submittedData: candidate.submittedData,
                documents: candidate.documents
            },
            formConfig,
            companyProfile: {
                name: companyProfile.name || 'NEXPRISM',
                logo: companyProfile.logo,
                themeColor: companyProfile.themeColor || '#2563eb'
            }
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// PUBLIC DOCUMENT UPLOAD (Multer)
router.post('/public/:token/upload', upload.single('file'), async (req, res) => {
    try {
        const candidate = await Candidate.findOne({ token: req.params.token });
        if (!candidate) {
            return res.status(404).json({ message: 'Candidate not found' });
        }

        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        const fileUrl = `${req.protocol}://${req.get('host')}/public/uploads/${req.file.filename}`;
        const docId = req.body.documentId || 'doc_' + Date.now();
        const docName = req.body.name || req.file.originalname;

        // Remove existing document with same ID if any
        candidate.documents = candidate.documents.filter(d => d.documentId !== docId);

        const docRecord = {
            documentId: docId,
            name: docName,
            fileName: req.file.originalname,
            fileUrl: fileUrl,
            fileType: req.file.mimetype,
            fileSize: req.file.size,
            uploadedAt: new Date()
        };

        candidate.documents.push(docRecord);
        await candidate.save();

        res.json({ success: true, document: docRecord });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// PUBLIC FORM SUBMISSION
router.post('/public/:token/submit', async (req, res) => {
    try {
        const candidate = await Candidate.findOne({ token: req.params.token });
        if (!candidate) {
            return res.status(404).json({ message: 'Invalid or expired onboarding link' });
        }

        const { personal, address, education, bank, customFields, phone } = req.body;

        candidate.submittedData = {
            personal: personal || {},
            address: address || {},
            education: education || {},
            bank: bank || {},
            customFields: customFields || {}
        };

        if (phone) candidate.phone = phone;
        if (personal?.dateOfBirth) candidate.submittedData.personal.dateOfBirth = new Date(personal.dateOfBirth);

        candidate.status = 'submitted';
        candidate.history.push({
            action: 'Details & Documents Submitted by Candidate',
            performerName: candidate.name,
            notes: 'Candidate completed the onboarding form submission.'
        });

        await candidate.save();
        res.json({ success: true, message: 'Onboarding details submitted successfully!' });
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// PUBLIC OFFER VIEW (Candidate portal to view official offer)
router.get('/public/:token/offer-view', async (req, res) => {
    try {
        const candidate = await Candidate.findOne({ token: req.params.token });
        if (!candidate) return res.status(404).json({ message: 'Offer not found' });

        if (!['approved', 'offer_sent', 'accepted', 'declined', 'converted'].includes(candidate.status)) {
            return res.status(403).json({ message: 'Offer letter is not published yet' });
        }

        const settings = await Setting.findOne({ type: 'general' });
        const companyProfile = settings?.companyProfile || {};

        res.json({
            candidate: {
                id: candidate._id,
                name: candidate.name,
                email: candidate.email,
                phone: candidate.phone,
                designation: candidate.designation,
                department: candidate.department,
                status: candidate.status,
                offerLetter: candidate.offerLetter
            },
            companyProfile: {
                name: companyProfile.name || 'NEXPRISM',
                logo: companyProfile.logo,
                address: companyProfile.address,
                phone: companyProfile.phone,
                email: companyProfile.email,
                currency: companyProfile.currency || 'INR'
            }
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// PUBLIC OFFER PDF DOWNLOAD
router.get('/public/:token/pdf', async (req, res) => {
    try {
        const candidate = await Candidate.findOne({ token: req.params.token });
        if (!candidate) return res.status(404).json({ message: 'Candidate not found' });

        const settings = await Setting.findOne({ type: 'general' });
        const companyProfile = settings?.companyProfile || {};

        const pdfBuffer = await generateOfferLetterPDF(candidate, companyProfile);

        const safeFilename = `Offer_Letter_${(candidate.name || 'Candidate').replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"`);
        res.setHeader('Content-Length', pdfBuffer.length);
        res.send(pdfBuffer);
    } catch (err) {
        console.error('[PUBLIC PDF ERROR]', err);
        res.status(500).json({ message: 'Failed to generate PDF: ' + err.message });
    }
});

// PUBLIC CANDIDATE ACTION (Accept / Decline)
router.post('/public/:token/offer-action', async (req, res) => {
    try {
        const { action } = req.body; // 'accept' | 'decline'
        const candidate = await Candidate.findOne({ token: req.params.token });
        if (!candidate) return res.status(404).json({ message: 'Offer not found' });

        if (action === 'accept') {
            candidate.status = 'accepted';
            candidate.history.push({
                action: 'Offer Accepted by Candidate',
                performerName: candidate.name,
                notes: 'Candidate accepted the offer letter via the candidate portal.'
            });
        } else {
            candidate.status = 'declined';
            candidate.history.push({
                action: 'Offer Declined by Candidate',
                performerName: candidate.name,
                notes: req.body.reason ? `Reason: ${req.body.reason}` : 'Candidate declined the offer letter.'
            });
        }

        await candidate.save();
        res.json({ success: true, message: `Offer ${action === 'accept' ? 'accepted' : 'declined'} successfully`, status: candidate.status });
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

module.exports = router;
