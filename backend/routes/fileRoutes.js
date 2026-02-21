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

            // Find projects I am involved in
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

        res.json(file);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// UPLAOD/CREATE a new file record
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

        const updatedFile = await File.findByIdAndUpdate(req.params.id, req.body, { new: true });
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
