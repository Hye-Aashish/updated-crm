const mongoose = require('mongoose');
require('dotenv').config();

const connectDB = async () => {
    try {
        console.log('Testing connection to:', process.env.MONGO_URI ? 'URI set' : 'URI NOT set');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('>>> DB CONNECTED SUCCESSFULLY <<<');
        const dbName = mongoose.connection.name;
        console.log('Connected to database:', dbName);
        process.exit(0);
    } catch (err) {
        console.error('>>> DB CONNECTION FAILED <<<');
        console.error(err.message);
        process.exit(1);
    }
};

connectDB();
