const express = require('express');
const router = express.Router();
const KnowledgeArticle = require('../models/KnowledgeArticle');
const { protect, checkPermission } = require('../middleware/authMiddleware');

router.get('/', protect, checkPermission('knowledge_base', 'view'), async (req, res) => {
    try {
        const filter = {};
        if (req.query.category) filter.category = req.query.category;
        if (req.query.status) filter.status = req.query.status;
        else filter.status = { $ne: 'archived' };

        if (req.query.q) {
            filter.$text = { $search: req.query.q };
        }

        const articles = await KnowledgeArticle.find(filter)
            .populate('createdBy', 'name')
            .populate('updatedBy', 'name')
            .sort({ isPinned: -1, updatedAt: -1 })
            .select(req.query.q ? undefined : '-content');

        res.json(articles);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.get('/:id', protect, checkPermission('knowledge_base', 'view'), async (req, res) => {
    try {
        const article = await KnowledgeArticle.findByIdAndUpdate(
            req.params.id,
            { $inc: { views: 1 } },
            { new: true }
        )
            .populate('createdBy', 'name')
            .populate('updatedBy', 'name');
        if (!article) return res.status(404).json({ message: 'Article not found' });
        res.json(article);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.post('/', protect, checkPermission('knowledge_base', 'create'), async (req, res) => {
    try {
        const { title, category, tags, summary, content, status, isPinned } = req.body;
        if (!title || !content) {
            return res.status(400).json({ message: 'title and content are required' });
        }
        const article = new KnowledgeArticle({
            title,
            category: category || 'general',
            tags: tags || [],
            summary,
            content,
            status: status || 'published',
            isPinned: Boolean(isPinned),
            createdBy: req.user._id,
            updatedBy: req.user._id
        });
        const saved = await article.save();
        res.status(201).json(saved);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

router.put('/:id', protect, checkPermission('knowledge_base', 'edit'), async (req, res) => {
    try {
        const article = await KnowledgeArticle.findById(req.params.id);
        if (!article) return res.status(404).json({ message: 'Article not found' });

        const fields = ['title', 'category', 'tags', 'summary', 'content', 'status', 'isPinned', 'slug'];
        for (const f of fields) {
            if (req.body[f] !== undefined) article[f] = req.body[f];
        }
        article.updatedBy = req.user._id;
        await article.save();
        res.json(article);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

router.delete('/:id', protect, checkPermission('knowledge_base', 'delete'), async (req, res) => {
    try {
        const article = await KnowledgeArticle.findByIdAndDelete(req.params.id);
        if (!article) return res.status(404).json({ message: 'Article not found' });
        res.json({ message: 'Article deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
