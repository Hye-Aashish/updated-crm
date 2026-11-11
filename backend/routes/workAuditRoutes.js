const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const User = require('../models/User');
const Attendance = require('../models/Attendance');
const Task = require('../models/Task');
const TaskActivity = require('../models/TaskActivity');
const TimeEntry = require('../models/TimeEntry');
const Project = require('../models/Project');
const ProjectActivity = require('../models/ProjectActivity');
const ProjectCheckpoint = require('../models/ProjectCheckpoint');
const ProjectBug = require('../models/ProjectBug');
const Lead = require('../models/Lead');
const SalesActivityAudit = require('../models/SalesActivityAudit');
const CalendarEvent = require('../models/CalendarEvent');
const Ticket = require('../models/Ticket');

const normalizeRole = (role) => String(role || '').trim().toLowerCase();

const requireAdminOrOwner = (req, res, next) => {
    const role = normalizeRole(req.user?.role);
    if (role !== 'admin' && role !== 'owner') {
        return res.status(403).json({ message: 'Access denied. Admin or Owner access required.' });
    }
    next();
};

const parseLocalDateBounds = (startStr, endStr, preset) => {
    const now = new Date();
    const parseYmd = (ymd, endOfDay = false) => {
        if (!ymd || !/^\d{4}-\d{2}-\d{2}$/.test(String(ymd))) return null;
        const [y, m, d] = String(ymd).split('-').map(Number);
        return endOfDay
            ? new Date(y, m - 1, d, 23, 59, 59, 999)
            : new Date(y, m - 1, d, 0, 0, 0, 0);
    };

    let start = parseYmd(startStr, false);
    let end = parseYmd(endStr, true);

    if (!start || !end) {
        if (preset === 'yesterday') {
            start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0, 0);
            end = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999);
        } else if (preset === '7days') {
            start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6, 0, 0, 0, 0);
            end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
        } else if (preset === 'month') {
            start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
            end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        } else {
            // Default: today
            start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
            end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
        }
    }

    if (end < start) {
        end = new Date(start.getFullYear(), start.getMonth(), start.getDate(), 23, 59, 59, 999);
    }

    const fmt = (dt) => {
        const y = dt.getFullYear();
        const m = String(dt.getMonth() + 1).padStart(2, '0');
        const d = String(dt.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    };

    return { start, end, startStr: fmt(start), endStr: fmt(end) };
};

const formatMinsShort = (mins) => {
    const m = Math.max(0, Math.round(Number(mins) || 0));
    const h = Math.floor(m / 60);
    const rem = m % 60;
    if (h === 0) return `${rem}m`;
    return `${h}h ${rem}m`;
};

const isDoneStatus = (s) => ['done', 'completed', 'closed', 'resolved'].includes(String(s || '').toLowerCase());

/**
 * GET /api/work-audit
 * Admin/Owner-only unified audit trail across attendance, tasks, time logs,
 * projects/checkpoints/bugs, sales follow-ups, tickets, and calendar events,
 * plus missed work / inactive employees for the selected date range.
 */
