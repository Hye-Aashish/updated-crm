const mongoose = require('mongoose');
const dns = require('dns');
const User = require('./models/User');

dns.setServers(['8.8.8.8', '8.8.4.4']);

const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://anshulsharma6163_db_user:tyiNAlFUFKOFoPC7@cluster0.edg3afe.mongodb.net/CRM?appName=Cluster0&authSource=admin';

mongoose.connect(MONGO_URI, { family: 4 }).then(async () => {
    try {
        console.log('Connected to DB');
        let admin = await User.findOne({ email: 'admin@example.com' });
        
        if (admin) {
            admin.password = 'password';
            admin.role = 'admin';
            await admin.save();
            console.log('Admin password updated to "password" properly this time!');
        } else {
            admin = new User({
                name: 'Super Admin',
                email: 'admin@example.com',
                password: 'password',
                role: 'admin',
                designation: 'Administrator',
                department: 'Management'
            });
            await admin.save();
            console.log('Created new admin user: admin@example.com / password');
        }
    } catch (err) {
        console.error('Error creating/updating admin:', err);
    }
    process.exit(0);
}).catch(err => {
    console.error('Connection failed:', err);
    process.exit(1);
});
