const express = require('express');
const router = express.Router();
const VendorBill = require('../models/VendorBill');
const { protect, checkPermission } = require('../middleware/authMiddleware');
const { applyCreatorScope, assertCreatorAccess } = require('../utils/dataScope');

router.get('/', protect, checkPermission('vendor_bills', 'view'), async (req, res) => {
    try {
        const filter = await applyCreatorScope({}, req.user, 'vendor_bills');
        const bills = await VendorBill.find(filter).sort({ billDate: -1 });
        res.json(bills);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.post('/', protect, checkPermission('vendor_bills', 'create'), async (req, res) => {
    try {
        const amount = Number(req.body.amount || 0);
        const tax = Number(req.body.tax || 0);
        const bill = await VendorBill.create({
            billNumber: req.body.billNumber || `VB-${Date.now().toString().slice(-6)}`,
            vendorName: req.body.vendorName,
            vendorEmail: req.body.vendorEmail,
            vendorGst: req.body.vendorGst,
            category: req.body.category || 'general',
            amount,
            tax,
            total: Number(req.body.total != null ? req.body.total : amount + tax),
            currency: req.body.currency || 'INR',
            billDate: req.body.billDate || new Date(),
            dueDate: req.body.dueDate,
            status: req.body.status || 'pending',
            notes: req.body.notes,
            projectId: req.body.projectId,
            clientId: req.body.clientId,
            createdBy: req.user._id.toString()
        });
        res.status(201).json(bill);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

router.put('/:id', protect, checkPermission('vendor_bills', 'edit'), async (req, res) => {
    try {
        const existing = await VendorBill.findById(req.params.id);
        if (!existing) return res.status(404).json({ message: 'Not found' });
        const access = await assertCreatorAccess(req.user, existing, 'vendor_bills');
        if (!access.ok) return res.status(access.status).json({ message: access.message });

        const payload = { ...req.body };
        delete payload.createdBy;
        const bill = await VendorBill.findByIdAndUpdate(
            req.params.id,
            { $set: { ...payload, updatedAt: new Date() } },
            { new: true }
        );
        if (!bill) return res.status(404).json({ message: 'Not found' });
        res.json(bill);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

router.post('/:id/mark-paid', protect, checkPermission('vendor_bills', 'mark_paid'), async (req, res) => {
    try {
        const bill = await VendorBill.findById(req.params.id);
        if (!bill) return res.status(404).json({ message: 'Not found' });
        const access = await assertCreatorAccess(req.user, bill, 'vendor_bills');
        if (!access.ok) return res.status(access.status).json({ message: access.message });
        bill.status = 'paid';
        bill.paidDate = new Date();
        bill.updatedAt = new Date();
        await bill.save();
        res.json(bill);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

router.delete('/:id', protect, checkPermission('vendor_bills', 'delete'), async (req, res) => {
    try {
        const existing = await VendorBill.findById(req.params.id);
        if (!existing) return res.status(404).json({ message: 'Not found' });
        const access = await assertCreatorAccess(req.user, existing, 'vendor_bills');
        if (!access.ok) return res.status(access.status).json({ message: access.message });
        await VendorBill.findByIdAndDelete(req.params.id);
        res.json({ message: 'Deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
