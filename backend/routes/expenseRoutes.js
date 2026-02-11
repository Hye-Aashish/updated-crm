const express = require('express');
const router = express.Router();
const Expense = require('../models/Expense');
const { protect, authorize } = require('../middleware/authMiddleware');

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

// Create expense
router.post('/', protect, async (req, res) => {
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

// Delete expense
router.delete('/:id', protect, authorize('admin', 'owner'), async (req, res) => {
    try {
        const deletedExpense = await Expense.findByIdAndDelete(req.params.id);
        if (!deletedExpense) return res.status(404).json({ message: 'Expense not found' });
        res.json({ message: 'Expense deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
