const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Task = require('../models/Task');
const Project = require('../models/Project');
const { protect, authorize } = require('../middleware/authMiddleware');
const { assertProjectAccess } = require('../utils/assertAccess');

const normalizeTaskRole = (role) => String(role || '').trim().toLowerCase();

const canManageProjectTask = async (req, task) => {
    const userId = req.user._id.toString();
    if (task.creatorId?.toString() === userId || task.assigneeId?.toString() === userId) {
        return true;
    }
    if (normalizeTaskRole(req.user.role) === 'pm' && task.projectId) {
        const project = await Project.findById(task.projectId).select('pmId');
        if (project && project.pmId?.toString() === userId) {
            return true;
        }
    }
    return false;
};

const canAccessTask = async (req, task) => {
    if (!req.user || !task) return { ok: false, status: 401, message: 'Not authorized' };
    if (req.user.role === 'admin' || req.user.role === 'owner') return { ok: true };
    if (req.user.role === 'client') {
        const project = await Project.findById(task.projectId);
        if (!project || String(project.clientId || '') !== String(req.user.clientId || '')) {
            return { ok: false, status: 403, message: 'Not authorized' };
        }
        return { ok: true };
    }
    const userId = req.user._id.toString();
    if (task.creatorId === userId || task.assigneeId === userId) return { ok: true };
    if (task.projectId) {
        const project = await Project.findById(task.projectId);
        if (project) return await assertProjectAccess(req, project);
    }
    return { ok: false, status: 403, message: 'Not authorized to access this task' };
};

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

