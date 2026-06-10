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
        if (user.role === 'client') {
            const myProjects = await Project.find({ clientId: user.clientId }).select('_id');
            const myProjectIds = myProjects.map(p => p._id.toString());
            const filterWithClient = { ...filter, projectId: { $in: myProjectIds } };
            const tasks = await Task.find(filterWithClient).sort({ createdAt: -1 });
            return res.json(tasks);
        }

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
        if (req.user.role === 'client') {
            const project = await Project.findById(task.projectId);
            if (!project || project.clientId !== req.user.clientId) {
                return res.status(403).json({ message: 'Not authorized' });
            }
        } else if (req.user.role !== 'admin' && req.user.role !== 'owner') {
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
        if (req.user.role === 'client') {
            const project = await Project.findById(task.projectId);
            if (!project || project.clientId !== req.user.clientId) {
                return res.status(403).json({ message: 'Not authorized' });
            }
            if (req.body.status && req.body.status !== task.status) {
                const isApproved = task.status === 'client-approval' && (req.body.status === 'done' || req.body.status === 'completed');
                if (!isApproved) {
                    return res.status(403).json({ message: 'Clients are only authorized to change status to done or completed when task is in client-approval' });
                }
            }
            const allowedUpdates = ['status', 'description'];
            const attemptedUpdates = Object.keys(req.body);
            const isAttemptingUnauthorizedUpdates = attemptedUpdates.some(key => !allowedUpdates.includes(key) && req.body[key] !== undefined && req.body[key] !== task[key]);
            if (isAttemptingUnauthorizedUpdates) {
                return res.status(403).json({ message: 'Clients can only update task status and description' });
            }
        } else if (req.user.role !== 'admin' && req.user.role !== 'owner') {
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

        // If status is updated to done or completed, automatically stop any running timer
        if ((req.body.status === 'done' || req.body.status === 'completed' || req.body.status === 'client-approval') && task.isTimerRunning) {
            const now = Date.now();
            const elapsed = now - (task.lastStartTime || now);
            req.body.isTimerRunning = false;
            req.body.totalTimeSpent = (task.totalTimeSpent || 0) + elapsed;
            req.body.lastStartTime = null;

            if (task.timeEntryId) {
                try {
                    const TimeEntry = require('../models/TimeEntry');
                    const timeEntry = await TimeEntry.findById(task.timeEntryId);
                    if (timeEntry && timeEntry.isRunning) {
                        timeEntry.endTime = new Date();
                        timeEntry.isRunning = false;
                        const start = new Date(timeEntry.startTime);
                        timeEntry.duration = Math.max(0, Math.floor((timeEntry.endTime - start) / 1000 / 60)); // minutes
                        await timeEntry.save();
                    }
                } catch (timerErr) {
                    console.error('Failed to auto-stop time entry for task:', timerErr);
                }
            }
            req.body.timeEntryId = null;
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
        if (req.user.role === 'client') {
            return res.status(403).json({ message: 'Clients cannot delete tasks' });
        } else if (req.user.role !== 'admin' && req.user.role !== 'owner') {
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
