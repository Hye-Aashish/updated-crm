require('dotenv').config();
const mongoose = require('mongoose');

const uris = [process.env.MONGO_URI].filter(Boolean);
if (!uris.length) {
    console.error('MONGO_URI is required in .env');
    process.exit(1);
}

(async () => {
    for (const uri of uris) {
        try {
            await mongoose.connect(uri);
            console.log('Connected OK');
            await mongoose.disconnect();
        } catch (e) {
            console.error('Connect failed:', e.message);
        }
    }
    process.exit(0);
})();
