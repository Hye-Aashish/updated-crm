const PDFDocument = require('pdfkit');

const generateOfferLetterPDF = (candidate, companyProfile = {}) => {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({
                size: 'A4',
                margins: { top: 75, bottom: 105, left: 45, right: 45 },
                bufferPages: true
            });
            const buffers = [];

            doc.on('data', (chunk) => buffers.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(buffers)));
            doc.on('error', reject);

            const offer = candidate.offerLetter || {};
            const formatDate = (d) => {
                if (!d) return 'N/A';
                const dateObj = new Date(d);
                const day = String(dateObj.getDate()).padStart(2, '0');
                const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                const month = months[dateObj.getMonth()];
                const year = String(dateObj.getFullYear()).slice(-2);
                return `${day}-${month}-${year}`;
            };

            const offerDate = formatDate(offer.offerDate || new Date());
            const joiningDate = formatDate(offer.joiningDate || new Date());
            const validUntil = formatDate(offer.validUntil || new Date(Date.now() + 3 * 86400000));

            const candidateAddress = candidate.submittedData?.address?.currentAddress
                ? `${candidate.submittedData.address.currentAddress}, ${candidate.submittedData.address.currentCity || ''}, ${candidate.submittedData.address.currentState || ''} - ${candidate.submittedData.address.currentPincode || ''}`
                : '204, raghuvir appartment, hariom society, ved road, Surat City, Surat, Gujarat - 395004';

            const designation = candidate.designation || 'MERN Developer';
            const workLocation = offer.workLocation || 'Work from Home';
            const probationMonths = offer.probationPeriodMonths || 3;
            const noticePeriodDays = offer.noticePeriodDays || 15;

            // Template replacement helper
            const replacePlaceholders = (text) => {
                if (!text) return '';
                return text
                    .replace(/{{candidate_name}}/gi, candidate.name || 'Candidate')
                    .replace(/{{address}}/gi, candidateAddress)
                    .replace(/{{designation}}/gi, designation)
                    .replace(/{{work_location}}/gi, workLocation)
                    .replace(/{{offer_date}}/gi, offerDate)
                    .replace(/{{joining_date}}/gi, joiningDate)
                    .replace(/{{probation_period}}/gi, `${probationMonths}`)
                    .replace(/{{notice_period}}/gi, `${noticePeriodDays}`)
                    .replace(/{{acceptance_deadline}}/gi, validUntil)
                    .replace(/{{company_name}}/gi, 'Nexprism');
            };

            // Helper to render section title and paragraph
            const renderClause = (title, body) => {
                const processedTitle = replacePlaceholders(title);
                const processedBody = replacePlaceholders(body);

                // Approximate line height check
                const estimatedLines = processedBody.split('\n').reduce((acc, line) => acc + Math.max(1, Math.ceil(line.length / 85)), 0);
                const estimatedHeight = 26 + estimatedLines * 13;

                if (doc.y + estimatedHeight > 700) {
                    doc.addPage();
                    doc.y = 75;
                }

                doc.fontSize(11).font('Helvetica-Bold').fillColor('#0F172A').text(processedTitle, { lineGap: 3 });
                doc.fontSize(9.5).font('Helvetica').fillColor('#334155').text(processedBody, { lineGap: 3.5, width: 505 });
                doc.moveDown(0.9);
            };

            // ================= PAGE 1 =================
            doc.y = 75;

            // Header Title
            doc.fontSize(14).font('Helvetica-Bold').fillColor('#000000')
                .text(offer.letterHeading || 'EMPLOYEEMENT AGREEMENT', { align: 'center', underline: false });
            doc.moveDown(1.2);

            // Candidate Address Box
            doc.fontSize(12).font('Helvetica-Bold').fillColor('#000000').text(candidate.name || 'Candidate Name', { lineGap: 2 });
            doc.fontSize(9.5).font('Helvetica-Bold').fillColor('#1E293B').text('Address : ', { continued: true })
                .font('Helvetica').fillColor('#334155').text(candidateAddress, { width: 505, lineGap: 2 });
            doc.moveDown(0.5);

            doc.fontSize(10.5).font('Helvetica-Bold').fillColor('#000000').text('Sub: Offer Letter.');
            doc.moveDown(0.4);

            doc.fontSize(10).font('Helvetica').fillColor('#000000').text(`Dear, ${candidate.name || 'Candidate'}`);
            doc.moveDown(0.8);

            // Introductory Paragraph
            const intro = offer.introText || `This Employee Agreement is made on ${offerDate} and will become effective as of ${joiningDate}. It outlines the terms of employment between Nexprism and ${candidate.name || 'Candidate'} for the position of ${designation}`;
            doc.fontSize(9.5).font('Helvetica').fillColor('#334155').text(replacePlaceholders(intro), { width: 505, lineGap: 3.5 });
            doc.moveDown(1.2);

            // Render all configured sections / clauses
            const sectionsToRender = (offer.sections && offer.sections.length > 0)
                ? offer.sections.filter(s => s.enabled !== false)
                : [
                    {
                        title: 'Place of Work',
                        content: `Your primary place of work will be {{work_location}}. You are expected to have a reliable internet connection and a suitable workspace to effectively perform your job duties. While your role is remote, you may be required to attend meetings, training sessions, or other events at the company's office or another designated location as needed, with reasonable notice.`
                    },
                    {
                        title: 'Working Hours',
                        content: `Your regular working hours will be from 10:00am to 6:00pm, Monday to Saturday. You may be required to work additional hours based on the needs of the business.`
                    },
                    {
                        title: 'Confidentiality and Non-Disclosure',
                        content: `You will be required to sign a Confidentiality Agreement as a condition of your employment. This agreement outlines your responsibility to protect the company's confidential information both during and after your employment.`
                    },
                    {
                        title: 'Code and Data Usage',
                        content: `You are strictly prohibited from using any code, software, or proprietary information from the company for personal use without prior written consent. Furthermore, you may not share, leak, or disclose any code, company details, or confidential information to any third party or external entity without explicit permission from the company. Violating this term will be considered a serious breach of your employment agreement and may result in immediate termination and potential legal action.`
                    },
                    {
                        title: 'Client Communication and Reporting',
                        content: `As a developer, you are not permitted to directly connect with clients without prior approval from the company. If a client reaches out to you directly, you are required to inform the company immediately. Any communication with clients must be conducted in accordance with the company’s guidelines and procedures.\nFailure to report such communication to the company may result in disciplinary action, up to and including legal action against you.`
                    },
                    {
                        title: 'Notice Period:',
                        content: `The company may terminate the employee employment at any time without any reason by giving notice period of {{notice_period}} days or by payment of salary in lie there of.\nIf the employee is willing to leave the organization then he must inform before {{notice_period}} days and he must be transfer all his work to the new employee.`
                    },
                    {
                        title: 'Probationary Period',
                        content: `Your initial employment will be subject to a probationary period of {{probation_period}} months. During this period, either party may terminate the employment with 7 days notice.`
                    },
                    {
                        title: 'Termination',
                        content: `Your employment may be terminated by either party by providing {{notice_period}}days' written notice. In the event of gross misconduct or breach of contract, termination may be immediate and without notice.`
                    },
                    {
                        title: 'Code of Conduct',
                        content: `You are expected to adhere to the company's Code of Conduct, which includes guidelines on behavior, dress code, and professional interactions. Any violations may result in disciplinary action, up to and including termination.`
                    },
                    {
                        title: 'Confidentiality and Non-Solicitation',
                        content: `While employed with the company, and even after your employment ends, you are strictly prohibited from using any client data whether it be contact information, project details, or any other information for personal benefit. You are also not permitted to share any client data with third parties.\nFurthermore, after leaving the company, you are not allowed to pitch or approach the company’s clients for any purpose. If you do so, the company reserves the right to take legal action against you.`
                    },
                    {
                        title: 'Dual Employment / Outside Work Clause',
                        content: `During your employment with the company, you are required to dedicate your full working hours exclusively to the duties assigned by the company. You shall not engage in any other employment, freelance work, business activity, or service paid or unpaid during working hours.\nIf you are found involved in any such activity, the company reserves the right to terminate your employment immediately. Additionally, any financial or reputational loss caused to the company due to such actions will be fully recoverable from you.`
                    },
                    {
                        title: 'Internal/Company Politics Clause',
                        content: `The Employee shall not engage in any form of office or internal company politics, including spreading rumors, creating conflicts among colleagues, favoring or influencing decisions for personal gain, or interfering in the Company’s management or decision-making processes. Any breach of this clause may result in disciplinary action, including termination, and the Company reserves the right to take legal action if deemed necessary.`
                    },
                    {
                        title: 'Other Conditions',
                        content: `Your employment is subject to the company’s standard terms and conditions, which may be amended from time to time. This offer is contingent upon successful completion of any pre-employment checks.\nPlease sign and return a copy of this letter by {{acceptance_deadline}} to confirm your acceptance of this offer.\nWe are excited about the prospect of you joining our team and look forward to your contributions to the continued success of Nexprism\nIf you have any questions or need further clarification, please do not hesitate to contact us.`
                    }
                ];

            // Render all sections
            sectionsToRender.forEach(sec => {
                renderClause(sec.title, sec.content);
            });

            // If signature block doesn't fit on current page, add new page
            if (doc.y > 510) {
                doc.addPage();
                doc.y = 75;
            }

            doc.moveDown(0.6);

            // SIGNED AND DELIVERED SECTION
            doc.fontSize(11).font('Helvetica-Bold').fillColor('#000000').text('SINGED AND DELIVERED');
            doc.moveDown(0.3);

            doc.fontSize(9.5).font('Helvetica-Bold').fillColor('#1E293B')
                .text('Company name: ', { continued: true })
                .font('Helvetica').text(offer.signatoryCompany || 'Nexprism');
            doc.fontSize(9.5).font('Helvetica-Bold').fillColor('#1E293B')
                .text('Email: ', { continued: true })
                .font('Helvetica').text(offer.signatoryEmail || 'Info@Nexprism.com');

            doc.moveDown(0.8);
            doc.fontSize(10).font('Helvetica-Bold').fillColor('#000000').text('SIGNED AND DELIVERED');
            doc.fontSize(9).font('Helvetica').fillColor('#475569').text('Authorized Signatory');

            // Stamp Box
            doc.moveDown(0.5);
            const stampY = doc.y;
            doc.rect(45, stampY, 110, 48).strokeColor('#94A3B8').lineWidth(0.8).dash(2, { space: 2 }).stroke();
            doc.undash();
            doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#0047AB')
                .text('NEXPRISM PVT LTD', 48, stampY + 12, { width: 104, align: 'center' });
            doc.fontSize(6.5).font('Helvetica').fillColor('#64748B')
                .text('OFFICIAL SEAL & SIGN', 48, stampY + 26, { width: 104, align: 'center' });

            doc.y = stampY + 58;

            // Separator dashed line
            doc.moveTo(45, doc.y).lineTo(550, doc.y).strokeColor('#94A3B8').lineWidth(0.8).dash(4, { space: 3 }).stroke();
            doc.undash();
            doc.moveDown(0.8);

            // EMPLOYEE ACKNOWLEDGMENT SECTION
            doc.fontSize(11).font('Helvetica-Bold').fillColor('#000000').text('Employee Acknowledgment:');
            doc.moveDown(0.4);

            doc.fontSize(9.5).font('Helvetica').fillColor('#334155')
                .text(`I, `, { continued: true })
                .font('Helvetica-Bold').fillColor('#000000').text(`${candidate.name || 'Candidate'} `, { continued: true })
                .font('Helvetica').fillColor('#334155').text('hereby accept the terms and conditions of employment as outlined in this letter.');
            doc.moveDown(0.8);

            doc.fontSize(10).font('Helvetica-Bold').fillColor('#000000')
                .text('Signature: _______________________');
            doc.moveDown(0.5);
            doc.text('Date: ___________________________');
            doc.moveDown(1.2);

            // Final Bottom Performance Note
            doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#0F172A')
                .text(offer.footerNote || 'Note: If you fail to perform your duties responsibly or your work performance is found unsatisfactory during the internship, the company reserves the right to cancel/terminate this internship offer at any time without prior notice.', { lineGap: 2.5, width: 505 });

            // ADD HEADER AND FOOTER TO ALL BUFFERED PAGES BEFORE ENDING
            const pageRange = doc.bufferedPageRange();
            const totalPages = pageRange.count;

            for (let i = 0; i < totalPages; i++) {
                doc.switchToPage(i);

                // ================= HEADER =================
                doc.fontSize(22).font('Helvetica-Bold').fillColor('#0047AB').text('NEX', 45, 25, { continued: true })
                    .font('Helvetica-Bold').fillColor('#00A699').text('PRISM');

                doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#0047AB').text('Digital India   |   ', 290, 32, { continued: true })
                    .fillColor('#E67E22').text('MSME   |   ')
                    .fillColor('#27AE60').text('MAKE IN INDIA   |   ')
                    .fillColor('#D35400').text('#startupindia');

                doc.moveTo(45, 58).lineTo(550, 58).strokeColor('#E2E8F0').lineWidth(0.8).stroke();

                // ================= FOOTER =================
                const footerY = 745;
                doc.rect(0, footerY, 595, 97).fill('#0B4F8A');

                doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#FFFFFF')
                    .text('Nexprism (Information Technology Company)', 20, footerY + 8, { align: 'center', width: 555 });

                doc.fontSize(6.5).font('Helvetica').fillColor('#E2E8F0')
                    .text('Mathura (Regd.Office): C3 moholi pura in behind of BSA Engineering Collage, Mathura (Uttar Pradesh) (281001)', 20, footerY + 22, { align: 'center', width: 555 })
                    .text('Surat (Corporate Office): B-1307-1308, 13th Floor, IT Park, Digital Valley, Mota Varachha, Surat, (Gujarat) (394105)', 20, footerY + 33, { align: 'center', width: 555 })
                    .text('Mumbai (Sales.Office): 205, Parikh Commercial Centre, Agashi Rd, Gokul Twp, Virar West, Maharashtra (401303)', 20, footerY + 44, { align: 'center', width: 555 });

                doc.fontSize(7).font('Helvetica-Bold').fillColor('#FFFFFF')
                    .text('| E-mail: info@nexprism.com | www.Nexprism.com | Contact no. (+91) 7505974545', 20, footerY + 58, { align: 'center', width: 555 });

                doc.fontSize(7).font('Helvetica').fillColor('#CBD5E1')
                    .text(`Page ${i + 1} of ${totalPages}`, 500, footerY + 74, { align: 'right', width: 60 });
            }

            doc.end();
        } catch (err) {
            reject(err);
        }
    });
};

module.exports = generateOfferLetterPDF;
