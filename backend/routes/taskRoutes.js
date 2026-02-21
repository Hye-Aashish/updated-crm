const express = require('express');
const router = express.Router();
const Task = require('../models/Task');
const Project = require('../models/Project');
const { protect, authorize } = require('../middleware/authMiddleware');

// Helper to update project progress
const updateProjectProgress = async (projectId) => {
    try {
        if (!projectId) return;
        const tasks = await Task.find({ projectId });
        if (tasks.length === 0) {
            await Project.findByIdAndUpdate(projectId, { progress: 0 });
            return;
        }
        const completedTasks = tasks.filter(t => t.status === 'done' || t.status === 'completed').length;
        const progress = Math.round((completedTasks / tasks.length) * 100);
        await Project.findByIdAndUpdate(projectId, { progress });
    } catch (err) {
        console.error("Progress update error:", err);
    }
};

// GET all tasks (optional filter by projectId)
router.get('/', protect, async (req, res) => {
    try {
        const filter = {};
        if (req.query.projectId) filter.projectId = req.query.projectId;
        if (req.query.assigneeId) filter.assigneeId = req.query.assigneeId;

        // RBAC Logic
        const user = req.user;
        if (user.role !== 'admin' && user.role !== 'owner') {
            const userId = user._id.toString();

            // User sees tasks assigned to them 
            // OR tasks in projects where they are PM or member
            const myProjects = await Project.find({
                $or: [{ pmId: userId }, { members: userId }]
            }).select('_id');
            const myProjectIds = myProjects.map(p => p._id.toString());

            const aclQuery = {
                $or: [
                    { assigneeId: userId },
                    { projectId: { $in: myProjectIds } }
                ]
            };

            const tasks = await Task.find({ $and: [filter, aclQuery] }).sort({ createdAt: -1 });
            return res.json(tasks);
        }

        const tasks = await Task.find(filter).sort({ createdAt: -1 });
        res.json(tasks);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// GET single task
router.get('/:id', protect, async (req, res) => {
    try {
        const task = await Task.findById(req.params.id);
        if (!task) return res.status(404).json({ message: 'Task not found' });

        // RBAC Check
        if (req.user.role !== 'admin' && req.user.role !== 'owner') {
            const userId = req.user._id.toString();
            const project = await Project.findById(task.projectId);

            const isAssignee = task.assigneeId === userId;
            const isPM = project && project.pmId === userId;
            const isMember = project && project.members && project.members.includes(userId);

            if (!isAssignee && !isPM && !isMember) {
                return res.status(403).json({ message: 'Not authorized to view this task' });
            }
        }

        res.json(task);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// CREATE a new task
router.post('/', protect, async (req, res) => {
    const task = new Task(req.body);
    try {
        const newTask = await task.save();
        await updateProjectProgress(newTask.projectId);

        // Trigger Notification
        try {
            const Notification = require('../models/Notification');
            await Notification.create({
                title: 'New Task Assigned',
                message: `A new task "${newTask.title}" has been created.`,
                type: 'new_task',
                relatedId: newTask._id
            });
        } catch (nErr) { console.error('Notif Error:', nErr); }

        res.status(201).json(newTask);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// UPDATE a task
router.put('/:id', protect, async (req, res) => {
    try {
        const task = await Task.findById(req.params.id);
        if (!task) return res.status(404).json({ message: 'Task not found' });

        // RBAC Check
        if (req.user.role !== 'admin' && req.user.role !== 'owner') {
            const userId = req.user._id.toString();
            const project = await Project.findById(task.projectId);

            const isAssignee = task.assigneeId?.toString() === userId;
            const isPM = project && project.pmId?.toString() === userId;
            const isMember = project && project.members && project.members.includes(userId);

            if (!isAssignee && !isPM && !isMember) {
                console.warn(`Unauthorized task update attempt by user ${userId} on task ${req.params.id}. Roles: ${req.user.role}`);
                return res.status(403).json({ message: 'Not authorized to update this task' });
            }
        }

        const updatedTask = await Task.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
        });
        // Recalculate progress for the project
        await updateProjectProgress(updatedTask.projectId);
        res.json(updatedTask);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// DELETE a task
router.delete('/:id', protect, async (req, res) => {
    try {
        const task = await Task.findById(req.params.id);
        if (!task) return res.status(404).json({ message: 'Task not found' });

        // RBAC Check (Only Admin/Owner/PM can delete)
        if (req.user.role !== 'admin' && req.user.role !== 'owner') {
            const userId = req.user._id.toString();
            const project = await Project.findById(task.projectId);
            const isPM = project && project.pmId === userId;

            if (!isPM) {
                return res.status(403).json({ message: 'Not authorized to delete this task' });
            }
        }

        await Task.findByIdAndDelete(req.params.id);
        // Recalculate progress for the project
        await updateProjectProgress(task.projectId);

        res.json({ message: 'Task deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
