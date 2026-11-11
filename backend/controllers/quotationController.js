const Quotation = require('../models/Quotation');
const QuotationTemplate = require('../models/QuotationTemplate');
const Client = require('../models/Client');
const mongoose = require('mongoose');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');

async function assertQuotationAccess(user, quotation) {
    if (!user || !quotation) return { ok: false, status: 401, message: 'Not authorized' };
    if (user.role === 'admin' || user.role === 'owner') return { ok: true };

    const qClientId = quotation.clientId?._id ? quotation.clientId._id.toString() : String(quotation.clientId || '');
    if (user.role === 'client') {
        if (!user.clientId || qClientId !== String(user.clientId)) {
            return { ok: false, status: 403, message: 'Not authorized to access this quotation' };
        }
        return { ok: true };
    }

    const creatorId = quotation.createdBy?._id ? quotation.createdBy._id.toString() : String(quotation.createdBy || '');
    if (creatorId === user._id.toString()) return { ok: true };

    if (qClientId) {
        const client = await Client.findById(qClientId).select('assignedTo');
        if (client && client.assignedTo === user._id.toString()) return { ok: true };
    }
    return { ok: false, status: 403, message: 'Not authorized to access this quotation' };
}

async function resolvePublicQuotation(idOrToken, queryToken) {
    if (!idOrToken) return null;
    const byToken = await Quotation.findOne({ publicToken: idOrToken }).populate('clientId', 'name company');
    if (byToken) return byToken;

    if (!mongoose.Types.ObjectId.isValid(idOrToken)) return null;
    const byId = await Quotation.findById(idOrToken).populate('clientId', 'name company');
    if (!byId) return null;

    // Require token once publicToken has been minted on the quotation
    if (byId.publicToken && queryToken !== byId.publicToken) {
        return null;
    }
    return byId;
}

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
        if (req.user.role === 'client') {
            filter = { clientId: req.user.clientId };
        } else if (req.user.role !== 'admin' && req.user.role !== 'owner') {
            filter = {
                $or: [
                    { createdBy: req.user._id },
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
        const access = await assertQuotationAccess(req.user, quotation);
        if (!access.ok) {
            return res.status(access.status).json({ message: access.message });
        }

        res.json(quotation);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching quotation', error: error.message });
    }
};

// Create quotation
exports.createQuotation = async (req, res) => {
    try {
        if (req.user.role === 'client') {
            return res.status(403).json({ message: 'Clients cannot create quotations' });
        }
        const data = { ...req.body };
        delete data.scopeLocked;
        delete data.approvedAt;
        delete data.linkedProjectId;
        delete data.publicToken;
        delete data.createdBy;
        if (data.expiryDate === "") delete data.expiryDate;
        if (data.parentQuotation === "") delete data.parentQuotation;

        if (data.clientId) {
            const client = await Client.findById(data.clientId);
            if (client) {
                data.clientName = client.company || client.name;
                data.clientEmail = client.email;
                data.clientPhone = client.phone;
                data.clientAddress = client.address;
            }
        }

        // If no project title provided, generate a default one
        if (!data.projectTitle) {
            data.projectTitle = `Quotation for ${data.clientName || 'Prospect'}`;
        }

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
        if (req.user.role === 'client') {
            return res.status(403).json({ message: 'Clients cannot modify quotations' });
        }
        const existing = await Quotation.findById(req.params.id);
        if (!existing) return res.status(404).json({ message: 'Quotation not found' });

        const access = await assertQuotationAccess(req.user, existing);
        if (!access.ok) return res.status(access.status).json({ message: access.message });

        if (existing.scopeLocked) {
            return res.status(403).json({ message: 'Scope is locked. Please use Change Requests for modifications.' });
        }

        const allowed = [
            'clientId', 'projectTitle', 'projectType', 'objective', 'projectScope',
            'sections', 'timeline', 'warrantyPeriod', 'modules', 'deliverables',
            'gstPercentage', 'discount', 'milestones', 'expiryDate', 'companyDetails',
            'branding', 'attachmentUrl', 'status', 'parentQuotation'
        ];
        const data = {};
        allowed.forEach(k => { if (req.body[k] !== undefined) data[k] = req.body[k]; });
        if (data.status === 'approved') delete data.status; // Require explicit approval workflow
        if (data.expiryDate === "") delete data.expiryDate;
        if (data.parentQuotation === "") delete data.parentQuotation;

        if (data.clientId && data.clientId !== existing.clientId?.toString()) {
            const client = await Client.findById(data.clientId);
            if (client) {
                data.clientName = client.company || client.name;
                data.clientEmail = client.email;
                data.clientPhone = client.phone;
                data.clientAddress = client.address;
            }
        } else if (!data.clientName && existing.clientId) {
            const client = await Client.findById(existing.clientId);
            if (client) {
                data.clientName = client.company || client.name;
                data.clientEmail = client.email;
                data.clientPhone = client.phone;
                data.clientAddress = client.address;
            }
        }
        
        if (!data.projectTitle) {
            data.projectTitle = existing.projectTitle || `Quotation for ${data.clientName || existing.clientName || 'Prospect'}`;
        }

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

        const access = await assertQuotationAccess(req.user, quotation);
        if (!access.ok) return res.status(access.status).json({ message: access.message });

        quotation.status = 'approved';
        quotation.scopeLocked = true;
        quotation.approvedAt = new Date();
        await quotation.save();

        res.json({ message: 'Quotation approved and scope locked!', quotation });
    } catch (error) {
        res.status(500).json({ message: 'Approval failed', error: error.message });
    }
};

// Convert to Project
exports.convertToProject = async (req, res) => {
    try {
        if (req.user.role === 'client') {
            return res.status(403).json({ message: 'Clients cannot convert quotations to projects' });
        }
        const quotation = await Quotation.findById(req.params.id);
        if (!quotation) return res.status(404).json({ message: 'Quotation not found' });

        const access = await assertQuotationAccess(req.user, quotation);
        if (!access.ok) return res.status(access.status).json({ message: access.message });
        
        if (quotation.status !== 'approved') {
            return res.status(400).json({ message: 'Only approved quotations can be converted to projects.' });
        }

        if (quotation.linkedProjectId) {
            return res.status(400).json({ message: 'This quotation is already linked to a project.' });
        }

        const Project = require('../models/Project');
        
        // Map quotation data to new project
        const project = new Project({
            name: quotation.projectTitle || 'Project from Quotation',
            description: quotation.objective || '',
            status: 'planning',
            clientId: quotation.clientId,
            budget: quotation.grandTotal,
            startDate: new Date(),
            dueDate: new Date(new Date().setMonth(new Date().getMonth() + 1)), // Default 1 month
            milestones: quotation.milestones.map(m => ({
                name: m.name,
                dueDate: m.dueDate,
                amount: m.amount,
                completed: false
            }))
        });

        await project.save();

        quotation.linkedProjectId = project._id;
        await quotation.save();

        res.status(201).json({ message: 'Successfully converted to project', project });
    } catch (error) {
        res.status(500).json({ message: 'Conversion failed', error: error.message });
    }
};

// Add Change Request
exports.addChangeRequest = async (req, res) => {
    try {
        const quotation = await Quotation.findById(req.params.id);
        if (!quotation) return res.status(404).json({ message: 'Quotation not found' });

        const access = await assertQuotationAccess(req.user, quotation);
        if (!access.ok) return res.status(access.status).json({ message: access.message });

        quotation.changeRequests.push({
            title: req.body.title,
            description: req.body.description,
            estimatedCost: Number(req.body.estimatedCost) || 0,
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

        const access = await assertQuotationAccess(req.user, quotation);
        if (!access.ok) return res.status(access.status).json({ message: access.message });

        const Setting = require('../models/Setting');
        const settings = await Setting.findOne({ type: 'general' });
        const currency = settings?.companyProfile?.currency || 'INR';

        const branding = quotation.branding || {
            headerText: 'NEXPRISM IT SOLUTIONS',
            footerText: 'This is a computer-generated document. Digital signatures are legally binding as per the IT Act.',
            showCoverPage: true,
            coverPageTitle: 'Project Proposal',
            coverPageSubtitle: 'Custom Solutions for Your Business'
        };

        const doc = new PDFDocument({ size: 'A4', margins: { top: 50, bottom: 50, left: 50, right: 50 } });
        const pdfChunks = [];
        const pdfBufferPromise = new Promise((resolve, reject) => {
            doc.on('data', chunk => pdfChunks.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(pdfChunks)));
            doc.on('error', reject);
        });

        // --- THEME ---
        const PRIMARY_COLOR = '#2563EB'; // Blue
        const SECONDARY_COLOR = '#1E293B'; // Dark Slate
        const LIGHT_BG = '#F8FAFC';

        const clientNameOg = quotation.clientName || quotation.clientId?.company || quotation.clientId?.name || 'Client';
        const clientTitle = String(clientNameOg || 'CLIENT').toUpperCase();

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
            doc.fontSize(20).text(clientTitle);
            doc.fontSize(10).font('Helvetica').fillColor('#94A3B8').text(quotation.projectTitle || '');

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
        doc.fillColor(SECONDARY_COLOR).fontSize(14).font('Helvetica-Bold').text(clientNameOg);
        doc.fontSize(10).font('Helvetica').fillColor('#475569').text(quotation.projectTitle || '');

        // --- SECTIONS ---
        doc.moveDown(2);
        doc.fillColor(PRIMARY_COLOR).fontSize(10).font('Helvetica-Bold').text('PROJECT OBJECTIVE', 50);
        doc.moveDown(0.5);
        doc.fillColor('#475569').fontSize(10).font('Helvetica').text(quotation.objective || 'N/A', { width: 500, align: 'justify' });

        if (quotation.projectScope) {
            doc.moveDown(1.5);
            doc.fillColor(PRIMARY_COLOR).fontSize(10).font('Helvetica-Bold').text('PROJECT SCOPE');
            doc.moveDown(0.5);
            doc.fillColor('#475569').fontSize(10).font('Helvetica').text(quotation.projectScope, { width: 500, align: 'justify' });
        }

        if (Array.isArray(quotation.sections) && quotation.sections.length > 0) {
            quotation.sections.forEach(s => {
                doc.moveDown(1.5);
                doc.fillColor(PRIMARY_COLOR).fontSize(10).font('Helvetica-Bold').text((s.title || 'SECTION').toUpperCase());
                doc.moveDown(0.5);
                doc.fillColor('#475569').fontSize(10).font('Helvetica').text(s.content || '', { width: 500 });
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
        doc.text(`ESTIMATED COST (${currency})`, 400, currentY + 6);

        currentY += 25;
        (quotation.modules || []).forEach(m => {
            if (m.included) {
                if (currentY > 720) { doc.addPage(); currentY = 50; }
                doc.fillColor(SECONDARY_COLOR).fontSize(9).font('Helvetica-Bold').text(m.name || 'Module', 60, currentY);
                doc.fillColor('#64748B').fontSize(8).font('Helvetica').text(m.description || '', 60, currentY + 11, { width: 300 });
                doc.fillColor(SECONDARY_COLOR).fontSize(9).font('Helvetica-Bold').text(`${formatCurrencyBackend(m.cost, currency)}`, 400, currentY, { align: 'right', width: 140 });
                currentY += 35;
                doc.moveTo(50, currentY - 5).lineTo(550, currentY - 5).strokeColor('#F1F5F9').stroke();
            }
        });

        // --- SUMMARY ---
        if (currentY > 650) { doc.addPage(); currentY = 50; }
        currentY += 10;
        doc.rect(300, currentY, 250, 80).fill(LIGHT_BG);
        doc.fillColor(SECONDARY_COLOR).fontSize(9).font('Helvetica').text('Subtotal:', 315, currentY + 12);
        doc.text(`${formatCurrencyBackend(quotation.totalAmount, currency)}`, 440, currentY + 12, { align: 'right', width: 100 });
        doc.text(`GST (${quotation.gstPercentage || 0}%):`, 315, currentY + 30);
        doc.text(`${formatCurrencyBackend(quotation.gstAmount, currency)}`, 440, currentY + 30, { align: 'right', width: 100 });
        doc.font('Helvetica-Bold').fillColor(PRIMARY_COLOR).fontSize(11).text('Grand Total:', 315, currentY + 55);
        doc.text(`${formatCurrencyBackend(quotation.grandTotal, currency)}`, 440, currentY + 55, { align: 'right', width: 100 });
        currentY += 100;

        // --- MILESTONES & DELIVERABLES ---
        if (currentY > 550) { doc.addPage(); currentY = 50; } else { doc.moveDown(2); currentY = doc.y; }
        doc.fillColor(PRIMARY_COLOR).fontSize(11).font('Helvetica-Bold').text('PAYMENT MILESTONES & DELIVERABLES', 50, currentY);
        doc.moveDown(0.5);

        (quotation.milestones || []).forEach((m, i) => {
            doc.fillColor(SECONDARY_COLOR).fontSize(9).font('Helvetica-Bold').text(`${i + 1}. ${m.name || 'Milestone'} (${m.percentage || 0}%)`, 50);
            doc.fillColor(SECONDARY_COLOR).font('Helvetica-Bold').text(`${formatCurrencyBackend(m.amount, currency)}`, 440, doc.y - 11, { align: 'right', width: 110 });
            doc.moveDown(0.2);
        });

        doc.moveDown(1);
        doc.fillColor(PRIMARY_COLOR).fontSize(10).font('Helvetica-Bold').text('TECHNICAL DELIVERABLES', 50);
        doc.moveDown(0.5);
        doc.fillColor('#475569').fontSize(9).font('Helvetica');

        (quotation.deliverables || []).filter(d => d.included).forEach(d => {
            doc.text(`•  ${d.name || 'Deliverable'}`, 70, doc.y, { width: 480 });
            doc.moveDown(0.2);
        });

        // --- FOOTER ---
        const footerY = 750;
        doc.moveTo(50, footerY).lineTo(550, footerY).strokeColor('#E2E8F0').stroke();
        doc.fillColor('#94A3B8').fontSize(7).text(branding.footerText || 'Computer-generated. legally binding under IT Act.', 50, footerY + 8, { align: 'center', width: 500 });

        doc.end();
        const pdfBuffer = await pdfBufferPromise;

        const safeFileNum = String(quotation.quotationNumber || 'Quotation').replace(/[^a-zA-Z0-9._-]/g, '_');
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=Proposal_${safeFileNum}.pdf`);
        res.send(pdfBuffer);
    } catch (error) {
        if (!res.headersSent) {
            res.status(500).json({ message: 'PDF creation failed', error: error.message });
        }
    }
};

// Template Management
exports.createTemplate = async (req, res) => {
    try {
        if (req.user.role === 'client') return res.status(403).json({ message: 'Forbidden' });
        const template = new QuotationTemplate({ ...req.body, createdBy: req.user._id });
        await template.save();
        res.status(201).json(template);
    } catch (error) {
        res.status(400).json({ message: 'Template creation failed', error: error.message });
    }
};

exports.getTemplates = async (req, res) => {
    try {
        if (req.user.role === 'client') return res.status(403).json({ message: 'Forbidden' });
        const templates = await QuotationTemplate.find({ isActive: true });
        res.json(templates);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching templates' });
    }
};

exports.updateTemplate = async (req, res) => {
    try {
        if (req.user.role === 'client') return res.status(403).json({ message: 'Forbidden' });
        const allowed = ['name', 'projectType', 'objective', 'projectScope', 'sections', 'modules', 'deliverables', 'timeline', 'warrantyPeriod', 'gstPercentage', 'isActive'];
        const updateData = {};
        allowed.forEach(k => { if (req.body[k] !== undefined) updateData[k] = req.body[k]; });
        const template = await QuotationTemplate.findByIdAndUpdate(req.params.id, updateData, { new: true });
        res.json(template);
    } catch (error) {
        res.status(400).json({ message: 'Template update failed' });
    }
};

exports.deleteTemplate = async (req, res) => {
    try {
        if (req.user.role === 'client') return res.status(403).json({ message: 'Forbidden' });
        await QuotationTemplate.findByIdAndDelete(req.params.id);
        res.json({ message: 'Template deleted' });
    } catch (error) {
        res.status(400).json({ message: 'Template deletion failed' });
    }
};

exports.deleteQuotation = async (req, res) => {
    try {
        if (req.user.role === 'client') return res.status(403).json({ message: 'Forbidden' });
        const existing = await Quotation.findById(req.params.id);
        if (!existing) {
            return res.status(404).json({ message: 'Quotation not found' });
        }
        const access = await assertQuotationAccess(req.user, existing);
        if (!access.ok) return res.status(access.status).json({ message: access.message });

        await Quotation.findByIdAndDelete(req.params.id);
        res.json({ message: 'Quotation deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Quotation deletion failed', error: error.message });
    }
};

// Public View & Approval (token-verified when publicToken is set)
exports.getQuotationPublic = async (req, res) => {
    try {
        const quotation = await resolvePublicQuotation(req.params.id, req.query.token);
        if (!quotation) return res.status(404).json({ message: 'Quotation not found' });

        const Setting = require('../models/Setting');
        const settings = await Setting.findOne({ type: 'general' });
        const currency = settings?.companyProfile?.currency || 'INR';

        const data = quotation.toObject();
        // Minimize PII leaked on unauthenticated endpoint
        delete data.clientEmail;
        delete data.clientPhone;
        delete data.clientAddress;
        data.currency = currency;

        res.json(data);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching quotation', error: error.message });
    }
};

exports.publicApprove = async (req, res) => {
    try {
        const quotation = await resolvePublicQuotation(req.params.id, req.query.token || req.body?.token);
        if (!quotation) return res.status(404).json({ message: 'Quotation not found' });

        if (quotation.status === 'approved' || quotation.scopeLocked) {
            return res.status(400).json({ message: 'Proposal has already been approved.' });
        }
        if (['expired', 'rejected'].includes(quotation.status)) {
            return res.status(400).json({ message: `Cannot approve an ${quotation.status} proposal.` });
        }

        quotation.status = 'approved';
        quotation.scopeLocked = true;
        quotation.approvedAt = new Date();
        await quotation.save();

        res.json({ message: 'Proposal accepted successfully!' });
    } catch (error) {
        res.status(400).json({ message: 'Approval failed' });
    }
};

function formatCurrencyBackend(amount, currency = 'INR') {
    let locale = 'en-US';
    if (currency === 'INR') {
        locale = 'en-IN';
    } else if (currency === 'EUR') {
        locale = 'de-DE';
    } else if (currency === 'GBP') {
        locale = 'en-GB';
    } else if (currency === 'JPY') {
        locale = 'ja-JP';
    } else if (currency === 'CNY') {
        locale = 'zh-CN';
    } else if (currency === 'CAD') {
        locale = 'en-CA';
    } else if (currency === 'AUD') {
        locale = 'en-AU';
    } else if (currency === 'SGD') {
        locale = 'en-SG';
    } else if (currency === 'NZD') {
        locale = 'en-NZ';
    }

    return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: currency,
        maximumFractionDigits: 0,
    }).format(amount || 0);
}

module.exports = exports;
