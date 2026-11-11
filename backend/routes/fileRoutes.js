const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const File = require('../models/File');
const User = require('../models/User');
const { protect, authorize } = require('../middleware/authMiddleware');
const { assertProjectAccess } = require('../utils/assertAccess');
const { signFileAccess, verifyFileAccess } = require('../utils/securityHelpers');

const Project = require('../models/Project');

// GET all files
router.get('/', protect, async (req, res) => {
    try {
        let query = {};
        // If not admin/owner, filter by uploader OR project association
        if (req.user.role !== 'admin' && req.user.role !== 'owner') {
            const userId = req.user._id.toString();

            if (req.user.role === 'client') {
                // Clients see files linked to their clientId
                // OR files linked to their projects
                const myProjects = await Project.find({ clientId: req.user.clientId }).select('_id');
                const myProjectIds = myProjects.map(p => p._id.toString());

                query = {
                    $or: [
                        { clientId: req.user.clientId },
                        { projectId: { $in: myProjectIds } }
                    ]
                };
            } else {
                // Staff see files they uploaded OR files linked to projects they are involved in
                const myProjects = await Project.find({
                    $or: [{ pmId: userId }, { members: userId }]
                }).select('_id');
                const myProjectIds = myProjects.map(p => p._id.toString());

                query = {
                    $or: [
                        { uploadedBy: userId },
                        { projectId: { $in: myProjectIds } }
                    ]
                };
            }
        }

        const files = await File.find(query).sort({ uploadedAt: -1 });
        res.json(files);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

const upload = require('../utils/multerConfig');
const uploadPrivate = upload.uploadPrivate;

// DOWNLOAD a confidential uploaded file (requires signed capability token or authenticated admin/owner)
router.get('/secure/:filename', async (req, res) => {
    try {
        const safeName = path.basename(req.params.filename || '');
        if (!safeName || safeName !== req.params.filename) {
            return res.status(400).json({ message: 'Invalid filename' });
        }

        let authorized = false;
        if (req.query.access && verifyFileAccess(safeName, String(req.query.access))) {
            authorized = true;
        } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
            try {
                const token = req.headers.authorization.split(' ')[1];
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                const user = await User.findById(decoded.id).select('role');
                if (user && (user.role === 'admin' || user.role === 'owner')) {
                    authorized = true;
                }
            } catch (e) { /* invalid token */ }
        }

        if (!authorized) {
            return res.status(403).json({ message: 'Not authorized to access this file' });
        }

        const baseDir = path.resolve(upload.privateUploadDir);
        const targetPath = path.resolve(baseDir, safeName);
        if (!targetPath.startsWith(baseDir + path.sep) || !fs.existsSync(targetPath)) {
            return res.status(404).json({ message: 'File not found' });
        }

        res.setHeader('X-Content-Type-Options', 'nosniff');
        const ext = path.extname(safeName).toLowerCase();
        if (!['.pdf', '.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext)) {
            res.setHeader('Content-Disposition', `attachment; filename="${safeName}"`);
        }
        return res.sendFile(targetPath);
    } catch (err) {
        return res.status(500).json({ message: 'Error serving file' });
    }
});

// GET single file
router.get('/:id', protect, async (req, res) => {
    try {
        const file = await File.findById(req.params.id);
        if (!file) return res.status(404).json({ message: 'File not found' });

        // Authorization check
        if (req.user.role !== 'admin' && req.user.role !== 'owner') {
            if (req.user.role === 'client') {
                const project = file.projectId ? await Project.findById(file.projectId) : null;
                if (file.clientId !== req.user.clientId && (!project || project.clientId !== req.user.clientId)) {
                    return res.status(403).json({ message: 'Not authorized to view this file' });
                }
            } else {
                const userId = req.user._id.toString();
                const isUploader = file.uploadedBy === userId;
                let hasProjectAccess = false;
                if (file.projectId) {
                    const project = await Project.findById(file.projectId);
                    if (project && (project.pmId === userId || (project.members && project.members.includes(userId)))) {
                        hasProjectAccess = true;
                    }
                }

                if (!isUploader && !hasProjectAccess) {
                    return res.status(403).json({ message: 'Not authorized to view this file' });
                }
            }
        }

        res.json(file);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// UPLOAD a physical file (stored in private directory with HMAC capability access)
router.post('/upload', protect, uploadPrivate.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        const baseUrl = (process.env.BACKEND_URL || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '');
        const sig = signFileAccess(req.file.filename);
        const fileUrl = `${baseUrl}/api/files/secure/${encodeURIComponent(req.file.filename)}?access=${sig}`;

        res.status(200).json({
            name: req.file.originalname,
            url: fileUrl,
            type: req.file.mimetype.split('/')[1] || 'unknown',
            size: req.file.size
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// UPLAOD/CREATE a new file record (metadata)
router.post('/', protect, async (req, res) => {
    try {
        let clientId = req.body.clientId;

        if (req.body.projectId) {
            const project = await Project.findById(req.body.projectId);
            if (!project) return res.status(404).json({ message: 'Project not found' });
            const access = await assertProjectAccess(req, project);
            if (!access.ok) return res.status(access.status).json({ message: access.message });
            clientId = project.clientId;
        } else if (req.user.role === 'client') {
            clientId = req.user.clientId;
        } else if (req.user.role !== 'admin' && req.user.role !== 'owner') {
            clientId = undefined;
        }

        if (req.user.role === 'client') {
            clientId = req.user.clientId;
        }

        const file = new File({
            name: req.body.name,
            type: req.body.type,
            size: req.body.size,
            url: req.body.url,
            projectId: req.body.projectId,
            clientId: clientId,
            uploadedBy: req.user._id.toString()
        });

        const newFile = await file.save();
        res.status(201).json(newFile);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// UPDATE a file
router.put('/:id', protect, async (req, res) => {
    try {
        const file = await File.findById(req.params.id);
        if (!file) return res.status(404).json({ message: 'File not found' });

        // Authorization check
        if (req.user.role !== 'admin' && req.user.role !== 'owner' && file.uploadedBy !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        const allowed = req.user.role === 'admin' || req.user.role === 'owner'
            ? ['name', 'type', 'projectId', 'clientId']
            : ['name', 'type'];
        const updateData = {};
        allowed.forEach(key => { if (req.body[key] !== undefined) updateData[key] = req.body[key]; });
        const updatedFile = await File.findByIdAndUpdate(req.params.id, updateData, { new: true });

        res.json(updatedFile);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// DELETE a file
router.delete('/:id', protect, async (req, res) => {
    try {
        const file = await File.findById(req.params.id);
        if (!file) return res.status(404).json({ message: 'File not found' });

        // Authorization check
        if (req.user.role !== 'admin' && req.user.role !== 'owner' && file.uploadedBy !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        await file.deleteOne();
        res.json({ message: 'File deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