router.get('/', protect, requireAdminOrOwner, async (req, res) => {
    try {
        const { startDate, endDate, preset = 'today', userId = 'all', category = 'all' } = req.query;
        const { start, end, startStr, endStr } = parseLocalDateBounds(startDate, endDate, preset);
        const filterUserId = userId && userId !== 'all' ? String(userId) : null;

        const staffUsers = await User.find({ role: { $ne: 'client' } })
            .select('_id name email role designation department avatar')
            .sort({ name: 1 })
            .lean();

        const userMap = new Map();
        staffUsers.forEach((u) => {
            userMap.set(u._id.toString(), {
                id: u._id.toString(),
                name: u.name || 'Unknown',
                email: u.email || '',
                role: u.role || 'employee',
                designation: u.designation || '',
                department: u.department || '',
                avatar: u.avatar || ''
            });
        });

        const projectsList = await Project.find().select('_id name status pmId').lean();
        const projectMap = new Map();
        projectsList.forEach((p) => {
            projectMap.set(p._id.toString(), p);
        });

        // Build per-employee accumulator
        const empStatsMap = new Map();
        staffUsers.forEach((u) => {
            const uid = u._id.toString();
            empStatsMap.set(uid, {
                userId: uid,
                name: u.name || 'Unknown',
                email: u.email || '',
                role: u.role || 'employee',
                designation: u.designation || '',
                department: u.department || '',
                attendanceStatus: 'no-checkin',
                attendanceDaysPresent: 0,
                checkIn: null,
                checkOut: null,
                totalBreakMinutes: 0,
                timeLoggedMinutes: 0,
                timeSessionsCount: 0,
                totalEvents: 0,
                tasksCreated: 0,
                tasksCompleted: 0,
                taskStatusChanges: 0,
                salesCallsAndFollowups: 0,
                projectAndBugActions: 0,
                ticketActions: 0,
                calendarEventsCount: 0,
                overdueAssignedTasksCount: 0,
                pendingAssignedTasksCount: 0,
                hadAnyActivity: false,
                highlights: []
            });
        });

        const addHighlight = (uid, text) => {
            const stat = empStatsMap.get(uid);
            if (!stat || !text) return;
            if (stat.highlights.length < 4 && !stat.highlights.includes(text)) {
                stat.highlights.push(text);
            }
        };

        const timeline = [];
        const pushEvent = (evt) => {
            const actorId = evt.userId ? String(evt.userId) : '';
            if (filterUserId && actorId !== filterUserId) return;
            if (category !== 'all' && evt.category !== category) return;

            timeline.push(evt);
            const stat = empStatsMap.get(actorId);
            if (stat) {
                stat.totalEvents += 1;
                stat.hadAnyActivity = true;
            }
        };

        const dateRangeQuery = { $gte: start, $lte: end };

        // Fetch all datasets in parallel (lean for speed)
        const [
            attendances,
            taskActivities,
            tasksInRange,
            overdueOrPendingTasks,
            timeEntries,
            projectActivities,
            checkpointsUpdated,
            bugsUpdated,
            salesAudits,
            leadsWithActivity,
            missedReminderLeads,
            calendarEvents,
            ticketsUpdated
        ] = await Promise.all([
            Attendance.find({
                $or: [{ date: dateRangeQuery }, { checkIn: dateRangeQuery }]
            }).lean(),
            TaskActivity.find({ createdAt: dateRangeQuery }).sort({ createdAt: -1 }).lean(),
            Task.find({
                $or: [{ createdAt: dateRangeQuery }, { updatedAt: dateRangeQuery }]
            }).select('_id title status priority projectId assigneeId creatorId dueDate createdAt updatedAt').lean(),
            Task.find({
                status: { $nin: ['done', 'completed'] },
                dueDate: { $lte: end }
            }).select('_id title status priority projectId assigneeId creatorId dueDate').lean(),
            TimeEntry.find({
                $or: [{ startTime: dateRangeQuery }, { endTime: dateRangeQuery }]
            })
                .populate('userId', 'name role')
                .populate('projectId', 'name')
                .populate('taskId', 'title')
                .sort({ startTime: -1 })
                .lean(),
            ProjectActivity.find({ createdAt: dateRangeQuery }).sort({ createdAt: -1 }).lean(),
            ProjectCheckpoint.find({
                $or: [{ updatedAt: dateRangeQuery }, { completionDate: dateRangeQuery }]
            }).lean(),
            ProjectBug.find({
                $or: [{ createdAt: dateRangeQuery }, { updatedAt: dateRangeQuery }]
            }).lean(),
            SalesActivityAudit.find({ timestamp: dateRangeQuery }).sort({ timestamp: -1 }).lean(),
            Lead.find({
                archived: { $ne: true },
                $or: [
                    { createdAt: dateRangeQuery },
                    { assignedAt: dateRangeQuery },
                    { 'activities.createdAt': dateRangeQuery }
                ]
            }).select('_id name company stage assignedTo assignedToName createdBy createdByName assignedAt createdAt activities').lean(),
            Lead.find({
                archived: { $ne: true },
                'reminder.completed': false,
                'reminder.date': { $lte: end }
            }).select('_id name company stage assignedTo assignedToName reminder').lean(),
            CalendarEvent.find({
                $or: [{ startAt: dateRangeQuery }, { createdAt: dateRangeQuery }]
            }).lean(),
            Ticket.find({
                $or: [{ createdAt: dateRangeQuery }, { updatedAt: dateRangeQuery }]
            }).lean()
        ]);

        // 1. Process Attendance
        attendances.forEach((att) => {
            const uid = String(att.userId || '');
            const u = userMap.get(uid);
            const stat = empStatsMap.get(uid);

            if (stat) {
                stat.hadAnyActivity = true;
                if (att.checkIn) {
                    stat.attendanceDaysPresent += 1;
                    if (!stat.checkIn || new Date(att.checkIn) > new Date(stat.checkIn)) {
                        stat.checkIn = att.checkIn;
                    }
                }
                if (att.checkOut && (!stat.checkOut || new Date(att.checkOut) > new Date(stat.checkOut))) {
                    stat.checkOut = att.checkOut;
                }
                stat.totalBreakMinutes += Number(att.totalBreakTime) || 0;
                if (att.status && att.status !== 'absent') {
                    stat.attendanceStatus = att.status;
                } else if (stat.attendanceStatus === 'no-checkin') {
                    stat.attendanceStatus = att.status || 'absent';
                }
            }

            if (att.checkIn) {
                const inTime = new Date(att.checkIn);
                if (inTime >= start && inTime <= end) {
                    pushEvent({
                        id: `att-in-${att._id}`,
                        timestamp: inTime,
                        category: 'attendance',
                        action: 'Clocked In',
                        title: `${u?.name || 'Employee'} started shift`,
                        description: att.note ? `Status: ${att.status} • Note: ${att.note}` : `Shift status: ${att.status || 'present'}`,
                        userId: uid,
                        userName: u?.name || 'Unknown',
                        userRole: u?.role || '',
                        badge: 'Clock In',
                        tone: 'emerald',
                        link: '/attendance'
                    });
                    addHighlight(uid, `Clocked in at ${inTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`);
                }
            }

            if (att.checkOut) {
                const outTime = new Date(att.checkOut);
                if (outTime >= start && outTime <= end) {
                    pushEvent({
                        id: `att-out-${att._id}`,
                        timestamp: outTime,
                        category: 'attendance',
                        action: 'Clocked Out',
                        title: `${u?.name || 'Employee'} ended shift`,
                        description: `Work: ${formatMinsShort(att.totalWorkTime)} • Break: ${formatMinsShort(att.totalBreakTime)}`,
                        userId: uid,
                        userName: u?.name || 'Unknown',
                        userRole: u?.role || '',
                        badge: formatMinsShort(att.totalWorkTime),
                        tone: 'slate',
                        link: '/attendance'
                    });
                }
            }

            if (Array.isArray(att.breaks)) {
                att.breaks.forEach((brk, idx) => {
                    if (brk?.start) {
                        const bs = new Date(brk.start);
                        if (bs >= start && bs <= end) {
                            const mins = brk.end ? Math.max(0, Math.round((new Date(brk.end) - bs) / 60000)) : null;
                            pushEvent({
                                id: `att-brk-${att._id}-${idx}`,
                                timestamp: bs,
                                category: 'attendance',
                                action: brk.end ? 'Break Completed' : 'Break Started',
                                title: `${u?.name || 'Employee'} took a break`,
                                description: mins !== null ? `Break duration: ${formatMinsShort(mins)}` : 'Break currently active',
                                userId: uid,
                                userName: u?.name || 'Unknown',
                                userRole: u?.role || '',
                                badge: mins !== null ? `${mins}m break` : 'On Break',
                                tone: 'amber',
                                link: '/attendance'
                            });
                        }
                    }
                });
            }
        });

        // 2. Process TaskActivity + Tasks without TaskActivity logs
        const seenTaskIdsWithActivity = new Set();
        taskActivities.forEach((act) => {
            const uid = String(act.userId || '');
            const stat = empStatsMap.get(uid);
            const u = userMap.get(uid);
            seenTaskIdsWithActivity.add(String(act.taskId));

            const isCompletedAction = act.actionType === 'status_change' && isDoneStatus(act.newStatus);
            if (stat) {
                stat.hadAnyActivity = true;
                if (act.actionType === 'create') stat.tasksCreated += 1;
                if (act.actionType === 'status_change') stat.taskStatusChanges += 1;
                if (isCompletedAction) stat.tasksCompleted += 1;
            }

            const actionLabelMap = {
                create: 'Task Created',
                status_change: isCompletedAction ? 'Task Completed' : 'Task Status Changed',
                update: 'Task Updated',
                delete: 'Task Deleted',
                timer_start: 'Task Timer Started',
                timer_stop: 'Task Timer Stopped'
            };

            const descParts = [];
            if (act.details) descParts.push(act.details);
            if (act.oldStatus && act.newStatus) descParts.push(`${act.oldStatus} → ${act.newStatus}`);
            if (act.taskAssigneeName && act.taskAssigneeId !== uid) {
                descParts.push(`Assigned to ${act.taskAssigneeName}`);
            }

            pushEvent({
                id: `tact-${act._id}`,
                timestamp: act.createdAt,
                category: 'tasks',
                action: actionLabelMap[act.actionType] || 'Task Activity',
                title: act.taskTitle || 'Untitled Task',
                description: descParts.join(' • ') || 'Task activity logged',
                userId: uid,
                userName: act.userName || u?.name || 'Unknown',
                userRole: u?.role || '',
                badge: isCompletedAction ? 'Completed' : (act.newStatus || act.actionType).replace(/[_-]/g, ' '),
                tone: isCompletedAction ? 'emerald' : act.actionType === 'delete' ? 'rose' : 'blue',
                link: act.actionType !== 'delete' && act.taskId ? `/tasks/${act.taskId}` : '/tasks'
            });
            addHighlight(uid, `${isCompletedAction ? 'Completed' : 'Updated'}: ${act.taskTitle}`);
        });

        // Fallback for tasks created/completed directly inside range without TaskActivity entry
        tasksInRange.forEach((task) => {
            const tid = task._id.toString();
            if (seenTaskIdsWithActivity.has(tid)) return;
            const projName = projectMap.get(String(task.projectId || ''))?.name || 'Project';
            const createdInRange = task.createdAt && new Date(task.createdAt) >= start && new Date(task.createdAt) <= end;
            const actorId = String((createdInRange ? task.creatorId : null) || task.assigneeId || task.creatorId || '');
            const u = userMap.get(actorId);
            const stat = empStatsMap.get(actorId);
            const completedNow = isDoneStatus(task.status) && task.updatedAt && new Date(task.updatedAt) >= start && new Date(task.updatedAt) <= end;

            if (stat) {
                stat.hadAnyActivity = true;
                if (createdInRange) stat.tasksCreated += 1;
                if (completedNow) stat.tasksCompleted += 1;
            }

            pushEvent({
                id: `task-${tid}`,
                timestamp: createdInRange ? task.createdAt : task.updatedAt,
                category: 'tasks',
                action: createdInRange ? 'Task Created' : completedNow ? 'Task Completed' : 'Task Updated',
                title: task.title,
                description: `Status: ${task.status}${task.assigneeId && userMap.get(String(task.assigneeId)) ? ` • Assignee: ${userMap.get(String(task.assigneeId)).name}` : ''}`,
                userId: actorId,
                userName: u?.name || 'Unknown',
                userRole: u?.role || '',
                projectName: projName,
                badge: task.status,
                tone: completedNow ? 'emerald' : 'blue',
                link: `/tasks/${tid}`
            });
        });

        // 3. Process TimeEntry Sessions
        let totalTimeLoggedMinutes = 0;
        timeEntries.forEach((entry) => {
            const uid = entry.userId?._id ? entry.userId._id.toString() : String(entry.userId || '');
            const uName = entry.userId?.name || userMap.get(uid)?.name || 'Unknown';
            const uRole = entry.userId?.role || userMap.get(uid)?.role || '';
            const projName = entry.projectId?.name || projectMap.get(String(entry.projectId || ''))?.name || 'General Project';
            const taskTitle = entry.taskId?.title || 'Project Work Log';

            const mins = entry.isRunning
                ? Math.max(0, Math.round((Date.now() - new Date(entry.startTime).getTime()) / 60000))
                : (Number(entry.duration) || 0);

            const stat = empStatsMap.get(uid);
            if (stat) {
                stat.timeLoggedMinutes += mins;
                stat.timeSessionsCount += 1;
                stat.hadAnyActivity = true;
            }

            if (!filterUserId || uid === filterUserId) {
                totalTimeLoggedMinutes += mins;
            }

            pushEvent({
                id: `time-${entry._id}`,
                timestamp: entry.startTime,
                category: 'time',
                action: entry.isRunning ? 'Timer Running' : 'Work Timer Session',
                title: taskTitle,
                description: `${projName}${entry.note ? ` • Note: ${entry.note}` : ''}`,
                userId: uid,
                userName: uName,
                userRole: uRole,
                projectName: projName,
                badge: entry.isRunning ? 'Live' : formatMinsShort(mins),
                tone: entry.isRunning ? 'emerald' : 'purple',
                link: entry.taskId?._id ? `/tasks/${entry.taskId._id}` : '/time/reports'
            });
            addHighlight(uid, `Logged ${formatMinsShort(mins)} on ${taskTitle}`);
        });

        // 4. Process Project Activities, Checkpoints & Bugs
        projectActivities.forEach((pa) => {
            const uid = String(pa.userId || '');
            const stat = empStatsMap.get(uid);
            const u = userMap.get(uid);
            const projName = projectMap.get(String(pa.projectId || ''))?.name || 'Project';
            if (stat) {
                stat.projectAndBugActions += 1;
                stat.hadAnyActivity = true;
            }
            pushEvent({
                id: `pact-${pa._id}`,
                timestamp: pa.createdAt,
                category: 'projects',
                action: pa.action ? pa.action.replace(/_/g, ' ') : 'Project Activity',
                title: projName,
                description: pa.description,
                userId: uid,
                userName: pa.userName || u?.name || 'Unknown',
                userRole: u?.role || '',
                projectName: projName,
                badge: 'Project',
                tone: 'blue',
                link: `/projects/${pa.projectId}`
            });
        });

        checkpointsUpdated.forEach((cp) => {
            const uid = String(cp.approvedBy || cp.assignedTo || '');
            const u = userMap.get(uid);
            const stat = empStatsMap.get(uid);
            const projName = projectMap.get(String(cp.projectId || ''))?.name || 'Project';
            const completed = cp.status === 'completed';
            if (stat) {
                stat.projectAndBugActions += 1;
                stat.hadAnyActivity = true;
            }
            pushEvent({
                id: `cp-${cp._id}`,
                timestamp: cp.completionDate || cp.updatedAt || cp.createdAt,
                category: 'projects',
                action: completed ? 'Checkpoint Completed' : 'Checkpoint Updated',
                title: cp.title,
                description: `${projName} • Phase: ${cp.phase} • Status: ${cp.status}`,
                userId: uid,
                userName: u?.name || 'Project Team',
                userRole: u?.role || '',
                projectName: projName,
                badge: cp.status.replace(/_/g, ' '),
                tone: completed ? 'emerald' : 'amber',
                link: `/projects/${cp.projectId}`
            });
        });

        bugsUpdated.forEach((bug) => {
            const uid = String(bug.assignedDeveloper || bug.createdBy || '');
            const u = userMap.get(uid);
            const stat = empStatsMap.get(uid);
            const projName = projectMap.get(String(bug.projectId || ''))?.name || 'Project';
            const fixed = bug.status === 'fixed' || bug.status === 'closed';
            if (stat) {
                stat.projectAndBugActions += 1;
                stat.hadAnyActivity = true;
            }
            pushEvent({
                id: `bug-${bug._id}`,
                timestamp: bug.updatedAt || bug.createdAt,
                category: 'bugs',
                action: fixed ? 'Bug Resolved' : 'Bug Reported / Updated',
                title: bug.title,
                description: `${projName} • Severity: ${bug.severity} • Status: ${bug.status}${bug.resolution ? ` • ${bug.resolution}` : ''}`,
                userId: uid,
                userName: u?.name || 'Team Member',
                userRole: u?.role || '',
                projectName: projName,
                badge: bug.status.replace(/_/g, ' '),
                tone: fixed ? 'emerald' : 'rose',
                link: `/projects/${bug.projectId}`
            });
        });

        // 5. Process Sales Audits + Lead Subdocument Activities + Lead Creation/Assignment
        const seenSalesKeys = new Set();
        salesAudits.forEach((sa) => {
            const uid = String(sa.actorId || '');
            const stat = empStatsMap.get(uid);
            if (stat) {
                stat.salesCallsAndFollowups += 1;
                stat.hadAnyActivity = true;
            }
            seenSalesKeys.add(`${sa.leadId}-${new Date(sa.timestamp).getTime()}`);
            pushEvent({
                id: `sa-${sa._id}`,
                timestamp: sa.timestamp,
                category: 'sales',
                action: sa.eventType.replace(/_/g, ' '),
                title: sa.leadName || 'Lead Activity',
                description: sa.metadata?.note || sa.metadata?.outcome || `Entity: ${sa.entityType}`,
                userId: uid,
                userName: sa.actorName || userMap.get(uid)?.name || 'Sales',
                userRole: sa.actorRole || userMap.get(uid)?.role || '',
                badge: 'Sales',
                tone: sa.eventType === 'deal_won' ? 'emerald' : 'blue',
                link: '/leads'
            });
        });

        leadsWithActivity.forEach((lead) => {
            const leadIdStr = lead._id.toString();
            if (lead.createdAt && new Date(lead.createdAt) >= start && new Date(lead.createdAt) <= end) {
                const creatorId = String(lead.createdBy || lead.assignedTo || '');
                const u = userMap.get(creatorId);
                const stat = empStatsMap.get(creatorId);
                if (stat) {
                    stat.salesCallsAndFollowups += 1;
                    stat.hadAnyActivity = true;
                }
                pushEvent({
                    id: `lead-create-${leadIdStr}`,
                    timestamp: lead.createdAt,
                    category: 'sales',
                    action: 'Lead Added',
                    title: `${lead.name} (${lead.company})`,
                    description: `Stage: ${lead.stage}${lead.assignedToName ? ` • Assigned: ${lead.assignedToName}` : ''}`,
                    userId: creatorId,
                    userName: lead.createdByName || u?.name || 'Team',
                    userRole: u?.role || '',
                    badge: lead.stage,
                    tone: 'blue',
                    link: '/leads'
                });
            }

            if (Array.isArray(lead.activities)) {
                lead.activities.forEach((act, idx) => {
                    if (!act?.createdAt) return;
                    const actDt = new Date(act.createdAt);
                    if (actDt < start || actDt > end) return;
                    // Resolve actor by assignedTo or createdByName match
                    let actorId = String(lead.assignedTo || lead.createdBy || '');
                    if (act.createdByName) {
                        const matched = staffUsers.find((u) => u.name.toLowerCase() === String(act.createdByName).toLowerCase());
                        if (matched) actorId = matched._id.toString();
                    }
                    const stat = empStatsMap.get(actorId);
                    const u = userMap.get(actorId);
                    if (stat) {
                        stat.salesCallsAndFollowups += 1;
                        stat.hadAnyActivity = true;
                    }
                    pushEvent({
                        id: `lead-act-${leadIdStr}-${idx}`,
                        timestamp: actDt,
                        category: 'sales',
                        action: act.type === 'call' ? 'Sales Call Logged' : 'Lead Follow-up / Note',
                        title: `${lead.name} (${lead.company})`,
                        description: [act.outcome, act.content].filter(Boolean).join(' — ') || 'Interaction logged',
                        userId: actorId,
                        userName: act.createdByName || u?.name || lead.assignedToName || 'Sales',
                        userRole: u?.role || '',
                        badge: act.type || 'Note',
                        tone: 'amber',
                        link: '/leads'
                    });
                    addHighlight(actorId, `Follow-up: ${lead.name}`);
                });
            }
        });

        // 6. Calendar Events & Support Tickets
        calendarEvents.forEach((ev) => {
            const uid = String(ev.ownerId || ev.createdBy || '');
            const u = userMap.get(uid);
            const stat = empStatsMap.get(uid);
            if (stat) {
                stat.calendarEventsCount += 1;
                stat.hadAnyActivity = true;
            }
            pushEvent({
                id: `cal-${ev._id}`,
                timestamp: ev.startAt || ev.createdAt,
                category: 'calendar',
                action: `Calendar ${ev.type || 'Event'} (${ev.status})`,
                title: ev.title,
                description: [ev.clientName, ev.projectName, ev.notes].filter(Boolean).join(' • ') || 'Scheduled meeting/reminder',
                userId: uid,
                userName: ev.ownerName || u?.name || 'Team',
                userRole: u?.role || '',
                badge: ev.status,
                tone: ev.status === 'completed' ? 'emerald' : ev.status === 'no_show' ? 'rose' : 'purple',
                link: '/calendar'
            });
        });

        ticketsUpdated.forEach((tk) => {
            const uid = String(tk.assignedTo || tk.createdBy || '');
            const u = userMap.get(uid);
            const stat = empStatsMap.get(uid);
            const resolved = tk.status === 'resolved' || tk.status === 'closed';
            if (stat) {
                stat.ticketActions += 1;
                stat.hadAnyActivity = true;
            }
            pushEvent({
                id: `tkt-${tk._id}`,
                timestamp: tk.updatedAt || tk.createdAt,
                category: 'tickets',
                action: resolved ? 'Ticket Resolved' : 'Ticket Activity',
                title: tk.subject,
                description: `Status: ${tk.status} • Priority: ${tk.priority}${tk.clientName ? ` • Client: ${tk.clientName}` : ''}`,
                userId: uid,
                userName: u?.name || 'Support',
                userRole: u?.role || '',
                badge: tk.status,
                tone: resolved ? 'emerald' : 'amber',
                link: '/tickets'
            });
        });

        // 7. Process Pending / Missed Work ("Kya Nahi Hua")
        const overdueOrStuckTasks = [];
        overdueOrPendingTasks.forEach((t) => {
            const assigneeId = String(t.assigneeId || '');
            if (filterUserId && assigneeId !== filterUserId) return;
            const stat = empStatsMap.get(assigneeId);
            if (stat) {
                stat.overdueAssignedTasksCount += 1;
            }
            const assignee = userMap.get(assigneeId);
            const projName = projectMap.get(String(t.projectId || ''))?.name || 'Project';
            overdueOrStuckTasks.push({
                id: t._id.toString(),
                title: t.title,
                projectName: projName,
                status: t.status,
                priority: t.priority,
                dueDate: t.dueDate,
                assigneeId,
                assigneeName: assignee?.name || 'Unassigned',
                assigneeRole: assignee?.role || ''
            });
        });

        const missedFollowUps = [];
        missedReminderLeads.forEach((l) => {
            const assignedId = String(l.assignedTo || '');
            if (filterUserId && assignedId !== filterUserId) return;
            missedFollowUps.push({
                id: l._id.toString(),
                leadName: l.name,
                company: l.company,
                stage: l.stage,
                reminderDate: l.reminder?.date,
                assignedTo: assignedId,
                assignedToName: l.assignedToName || userMap.get(assignedId)?.name || 'Unassigned'
            });
        });

        // Sort timeline newest first & limit payload
        timeline.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

        let employeeSummaries = Array.from(empStatsMap.values());
        if (filterUserId) {
            employeeSummaries = employeeSummaries.filter((e) => e.userId === filterUserId);
        }

        const noActivityEmployees = employeeSummaries
            .filter((e) => !e.hadAnyActivity)
            .map((e) => ({
                userId: e.userId,
                name: e.name,
                email: e.email,
                role: e.role,
                designation: e.designation,
                overdueAssignedTasksCount: e.overdueAssignedTasksCount
            }));

        const summary = {
            totalEvents: timeline.length,
            tasksCompleted: employeeSummaries.reduce((s, e) => s + e.tasksCompleted, 0),
            tasksCreatedOrUpdated: employeeSummaries.reduce((s, e) => s + e.tasksCreated + e.taskStatusChanges, 0),
            timeLoggedMinutes: filterUserId
                ? totalTimeLoggedMinutes
                : employeeSummaries.reduce((s, e) => s + e.timeLoggedMinutes, 0),
            attendancePresentCount: employeeSummaries.filter((e) => e.attendanceDaysPresent > 0).length,
            attendanceAbsentOrNoShowCount: noActivityEmployees.length,
            overduePendingTasksCount: overdueOrStuckTasks.length,
            missedFollowUpsCount: missedFollowUps.length
        };

        res.json({
            range: { startDate: startStr, endDate: endStr, preset },
            summary,
            employeeSummaries: employeeSummaries.sort((a, b) => b.totalEvents - a.totalEvents || a.name.localeCompare(b.name)),
            missedOrInactive: {
                noActivityEmployees,
                overdueOrStuckTasks: overdueOrStuckTasks.slice(0, 100),
                missedFollowUps: missedFollowUps.slice(0, 100)
            },
            timeline: timeline.slice(0, 500)
        });
    } catch (error) {
        console.error('Work audit route error:', error);
        res.status(500).json({ message: error.message || 'Failed to generate work audit' });
    }
});

module.exports = router;

