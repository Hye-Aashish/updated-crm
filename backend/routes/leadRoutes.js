const express = require('express');
const router = express.Router();
const Lead = require('../models/Lead');
const User = require('../models/User');
const PipelineStage = require('../models/PipelineStage');
const LeadForm = require('../models/LeadForm');
const { protect, authorize, checkPermission } = require('../middleware/authMiddleware');

// --- STAGES ROUTES ---

// GET all stages
router.get('/stages', protect, async (req, res) => {
    try {
        const stages = await PipelineStage.find().sort({ order: 1 });
        // If no stages, seed default
        if (stages.length === 0) {
            const defaults = [
                { id: 'new', label: 'New Leads', color: 'bg-blue-500', order: 0 },
                { id: 'discussion', label: 'In Discussion', color: 'bg-yellow-500', order: 1 },
                { id: 'proposal', label: 'Proposal Sent', color: 'bg-purple-500', order: 2 },
                { id: 'closed', label: 'Closed / Won', color: 'bg-green-500', order: 3 },
            ];
            await PipelineStage.insertMany(defaults);
            return res.json(defaults);
        }
        res.json(stages);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// POST new stage
router.post('/stages', protect, authorize('admin', 'owner'), async (req, res) => {
    try {
        const stage = new PipelineStage({
            id: req.body.id,
            label: req.body.label,
            color: req.body.color,
            order: req.body.order || 0
        });
        const newStage = await stage.save();
        res.status(201).json(newStage);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// DELETE stage
router.delete('/stages/:id', protect, authorize('admin', 'owner'), async (req, res) => {
    try {
        await PipelineStage.findOneAndDelete({ id: req.params.id });
        res.json({ message: 'Stage deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// PUT reorder stages
router.put('/stages/reorder', protect, authorize('admin', 'owner'), async (req, res) => {
    try {
        const { stageOrders } = req.body;
        if (Array.isArray(stageOrders)) {
            const bulkOps = stageOrders.map(item => ({
                updateOne: {
                    filter: { id: item.id },
                    update: { $set: { order: item.order } }
                }
            }));
            await PipelineStage.bulkWrite(bulkOps);
        }
        const updatedStages = await PipelineStage.find().sort({ order: 1 });
        res.json(updatedStages);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});


const Attendance = require('../models/Attendance');

// Helper to get today's midnight UTC date (in IST context)
function getTodayMidnightUTC() {
    const now = new Date();
    const localTime = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
    return new Date(Date.UTC(localTime.getUTCFullYear(), localTime.getUTCMonth(), localTime.getUTCDate()));
}

const isAuthorizedForLead = async (user, lead) => {
    if (!lead) return false;
    if (user.role === 'admin' || user.role === 'owner' || user.leadViewScope === 'all') return true;

    // Check if role has view_all permissions in DB
    try {
        const Setting = require('../models/Setting');
        const settings = await Setting.findOne({ type: 'general' });
        const userRoleConfig = settings?.roles?.find(r => r.name === user.role);
        if (userRoleConfig?.permissions?.leads?.view_all || userRoleConfig?.permissions?.dashboard?.scope?.view_all) {
            return true;
        }
    } catch (e) { }

    const userIdStr = user._id.toString();
    const userName = (user.name || '').toLowerCase().trim();

    // Custom allowed agents set
    const allowedAgentIds = new Set([
        userIdStr,
        ...(Array.isArray(user.allowedLeadAgents) ? user.allowedLeadAgents.map(a => (a._id || a).toString()) : [])
    ]);

    // Check if lead is assigned to someone
    const hasAssignee = Boolean(
        (lead.assignedTo && lead.assignedTo !== 'unassigned' && String(lead.assignedTo).trim() !== '') ||
        (lead.assignedToName && lead.assignedToName.toLowerCase().trim() !== 'unassigned' && lead.assignedToName.trim() !== '')
    );

    if (hasAssignee) {
        const leadAssigneeId = lead.assignedTo ? lead.assignedTo.toString() : '';
        const isAssigned = allowedAgentIds.has(leadAssigneeId) ||
                           (lead.assignedToName && lead.assignedToName.toLowerCase().trim() === userName);
        if (isAssigned) return true;

        if (user.leadViewScope === 'custom') {
            return allowedAgentIds.has(leadAssigneeId);
        }
        return false;
    }

    // If lead is unassigned: creator or allowed agent
    const creatorId = lead.createdBy ? lead.createdBy.toString() : '';
    if (allowedAgentIds.has(creatorId)) return true;
    if (lead.createdByName && lead.createdByName.toLowerCase().trim() === userName) return true;

    return false;
};

// --- LEADS ROUTES ---

// GET all leads
router.get('/', protect, checkPermission('leads', 'view'), async (req, res) => {
    try {
        const Setting = require('../models/Setting');
        const settings = await Setting.findOne({ type: 'general' });
        const userRole = settings?.roles?.find(r => r.name === req.user.role);
        const canViewAll = userRole?.permissions?.leads?.view_all || req.user.role === 'owner' || req.user.role === 'admin' || req.user.leadViewScope === 'all';

        let filter = {};

        if (canViewAll) {
            // Admin / Owner / All-Leads view: optionally filter by specific telecaller/agent
            const { telecallerId } = req.query;
            if (telecallerId && telecallerId !== 'all') {
                filter.$or = [
                    { createdBy: telecallerId },
                    { assignedTo: telecallerId },
                    { assignedToName: telecallerId },
                    { createdByName: telecallerId }
                ];
            }
        } else if (req.user.leadViewScope === 'custom' && Array.isArray(req.user.allowedLeadAgents) && req.user.allowedLeadAgents.length > 0) {
            // Granular Agent Permission: User can view their own leads + allowed agents' leads!
            const allowedAgentIds = [
                req.user._id.toString(),
                ...req.user.allowedLeadAgents.map(a => (a._id || a).toString())
            ];

            const allowedUsers = await User.find({ _id: { $in: allowedAgentIds } }).select('name').lean();
            const allowedNames = allowedUsers.map(u => u.name).filter(Boolean);

            const { telecallerId } = req.query;
            if (telecallerId && telecallerId !== 'all') {
                filter.$or = [
                    { createdBy: telecallerId },
                    { assignedTo: telecallerId },
                    { assignedToName: telecallerId },
                    { createdByName: telecallerId }
                ];
            } else {
                filter.$or = [
                    { assignedTo: { $in: allowedAgentIds } },
                    { assignedToName: { $in: allowedNames } },
                    { createdBy: { $in: allowedAgentIds } },
                    { createdByName: { $in: allowedNames } }
                ];
            }
        } else {
            // Telecaller / Employee view: STRICTLY only their own leads
            const currentUserIdStr = req.user._id.toString();
            const currentUserName = (req.user.name || '').trim();

            const myAssignedConditions = [
                { assignedTo: currentUserIdStr }
            ];
            if (currentUserName) {
                myAssignedConditions.push({ assignedToName: currentUserName });
            }

            const unassignedCondition = {
                $or: [
                    { assignedTo: null },
                    { assignedTo: '' },
                    { assignedTo: 'unassigned' },
                    { assignedTo: { $exists: false } }
                ]
            };

            const creatorCondition = {
                $or: [
                    { createdBy: req.user._id },
                    ...(currentUserName ? [{ createdByName: currentUserName }] : [])
                ]
            };

            filter = {
                $or: [
                    ...myAssignedConditions,
                    {
                        $and: [
                            unassignedCondition,
                            creatorCondition
                        ]
                    }
                ]
            };
        }

        const leads = await Lead.find(filter).sort({ createdAt: -1 }).lean();
        res.json(leads);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// POST new lead
router.post('/', protect, checkPermission('leads', 'create'), async (req, res) => {
    try {
        // Whitelist allowed fields to prevent mass assignment
        const allowedFields = ['name', 'company', 'email', 'phone', 'value', 'source', 'stage',
            'assignedTo', 'assignedToName', 'notes', 'customFields', 'reminder', 'tags', 'website', 'address',
            'industry', 'designation', 'description', 'project'];
        const safeData = {};
        allowedFields.forEach(f => { if (req.body[f] !== undefined) safeData[f] = req.body[f]; });

        // Enforce creator attribution
        safeData.createdBy = req.user._id;
        safeData.createdByName = req.user.name;

        // If no assignedTo provided, assign to creator by default
        if (!safeData.assignedTo) {
            safeData.assignedTo = req.user._id.toString();
            safeData.assignedToName = req.user.name;
        } else if (!safeData.assignedToName) {
            try {
                const assignedUser = await User.findById(safeData.assignedTo).select('name');
                if (assignedUser) safeData.assignedToName = assignedUser.name;
            } catch (e) { }
        }

        const lead = new Lead(safeData);
        const newLead = await lead.save();

        // Trigger Notification
        try {
            const Notification = require('../models/Notification');
            await Notification.create({
                title: 'New Lead Captured',
                message: `Lead "${newLead.company}" (${newLead.name}) captured by ${req.user.name}.`,
                type: 'new_lead',
                relatedId: newLead._id
            });
        } catch (nErr) { console.error('Notif Error:', nErr); }

        res.status(201).json(newLead);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// GET /telecaller-analytics - Comprehensive agent call & conversion performance for Admin
router.get('/telecaller-analytics', protect, async (req, res) => {
    try {
        const Setting = require('../models/Setting');
        const settings = await Setting.findOne({ type: 'general' });
        const userRole = settings?.roles?.find(r => r.name === req.user.role);
        const canViewAll = userRole?.permissions?.leads?.view_all || req.user.role === 'owner' || req.user.role === 'admin' || req.user.leadViewScope === 'all';

        const { range = 'today', agentId, startDate: qStartDate, endDate: qEndDate } = req.query;

        // Date boundaries
        const now = new Date();
        let startDate = new Date();
        let endDate = new Date();

        if (qStartDate && qEndDate) {
            startDate = new Date(qStartDate);
            endDate = new Date(qEndDate);
            if (typeof qEndDate === 'string' && qEndDate.length <= 10) {
                endDate.setHours(23, 59, 59, 999);
            }
        } else if (range === 'today') {
            startDate.setHours(0, 0, 0, 0);
            endDate.setHours(23, 59, 59, 999);
        } else if (range === 'yesterday') {
            startDate.setDate(startDate.getDate() - 1);
            startDate.setHours(0, 0, 0, 0);
            endDate.setDate(endDate.getDate() - 1);
            endDate.setHours(23, 59, 59, 999);
        } else if (range === 'this_week') {
            startDate.setDate(startDate.getDate() - 7);
            startDate.setHours(0, 0, 0, 0);
        } else if (range === 'this_month') {
            startDate.setDate(startDate.getDate() - 30);
            startDate.setHours(0, 0, 0, 0);
        } else {
            // all time
            startDate = new Date(0);
        }

        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);

        // Helper to format duration seconds to human readable
        const formatDuration = (seconds) => {
            if (!seconds || seconds <= 0) return '0s';
            const mins = Math.floor(seconds / 60);
            const secs = Math.floor(seconds % 60);
            const hrs = Math.floor(mins / 60);
            const remMins = mins % 60;
            if (hrs > 0) {
                return `${hrs}h ${remMins}m`;
            }
            if (mins > 0) {
                return `${mins}m ${secs}s`;
            }
            return `${secs}s`;
        };

        // Fetch leads, users, and registered lead capture forms
        // If canViewAll is true: fetch all leads across company and all agents
        // If canViewAll is false: strictly fetch current user's leads and current user only!
        const currentUserIdStr = req.user._id.toString();
        const currentUserName = (req.user.name || '').trim();

        const allowedAgentIds = [
            currentUserIdStr,
            ...(Array.isArray(req.user.allowedLeadAgents) ? req.user.allowedLeadAgents.map(a => (a._id || a).toString()) : [])
        ];
        const isCustomScope = req.user.leadViewScope === 'custom' && allowedAgentIds.length > 1;

        let leadsQuery = {};
        let usersQuery;

        if (canViewAll) {
            leadsQuery = {};
            usersQuery = User.find({ role: { $in: ['employee', 'admin', 'owner', 'pm', 'developer', 'telecaller', 'sales'] } }).select('name email role avatar').lean();
        } else if (isCustomScope) {
            const allowedUsers = await User.find({ _id: { $in: allowedAgentIds } }).select('name').lean();
            const allowedNames = allowedUsers.map(u => u.name).filter(Boolean);
            leadsQuery = {
                $or: [
                    { assignedTo: { $in: allowedAgentIds } },
                    { assignedToName: { $in: allowedNames } },
                    { createdBy: { $in: allowedAgentIds } },
                    { createdByName: { $in: allowedNames } }
                ]
            };
            usersQuery = User.find({ _id: { $in: allowedAgentIds } }).select('name email role avatar').lean();
        } else {
            leadsQuery = {
                $or: [
                    { assignedTo: currentUserIdStr },
                    ...(currentUserName ? [{ assignedToName: currentUserName }] : []),
                    {
                        $and: [
                            {
                                $or: [
                                    { assignedTo: null },
                                    { assignedTo: '' },
                                    { assignedTo: 'unassigned' },
                                    { assignedTo: { $exists: false } }
                                ]
                            },
                            {
                                $or: [
                                    { createdBy: req.user._id },
                                    ...(currentUserName ? [{ createdByName: currentUserName }] : [])
                                ]
                            }
                        ]
                    }
                ]
            };
            usersQuery = User.find({ _id: req.user._id }).select('name email role avatar').lean();
        }

        const [allLeads, allUsers, allLeadForms] = await Promise.all([
            Lead.find(leadsQuery).lean(),
            usersQuery,
            LeadForm.find({}).lean()
        ]);

        // Agents map & Activity aggregations
        const agentsMap = new Map();
        const allDailyCallingLogs = [];
        const overallHourlyCalls = {};

        // Initialize agents from users list
        allUsers.forEach(u => {
            const uid = u._id.toString();
            agentsMap.set(u.name, {
                userId: uid,
                name: u.name,
                email: u.email,
                role: u.role,
                avatar: u.avatar,
                totalAssignedLeads: 0,
                assignedLeadIds: [],
                callsInRange: 0,
                callsToday: 0,
                totalTalkTimeSeconds: 0,
                callsTodayTalkTimeSeconds: 0,
                longestCallDurationSeconds: 0,
                hourlyCalls: {},
                dailyCallingLogs: [],
                uniqueLeadsContacted: new Set(),
                followupsScheduled: 0,
                followupsCompleted: 0,
                overdueFollowups: 0,
                meetingsArranged: 0,
                dealsWon: 0,
                dealsWonValue: 0,
                leadStages: {},
                assignedLeadsList: [],
                outcomes: {},
                recentCalls: []
            });
        });

        // Helper to get or create agent entry
        const getAgent = (name, fallbackId) => {
            if (!name) name = 'Unassigned';
            if (!agentsMap.has(name)) {
                agentsMap.set(name, {
                    userId: fallbackId || name,
                    name: name,
                    email: '',
                    role: 'telecaller',
                    avatar: '',
                    totalAssignedLeads: 0,
                    assignedLeadIds: [],
                    callsInRange: 0,
                    callsToday: 0,
                    totalTalkTimeSeconds: 0,
                    callsTodayTalkTimeSeconds: 0,
                    longestCallDurationSeconds: 0,
                    hourlyCalls: {},
                    dailyCallingLogs: [],
                    uniqueLeadsContacted: new Set(),
                    followupsScheduled: 0,
                    followupsCompleted: 0,
                    overdueFollowups: 0,
                    meetingsArranged: 0,
                    dealsWon: 0,
                    dealsWonValue: 0,
                    leadStages: {},
                    assignedLeadsList: [],
                    outcomes: {},
                    recentCalls: []
                });
            }
            return agentsMap.get(name);
        };

        // Process leads
        allLeads.forEach(lead => {
            const managingName = lead.assignedToName || lead.createdByName || 'Unassigned';
            const agent = getAgent(managingName, lead.assignedTo || lead.createdBy?.toString());

            agent.totalAssignedLeads++;
            agent.assignedLeadIds.push(lead._id);

            // Lead stage breakdown per agent
            const leadStage = lead.stage || 'new';
            agent.leadStages[leadStage] = (agent.leadStages[leadStage] || 0) + 1;

            if (agent.assignedLeadsList.length < 20) {
                agent.assignedLeadsList.push({
                    id: lead._id,
                    name: lead.name,
                    company: lead.company,
                    phone: lead.phone,
                    stage: leadStage,
                    value: lead.value || 0,
                    reminder: lead.reminder,
                    updatedAt: lead.updatedAt || lead.createdAt
                });
            }

            const isOverdue = lead.reminder?.date && new Date(lead.reminder.date) < now && !lead.reminder.completed;
            if (isOverdue) {
                agent.overdueFollowups++;
            }

            const stageStr = (lead.stage || '').toLowerCase();
            if (stageStr.includes('meeting')) {
                agent.meetingsArranged++;
            }
            if (stageStr === 'closed' || stageStr === 'won' || stageStr.includes('closed') || stageStr.includes('won')) {
                agent.dealsWon++;
                agent.dealsWonValue += (lead.value || 0);
            }

            // Process activities (calls, outcomes, follow-ups)
            if (Array.isArray(lead.activities)) {
                lead.activities.forEach(act => {
                    const actDate = act.createdAt ? new Date(act.createdAt) : null;
                    const callerName = act.createdByName || lead.lastContactedBy || managingName;
                    const callerAgent = getAgent(callerName);

                    const isInRange = actDate && actDate >= startDate && actDate <= endDate;
                    const isToday = actDate && actDate >= todayStart && actDate <= todayEnd;

                    if (isToday) {
                        callerAgent.callsToday++;
                    }

                    if (isInRange) {
                        callerAgent.callsInRange++;
                        callerAgent.uniqueLeadsContacted.add(lead._id.toString());

                        // Calculate Call Duration / Talk Time (in seconds)
                        let callDur = Number(act.duration || 0);
                        if (!callDur) {
                            const outLow = (act.outcome || '').toLowerCase();
                            if (outLow.includes('connect') || outLow.includes('success') || outLow.includes('meeting') || act.type === 'call') {
                                callDur = 135; // 2m 15s default for connected call without recorded timer
                            } else if (outLow.includes('busy') || outLow.includes('not answer')) {
                                callDur = 25; // 25s attempt
                            }
                        }

                        callerAgent.totalTalkTimeSeconds += callDur;
                        if (isToday) {
                            callerAgent.callsTodayTalkTimeSeconds += callDur;
                        }
                        if (callDur > callerAgent.longestCallDurationSeconds) {
                            callerAgent.longestCallDurationSeconds = callDur;
                        }

                        if (actDate) {
                            const hr = String(actDate.getHours()).padStart(2, '0') + ':00';
                            callerAgent.hourlyCalls[hr] = (callerAgent.hourlyCalls[hr] || 0) + 1;
                            overallHourlyCalls[hr] = (overallHourlyCalls[hr] || 0) + 1;
                        }

                        const outcome = act.outcome || 'Call Connected';
                        callerAgent.outcomes[outcome] = (callerAgent.outcomes[outcome] || 0) + 1;

                        if (act.nextFollowUpDate) {
                            callerAgent.followupsScheduled++;
                        }
                        if (act.type === 'call' || act.outcome) {
                            callerAgent.followupsCompleted++;
                        }
                        if (outcome.toLowerCase().includes('meeting') || act.type === 'meeting') {
                            callerAgent.meetingsArranged++;
                        }

                        const callLogItem = {
                            id: `${lead._id}-${act._id || Math.random().toString(36).substring(7)}`,
                            leadId: lead._id,
                            leadName: lead.name,
                            company: lead.company,
                            phone: lead.phone,
                            agentName: callerName,
                            stage: lead.stage,
                            type: act.type || 'call',
                            outcome: outcome,
                            durationSeconds: callDur,
                            durationFormatted: formatDuration(callDur),
                            note: act.content || '',
                            createdAt: actDate || new Date()
                        };

                        callerAgent.dailyCallingLogs.push(callLogItem);
                        allDailyCallingLogs.push(callLogItem);

                        if (callerAgent.recentCalls.length < 15) {
                            callerAgent.recentCalls.push({
                                leadId: lead._id,
                                leadName: lead.name,
                                company: lead.company,
                                phone: lead.phone,
                                outcome: outcome,
                                durationFormatted: formatDuration(callDur),
                                note: act.content,
                                date: actDate
                            });
                        }
                    }
                });
            }
        });

        // Convert Map to array and calculate rates, durations & scores
        const rankedAgents = Array.from(agentsMap.values()).map(a => {
            const uniqueContactedCount = a.uniqueLeadsContacted.size;
            const avgCallDurationSec = a.callsInRange > 0 ? Math.round(a.totalTalkTimeSeconds / a.callsInRange) : 0;
            const conversionRate = a.totalAssignedLeads > 0 
                ? Math.round((a.dealsWon / a.totalAssignedLeads) * 100) 
                : 0;
            const accuracyScore = a.totalAssignedLeads > 0 
                ? Math.max(0, Math.round(100 - (a.overdueFollowups / a.totalAssignedLeads) * 100)) 
                : 100;
            const reachRate = a.totalAssignedLeads > 0
                ? Math.min(100, Math.round((uniqueContactedCount / a.totalAssignedLeads) * 100))
                : 0;

            // Comprehensive Sales Performance Score (0-100)
            const dealsScore = Math.min(40, a.dealsWon * 10);
            const reachScore = Math.round(reachRate * 0.25);
            const discScore = Math.round(accuracyScore * 0.25);
            const volScore = Math.min(10, Math.round((a.callsInRange / 5) * 5));
            const performanceScore = Math.min(100, Math.max(10, dealsScore + reachScore + discScore + volScore));

            let tier = 'Consistent Performer';
            let tierBadge = 'blue';
            if (performanceScore >= 80 || a.dealsWon >= 3) {
                tier = 'Star Closer';
                tierBadge = 'gold';
            } else if (performanceScore >= 60) {
                tier = 'Strong Performer';
                tierBadge = 'emerald';
            } else if (performanceScore < 45 || a.overdueFollowups >= 4) {
                tier = 'Needs Coaching';
                tierBadge = 'rose';
            }

            return {
                ...a,
                uniqueLeadsContacted: uniqueContactedCount,
                totalTalkTimeSeconds: a.totalTalkTimeSeconds,
                totalTalkTimeFormatted: formatDuration(a.totalTalkTimeSeconds),
                callsTodayTalkTimeFormatted: formatDuration(a.callsTodayTalkTimeSeconds),
                avgCallDurationSeconds: avgCallDurationSec,
                avgCallDurationFormatted: formatDuration(avgCallDurationSec),
                longestCallDurationFormatted: formatDuration(a.longestCallDurationSeconds),
                conversionRate,
                accuracyScore,
                reachRate,
                performanceScore,
                tier,
                tierBadge
            };
        }).filter(a => a.totalAssignedLeads > 0 || a.callsInRange > 0 || a.callsToday > 0);

        // Sort agents by performanceScore descending
        rankedAgents.sort((x, y) => (y.performanceScore || 0) - (x.performanceScore || 0));
        rankedAgents.forEach((ag, idx) => {
            ag.rank = idx + 1;
        });

        // Filter by agentId if specified
        const filteredAgents = (agentId && agentId !== 'all') 
            ? rankedAgents.filter(a => a.userId === agentId || a.name === agentId)
            : rankedAgents;

        // Pipeline stage counts & Source Analytics
        const stageCounts = {};
        const sourceMap = {};
        const formMap = {};
        const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
        const staleLeadsList = [];
        const unassignedLeadsList = [];
        const hotOpportunities = [];

        // Pre-populate formMap with all registered forms so even forms with 0 leads are tracked
        if (Array.isArray(allLeadForms)) {
            allLeadForms.forEach(f => {
                const titleKey = f.title ? f.title.trim() : 'Unnamed Form';
                formMap[titleKey] = {
                    formTitle: titleKey,
                    formId: f._id ? f._id.toString() : null,
                    isActive: f.isActive !== false,
                    totalLeads: 0,
                    dealsWon: 0,
                    revenueWon: 0,
                    leads: []
                };
            });
        }

        allLeads.forEach(l => {
            const st = (l.stage || 'new').toLowerCase();
            stageCounts[st] = (stageCounts[st] || 0) + 1;

            const isWon = st === 'closed' || st === 'won' || st.includes('closed') || st.includes('won');

            // Source ROI
            const src = l.source || 'Direct';
            if (!sourceMap[src]) {
                sourceMap[src] = { source: src, totalLeads: 0, dealsWon: 0, revenueWon: 0 };
            }
            sourceMap[src].totalLeads++;
            if (isWon) {
                sourceMap[src].dealsWon++;
                sourceMap[src].revenueWon += (l.value || 0);
            }

            // Lead Capture Form Tracking
            let formKey = l.formTitle || (l.source && l.source.startsWith('Form: ') ? l.source.replace('Form: ', '').trim() : null);
            if (!formKey && l.formId) {
                const matchedForm = (allLeadForms || []).find(f => f._id.toString() === l.formId.toString());
                if (matchedForm) formKey = matchedForm.title;
            }

            if (formKey) {
                const normalizedKey = formKey.trim();
                if (!formMap[normalizedKey]) {
                    formMap[normalizedKey] = {
                        formTitle: normalizedKey,
                        formId: l.formId ? l.formId.toString() : null,
                        isActive: true,
                        totalLeads: 0,
                        dealsWon: 0,
                        revenueWon: 0,
                        leads: []
                    };
                }
                formMap[normalizedKey].totalLeads++;
                if (isWon) {
                    formMap[normalizedKey].dealsWon++;
                    formMap[normalizedKey].revenueWon += (l.value || 0);
                }
                if (formMap[normalizedKey].leads.length < 50) {
                    formMap[normalizedKey].leads.push({
                        id: l._id,
                        name: l.name,
                        company: l.company,
                        phone: l.phone,
                        email: l.email,
                        stage: l.stage,
                        value: l.value || 0,
                        assignedToName: l.assignedToName || 'Unassigned',
                        createdAt: l.createdAt
                    });
                }
            }

            // Lead Leakage Radar: Stale leads (active, but untouched for 3+ days)
            const isClosedOrLost = isWon || st.includes('lost') || st === 'dropped';
            const lastActivity = l.activities && l.activities.length > 0 
                ? new Date(l.activities[l.activities.length - 1].createdAt) 
                : new Date(l.updatedAt || l.createdAt);
            
            if (!isClosedOrLost && lastActivity < threeDaysAgo) {
                if (staleLeadsList.length < 10) {
                    const diffDays = Math.floor((Date.now() - lastActivity.getTime()) / (1000 * 60 * 60 * 24));
                    staleLeadsList.push({
                        id: l._id,
                        name: l.name,
                        company: l.company,
                        phone: l.phone,
                        stage: l.stage,
                        value: l.value || 0,
                        formTitle: formKey || undefined,
                        assignedToName: l.assignedToName || l.createdByName || 'Unassigned',
                        daysIdle: diffDays
                    });
                }
            }

            // Unassigned Leads (Admins / Owners only)
            if (canViewAll && !l.assignedTo && !l.assignedToName && !isClosedOrLost) {
                if (unassignedLeadsList.length < 10) {
                    unassignedLeadsList.push({
                        id: l._id,
                        name: l.name,
                        company: l.company,
                        phone: l.phone,
                        stage: l.stage,
                        value: l.value || 0,
                        source: l.source || 'Direct',
                        formTitle: formKey || undefined,
                        createdAt: l.createdAt
                    });
                }
            }

            // Hot High-Value Deals in Pipeline
            const isHighPotential = (l.aiPriority === 'green' || (l.value && l.value >= 25000) || (l.rating && l.rating >= 4));
            if (!isClosedOrLost && isHighPotential) {
                if (hotOpportunities.length < 8) {
                    hotOpportunities.push({
                        id: l._id,
                        name: l.name,
                        company: l.company,
                        phone: l.phone,
                        stage: l.stage,
                        value: l.value || 0,
                        aiPriority: l.aiPriority || 'green',
                        rating: l.rating || 4,
                        formTitle: formKey || undefined,
                        assignedToName: l.assignedToName || 'Unassigned'
                    });
                }
            }
        });

        // Source ROI list formatted
        const sourceAnalytics = Object.values(sourceMap).map(s => ({
            ...s,
            conversionRate: s.totalLeads > 0 ? Math.round((s.dealsWon / s.totalLeads) * 100) : 0
        })).sort((a, b) => b.revenueWon - a.revenueWon || b.totalLeads - a.totalLeads);

        // Form Analytics list formatted
        const formAnalytics = Object.values(formMap).map(f => ({
            ...f,
            conversionRate: f.totalLeads > 0 ? Math.round((f.dealsWon / f.totalLeads) * 100) : 0
        })).sort((a, b) => b.totalLeads - a.totalLeads);

        // Smart Recommendations
        const smartInsights = [];
        if (!canViewAll) {
            const myAgent = rankedAgents[0];
            const myDealsWon = myAgent?.dealsWon || 0;
            const myDealsWonValue = myAgent?.dealsWonValue || 0;
            const myCallsToday = myAgent?.callsToday || 0;
            const myOverdue = myAgent?.overdueFollowups || 0;

            if (myDealsWon > 0) {
                smartInsights.push(`🏆 Sales Victory: You have closed ${myDealsWon} deals generating ₹${myDealsWonValue.toLocaleString('en-IN')} revenue!`);
            }
            if (myCallsToday > 0) {
                smartInsights.push(`📞 High Calling Momentum: You dialed ${myCallsToday} calls today. Keep connecting with leads!`);
            }
            if (myOverdue > 0) {
                smartInsights.push(`⚠️ Follow-up Alert: You have ${myOverdue} overdue reminder(s). Contact them promptly to keep deals moving.`);
            }
            if (hotOpportunities.length > 0) {
                smartInsights.push(`🔥 Priority Deals: You have ${hotOpportunities.length} high-potential opportunities in your pipeline.`);
            }
            if (smartInsights.length === 0) {
                smartInsights.push(`🎯 Welcome to your Personal Sales Dashboard! Dial your assigned leads and record call outcomes to track your stats.`);
            }
        } else {
            if (rankedAgents.length > 0 && rankedAgents[0].dealsWon > 0) {
                smartInsights.push(`🏆 Top Performer: ${rankedAgents[0].name} leads the team with ${rankedAgents[0].dealsWon} won deals and ₹${(rankedAgents[0].dealsWonValue || 0).toLocaleString('en-IN')} revenue.`);
            }
            if (staleLeadsList.length > 0) {
                smartInsights.push(`⚠️ Lead Leakage Alert: ${staleLeadsList.length}+ active leads have received no calls or updates for 3+ days. Reassign or call them immediately.`);
            }
            if (unassignedLeadsList.length > 0) {
                smartInsights.push(`🚨 ${unassignedLeadsList.length} fresh leads are currently unassigned! Assign them to active telecallers to boost conversion.`);
            }
            if (formAnalytics.length > 0) {
                const topForm = formAnalytics.find(f => f.totalLeads > 0);
                if (topForm) {
                    smartInsights.push(`📝 Top Web Form: "${topForm.formTitle}" generated ${topForm.totalLeads} leads with ${topForm.conversionRate}% win rate (₹${(topForm.revenueWon || 0).toLocaleString('en-IN')}).`);
                }
            }
        }

        // Target agents for summary calculations: if agentId filter is specified, use filteredAgents; otherwise rankedAgents
        const isAgentFiltered = Boolean(agentId && agentId !== 'all');
        const targetAgents = isAgentFiltered ? filteredAgents : rankedAgents;

        // Leads relevant to current view
        const relevantLeads = isAgentFiltered
            ? allLeads.filter(l => {
                const assigned = l.assignedToName || l.assignedTo || l.createdByName || '';
                return filteredAgents.some(fa => fa.userId === assigned || fa.name === assigned || fa.userId === l.assignedTo || fa.name === l.assignedToName);
            })
            : allLeads;

        // Overall summary KPI stats
        const totalTalkTimeSecs = targetAgents.reduce((acc, a) => acc + (a.totalTalkTimeSeconds || 0), 0);
        const totalCallsCount = targetAgents.reduce((acc, a) => acc + a.callsInRange, 0);
        const totalCallsTodayCount = targetAgents.reduce((acc, a) => acc + a.callsToday, 0);
        const totalTodayTalkSecs = targetAgents.reduce((acc, a) => acc + (a.callsTodayTalkTimeSeconds || 0), 0);
        const maxCallSecs = Math.max(0, ...targetAgents.map(a => a.longestCallDurationSeconds || 0));

        // Recompute stage counts for relevant leads if agent filter is active
        const relevantStageCounts = {};
        if (isAgentFiltered) {
            relevantLeads.forEach(l => {
                const st = (l.stage || 'new').toLowerCase();
                relevantStageCounts[st] = (relevantStageCounts[st] || 0) + 1;
            });
        }

        const effectiveStageCounts = isAgentFiltered ? relevantStageCounts : stageCounts;

        const summary = {
            totalLeads: relevantLeads.length,
            newLeads: (effectiveStageCounts['new'] || 0) + (effectiveStageCounts['new-lead'] || 0),
            contactedLeads: effectiveStageCounts['contacted'] || 0,
            qualifiedLeads: effectiveStageCounts['qualified'] || 0,
            pendingMeetings: effectiveStageCounts['pending-meeting'] || 0,
            stageCounts: effectiveStageCounts,
            totalCalls: totalCallsCount,
            totalCallsToday: totalCallsTodayCount,
            totalTalkTimeSeconds: totalTalkTimeSecs,
            totalTalkTimeFormatted: formatDuration(totalTalkTimeSecs),
            callsTodayTalkTimeFormatted: formatDuration(totalTodayTalkSecs),
            avgCallDurationFormatted: formatDuration(totalCallsCount > 0 ? Math.round(totalTalkTimeSecs / totalCallsCount) : 0),
            longestCallDurationFormatted: formatDuration(maxCallSecs),
            totalUniqueContacted: targetAgents.reduce((acc, a) => acc + (a.uniqueLeadsContacted || 0), 0),
            totalMeetings: targetAgents.reduce((acc, a) => acc + (a.meetingsArranged || 0), 0),
            totalDealsWon: targetAgents.reduce((acc, a) => acc + (a.dealsWon || 0), 0),
            totalRevenueWon: targetAgents.reduce((acc, a) => acc + (a.dealsWonValue || 0), 0),
            totalOverdueFollowups: targetAgents.reduce((acc, a) => acc + (a.overdueFollowups || 0), 0),
            totalPendingFollowups: relevantLeads.filter(l => l.reminder?.date && !l.reminder.completed).length,
            activeAgents: targetAgents.filter(a => a.callsInRange > 0 || a.callsToday > 0).length,
            staleLeadsCount: staleLeadsList.length,
            unassignedLeadsCount: unassignedLeadsList.length,
            dateRange: range,
            isPersonalView: !canViewAll
        };

        // Filter dailyCallingLogs if specific agent is selected
        const relevantCallingLogs = isAgentFiltered
            ? allDailyCallingLogs.filter(log => filteredAgents.some(fa => fa.name === log.agentName || fa.userId === log.agentName))
            : allDailyCallingLogs;

        // Sorted daily calling logs (most recent first)
        const sortedCallingLogs = relevantCallingLogs
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .slice(0, 150);

        // Complete list of all agents for filters and dropdowns (never filtered out)
        const allAgentsList = rankedAgents.map(a => ({
            userId: a.userId,
            name: a.name,
            email: a.email,
            role: a.role,
            avatar: a.avatar,
            totalAssignedLeads: a.totalAssignedLeads
        }));

        res.json({
            summary,
            agents: filteredAgents,
            allAgents: allAgentsList,
            dailyCallingLogs: sortedCallingLogs,
            overallHourlyCalls,
            sourceAnalytics,
            formAnalytics,
            leakageRadar: {
                staleLeads: staleLeadsList,
                unassignedLeads: unassignedLeadsList
            },
            hotOpportunities,
            smartInsights
        });
    } catch (err) {
        console.error('Telecaller Analytics Error:', err);
        res.status(500).json({ message: err.message });
    }
});

// GET /day-agent-calling - Admin day-wise calendar calling report (New Calls, Follow-ups, Missed Calls)
router.get('/day-agent-calling', protect, async (req, res) => {
    try {
        const Setting = require('../models/Setting');
        const settings = await Setting.findOne({ type: 'general' });
        const userRole = settings?.roles?.find(r => r.name === req.user.role);
        const canViewAll = userRole?.permissions?.leads?.view_all || req.user.role === 'owner' || req.user.role === 'admin' || req.user.leadViewScope === 'all';

        const { date = new Date().toISOString().split('T')[0], agentId } = req.query;

        // Normalize date bounds for target day
        const [yStr, mStr, dStr] = date.split('-');
        const dayStart = new Date(parseInt(yStr), parseInt(mStr) - 1, parseInt(dStr), 0, 0, 0, 0);
        const dayEnd = new Date(parseInt(yStr), parseInt(mStr) - 1, parseInt(dStr), 23, 59, 59, 999);

        const allowedAgentIds = [
            req.user._id.toString(),
            ...(Array.isArray(req.user.allowedLeadAgents) ? req.user.allowedLeadAgents.map(a => (a._id || a).toString()) : [])
        ];
        const isCustomScope = req.user.leadViewScope === 'custom' && allowedAgentIds.length > 1;

        // Fetch team agents and leads
        const usersQuery = canViewAll
            ? User.find({ role: { $ne: 'client' } }).select('name email role avatar').lean()
            : isCustomScope
                ? User.find({ _id: { $in: allowedAgentIds } }).select('name email role avatar').lean()
                : User.find({ _id: req.user._id }).select('name email role avatar').lean();

        const leadsQuery = canViewAll ? {} : isCustomScope ? {
            $or: [
                { assignedTo: { $in: allowedAgentIds } },
                { createdBy: { $in: allowedAgentIds } }
            ]
        } : {
            $or: [
                { assignedTo: req.user._id.toString() },
                { assignedToName: req.user.name },
                { createdBy: req.user._id }
            ]
        };

        const [allUsers, allLeads] = await Promise.all([
            usersQuery,
            Lead.find(leadsQuery).lean()
        ]);

        const agentsMap = new Map();
        allUsers.forEach(u => {
            agentsMap.set(u.name, {
                userId: u._id.toString(),
                name: u.name,
                email: u.email,
                role: u.role,
                avatar: u.avatar,
                totalAssignedLeads: 0,
                newCallsCount: 0,
                followupCallsCount: 0,
                totalCallsDone: 0,
                callsNotDoneCount: 0,
                followupsTakenCount: 0,
                totalDurationSeconds: 0,
                newCallsList: [],
                followupCallsList: [],
                pendingCallsList: [],
                scheduledFollowupsList: []
            });
        });

        const getAgent = (name, fallbackId) => {
            if (!name) name = 'Unassigned';
            if (!agentsMap.has(name)) {
                agentsMap.set(name, {
                    userId: fallbackId || name,
                    name: name,
                    email: '',
                    role: 'telecaller',
                    avatar: '',
                    totalAssignedLeads: 0,
                    newCallsCount: 0,
                    followupCallsCount: 0,
                    totalCallsDone: 0,
                    callsNotDoneCount: 0,
                    followupsTakenCount: 0,
                    totalDurationSeconds: 0,
                    newCallsList: [],
                    followupCallsList: [],
                    pendingCallsList: [],
                    scheduledFollowupsList: []
                });
            }
            return agentsMap.get(name);
        };

        allLeads.forEach(lead => {
            const managingName = lead.assignedToName || lead.createdByName || 'Unassigned';
            const assignedAgent = getAgent(managingName, lead.assignedTo || lead.createdBy?.toString());
            assignedAgent.totalAssignedLeads++;

            const activities = Array.isArray(lead.activities) ? lead.activities : [];

            // Day activities by any agent
            const dayActivities = activities.filter(act => {
                if (!act.createdAt) return false;
                const d = new Date(act.createdAt);
                return d >= dayStart && d <= dayEnd;
            });

            // Activities prior to selected day
            const priorActivities = activities.filter(act => {
                if (!act.createdAt) return false;
                return new Date(act.createdAt) < dayStart && act.type !== 'system';
            });

            const leadCreatedOnDay = lead.createdAt && new Date(lead.createdAt) >= dayStart && new Date(lead.createdAt) <= dayEnd;
            const hadInteractionOnDay = dayActivities.length > 0;

            if (hadInteractionOnDay || leadCreatedOnDay) {
                const callerName = (dayActivities[0] && dayActivities[0].createdByName) || managingName;
                const activeAgent = getAgent(callerName);

                // User logic:
                // If lead newly added OR first time status update/note on that day -> Count as 1 New Call
                // If lead already had prior conversation note/status update -> Count as Follow-up
                if (priorActivities.length === 0) {
                    activeAgent.newCallsCount++;
                    activeAgent.totalCallsDone++;

                    const dur = dayActivities.reduce((sum, a) => sum + (Number(a.duration) || 0), 0);
                    activeAgent.totalDurationSeconds += dur;

                    activeAgent.newCallsList.push({
                        id: lead._id,
                        name: lead.name,
                        company: lead.company,
                        phone: lead.phone,
                        stage: lead.stage,
                        value: lead.value || 0,
                        outcome: (dayActivities[0] && (dayActivities[0].outcome || dayActivities[0].content)) || (leadCreatedOnDay ? 'Fresh Lead Added' : 'First Call Made'),
                        time: (dayActivities[0] && dayActivities[0].createdAt) || lead.createdAt,
                        note: (dayActivities[0] && dayActivities[0].content) || 'Lead created / first conversation initiated'
                    });
                } else {
                    const count = Math.max(1, dayActivities.length);
                    activeAgent.followupCallsCount += count;
                    activeAgent.totalCallsDone += count;

                    const dur = dayActivities.reduce((sum, a) => sum + (Number(a.duration) || 0), 0);
                    activeAgent.totalDurationSeconds += dur;

                    activeAgent.followupCallsList.push({
                        id: lead._id,
                        name: lead.name,
                        company: lead.company,
                        phone: lead.phone,
                        stage: lead.stage,
                        value: lead.value || 0,
                        outcome: (dayActivities[0] && (dayActivities[0].outcome || dayActivities[0].content)) || 'Follow-up Call',
                        previousNote: priorActivities[priorActivities.length - 1]?.content || 'Prior interaction exists',
                        currentNote: (dayActivities[0] && dayActivities[0].content) || 'Follow-up conversation logged',
                        time: (dayActivities[0] && dayActivities[0].createdAt) || new Date()
                    });
                }

                // Follow-ups taken / next scheduled
                dayActivities.forEach(act => {
                    if (act.nextFollowUpDate) {
                        activeAgent.followupsTakenCount++;
                        activeAgent.scheduledFollowupsList.push({
                            id: lead._id,
                            name: lead.name,
                            company: lead.company,
                            phone: lead.phone,
                            scheduledFor: act.nextFollowUpDate,
                            note: act.content || act.outcome || 'Next call scheduled'
                        });
                    }
                });
            }

            // Calls Not Done:
            // 1. Scheduled follow-up was due on this date, but no call was logged
            // 2. Fresh lead assigned on/before this date, but 0 calls or updates attempted
            const reminderDate = lead.reminder?.date ? new Date(lead.reminder.date) : null;
            const reminderDueOnDay = reminderDate && reminderDate >= dayStart && reminderDate <= dayEnd;
            const hadReminderMissed = reminderDueOnDay && !hadInteractionOnDay;
            const isFreshUncalled = activities.length === 0 && (!lead.createdAt || new Date(lead.createdAt) <= dayEnd);

            if (hadReminderMissed) {
                assignedAgent.callsNotDoneCount++;
                assignedAgent.pendingCallsList.push({
                    id: lead._id,
                    name: lead.name,
                    company: lead.company,
                    phone: lead.phone,
                    stage: lead.stage,
                    value: lead.value || 0,
                    reason: 'Scheduled follow-up due on this date was not done',
                    reminderDate: lead.reminder.date
                });
            } else if (isFreshUncalled) {
                assignedAgent.callsNotDoneCount++;
                assignedAgent.pendingCallsList.push({
                    id: lead._id,
                    name: lead.name,
                    company: lead.company,
                    phone: lead.phone,
                    stage: lead.stage,
                    value: lead.value || 0,
                    reason: 'Fresh assigned lead - No call or update logged yet',
                    assignedAt: lead.assignedAt || lead.createdAt
                });
            }
        });

        const formatDuration = (seconds) => {
            if (!seconds || seconds <= 0) return '0s';
            const mins = Math.floor(seconds / 60);
            const secs = Math.floor(seconds % 60);
            const hrs = Math.floor(mins / 60);
            const remMins = mins % 60;
            if (hrs > 0) return `${hrs}h ${remMins}m`;
            if (mins > 0) return `${mins}m ${secs}s`;
            return `${secs}s`;
        };

        let agentsList = Array.from(agentsMap.values()).map(a => ({
            ...a,
            durationFormatted: formatDuration(a.totalDurationSeconds)
        }));

        if (agentId && agentId !== 'all') {
            agentsList = agentsList.filter(a => a.userId === agentId || a.name === agentId);
        }

        const summary = {
            date,
            totalCallsDone: agentsList.reduce((sum, a) => sum + a.totalCallsDone, 0),
            newCallsCount: agentsList.reduce((sum, a) => sum + a.newCallsCount, 0),
            followupCallsCount: agentsList.reduce((sum, a) => sum + a.followupCallsCount, 0),
            callsNotDoneCount: agentsList.reduce((sum, a) => sum + a.callsNotDoneCount, 0),
            followupsTakenCount: agentsList.reduce((sum, a) => sum + a.followupsTakenCount, 0),
            activeAgentsCount: agentsList.filter(a => a.totalCallsDone > 0).length,
            totalAgentsCount: agentsList.length
        };

        res.json({
            date,
            summary,
            agents: agentsList,
            allAgents: Array.from(agentsMap.values()).map(a => ({
                userId: a.userId,
                name: a.name,
                role: a.role,
                avatar: a.avatar
            }))
        });
    } catch (err) {
        console.error('Day Agent Calling Report Error:', err);
        res.status(500).json({ message: err.message });
    }
});

// POST /bulk-reassign - Admin reassigns multiple leads to a new agent
router.post('/bulk-reassign', protect, authorize('admin', 'owner'), async (req, res) => {
    try {
        const { leadIds, newAgentId, newAgentName } = req.body;
        if (!Array.isArray(leadIds) || leadIds.length === 0 || !newAgentName) {
            return res.status(400).json({ message: 'leadIds array and newAgentName are required' });
        }

        const updateResult = await Lead.updateMany(
            { _id: { $in: leadIds } },
            {
                $set: {
                    assignedTo: newAgentId || req.user._id.toString(),
                    assignedToName: newAgentName,
                    assignedAt: new Date(),
                    updatedAt: new Date()
                },
                $push: {
                    activities: {
                        content: `Reassigned to ${newAgentName} by Admin (${req.user.name})`,
                        type: 'system',
                        createdByName: req.user.name,
                        createdAt: new Date()
                    }
                }
            }
        );

        // Notify new agent if assigned
        if (newAgentId && String(newAgentId) !== req.user._id.toString()) {
            try {
                const Notification = require('../models/Notification');
                await Notification.create({
                    userId: newAgentId,
                    title: 'Leads Reassigned to You',
                    message: `Admin ${req.user.name} assigned ${leadIds.length} lead(s) to you.`,
                    type: 'system'
                });
            } catch (nErr) { }
        }

        res.json({
            success: true,
            modifiedCount: updateResult.modifiedCount,
            message: `Successfully reassigned ${updateResult.modifiedCount} leads to ${newAgentName}`
        });
    } catch (err) {
        console.error('Bulk Reassign Error:', err);
        res.status(500).json({ message: err.message });
    }
});

// GET lead by id
router.get('/:id', protect, async (req, res) => {
    try {
        const lead = await Lead.findById(req.params.id);
        if (!lead) return res.status(404).json({ message: 'Lead not found' });

        const canAccess = await isAuthorizedForLead(req.user, lead);
        if (!canAccess) {
            return res.status(403).json({ message: 'Not authorized for this lead' });
        }
        res.json(lead);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// UPDATE lead
router.put('/:id', protect, checkPermission('leads', 'edit'), async (req, res) => {
    try {
        const lead = await Lead.findById(req.params.id);
        if (!lead) return res.status(404).json({ message: 'Lead not found' });

        const canAccess = await isAuthorizedForLead(req.user, lead);
        if (!canAccess) {
            return res.status(403).json({ message: 'Not authorized to edit this lead' });
        }

        // Whitelist allowed update fields
        const allowedFields = ['name', 'company', 'email', 'phone', 'value', 'source', 'stage',
            'assignedTo', 'assignedToName', 'notes', 'customFields', 'reminder', 'tags', 'website', 'address',
            'industry', 'designation', 'description', 'lostReason', 'project'];
        const safeData = {};
        allowedFields.forEach(f => { if (req.body[f] !== undefined) safeData[f] = req.body[f]; });

        if (safeData.assignedTo !== undefined) {
            if (!safeData.assignedTo || safeData.assignedTo === 'unassigned') {
                safeData.assignedTo = null;
                safeData.assignedToName = 'Unassigned';
            } else {
                safeData.assignedAt = new Date();
                try {
                    const assignedUser = await User.findById(safeData.assignedTo).select('name');
                    if (assignedUser) safeData.assignedToName = assignedUser.name;
                } catch (e) { }
            }
        }

        const isReassigned = safeData.assignedTo !== undefined && String(safeData.assignedTo || '') !== String(lead.assignedTo || '');
        const isStageChanged = safeData.stage && safeData.stage !== lead.stage;
        const updateQuery = { $set: safeData };
        const newActivities = [];
        if (isReassigned) {
            newActivities.push({
                content: `Lead assigned to ${safeData.assignedToName || 'Unassigned'} by ${req.user.name}`,
                type: 'system',
                createdByName: req.user.name,
                createdAt: new Date()
            });
        }
        if (isStageChanged) {
            newActivities.push({
                content: `Status updated from "${lead.stage || 'new'}" to "${safeData.stage}"`,
                type: 'status_change',
                outcome: safeData.stage,
                createdByName: req.user.name,
                createdAt: new Date()
            });
            safeData.lastContactedBy = req.user.name;
            safeData.lastContactedById = req.user._id.toString();
            if (!lead.firstContactedAt) safeData.firstContactedAt = new Date();
        }
        if (newActivities.length > 0) {
            updateQuery.$push = { activities: { $each: newActivities } };
        }

        const updatedLead = await Lead.findByIdAndUpdate(req.params.id, updateQuery, { new: true });

        // Notify newly assigned telecaller if not self
        if (isReassigned && safeData.assignedTo && String(safeData.assignedTo) !== req.user._id.toString()) {
            try {
                const Notification = require('../models/Notification');
                await Notification.create({
                    userId: safeData.assignedTo,
                    title: 'New Lead Assigned to You',
                    message: `Admin ${req.user.name} assigned lead "${lead.company || lead.name}" to you.`,
                    type: 'system',
                    relatedId: lead._id.toString()
                });
            } catch (nErr) { }
        }

        res.json(updatedLead);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// DELETE lead
router.delete('/:id', protect, checkPermission('leads', 'delete'), async (req, res) => {
    try {
        const lead = await Lead.findById(req.params.id);
        if (!lead) return res.status(404).json({ message: 'Lead not found' });

        const canAccess = await isAuthorizedForLead(req.user, lead);
        if (!canAccess) {
            return res.status(403).json({ message: 'Not authorized to delete this lead' });
        }

        await Lead.findByIdAndDelete(req.params.id);
        res.json({ message: 'Lead deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Add Activity
router.post('/:id/activities', protect, async (req, res) => {
    try {
        const lead = await Lead.findById(req.params.id);
        if (!lead) return res.status(404).json({ message: 'Lead not found' });

        const canAccess = await isAuthorizedForLead(req.user, lead);
        if (!canAccess) {
            return res.status(403).json({ message: 'Not authorized to add activities to this lead' });
        }

        lead.activities.push({
            content: req.body.content,
            type: req.body.type || 'note',
            outcome: req.body.outcome,
            duration: Number(req.body.duration || req.body.durationSeconds || 0),
            createdByName: req.user.name,
            createdAt: new Date()
        });

        lead.lastContactedBy = req.user.name;
        lead.lastContactedById = req.user._id.toString();
        lead.lastNote = req.body.content;

        // Run AI Analysis and Schedule Reminders if keywords found
        try {
            const { analyzeLeadPriorityAndExtractReminder } = require('../services/aiService');
            const aiResult = await analyzeLeadPriorityAndExtractReminder(lead.activities, req.body.clientTime);

            lead.aiPriority = aiResult.priority;
            lead.aiPriorityReason = aiResult.reason;

            if (aiResult.extractedReminderDate) {
                const nextReminderDate = new Date(aiResult.extractedReminderDate);
                if (nextReminderDate > new Date()) {
                    lead.reminder = {
                        date: nextReminderDate,
                        tone: 'default',
                        completed: false,
                        sentReminders: []
                    };
                }
            }
        } catch (aiErr) {
            console.error('Lead Activity AI Processing Error:', aiErr);
        }

        const updatedLead = await lead.save();
        res.json(updatedLead);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// POST /:id/followups - Log a Follow-up Interaction with Outcome, Call Duration, and Next Follow-up
router.post('/:id/followups', protect, async (req, res) => {
    try {
        const lead = await Lead.findById(req.params.id);
        if (!lead) return res.status(404).json({ message: 'Lead not found' });

        const canAccess = await isAuthorizedForLead(req.user, lead);
        if (!canAccess) {
            return res.status(403).json({ message: 'Not authorized to follow up on this lead' });
        }

        const {
            outcome,
            note,
            duration,
            durationSeconds,
            nextFollowUpDate,
            reminderMinutes,
            reminderTone,
            followUpType,
            noNextFollowUp,
            newStage
        } = req.body;

        const userName = req.user ? req.user.name : 'Sales Team';
        const now = new Date();
        const callDuration = Number(durationSeconds !== undefined ? durationSeconds : (duration || 0));

        // 1. Log activity record with call duration
        const activityItem = {
            content: note || outcome,
            type: followUpType || 'call',
            outcome: outcome,
            duration: callDuration,
            nextFollowUpDate: nextFollowUpDate ? new Date(nextFollowUpDate) : null,
            reminderMinutes: reminderMinutes || 30,
            createdByName: userName,
            createdAt: now
        };

        if (!lead.activities) lead.activities = [];
        lead.activities.push(activityItem);

        // 2. Update last follow-up summaries and contact attribution
        lead.lastFollowUpDate = now;
        lead.lastFollowUpOutcome = outcome;
        lead.lastNote = note || outcome;
        lead.lastContactedBy = userName;
        lead.lastContactedById = req.user._id.toString();

        // 3. Process Next Follow-up vs No Next Follow-up
        if (nextFollowUpDate) {
            lead.reminder = {
                date: new Date(nextFollowUpDate),
                tone: reminderTone || 'default',
                completed: false,
                reminderMinutes: reminderMinutes || 30,
                sentReminders: []
            };
        } else if (noNextFollowUp) {
            lead.reminder = {
                date: null,
                tone: 'default',
                completed: true,
                sentReminders: []
            };
            if (newStage) {
                lead.stage = newStage;
            }
        }

        // 4. Also record in SalesCallLog collection for unified reporting
        try {
            const SalesCallLog = require('../models/SalesCallLog');
            let normOutcome = 'connected';
            const oLower = (outcome || '').toLowerCase();
            if (oLower.includes('not answered') || oLower.includes('no answer')) normOutcome = 'no_answer';
            else if (oLower.includes('busy')) normOutcome = 'busy';
            else if (oLower.includes('back later') || oLower.includes('callback')) normOutcome = 'callback_requested';
            else if (oLower.includes('not interested')) normOutcome = 'not_interested';
            else if (oLower.includes('meeting')) normOutcome = 'meeting_booked';
            else if (oLower.includes('connected')) normOutcome = 'connected';
            else normOutcome = 'other';

            if (!lead.firstCallAttemptAt) lead.firstCallAttemptAt = now;
            if (['connected', 'interested', 'meeting_booked', 'callback_requested'].includes(normOutcome) && !lead.firstContactedAt) {
                lead.firstContactedAt = now;
            }

            await SalesCallLog.create({
                leadId: lead._id,
                leadName: lead.name,
                company: lead.company,
                phone: lead.phone,
                agentId: req.user._id,
                agentName: userName,
                direction: 'outbound',
                callStartedAt: now,
                durationSeconds: callDuration,
                outcome: normOutcome,
                outcomeLabel: outcome,
                notes: note || '',
                followUpRequired: !!nextFollowUpDate,
                nextFollowUpAt: nextFollowUpDate ? new Date(nextFollowUpDate) : undefined,
                source: 'manual',
                verificationStatus: 'agent_reported',
                createdBy: req.user._id
            });
        } catch (cErr) {
            console.error('SalesCallLog auto-record error:', cErr.message);
        }

        // 5. Run optional AI priority refresh
        try {
            const { analyzeLeadPriorityAndExtractReminder } = require('../services/aiService');
            const aiResult = await analyzeLeadPriorityAndExtractReminder(lead.activities);
            if (aiResult?.priority) lead.aiPriority = aiResult.priority;
            if (aiResult?.reason) lead.aiPriorityReason = aiResult.reason;
        } catch (aiErr) { }

        const savedLead = await lead.save();
        res.json(savedLead);
    } catch (err) {
        console.error('Follow-up Save Error:', err);
        res.status(400).json({ message: err.message });
    }
});

module.exports = router;
