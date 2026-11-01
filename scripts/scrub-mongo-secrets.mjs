import fs from 'fs'

const files = [
    'backend/test-users.js',
    'backend/reset-admin.js',
    'backend/list-users.js',
    'backend/force-create-admin.js',
    'backend/check-expenses.js',
    'backend/check-attendance.js',
    'backend/test-db.js',
]

for (const f of files) {
    if (!fs.existsSync(f)) continue
    let s = fs.readFileSync(f, 'utf8')

    if (f.endsWith('test-db.js')) {
        s = `require('dotenv').config();
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
`
        fs.writeFileSync(f, s)
        console.log('rewrote', f)
        continue
    }

    if (f.endsWith('check-attendance.js')) {
        s = s.replace(
            /const uri = ['"]mongodb\+srv:[^'"]+['"]/,
            "const uri = process.env.MONGO_URI"
        )
        if (!s.includes("if (!uri)")) {
            s = s.replace(
                'const uri = process.env.MONGO_URI',
                "const uri = process.env.MONGO_URI;\n    if (!uri) { console.error('MONGO_URI required'); process.exit(1); }"
            )
        }
        fs.writeFileSync(f, s)
        console.log('scrubbed', f)
        continue
    }

    s = s.replace(
        /mongoose\.connect\(process\.env\.MONGO_URI\s*\|\|\s*['"][^'"]*['"]\)/g,
        'mongoose.connect(process.env.MONGO_URI || (() => { throw new Error("MONGO_URI required"); })())'
    )
    s = s.replace(
        /const MONGO_URI = process\.env\.MONGO_URI\s*\|\|\s*['"][^'"]*['"]/g,
        `const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) { console.error('MONGO_URI required'); process.exit(1); }`
    )
    // leftover credential URIs
    s = s.replace(/mongodb\+srv:\/\/[^'"\s]+/g, 'USE_ENV_MONGO_URI')

    fs.writeFileSync(f, s)
    console.log('scrubbed', f)
}
