const mongoose = require('mongoose');
const Lead = require('./models/Lead');
const Project = require('./models/Project');
require('dotenv').config();

const checkAssignments = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);

        const leads = await Lead.find().select('company assignedTo');
        console.log('--- Leads Assignments ---');
        console.log(JSON.stringify(leads, null, 2));

        const projects = await Project.find().select('name pmId members');
        console.log('\n--- Projects Assignments ---');
        console.log(JSON.stringify(projects, null, 2));

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

checkAssignments();
