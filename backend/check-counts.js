const mongoose = require('mongoose');
const User = require('./models/User');
const Project = require('./models/Project');
const Lead = require('./models/Lead');
const Task = require('./models/Task');
require('dotenv').config();

const checkData = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);

        const counts = {
            users: await User.countDocuments(),
            projects: await Project.countDocuments(),
            leads: await Lead.countDocuments(),
            tasks: await Task.countDocuments()
        };

        console.log('--- Database Counts ---');
        console.log(JSON.stringify(counts, null, 2));

        const users = await User.find().select('name email role');
        console.log('\n--- Users ---');
        console.log(JSON.stringify(users, null, 2));

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

checkData();
