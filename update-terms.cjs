const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);
const mongoose = require('mongoose');
require('dotenv').config({ path: './backend/.env' });
const connectDB = require('./backend/config/db');
const Invoice = require('./backend/models/Invoice');

async function updateInvoiceTerms() {
    await connectDB();
    const defaultTerms = '1. Please pay within the due date to avoid late fees.\n2. Invoices are payable via UPI, Bank Transfer or Online Payment.\n3. Thank you for choosing our services.';
    const res = await Invoice.updateMany(
        { $or: [{ termsAndConditions: { $exists: false } }, { termsAndConditions: '' }, { termsAndConditions: null }] },
        { $set: { termsAndConditions: defaultTerms } }
    );
    console.log('Updated invoices with default terms:', res.modifiedCount);
    process.exit(0);
}
updateInvoiceTerms();
