const mongoose = require('mongoose');

const uris = [
  'mongodb+srv://anshulsharma6163_db_user:tyiNAlFUFKOFoPC7@cluster0.edg3afe.mongodb.net/CRM?appName=Cluster0&authSource=admin',
  'mongodb+srv://anshulsharma6163_db_user:7JgjE0Jjv9zf6EfE@cluster0.rdbc5os.mongodb.net/nikunj_crm?appName=Cluster0&authSource=admin',
  'mongodb+srv://aashishofficial123_db_user:AV445S3k0brlHEPu@cluster0.q0seg1w.mongodb.net/CRM_DB?appName=Cluster0'
];

async function testConnection(uri) {
  try {
    console.log(`Testing ${uri}...`);
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
    console.log('SUCCESS: ', uri);
    await mongoose.disconnect();
  } catch (err) {
    console.log('FAILED: ', uri);
  }
}

async function run() {
  for (const uri of uris) {
    await testConnection(uri);
  }
}

run();
