const Quotation = require('../models/Quotation');
const QuotationTemplate = require('../models/QuotationTemplate');
const Client = require('../models/Client');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');

// Project type presets
const PROJECT_TYPE_MODULES = {
    'Multivendor Ecommerce': [
        { name: 'Admin Panel', description: 'Complete administrative control center', cost: 15000, included: true },
        { name: 'Seller Panel', description: 'Vendor management and dashboard', cost: 10000, included: true },
        { name: 'User Panel/App', description: 'Customer facing interface', cost: 10000, included: true },
        { name: 'Commission System', description: 'Automated referral and sale commission', cost: 5000, included: true },
        { name: 'Order Management', description: 'Tracking, logistics, and invoicing', cost: 5000, included: true },
        { name: 'Payment Gateway', description: 'Secure online payment integration', cost: 3000, included: true }
    ],
    'Corporate Website': [
        { name: 'UI/UX Design', description: 'Custom responsive design', cost: 5000, included: true },
        { name: 'CMS Integration', description: 'Content management system', cost: 5000, included: true },
        { name: 'SEO Optimization', description: 'On-page SEO setup', cost: 2000, included: true },
        { name: 'Contact Forms', description: 'Lead capture system', cost: 1000, included: true }
    ]
};

const DEFAULT_DELIVERABLES = [
    { name: 'Source Code', included: true },
    { name: 'Admin Access', included: true },
    { name: 'Deployment', included: true },
    { name: 'Training Document', included: true },
    { name: '3 Month Technical Support (Bug Fix Only)', included: true }
];

// Get all quotations
exports.getAllQuotations = async (req, res) => {
    try {
        // Run a quick check for expired quotations
        await Quotation.updateMany(
            { status: 'sent', expiryDate: { $lt: new Date() } },
            { status: 'expired' }
        );

        let filter = {};
        if (req.user.role !== 'admin' && req.user.role !== 'owner') {
            filter = {
                $or: [
                    { createdBy: req.user._id },
                    // Potentially allow users to see quotations for clients they are assigned to
                ]
            };

            // Find clients assigned to this user
            const myClients = await Client.find({ assignedTo: req.user._id.toString() }).select('_id');
            const myClientIds = myClients.map(c => c._id);
            if (myClientIds.length > 0) {
                filter.$or.push({ clientId: { $in: myClientIds } });
            }
        }

        const quotations = await Quotation.find(filter)
            .populate('clientId', 'name email phone')
            .sort({ createdAt: -1 });
        res.json(quotations);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching quotations', error: error.message });
    }
};

// Get single quotation
exports.getQuotation = async (req, res) => {
    try {
        const quotation = await Quotation.findById(req.params.id)
            .populate('clientId')
            .populate('createdBy', 'name email')
            .populate('parentQuotation', 'quotationNumber version');

        if (!quotation) return res.status(404).json({ message: 'Quotation not found' });

        // RBAC Check
        if (req.user.role !== 'admin' && req.user.role !== 'owner') {
            const isCreator = quotation.createdBy && quotation.createdBy._id.toString() === req.user._id.toString();

            const client = await Client.findById(quotation.clientId);
            const isClientOwner = client && client.assignedTo === req.user._id.toString();

            if (!isCreator && !isClientOwner) {
                return res.status(403).json({ message: 'Not authorized to view this quotation' });
            }
        }

        res.json(quotation);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching quotation', error: error.message });
    }
};

// Create quotation
exports.createQuotation = async (req, res) => {
    try {
        const data = { ...req.body };
        if (data.expiryDate === "") delete data.expiryDate;
        if (data.parentQuotation === "") delete data.parentQuotation;

        // Auto-load modules if projectType is specified and no modules provided
        if (data.projectType && (!data.modules || data.modules.length === 0)) {
            data.modules = PROJECT_TYPE_MODULES[data.projectType] || [];
        }

        // Load default deliverables
        if (!data.deliverables || data.deliverables.length === 0) {
            data.deliverables = DEFAULT_DELIVERABLES;
        }

        const quotation = new Quotation({
            ...data,
            createdBy: req.user._id
        });

        await quotation.save();
        res.status(201).json(quotation);
    } catch (error) {
        res.status(500).json({ message: 'Error creating quotation', error: error.message });
    }
};

