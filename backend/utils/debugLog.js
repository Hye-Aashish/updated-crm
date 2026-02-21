const fs = require('fs');
const path = require('path');

const logFile = path.join(__dirname, '../logs/debug.log');
if (!fs.existsSync(path.join(__dirname, '../logs'))) {
    fs.mkdirSync(path.join(__dirname, '../logs'));
}

const debugLog = (msg) => {
    const logEntry = `[${new Date().toISOString()}] ${msg}\n`;
    fs.appendFileSync(logFile, logEntry);
    console.log(msg);
};

module.exports = debugLog;
