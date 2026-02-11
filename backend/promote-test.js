const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

const promoteUser = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const result = await User.updateOne({ email: 'test@gmail.com' }, { role: 'admin' });
        console.log(`Updated user test@gmail.com to admin. Result:`, result);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

promoteUser();
