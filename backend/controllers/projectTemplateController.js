const ProjectTemplate = require('../models/ProjectTemplate');

// Predefined System Templates
const DEFAULT_TEMPLATES = [
    {
        name: 'LMS (Learning Management System)',
        projectType: 'lms',
        description: 'Complete 53-checkpoint workflow for LMS development, mobile apps, payment integration, QA, and handover.',
        isSystemDefault: true,
        phases: [
            {
                name: 'PHASE 1 — REQUIREMENTS',
                order: 1,
                checkpoints: [
                    { title: 'Requirement Received', order: 1, defaultRole: 'pm', defaultDurationDays: 1, priority: 'high', isMandatory: true, proofRequired: false },
                    { title: 'Requirement Reviewed', order: 2, defaultRole: 'pm', defaultDurationDays: 1, priority: 'high', isMandatory: true, proofRequired: false, dependencyIndices: [0] },
                    { title: 'Scope Finalized', order: 3, defaultRole: 'pm', defaultDurationDays: 2, priority: 'urgent', isMandatory: true, proofRequired: true, proofType: 'url', dependencyIndices: [1] },
                    { title: 'Scope Approved', order: 4, defaultRole: 'pm', defaultDurationDays: 1, priority: 'urgent', isMandatory: true, proofRequired: false, approvalRequired: true, dependencyIndices: [2] }
                ]
            },
            {
                name: 'PHASE 2 — UI/UX DESIGN',
                order: 2,
                checkpoints: [
                    { title: 'UI/UX Started', order: 5, defaultRole: 'designer', defaultDurationDays: 1, priority: 'medium', isMandatory: true, proofRequired: false, dependencyIndices: [3] },
                    { title: 'Website Design Completed', order: 6, defaultRole: 'designer', defaultDurationDays: 3, priority: 'high', isMandatory: true, proofRequired: true, proofType: 'url', dependencyIndices: [4] },
                    { title: 'Admin Panel Design Completed', order: 7, defaultRole: 'designer', defaultDurationDays: 2, priority: 'medium', isMandatory: true, proofRequired: true, proofType: 'url', dependencyIndices: [4] },
                    { title: 'Student Panel Design Completed', order: 8, defaultRole: 'designer', defaultDurationDays: 2, priority: 'medium', isMandatory: true, proofRequired: true, proofType: 'url', dependencyIndices: [4] },
                    { title: 'Mobile App Design Completed', order: 9, defaultRole: 'designer', defaultDurationDays: 3, priority: 'medium', isMandatory: false, proofRequired: true, proofType: 'url', dependencyIndices: [4] },
                    { title: 'Design Approved', order: 10, defaultRole: 'pm', defaultDurationDays: 1, priority: 'urgent', isMandatory: true, proofRequired: false, approvalRequired: true, dependencyIndices: [5, 6, 7] }
                ]
            },
            {
                name: 'PHASE 3 — DEVELOPMENT',
                order: 3,
                checkpoints: [
                    { title: 'Backend Development Started', order: 11, defaultRole: 'developer', defaultDurationDays: 1, priority: 'high', isMandatory: true, proofRequired: false, dependencyIndices: [9] },
                    { title: 'Backend Development Completed', order: 12, defaultRole: 'developer', defaultDurationDays: 5, priority: 'high', isMandatory: true, proofRequired: true, proofType: 'url', dependencyIndices: [10] },
                    { title: 'Frontend Development Started', order: 13, defaultRole: 'developer', defaultDurationDays: 1, priority: 'high', isMandatory: true, proofRequired: false, dependencyIndices: [9] },
                    { title: 'Frontend Development Completed', order: 14, defaultRole: 'developer', defaultDurationDays: 5, priority: 'high', isMandatory: true, proofRequired: true, proofType: 'url', dependencyIndices: [12] },
                    { title: 'API Integration Completed', order: 15, defaultRole: 'developer', defaultDurationDays: 3, priority: 'high', isMandatory: true, proofRequired: false, dependencyIndices: [11, 13] },
                    { title: 'Admin Panel Completed', order: 16, defaultRole: 'developer', defaultDurationDays: 3, priority: 'medium', isMandatory: true, proofRequired: true, proofType: 'url', dependencyIndices: [14] },
                    { title: 'Student Panel Completed', order: 17, defaultRole: 'developer', defaultDurationDays: 3, priority: 'medium', isMandatory: true, proofRequired: true, proofType: 'url', dependencyIndices: [14] },
                    { title: 'Payment Gateway Integration', order: 18, defaultRole: 'developer', defaultDurationDays: 2, priority: 'urgent', isMandatory: true, proofRequired: true, proofType: 'transaction_ref', dependencyIndices: [14] },
                    { title: 'Notification Integration', order: 19, defaultRole: 'developer', defaultDurationDays: 2, priority: 'low', isMandatory: false, proofRequired: false, dependencyIndices: [14] },
                    { title: 'Third-Party Integrations', order: 20, defaultRole: 'developer', defaultDurationDays: 2, priority: 'low', isMandatory: false, proofRequired: false, dependencyIndices: [14] }
                ]
            },
            {
                name: 'PHASE 4 — APPLICATION',
                order: 4,
                checkpoints: [
                    { title: 'Android Development Started', order: 21, defaultRole: 'developer', defaultDurationDays: 1, priority: 'medium', isMandatory: false, dependencyIndices: [14] },
                    { title: 'Android Development Completed', order: 22, defaultRole: 'developer', defaultDurationDays: 5, priority: 'medium', isMandatory: false, dependencyIndices: [20] },
                    { title: 'Android Build Generated', order: 23, defaultRole: 'developer', defaultDurationDays: 1, priority: 'high', isMandatory: false, proofRequired: true, proofType: 'build_file', dependencyIndices: [21] },
                    { title: 'Android Testing Completed', order: 24, defaultRole: 'qa', defaultDurationDays: 2, priority: 'high', isMandatory: false, dependencyIndices: [22] },
                    { title: 'Android Production Build', order: 25, defaultRole: 'developer', defaultDurationDays: 1, priority: 'high', isMandatory: false, proofRequired: true, proofType: 'build_file', dependencyIndices: [23] },
                    { title: 'Play Store Submission', order: 26, defaultRole: 'pm', defaultDurationDays: 1, priority: 'urgent', isMandatory: false, proofRequired: true, proofType: 'version', dependencyIndices: [24] },
                    { title: 'Play Store App Live', order: 27, defaultRole: 'pm', defaultDurationDays: 3, priority: 'urgent', isMandatory: false, proofRequired: true, proofType: 'url', dependencyIndices: [25] },
                    { title: 'iOS Development Started', order: 28, defaultRole: 'developer', defaultDurationDays: 1, priority: 'low', isMandatory: false, dependencyIndices: [14] },
                    { title: 'iOS Development Completed', order: 29, defaultRole: 'developer', defaultDurationDays: 5, priority: 'low', isMandatory: false, dependencyIndices: [27] },
                    { title: 'iOS Build Generated', order: 30, defaultRole: 'developer', defaultDurationDays: 1, priority: 'medium', isMandatory: false, proofRequired: true, proofType: 'version', dependencyIndices: [28] },
                    { title: 'iOS Testing Completed', order: 31, defaultRole: 'qa', defaultDurationDays: 2, priority: 'medium', isMandatory: false, dependencyIndices: [29] },
                    { title: 'iOS Production Build', order: 32, defaultRole: 'developer', defaultDurationDays: 1, priority: 'medium', isMandatory: false, proofRequired: true, proofType: 'version', dependencyIndices: [30] },
                    { title: 'App Store Submission', order: 33, defaultRole: 'pm', defaultDurationDays: 1, priority: 'high', isMandatory: false, proofRequired: true, proofType: 'version', dependencyIndices: [31] },
                    { title: 'App Store App Live', order: 34, defaultRole: 'pm', defaultDurationDays: 3, priority: 'high', isMandatory: false, proofRequired: true, proofType: 'url', dependencyIndices: [32] }
                ]
            },
            {
                name: 'PHASE 5 — WEBSITE',
                order: 5,
                checkpoints: [
                    { title: 'Website Development Completed', order: 35, defaultRole: 'developer', defaultDurationDays: 3, priority: 'high', isMandatory: true, proofRequired: true, proofType: 'url', dependencyIndices: [13] },
                    { title: 'Domain Connected', order: 36, defaultRole: 'developer', defaultDurationDays: 1, priority: 'high', isMandatory: true, proofRequired: true, proofType: 'url', dependencyIndices: [34] },
                    { title: 'SSL Configured', order: 37, defaultRole: 'developer', defaultDurationDays: 1, priority: 'medium', isMandatory: true, proofRequired: true, proofType: 'url', dependencyIndices: [35] },
                    { title: 'Production Deployment', order: 38, defaultRole: 'developer', defaultDurationDays: 1, priority: 'urgent', isMandatory: true, proofRequired: true, proofType: 'url', dependencyIndices: [36] },
                    { title: 'Website Live', order: 39, defaultRole: 'pm', defaultDurationDays: 1, priority: 'urgent', isMandatory: true, proofRequired: true, proofType: 'url', approvalRequired: true, dependencyIndices: [37] }
                ]
            },
            {
                name: 'PHASE 6 — QA',
                order: 6,
                checkpoints: [
                    { title: 'Functional Testing', order: 40, defaultRole: 'qa', defaultDurationDays: 2, priority: 'high', isMandatory: true, dependencyIndices: [38] },
                    { title: 'Responsive Testing', order: 41, defaultRole: 'qa', defaultDurationDays: 1, priority: 'medium', isMandatory: true, dependencyIndices: [39] },
                    { title: 'Mobile Testing', order: 42, defaultRole: 'qa', defaultDurationDays: 1, priority: 'medium', isMandatory: true, dependencyIndices: [39] },
                    { title: 'Payment Testing', order: 43, defaultRole: 'qa', defaultDurationDays: 1, priority: 'urgent', isMandatory: true, proofRequired: true, proofType: 'transaction_ref', dependencyIndices: [39] },
                    { title: 'Security Testing', order: 44, defaultRole: 'qa', defaultDurationDays: 1, priority: 'high', isMandatory: true, dependencyIndices: [39] },
                    { title: 'Bug Fixing', order: 45, defaultRole: 'developer', defaultDurationDays: 2, priority: 'high', isMandatory: true, dependencyIndices: [40, 41, 42, 43] },
                    { title: 'Final QA', order: 46, defaultRole: 'qa', defaultDurationDays: 1, priority: 'urgent', isMandatory: true, approvalRequired: true, dependencyIndices: [44] },
                    { title: 'Client UAT', order: 47, defaultRole: 'pm', defaultDurationDays: 2, priority: 'urgent', isMandatory: true, approvalRequired: true, dependencyIndices: [45] }
                ]
            },
            {
                name: 'PHASE 7 — DELIVERY',
                order: 7,
                checkpoints: [
                    { title: 'Client Approval', order: 48, defaultRole: 'pm', defaultDurationDays: 1, priority: 'urgent', isMandatory: true, approvalRequired: true, dependencyIndices: [46] },
                    { title: 'Source Code Handover', order: 49, defaultRole: 'developer', defaultDurationDays: 1, priority: 'high', isMandatory: true, proofRequired: true, proofType: 'url', dependencyIndices: [47] },
                    { title: 'Credentials Handover', order: 50, defaultRole: 'pm', defaultDurationDays: 1, priority: 'high', isMandatory: true, dependencyIndices: [47] },
                    { title: 'Documentation Handover', order: 51, defaultRole: 'pm', defaultDurationDays: 1, priority: 'medium', isMandatory: true, dependencyIndices: [47] },
                    { title: 'Final Payment', order: 52, defaultRole: 'pm', defaultDurationDays: 1, priority: 'urgent', isMandatory: true, proofRequired: true, proofType: 'transaction_ref', dependencyIndices: [47] },
                    { title: 'Project Completed', order: 53, defaultRole: 'pm', defaultDurationDays: 1, priority: 'urgent', isMandatory: true, approvalRequired: true, dependencyIndices: [48, 49, 50, 51] }
                ]
            }
        ]
    },
    {
        name: 'Website Project',
        projectType: 'website',
        description: 'Standard website design, development, SEO, domain connection, and launch workflow.',
        isSystemDefault: true,
        phases: [
            {
                name: 'REQUIREMENTS & DESIGN',
                order: 1,
                checkpoints: [
                    { title: 'Requirements Collected', order: 1, defaultRole: 'pm', defaultDurationDays: 1, isMandatory: true },
                    { title: 'Sitemap & Wireframe Approved', order: 2, defaultRole: 'designer', defaultDurationDays: 2, isMandatory: true, proofRequired: true, proofType: 'url' },
                    { title: 'UI Design Approved', order: 3, defaultRole: 'designer', defaultDurationDays: 3, isMandatory: true, proofRequired: true, proofType: 'url', approvalRequired: true }
                ]
            },
            {
                name: 'DEVELOPMENT & INTEGRATION',
                order: 2,
                checkpoints: [
                    { title: 'Frontend Development Completed', order: 4, defaultRole: 'developer', defaultDurationDays: 4, isMandatory: true, proofRequired: true, proofType: 'url' },
                    { title: 'Contact Forms & API Integrated', order: 5, defaultRole: 'developer', defaultDurationDays: 2, isMandatory: true },
                    { title: 'SEO Meta & Tags Configured', order: 6, defaultRole: 'developer', defaultDurationDays: 1, isMandatory: false }
                ]
            },
            {
                name: 'DEPLOYMENT & LAUNCH',
                order: 3,
                checkpoints: [
                    { title: 'Domain & SSL Configured', order: 7, defaultRole: 'developer', defaultDurationDays: 1, isMandatory: true, proofRequired: true, proofType: 'url' },
                    { title: 'Production Deployment', order: 8, defaultRole: 'developer', defaultDurationDays: 1, isMandatory: true, proofRequired: true, proofType: 'url' },
                    { title: 'Website Live & Verified', order: 9, defaultRole: 'pm', defaultDurationDays: 1, isMandatory: true, proofRequired: true, proofType: 'url', approvalRequired: true }
                ]
            }
        ]
    },
    {
        name: 'Mobile Application (Android & iOS)',
        projectType: 'mobile-app',
        description: 'Native/Cross-platform mobile app development, testing, and store publication workflow.',
        isSystemDefault: true,
        phases: [
            {
                name: 'DESIGN & ARCHITECTURE',
                order: 1,
                checkpoints: [
                    { title: 'Mobile UI Approved', order: 1, defaultRole: 'designer', defaultDurationDays: 3, isMandatory: true, proofRequired: true, proofType: 'url' },
                    { title: 'API Endpoints Ready', order: 2, defaultRole: 'developer', defaultDurationDays: 3, isMandatory: true }
                ]
            },
            {
                name: 'BUILD & TESTING',
                order: 2,
                checkpoints: [
                    { title: 'Android APK Generated', order: 3, defaultRole: 'developer', defaultDurationDays: 5, isMandatory: true, proofRequired: true, proofType: 'build_file' },
                    { title: 'iOS Build Generated', order: 4, defaultRole: 'developer', defaultDurationDays: 5, isMandatory: false, proofRequired: true, proofType: 'version' },
                    { title: 'QA Mobile Testing Passed', order: 5, defaultRole: 'qa', defaultDurationDays: 3, isMandatory: true }
                ]
            },
            {
                name: 'STORE PUBLICATION',
                order: 3,
                checkpoints: [
                    { title: 'Play Store App Live', order: 6, defaultRole: 'pm', defaultDurationDays: 3, isMandatory: true, proofRequired: true, proofType: 'url' },
                    { title: 'App Store App Live', order: 7, defaultRole: 'pm', defaultDurationDays: 3, isMandatory: false, proofRequired: true, proofType: 'url' }
                ]
            }
        ]
    }
];

