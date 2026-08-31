const Lead = require('../models/Lead');
const Setting = require('../models/Setting');
const Notification = require('../models/Notification');

/**
 * Process incoming WhatsApp message payload & create/update Lead
 */
async function processWhatsAppMessage({ rawPhone, senderName, messageText, notes }) {
    if (!rawPhone) {
        throw new Error('Phone number is required');
    }

    const cleanPhone = String(rawPhone).replace(/\D/g, '');
    if (!cleanPhone) {
        throw new Error('Invalid phone number format');
    }

    const last10 = cleanPhone.slice(-10);

    // Search for existing lead by phone number matching last 10 digits
    let lead = await Lead.findOne({ phone: { $regex: last10 + '$' } });

    const formattedMessage = messageText || 'No text provided';
    const noteContent = `[WhatsApp Message]\nMessage: ${formattedMessage}${notes ? `\nNotes: ${notes}` : ''}`;

    if (lead) {
        // Append note to existing lead
        lead.activities.push({
            content: noteContent,
            type: 'note',
            createdAt: new Date()
        });

        // Trigger AI priority check if available
        try {
            const { analyzeLeadPriorityAndExtractReminder } = require('./aiService');
            const aiResult = await analyzeLeadPriorityAndExtractReminder(lead.activities);
            if (aiResult?.priority) {
                lead.aiPriority = aiResult.priority;
                lead.aiPriorityReason = aiResult.reason;
            }
        } catch (aiErr) {
            // Silently ignore AI service error
        }

        await lead.save();
        console.log(`💬 [WhatsApp] Added activity comment to existing lead: ${lead.name} (${lead._id})`);
        return { action: 'updated_lead', lead };
    } else {
        // Fetch default stage settings
        const settings = await Setting.findOne({ type: 'general' });
        const defaultStage = settings?.whatsappSettings?.defaultStage || 'new';

        const leadName = senderName?.trim() || `WhatsApp User (${last10})`;
        const companyName = senderName?.trim() ? `${senderName.trim()} (WhatsApp)` : `WhatsApp Lead (${last10})`;
        
        let displayPhone = `+${cleanPhone}`;
        if (cleanPhone.length === 10) {
            displayPhone = `+91 ${cleanPhone}`;
        } else if (cleanPhone.length === 12 && cleanPhone.startsWith('91')) {
            displayPhone = `+91 ${cleanPhone.slice(2)}`;
        }

        lead = new Lead({
            name: leadName,
            company: companyName,
            phone: displayPhone,
            source: 'WhatsApp',
            stage: defaultStage,
            activities: [{
                content: `[WhatsApp Lead Created]\nMessage: ${formattedMessage}${notes ? `\nNotes: ${notes}` : ''}`,
                type: 'note',
                createdAt: new Date()
            }]
        });

        await lead.save();

        // Create notification
        try {
            await Notification.create({
                title: 'New WhatsApp Lead Captured',
                message: `Lead "${lead.name}" (${lead.phone}) came in from WhatsApp!`,
                type: 'new_lead',
                relatedId: lead._id
            });
        } catch (nErr) {
            console.error('Notification error:', nErr);
        }

        console.log(`✨ [WhatsApp] Created new lead: ${lead.name} (${lead._id})`);
        return { action: 'created_lead', lead };
    }
}

module.exports = {
    processWhatsAppMessage
};
