const mongoose = require('mongoose');
const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);
require('dotenv').config();
const Lead = require('./models/Lead');

mongoose.connect(process.env.MONGO_URI).then(async () => {
    // Find all leads where phone starts with +10
    const remainingLeads = await Lead.find({ phone: { $regex: '^\\+10' } });
    console.log(`Found ${remainingLeads.length} remaining leads with +10.`);
    
    if (remainingLeads.length > 0) {
        const res = await Lead.deleteMany({ phone: { $regex: '^\\+10' } });
        console.log('Deleted remaining dummy leads:', res.deletedCount);
    }
    
    mongoose.disconnect();
}).catch(console.error);
