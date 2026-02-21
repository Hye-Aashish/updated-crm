const mongoose = require('mongoose');
const User = require('./models/User');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const testLogin = async () => {
    try {
        console.log('Connecting to DB...');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected.');

        const email = 'admin@example.com';
        const password = 'password';

        console.log(`Searching for user: ${email}`);
        const user = await User.findOne({ email });
        if (!user) {
            console.log('User NOT found in DB');
            process.exit(1);
        }

        console.log('User found. Checking password...');
        const isMatch = await user.matchPassword(password);
        console.log(`Email: ${email}`);
        console.log(`Hash: ${user.password}`);
        console.log(`Match: ${isMatch}`);

        process.exit(0);
    } catch (err) {
        console.error('ERROR:', err);
        process.exit(1);
    }
};

testLogin();
