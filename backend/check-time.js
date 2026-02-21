const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const TimeEntrySchema = new mongoose.Schema({ projectId: String, duration: Number, isBillable: Boolean });
const TimeEntry = mongoose.model('TimeEntry', TimeEntrySchema);

async function checkTime() {
    const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
    await mongoose.connect(uri);
    console.log('Connected to DB');

    const entries = await TimeEntry.find();
    console.log('Time Entries count:', entries.length);

    const projectTotals = {};
    entries.forEach(e => {
        if (!projectTotals[e.projectId]) projectTotals[e.projectId] = 0;
        projectTotals[e.projectId] += (e.duration || 0);
    });

    console.log('Project Totals:', projectTotals);

    await mongoose.disconnect();
}

checkTime().catch(err => {
    console.error(err);
    process.exit(1);
});
