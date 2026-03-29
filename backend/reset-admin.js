require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

mongoose.connect(process.env.MONGO_URI || 'mongodb+srv://aashishofficial123_db_user:AV445S3k0brlHEPu@cluster0.q0seg1w.mongodb.net/CRM_DB?appName=Cluster0').then(async () => {
    try {
        const admin = await User.findOne({ email: 'admin@example.com' });
        if (admin) {
            admin.password = 'password';
            await admin.save();
            console.log('Admin password reset to password');
        } else {
            console.log('Admin user not found');
        }
    } catch (err) {
        console.error('Error resetting password:', err);
    }
    process.exit(0);
});
