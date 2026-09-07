const mongoose = require('mongoose');
const User = require('./models/User');

const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://anshulsharma6163_db_user:tyiNAlFUFKOFoPC7@cluster0.edg3afe.mongodb.net/CRM?appName=Cluster0&authSource=admin';

mongoose.connect(MONGO_URI).then(async () => {
    try {
        const users = await User.find({}, 'name email role');
        console.log('Users in DB:');
        console.log(users);
    } catch (err) {
        console.error('Error fetching users:', err);
    }
    process.exit(0);
});
