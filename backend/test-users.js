require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

mongoose.connect(process.env.MONGO_URI || (() => { throw new Error("MONGO_URI required"); })()).then(async () => {
    const users = await User.find({}, 'name email role');
    console.log(users);
    process.exit(0);
});
