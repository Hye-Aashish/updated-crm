const express = require('express');
const router = express.Router();
const CreditNote = require('../models/CreditNote');
const Invoice = require('../models/Invoice');
const { protect, checkPermission } = require('../middleware/authMiddleware');

router.get('/', protect, checkPermission('invoices', 'view'), async (req, res) => {
    try {
        const filter = {};
        if (req.query.clientId) filter.clientId = req.query.clientId;
        if (req.query.invoiceId) filter.invoiceId = req.query.invoiceId;
        const notes = await CreditNote.find(filter).sort({ createdAt: -1 });
        res.json(notes);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.post('/', protect, checkPermission('invoices', 'create'), async (req, res) => {
    try {
        const count = await CreditNote.countDocuments();
        const creditNoteNumber = req.body.creditNoteNumber || `CN-${String(count + 1).padStart(5, '0')}`;
        const note = await CreditNote.create({
            creditNoteNumber,
            clientId: req.body.clientId,
            invoiceId: req.body.invoiceId,
            amount: Number(req.body.amount || 0),
            currency: req.body.currency || 'INR',
            reason: req.body.reason || '',
            status: req.body.status || 'issued',
            createdBy: req.user._id.toString()
        });
        res.status(201).json(note);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

router.post('/:id/apply', protect, checkPermission('invoices', 'edit'), async (req, res) => {
    try {
        const note = await CreditNote.findById(req.params.id);
        if (!note) return res.status(404).json({ message: 'Credit note not found' });
        if (note.status === 'applied' || note.status === 'void') {
            return res.status(400).json({ message: 'Credit note already applied or void' });
        }

        const invoiceId = req.body.invoiceId || note.invoiceId;
        if (!invoiceId) return res.status(400).json({ message: 'invoiceId required' });

        const invoice = await Invoice.findById(invoiceId);
        if (!invoice) return res.status(404).json({ message: 'Invoice not found' });

        const amountPaid = Number(invoice.amountPaid || 0) + Number(note.amount || 0);
        invoice.amountPaid = Math.min(amountPaid, invoice.total);
        invoice.payments = invoice.payments || [];
        invoice.payments.push({
            amount: note.amount,
            method: 'credit-note',
            note: `Applied ${note.creditNoteNumber}`,
            paidAt: new Date(),
            recordedBy: req.user._id.toString()
        });

        if (invoice.amountPaid >= invoice.total) {
            invoice.status = 'paid';
            invoice.paidDate = new Date();
        } else if (invoice.amountPaid > 0) {
            invoice.status = 'partially-paid';
        }
        invoice.updatedAt = new Date();
        await invoice.save();

        note.status = 'applied';
        note.appliedToInvoiceId = invoiceId;
        note.appliedAt = new Date();
        note.updatedAt = new Date();
        await note.save();

        res.json({ note, invoice });
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

router.delete('/:id', protect, checkPermission('invoices', 'delete'), async (req, res) => {
    try {
        const note = await CreditNote.findById(req.params.id);
        if (!note) return res.status(404).json({ message: 'Not found' });
        if (note.status === 'applied') {
            note.status = 'void';
            await note.save();
            return res.json({ message: 'Voided' });
        }
        await note.deleteOne();
        res.json({ message: 'Deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
