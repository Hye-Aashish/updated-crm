const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const Attendance = require('./models/Attendance');
const User = require('./models/User');

async function run() {
    const uri = 'mongodb+srv://aashishofficial123_db_user:AV445S3k0brlHEPu@cluster0.q0seg1w.mongodb.net/CRM_DB?appName=Cluster0';
    await mongoose.connect(uri);
    console.log('Connected to DB');

    const users = await User.find({}, 'name email role');
    console.log('--- Users ---');
    users.forEach(u => {
        console.log(`ID: ${u._id} | Name: ${u.name} | Email: ${u.email} | Role: ${u.role}`);
    });

    const attendances = await Attendance.find().sort({ date: -1 });
    console.log('\n--- Attendance Records ---');
    attendances.forEach(a => {
        const user = users.find(u => u._id.toString() === a.userId);
        const userName = user ? user.name : 'Unknown User';
        console.log(`User: ${userName} (${a.userId}) | Date: ${a.date.toISOString()} | Status: ${a.status} | CheckIn: ${a.checkIn ? a.checkIn.toISOString() : 'N/A'} | CheckOut: ${a.checkOut ? a.checkOut.toISOString() : 'N/A'}`);
    });

    await mongoose.disconnect();
}

run().catch(console.error);
