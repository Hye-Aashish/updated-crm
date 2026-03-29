const { MongoClient } = require('mongodb');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'backend', '.env') });

const uri = process.env.MONGO_URI;
console.log('Testing connection with MongoClient to:', uri.replace(/:([^:@]+)@/, ':****@'));

const client = new MongoClient(uri, { serverSelectionTimeoutMS: 10000 });

async function run() {
    try {
        await client.connect();
        console.log('SUCCESS: Connected to MongoDB with MongoClient!');
        const db = client.db('CRM_DB');
        const collections = await db.listCollections().toArray();
        console.log('Collections in CRM_DB:', collections.map(c => c.name));
    } catch (err) {
        console.error('FAILURE:', err.message);
    } finally {
        await client.close();
    }
}

run();
