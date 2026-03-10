const generateInvoicePDF = require('./utils/generateInvoicePDF');
const fs = require('fs');
(async () => {
    try {
        const invoice = { invoiceNumber: 'INV001', date: new Date(), dueDate: new Date(), status: 'pending', total: 1000, lineItems: [{ name: 'Test', qty: 1, rate: 1000 }] };
        const client = { name: 'Client Test', email: 'test@example.com' };
        const comp = { name: 'Company', address: '123' };
        const buf = await generateInvoicePDF(invoice, client, comp);
        fs.writeFileSync('test.pdf', buf);
        console.log('PDF OK', buf.length);
    } catch (e) {
        console.log('ERROR', e);
    }
    process.exit(0);
})();
