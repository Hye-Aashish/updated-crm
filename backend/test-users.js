require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

mongoose.connect(process.env.MONGO_URI || 'mongodb://aashishofficial123_db_user:AV445S3k0brlHEPu@ac-791ijbv-shard-00-00.q0seg1w.mongodb.net:27017/CRM_DB?ssl=true&authSource=admin').then(async () => {
    const users = await User.find({}, 'name email role');
    console.log(users);
    process.exit(0);
});
