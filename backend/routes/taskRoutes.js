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

            // Employee and developer roles can only see tasks they created.
            // If creatorId is not set, we fall back to checking if assigneeId is the user.
            const aclQuery = {
                $or: [
                    { creatorId: userId },
                    { creatorId: { $exists: false }, assigneeId: userId }
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

// GET task activities (filters: userId, day)
router.get('/activities', protect, async (req, res) => {
    try {
        // Only admin/owner can access task activities
        if (req.user.role !== 'admin' && req.user.role !== 'owner') {
            return res.status(403).json({ message: 'Access denied' });
        }

        const { userId, day } = req.query;
        let query = {};

        if (userId && userId !== 'all') {
            query.$or = [
                { userId: userId },
                { taskAssigneeId: userId }
            ];
        }

        if (day && day !== 'all') {
            let startOfDay, endOfDay;
            if (/^\d{4}-\d{2}-\d{2}$/.test(day)) {
                startOfDay = new Date(day);
                endOfDay = new Date(day);
            } else {
                startOfDay = new Date();
                endOfDay = new Date();
            }

            if (day === 'today') {
                startOfDay.setHours(0, 0, 0, 0);
                endOfDay.setHours(23, 59, 59, 999);
            } else if (day === 'yesterday') {
                startOfDay.setDate(startOfDay.getDate() - 1);
                startOfDay.setHours(0, 0, 0, 0);
                endOfDay.setDate(endOfDay.getDate() - 1);
                endOfDay.setHours(23, 59, 59, 999);
            } else if (day === 'day-before-yesterday') {
                startOfDay.setDate(startOfDay.getDate() - 2);
                startOfDay.setHours(0, 0, 0, 0);
                endOfDay.setDate(endOfDay.getDate() - 2);
                endOfDay.setHours(23, 59, 59, 999);
            } else {
                startOfDay.setHours(0, 0, 0, 0);
                endOfDay.setHours(23, 59, 59, 999);
            }

            query.createdAt = { $gte: startOfDay, $lte: endOfDay };
        }

        const TaskActivity = require('../models/TaskActivity');
        const activities = await TaskActivity.find(query).sort({ createdAt: -1 });
        res.json(activities);
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
            
            const isCreator = task.creatorId === userId;
            const isLegacyAssignee = !task.creatorId && task.assigneeId === userId;

            if (!isCreator && !isLegacyAssignee) {
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
    try {
        // Enforce timer check for non-admin/owner roles
        if (req.user.role !== 'admin' && req.user.role !== 'owner') {
            const TimeEntry = require('../models/TimeEntry');
            const runningTimer = await TimeEntry.findOne({
                userId: req.user._id,
                isRunning: true
            });
            if (!runningTimer) {
                return res.status(400).json({
                    message: 'You have to start the timer first or you have to like log in'
                });
            }
        }

        const taskData = {
            ...req.body,
            creatorId: req.user._id.toString()
        };
        const task = new Task(taskData);
        const newTask = await task.save();
        await updateProjectProgress(newTask.projectId);

        // Log task activity
        try {
            const TaskActivity = require('../models/TaskActivity');
            const User = require('../models/User');
            let assigneeName = '';
            if (newTask.assigneeId) {
                const assignee = await User.findById(newTask.assigneeId);
                if (assignee) assigneeName = assignee.name;
            }
            await TaskActivity.create({
                taskId: newTask._id.toString(),
                taskTitle: newTask.title,
                userId: req.user._id.toString(),
                userName: req.user.name,
                taskAssigneeId: newTask.assigneeId ? newTask.assigneeId.toString() : '',
                taskAssigneeName: assigneeName,
                taskStatus: newTask.status,
                actionType: 'create',
                newStatus: newTask.status,
                details: `created the task "${newTask.title}"`
            });
        } catch (actErr) {
            console.error('Task activity creation error:', actErr);
        }

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
            
            const allowedFields = ['status', 'description'];
            for (const key of Object.keys(req.body)) {
                if (!allowedFields.includes(key) && req.body[key] !== undefined) {
                    let dbVal = task[key];
                    let reqVal = req.body[key];

                    // Normalize dates
                    if (key === 'dueDate') {
                        const dbTime = dbVal ? new Date(dbVal).getTime() : 0;
                        const reqTime = reqVal ? new Date(reqVal).getTime() : 0;
                        if (dbTime !== reqTime) {
                            return res.status(403).json({ message: 'Clients can only update task status and description' });
                        }
                        continue;
                    }

                    // Normalize empty/null/undefined
                    if (dbVal === null || dbVal === undefined) dbVal = '';
                    if (reqVal === null || reqVal === undefined) reqVal = '';

                    if (dbVal.toString() !== reqVal.toString()) {
                        return res.status(403).json({ message: 'Clients can only update task status and description' });
                    }
                }
            }

            // Clean req.body to only contain status and description so that other fields are not mutated
            for (const key of Object.keys(req.body)) {
                if (!allowedFields.includes(key)) {
                    delete req.body[key];
                }
            }
        } else if (req.user.role !== 'admin' && req.user.role !== 'owner') {
            const userId = req.user._id.toString();

            const isCreator = task.creatorId === userId;
            const isLegacyAssignee = !task.creatorId && task.assigneeId?.toString() === userId;

            if (!isCreator && !isLegacyAssignee) {
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

        // Log task activity
        try {
            const TaskActivity = require('../models/TaskActivity');
            const User = require('../models/User');
            const oldStatus = task.status;
            const newStatus = req.body.status || task.status;
            const finalAssigneeId = req.body.assigneeId || task.assigneeId;
            let assigneeName = '';
            if (finalAssigneeId) {
                const assignee = await User.findById(finalAssigneeId);
                if (assignee) assigneeName = assignee.name;
            }
            let actionType = 'update';
            let details = `updated task details`;

            if (req.body.status && req.body.status !== oldStatus) {
                actionType = 'status_change';
                details = `changed status from "${oldStatus}" to "${req.body.status}"`;
            }

            await TaskActivity.create({
                taskId: task._id.toString(),
                taskTitle: req.body.title || task.title,
                userId: req.user._id.toString(),
                userName: req.user.name,
                taskAssigneeId: finalAssigneeId ? finalAssigneeId.toString() : '',
                taskAssigneeName: assigneeName,
                taskStatus: newStatus,
                actionType,
                oldStatus,
                newStatus,
                details
            });
        } catch (actErr) {
            console.error('Task activity update error:', actErr);
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

            const isCreator = task.creatorId === userId;
            const isLegacyAssignee = !task.creatorId && task.assigneeId?.toString() === userId;

            if (!isCreator && !isLegacyAssignee) {
                return res.status(403).json({ message: 'Not authorized to delete this task' });
            }
        }

        // Log task activity
        try {
            const TaskActivity = require('../models/TaskActivity');
            const User = require('../models/User');
            let assigneeName = '';
            if (task.assigneeId) {
                const assignee = await User.findById(task.assigneeId);
                if (assignee) assigneeName = assignee.name;
            }
            await TaskActivity.create({
                taskId: task._id.toString(),
                taskTitle: task.title,
                userId: req.user._id.toString(),
                userName: req.user.name,
                taskAssigneeId: task.assigneeId ? task.assigneeId.toString() : '',
                taskAssigneeName: assigneeName,
                taskStatus: task.status,
                actionType: 'delete',
                oldStatus: task.status,
                newStatus: task.status,
                details: `deleted task "${task.title}"`
            });
        } catch (actErr) {
            console.error('Task activity delete error:', actErr);
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
