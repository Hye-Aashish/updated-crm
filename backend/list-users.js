const mongoose = require('mongoose');
const User = require('./models/User');

const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) { console.error('MONGO_URI required'); process.exit(1); };

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
