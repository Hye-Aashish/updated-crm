const express = require('express');
const router = express.Router();
const Expense = require('../models/Expense');
const { protect, checkPermission } = require('../middleware/authMiddleware');

// Get all expenses
router.get('/', protect, async (req, res) => {
    try {
        let filter = {};
        // If not admin/owner, only show own expenses
        if (req.user.role !== 'admin' && req.user.role !== 'owner') {
            filter = { paidById: req.user._id.toString() };
        }

        const expenses = await Expense.find(filter).sort({ date: -1 });
        res.json(expenses);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Create expense (Staff only — clients cannot create)
router.post('/', protect, checkPermission('expenses', 'create'), async (req, res) => {
    // Block clients from creating expenses
    if (req.user.role === 'client') {
        return res.status(403).json({ message: 'Clients cannot create expenses' });
    }

    const expense = new Expense({
        date: req.body.date,
        amount: req.body.amount,
        category: req.body.category,
        paymentMode: req.body.paymentMode,
        paidBy: req.body.paidBy,
        paidById: req.user._id.toString(), // Automatically link to current user
        note: req.body.note,
        receipt: req.body.receipt
    });

    try {
        const newExpense = await expense.save();
        res.status(201).json(newExpense);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Update expense
router.put('/:id', protect, checkPermission('expenses', 'edit'), async (req, res) => {
    try {
        const updateData = {};
        if (req.body.date !== undefined) updateData.date = req.body.date;
        if (req.body.amount !== undefined) updateData.amount = req.body.amount;
        if (req.body.category !== undefined) updateData.category = req.body.category;
        if (req.body.paymentMode !== undefined) updateData.paymentMode = req.body.paymentMode;
        if (req.body.paidBy !== undefined) updateData.paidBy = req.body.paidBy;
        if (req.body.note !== undefined) updateData.note = req.body.note;
        if (req.body.receipt !== undefined) updateData.receipt = req.body.receipt;

        const updatedExpense = await Expense.findByIdAndUpdate(req.params.id, updateData, { new: true, runValidators: true });
        if (!updatedExpense) return res.status(404).json({ message: 'Expense not found' });
        res.json(updatedExpense);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Delete expense
router.delete('/:id', protect, checkPermission('expenses', 'delete'), async (req, res) => {
    try {
        const deletedExpense = await Expense.findByIdAndDelete(req.params.id);
        if (!deletedExpense) return res.status(404).json({ message: 'Expense not found' });
        res.json({ message: 'Expense deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
