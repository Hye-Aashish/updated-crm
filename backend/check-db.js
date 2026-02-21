const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const ProjectSchema = new mongoose.Schema({ name: String, pmId: String, members: [String], clientId: String });
const TaskSchema = new mongoose.Schema({ title: String, projectId: String, status: String, assigneeId: String });

const Project = mongoose.model('Project', ProjectSchema);
const Task = mongoose.model('Task', TaskSchema);

async function checkData() {
    const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
    if (!uri) {
        console.error('MONGO_URI NOT FOUND');
        return;
    }
    await mongoose.connect(uri);
    console.log('Connected to DB');

    const projects = await Project.find();
    console.log('Projects count:', projects.length);
    for (const p of projects) {
        const tasks = await Task.find({ projectId: p._id.toString() });
        console.log(`Project: ${p.name} (${p._id}) - Tasks: ${tasks.length}`);
    }

    await mongoose.disconnect();
}

checkData().catch(err => {
    console.error(err);
    process.exit(1);
});
