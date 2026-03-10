const express = require('express');
const router = express.Router();
const Amc = require('../models/Amc');
const Domain = require('../models/Domain');
const Invoice = require('../models/Invoice');
const Client = require('../models/Client');
const User = require('../models/User');
const Notification = require('../models/Notification');
const sendEmail = require('../utils/sendEmail');
const { protect, authorize } = require('../middleware/authMiddleware');

// GET all expiring items (AMC, Domain/Hosting, Overdue Invoices)
router.get('/', protect, authorize('admin', 'owner'), async (req, res) => {
    try {
        const now = new Date();
        const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

        // 1. Expiring & Expired AMCs
        const expiringAmcs = await Amc.find({
            status: { $in: ['expiring-soon', 'expired'] }
        })
            .populate('clientId', 'name email company phone')
            .populate('projectId', 'name')
            .sort({ endDate: 1 });

        // 2. Expiring & Expired Domains/Hosting
        const expiringDomains = await Domain.find({
            status: { $in: ['expiring-soon', 'expired'] }
        })
            .populate('clientId', 'name email company phone')
            .populate('projectId', 'name')
            .sort({ expiryDate: 1 });

        // 3. Overdue Invoices
        const overdueInvoices = await Invoice.find({
            status: { $in: ['pending', 'overdue'] },
            dueDate: { $lt: now }
        }).sort({ dueDate: 1 });

        // Attach client info to invoices
        const invoicesWithClients = await Promise.all(
            overdueInvoices.map(async (inv) => {
                const client = await Client.findById(inv.clientId).select('name email company phone');
                return { ...inv.toObject(), client };
            })
        );

        // 4. Upcoming expirations (next 7 days - for urgency)
        const urgentAmcs = expiringAmcs.filter(a => a.endDate <= sevenDaysLater);
        const urgentDomains = expiringDomains.filter(d => d.expiryDate <= sevenDaysLater);

        // Format response
        const alerts = [];

        for (const amc of expiringAmcs) {
            const daysLeft = Math.ceil((new Date(amc.endDate) - now) / (1000 * 60 * 60 * 24));
            alerts.push({
                id: amc._id,
                type: 'amc',
                name: amc.name,
                clientName: amc.clientId?.name || 'Unknown',
                clientEmail: amc.clientId?.email || '',
                clientCompany: amc.clientId?.company || '',
                projectName: amc.projectId?.name || '',
                expiryDate: amc.endDate,
                amount: amc.amount,
                status: amc.status,
                daysLeft,
                urgency: daysLeft <= 0 ? 'expired' : daysLeft <= 7 ? 'critical' : 'warning',
                frequency: amc.frequency
            });
        }

        for (const domain of expiringDomains) {
            const daysLeft = Math.ceil((new Date(domain.expiryDate) - now) / (1000 * 60 * 60 * 24));
            alerts.push({
                id: domain._id,
                type: domain.type || 'domain',
                name: domain.domainName,
                clientName: domain.clientId?.name || 'Unknown',
                clientEmail: domain.clientId?.email || '',
                clientCompany: domain.clientId?.company || '',
                projectName: domain.projectId?.name || '',
                expiryDate: domain.expiryDate,
                amount: domain.amount,
                status: domain.status,
                daysLeft,
                urgency: daysLeft <= 0 ? 'expired' : daysLeft <= 7 ? 'critical' : 'warning',
                provider: domain.provider
            });
        }

        for (const inv of invoicesWithClients) {
            const daysOverdue = Math.ceil((now - new Date(inv.dueDate)) / (1000 * 60 * 60 * 24));
            alerts.push({
                id: inv._id,
                type: 'invoice',
                name: `Invoice #${inv.invoiceNumber}`,
                clientName: inv.client?.name || 'Unknown',
                clientEmail: inv.client?.email || '',
                clientCompany: inv.client?.company || '',
                expiryDate: inv.dueDate,
                amount: inv.total,
                status: 'overdue',
                daysLeft: -daysOverdue,
                urgency: daysOverdue > 15 ? 'expired' : 'critical',
                invoiceNumber: inv.invoiceNumber
            });
        }

        // Sort by urgency (most urgent first)
        alerts.sort((a, b) => a.daysLeft - b.daysLeft);

        res.json({
            summary: {
                totalAlerts: alerts.length,
                expired: alerts.filter(a => a.urgency === 'expired').length,
                critical: alerts.filter(a => a.urgency === 'critical').length,
                warning: alerts.filter(a => a.urgency === 'warning').length,
                amcAlerts: expiringAmcs.length,
                domainAlerts: expiringDomains.length,
                invoiceAlerts: invoicesWithClients.length,
            },
            alerts
        });
    } catch (err) {
        console.error('[EXPIRY ALERTS ERROR]', err.message);
        res.status(500).json({ message: err.message });
    }
});

