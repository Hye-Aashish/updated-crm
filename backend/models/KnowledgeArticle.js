const mongoose = require('mongoose');

const knowledgeArticleSchema = new mongoose.Schema({
    title: { type: String, required: true, trim: true },
    slug: { type: String, trim: true },
    category: {
        type: String,
        enum: ['sop', 'onboarding', 'delivery', 'sales', 'support', 'finance', 'hr', 'general'],
        default: 'general'
    },
    tags: [{ type: String }],
    summary: { type: String },
    content: { type: String, required: true },
    status: {
        type: String,
        enum: ['draft', 'published', 'archived'],
        default: 'published'
    },
    isPinned: { type: Boolean, default: false },
    views: { type: Number, default: 0 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

knowledgeArticleSchema.index({ title: 'text', summary: 'text', content: 'text', tags: 'text' });

knowledgeArticleSchema.pre('save', function () {
    this.updatedAt = new Date();
    if (!this.slug && this.title) {
        this.slug = this.title
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '');
    }
});

module.exports = mongoose.model('KnowledgeArticle', knowledgeArticleSchema);
