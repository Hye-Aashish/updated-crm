const mongoose = require('mongoose');
const sendEmail = require('./utils/sendEmail');
require('dotenv').config();

const testSMTP = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Sending test email...');

        await sendEmail({
            to: 'aashishofficial123@gmail.com', // Using a test email, user can change this
            subject: 'SMTP Test - CRM System',
            text: 'This is a test email to verify SMTP configuration.',
            html: '<h1>SMTP Works!</h1><p>Your CRM system is now capable of sending emails.</p>'
        });

        console.log('Test email SENT successfully!');
        process.exit(0);
    } catch (err) {
        console.error('SMTP TEST FAILED:', err.message);
        process.exit(1);
    }
};

testSMTP();
