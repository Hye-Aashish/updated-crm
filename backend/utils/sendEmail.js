const nodemailer = require('nodemailer');
const Setting = require('../models/Setting');

const sendEmail = async (options) => {
    // 1. Fetch SMTP Settings from DB
    const settings = await Setting.findOne({ type: 'general' });

    if (!settings || !settings.emailSettings || !settings.emailSettings.host) {
        throw new Error('SMTP settings are not configured. Please go to Settings > SMTP.');
    }

    const { host, port, user, pass, secure, fromEmail, fromName } = settings.emailSettings;

    if (!user || !pass) {
        throw new Error('SMTP username or password is missing. Please check Settings > Email.');
    }

    // 2. Create Transporter with timeout
    const transporter = nodemailer.createTransport({
        host,
        port: port || 587,
        secure: secure || false, // true for 465, false for 587/25
        auth: {
            user,
            pass
        },
        connectionTimeout: 10000, // 10 seconds
        greetingTimeout: 10000,
        socketTimeout: 15000,
        tls: {
            rejectUnauthorized: false // Allow self-signed certs (common on shared hosting)
        }
    });

    // 3. Define Email Options
    // Always use the SMTP authenticated user as sender to avoid rejection.
    const senderEmail = user;

    const mailOptions = {
        from: `"${fromName || 'CRM System'}" <${senderEmail}>`,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
        ...(options.attachments && { attachments: options.attachments })
    };

    // 4. Send Email
    try {
        const info = await transporter.sendMail(mailOptions);
        console.log(`[EMAIL] Sent to ${options.to} | MessageId: ${info.messageId}`);
        return info;
    } catch (err) {
        console.error('[EMAIL ERROR]', err.message);
        console.error('[EMAIL ERROR DETAILS]', JSON.stringify({
            host,
            port,
            secure,
            user,
            senderEmail,
            errorCode: err.code,
            errorCommand: err.command
        }));
        throw new Error(`Email delivery failed: ${err.message}`);
    }
};

module.exports = sendEmail;