// Update & Version control
exports.updateQuotation = async (req, res) => {
    try {
        const existing = await Quotation.findById(req.params.id);
        if (!existing) return res.status(404).json({ message: 'Quotation not found' });

        if (existing.scopeLocked) {
            return res.status(403).json({ message: 'Scope is locked. Please use Change Requests for modifications.' });
        }

        const data = { ...req.body };
        if (data.expiryDate === "") delete data.expiryDate;
        if (data.parentQuotation === "") delete data.parentQuotation;

        // If status is 'sent', 'revision', create a new version instead of simple update
        if (['sent', 'revision'].includes(existing.status)) {
            const newVersion = new Quotation({
                ...existing.toObject(),
                ...data,
                _id: undefined,
                version: (existing.version || 1) + 1,
                parentQuotation: existing._id,
                status: 'draft',
                createdAt: undefined,
                updatedAt: undefined
            });
            await newVersion.save();
            return res.status(201).json(newVersion);
        }

        const updated = await Quotation.findByIdAndUpdate(req.params.id, data, { new: true });
        res.json(updated);
    } catch (error) {
        res.status(500).json({ message: 'Error updating quotation', error: error.message });
    }
};

// Approve & Lock Scope
exports.approveQuotation = async (req, res) => {
    try {
        const quotation = await Quotation.findById(req.params.id);
        if (!quotation) return res.status(404).json({ message: 'Quotation not found' });

        quotation.status = 'approved';
        quotation.scopeLocked = true;
        quotation.approvedAt = new Date();
        await quotation.save();

        res.json({ message: 'Quotation approved and scope locked!', quotation });
    } catch (error) {
        res.status(500).json({ message: 'Approval failed', error: error.message });
    }
};

// Add Change Request
exports.addChangeRequest = async (req, res) => {
    try {
        const quotation = await Quotation.findById(req.params.id);
        if (!quotation) return res.status(404).json({ message: 'Quotation not found' });

        quotation.changeRequests.push({
            ...req.body,
            status: 'pending'
        });

        await quotation.save();
        res.status(201).json(quotation);
    } catch (error) {
        res.status(500).json({ message: 'Failed to add change request', error: error.message });
    }
};

