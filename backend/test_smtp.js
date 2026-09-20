const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);
const mongoose = require('mongoose');
const sendEmail = require('./utils/sendEmail');
require('dotenv').config();

const testSMTP = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const recipient = process.argv[2] || 'nexprism@gmail.com';
        console.log(`Sending test email to ${recipient}...`);

        await sendEmail({
            to: recipient,
            subject: 'SMTP Test - Nexprism CRM System',
            text: 'This is a test email to verify Gmail SMTP configuration.',
            html: '<h1>Gmail SMTP Works!</h1><p>Your Nexprism CRM system is now successfully configured to send emails via Gmail SMTP.</p>'
        });

        console.log('Test email SENT successfully!');
        process.exit(0);
    } catch (err) {
        console.error('SMTP TEST FAILED:', err.message);
        process.exit(1);
    }
};

testSMTP();