// POST - Send expiry notification to client via email + in-app notification for admins
router.post('/send-reminder', protect, authorize('admin', 'owner'), async (req, res) => {
    try {
        const { alertId, alertType, clientEmail, clientName, itemName, expiryDate, amount } = req.body;

        if (!alertId || !alertType) {
            return res.status(400).json({ message: 'Alert ID and type are required' });
        }

        const Setting = require('../models/Setting');
        const settings = await Setting.findOne({ type: 'general' });
        const companyProfile = settings?.companyProfile || {};
        const companyName = companyProfile.name || 'CRM System';

        const formatting = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' });
        const formattedDate = new Date(expiryDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
        const daysLeft = Math.ceil((new Date(expiryDate) - new Date()) / (1000 * 60 * 60 * 24));

        let typeLabel = 'Service';
        let actionText = 'renew this service';
        if (alertType === 'amc') { typeLabel = 'AMC Contract'; actionText = 'renew your AMC contract'; }
        else if (alertType === 'domain') { typeLabel = 'Domain'; actionText = 'renew your domain registration'; }
        else if (alertType === 'hosting') { typeLabel = 'Hosting'; actionText = 'renew your hosting plan'; }
        else if (alertType === 'ssl') { typeLabel = 'SSL Certificate'; actionText = 'renew your SSL certificate'; }
        else if (alertType === 'invoice') { typeLabel = 'Invoice Payment'; actionText = 'clear the pending invoice'; }

        const statusText = daysLeft <= 0
            ? `⚠️ This ${typeLabel.toLowerCase()} has EXPIRED ${Math.abs(daysLeft)} day(s) ago.`
            : `⏰ This ${typeLabel.toLowerCase()} will expire in ${daysLeft} day(s).`;

        // Send email to client
        if (clientEmail) {
            const emailHtml = `
                <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08);">
                    <div style="background: ${daysLeft <= 0 ? '#dc2626' : daysLeft <= 7 ? '#f59e0b' : '#0047AB'}; padding: 32px 40px; text-align: center;">
                        <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 800;">${companyName}</h1>
                        <p style="color: rgba(255,255,255,0.8); margin: 8px 0 0; font-size: 14px;">${typeLabel} Renewal Reminder</p>
                    </div>
                    <div style="padding: 36px 40px;">
                        <p style="color: #0f172a; font-size: 16px; margin: 0 0 16px;">Dear <strong>${clientName || 'Valued Client'}</strong>,</p>
                        <p style="color: #475569; line-height: 1.6; margin: 0 0 20px;">${statusText}</p>
                        <p style="color: #475569; line-height: 1.6; margin: 0 0 28px;">We kindly request you to ${actionText} at the earliest to avoid any disruption in services.</p>
                        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 24px; margin-bottom: 28px;">
                            <table style="width: 100%; border-collapse: collapse;">
                                <tr>
                                    <td style="padding: 8px 0; color: #64748b; font-size: 14px;">${typeLabel}</td>
                                    <td style="padding: 8px 0; text-align: right; color: #0f172a; font-weight: 600;">${itemName}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px 0; color: #64748b; font-size: 14px;">${daysLeft <= 0 ? 'Expired On' : 'Expiry Date'}</td>
                                    <td style="padding: 8px 0; text-align: right; color: ${daysLeft <= 0 ? '#dc2626' : '#0f172a'}; font-weight: 600;">${formattedDate}</td>
                                </tr>
                                ${amount ? `<tr>
                                    <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Amount</td>
                                    <td style="padding: 8px 0; text-align: right; color: #0047AB; font-weight: 800; font-size: 18px;">${formatting.format(amount)}</td>
                                </tr>` : ''}
                            </table>
                        </div>
                        <p style="color: #94a3b8; font-size: 12px; text-align: center;">Please contact us for renewal or any queries.</p>
                    </div>
                    <div style="background: #0f172a; padding: 20px 40px; text-align: center;">
                        <p style="color: #64748b; font-size: 12px; margin: 0;">Sent by ${companyName}</p>
                        ${companyProfile.email ? `<p style="color: #475569; font-size: 12px; margin: 6px 0 0;">${companyProfile.email}</p>` : ''}
                    </div>
                </div>
            `;

            try {
                await sendEmail({
                    to: clientEmail,
                    subject: `${daysLeft <= 0 ? '⚠️ EXPIRED' : '⏰ Expiring Soon'}: ${typeLabel} - ${itemName} | ${companyName}`,
                    html: emailHtml
                });
            } catch (emailErr) {
                console.error('[EXPIRY EMAIL ERROR]', emailErr.message);
                // Continue even if email fails - still create in-app notification
            }
        }

        // Create in-app notification for all admin/owner users
        const admins = await User.find({ role: { $in: ['admin', 'owner'] } }).select('_id');
        const notificationPromises = admins.map(admin =>
            Notification.create({
                userId: admin._id,
                title: `${typeLabel} Reminder Sent`,
                message: `Expiry reminder sent to ${clientName || 'client'} for "${itemName}" (${daysLeft <= 0 ? 'Expired' : `${daysLeft} days left`})`,
                type: alertType === 'invoice' ? 'overdue_invoice' : 'expiry_alert',
                relatedId: alertId,
                relatedType: alertType
            })
        );
        await Promise.all(notificationPromises);

        res.json({
            success: true,
            message: `Reminder ${clientEmail ? 'emailed to ' + clientEmail + ' and ' : ''}saved as notification`,
            emailSent: !!clientEmail
        });
    } catch (err) {
        console.error('[SEND REMINDER ERROR]', err.message);
        res.status(500).json({ message: err.message });
    }
});

// POST - Send bulk reminders for all critical/expired items
router.post('/send-bulk', protect, authorize('admin', 'owner'), async (req, res) => {
    try {
        const { alertIds } = req.body; // Array of { id, type, clientEmail, clientName, itemName, expiryDate, amount }

        if (!alertIds || !Array.isArray(alertIds) || alertIds.length === 0) {
            return res.status(400).json({ message: 'No alerts selected' });
        }

        let sentCount = 0;
        let failedCount = 0;

        for (const alert of alertIds) {
            try {
                // Reuse the same logic - make internal call
                const Setting = require('../models/Setting');
                const settings = await Setting.findOne({ type: 'general' });
                const companyName = settings?.companyProfile?.name || 'CRM System';

                if (alert.clientEmail) {
                    const daysLeft = Math.ceil((new Date(alert.expiryDate) - new Date()) / (1000 * 60 * 60 * 24));
                    let typeLabel = alert.type === 'amc' ? 'AMC Contract' : alert.type === 'invoice' ? 'Invoice' : 'Domain/Hosting';

                    try {
                        await sendEmail({
                            to: alert.clientEmail,
                            subject: `${daysLeft <= 0 ? '⚠️ EXPIRED' : '⏰ Expiring Soon'}: ${typeLabel} - ${alert.itemName} | ${companyName}`,
                            html: `<p>Dear ${alert.clientName},</p><p>This is a reminder that your ${typeLabel.toLowerCase()} "${alert.itemName}" ${daysLeft <= 0 ? 'has expired' : `will expire on ${new Date(alert.expiryDate).toLocaleDateString('en-IN')}`}. Please contact us for renewal.</p><p>Regards,<br/>${companyName}</p>`
                        });
                        sentCount++;
                    } catch (e) {
                        failedCount++;
                    }
                }

                // Create notification
                const admins = await User.find({ role: { $in: ['admin', 'owner'] } }).select('_id');
                await Promise.all(admins.map(admin =>
                    Notification.create({
                        userId: admin._id,
                        title: `Bulk Reminder Sent`,
                        message: `Expiry reminder sent for "${alert.itemName}" to ${alert.clientName || 'client'}`,
                        type: 'expiry_alert',
                        relatedId: alert.id,
                        relatedType: alert.type
                    })
                ));
            } catch (e) {
                failedCount++;
            }
        }

        res.json({
            success: true,
            message: `Sent ${sentCount} reminders successfully${failedCount > 0 ? `, ${failedCount} failed` : ''}`,
            sentCount,
            failedCount
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
