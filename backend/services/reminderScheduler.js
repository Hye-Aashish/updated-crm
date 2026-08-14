const Lead = require('../models/Lead');
const User = require('../models/User');
const Notification = require('../models/Notification');

/**
 * Background worker checking for upcoming follow-up reminders.
 * Runs every 60 seconds and creates in-app notifications at 1 hour before,
 * 20 minutes before, and at event time for admin/owner users.
 */
function startReminderScheduler() {
    setInterval(async () => {
        try {
            const now = new Date();
            // Find leads with scheduled, pending reminders
            const leads = await Lead.find({
                'reminder.date': { $exists: true, $ne: null },
                'reminder.completed': false
            });

            for (const lead of leads) {
                const reminderDate = new Date(lead.reminder.date);
                const diffMs = reminderDate - now;
                const diffMinutes = Math.round(diffMs / 60000);

                if (!lead.reminder.sentReminders) {
                    lead.reminder.sentReminders = [];
                }

                let notify = false;
                let title = '';
                let message = '';
                let tag = '';

                // 1. 1 Hour Before Alert
                if (diffMinutes >= 50 && diffMinutes <= 60 && !lead.reminder.sentReminders.includes('1h')) {
                    title = 'Lead Follow-up in 1 Hour';
                    message = `You have a scheduled follow-up with ${lead.company} (${lead.name}) in about 1 hour.`;
                    tag = '1h';
                    notify = true;
                }
                // 2. 20 Minutes Before Alert
                else if (diffMinutes >= 15 && diffMinutes <= 25 && !lead.reminder.sentReminders.includes('20m')) {
                    title = 'Lead Follow-up in 20 Mins';
                    message = `Urgent: Scheduled follow-up with ${lead.company} (${lead.name}) is in 20 minutes.`;
                    tag = '20m';
                    notify = true;
                }
                // 3. At Event Time Alert
                else if (diffMinutes <= 0 && !lead.reminder.sentReminders.includes('0m')) {
                    title = 'Lead Follow-up Now';
                    message = `It is time for your follow-up with ${lead.company} (${lead.name}).`;
                    tag = '0m';
                    notify = true;
                }

                if (notify) {
                    // Fetch admins & owners
                    const receivers = await User.find({ role: { $in: ['admin', 'owner'] } });
                    
                    // Create Notification records
                    for (const receiver of receivers) {
                        await Notification.create({
                            userId: receiver._id,
                            title: title,
                            message: message,
                            type: 'reminder',
                            relatedId: lead._id.toString()
                        });
                    }

                    // Save that this reminder alert was triggered
                    lead.reminder.sentReminders.push(tag);
                    
                    // Mark as complete if event time reached so scheduler doesn't loop
                    if (tag === '0m') {
                        lead.reminder.completed = true;
                    }

                    await lead.save();
                    console.log(`[Reminder Scheduler] Triggered '${tag}' notification for lead: ${lead.company}`);
                }
            }
        } catch (err) {
            console.error('[Reminder Scheduler] Check Loop Error:', err);
        }
    }, 60000);

    console.log('[Reminder Scheduler] Background worker initialized (polling interval: 60s).');
}

module.exports = {
    startReminderScheduler
};
