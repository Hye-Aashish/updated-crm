const PipelineRule = require('../models/PipelineRule');
const Task = require('../models/Task');
const Lead = require('../models/Lead');

/**
 * Run pipeline automation when a lead stage changes.
 * Safe no-op if no rules match.
 */
async function runPipelineRulesOnStageChange(lead, newStage, actor = {}) {
    if (!lead || !newStage) return { applied: 0 };

    const rules = await PipelineRule.find({ onStage: newStage, enabled: true });
    if (!rules.length) return { applied: 0 };

    let applied = 0;
    const updates = {};

    for (const rule of rules) {
        for (const action of rule.actions || []) {
            try {
                if (action.type === 'createTask') {
                    const due = new Date();
                    due.setDate(due.getDate() + (action.dueInDays || 1));
                    await Task.create({
                        title: action.taskTitle || `Follow up: ${lead.name || lead.company}`,
                        description: `Auto-created by pipeline rule "${rule.name}" for lead ${lead.company || lead.name}`,
                        projectId: 'general',
                        status: 'todo',
                        priority: action.taskPriority || 'medium',
                        assigneeId: action.assigneeId || lead.assignedTo || undefined,
                        dueDate: due,
                        creatorId: actor._id ? String(actor._id) : 'system',
                        labels: ['pipeline-auto']
                    });
                    applied++;
                } else if (action.type === 'setAssignee' && action.assigneeId) {
                    updates.assignedTo = action.assigneeId;
                    updates.assignedToName = action.assigneeName || 'Assigned';
                    updates.assignedAt = new Date();
                    applied++;
                } else if (action.type === 'setReminder') {
                    const hours = action.reminderInHours || 24;
                    const reminderDate = new Date(Date.now() + hours * 60 * 60 * 1000);
                    updates.reminder = {
                        date: reminderDate,
                        tone: action.reminderTone || 'default',
                        completed: false,
                        sentReminders: []
                    };
                    applied++;
                }
            } catch (err) {
                console.error('[PipelineAutomation] action failed:', err.message);
            }
        }
    }

    if (Object.keys(updates).length) {
        await Lead.findByIdAndUpdate(lead._id, { $set: updates });
    }

    return { applied };
}

module.exports = { runPipelineRulesOnStageChange };
