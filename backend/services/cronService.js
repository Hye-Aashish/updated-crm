const cron = require('node-cron');
const Invoice = require('../models/Invoice');
const Client = require('../models/Client');
const Domain = require('../models/Domain');
const Setting = require('../models/Setting');
const Task = require('../models/Task');
const sendEmail = require('../utils/sendEmail');
const { FollowUpSequence, LeadSequenceEnrollment } = require('../models/FollowUpSequence');
const Lead = require('../models/Lead');

function addFrequency(date, frequency) {
    const d = new Date(date);
    switch ((frequency || '').toLowerCase()) {
        case 'weekly': d.setDate(d.getDate() + 7); break;
        case 'monthly': d.setMonth(d.getMonth() + 1); break;
        case 'quarterly': d.setMonth(d.getMonth() + 3); break;
        case 'yearly': d.setFullYear(d.getFullYear() + 1); break;
        default: return null;
    }
    return d;
}

// Run every day at 8:00 AM
cron.schedule('0 8 * * *', async () => {
    console.log('[Cron] Running daily automation tasks...');
    try {
        const settings = await Setting.findOne({ type: 'general' });
        if (!settings || !settings.notifications) return;

        // Task 1: Domain expiry reminders
        const today = new Date();
        const next7Days = new Date(today);
        next7Days.setDate(today.getDate() + 7);
        next7Days.setHours(0, 0, 0, 0);
        const next8Days = new Date(next7Days);
        next8Days.setDate(next7Days.getDate() + 1);

        const expiringDomains = await Domain.find({
            expiryDate: { $gte: next7Days, $lt: next8Days },
            status: { $nin: ['cancelled', 'suspended'] }
        });

        for (const domain of expiringDomains) {
            const client = await Client.findById(domain.clientId);
            if (client && client.email) {
                const html = `
                    <h3>Domain Expiry Reminder</h3>
                    <p>Dear ${client.name},</p>
                    <p>Your domain <strong>${domain.domainName}</strong> is expiring on ${domain.expiryDate.toDateString()}.</p>
                    <p>Please log in to your portal to renew it to avoid service interruption.</p>
                `;
                await sendEmail(client.email, `Action Required: Domain ${domain.domainName} Expiring Soon`, html);
            }
        }

        // Task 2: Overdue invoice reminders (configurable days)
        if (settings.notifications.invoiceDue) {
            const reminderDays = Number(settings.notifications.invoiceReminderDays || 1);
            const cutoff = new Date();
            cutoff.setDate(cutoff.getDate() - Math.max(0, reminderDays - 1));
            cutoff.setHours(0, 0, 0, 0);

            const overdueInvoices = await Invoice.find({
                status: { $in: ['pending', 'partially-paid', 'overdue'] },
                dueDate: { $lt: cutoff }
            });

            for (const invoice of overdueInvoices) {
                const client = await Client.findById(invoice.clientId);
                if (client && client.email) {
                    const balance = Math.max(0, (invoice.total || 0) - (invoice.amountPaid || 0));
                    console.log(`[Cron] Sending overdue reminder for Invoice ${invoice.invoiceNumber}`);
                    const html = `
                        <h3>Invoice Overdue</h3>
                        <p>Dear ${client.name},</p>
                        <p>This is a friendly reminder that invoice <strong>${invoice.invoiceNumber}</strong> was due on ${new Date(invoice.dueDate).toDateString()}.</p>
                        <p>Balance Due: ${balance} ${invoice.currency || 'INR'}</p>
                        <p>Please arrange payment at your earliest convenience.</p>
                    `;
                    await sendEmail(client.email, `Overdue Reminder: Invoice ${invoice.invoiceNumber}`, html);
                    invoice.lastReminderSentAt = new Date();
                    if (invoice.status === 'pending' || invoice.status === 'partially-paid') {
                        invoice.status = 'overdue';
                    }
                    await invoice.save();
                }
            }
        }

        // Task 3: Recurring invoice generation (uses existing frequency field)
        const recurringParents = await Invoice.find({
            frequency: { $nin: ['once', 'One-time', 'one-time', '', null] },
            status: { $in: ['paid', 'partially-paid', 'pending', 'overdue'] },
            $or: [
                { nextRecurrenceAt: { $lte: new Date() } },
                { nextRecurrenceAt: { $exists: false }, paidDate: { $exists: true } }
            ]
        }).limit(50);

        for (const parent of recurringParents) {
            const nextDate = parent.nextRecurrenceAt || addFrequency(parent.paidDate || parent.date, parent.frequency);
            if (!nextDate || nextDate > new Date()) {
                if (!parent.nextRecurrenceAt && nextDate) {
                    parent.nextRecurrenceAt = nextDate;
                    await parent.save();
                }
                continue;
            }

            const count = await Invoice.countDocuments();
            const clone = await Invoice.create({
                invoiceNumber: `INV-${String(count + 1).padStart(5, '0')}`,
                clientId: parent.clientId,
                projectId: parent.projectId,
                clientProductId: parent.clientProductId,
                type: parent.type,
                billingInfo: parent.billingInfo,
                currency: parent.currency,
                status: 'pending',
                lineItems: parent.lineItems,
                subtotal: parent.subtotal,
                tax: parent.tax,
                total: parent.total,
                amountPaid: 0,
                payments: [],
                date: new Date(),
                dueDate: addFrequency(new Date(), parent.frequency) || new Date(Date.now() + 7 * 86400000),
                autoSend: parent.autoSend,
                frequency: parent.frequency,
                recurrenceParentId: parent._id.toString(),
                termsAndConditions: parent.termsAndConditions
            });

            parent.nextRecurrenceAt = addFrequency(new Date(), parent.frequency);
            await parent.save();

            if (parent.autoSend) {
                const client = await Client.findById(parent.clientId);
                if (client?.email) {
                    await sendEmail(
                        client.email,
                        `Invoice ${clone.invoiceNumber}`,
                        `<p>Dear ${client.name},</p><p>Your recurring invoice <strong>${clone.invoiceNumber}</strong> for ${clone.total} ${clone.currency} is ready.</p>`
                    );
                }
            }
            console.log(`[Cron] Generated recurring invoice ${clone.invoiceNumber} from ${parent.invoiceNumber}`);
        }

        // Task 4: Follow-up sequences
        const enrollments = await LeadSequenceEnrollment.find({ completed: false }).limit(100);
        for (const enrollment of enrollments) {
            const seq = await FollowUpSequence.findById(enrollment.sequenceId);
            if (!seq || !seq.enabled) continue;
            const lead = await Lead.findById(enrollment.leadId);
            if (!lead || lead.archived) {
                enrollment.completed = true;
                await enrollment.save();
                continue;
            }

            const stepIndex = enrollment.currentStep || 0;
            const step = seq.steps[stepIndex];
            if (!step) {
                enrollment.completed = true;
                await enrollment.save();
                continue;
            }

            const fireAt = new Date(enrollment.enrolledAt);
            fireAt.setDate(fireAt.getDate() + (step.dayOffset || 0));
            if (fireAt > new Date()) continue;
            if ((enrollment.firedSteps || []).includes(stepIndex)) {
                enrollment.currentStep = stepIndex + 1;
                await enrollment.save();
                continue;
            }

            lead.reminder = {
                date: new Date(),
                tone: step.tone || 'default',
                completed: false,
                sentReminders: []
            };
            lead.activities = lead.activities || [];
            lead.activities.push({
                content: step.message || `Sequence step ${stepIndex + 1}: ${seq.name}`,
                type: 'sequence',
                createdByName: 'System',
                createdAt: new Date()
            });
            await lead.save();

            enrollment.firedSteps = [...(enrollment.firedSteps || []), stepIndex];
            enrollment.lastFiredAt = new Date();
            enrollment.currentStep = stepIndex + 1;
            if (enrollment.currentStep >= seq.steps.length) enrollment.completed = true;
            await enrollment.save();
        }

        // Task 5: Recurring tasks
        const dueRecurring = await Task.find({
            'recurrence.enabled': true,
            'recurrence.nextRunAt': { $lte: new Date() },
            parentId: { $in: [null, undefined, ''] }
        }).limit(50);

        for (const t of dueRecurring) {
            const clone = await Task.create({
                title: t.recurrence.templateTitle || t.title,
                description: t.description,
                projectId: t.projectId,
                status: 'todo',
                priority: t.priority,
                assigneeId: t.assigneeId,
                dueDate: t.recurrence.nextRunAt,
                estimatedHours: t.estimatedHours,
                labels: t.labels,
                checklist: (t.checklist || []).map(c => ({ text: c.text, completed: false })),
                creatorId: t.creatorId,
                recurrence: { enabled: false, frequency: 'none' }
            });

            const next = new Date(t.recurrence.nextRunAt || Date.now());
            const interval = t.recurrence.interval || 1;
            if (t.recurrence.frequency === 'daily') next.setDate(next.getDate() + interval);
            else if (t.recurrence.frequency === 'weekly') next.setDate(next.getDate() + 7 * interval);
            else if (t.recurrence.frequency === 'monthly') next.setMonth(next.getMonth() + interval);
            t.recurrence.nextRunAt = next;
            await t.save();
            console.log(`[Cron] Cloned recurring task → ${clone.title}`);
        }

        console.log('[Cron] Daily automation tasks completed successfully.');
    } catch (error) {
        console.error('[Cron] Error running daily automation tasks:', error);
    }
});
