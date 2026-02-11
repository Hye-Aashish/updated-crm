const express = require('express');
const router = express.Router();
const Invoice = require('../models/Invoice');
const Client = require('../models/Client');
const Project = require('../models/Project');
const sendEmail = require('../utils/sendEmail');
const { protect, authorize } = require('../middleware/authMiddleware');

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

// GET single invoice
router.get('/:id', protect, async (req, res) => {
    try {
        const invoice = await Invoice.findById(req.params.id);
        if (!invoice) return res.status(404).json({ message: 'Invoice not found' });

        // RBAC Check for View Access
        if (req.user.role !== 'admin' && req.user.role !== 'owner') {
            const userId = req.user._id.toString();

            // Allow if client is assigned to me
            const client = await Client.findById(invoice.clientId);
            if (client && client.assignedTo === userId) {
                return res.json(invoice);
            }

            // Allow if I'm a member/PM of the project
            if (invoice.projectId) {
                const project = await Project.findById(invoice.projectId);
                if (project && (project.pmId === userId || (project.members && project.members.includes(userId)))) {
                    return res.json(invoice);
                }
            }

            return res.status(403).json({ message: 'Not authorized to view this invoice' });
        }

        res.json(invoice);
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

// SEND invoice via Email
router.post('/:id/send', protect, async (req, res) => {
    try {
        const invoice = await Invoice.findById(req.params.id);
        if (!invoice) return res.status(404).json({ message: 'Invoice not found' });

        // Get Client
        const Client = require('../models/Client'); // Import here or top level
        const client = await Client.findById(invoice.clientId);

        if (!client || !client.email) {
            return res.status(400).json({ message: 'Client email not found. Please update client details.' });
        }

        const sendEmail = require('../utils/sendEmail');
        const formatting = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' });

        const targetEmail = req.body.customEmail || client.email;

        const message = `
            <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
                <h2 style="color: #0f172a;">Invoice #${invoice.invoiceNumber}</h2>
                <p>Dear ${client.name},</p>
                <p>Please find attached invoice <strong>#${invoice.invoiceNumber}</strong> dated <strong>${new Date(invoice.date).toLocaleDateString()}</strong>.</p>
                
                <div style="background: #f1f5f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
                    <p style="margin: 5px 0;"><strong>Amount Due:</strong> <span style="font-size: 1.2em; color: #0f172a;">${formatting.format(invoice.total)}</span></p>
                    <p style="margin: 5px 0;"><strong>Due Date:</strong> ${new Date(invoice.dueDate).toLocaleDateString()}</p>
                </div>

                <p>Thank you for your business.</p>
                <p>Best regards,<br>Nexprism Team</p>
            </div>
        `;

        await sendEmail({
            to: targetEmail,
            subject: `Invoice #${invoice.invoiceNumber} from Nexprism`,
            html: message
        });

        res.json({ success: true, message: 'Invoice email sent successfully' });

    } catch (err) {
        console.error("Email send error:", err);
        res.status(500).json({ message: err.message || 'Failed to send email' });
    }
});

module.exports = router;
