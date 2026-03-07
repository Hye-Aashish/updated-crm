const PDFDocument = require('pdfkit');

const generateInvoicePDF = (invoice, client, companyProfile, settings = {}) => {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({ size: 'A4', margin: 50 });
            const buffers = [];

            doc.on('data', (chunk) => buffers.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(buffers)));
            doc.on('error', reject);

            const formatting = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' });

            // --------- HEADER SECTION ---------
            const startY = 50;

            // Left Side: BILL FROM
            // We use a dummy logo placement or just large text for the company name for now
            doc.fontSize(24).font('Helvetica-Bold').fillColor('#0047AB').text(companyProfile.name || 'NEXPRISM', 50, startY);

            let currentLeftY = startY + 35;
            doc.fontSize(9).font('Helvetica-Bold').fillColor('#333').text('BILL FROM:', 50, currentLeftY);
            currentLeftY += 15;
            doc.fontSize(11).font('Helvetica-Bold').fillColor('#000').text(companyProfile.name || 'NEXPRISM', 50, currentLeftY);
            currentLeftY += 15;

            doc.fontSize(9).font('Helvetica-Bold').text('Address: ', 50, currentLeftY, { continued: true })
                .font('Helvetica').fillColor('#333').text(companyProfile.address || 'Company Address', { width: 220, align: 'left' });

            currentLeftY = doc.y + 5;
            if (companyProfile.phone) {
                doc.font('Helvetica').text(`Phone: ${companyProfile.phone}`, 50, currentLeftY);
                currentLeftY += 12;
            }
            if (companyProfile.email) {
                doc.font('Helvetica').text(`Email: ${companyProfile.email}`, 50, currentLeftY);
                currentLeftY += 12;
            }
            if (companyProfile.gst) {
                currentLeftY += 5;
                doc.font('Helvetica-Bold').fillColor('#000').text(`GSTIN: ${companyProfile.gst}`, 50, currentLeftY);
                currentLeftY += 15;
            }

            // Right Side: INVOICE and BILL TO
            doc.fillColor('#333').fontSize(36).font('Helvetica-Bold').text('INVOICE', 350, startY, { align: 'right', characterSpacing: 2 });

            let currentRightY = startY + 45;
            doc.fontSize(10).font('Helvetica').fillColor('#666');

            // Format date example: 06 feb 2026
            const invDate = new Date(invoice.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toLowerCase();
            const dueDate = new Date(invoice.dueDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toLowerCase();

            doc.text('Invoice No:', 350, currentRightY, { width: 100, align: 'left' });
            doc.fillColor('#333').text(`#${invoice.invoiceNumber}`, 450, currentRightY, { width: 95, align: 'right' });
            currentRightY += 15;

            doc.fillColor('#666').text('Invoice Date:', 350, currentRightY, { width: 100, align: 'left' });
            doc.fillColor('#333').text(invDate, 450, currentRightY, { width: 95, align: 'right' });
            currentRightY += 15;

            // BILL TO Section (Right Side)
            currentRightY += 15; // some spacing
            doc.fontSize(9).font('Helvetica-Bold').fillColor('#333').text('BILL TO:', 350, currentRightY);
            currentRightY += 15;

            doc.fontSize(10).font('Helvetica-Bold').fillColor('#000').text(client.company || client.name || 'Client Name', 350, currentRightY);
            currentRightY += 15;

            // Allow wrapping for address
            doc.fontSize(9).font('Helvetica-Bold').text('Address: ', 350, currentRightY, { continued: true })
                .font('Helvetica').fillColor('#333').text(client.address || 'Client Address', { width: 195, align: 'left' });

            currentRightY = doc.y + 5;
            if (client.gst || client.gstin) {
                currentRightY += 5;
                doc.font('Helvetica-Bold').fillColor('#000').text(`GSTIN: ${client.gst || client.gstin}`, 350, currentRightY);
                currentRightY += 15;
            }

            const maxY = Math.max(currentLeftY, currentRightY) + 20;

            // Status Badge (Optional, added near INVOICE area or below)
            const statusColor = invoice.status === 'paid' ? '#16a34a' : invoice.status === 'overdue' ? '#dc2626' : '#f59e0b';
            doc.roundedRect(445, maxY, 100, 24, 4).fill(statusColor);
            doc.fillColor('#fff').fontSize(10).font('Helvetica-Bold')
                .text(invoice.status?.toUpperCase() || 'PENDING', 445, maxY + 6, { width: 100, align: 'center' });

            // Divider
            doc.moveTo(50, maxY + 35).lineTo(545, maxY + 35).strokeColor('#e2e8f0').stroke();

            // Table Header
            const tableTop = maxY + 55;
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

            // Terms & Conditions
            const fallbackTerms = settings?.billing?.termsAndConditions || 'Thank you for your business. Payment is expected within the due date.';
            const termsStr = invoice.termsAndConditions || fallbackTerms;
            doc.fontSize(10).font('Helvetica-Bold').fillColor('#333').text('Terms & Conditions', 50, y);
            doc.fontSize(9).font('Helvetica').fillColor('#666').text(termsStr, 50, y + 15, { width: 300, align: 'left' });

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
