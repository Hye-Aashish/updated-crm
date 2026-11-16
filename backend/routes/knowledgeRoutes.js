const express = require('express');
const router = express.Router();
const KnowledgeArticle = require('../models/KnowledgeArticle');
const { protect, checkPermission } = require('../middleware/authMiddleware');
const { canViewAllRecords, assertCreatorAccess, ownerIds } = require('../utils/dataScope');

/**
 * Knowledge base policy:
 * - published: shared with anyone who has knowledge_base:view
 * - draft / archived: creator-scoped (or view_all / admin/owner)
 */
async function assertKnowledgeAccess(user, article) {
    if (!user || !article) return { ok: false, status: 401, message: 'Not authorized' };
    if (article.status === 'published') return { ok: true };
    return assertCreatorAccess(user, article, 'knowledge_base');
}

async function knowledgeListFilter(user, base = {}) {
    if (await canViewAllRecords(user, 'knowledge_base')) return base;
    const ids = ownerIds(user);
    return {
        ...base,
        $or: [
            { status: 'published' },
            { createdBy: { $in: ids } }
        ]
    };
}

router.get('/', protect, checkPermission('knowledge_base', 'view'), async (req, res) => {
    try {
        let filter = {};
        if (req.query.category) filter.category = req.query.category;
        if (req.query.status) filter.status = req.query.status;
        else filter.status = { $ne: 'archived' };

        if (req.query.q) {
            filter.$text = { $search: req.query.q };
        }

        filter = await knowledgeListFilter(req.user, filter);

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
        const article = await KnowledgeArticle.findById(req.params.id)
            .populate('createdBy', 'name')
            .populate('updatedBy', 'name');
        if (!article) return res.status(404).json({ message: 'Article not found' });

        const access = await assertKnowledgeAccess(req.user, article);
        if (!access.ok) return res.status(access.status).json({ message: access.message });

        // Increment views only after authorization
        article.views = (article.views || 0) + 1;
        await article.save();
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

        const access = await assertCreatorAccess(req.user, article, 'knowledge_base');
        if (!access.ok) return res.status(access.status).json({ message: access.message });

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
        const article = await KnowledgeArticle.findById(req.params.id);
        if (!article) return res.status(404).json({ message: 'Article not found' });

        const access = await assertCreatorAccess(req.user, article, 'knowledge_base');
        if (!access.ok) return res.status(access.status).json({ message: access.message });

        await KnowledgeArticle.findByIdAndDelete(req.params.id);
        res.json({ message: 'Article deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
