const cron = require('node-cron');
const Invoice = require('../models/Invoice');
const Client = require('../models/Client');
const Domain = require('../models/Domain');
const Setting = require('../models/Setting');
const sendEmail = require('../utils/sendEmail');
const { generateAutoInvoice } = require('./invoiceService');

// Run every day at 8:00 AM
cron.schedule('0 8 * * *', async () => {
    console.log('[Cron] Running daily automation tasks...');
    try {
        const settings = await Setting.findOne({ type: 'general' });
        if (!settings || !settings.notifications) return;

        // Task 1: Auto-generate quotations for domains expiring in exactly 7 days
        // Only if automation is toggled on (assuming we add a flag, or we just do it)
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
            console.log(`[Cron] Domain expiring soon: ${domain.domainName}. Generating quotation...`);
            // We can reuse generateAutoInvoice or a custom logic. For now, just logging or sending reminder.
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

        // Task 2: Overdue Invoices Reminder
        if (settings.notifications.invoiceDue) {
            const yesterday = new Date();
            yesterday.setHours(0, 0, 0, 0);

            const overdueInvoices = await Invoice.find({
                status: { $in: ['pending', 'partially-paid'] },
                dueDate: { $lt: yesterday }
            });

            for (const invoice of overdueInvoices) {
                const client = await Client.findById(invoice.clientId);
                if (client && client.email) {
                    console.log(`[Cron] Sending overdue reminder for Invoice ${invoice.invoiceNumber}`);
                    const html = `
                        <h3>Invoice Overdue</h3>
                        <p>Dear ${client.name},</p>
                        <p>This is a friendly reminder that invoice <strong>${invoice.invoiceNumber}</strong> was due on ${new Date(invoice.dueDate).toDateString()}.</p>
                        <p>Total Due: ${invoice.total}</p>
                        <p>Please arrange payment at your earliest convenience.</p>
                    `;
                    await sendEmail(client.email, `Overdue Reminder: Invoice ${invoice.invoiceNumber}`, html);
                }
            }
        }

        console.log('[Cron] Daily automation tasks completed successfully.');
    } catch (error) {
        console.error('[Cron] Error running daily automation tasks:', error);
    }
});
