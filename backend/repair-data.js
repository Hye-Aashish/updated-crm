const mongoose = require('mongoose');
const User = require('./models/User');
const Project = require('./models/Project');
const Lead = require('./models/Lead');
const Task = require('./models/Task');
const Client = require('./models/Client');
require('dotenv').config();

const repairData = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);

        const owner = await User.findOne({ role: 'owner' });
        const admin = await User.findOne({ role: 'admin' });
        const employee = await User.findOne({ role: 'employee' });

        if (!owner) {
            console.error('Owner not found');
            process.exit(1);
        }

        console.log(`Using Owner: ${owner.name} (${owner._id})`);

        // 1. Assign all leads to Owner if unassigned
        const leadUpdate = await Lead.updateMany(
            { $or: [{ assignedTo: { $exists: false } }, { assignedTo: null }, { assignedTo: "" }] },
            { $set: { assignedTo: owner._id.toString() } }
        );
        console.log(`Updated ${leadUpdate.modifiedCount} leads.`);

        // 2. Assign some leads to Employee for testing
        if (employee) {
            const someLeads = await Lead.find({}).limit(2);
            for (const lead of someLeads) {
                lead.assignedTo = employee._id.toString();
                await lead.save();
            }
            console.log(`Assigned 2 leads to Employee.`);
        }

        // 3. Update Projects: Ensure Owner is member of all
        const projects = await Project.find({});
        for (const p of projects) {
            if (!p.members.includes(owner._id.toString())) {
                p.members.push(owner._id.toString());
            }
            // Ensure PM is set (use Owner as fallback)
            if (!p.pmId) p.pmId = owner._id.toString();
            await p.save();
        }
        console.log(`Updated ${projects.length} projects.`);

        // 4. Update Tasks
        const taskUpdate = await Task.updateMany(
            { $or: [{ assigneeId: { $exists: false } }, { assigneeId: null }] },
            { $set: { assigneeId: owner._id.toString() } }
        );
        console.log(`Updated ${taskUpdate.modifiedCount} tasks.`);

        // 5. Update Clients (assignedTo)
        const clientUpdate = await Client.updateMany(
            { $or: [{ assignedTo: { $exists: false } }, { assignedTo: null }] },
            { $set: { assignedTo: owner._id.toString() } }
        );
        console.log(`Updated ${clientUpdate.modifiedCount} clients.`);

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

repairData();
