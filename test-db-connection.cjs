const mongoose = require('mongoose');
const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'backend', '.env') });

const uri = process.env.MONGO_URI;
console.log('Testing connection to:', uri.replace(/:([^:@]+)@/, ':****@'));

const opts = {
    serverSelectionTimeoutMS: 15000, // 15 seconds
};

mongoose.connect(uri, opts)
    .then(() => {
        console.log('SUCCESS: Connected to MongoDB!');
        process.exit(0);
    })
    .catch(err => {
        console.error('FAILURE:', err.name, err.message);
        if (err.reason) console.error('Reason:', err.reason);
        process.exit(1);
    });
