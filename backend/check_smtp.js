const mongoose = require('mongoose');
const Setting = require('./models/Setting');
require('dotenv').config();

const checkSMTP = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const settings = await Setting.findOne({ type: 'general' });

        if (!settings) {
            console.log('No settings found in DB.');
        } else {
            console.log('Current SMTP Settings:');
            console.log(JSON.stringify(settings.emailSettings, null, 2));
        }
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

checkSMTP();
