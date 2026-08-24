const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);
const mongoose = require('mongoose');
require('dotenv').config({ path: './backend/.env' });
const connectDB = require('./backend/config/db');
const Setting = require('./backend/models/Setting');

async function updateDefaultBillingSettings() {
    await connectDB();
    const s = await Setting.findOne();
    if (s) {
        if (!s.billing) s.billing = {};
        if (!s.billing.invoicePhone) s.billing.invoicePhone = '+91 7505974545';
        if (!s.billing.invoiceEmail) s.billing.invoiceEmail = 'Info@nexprism.com';
        if (!s.billing.invoiceWebsite) s.billing.invoiceWebsite = 'nexprism.com';
        if (!s.billing.invoiceFooterHeading) s.billing.invoiceFooterHeading = 'THANK YOU FOR YOUR BUSINESS';
        await s.save();
        console.log('Updated settings with default invoice contact details:', s.billing);
    }
    process.exit(0);
}
updateDefaultBillingSettings();
