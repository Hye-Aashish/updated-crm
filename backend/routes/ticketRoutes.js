const express = require('express');
const router = express.Router();
const Ticket = require('../models/Ticket');
const { protect, checkPermission } = require('../middleware/authMiddleware');

// Helper to escape special regex characters
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Get all tickets
router.get('/', protect, async (req, res) => {
    try {
        let filter = {};
        if (req.user.role === 'client') {
            filter = { clientId: req.user.clientId };
        } else if (req.user.role !== 'admin' && req.user.role !== 'owner') {
            const Project = require('../models/Project');
            const userProjects = await Project.find({
                $or: [
                    { pmId: req.user._id.toString() },
                    { members: req.user._id.toString() }
                ]
            });
            const projectIds = userProjects.map(p => p._id.toString());

            // Employees see tickets assigned to them, created by them, or associated with their projects
            filter = {
                $or: [
                    { assignedTo: req.user._id.toString() },
                    { assignedTo: req.user.name },
                    { assignedTo: { $regex: new RegExp('^' + escapeRegex(req.user.name) + '$', 'i') } },
                    { createdBy: req.user._id.toString() },
                    { projectId: { $in: projectIds } }
                ]
            };
        }
        const tickets = await Ticket.find(filter).select('-screenshot').sort({ createdAt: -1 });
        res.json(tickets);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Create ticket
router.post('/', protect, checkPermission('tickets', 'create'), async (req, res) => {
    let assignedTo = req.body.assignedTo;

    // Auto-assign developer from project if not provided
    if (!assignedTo && req.body.projectId) {
        try {
            const Project = require('../models/Project');
            const User = require('../models/User');
            const proj = await Project.findById(req.body.projectId);
            if (proj) {
                let devId = (proj.developers && proj.developers.length > 0) ? proj.developers[0]
                    : (proj.members && proj.members.length > 0) ? proj.members[0]
                    : proj.pmId;
                if (devId) {
                    const devUser = await User.findById(devId);
                    if (devUser) assignedTo = devUser.name;
                }
            }
        } catch (autoErr) {
            console.error('Auto-assign developer error on ticket create:', autoErr);
        }
    }

    const ticket = new Ticket({
        subject: req.body.subject,
        description: req.body.description,
        priority: req.body.priority,
        clientName: req.user.role === 'client' ? req.user.name : req.body.clientName,
        clientId: req.user.role === 'client' ? req.user.clientId : req.body.clientId,
        projectId: req.body.projectId,
        assignedTo: assignedTo,
        screenshot: req.body.screenshot,
        createdBy: req.user._id.toString()
    });
    try {
        const newTicket = await ticket.save();
        res.status(201).json(newTicket);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// GET single ticket
router.get('/:id', protect, async (req, res) => {
    try {
        const ticket = await Ticket.findById(req.params.id);
        if (!ticket) return res.status(404).json({ message: 'Ticket not found' });

        const Project = require('../models/Project');
        const isProjectMember = ticket.projectId ? await Project.exists({
            _id: ticket.projectId,
            $or: [
                { pmId: req.user._id.toString() },
                { members: req.user._id.toString() }
            ]
        }) : false;

        const isCreator = ticket.createdBy === req.user._id.toString();
        const isAssigned = ticket.assignedTo === req.user._id.toString() ||
            ticket.assignedTo === req.user.name ||
            (ticket.assignedTo && ticket.assignedTo.toLowerCase() === req.user.name.toLowerCase());

        if (req.user.role === 'client') {
            if (ticket.clientId !== req.user.clientId) {
                return res.status(403).json({ message: 'Not authorized' });
            }
        } else if (req.user.role !== 'admin' && req.user.role !== 'owner' && !isAssigned && !isCreator && !isProjectMember) {
            return res.status(403).json({ message: 'Not authorized' });
        }
        res.json(ticket);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Update ticket
router.put('/:id', protect, checkPermission('tickets', 'edit'), async (req, res) => {
    try {
        const ticket = await Ticket.findById(req.params.id);
        if (!ticket) return res.status(404).json({ message: 'Ticket not found' });

        const Project = require('../models/Project');
        const isProjectMember = ticket.projectId ? await Project.exists({
            _id: ticket.projectId,
            $or: [
                { pmId: req.user._id.toString() },
                { members: req.user._id.toString() }
            ]
        }) : false;

        const isCreator = ticket.createdBy === req.user._id.toString();
        const isAssigned = ticket.assignedTo === req.user._id.toString() ||
            ticket.assignedTo === req.user.name ||
            (ticket.assignedTo && ticket.assignedTo.toLowerCase() === req.user.name.toLowerCase());

        if (req.user.role === 'client') {
            if (ticket.clientId !== req.user.clientId) {
                return res.status(403).json({ message: 'Not authorized' });
            }
        } else if (req.user.role !== 'admin' && req.user.role !== 'owner' && !isAssigned && !isCreator && !isProjectMember) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        if (req.body.status) ticket.status = req.body.status;
        if (req.body.priority) ticket.priority = req.body.priority;
        if (req.body.assignedTo) ticket.assignedTo = req.body.assignedTo;
        if (req.body.description) ticket.description = req.body.description;
        if (req.body.discussionNote !== undefined) ticket.discussionNote = req.body.discussionNote;
        if (req.body.taskId !== undefined) ticket.taskId = req.body.taskId;
        if (req.body.taskTitle !== undefined) ticket.taskTitle = req.body.taskTitle;

        ticket.updatedAt = Date.now();
        const updatedTicket = await ticket.save();
        res.json(updatedTicket);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Assign / Create Task for Ticket
router.post('/:id/assign-task', protect, async (req, res) => {
    try {
        const ticket = await Ticket.findById(req.params.id);
        if (!ticket) return res.status(404).json({ message: 'Ticket not found' });

        if (req.user.role === 'client') {
            return res.status(403).json({ message: 'Clients cannot assign tasks' });
        }

        const Task = require('../models/Task');
        const User = require('../models/User');
        const Project = require('../models/Project');

        const { mode, taskId, title, description, projectId, assigneeId, priority, dueDate, estimatedHours } = req.body;

        let taskToLink;

        if (mode === 'link' && taskId) {
            taskToLink = await Task.findById(taskId);
            if (!taskToLink) return res.status(404).json({ message: 'Selected task not found' });
            taskToLink.ticketId = ticket._id.toString();
            await taskToLink.save();
        } else {
            // Mode: create new task
            const targetProjectId = projectId || ticket.projectId;
            if (!targetProjectId) {
                return res.status(400).json({ message: 'Please select a project to assign this task' });
            }

            let resolvedAssigneeId = assigneeId;
            if (!resolvedAssigneeId && ticket.assignedTo) {
                const u = await User.findOne({ name: new RegExp('^' + escapeRegex(ticket.assignedTo) + '$', 'i') });
                if (u) resolvedAssigneeId = u._id.toString();
            }

            // Auto-resolve developer from project if still not set
            if (!resolvedAssigneeId && targetProjectId) {
                const proj = await Project.findById(targetProjectId);
                if (proj) {
                    resolvedAssigneeId = (proj.developers && proj.developers.length > 0) ? proj.developers[0]
                        : (proj.members && proj.members.length > 0) ? proj.members[0]
                        : proj.pmId;
                }
            }

            const newTask = new Task({
                title: title || ticket.subject,
                description: description || ticket.description || '',
                projectId: targetProjectId,
                assigneeId: resolvedAssigneeId,
                priority: priority || (ticket.priority === 'critical' ? 'urgent' : ticket.priority) || 'medium',
                dueDate: dueDate ? new Date(dueDate) : undefined,
                estimatedHours: estimatedHours ? Number(estimatedHours) : undefined,
                ticketId: ticket._id.toString(),
                creatorId: req.user._id.toString(),
                status: 'todo'
            });

            taskToLink = await newTask.save();

            // Recalculate project progress
            if (targetProjectId) {
                const tasks = await Task.find({ projectId: targetProjectId });
                const completedTasks = tasks.filter(t => t.status === 'done' || t.status === 'completed').length;
                const progress = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0;
                await Project.findByIdAndUpdate(targetProjectId, { progress });
            }
        }

        // Update Ticket
        ticket.taskId = taskToLink._id.toString();
        ticket.taskTitle = taskToLink.title;
        if (ticket.status === 'open') {
            ticket.status = 'in-progress';
        }

        // Find assignee name if assigneeId or taskToLink assigneeId exists
        const finalAssigneeId = taskToLink.assigneeId || assigneeId;
        if (finalAssigneeId) {
            const assignedUser = await User.findById(finalAssigneeId);
            if (assignedUser) {
                ticket.assignedTo = assignedUser.name;
            }
        }

        ticket.updatedAt = Date.now();
        await ticket.save();

        res.json({
            message: 'Task assigned to ticket successfully',
            ticket,
            task: taskToLink
        });
    } catch (err) {
        console.error('Assign task error:', err);
        res.status(500).json({ message: err.message });
    }
});

// Delete ticket
router.delete('/:id', protect, checkPermission('tickets', 'delete'), async (req, res) => {
    try {
        const ticket = await Ticket.findById(req.params.id);
        if (!ticket) return res.status(404).json({ message: 'Ticket not found' });

        if (req.user.role === 'client') {
            if (ticket.clientId !== req.user.clientId) {
                return res.status(403).json({ message: 'Not authorized to delete this ticket' });
            }
        } else if (req.user.role !== 'admin' && req.user.role !== 'owner') {
            const isCreator = ticket.createdBy === req.user._id.toString();
            if (!isCreator) {
                return res.status(403).json({ message: 'Not authorized to delete this ticket' });
            }
        }

        await Ticket.findByIdAndDelete(req.params.id);
        res.json({ message: 'Ticket deleted successfully' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
