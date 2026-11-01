require('dotenv').config();
const mongoose = require('mongoose');
const Expense = require('./models/Expense');

mongoose.connect(process.env.MONGO_URI || (() => { throw new Error("MONGO_URI required"); })()).then(async () => {
    try {
        const count = await Expense.countDocuments();
        console.log(`Total expenses in DB: ${count}`);

        if (count > 0) {
            const sample = await Expense.findOne();
            console.log('Sample expense:', sample);
        }
    } catch (err) {
        console.error(err);
    }
    process.exit(0);
});
