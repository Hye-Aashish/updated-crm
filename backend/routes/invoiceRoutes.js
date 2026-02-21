const express = require('express');
const router = express.Router();
const Invoice = require('../models/Invoice');
const Client = require('../models/Client');
const Project = require('../models/Project');
const sendEmail = require('../utils/sendEmail');
const { protect, authorize } = require('../middleware/authMiddleware');
const axios = require('axios');
const crypto = require('crypto');

// GET all invoices
router.get('/', protect, async (req, res) => {
    try {
        let filter = {};
        if (req.user.role !== 'admin' && req.user.role !== 'owner') {
            const userId = req.user._id.toString();

            // Invoices for clients assigned to me
            const myClients = await Client.find({ assignedTo: userId }).select('_id');
            const myClientIds = myClients.map(c => c._id.toString());

            // Invoices for projects I manage or belong to
            const myProjects = await Project.find({
                $or: [{ pmId: userId }, { members: userId }]
            }).select('_id');
            const myProjectIds = myProjects.map(p => p._id.toString());

            filter = {
                $or: [
                    { clientId: { $in: myClientIds } },
                    { projectId: { $in: myProjectIds } }
                ]
            };
        }
        const invoices = await Invoice.find(filter).sort({ createdAt: -1 });
        res.json(invoices);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// GET single invoice (Publically accessible for clients)
router.get('/:id', async (req, res) => {
    try {
        const invoice = await Invoice.findById(req.params.id);
        if (!invoice) return res.status(404).json({ message: 'Invoice not found' });

        // Get Client & Project details to return with invoice
        const client = await Client.findById(invoice.clientId);
        const project = invoice.projectId ? await Project.findById(invoice.projectId) : null;

        res.json({
            ...invoice._doc,
            client,
            project
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// CREATE a new invoice
// CREATE a new invoice
router.post('/', protect, async (req, res) => {
    const invoice = new Invoice({
        invoiceNumber: req.body.invoiceNumber,
        clientId: req.body.clientId,
        projectId: req.body.projectId,
        type: req.body.type,
        status: req.body.status,
        lineItems: req.body.lineItems,
        subtotal: req.body.subtotal,
        tax: req.body.tax,
        total: req.body.total,
        date: req.body.date,
        dueDate: req.body.dueDate,
        paidDate: req.body.paidDate,
        autoSend: req.body.autoSend,
        frequency: req.body.frequency
    });

    try {
        const newInvoice = await invoice.save();

        if (req.body.autoSend) {
            try {
                const client = await Client.findById(newInvoice.clientId);
                if (client && client.email) {
                    const formatting = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' });
                    const message = `
                        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
                            <h2 style="color: #0f172a;">Invoice #${newInvoice.invoiceNumber}</h2>
                            <p>Dear ${client.name},</p>
                            <p>Please find attached invoice <strong>#${newInvoice.invoiceNumber}</strong> dated <strong>${new Date(newInvoice.date).toLocaleDateString()}</strong>.</p>
                            
                            <div style="background: #f1f5f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
                                <p style="margin: 5px 0;"><strong>Amount Due:</strong> <span style="font-size: 1.2em; color: #0f172a;">${formatting.format(newInvoice.total)}</span></p>
                                <p style="margin: 5px 0;"><strong>Due Date:</strong> ${new Date(newInvoice.dueDate).toLocaleDateString()}</p>
                            </div>

                            <p>Thank you for your business.</p>
                            
                            ${process.env.FRONTEND_URL ? `
                            <div style="margin-top: 30px;">
                                <a href="${process.env.FRONTEND_URL}/invoices/${newInvoice._id}" 
                                   style="background-color: #0f172a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                                    View & Pay Invoice
                                </a>
                            </div>
                            ` : ''}

                            <p>Best regards,<br>Nexprism Team</p>
                        </div>
                    `;

                    await sendEmail({
                        to: client.email,
                        subject: `Invoice #${newInvoice.invoiceNumber} from Nexprism`,
                        html: message
                    });
                }
            } catch (emailErr) {
                console.error("Auto-send failed:", emailErr);
            }
        }

        res.status(201).json(newInvoice);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// UPDATE an invoice
router.put('/:id', protect, async (req, res) => {
    try {
        const invoice = await Invoice.findById(req.params.id);
        if (!invoice) return res.status(404).json({ message: 'Invoice not found' });

        // RBAC Check
        if (req.user.role !== 'admin' && req.user.role !== 'owner') {
            const userId = req.user._id.toString();
            const client = await Client.findById(invoice.clientId);
            const project = invoice.projectId ? await Project.findById(invoice.projectId) : null;

            const isClientOwner = client && client.assignedTo === userId;
            const isPM = project && project.pmId === userId;

            if (!isClientOwner && !isPM) {
                return res.status(403).json({ message: 'Not authorized to update this invoice' });
            }
        }

        const updatedInvoice = await Invoice.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(updatedInvoice);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// DELETE an invoice
router.delete('/:id', protect, authorize('admin', 'owner'), async (req, res) => {
    try {
        const deletedInvoice = await Invoice.findByIdAndDelete(req.params.id);
        if (!deletedInvoice) return res.status(404).json({ message: 'Invoice not found' });
        res.json({ message: 'Invoice deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// SEND invoice via Email (with PDF attachment)
router.post('/:id/send', protect, async (req, res) => {
    try {
        const invoice = await Invoice.findById(req.params.id);
        if (!invoice) return res.status(404).json({ message: 'Invoice not found' });

        const client = await Client.findById(invoice.clientId);
        if (!client || !client.email) {
            return res.status(400).json({ message: 'Client email not found. Please update client details.' });
        }

        const Setting = require('../models/Setting');
        const settings = await Setting.findOne({ type: 'general' });
        const companyProfile = settings?.companyProfile || {};

        const formatting = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' });

        const targetEmail = req.body.customEmail || client.email;
        console.log(`[SEND] Starting send to ${targetEmail} for Invoice: ${invoice.invoiceNumber}`);

        // Generate PDF attachment
        let pdfBuffer = null;
        try {
            const generateInvoicePDF = require('../utils/generateInvoicePDF');
            console.log(`[SEND] Calling generateInvoicePDF...`);
            pdfBuffer = await generateInvoicePDF(invoice, client, companyProfile);
            console.log(`[SEND] PDF generated, size: ${pdfBuffer ? pdfBuffer.length : 'NULL'}`);
        } catch (pdfErr) {
            console.error('PDF generation failed:', pdfErr.message);
        }

        const invoicePageUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/invoices/${invoice._id}`;

        const message = `
            <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08);">
                <div style="background: #0047AB; padding: 32px 40px; text-align: center;">
                    <h1 style="color: white; margin: 0; font-size: 26px; font-weight: 800;">${companyProfile.name || 'NEXPRISM'}</h1>
                    <p style="color: rgba(255,255,255,0.7); margin: 6px 0 0; font-size: 13px;">Invoice #${invoice.invoiceNumber}</p>
                </div>
                <div style="padding: 36px 40px;">
                    <p style="color: #0f172a; font-size: 16px; margin: 0 0 16px;">Dear <strong>${client.name}</strong>,</p>
                    <p style="color: #475569; line-height: 1.6; margin: 0 0 28px;">Please find your invoice <strong>#${invoice.invoiceNumber}</strong> attached to this email as a PDF. You can also view and pay online using the button below.</p>
                    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 24px; margin-bottom: 28px;">
                        <table style="width: 100%; border-collapse: collapse;">
                            <tr>
                                <td style="padding: 6px 0; color: #64748b; font-size: 14px;">Invoice Date</td>
                                <td style="padding: 6px 0; text-align: right; color: #0f172a; font-weight: 600;">${new Date(invoice.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                            </tr>
                            <tr>
                                <td style="padding: 6px 0; color: #64748b; font-size: 14px;">Due Date</td>
                                <td style="padding: 6px 0; text-align: right; color: #dc2626; font-weight: 600;">${new Date(invoice.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                            </tr>
                            <tr><td colspan="2" style="border-top: 1px solid #e2e8f0; padding-top: 10px;"></td></tr>
                            <tr>
                                <td style="color: #0f172a; font-size: 18px; font-weight: 800;">Total Due</td>
                                <td style="text-align: right; color: #0047AB; font-size: 22px; font-weight: 800;">${formatting.format(invoice.total)}</td>
                            </tr>
                        </table>
                    </div>
                    <div style="text-align: center; margin-bottom: 24px;">
                        <a href="${invoicePageUrl}" style="display: inline-block; background: #0047AB; color: white; padding: 14px 36px; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 16px;">View &amp; Pay Invoice &rarr;</a>
                    </div>
                    <p style="color: #94a3b8; font-size: 12px; text-align: center; margin: 0;">Or visit: <a href="${invoicePageUrl}" style="color: #0047AB;">${invoicePageUrl}</a></p>
                </div>
                <div style="background: #0f172a; padding: 20px 40px; text-align: center;">
                    <p style="color: #64748b; font-size: 12px; margin: 0;">Thank you for your business!</p>
                    ${companyProfile.email ? `<p style="color: #475569; font-size: 12px; margin: 6px 0 0;">${companyProfile.email}</p>` : ''}
                </div>
            </div>
        `;

        const emailOptions = {
            to: targetEmail,
            subject: `Invoice #${invoice.invoiceNumber} from ${companyProfile.name || 'Nexprism'} – ${formatting.format(invoice.total)}`,
            html: message,
            ...(pdfBuffer && {
                attachments: [{
                    filename: `Invoice-${invoice.invoiceNumber}.pdf`,
                    content: pdfBuffer,
                    contentType: 'application/pdf'
                }]
            })
        };

        console.log(`[SEND] Calling sendEmail...`);
        await sendEmail(emailOptions);
        console.log(`[SEND] sendEmail COMPLETED successfully.`);

        res.json({ success: true, message: `Invoice emailed to ${targetEmail}${pdfBuffer ? ' with PDF attachment' : ''}` });

    } catch (err) {
        console.error("Email send error:", err.message);
        res.status(500).json({
            message: "Email sending failed: " + err.message,
            errorDetail: err.code || 'UNKNOWN'
        });
    }
});


// Create Cashfree Payment Session (Publicly accessible for clients to pay)
router.post('/:id/payment-session', async (req, res) => {
    try {
        const invoice = await Invoice.findById(req.params.id);
        if (!invoice) return res.status(404).json({ message: 'Invoice not found' });

        const client = await Client.findById(invoice.clientId);
        if (!client) return res.status(404).json({ message: 'Client not found' });

        // Fetch Settings for Cashfree credentials
        const Setting = require('../models/Setting');
        const settings = await Setting.findOne({ type: 'general' });
        const billing = settings?.billing || {};

        const cashfreeClientId = billing.cashfreeClientId || process.env.CASHFREE_CLIENT_ID;
        const cashfreeClientSecret = billing.cashfreeClientSecret || process.env.CASHFREE_CLIENT_SECRET;
        const cashfreeMode = billing.cashfreeMode || process.env.CASHFREE_MODE || 'sandbox';

        if (!cashfreeClientId || !cashfreeClientSecret) {
            return res.status(400).json({ message: 'Cashfree credentials are not configured in settings.' });
        }

        const isSandbox = cashfreeMode !== 'production';
        const baseUrl = isSandbox
            ? 'https://sandbox.cashfree.com/pg'
            : 'https://api.cashfree.com/pg';

        const orderId = `INV_${invoice.invoiceNumber}_${Date.now()}`;

        const orderData = {
            order_amount: invoice.total,
            order_currency: 'INR',
            order_id: orderId,
            customer_details: {
                customer_id: client._id.toString(),
                customer_email: client.email,
                customer_phone: client.phone || '9999999999',
                customer_name: client.name
            },
            order_meta: {
                return_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/invoices/${invoice._id}?status=success&order_id={order_id}`,
                notify_url: `${process.env.BACKEND_URL || 'http://localhost:5000'}/api/invoices/payment/webhook`
            }
        };

        const response = await axios.post(`${baseUrl}/orders`, orderData, {
            headers: {
                'x-client-id': cashfreeClientId,
                'x-client-secret': cashfreeClientSecret,
                'x-api-version': '2023-08-01',
                'Content-Type': 'application/json'
            }
        });

        invoice.cashfreeOrderId = response.data.order_id;
        invoice.cashfreePaymentSessionId = response.data.payment_session_id;
        await invoice.save();

        res.json({
            payment_session_id: response.data.payment_session_id,
            order_id: response.data.order_id
        });

    } catch (err) {
        console.error("Cashfree Order Error:", err.response?.data || err.message);
        res.status(500).json({
            message: 'Failed to create payment session',
            error: err.response?.data || err.message
        });
    }
});

// Record MANUAL payment (Admin/Owner only)
router.post('/:id/manual-payment', protect, authorize('admin', 'owner'), async (req, res) => {
    try {
        const invoice = await Invoice.findById(req.params.id);
        if (!invoice) return res.status(404).json({ message: 'Invoice not found' });

        invoice.status = 'paid';
        invoice.paidDate = new Date();
        await invoice.save();

        res.json({ success: true, message: 'Invoice marked as paid manually' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Verify Payment Status manually (Useful when Webhooks fail or for local dev)
router.get('/:id/verify-payment', protect, async (req, res) => {
    try {
        const invoice = await Invoice.findById(req.params.id);
        if (!invoice) return res.status(404).json({ message: 'Invoice not found' });
        if (!invoice.cashfreeOrderId) return res.status(400).json({ message: 'No payment order found for this invoice' });

        // Fetch Settings for Cashfree credentials
        const Setting = require('../models/Setting');
        const settings = await Setting.findOne({ type: 'general' });
        const billing = settings?.billing || {};

        const cashfreeClientId = billing.cashfreeClientId || process.env.CASHFREE_CLIENT_ID;
        const cashfreeClientSecret = billing.cashfreeClientSecret || process.env.CASHFREE_CLIENT_SECRET;
        const cashfreeMode = billing.cashfreeMode || process.env.CASHFREE_MODE || 'sandbox';

        if (!cashfreeClientId || !cashfreeClientSecret) {
            return res.status(400).json({ message: 'Cashfree credentials are not configured.' });
        }

        const isSandbox = cashfreeMode !== 'production';
        const baseUrl = isSandbox
            ? 'https://sandbox.cashfree.com/pg'
            : 'https://api.cashfree.com/pg';

        const response = await axios.get(`${baseUrl}/orders/${invoice.cashfreeOrderId}`, {
            headers: {
                'x-client-id': cashfreeClientId,
                'x-client-secret': cashfreeClientSecret,
                'x-api-version': '2023-08-01'
            }
        });

        const orderStatus = response.data.order_status;

        if (orderStatus === 'PAID' || orderStatus === 'SUCCESS') {
            if (invoice.status !== 'paid') {
                invoice.status = 'paid';
                invoice.paidDate = new Date();
                await invoice.save();
                console.log(`[VERIFICATION] Invoice #${invoice.invoiceNumber} verified as PAID`);
            }
            return res.json({ status: 'paid', message: 'Payment verified and updated' });
        }

        res.json({ status: invoice.status, cashfreeStatus: orderStatus });

    } catch (err) {
        console.error("Verification Error:", err.response?.data || err.message);
        res.status(500).json({ message: 'Failed to verify payment', error: err.response?.data || err.message });
    }
});

// Cashfree Webhook - Public
router.post('/payment/webhook', async (req, res) => {
    try {
        // Log webhook for debugging
        console.log("Cashfree Webhook Received:", JSON.stringify(req.body));

        // Cashfree can send webhook in different formats depending on version/config
        const orderId = req.body.data?.order?.order_id || req.body.order_id;
        const paymentStatus = req.body.data?.payment?.payment_status || req.body.order_status;

        if (paymentStatus === 'SUCCESS' || paymentStatus === 'PAID') {
            const invoice = await Invoice.findOne({ cashfreeOrderId: orderId });

            if (!invoice) {
                // Fallback: try finding by part of order ID if prefix used
                // orderId might be like INV_123_167823...
                const parts = (orderId || '').split('_');
                if (parts.length >= 2) {
                    const invNo = parts[1];
                    const invByNo = await Invoice.findOne({ invoiceNumber: invNo });
                    if (invByNo && invByNo.status !== 'paid') {
                        invByNo.status = 'paid';
                        invByNo.paidDate = new Date();
                        await invByNo.save();
                        console.log(`[PAYMENT] Invoice #${invByNo.invoiceNumber} paid (via fallback lookup)`);
                        return res.status(200).send('OK');
                    }
                }
            }

            if (invoice && invoice.status !== 'paid') {
                invoice.status = 'paid';
                invoice.paidDate = new Date();
                await invoice.save();
                console.log(`[PAYMENT] Invoice #${invoice.invoiceNumber} paid via Cashfree Webhook`);
            }
        }

        res.status(200).send('OK');
    } catch (err) {
        console.error("Webhook Error:", err);
        res.status(500).send('Webhook Processing Failed');
    }
});

module.exports = router;
