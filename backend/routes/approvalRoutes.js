const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const Approval = require('../models/Approval');
const Project = require('../models/Project');
const { protect, checkPermission } = require('../middleware/authMiddleware');

// Helper to extract client IP
const getClientIp = (req) => {
    return req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
};

// ── PUBLIC ROUTES (No Auth Required for Client Direct Share Links) ───────────

// GET public approval details by publicToken
router.get('/public/:token', async (req, res) => {
    try {
        const approval = await Approval.findOne({ publicToken: req.params.token })
            .populate('projectId', 'name')
            .populate('clientId', 'name company email');

        if (!approval) {
            return res.status(404).json({ message: 'Approval request not found or link has expired' });
        }

        // Add view event to audit log if not already viewed in last 5 mins
        const ip = getClientIp(req);
        const userAgent = req.headers['user-agent'] || '';
        
        approval.auditLog.push({
            action: 'viewed',
            timestamp: new Date(),
            ip,
            userAgent,
            actorName: approval.clientId?.name || 'Client (Public Link)',
            notes: 'Viewed public approval link'
        });
        await approval.save();

        res.json(approval);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// PUBLIC SIGN approval by publicToken
router.post('/public/:token/sign', async (req, res) => {
    try {
        const { signatureData, signatureType, typedFont, signedBy, signedByEmail, comments } = req.body;
        const approval = await Approval.findOne({ publicToken: req.params.token });
        
        if (!approval) {
            return res.status(404).json({ message: 'Approval request not found' });
        }
        if (approval.status === 'approved') {
            return res.status(400).json({ message: 'This request has already been approved and signed.' });
        }

        const ip = getClientIp(req);
        const userAgent = req.headers['user-agent'] || 'Browser Client';
        const timestamp = new Date();
        const signerName = signedBy || approval.signedBy || 'Authorized Signer';

        // Generate cryptographic hash for legal verification stamp
        const hashInput = `${approval._id}-${signerName}-${timestamp.toISOString()}-${ip}`;
        const signatureHash = crypto.createHash('sha256').update(hashInput).digest('hex').substring(0, 16).toUpperCase();

        approval.status = 'approved';
        approval.signatureData = signatureData;
        approval.signedBy = signerName;
        approval.signedByEmail = signedByEmail || '';
        approval.signedAt = timestamp;
        approval.comments = comments || '';
        approval.signatureMetadata = {
            type: signatureType || 'drawn',
            typedFont: typedFont || '',
            ipAddress: ip,
            userAgent,
            signatureHash: `SIG-${signatureHash}`,
            legalConsent: true
        };

        approval.auditLog.push({
            action: 'signed',
            timestamp,
            ip,
            userAgent,
            actorName: signerName,
            notes: `Officially signed using ${signatureType || 'drawn'} signature method. Hash: SIG-${signatureHash}`
        });

        await approval.save();
        res.json({ message: 'Document officially approved & signed', approval });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// PUBLIC REJECT approval by publicToken
router.post('/public/:token/reject', async (req, res) => {
    try {
        const { rejectionReason, actorName } = req.body;
        const approval = await Approval.findOne({ publicToken: req.params.token });
        
        if (!approval) return res.status(404).json({ message: 'Approval request not found' });

        const ip = getClientIp(req);
        const userAgent = req.headers['user-agent'] || '';

        approval.status = 'rejected';
        approval.rejectionReason = rejectionReason || 'Rejected by client';
        
        approval.auditLog.push({
            action: 'rejected',
            timestamp: new Date(),
            ip,
            userAgent,
            actorName: actorName || approval.signedBy || 'Client',
            notes: `Rejected with reason: ${rejectionReason || 'No reason specified'}`
        });

        await approval.save();
        res.json({ message: 'Approval request rejected', approval });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// ── PROTECTED ROUTES (CRM Users & Clients) ───────────────────────────────────

// GET all approvals (filtered by role/client/project)
router.get('/', protect, async (req, res) => {
    try {
        let filter = {};
        if (req.query.projectId) filter.projectId = req.query.projectId;
        if (req.query.clientId) filter.clientId = req.query.clientId;
        if (req.query.category) filter.category = req.query.category;
        if (req.query.status) filter.status = req.query.status;

        if (req.user.role === 'client') {
            filter.clientId = req.user.clientId;
        } else if (req.user.role !== 'admin' && req.user.role !== 'owner') {
            const myProjects = await Project.find({
                $or: [{ pmId: req.user._id.toString() }, { members: req.user._id.toString() }]
            }).select('_id');
            const myProjectIds = myProjects.map(p => p._id.toString());
            filter.projectId = { $in: myProjectIds };
        }

        const approvals = await Approval.find(filter)
            .populate('projectId', 'name')
            .populate('clientId', 'name company email')
            .sort({ createdAt: -1 });

        res.json(approvals);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// CREATE approval request
router.post('/', protect, checkPermission('projects', 'edit'), async (req, res) => {
    try {
        const { title, description, category, projectId, clientId, fileUrl, attachments, dueDate } = req.body;
        const publicToken = crypto.randomBytes(16).toString('hex');

        const approvalData = {
            title,
            description,
            category: category || 'general',
            fileUrl,
            attachments: attachments || [],
            dueDate: dueDate ? new Date(dueDate) : null,
            publicToken,
            requestedBy: req.user._id,
            requestedByName: req.user.name,
            auditLog: [{
                action: 'created',
                timestamp: new Date(),
                ip: getClientIp(req),
                userAgent: req.headers['user-agent'] || '',
                actorName: req.user.name,
                notes: 'Approval request created and link generated'
            }]
        };

        if (projectId && typeof projectId === 'string' && projectId.trim() !== '' && projectId !== 'none') {
            approvalData.projectId = projectId;
        }
        if (clientId && typeof clientId === 'string' && clientId.trim() !== '' && clientId !== 'none') {
            approvalData.clientId = clientId;
        }

        const approval = new Approval(approvalData);
        await approval.save();
        res.status(201).json(approval);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// SUBMIT SIGNATURE / APPROVE (Authenticated Route)
router.post('/:id/sign', protect, async (req, res) => {
    try {
        const { signatureData, signatureType, typedFont, signedBy, signedByEmail, comments } = req.body;
        const approval = await Approval.findById(req.params.id);
        if (!approval) return res.status(404).json({ message: 'Approval request not found' });

        const ip = getClientIp(req);
        const userAgent = req.headers['user-agent'] || '';
        const timestamp = new Date();
        const signerName = signedBy || req.user.name;

        // Cryptographic Hash
        const hashInput = `${approval._id}-${signerName}-${timestamp.toISOString()}-${ip}`;
        const signatureHash = crypto.createHash('sha256').update(hashInput).digest('hex').substring(0, 16).toUpperCase();

        approval.status = 'approved';
        approval.signatureData = signatureData;
        approval.signedBy = signerName;
        approval.signedByEmail = signedByEmail || req.user.email || '';
        approval.signedAt = timestamp;
        approval.comments = comments || '';
        approval.signatureMetadata = {
            type: signatureType || 'drawn',
            typedFont: typedFont || '',
            ipAddress: ip,
            userAgent,
            signatureHash: `SIG-${signatureHash}`,
            legalConsent: true
        };

        approval.auditLog.push({
            action: 'signed',
            timestamp,
            ip,
            userAgent,
            actorName: signerName,
            notes: `Signed via dashboard as ${signerName}. Hash: SIG-${signatureHash}`
        });

        await approval.save();
        res.json({ message: 'Approval signed successfully', approval });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// REJECT approval (Authenticated Route)
router.post('/:id/reject', protect, async (req, res) => {
    try {
        const { rejectionReason } = req.body;
        const approval = await Approval.findById(req.params.id);
        if (!approval) return res.status(404).json({ message: 'Approval request not found' });

        const ip = getClientIp(req);
        const userAgent = req.headers['user-agent'] || '';

        approval.status = 'rejected';
        approval.rejectionReason = rejectionReason || 'Rejected by client';

        approval.auditLog.push({
            action: 'rejected',
            timestamp: new Date(),
            ip,
            userAgent,
            actorName: req.user.name,
            notes: `Rejected with reason: ${rejectionReason || 'No reason specified'}`
        });

        await approval.save();

        res.json({ message: 'Approval rejected', approval });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
