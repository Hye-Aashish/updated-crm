const ProjectMessage = require('../models/ProjectMessage');
const Project = require('../models/Project');

// Get messages for a project
exports.getProjectMessages = async (req, res) => {
    try {
        const { projectId } = req.params;
        const project = await Project.findById(projectId);
        if (!project) return res.status(404).json({ message: 'Project not found' });

        // RBAC Check
        const userId = req.user._id.toString();
        const role = req.user.role;

        if (role === 'client') {
            if (project.clientId !== req.user.clientId) {
                return res.status(403).json({ message: 'Not authorized to view these messages' });
            }
        } else if (role !== 'admin' && role !== 'owner') {
            if (project.pmId !== userId && (!project.members || !project.members.includes(userId))) {
                return res.status(403).json({ message: 'Not authorized to view these messages' });
            }
        }

        const messages = await ProjectMessage.find({ projectId })
            .sort({ createdAt: 1 })
            .limit(100);
        res.status(200).json(messages);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Send a message (also handled via socket, but nice to have REST)
exports.sendProjectMessage = async (req, res) => {
    try {
        const { projectId, message, attachments } = req.body;
        const newMessage = new ProjectMessage({
            projectId,
            senderId: req.user._id,
            senderName: req.user.name,
            senderRole: req.user.role,
            message,
            attachments
        });
        await newMessage.save();
        res.status(201).json(newMessage);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get all projects the user is involved in for chat sidebar
exports.getChatProjects = async (req, res) => {
    try {
        const userId = req.user._id.toString();
        const role = req.user.role;

        let query = {};
        if (role === 'client') {
            query = { clientId: req.user.clientId };
        } else if (role === 'admin' || role === 'owner') {
            query = {}; // Admins can see all chats? or maybe only active ones
        } else {
            // Employee/PM: must be in members or pmId
            query = {
                $or: [
                    { members: userId },
                    { pmId: userId }
                ]
            };
        }

        const projects = await Project.find(query).select('name status clientId members pmId');
        res.status(200).json(projects);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
