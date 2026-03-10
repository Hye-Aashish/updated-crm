require('dotenv').config();
const mongoose = require('mongoose');
const Expense = require('./models/Expense');

mongoose.connect(process.env.MONGO_URI || 'mongodb://aashishofficial123_db_user:AV445S3k0brlHEPu@ac-791ijbv-shard-00-00.q0seg1w.mongodb.net:27017/CRM_DB?ssl=true&authSource=admin').then(async () => {
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
