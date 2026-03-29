require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

mongoose.connect(process.env.MONGO_URI || 'mongodb+srv://aashishofficial123_db_user:AV445S3k0brlHEPu@cluster0.q0seg1w.mongodb.net/CRM_DB?appName=Cluster0').then(async () => {
    const users = await User.find({}, 'name email role');
    console.log(users);
    process.exit(0);
});
