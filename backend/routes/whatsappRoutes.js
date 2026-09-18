const express = require('express');
const router = express.Router();
const Lead = require('../models/Lead');
const Setting = require('../models/Setting');
const Notification = require('../models/Notification');
const { protect } = require('../middleware/authMiddleware');

/**
 * 1. GET /api/whatsapp/webhook
 * Meta Cloud API Webhook Verification Endpoint
 */
router.get('/webhook', async (req, res) => {
    try {
        const mode = req.query['hub.mode'];
        const token = req.query['hub.verify_token'];
        const challenge = req.query['hub.challenge'];

        const settings = await Setting.findOne({ type: 'general' });
        const expectedToken = settings?.whatsappSettings?.webhookVerifyToken || 'nexcrm_wa_secret';

        if (mode === 'subscribe' && token === expectedToken) {
            console.log('✅ [WhatsApp Webhook] Verification successful!');
            return res.status(200).send(challenge);
        } else {
            console.warn('❌ [WhatsApp Webhook] Verification failed: Token mismatch or invalid mode.');
            return res.status(403).json({ message: 'Forbidden: Invalid verification token' });
        }
    } catch (err) {
        console.error('WhatsApp Webhook verification error:', err);
        return res.status(500).json({ message: err.message });
    }
});

const { processWhatsAppMessage } = require('../services/whatsappLogic');
const { getSessionStatus, logoutClient } = require('../services/whatsappClient');

/**
 * 2. POST /api/whatsapp/webhook
 * Receives incoming WhatsApp messages (Meta Cloud API or Generic Webhook)
 */
router.post('/webhook', async (req, res) => {
    try {
        const body = req.body;

        let rawPhone = '';
        let senderName = '';
        let messageText = '';
        let notes = '';

        // Check if Meta WhatsApp Cloud API Payload
        if (body.object === 'whatsapp_business_account' && body.entry?.[0]?.changes?.[0]?.value) {
            const value = body.entry[0].changes[0].value;
            const msg = value.messages?.[0];
            const contact = value.contacts?.[0];

            if (!msg) {
                // Status update payload, acknowledge receipt
                return res.status(200).json({ status: 'ignored_status_update' });
            }

            rawPhone = msg.from;
            senderName = contact?.profile?.name || '';
            messageText = msg.text?.body || msg.caption || `[${msg.type} Attachment]`;
            notes = `Meta Message ID: ${msg.id}`;
        } else {
            // Generic Webhook Payload (Verify token requirement)
            const settings = await Setting.findOne({ type: 'general' });
            const expectedToken = settings?.whatsappSettings?.webhookVerifyToken || 'nexcrm_wa_secret';
            const providedToken = req.headers['x-webhook-token'] || req.query.secret || req.query.token || body.secret || body.token;

            if (providedToken !== expectedToken && process.env.NODE_ENV === 'production') {
                console.warn('[SECURITY] Generic WhatsApp webhook rejected: Token mismatch');
                return res.status(403).json({ message: 'Forbidden: Invalid webhook secret token' });
            }

            rawPhone = body.phone || body.from || body.number || body.mobile || body.senderPhone;
            senderName = body.name || body.senderName || body.profileName || body.contactName;
            messageText = body.message || body.text || body.body || body.content;
            notes = body.notes || body.comment || body.description || '';
        }

        if (!rawPhone) {
            return res.status(400).json({ message: 'No phone number detected in payload' });
        }

        const result = await processWhatsAppMessage({ rawPhone, senderName, messageText, notes });

        return res.status(200).json({
            success: true,
            action: result.action,
            lead: {
                id: result.lead._id,
                name: result.lead.name,
                phone: result.lead.phone,
                stage: result.lead.stage
            }
        });
    } catch (err) {
        console.error('❌ [WhatsApp Webhook Error]:', err.message);
        return res.status(500).json({ message: err.message });
    }
});

/**
 * 3. POST /api/whatsapp/test-webhook
 * Trigger test WhatsApp lead creation / comment from UI
 */
