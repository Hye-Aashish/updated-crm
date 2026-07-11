const axios = require('axios');

async function testFilter() {
    try {
        console.log('Fetching data from local API...');
        // We can query the database directly using mongoose to avoid auth tokens
        const mongoose = require('mongoose');
        const path = require('path');
        require('dotenv').config({ path: path.join(__dirname, 'backend', '.env') });
        
        const User = require('./backend/models/User');
        const Project = require('./backend/models/Project');
        const TimeEntry = require('./backend/models/TimeEntry');
        const Task = require('./backend/models/Task');

        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to DB');

        const users = await User.find().lean();
        const projects = await Project.find().lean();
        const tasks = await Task.find().lean();
        // Mimic populated time entries
        const timeEntries = await TimeEntry.find()
            .populate('userId', 'name email')
            .populate('projectId', 'name status')
            .populate('taskId', 'title status')
            .lean();

        console.log(`Loaded users: ${users.length}, projects: ${projects.length}, tasks: ${tasks.length}, timeEntries: ${timeEntries.length}`);

        console.log('Running pre-calculations...');
        const projectActualCosts = {};
        projects.forEach((proj) => {
            const pid = proj._id || proj.id;
            const projEntries = timeEntries.filter((te) => (te.projectId?._id || te.projectId) === pid);
            const totalProjCost = projEntries.reduce((sum, te) => {
                const entryUserId = te.userId?._id || te.userId;
                const u = users.find((usr) => (usr._id || usr.id) === entryUserId);
                if (!u) return sum;
                const hourlyRate = (Number(u.salary) || 0) / 208;
                return sum + ((te.duration || 0) / 60) * hourlyRate;
            }, 0);
            projectActualCosts[pid] = totalProjCost;
        });

        console.log('Pre-calculations completed. running mapping...');
        const result = users.map((user) => {
            const userId = user._id || user.id;
            const userTasks = tasks.filter((t) => t.assigneeId === userId);
            const completedCount = userTasks.filter((t) => t.status === 'done').length;

            const totalMinutes = timeEntries
                .filter((te) => (te.userId?._id || te.userId) === userId)
                .reduce((sum, te) => sum + (te.duration || 0), 0);
            const totalHours = totalMinutes / 60;

            const hourlyRate = (Number(user.salary) || 0) / 208;
            const calculatedCost = totalHours * hourlyRate;

            const userProjectIds = [...new Set(userTasks.map((t) => t.projectId))];
            const projectDetails = userProjectIds.map((pid) => {
                const proj = projects.find((p) => p._id === pid || p.id === pid);
                if (!proj) return null;

                const projTasks = userTasks.filter((t) => t.projectId === pid);
                const projMinutes = timeEntries
                    .filter((te) => (te.userId?._id || te.userId) === userId && (te.projectId?._id || te.projectId) === pid)
                    .reduce((sum, te) => sum + (te.duration || 0), 0);

                const totalActualCost = projectActualCosts[pid] || 0;
                const budget = Number(proj.budget) || 0;
                const margin = budget - totalActualCost;

                return {
                    name: proj.name || proj.title,
                    tasks: projTasks.length,
                    completed: projTasks.filter((t) => t.status === 'done').length,
                    hours: (projMinutes / 60).toFixed(1),
                    cost: ((projMinutes / 60) * hourlyRate).toFixed(2),
                    budget,
                    totalProjectCost: totalActualCost.toFixed(2),
                    margin: margin.toFixed(2)
                };
            }).filter(Boolean);

            const totalTasksCount = userTasks.length || 1;
            const taskScore = (completedCount / totalTasksCount) * 70;
            const hourScore = Math.min(30, (totalHours / 160) * 30);
            const performanceScore = Math.min(100, Math.round(taskScore + hourScore));

            return {
                ...user,
                completedCount,
                totalTasks: userTasks.length,
                totalHours: totalHours.toFixed(1),
                calculatedCost: calculatedCost.toFixed(0),
                performanceScore,
                projects: projectDetails
            };
        });

        console.log('Mapping completed successfully! Result count:', result.length);
        if (result.length > 0) {
            console.log('First user example output:', JSON.stringify(result[0].projects, null, 2));
        }

        await mongoose.disconnect();
    } catch (err) {
        console.error('CRASH DETECTED during simulation:', err);
    }
}

testFilter();
