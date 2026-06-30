require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Client = require('./models/Client');

const deleteDemoAccounts = async () => {
    try {
        console.log('Connecting to database...');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected.');

        const adminEmail = 'admin_demo@nexprism.com';
        const employeeEmail = 'employee_demo@nexprism.com';
        const clientEmail = 'client_demo@nexprism.com';

        // 1. Delete Users
        const deleteUsersResult = await User.deleteMany({
            email: { $in: [adminEmail, employeeEmail, clientEmail] }
        });
        console.log(`Deleted ${deleteUsersResult.deletedCount} user(s).`);

        // 2. Delete Client records
        const deleteClientsResult = await Client.deleteMany({
            email: clientEmail
        });
        console.log(`Deleted ${deleteClientsResult.deletedCount} client record(s).`);

        console.log('--- CLEANUP COMPLETED ---');
        process.exit(0);
    } catch (err) {
        console.error('Error during cleanup:', err);
        process.exit(1);
    }
};

deleteDemoAccounts();
