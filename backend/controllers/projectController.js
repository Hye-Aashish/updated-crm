const Project = require('../models/Project');
const { generateAutoInvoice } = require('../services/invoiceService');

exports.getProjects = async (req, res, next) => {
    try {
        let query = {};
        // If user is not admin/owner, they can only see projects they prevent or are a member of
        if (req.user && req.user.role !== 'admin' && req.user.role !== 'owner') {
            const userId = req.user._id.toString();
            query = {
                $or: [
                    { pmId: userId },
                    { members: userId }
                ]
            };
        }

        const projects = await Project.find(query).sort({ createdAt: -1 });
        res.json(projects);
    } catch (err) {
        next(err);
    }
};

exports.getProjectById = async (req, res, next) => {
    try {
        const project = await Project.findById(req.params.id);
        if (!project) return res.status(404).json({ message: 'Project not found' });

        // RBAC Check for View Access
        if (req.user && req.user.role !== 'admin' && req.user.role !== 'owner') {
            const userId = req.user._id.toString();
            const isPM = project.pmId === userId;
            const isMember = project.members && project.members.includes(userId);

            if (!isPM && !isMember) {
                return res.status(403).json({ message: 'Not authorized to view this project' });
            }
        }

        res.json(project);
    } catch (err) {
        next(err);
    }
};

exports.createProject = async (req, res, next) => {
    try {
        const project = new Project({
            ...req.body,
            dueDate: req.body.deadline || req.body.dueDate
        });
        const newProject = await project.save();
        res.status(201).json(newProject);
    } catch (err) {
        next(err);
    }
};

exports.updateProject = async (req, res, next) => {
    try {
        const oldProject = await Project.findById(req.params.id);
        if (!oldProject) return res.status(404).json({ message: 'Project not found' });

        // RBAC Check: PMs can only update THEIR own projects
        if (req.user.role === 'pm') {
            if (oldProject.pmId !== req.user._id.toString()) {
                return res.status(403).json({ message: 'Not authorized to update this project' });
            }
        }

        const updatedProject = await Project.findByIdAndUpdate(req.params.id, req.body, { new: true });

        // AUTO-INVOICE LOGIC:
        // Trigger if status changes to 'completed' and autoInvoice is enabled
        if (updatedProject.status === 'completed' && oldProject.status !== 'completed' && updatedProject.autoInvoice) {
            console.log(`Triggering auto-invoice for project: ${updatedProject.name}`);
            try {
                await generateAutoInvoice(updatedProject);
            } catch (billingError) {
                console.error("Auto-billing failed:", billingError);
                // We don't fail the update request, but log the error
            }
        }

        res.json(updatedProject);
    } catch (err) {
        next(err);
    }
};

exports.deleteProject = async (req, res, next) => {
    try {
        const deletedProject = await Project.findByIdAndDelete(req.params.id);
        if (!deletedProject) return res.status(404).json({ message: 'Project not found' });
        res.json({ message: 'Project deleted' });
    } catch (err) {
        next(err);
    }
};
