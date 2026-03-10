const express = require('express');
const router = express.Router();
const File = require('../models/File');
const { protect, authorize } = require('../middleware/authMiddleware');

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

const upload = require('../utils/multerConfig');

// UPLOAD a physical file
router.post('/upload', protect, upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        const fileUrl = `${req.protocol}://${req.get('host')}/public/uploads/${req.file.filename}`;

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
    const file = new File({
        name: req.body.name,
        type: req.body.type,
        size: req.body.size,
        url: req.body.url,
        projectId: req.body.projectId,
        clientId: req.body.clientId,
        uploadedBy: req.user._id.toString() // Enforce current user
    });

    try {
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

        // Whitelist allowed update fields
        const allowed = ['name', 'type', 'projectId', 'clientId'];
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