// My Day — assignee=me + due today/overdue + starred (parents only on board elsewhere)
router.get('/my-day', protect, async (req, res) => {
    try {
        const userId = req.user._id.toString();
        const start = new Date();
        start.setHours(0, 0, 0, 0);
        const end = new Date();
        end.setHours(23, 59, 59, 999);

        const tasks = await Task.find({
            $and: [
                { $or: [{ parentId: { $exists: false } }, { parentId: null }, { parentId: '' }] },
                { status: { $nin: ['done', 'completed'] } },
                {
                    $or: [
                        { assigneeId: userId, dueDate: { $lte: end } },
                        { assigneeId: userId, starred: true },
                        { creatorId: userId, dueDate: { $lte: end } },
                        { creatorId: userId, starred: true }
                    ]
                }
            ]
        }).sort({ dueDate: 1, priority: -1 });

        res.json(tasks);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Subtasks for a parent
router.get('/:id/subtasks', protect, async (req, res) => {
    try {
        const parent = await Task.findById(req.params.id);
        if (!parent) return res.status(404).json({ message: 'Parent task not found' });
        const access = await canAccessTask(req, parent);
        if (!access.ok) return res.status(access.status).json({ message: access.message });

        const subtasks = await Task.find({ parentId: req.params.id }).sort({ createdAt: 1 });
        res.json(subtasks);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.post('/:id/subtasks', protect, async (req, res) => {
    try {
        if (req.user.role === 'client') {
            return res.status(403).json({ message: 'Clients are not permitted to create subtasks' });
        }
        const parent = await Task.findById(req.params.id);
        if (!parent) return res.status(404).json({ message: 'Parent task not found' });
        const access = await canAccessTask(req, parent);
        if (!access.ok) return res.status(access.status).json({ message: access.message });

        const sub = await Task.create({
            title: req.body.title || 'Subtask',
            description: req.body.description || '',
            projectId: parent.projectId,
            status: 'todo',
            priority: req.body.priority || parent.priority || 'medium',
            assigneeId: req.body.assigneeId || parent.assigneeId,
            dueDate: req.body.dueDate || parent.dueDate,
            parentId: parent._id.toString(),
            creatorId: req.user._id.toString(),
            checklist: []
        });
        res.status(201).json(sub);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// GET all tasks (optional filter by projectId)
router.get('/', protect, async (req, res) => {
    try {
        const conditions = [];
        if (req.query.projectId) conditions.push({ projectId: req.query.projectId });
        if (req.query.assigneeId) conditions.push({ assigneeId: req.query.assigneeId });
        // Board default: hide subtasks unless explicitly requested
        if (req.query.includeSubtasks !== 'true') {
            conditions.push({ $or: [{ parentId: { $exists: false } }, { parentId: null }, { parentId: '' }] });
        }

        const role = normalizeTaskRole(req.user.role);
        if (role === 'client') {
            const myProjects = await Project.find({ clientId: req.user.clientId }).select('_id');
            const myProjectIds = myProjects.map(p => p._id.toString());
            conditions.push({ projectId: { $in: myProjectIds } });
        } else if (role !== 'admin' && role !== 'owner') {
            const userId = req.user._id.toString();
            // Staff see tasks assigned to them or created by them; PMs also see tasks in projects they manage
            const aclOr = [
                { creatorId: userId },
                { assigneeId: userId }
            ];
            if (role === 'pm') {
                const managedProjects = await Project.find({ pmId: userId }).select('_id');
                const managedProjectIds = managedProjects.map(p => p._id.toString());
                if (managedProjectIds.length > 0) {
                    aclOr.push({ projectId: { $in: managedProjectIds } });
                }
            }
            conditions.push({ $or: aclOr });
        }

        const query = conditions.length > 0 ? { $and: conditions } : {};
        const tasks = await Task.find(query).sort({ createdAt: -1 });
        res.json(tasks);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// GET team resource capacity & workload distribution
router.get('/capacity', protect, async (req, res) => {
    try {
        if (req.user.role === 'client') {
            return res.status(403).json({ message: 'Clients cannot access team capacity' });
        }

        const User = require('../models/User');
        const users = await User.find({ role: { $ne: 'client' } }).select('name email role avatar designation department');

        const now = new Date();
        const tasks = await Task.find({ status: { $ne: 'archived' } }).populate('projectId', 'name');

        const capacityData = users.map(user => {
            const userId = user._id.toString();
            const userTasks = tasks.filter(t => t.assigneeId?.toString() === userId);

            const todoCount = userTasks.filter(t => t.status === 'todo').length;
            const inProgressCount = userTasks.filter(t => t.status === 'in-progress' || t.status === 'in_progress').length;
            const reviewCount = userTasks.filter(t => t.status === 'review').length;
            const doneCount = userTasks.filter(t => t.status === 'done' || t.status === 'completed').length;
            const totalActive = todoCount + inProgressCount + reviewCount;

            const overdueCount = userTasks.filter(t => {
                if (t.status === 'done' || t.status === 'completed' || !t.dueDate) return false;
                return new Date(t.dueDate) < now;
            }).length;

            // Workload load score (0 to 100+): assuming max standard active concurrency is 6 tasks
            const maxIdealTasks = 6;
            const loadScore = Math.min(100, Math.round((totalActive / maxIdealTasks) * 100));

            let status = 'healthy';
            if (loadScore > 85 || overdueCount >= 2) status = 'overloaded';
            else if (loadScore >= 50) status = 'optimal';
            else if (loadScore === 0) status = 'available';

            return {
                user: {
                    id: user._id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    avatar: user.avatar,
                    designation: user.designation,
                    department: user.department
                },
                stats: {
                    totalTasks: userTasks.length,
                    activeTasks: totalActive,
                    todo: todoCount,
                    inProgress: inProgressCount,
                    review: reviewCount,
                    done: doneCount,
                    overdue: overdueCount,
                    loadScore,
                    status
                },
                tasks: userTasks.slice(0, 15).map(t => ({
                    id: t._id,
                    title: t.title,
                    status: t.status,
                    priority: t.priority,
                    dueDate: t.dueDate,
                    projectName: t.projectId?.name || 'General'
                }))
            };
        });

        res.json(capacityData);
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

const notifyTaskAssignee = async (task, actor, isReassign = false) => {
    try {
        const assigneeId = task.assigneeId?.toString();
        if (!assigneeId || !mongoose.Types.ObjectId.isValid(assigneeId)) return;
        if (String(assigneeId) === String(actor._id)) return;
        const Notification = require('../models/Notification');
        await Notification.create({
            userId: assigneeId,
            title: isReassign ? 'Task Assigned to You' : 'New Task Assigned',
            message: `${actor.name || 'Admin'} assigned task "${task.title}" to you.`,
            type: 'new_task',
            relatedId: task._id.toString()
        });
    } catch (nErr) {
        console.error('Notif Error:', nErr);
    }
};

// GET single task
router.get('/:id', protect, async (req, res) => {
    try {
        const task = await Task.findById(req.params.id);
        if (!task) return res.status(404).json({ message: 'Task not found' });

        // RBAC Check
        const role = normalizeTaskRole(req.user.role);
        if (role === 'client') {
            const project = await Project.findById(task.projectId);
            if (!project || String(project.clientId || '') !== String(req.user.clientId || '')) {
                return res.status(403).json({ message: 'Not authorized' });
            }
        } else if (role !== 'admin' && role !== 'owner') {
            const allowed = await canManageProjectTask(req, task);
            if (!allowed) {
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
        const role = normalizeTaskRole(req.user.role);
        if (role === 'client') {
            return res.status(403).json({ message: 'Clients are not permitted to create internal tasks' });
        }
        if (req.body.projectId && role !== 'admin' && role !== 'owner') {
            const project = await Project.findById(req.body.projectId);
            if (!project) return res.status(404).json({ message: 'Project not found' });
            const access = await assertProjectAccess(req, project);
            if (!access.ok) return res.status(access.status).json({ message: access.message });
        }

        // Enforce shift (attendance) or timer check for non-admin/owner roles
        if (role !== 'admin' && role !== 'owner') {
            const TimeEntry = require('../models/TimeEntry');
            const Attendance = require('../models/Attendance');

            const runningTimer = await TimeEntry.findOne({
                userId: req.user._id,
                isRunning: true
            });

            let isClockedIn = false;
            try {
                const now = new Date();
                const localTime = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
                const today = new Date(Date.UTC(localTime.getUTCFullYear(), localTime.getUTCMonth(), localTime.getUTCDate()));

                const attendance = await Attendance.findOne({
                    userId: req.user._id.toString(),
                    date: today
                });
                if (attendance && attendance.checkIn && !attendance.checkOut && (attendance.status === 'present' || attendance.status === 'on-break')) {
                    isClockedIn = true;
                }
            } catch (attErr) {
                console.error("Attendance check error in task creation:", attErr);
            }

            if (!runningTimer && !isClockedIn) {
                return res.status(400).json({
                    message: 'You must clock in (start your session) or start a task timer before creating a task.'
                });
            }
        }

        const taskData = {
            ...req.body,
            creatorId: req.user._id.toString()
        };
        if (!taskData.assigneeId) {
            delete taskData.assigneeId;
        }
        if (!taskData.slaDueAt && taskData.priority) {
            const hours = { urgent: 8, high: 24, medium: 72, low: 168 }[taskData.priority] || 72;
            taskData.slaDueAt = new Date(Date.now() + hours * 60 * 60 * 1000);
        }
        if (taskData.recurrence?.enabled && taskData.recurrence?.frequency && taskData.recurrence.frequency !== 'none') {
            const next = new Date();
            if (taskData.recurrence.frequency === 'daily') next.setDate(next.getDate() + (taskData.recurrence.interval || 1));
            else if (taskData.recurrence.frequency === 'weekly') next.setDate(next.getDate() + 7 * (taskData.recurrence.interval || 1));
            else if (taskData.recurrence.frequency === 'monthly') next.setMonth(next.getMonth() + (taskData.recurrence.interval || 1));
            taskData.recurrence.nextRunAt = next;
        }
        const task = new Task(taskData);
        const newTask = await task.save();
        await updateProjectProgress(newTask.projectId);

        // Log task activity
        try {
            const TaskActivity = require('../models/TaskActivity');
            const User = require('../models/User');
            let assigneeName = '';
            if (newTask.assigneeId && mongoose.Types.ObjectId.isValid(newTask.assigneeId)) {
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

        // Trigger Notification for assignee
        await notifyTaskAssignee(newTask, req.user, false);

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
        const role = normalizeTaskRole(req.user.role);
        if (role === 'client') {
            const project = await Project.findById(task.projectId);
            if (!project || String(project.clientId || '') !== String(req.user.clientId || '')) {
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
        } else if (role !== 'admin' && role !== 'owner') {
            const allowed = await canManageProjectTask(req, task);
            if (!allowed) {
                console.warn(`Unauthorized task update attempt by user ${req.user._id.toString()} on task ${req.params.id}. Roles: ${req.user.role}`);
                return res.status(403).json({ message: 'Not authorized to update this task' });
            }
        }

        // If status is updated to anything other than 'in-progress', automatically stop any running timer
        if (req.body.status && req.body.status !== 'in-progress') {
            try {
                const TimeEntry = require('../models/TimeEntry');
                const runningEntries = await TimeEntry.find({ taskId: req.params.id, isRunning: true });

                if (runningEntries.length > 0 || task.isTimerRunning) {
                    const now = Date.now();
                    let extraTime = 0;

                    if (task.lastStartTime) {
                        extraTime = Math.max(0, now - task.lastStartTime);
                    } else if (runningEntries.length > 0) {
                        const startTimes = runningEntries.map(e => new Date(e.startTime).getTime());
                        const minStart = Math.min(...startTimes);
                        extraTime = Math.max(0, now - minStart);
                    }

                    req.body.isTimerRunning = false;
                    req.body.totalTimeSpent = (task.totalTimeSpent || 0) + extraTime;
                    req.body.lastStartTime = null;
                    req.body.timeEntryId = null;

                    for (const entry of runningEntries) {
                        entry.endTime = new Date();
                        entry.isRunning = false;
                        const start = new Date(entry.startTime);
                        entry.duration = Math.max(0, Math.floor((entry.endTime - start) / 1000 / 60)); // minutes
                        await entry.save();
                    }
                }
            } catch (timerErr) {
                console.error('Failed to auto-stop time entries for task:', timerErr);
            }
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

        // SLA defaults by priority (additive)
        if (req.body.priority && !req.body.slaDueAt && !task.slaDueAt) {
            const hours = { urgent: 8, high: 24, medium: 72, low: 168 }[req.body.priority] || 72;
            req.body.slaDueAt = new Date(Date.now() + hours * 60 * 60 * 1000);
        }

        const editableFields = [
            'title', 'description', 'status', 'priority', 'assigneeId', 'dueDate',
            'estimatedHours', 'labels', 'attachments', 'checklist', 'starred',
            'recurrence', 'ticketId', 'slaDueAt',
            'isTimerRunning', 'totalTimeSpent', 'lastStartTime', 'timeEntryId'
        ];
        if (role === 'admin' || role === 'owner') {
            editableFields.push('projectId');
        }
        const safeUpdate = { updatedAt: new Date() };
        for (const field of editableFields) {
            if (req.body[field] !== undefined) safeUpdate[field] = req.body[field];
        }

        const updatedTask = await Task.findByIdAndUpdate(req.params.id, safeUpdate, {
            new: true,
            runValidators: true
        });
        // Recalculate progress for the project(s)
        await updateProjectProgress(updatedTask.projectId);
        if (task.projectId && String(task.projectId) !== String(updatedTask.projectId || '')) {
            await updateProjectProgress(task.projectId);
        }

        if (safeUpdate.assigneeId && String(safeUpdate.assigneeId) !== String(task.assigneeId || '')) {
            await notifyTaskAssignee(updatedTask, req.user, true);
        }

        // @mentions in description → in-app notifications
        try {
            const text = `${req.body.description || ''} ${req.body.title || ''}`;
            const mentions = [...text.matchAll(/@([A-Za-z][A-Za-z0-9._ -]{1,40})/g)].map(m => m[1].trim());
            if (mentions.length) {
                const User = require('../models/User');
                const Notification = require('../models/Notification');
                const users = await User.find({ role: { $ne: 'client' } }).select('name');
                for (const mention of mentions) {
                    const match = users.find(u => u.name && u.name.toLowerCase().includes(mention.toLowerCase()));
                    if (match && String(match._id) !== String(req.user._id)) {
                        await Notification.create({
                            userId: match._id.toString(),
                            title: 'You were mentioned in a task',
                            message: `${req.user.name} mentioned you in "${updatedTask.title}"`,
                            type: 'task_mention',
                            relatedId: updatedTask._id.toString()
                        });
                    }
                }
            }
        } catch (mErr) {
            console.error('Mention notify error:', mErr.message);
        }

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

        // RBAC Check (Only Admin/Owner/Creator/Project PM can delete)
        const deleteRole = normalizeTaskRole(req.user.role);
        if (deleteRole === 'client') {
            return res.status(403).json({ message: 'Clients cannot delete tasks' });
        } else if (deleteRole !== 'admin' && deleteRole !== 'owner') {
            const userId = req.user._id.toString();

            const isCreator = task.creatorId?.toString() === userId;
            const isLegacyAssignee = !task.creatorId && task.assigneeId?.toString() === userId;
            let isProjectPM = false;
            if (deleteRole === 'pm' && task.projectId) {
                const proj = await Project.findById(task.projectId).select('pmId');
                isProjectPM = !!(proj && proj.pmId?.toString() === userId);
            }

            if (!isCreator && !isLegacyAssignee && !isProjectPM) {
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
