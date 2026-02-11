const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema({
    date: { type: Date, required: true },
    amount: { type: Number, required: true },
    category: { type: String, required: true },
    paymentMode: { type: String, required: true },
    paidBy: { type: String, required: true },
    paidById: { type: String }, // User ID for filtering
    note: { type: String },
    receipt: { type: String }, // URL or path
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Expense', expenseSchema);
