const express = require('express');
const router = express.Router();
const VendorBill = require('../models/VendorBill');
const { protect, checkPermission, authorize } = require('../middleware/authMiddleware');

router.get('/', protect, authorize('admin', 'owner'), async (req, res) => {
    try {
        const bills = await VendorBill.find().sort({ billDate: -1 });
        res.json(bills);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.post('/', protect, authorize('admin', 'owner'), async (req, res) => {
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

router.put('/:id', protect, authorize('admin', 'owner'), async (req, res) => {
    try {
        const bill = await VendorBill.findByIdAndUpdate(
            req.params.id,
            { $set: { ...req.body, updatedAt: new Date() } },
            { new: true }
        );
        if (!bill) return res.status(404).json({ message: 'Not found' });
        res.json(bill);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

router.post('/:id/mark-paid', protect, authorize('admin', 'owner'), async (req, res) => {
    try {
        const bill = await VendorBill.findById(req.params.id);
        if (!bill) return res.status(404).json({ message: 'Not found' });
        bill.status = 'paid';
        bill.paidDate = new Date();
        bill.updatedAt = new Date();
        await bill.save();
        res.json(bill);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

router.delete('/:id', protect, authorize('admin', 'owner'), async (req, res) => {
    try {
        await VendorBill.findByIdAndDelete(req.params.id);
        res.json({ message: 'Deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
