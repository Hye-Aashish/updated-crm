const express = require('express');
const router = express.Router();
const File = require('../models/File');
const { protect, authorize } = require('../middleware/authMiddleware');

// GET all files
router.get('/', protect, async (req, res) => {
    try {
        let query = {};
        // If not admin/owner, filter by uploader
        if (req.user.role !== 'admin' && req.user.role !== 'owner') {
            query.uploadedBy = req.user._id.toString();
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
        if (req.user.role !== 'admin' && req.user.role !== 'owner' && file.uploadedBy !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized' });
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