exports.seedTemplates = async (req, res, next) => {
    try {
        for (const t of DEFAULT_TEMPLATES) {
            await ProjectTemplate.findOneAndUpdate(
                { projectType: t.projectType },
                t,
                { upsert: true, new: true }
            );
        }
        const templates = await ProjectTemplate.find();
        res.json({ message: 'Project templates initialized successfully', count: templates.length, templates });
    } catch (err) {
        next(err);
    }
};

exports.getTemplates = async (req, res, next) => {
    try {
        // Auto-seed if empty
        let templates = await ProjectTemplate.find().sort({ name: 1 });
        if (templates.length === 0) {
            for (const t of DEFAULT_TEMPLATES) {
                await ProjectTemplate.create(t);
            }
            templates = await ProjectTemplate.find().sort({ name: 1 });
        }
        res.json(templates);
    } catch (err) {
        next(err);
    }
};

exports.getTemplateById = async (req, res, next) => {
    try {
        const template = await ProjectTemplate.findById(req.params.id);
        if (!template) return res.status(404).json({ message: 'Template not found' });
        res.json(template);
    } catch (err) {
        next(err);
    }
};

exports.createTemplate = async (req, res, next) => {
    try {
        const template = new ProjectTemplate(req.body);
        const newTemplate = await template.save();
        res.status(201).json(newTemplate);
    } catch (err) {
        next(err);
    }
};

exports.updateTemplate = async (req, res, next) => {
    try {
        const updated = await ProjectTemplate.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!updated) return res.status(404).json({ message: 'Template not found' });
        res.json(updated);
    } catch (err) {
        next(err);
    }
};

exports.deleteTemplate = async (req, res, next) => {
    try {
        const deleted = await ProjectTemplate.findByIdAndDelete(req.params.id);
        if (!deleted) return res.status(404).json({ message: 'Template not found' });
        res.json({ message: 'Template deleted' });
    } catch (err) {
        next(err);
    }
};
