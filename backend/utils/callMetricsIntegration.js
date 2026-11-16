const axios = require('axios');

const enabled = () => Boolean(
    process.env.CALL_METRICS_API_URL && process.env.CALL_METRICS_INTEGRATION_KEY
);

const headers = () => ({
    'X-Integration-Key': process.env.CALL_METRICS_INTEGRATION_KEY,
    'Content-Type': 'application/json'
});

const apiBase = () => String(process.env.CALL_METRICS_API_URL || '').replace(/\/$/, '');

const assigneeEmailForLead = async (lead, User) => {
    if (!lead?.assignedTo || !User) return '';
    try {
        const user = await User.findById(lead.assignedTo).select('email name').lean();
        return String(user?.email || '').trim().toLowerCase();
    } catch {
        return '';
    }
};

const notifyFollowUp = async (lead, User, { sendToApp = false, followUpType = 'call' } = {}) => {
    if (!enabled() || !lead) return;
    const assignedToEmail = await assigneeEmailForLead(lead, User);
    try {
        await axios.post(`${apiBase()}/api/integrations/crm/follow-up`, {
            crmLeadId: String(lead._id),
            name: lead.name || '',
            company: lead.company || '',
            phone: lead.phone || '',
            assignedToName: lead.assignedToName || '',
            assignedToEmail,
            followUpAt: lead.reminder?.date || null,
            followUpCompleted: Boolean(lead.reminder?.completed),
            followUpType: followUpType || 'call',
            sendToApp: Boolean(sendToApp)
        }, { headers: headers(), timeout: 12000 });
    } catch (error) {
        console.error('[callMetricsIntegration]', error.response?.data?.message || error.message);
    }
};

const dispatchToApp = async (lead, User) => {
    if (!enabled() || !lead) return;
    const assignedToEmail = await assigneeEmailForLead(lead, User);
    try {
        await axios.post(`${apiBase()}/api/integrations/crm/dispatch`, {
            agentEmail: assignedToEmail,
            clientPhone: lead.phone || '',
            clientName: lead.name || '',
            outboundNote: lead.company ? `CRM lead · ${lead.company}` : 'CRM lead'
        }, { headers: headers(), timeout: 12000 });
    } catch (error) {
        console.error('[callMetricsIntegration:dispatch]', error.response?.data?.message || error.message);
    }
};

module.exports = {
    enabled,
    notifyFollowUp,
    dispatchToApp
};