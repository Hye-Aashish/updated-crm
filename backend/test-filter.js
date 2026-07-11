const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const dns = require('dns');

const User = require('./models/User');
const Project = require('./models/Project');
const TimeEntry = require('./models/TimeEntry');
const Task = require('./models/Task');

async function testFilter() {
    try {
        console.log('Connecting to DB...');
        dns.setServers(['8.8.8.8', '8.8.4.4']);
        await mongoose.connect(process.env.MONGO_URI, {
            serverSelectionTimeoutMS: 5000,
            family: 4
        });
        console.log('Connected to DB successfully!');

        const users = await User.find().lean();
        const projects = await Project.find().lean();
        const tasks = await Task.find().lean();
        const timeEntries = await TimeEntry.find()
            .populate('userId', 'name email')
            .populate('projectId', 'name status')
            .populate('taskId', 'title status')
            .lean();

        console.log(`Loaded users: ${users.length}, projects: ${projects.length}, tasks: ${tasks.length}, timeEntries: ${timeEntries.length}`);

        console.log('Running pre-calculations...');
        const projectActualCosts = {};
        projects.forEach((proj) => {
            const pid = proj._id?.toString() || proj.id?.toString() || proj.toString();
            const projEntries = timeEntries.filter((te) => {
                const tePid = te.projectId?._id?.toString() || te.projectId?.toString();
                return tePid === pid;
            });
            const totalProjCost = projEntries.reduce((sum, te) => {
                const entryUserId = te.userId?._id?.toString() || te.userId?.toString();
                const u = users.find((usr) => (usr._id?.toString() || usr.id?.toString()) === entryUserId);
                if (!u) return sum;
                const hourlyRate = (Number(u.salary) || 0) / 208;
                return sum + ((te.duration || 0) / 60) * hourlyRate;
            }, 0);
            projectActualCosts[pid] = totalProjCost;
        });

        console.log('Pre-calculations completed. running mapping...');
        const result = users.map((user) => {
            const userId = user._id?.toString() || user.id?.toString();
            const userTasks = tasks.filter((t) => t.assigneeId === userId);
            const completedCount = userTasks.filter((t) => t.status === 'done').length;

            const totalMinutes = timeEntries
                .filter((te) => {
                    const teUid = te.userId?._id?.toString() || te.userId?.toString();
                    return teUid === userId;
                })
                .reduce((sum, te) => sum + (te.duration || 0), 0);
            const totalHours = totalMinutes / 60;

            const hourlyRate = (Number(user.salary) || 0) / 208;
            const calculatedCost = totalHours * hourlyRate;

            const userProjectIds = [...new Set(userTasks.map((t) => t.projectId))];
            const projectDetails = userProjectIds.map((pid) => {
                const proj = projects.find((p) => p._id?.toString() === pid || p.id?.toString() === pid);
                if (!proj) return null;

                const projTasks = userTasks.filter((t) => t.projectId === pid);
                const projMinutes = timeEntries
                    .filter((te) => {
                        const teUid = te.userId?._id?.toString() || te.userId?.toString();
                        const tePid = te.projectId?._id?.toString() || te.projectId?.toString();
                        return teUid === userId && tePid === pid;
                    })
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
                name: user.name,
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
            console.log('Result sample:', JSON.stringify(result, null, 2));
        }

        await mongoose.disconnect();
    } catch (err) {
        console.error('CRASH DETECTED during simulation:', err);
    }
}

testFilter();
