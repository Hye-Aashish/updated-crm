const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const Lead = require('../models/Lead');
const User = require('../models/User');

async function migrate() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected.');

        const users = await User.find({}, '_id name email role');
        console.log('Found users in DB:', users.map(u => `${u.name} (${u.role}) - ${u._id}`));

        const leads = await Lead.find({});
        console.log(`Total leads found: ${leads.length}`);

        let updatedCount = 0;

        for (const lead of leads) {
            let assignedUser = null;

            // 1. Check if assignedTo matches a user ID
            if (lead.assignedTo) {
                assignedUser = users.find(u => u._id.toString() === lead.assignedTo.toString());
            }

            // 2. If not found, check activities for createdByName
            if (!assignedUser && lead.activities && lead.activities.length > 0) {
                for (const act of lead.activities) {
                    if (act.createdByName) {
                        const matched = users.find(u => 
                            u.name.toLowerCase().trim() === act.createdByName.toLowerCase().trim()
                        );
                        if (matched) {
                            assignedUser = matched;
                            break;
                        }
                    }
                }
            }

            // 3. If still not found, check if there's a default admin
            if (!assignedUser) {
                assignedUser = users.find(u => u.role === 'admin' || u.role === 'owner');
            }

            if (assignedUser) {
                let changed = false;

                if (!lead.createdBy) {
                    lead.createdBy = assignedUser._id;
                    lead.createdByName = assignedUser.name;
                    changed = true;
                }

                if (!lead.assignedTo) {
                    lead.assignedTo = assignedUser._id.toString();
                    lead.assignedToName = assignedUser.name;
                    changed = true;
                } else if (!lead.assignedToName) {
                    const u = users.find(x => x._id.toString() === lead.assignedTo.toString()) || assignedUser;
                    lead.assignedToName = u.name;
                    changed = true;
                }

                // If activities exist, make sure lastContactedBy is populated
                if (lead.activities && lead.activities.length > 0) {
                    const lastAct = lead.activities[lead.activities.length - 1];
                    if (lastAct && lastAct.createdByName && !lead.lastContactedBy) {
                        lead.lastContactedBy = lastAct.createdByName;
                        changed = true;
                    }
                }

                if (changed) {
                    await lead.save();
                    updatedCount++;
                }
            }
        }

        console.log(`Migration complete! Updated ${updatedCount} leads.`);
        process.exit(0);
    } catch (err) {
        console.error('Migration error:', err);
        process.exit(1);
    }
}

migrate();