// PDF Generation
exports.generatePDF = async (req, res) => {
    try {
        const quotation = await Quotation.findById(req.params.id).populate('clientId');
        if (!quotation) return res.status(404).json({ message: 'Quotation not found' });

        const branding = quotation.branding || {
            headerText: 'NEXPRISM IT SOLUTIONS',
            footerText: 'This is a computer-generated document. Digital signatures are legally binding as per the IT Act.',
            showCoverPage: true,
            coverPageTitle: 'Project Proposal',
            coverPageSubtitle: 'Custom Solutions for Your Business'
        };

        const doc = new PDFDocument({ size: 'A4', margins: { top: 50, bottom: 50, left: 50, right: 50 } });
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=Proposal_${quotation.quotationNumber}.pdf`);
        doc.pipe(res);

        // --- THEME ---
        const PRIMARY_COLOR = '#2563EB'; // Blue
        const SECONDARY_COLOR = '#1E293B'; // Dark Slate
        const LIGHT_BG = '#F8FAFC';

        // --- COVER PAGE ---
        if (branding.showCoverPage) {
            doc.rect(0, 0, 600, 850).fill(SECONDARY_COLOR);

            // Abstract Decor
            doc.fillColor(PRIMARY_COLOR).opacity(0.1);
            doc.circle(600, 0, 300).fill();
            doc.opacity(1);

            doc.fillColor('#FFFFFF').fontSize(40).font('Helvetica-Bold').text(branding.coverPageTitle || 'Project Proposal', 50, 300);
            doc.fontSize(15).font('Helvetica').fillColor(PRIMARY_COLOR).text(branding.coverPageSubtitle || 'Custom Solutions', 50, 350);

            doc.moveDown(10);
            doc.fillColor('#FFFFFF').fontSize(12).font('Helvetica-Bold').text('PREPARED FOR:');
            doc.fontSize(20).text(quotation.clientName.toUpperCase());
            doc.fontSize(10).font('Helvetica').fillColor('#94A3B8').text(quotation.projectTitle);

            doc.moveDown(4);
            doc.fillColor('#FFFFFF').fontSize(10).text(`REF: ${quotation.quotationNumber}  |  DATE: ${new Date().toLocaleDateString()}`);

            doc.addPage();
        }

        // --- HEADER ---
        doc.rect(0, 0, 600, 100).fill('#FFFFFF');
        doc.fillColor(PRIMARY_COLOR).fontSize(10).font('Helvetica-Bold').text(branding.headerText?.toUpperCase() || 'PROJECT PROPOSAL', 50, 40);
        doc.fontSize(8).font('Helvetica').fillColor('#64748B').text(`REF: ${quotation.quotationNumber} | v${quotation.version}`, 50, 55);

        doc.moveTo(50, 75).lineTo(550, 75).strokeColor('#F1F5F9').lineWidth(1).stroke();

        // Watermark for draft
        if (quotation.status === 'draft') {
            doc.save().fillColor('#E2E8F0').fontSize(100).opacity(0.1).rotate(-45, { origin: [300, 400] }).text('DRAFT', 100, 400).restore();
        }

        // --- CLIENT INFO ---
        doc.moveDown(4);
        doc.fillColor(PRIMARY_COLOR).fontSize(10).font('Helvetica-Bold').text('PROPOSAL PREPARED FOR:', 50);
        doc.moveDown(0.5);
        doc.fillColor(SECONDARY_COLOR).fontSize(14).font('Helvetica-Bold').text(quotation.clientName);
        doc.fontSize(10).font('Helvetica').fillColor('#475569').text(quotation.projectTitle);

        // --- SECTIONS ---
        doc.moveDown(2);
        doc.fillColor(PRIMARY_COLOR).fontSize(10).font('Helvetica-Bold').text('PROJECT OBJECTIVE', 50);
        doc.moveDown(0.5);
        doc.fillColor('#475569').fontSize(10).font('Helvetica').text(quotation.objective || 'N/A', { width: 500, align: 'justify' });

        if (quotation.sections && quotation.sections.length > 2) {
            quotation.sections.slice(2).forEach(s => {
                doc.moveDown(1.5);
                doc.fillColor(PRIMARY_COLOR).fontSize(10).font('Helvetica-Bold').text(s.title.toUpperCase());
                doc.moveDown(0.5);
                doc.fillColor('#475569').fontSize(10).font('Helvetica').text(s.content, { width: 500 });
            });
        }

        // --- MODULES TABLE ---
        doc.moveDown(2);
        doc.fillColor(PRIMARY_COLOR).fontSize(12).font('Helvetica-Bold').text('TECHNICAL SCOPE & COSTING', 50);
        doc.moveDown(0.5);

        let currentY = doc.y;
        doc.rect(50, currentY, 500, 20).fill(PRIMARY_COLOR);
        doc.fillColor('#FFFFFF').fontSize(9).font('Helvetica-Bold');
        doc.text('MODULE NAME', 60, currentY + 6);
        doc.text('ESTIMATED COST (INR)', 400, currentY + 6);

        currentY += 25;
        quotation.modules.forEach(m => {
            if (m.included) {
                if (currentY > 720) { doc.addPage(); currentY = 50; }
                doc.fillColor(SECONDARY_COLOR).fontSize(9).font('Helvetica-Bold').text(m.name, 60, currentY);
                doc.fillColor('#64748B').fontSize(8).font('Helvetica').text(m.description || '', 60, currentY + 11, { width: 300 });
                doc.fillColor(SECONDARY_COLOR).fontSize(9).font('Helvetica-Bold').text(`₹${m.cost.toLocaleString()}`, 400, currentY, { align: 'right', width: 140 });
                currentY += 35;
                doc.moveTo(50, currentY - 5).lineTo(550, currentY - 5).strokeColor('#F1F5F9').stroke();
            }
        });

        // --- SUMMARY ---
        if (currentY > 650) { doc.addPage(); currentY = 50; }
        currentY += 10;
        doc.rect(300, currentY, 250, 80).fill(LIGHT_BG);
        doc.fillColor(SECONDARY_COLOR).fontSize(9).font('Helvetica').text('Subtotal:', 315, currentY + 12);
        doc.text(`₹${quotation.totalAmount.toLocaleString()}`, 480, currentY + 12, { align: 'right', width: 60 });
        doc.text(`GST (${quotation.gstPercentage}%):`, 315, currentY + 30);
        doc.text(`₹${quotation.gstAmount.toLocaleString()}`, 480, currentY + 30, { align: 'right', width: 60 });
        doc.font('Helvetica-Bold').fillColor(PRIMARY_COLOR).fontSize(11).text('Grand Total:', 315, currentY + 55);
        doc.text(`₹${quotation.grandTotal.toLocaleString()}`, 450, currentY + 55, { align: 'right', width: 90 });
        currentY += 100;

        // --- MILESTONES & DELIVERABLES ---
        if (currentY > 550) { doc.addPage(); currentY = 50; } else { doc.moveDown(2); currentY = doc.y; }
        doc.fillColor(PRIMARY_COLOR).fontSize(11).font('Helvetica-Bold').text('PAYMENT MILESTONES & DELIVERABLES', 50, currentY);
        doc.moveDown(0.5);

        quotation.milestones.forEach((m, i) => {
            doc.fillColor(SECONDARY_COLOR).fontSize(9).font('Helvetica-Bold').text(`${i + 1}. ${m.name} (${m.percentage}%)`, 50);
            doc.fillColor(SECONDARY_COLOR).font('Helvetica-Bold').text(`₹${m.amount.toLocaleString()}`, 450, doc.y - 11, { align: 'right', width: 100 });
            doc.moveDown(0.2);
        });

        doc.moveDown(1);
        doc.fillColor(PRIMARY_COLOR).fontSize(10).font('Helvetica-Bold').text('TECHNICAL DELIVERABLES', 50);
        doc.moveDown(0.3);
        doc.fillColor('#475569').fontSize(9).font('Helvetica');
        const deliverablesList = quotation.deliverables.filter(d => d.included).map(d => d.name).join('  |  ');
        doc.text(deliverablesList, 70, doc.y, { width: 480 });

        // --- FOOTER ---
        const footerY = 750;
        doc.moveTo(50, footerY).lineTo(550, footerY).strokeColor('#E2E8F0').stroke();
        doc.fillColor('#94A3B8').fontSize(7).text(branding.footerText || 'Computer-generated. legally binding under IT Act.', 50, footerY + 8, { align: 'center', width: 500 });

        doc.end();
    } catch (error) {
        res.status(500).json({ message: 'PDF creation failed', error: error.message });
    }
};

// Template Management
exports.createTemplate = async (req, res) => {
    try {
        const template = new QuotationTemplate({ ...req.body, createdBy: req.user._id });
        await template.save();
        res.status(201).json(template);
    } catch (error) {
        res.status(400).json({ message: 'Template creation failed', error: error.message });
    }
};

exports.getTemplates = async (req, res) => {
    try {
        const templates = await QuotationTemplate.find({ isActive: true });
        res.json(templates);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching templates' });
    }
};

exports.updateTemplate = async (req, res) => {
    try {
        const template = await QuotationTemplate.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(template);
    } catch (error) {
        res.status(400).json({ message: 'Template update failed' });
    }
};

exports.deleteTemplate = async (req, res) => {
    try {
        await QuotationTemplate.findByIdAndDelete(req.params.id);
        res.json({ message: 'Template deleted' });
    } catch (error) {
        res.status(400).json({ message: 'Template deletion failed' });
    }
};

// Public View & Approval
exports.getQuotationPublic = async (req, res) => {
    try {
        const quotation = await Quotation.findById(req.params.id).populate('clientId', 'name email');
        if (!quotation) return res.status(404).json({ message: 'Quotation not found' });
        res.json(quotation);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching quotation' });
    }
};

exports.publicApprove = async (req, res) => {
    try {
        const quotation = await Quotation.findById(req.params.id);
        if (!quotation) return res.status(404).json({ message: 'Quotation not found' });

        quotation.status = 'approved';
        quotation.scopeLocked = true;
        quotation.approvedAt = new Date();
        // Here you could store the signature string if provided in req.body
        await quotation.save();

        res.json({ message: 'Proposal accepted successfully!' });
    } catch (error) {
        res.status(400).json({ message: 'Approval failed' });
    }
};

module.exports = exports;
