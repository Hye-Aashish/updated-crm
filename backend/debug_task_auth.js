const mongoose = require('mongoose');
const Task = require('./models/Task');
const User = require('./models/User');
const Project = require('./models/Project');
require('dotenv').config();

async function debug() {
    await mongoose.connect(process.env.MONGO_URI);

    const userId = "69977146576cbde9830bd833";
    const taskId = "699784acf752f7ebf935b3e3";

    const user = await User.findById(userId);
    const task = await Task.findById(taskId);

    console.log("USER:", user ? { id: user._id, name: user.name, role: user.role } : "NOT FOUND");
    console.log("TASK:", task ? { id: task._id, title: task.title, assigneeId: task.assigneeId, projectId: task.projectId } : "NOT FOUND");

    if (task && task.projectId) {
        const project = await Project.findById(task.projectId);
        console.log("PROJECT:", project ? { id: project._id, name: project.name, pmId: project.pmId, members: project.members } : "NOT FOUND");
    }

    process.exit(0);
}

debug();
