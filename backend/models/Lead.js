const mongoose = require('mongoose');

const leadSchema = new mongoose.Schema({
    name: { type: String, required: true },
    company: { type: String, required: true },
    value: { type: Number, default: 0 },
    source: { type: String, default: 'Direct' },
    stage: { type: String, required: true }, // Links to PipelineStage id
    email: String,
    phone: String,
    project: String,
    rating: { type: Number, default: 0, min: 0, max: 5 },
    customFields: { type: Map, of: String },
    activities: [{
        content: String,
        type: { type: String, enum: ['note', 'call', 'meeting', 'email'], default: 'note' },
        createdAt: { type: Date, default: Date.now }
    }],
    reminder: {
        date: Date,
        tone: { type: String, default: 'default' },
        completed: { type: Boolean, default: false },
        sentReminders: [{ type: String }]
    },
    tags: [{ type: String }],
    aiPriority: { type: String, enum: ['red', 'yellow', 'green'], default: 'red' },
    aiPriorityReason: { type: String, default: 'No interaction history.' },
    assignedTo: { type: String }, // User ID
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

const calculateRating = (doc) => {
    let rating = 1; // Base rating
    
    // 1. AI Priority
    if (doc.aiPriority === 'green') rating += 2;
    else if (doc.aiPriority === 'yellow') rating += 1;

    // 2. Value
    const val = doc.value || 0;
    if (val >= 100000) rating += 1;
    else if (val >= 10000) rating += 0.5;

    // 3. Activities
    if (doc.activities && doc.activities.length >= 3) rating += 1;
    else if (doc.activities && doc.activities.length >= 1) rating += 0.5;

    // 4. Tags
    if (doc.tags && doc.tags.length > 0) {
        const highValueTags = ['vip', 'urgent', 'hot', 'referral', 'important'];
        if (doc.tags.some(t => highValueTags.includes(t.toLowerCase()))) {
            rating += 1;
        }
    }

    return Math.min(5, Math.max(1, Math.round(rating))); // Whole numbers 1-5
};

leadSchema.pre('save', function() {
    this.rating = calculateRating(this);
    this.updatedAt = Date.now();
});

leadSchema.pre('findOneAndUpdate', async function() {
    // We need the full document to calculate rating properly since some fields might not be in the update
    const docToUpdate = await this.model.findOne(this.getQuery());
    const update = this.getUpdate();
    
    if (docToUpdate && update) {
        const mergedDoc = { ...docToUpdate.toObject(), ...update, ...update.$set };
        const newRating = calculateRating(mergedDoc);
        
        if (!update.$set) update.$set = {};
        update.$set.rating = newRating;
    }
});

leadSchema.index({ assignedTo: 1 });
leadSchema.index({ stage: 1 });
leadSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Lead', leadSchema);
