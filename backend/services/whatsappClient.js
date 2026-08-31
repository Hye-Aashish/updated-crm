const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const Setting = require('../models/Setting');

let client;
let currentQrData = null;
let clientStatus = 'disconnected'; // 'disconnected', 'qr_ready', 'connected'
let connectedPhone = '';

async function updateSettingStatus(status, phone = '') {
    try {
        const settings = await Setting.findOne({ type: 'general' }) || new Setting({ type: 'general' });
        if (!settings.whatsappSettings) {
            settings.whatsappSettings = {};
        }
        settings.whatsappSettings.qrSessionStatus = status;
        if (phone) settings.whatsappSettings.connectedPhone = phone;
        if (status === 'connected') {
            settings.whatsappSettings.connectedAt = new Date();
        } else if (status === 'disconnected') {
            settings.whatsappSettings.connectedAt = null;
            settings.whatsappSettings.connectedPhone = '';
        }
        await settings.save();
    } catch (e) {
        console.error('Failed to update Setting status:', e);
    }
}

function initWhatsAppClient() {
    console.log('Initializing WhatsApp Client (Puppeteer)...');
    client = new Client({
        authStrategy: new LocalAuth({ dataPath: './.wwebjs_auth' }),
        webVersionCache: {
            type: 'remote',
            remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html',
        },
        puppeteer: {
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
        }
    });

    client.on('qr', async (qr) => {
        console.log('📱 [WhatsApp Client] QR Code Received! Scan it to authenticate.');
        try {
            // Generate base64 data URI of the QR code
            currentQrData = await qrcode.toDataURL(qr);
            clientStatus = 'qr_ready';
            await updateSettingStatus('disconnected'); // Waiting to be connected
        } catch (err) {
            console.error('Error generating QR code data URI', err);
        }
    });

    client.on('ready', async () => {
        console.log('✅ [WhatsApp Client] Client is ready and authenticated!');
        clientStatus = 'connected';
        currentQrData = null;
        connectedPhone = client.info?.wid?.user || '';
        const displayPhone = connectedPhone.length === 12 ? `+${connectedPhone.substring(0,2)} ${connectedPhone.substring(2)}` : `+${connectedPhone}`;
        await updateSettingStatus('connected', displayPhone);
    });

    client.on('authenticated', () => {
        console.log('✅ [WhatsApp Client] Authenticated successfully');
    });

    client.on('auth_failure', async msg => {
        console.error('❌ [WhatsApp Client] Authentication failure', msg);
        clientStatus = 'disconnected';
        currentQrData = null;
        await updateSettingStatus('disconnected');
    });

    client.on('disconnected', async (reason) => {
        console.log('🔌 [WhatsApp Client] Client was logged out', reason);
        clientStatus = 'disconnected';
        currentQrData = null;
        connectedPhone = '';
        await updateSettingStatus('disconnected');
        
        // Re-initialize to get a new QR code
        setTimeout(initWhatsAppClient, 5000); 
    });

    client.on('message', async (message) => {
        try {
            if (message.from === 'status@broadcast') return; // Ignore status updates

            const contact = await message.getContact();
            if (contact && contact.id && contact.id.server === 'lid') return; // Ignore LIDs
            
            const rawPhone = contact.number;
            const senderName = contact.name || contact.pushname || contact.verifiedName || contact.shortName || 'WhatsApp User';
            const messageText = message.body || '';
            const notes = `Received via Local WhatsApp Client (Message ID: ${message.id.id})`;

            // Dynamically require to avoid circular dependencies
            const { processWhatsAppMessage } = require('./whatsappLogic'); 
            await processWhatsAppMessage({ rawPhone, senderName, messageText, notes });

        } catch (err) {
            console.error('❌ [WhatsApp Client] Error processing incoming message:', err);
        }
    });

    client.initialize().catch(err => {
        console.error('Failed to initialize WhatsApp client:', err);
    });
}

async function logoutClient() {
    if (client) {
        await client.logout().catch(e => console.log('Logout error', e));
        clientStatus = 'disconnected';
        currentQrData = null;
        await updateSettingStatus('disconnected');
        
        // Re-initialize for new QR
        setTimeout(initWhatsAppClient, 2000);
    }
}

function getSessionStatus() {
    return {
        status: clientStatus,
        qrCodeDataURI: currentQrData,
        connectedPhone
    };
}

async function syncHistoricalChats(chatLimit = 50, messageLimit = 20) {
    if (!client || clientStatus !== 'connected') {
        throw new Error('WhatsApp client is not connected.');
    }

    console.log(`🔄 [WhatsApp Client] Starting sync of top ${chatLimit} chats...`);
    let targetChats = [];

    try {
        const chats = await client.getChats();
        targetChats = chats.filter(c => !c.isGroup).slice(0, chatLimit);
    } catch (e) {
        console.warn('⚠️ [WhatsApp Client] getChats() failed (WhatsApp Web update might have broken it). Falling back to getContacts(). Error:', e.message);
        try {
            const contacts = await client.getContacts();
            const userContacts = contacts.filter(c => c.isUser && !c.isMe && (!c.id || c.id.server !== 'lid'));
            
            // Only get chats for top active contacts or just slice
            const selectedContacts = userContacts.slice(0, chatLimit);
            for (const c of selectedContacts) {
                try {
                    const chat = await client.getChatById(c.id._serialized);
                    if (chat) targetChats.push(chat);
                } catch (err) {}
            }
        } catch (contactErr) {
            throw new Error('Both getChats() and getContacts() failed. WhatsApp Web may have updated and broken this feature temporarily.');
        }
    }

    if (targetChats.length === 0) {
        throw new Error('No chats found to sync.');
    }

    let syncedChats = 0;
    let syncedMessages = 0;

    const { processWhatsAppMessage } = require('./whatsappLogic'); 

    for (const chat of targetChats) {
        try {
            const contact = await chat.getContact();
            const rawPhone = contact.number;
            if (!rawPhone) continue;

            const senderName = contact.name || contact.pushname || contact.verifiedName || contact.shortName || 'WhatsApp User';
            const messages = await chat.fetchMessages({ limit: messageLimit });

            for (const msg of messages) {
                if (msg.from === 'status@broadcast') continue;
                
                const messageText = msg.body || '';
                if (!messageText) continue;

                // For historical sync, we append a note indicating it's historical
                const notes = `(Synced Historical Message) ID: ${msg.id.id}`;

                await processWhatsAppMessage({ rawPhone, senderName, messageText, notes });
                syncedMessages++;
            }
            syncedChats++;
        } catch (err) {
            console.error(`❌ [WhatsApp Client] Failed to sync chat for ${chat.name}:`, err);
        }
    }

    console.log(`✅ [WhatsApp Client] Sync complete! Synced ${syncedChats} chats and ${syncedMessages} messages.`);
    return { syncedChats, syncedMessages };
}

module.exports = {
    initWhatsAppClient,
    getSessionStatus,
    logoutClient,
    syncHistoricalChats
};
