const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);
const mongoose = require('mongoose');
const Setting = require('./models/Setting');
require('dotenv').config();

const email = process.argv[2];
const appPassword = process.argv[3];
const fromName = process.argv[4] || 'Nexprism CRM';

if (!email || !appPassword) {
    console.log('\n❌ Usage: node configure_gmail_smtp.js <your_gmail@gmail.com> <your_16_digit_app_password> ["Sender Name"]\n');
    process.exit(1);
}

const updateSMTP = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        let settings = await Setting.findOne({ type: 'general' });
        if (!settings) settings = new Setting({ type: 'general' });

        settings.emailSettings = {
            host: 'smtp.gmail.com',
            port: 587,
            secure: false,
            user: email.trim(),
            pass: appPassword.trim().replace(/\s+/g, ''),
            fromEmail: email.trim(),
            fromName: fromName
        };

        await settings.save();
        console.log('\n✅ Gmail SMTP configuration successfully saved to database!');
        console.log(`📌 Host: smtp.gmail.com`);
        console.log(`📌 Port: 587`);
        console.log(`📌 Sender Email: ${email}`);
        console.log(`📌 Sender Name: ${fromName}`);
        console.log(`\nTo test sending an email, run: node test_smtp.js\n`);
        process.exit(0);
    } catch (err) {
        console.error('❌ Failed to configure SMTP:', err.message);
        process.exit(1);
    }
};

updateSMTP();
