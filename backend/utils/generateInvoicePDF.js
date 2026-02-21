const PDFDocument = require('pdfkit');

const generateInvoicePDF = (invoice, client, companyProfile) => {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({ size: 'A4', margin: 50 });
            const buffers = [];

            doc.on('data', (chunk) => buffers.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(buffers)));
            doc.on('error', reject);

            const formatting = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' });

            // Header
            doc.fontSize(22).font('Helvetica-Bold').text(companyProfile.name || 'NEXPRISM', 50, 50);
            if (companyProfile.address) {
                doc.fontSize(9).font('Helvetica').fillColor('#666').text(companyProfile.address, 50, 75);
            }
            if (companyProfile.email) {
                doc.text(companyProfile.email);
            }
            if (companyProfile.phone) {
                doc.text(companyProfile.phone);
            }
            if (companyProfile.gst) {
                doc.text(`GST: ${companyProfile.gst}`);
            }

            // Invoice Title
            doc.fillColor('#0047AB').fontSize(28).font('Helvetica-Bold').text('INVOICE', 400, 50, { align: 'right' });
            doc.fillColor('#333').fontSize(10).font('Helvetica');
            doc.text(`#${invoice.invoiceNumber}`, 400, 82, { align: 'right' });
            doc.text(`Date: ${new Date(invoice.date).toLocaleDateString('en-IN')}`, 400, 96, { align: 'right' });
            doc.text(`Due: ${new Date(invoice.dueDate).toLocaleDateString('en-IN')}`, 400, 110, { align: 'right' });

            // Divider
            doc.moveTo(50, 140).lineTo(545, 140).strokeColor('#e2e8f0').stroke();

            // Bill To
            doc.fillColor('#666').fontSize(9).text('BILL TO', 50, 155);
            doc.fillColor('#000').fontSize(12).font('Helvetica-Bold').text(client.name || 'Client', 50, 168);
            doc.fontSize(9).font('Helvetica').fillColor('#666');
            if (client.email) doc.text(client.email, 50, 184);
            if (client.phone) doc.text(client.phone);
            if (client.company) doc.text(client.company);

            // Status Badge
            const statusColor = invoice.status === 'paid' ? '#16a34a' : invoice.status === 'overdue' ? '#dc2626' : '#f59e0b';
            doc.roundedRect(400, 155, 100, 24, 4).fill(statusColor);
            doc.fillColor('#fff').fontSize(10).font('Helvetica-Bold')
                .text(invoice.status?.toUpperCase() || 'PENDING', 400, 161, { width: 100, align: 'center' });

            // Table Header
            const tableTop = 230;
            doc.fillColor('#f1f5f9');
            doc.rect(50, tableTop, 495, 25).fill();

            doc.fillColor('#475569').fontSize(9).font('Helvetica-Bold');
            doc.text('#', 55, tableTop + 8, { width: 30 });
            doc.text('Description', 85, tableTop + 8, { width: 220 });
            doc.text('Qty', 310, tableTop + 8, { width: 50, align: 'center' });
            doc.text('Rate', 365, tableTop + 8, { width: 80, align: 'right' });
            doc.text('Amount', 450, tableTop + 8, { width: 90, align: 'right' });

            // Line Items
            let y = tableTop + 30;
            const items = invoice.lineItems || [];
            doc.font('Helvetica').fontSize(9).fillColor('#333');

            items.forEach((item, idx) => {
                if (y > 700) {
                    doc.addPage();
                    y = 50;
                }
                doc.text(String(idx + 1), 55, y, { width: 30 });
                doc.text(item.description || item.name || '-', 85, y, { width: 220 });
                doc.text(String(item.qty || item.quantity || 1), 310, y, { width: 50, align: 'center' });
                doc.text(formatting.format(item.rate || item.price || 0), 365, y, { width: 80, align: 'right' });
                doc.text(formatting.format(item.amount || (item.qty || 1) * (item.rate || 0)), 450, y, { width: 90, align: 'right' });

                // Row border
                doc.moveTo(50, y + 18).lineTo(545, y + 18).strokeColor('#f1f5f9').stroke();
                y += 22;
            });

            // Totals
            y += 10;
            doc.moveTo(350, y).lineTo(545, y).strokeColor('#e2e8f0').stroke();
            y += 10;

            doc.fontSize(10).font('Helvetica');
            doc.fillColor('#666').text('Subtotal:', 350, y, { width: 100, align: 'right' });
            doc.fillColor('#333').text(formatting.format(invoice.subtotal || 0), 450, y, { width: 90, align: 'right' });
            y += 18;

            if (invoice.tax) {
                doc.fillColor('#666').text('Tax:', 350, y, { width: 100, align: 'right' });
                doc.fillColor('#333').text(formatting.format(invoice.tax), 450, y, { width: 90, align: 'right' });
                y += 18;
            }

            doc.moveTo(350, y).lineTo(545, y).strokeColor('#0047AB').lineWidth(2).stroke();
            y += 8;

            doc.fontSize(14).font('Helvetica-Bold').fillColor('#0047AB');
            doc.text('Total:', 350, y, { width: 100, align: 'right' });
            doc.text(formatting.format(invoice.total || 0), 450, y, { width: 90, align: 'right' });

            // Footer
            const footerY = 750;
            doc.fontSize(8).font('Helvetica').fillColor('#94a3b8');
            doc.text('Thank you for your business!', 50, footerY, { align: 'center', width: 495 });
            doc.text(`Generated on ${new Date().toLocaleDateString('en-IN')}`, 50, footerY + 12, { align: 'center', width: 495 });

            doc.end();
        } catch (err) {
            reject(err);
        }
    });
};

module.exports = generateInvoicePDF;