router.post('/test-webhook', protect, async (req, res) => {
    try {
        const { phone, name, message, notes } = req.body;
        if (!phone) {
            return res.status(400).json({ message: 'Test phone number is required' });
        }

        const result = await processWhatsAppMessage({
            rawPhone: phone,
            senderName: name || 'Test WhatsApp User',
            messageText: message || 'Hello, I want to inquire about your services!',
            notes: notes || 'Test Note: Wants product pricing brochure.'
        });

        return res.json({
            success: true,
            message: result.action === 'created_lead' ? 'New lead successfully created from test WhatsApp payload!' : 'Message appended to existing lead comments!',
            action: result.action,
            lead: result.lead
        });
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
});

/**
 * 4. POST /api/whatsapp/send
 * Outbound WhatsApp message dispatcher
 */
router.post('/send', protect, async (req, res) => {
    try {
        const { phone, message, leadId } = req.body;
        if (!phone || !message) {
            return res.status(400).json({ message: 'Phone number and message text are required' });
        }

        const settings = await Setting.findOne({ type: 'general' });
        const waConfig = settings?.whatsappSettings;

        let sentViaApi = false;
        let apiError = null;

        if (waConfig?.enabled && waConfig?.accessToken && waConfig?.phoneNumberId) {
            // Attempt Meta Cloud API dispatch
            try {
                const cleanPhone = String(phone).replace(/\D/g, '');
                const response = await fetch(`https://graph.facebook.com/v18.0/${waConfig.phoneNumberId}/messages`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${waConfig.accessToken}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        messaging_product: 'whatsapp',
                        to: cleanPhone,
                        type: 'text',
                        text: { body: message }
                    })
                });
                const data = await response.json();
                if (response.ok) {
                    sentViaApi = true;
                } else {
                    apiError = data.error?.message || 'Meta API call failed';
                }
            } catch (err) {
                apiError = err.message;
            }
        }

        // Log activity on lead if leadId provided
        if (leadId) {
            const lead = await Lead.findById(leadId);
            if (lead) {
                lead.activities.push({
                    content: `[WhatsApp Outbound]\n${message}${sentViaApi ? ' (Sent via Meta Cloud API)' : ' (Log)'}`,
                    type: 'note',
                    createdAt: new Date()
                });
                await lead.save();
            }
        }

        return res.json({
            success: true,
            sentViaApi,
            apiError,
            message: sentViaApi ? 'WhatsApp message dispatched successfully!' : 'Message logged to lead history. (Configure Meta Cloud API token for direct API sending).'
        });
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
});

/**
 * 5. GET /api/whatsapp/qr-session
 * Fetch live WhatsApp QR Code & pairing status from local client
 */
router.get('/qr-session', protect, async (req, res) => {
    try {
        const sessionInfo = getSessionStatus();
        
        return res.json({
            success: true,
            status: sessionInfo.status,
            connectedPhone: sessionInfo.connectedPhone,
            connectedAt: null, // the setting model saves it but for session poll we can just rely on status
            sessionToken: 'LIVE',
            qrCodeDataURI: sessionInfo.qrCodeDataURI // Use data URI now
        });
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
});

/**
 * 6. POST /api/whatsapp/pair-device
 * Removed simulation. Inform frontend to use QR code.
 */
router.post('/pair-device', protect, async (req, res) => {
    return res.status(400).json({ message: 'Pairing simulation disabled. Please scan the real QR Code to connect.' });
});

/**
 * 7. POST /api/whatsapp/disconnect-device
 * Unlink / Disconnect WhatsApp Web Session
 */
router.post('/disconnect-device', protect, async (req, res) => {
    try {
        await logoutClient();

        return res.json({
            success: true,
            message: 'WhatsApp device unlinked successfully.',
            status: 'disconnected'
        });
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
});

/**
 * 8. POST /api/whatsapp/sync-chats
 * Sync historical chats into CRM
 */
router.post('/sync-chats', protect, async (req, res) => {
    try {
        const { syncHistoricalChats } = require('../services/whatsappClient');
        const { chatLimit = 15, messageLimit = 10 } = req.body;
        
        // Run in background so request doesn't timeout
        syncHistoricalChats(chatLimit, messageLimit).catch(e => console.error('Background sync failed:', e));

        return res.json({
            success: true,
            message: `Background sync initiated for up to ${chatLimit} chats.`
        });
    } catch (err) {
        console.error('❌ Sync Chats Error:', err);
        return res.status(500).json({ message: err.message });
    }
});

module.exports = router;
