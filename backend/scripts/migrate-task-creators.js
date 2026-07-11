const mongoose = require('mongoose');
require('dotenv').config({ path: '../.env' });
const Task = require('../models/Task');
const TaskActivity = require('../models/TaskActivity');
const User = require('../models/User');

const uri = process.env.MONGO_URI;
if (!uri) {
    console.error("MONGO_URI environment variable is missing.");
    process.exit(1);
}

mongoose.connect(uri)
    .then(async () => {
        console.log("Connected to MongoDB successfully.");
        try {
            const tasks = await Task.find({ creatorId: { $exists: false } });
            console.log(`Found ${tasks.length} tasks without creatorId.`);

            // Get a fallback admin user
            const fallbackUser = await User.findOne({ role: { $in: ['admin', 'owner'] } });
            const fallbackUserId = fallbackUser ? fallbackUser._id.toString() : null;

            let updatedCount = 0;

            for (const task of tasks) {
                let creatorId = null;

                // 1. Try to find the creation activity
                const activity = await TaskActivity.findOne({
                    taskId: task._id.toString(),
                    actionType: 'create'
                });

                if (activity && activity.userId) {
                    creatorId = activity.userId;
                    console.log(`Task "${task.title}": Found creator from Activity logs (${creatorId}).`);
                } 
                // 2. Fall back to assigneeId
                else if (task.assigneeId) {
                    creatorId = task.assigneeId;
                    console.log(`Task "${task.title}": Using assigneeId as fallback creator (${creatorId}).`);
                } 
                // 3. Fall back to admin/owner user
                else if (fallbackUserId) {
                    creatorId = fallbackUserId;
                    console.log(`Task "${task.title}": Using admin fallback creator (${creatorId}).`);
                }

                if (creatorId) {
                    task.creatorId = creatorId;
                    await task.save();
                    updatedCount++;
                } else {
                    console.log(`Task "${task.title}": No creatorId found and no fallback user available.`);
                }
            }

            console.log(`Migration completed. Updated ${updatedCount}/${tasks.length} tasks.`);
        } catch (err) {
            console.error("Migration error:", err);
        } finally {
            mongoose.disconnect();
            process.exit(0);
        }
    })
    .catch(err => {
        console.error("Database connection failed:", err);
        process.exit(1);
    });
