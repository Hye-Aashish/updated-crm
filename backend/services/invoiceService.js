const Invoice = require('../models/Invoice');
const Client = require('../models/Client');
const sendEmail = require('../utils/sendEmail');

const generateAutoInvoice = async (project) => {
    try {
        const client = await Client.findById(project.clientId);
        if (!client) throw new Error('Client not found');

        // Generate Invoice Number
        const count = await Invoice.countDocuments();
        const invoiceNumber = `INV-${new Date().getFullYear()}-${(count + 1).toString().padStart(4, '0')}`;

        // Calculate Totals
        const subtotal = project.budget || 0;
        const tax = subtotal * 0.18; // Default 18% GST
        const total = subtotal + tax;

        // Create Invoice Record
        const invoice = new Invoice({
            invoiceNumber,
            clientId: project.clientId,
            projectId: project._id,
            type: 'final',
            status: 'pending',
            lineItems: [{
                name: `Final Invoice for Project: ${project.name}`,
                quantity: 1,
                rate: subtotal,
                taxPercentage: 18
            }],
            subtotal,
            tax,
            total,
            date: new Date(),
            dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000) // 15 days from now
        });

        const savedInvoice = await invoice.save();

        // Send Email Automatically if client has email
        if (client.email) {
            const Setting = require('../models/Setting');
            const settings = await Setting.findOne({ type: 'general' });
            const companyProfile = settings?.companyProfile || {};
            const currency = companyProfile.currency || 'INR';
            let locale = 'en-US';
            if (currency === 'INR') {
                locale = 'en-IN';
            } else if (currency === 'EUR') {
                locale = 'de-DE';
            } else if (currency === 'GBP') {
                locale = 'en-GB';
            } else if (currency === 'JPY') {
                locale = 'ja-JP';
            } else if (currency === 'CNY') {
                locale = 'zh-CN';
            } else if (currency === 'CAD') {
                locale = 'en-CA';
            } else if (currency === 'AUD') {
                locale = 'en-AU';
            } else if (currency === 'SGD') {
                locale = 'en-SG';
            } else if (currency === 'NZD') {
                locale = 'en-NZ';
            }
            const formatting = new Intl.NumberFormat(locale, { style: 'currency', currency: currency });

            const message = `
                <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; border: 1px solid #e2e8f0; border-radius: 12px;">
                    <div style="text-align: center; margin-bottom: 20px;">
                        <h1 style="color: #0047AB; margin: 0;">NEXPRISM</h1>
                        <p style="color: #64748b; font-size: 0.9em;">Automated Billing System</p>
                    </div>
                    
                    <h2 style="color: #0f172a; border-bottom: 2px solid #f1f5f9; padding-bottom: 10px;">New Invoice Generated</h2>
                    
                    <p>Dear <strong>${client.name}</strong>,</p>
                    
                    <p>This is an automated notification that a new invoice has been generated for your project: <strong>${project.name}</strong>.</p>
                    
                    <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #0047AB;">
                        <table style="width: 100%; border-collapse: collapse;">
                            <tr>
                                <td style="padding: 5px 0; color: #64748b;">Invoice Number:</td>
                                <td style="padding: 5px 0; font-weight: bold; text-align: right;">#${invoiceNumber}</td>
                            </tr>
                            <tr>
                                <td style="padding: 5px 0; color: #64748b;">Amount Due:</td>
                                <td style="padding: 5px 0; font-weight: bold; text-align: right; color: #0047AB; font-size: 1.1em;">${formatting.format(total)}</td>
                            </tr>
                            <tr>
                                <td style="padding: 5px 0; color: #64748b;">Due Date:</td>
                                <td style="padding: 5px 0; font-weight: bold; text-align: right;">${new Date(invoice.dueDate).toLocaleDateString()}</td>
                            </tr>
                        </table>
                    </div>

                    <p>You can view and pay this invoice by logging into our client portal or contacting our support team.</p>

                    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #f1f5f9; font-size: 0.85em; color: #94a3b8; text-align: center;">
                        <p>This is a system-generated email. Please do not reply to this message.</p>
                        <p>&copy; ${new Date().getFullYear()} Nexprism. All rights reserved.</p>
                    </div>
                </div>
            `;

            await sendEmail({
                to: client.email,
                subject: `[Auto-Generated] Invoice #${invoiceNumber} for ${project.name}`,
                html: message
            });

            console.log(`Auto-invoice #${invoiceNumber} sent to ${client.email}`);
        }

        return savedInvoice;
    } catch (err) {
        console.error('Error generating auto-invoice:', err);
        throw err;
    }
};

module.exports = { generateAutoInvoice };
