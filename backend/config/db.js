const mongoose = require('mongoose');

// Global cache for serverless environment to prevent multiple connections
let cached = global.mongoose;

if (!cached) {
    cached = global.mongoose = { conn: null, promise: null };
}

async function connectDB() {
    if (cached.conn) {
        // console.log('>>> Using Cached DB Connection <<<');
        return cached.conn;
    }

    if (!cached.promise) {
        console.log('Connecting to MongoDB...');
        console.log('Target URI:', process.env.MONGO_URI ? 'PROTECTED_URI' : 'UNDEFINED');

        const opts = {
            bufferCommands: false,
        };

        cached.promise = mongoose.connect(process.env.MONGO_URI, opts).then((mongoose) => {
            console.log(`>>> DB CONNECTED: ${mongoose.connection.host} <<<`);
            return mongoose;
        }).catch(err => {
            console.error(`>>> DB CONNECTION ERROR: ${err.message} <<<`);
            throw err;
        });
    }

    try {
        cached.conn = await cached.promise;
    } catch (e) {
        cached.promise = null;
        throw e;
    }

    return cached.conn;
}

module.exports = connectDB;
