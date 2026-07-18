const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');

// Import all models
const Project = require('../models/Project');
const Client = require('../models/Client');
const Task = require('../models/Task');
const Invoice = require('../models/Invoice');
const Expense = require('../models/Expense');
const Lead = require('../models/Lead');
const User = require('../models/User');
const Ticket = require('../models/Ticket');
const TimeEntry = require('../models/TimeEntry');
const Amc = require('../models/Amc');
const Domain = require('../models/Domain');
const Attendance = require('../models/Attendance');
const Setting = require('../models/Setting');

// ── Gather ALL CRM Data ─────────────────────────────────────────────────────
async function gatherCRMData() {
    const [
        projects,
        clients,
        tasks,
        invoices,
        expenses,
        leads,
        users,
        tickets,
        timeEntries,
        amcs,
        domains,
        attendanceRecords,
    ] = await Promise.all([
        Project.find({}, 'name status budget client startDate endDate progress').lean(),
        Client.find({}, 'name company email status').lean(),
        Task.find({}, 'title status priority assigneeId dueDate createdAt updatedAt').sort({ updatedAt: -1 }).limit(100).lean(),
        Invoice.find({}, 'invoiceNumber total amount dueDate client status').lean(),
        Expense.find({}, 'description amount category date').sort({ date: -1 }).limit(50).lean(),
        Lead.find({}, 'name email status source').lean(),
        User.find({}, 'name email role designation department').lean(),
        Ticket.find({}, 'status').lean(),
        TimeEntry.find().sort({ startTime: -1 }).limit(150).lean(),
        Amc.find({}, 'clientName name amount startDate endDate status').lean().catch(() => []),
        Domain.find({}, 'name domain expiryDate status').lean().catch(() => []),
        Attendance.find().sort({ date: -1 }).limit(100).lean().catch(() => []),
    ]);

    // Map user IDs to names for quick reference in tasks/time entries
    const userMap = {};
    users.forEach(u => {
        userMap[u._id.toString()] = {
            name: u.name,
            email: u.email,
            role: u.role,
            designation: u.designation,
            department: u.department
        };
    });

    // Calculate summary stats
    const totalRevenue = invoices
        .filter(i => i.status === 'paid')
        .reduce((sum, i) => sum + (i.total || i.amount || 0), 0);

    const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);

    const totalInvoiced = invoices.reduce((sum, i) => sum + (i.total || i.amount || 0), 0);

    const pendingInvoices = invoices.filter(i => i.status !== 'paid');
    const overdueInvoices = invoices.filter(i => {
        if (!i.dueDate) return false;
        return new Date(i.dueDate) < new Date() && i.status !== 'paid';
    });

    const activeProjects = projects.filter(p =>
        p.status === 'in-progress' || p.status === 'active' || p.status === 'in_progress'
    );
    const completedProjects = projects.filter(p =>
        p.status === 'completed' || p.status === 'done'
    );

    const openTasks = tasks.filter(t => t.status !== 'completed' && t.status !== 'done');
    const overdueTasks = tasks.filter(t => {
        if (!t.dueDate) return false;
        return new Date(t.dueDate) < new Date() && t.status !== 'completed' && t.status !== 'done';
    });

    const newLeads = leads.filter(l => l.status === 'new' || l.status === 'New');
    const convertedLeads = leads.filter(l => l.status === 'converted' || l.status === 'Converted' || l.status === 'won');

    const openTickets = tickets.filter(t => t.status !== 'closed' && t.status !== 'resolved');

    const employees = users.filter(u => u.role === 'employee');
    const admins = users.filter(u => u.role === 'admin' || u.role === 'owner');

    // Time tracking stats
    const totalHoursTracked = timeEntries.reduce((sum, t) => sum + (t.duration || 0), 0) / 60;

    // Build lists with user mappings
    const taskList = tasks.map(t => ({
        id: t._id,
        title: t.title,
        status: t.status,
        priority: t.priority,
        assigneeName: t.assigneeId && userMap[t.assigneeId.toString()] ? userMap[t.assigneeId.toString()].name : 'Unassigned',
        dueDate: t.dueDate,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt
    }));

    const tasksByAssignee = {};
    taskList.forEach(t => {
        const name = t.assigneeName;
        if (!tasksByAssignee[name]) {
            tasksByAssignee[name] = [];
        }
        tasksByAssignee[name].push({
            title: t.title,
            status: t.status,
            priority: t.priority,
            dueDate: t.dueDate
        });
    });

    const timeTrackingList = timeEntries.map(te => ({
        userName: te.userId && userMap[te.userId.toString()] ? userMap[te.userId.toString()].name : 'Unknown',
        projectName: te.projectId ? (projects.find(p => p._id.toString() === te.projectId.toString())?.name || 'Unknown Project') : 'Unknown Project',
        taskTitle: te.taskId ? (tasks.find(t => t._id.toString() === te.taskId.toString())?.title || 'Unknown Task') : 'No Task',
        startTime: te.startTime,
        endTime: te.endTime,
        duration: te.duration,
        note: te.note,
        isRunning: te.isRunning
    }));

    const teamList = users.map(u => ({
        id: u._id,
        name: u.name,
        email: u.email,
        role: u.role,
        designation: u.designation || 'None',
        department: u.department || 'None',
        joiningDate: u.joiningDate,
    }));

    const attendanceList = attendanceRecords.map(att => ({
        userName: att.userId && userMap[att.userId.toString()] ? userMap[att.userId.toString()].name : 'Unknown',
        date: att.date,
        checkIn: att.checkIn,
        checkOut: att.checkOut,
        status: att.status,
        totalWorkTime: att.totalWorkTime,
        totalBreakTime: att.totalBreakTime,
        note: att.note
    }));

    return {
        summary: {
            totalRevenue,
            totalExpenses,
            netProfit: totalRevenue - totalExpenses,
            totalInvoiced,
            pendingAmount: pendingInvoices.reduce((sum, i) => sum + (i.total || i.amount || 0), 0),
            overdueAmount: overdueInvoices.reduce((sum, i) => sum + (i.total || i.amount || 0), 0),
        },
        projects: {
            total: projects.length,
            active: activeProjects.length,
            completed: completedProjects.length,
            list: projects.map(p => ({
                name: p.name,
                status: p.status,
                budget: p.budget,
                client: p.client,
                startDate: p.startDate,
                endDate: p.endDate,
                progress: p.progress,
            })),
        },
        clients: {
            total: clients.length,
            list: clients.map(c => ({
                name: c.name || c.company,
                company: c.company,
                email: c.email,
                status: c.status,
            })),
        },
        tasks: {
            total: tasks.length,
            open: openTasks.length,
            overdue: overdueTasks.length,
            groupedByAssignee: tasksByAssignee,
        },
        invoices: {
            total: invoices.length,
            paid: invoices.filter(i => i.status === 'paid').length,
            pending: pendingInvoices.length,
            overdue: overdueInvoices.length,
            pendingList: pendingInvoices.slice(0, 10).map(i => ({
                invoiceNumber: i.invoiceNumber,
                amount: i.total || i.amount,
                dueDate: i.dueDate,
                client: i.client,
                status: i.status,
            })),
        },
        expenses: {
            total: expenses.length,
            totalAmount: totalExpenses,
            recent: expenses.slice(0, 10).map(e => ({
                description: e.description || e.title,
                amount: e.amount,
                category: e.category,
                date: e.date,
            })),
        },
        leads: {
            total: leads.length,
            new: newLeads.length,
            converted: convertedLeads.length,
            conversionRate: leads.length > 0 ? ((convertedLeads.length / leads.length) * 100).toFixed(1) + '%' : '0%',
            list: leads.map(l => ({
                name: l.name,
                email: l.email,
                status: l.status,
                source: l.source,
            })),
        },
        team: {
            totalUsers: users.length,
            employees: employees.length,
            admins: admins.length,
            list: teamList,
        },
        tickets: {
            total: tickets.length,
            open: openTickets.length,
        },
        timeTracking: {
            totalHoursTracked: totalHoursTracked.toFixed(1),
            totalEntries: timeEntries.length,
            recentEntries: timeTrackingList,
        },
        attendance: {
            recentLogs: attendanceList,
        },
        amcs: {
            total: amcs.length,
            list: amcs.slice(0, 10).map(a => ({
                name: a.clientName || a.name,
                amount: a.amount,
                startDate: a.startDate,
                endDate: a.endDate,
                status: a.status,
            })),
        },
        domains: {
            total: domains.length,
            list: domains.slice(0, 10).map(d => ({
                name: d.name || d.domain,
                expiryDate: d.expiryDate,
                status: d.status,
            })),
        }
    };
}

// ── Build AI Prompt ──────────────────────────────────────────────────────────
function buildSystemPrompt(crmData) {
    return `You are "Nexprism AI" — an intelligent CRM business advisor embedded inside the Nexprism Agency Management System.

Current Date and Time: ${new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })} (IST)

You have COMPLETE access to the following real-time CRM data:

═══════════════════════════════════════════════════
📊 FINANCIAL SUMMARY
═══════════════════════════════════════════════════
• Total Revenue (Paid): ₹${crmData.summary.totalRevenue.toLocaleString('en-IN')}
• Total Expenses: ₹${crmData.summary.totalExpenses.toLocaleString('en-IN')}
• Net Profit: ₹${crmData.summary.netProfit.toLocaleString('en-IN')}
• Total Invoiced: ₹${crmData.summary.totalInvoiced.toLocaleString('en-IN')}
• Pending Amount: ₹${crmData.summary.pendingAmount.toLocaleString('en-IN')}
• Overdue Amount: ₹${crmData.summary.overdueAmount.toLocaleString('en-IN')}

═══════════════════════════════════════════════════
📁 PROJECTS
═══════════════════════════════════════════════════
• Total: ${crmData.projects.total} | Active: ${crmData.projects.active} | Completed: ${crmData.projects.completed}
• Details: ${JSON.stringify(crmData.projects.list)}

═══════════════════════════════════════════════════
👥 CLIENTS
═══════════════════════════════════════════════════
• Total Clients: ${crmData.clients.total}
• Details: ${JSON.stringify(crmData.clients.list)}

═══════════════════════════════════════════════════
✅ TASKS
═══════════════════════════════════════════════════
• Total: ${crmData.tasks.total} | Open: ${crmData.tasks.open} | Overdue: ${crmData.tasks.overdue}
• Tasks Grouped strictly by Assignee Name (DO NOT mix or conflate tasks across different employees): ${JSON.stringify(crmData.tasks.groupedByAssignee)}

═══════════════════════════════════════════════════
🧾 INVOICES
═══════════════════════════════════════════════════
• Total: ${crmData.invoices.total} | Paid: ${crmData.invoices.paid} | Pending: ${crmData.invoices.pending} | Overdue: ${crmData.invoices.overdue}
• Pending Invoices: ${JSON.stringify(crmData.invoices.pendingList)}

═══════════════════════════════════════════════════
💸 EXPENSES
═══════════════════════════════════════════════════
• Total Entries: ${crmData.expenses.total} | Total Amount: ₹${crmData.expenses.totalAmount.toLocaleString('en-IN')}
• Recent: ${JSON.stringify(crmData.expenses.recent)}

═══════════════════════════════════════════════════
🎯 LEADS
═══════════════════════════════════════════════════
• Total: ${crmData.leads.total} | New: ${crmData.leads.new} | Converted: ${crmData.leads.converted}
• Conversion Rate: ${crmData.leads.conversionRate}
• Details: ${JSON.stringify(crmData.leads.list)}

═══════════════════════════════════════════════════
👨‍💻 TEAM
═══════════════════════════════════════════════════
• Total Users: ${crmData.team.totalUsers} | Employees: ${crmData.team.employees} | Admins: ${crmData.team.admins}
• Team Members details (names, roles, designations, departments): ${JSON.stringify(crmData.team.list)}

═══════════════════════════════════════════════════
🎫 SUPPORT TICKETS
═══════════════════════════════════════════════════
• Total: ${crmData.tickets.total} | Open: ${crmData.tickets.open}

═══════════════════════════════════════════════════
⏱️ TIME TRACKING
═══════════════════════════════════════════════════
• Total Hours: ${crmData.timeTracking.totalHoursTracked} hrs | Entries: ${crmData.timeTracking.totalEntries}
• Recent Time Logs: ${JSON.stringify(crmData.timeTracking.recentEntries)}

═══════════════════════════════════════════════════
📅 ATTENDANCE
═══════════════════════════════════════════════════
• Recent Attendance Records: ${JSON.stringify(crmData.attendance.recentLogs)}

═══════════════════════════════════════════════════
🔒 AMC (Annual Maintenance Contracts)
═══════════════════════════════════════════════════
• Total: ${crmData.amcs.total}
• Details: ${JSON.stringify(crmData.amcs.list)}

═══════════════════════════════════════════════════
🌐 DOMAINS
═══════════════════════════════════════════════════
• Total: ${crmData.domains.total}
• Details: ${JSON.stringify(crmData.domains.list)}

═══════════════════════════════════════════════════

CRITICAL DATA ACCURACY RULES:
- **Strict Name Matching**: "Anshul Sharma" (Frontend Developer) and "Anshul Jha" (Backend Developer) are two DIFFERENT employees. You MUST NEVER conflate them. Do not map tasks belonging to "Anshul Jha" to "Anshul Sharma" or vice versa. 
- **Exact Assignee Filter**: To calculate stats or list tasks for any employee, you must filter the 'tasks.list' array where 'assigneeName' matches their full name EXACTLY. 
- **No Hallucinated Assignments**: If an employee has 0 tasks in 'todo' or 'in-progress' status, report 0. Never grab tasks belonging to other employees (like Prasad Hol's pending tasks) to pad an employee's task list.
- **Accurate Count Math**: Count the task statuses ('todo', 'in-progress', 'done', etc.) strictly by parsing the task objects. Do not guess or assume.

YOUR ROLE:
1. Answer ALL questions about the CRM data accurately using the data above
2. Provide actionable business insights and recommendations
3. Suggest what to do next and what to avoid
4. Identify risks, opportunities, and areas for improvement
5. Help with future planning based on current trends
6. Be proactive — if you see problems (overdue tasks, unpaid invoices, low conversion), WARN about them
7. Always respond in the SAME LANGUAGE as the user's question (if they ask in Hindi/Hinglish, reply in Hindi/Hinglish)
8. Use emojis and formatting to make responses easy to read
9. Be specific with numbers, names, and dates from the data
10. Act like a smart business consultant who knows everything about this agency

FORMATTING RULES:
- Use markdown formatting for headers, bullets, bold text
- Include specific numbers and data points
- Give recommendations with clear action items
- Use ✅ ❌ ⚠️ 📊 💡 🔥 emojis appropriately
- Keep responses comprehensive but organized`;
}

// ── Chat Endpoint ────────────────────────────────────────────────────────────
router.post('/chat', protect, authorize('owner', 'admin'), async (req, res) => {
    try {
        const { message, conversationHistory = [] } = req.body;

        if (!message || !message.trim()) {
            return res.status(400).json({ message: 'Message is required' });
        }

        // Get API key — first from Settings DB, then from .env
        let apiKey = null;
        let provider = 'gemini';

        // 1. Try to get from Settings (UI configured)
        try {
            const settings = await Setting.findOne();
            if (settings?.apiKeys?.openai) {
                apiKey = settings.apiKeys.openai;
                provider = 'openai';
            } else if (settings?.apiKeys?.gemini) {
                apiKey = settings.apiKeys.gemini;
                provider = 'gemini';
            }
        } catch (e) { }

        // 2. Fall back to .env
        if (!apiKey) {
            if (process.env.OPENAI_API_KEY) {
                apiKey = process.env.OPENAI_API_KEY;
                provider = 'openai';
            } else {
                apiKey = process.env.GEMINI_API_KEY;
                provider = 'gemini';
            }
        }

        if (!apiKey) {
            return res.status(400).json({
                message: 'AI API key not configured. Please add GEMINI_API_KEY or OPENAI_API_KEY to your backend .env file or configure it in Settings.',
                needsApiKey: true
            });
        }

        // Gather all CRM data
        const crmData = await gatherCRMData();
        const systemPrompt = buildSystemPrompt(crmData);

        // Set SSE Headers
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        const snapshot = {
            revenue: crmData.summary.totalRevenue,
            expenses: crmData.summary.totalExpenses,
            profit: crmData.summary.netProfit,
            activeProjects: crmData.projects.active,
            openTasks: crmData.tasks.open,
            overdueTasks: crmData.tasks.overdue,
            pendingInvoices: crmData.invoices.pending,
            leads: crmData.leads.total,
            conversionRate: crmData.leads.conversionRate,
        };

        if (provider === 'openai') {
            const messagesList = [{ role: 'system', content: systemPrompt }];

            if (conversationHistory.length > 0) {
                for (const msg of conversationHistory.slice(-10)) {
                    messagesList.push({
                        role: msg.role === 'assistant' ? 'assistant' : 'user',
                        content: msg.content
                    });
                }
            }

            messagesList.push({
                role: 'user',
                content: message
            });

            const response = await fetch(
                'https://api.openai.com/v1/chat/completions',
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${apiKey}`
                    },
                    body: JSON.stringify({
                        model: 'gpt-4o-mini',
                        messages: messagesList,
                        temperature: 0.7,
                        max_tokens: 4096,
                        stream: true
                    })
                }
            );

            if (!response.ok) {
                const error = await response.json().catch(() => ({}));
                console.error('OpenAI API Error:', error);
                res.write(`data: ${JSON.stringify({ error: error?.error?.message || 'OpenAI streaming error' })}\n\n`);
                res.end();
                return;
            }

            const decoder = new TextDecoder();
            let buffer = '';
            for await (const chunk of response.body) {
                buffer += decoder.decode(chunk, { stream: true });
                let lineIndex;
                while ((lineIndex = buffer.indexOf('\n')) !== -1) {
                    const line = buffer.slice(0, lineIndex).trim();
                    buffer = buffer.slice(lineIndex + 1);
                    if (line.startsWith('data: ')) {
                        const jsonStr = line.slice(6).trim();
                        if (jsonStr === '[DONE]') continue;
                        try {
                            const data = JSON.parse(jsonStr);
                            const delta = data?.choices?.[0]?.delta?.content || '';
                            if (delta) {
                                res.write(`data: ${JSON.stringify({ text: delta })}\n\n`);
                            }
                        } catch (e) {
                            console.error('Error parsing OpenAI SSE line:', e.message, 'Line:', line);
                        }
                    }
                }
            }
        } else {
            // Build conversation for Gemini
            const contents = [];

            // Add conversation history
            if (conversationHistory.length > 0) {
                for (const msg of conversationHistory.slice(-10)) { // Keep last 10 messages
                    contents.push({
                        role: msg.role === 'assistant' ? 'model' : 'user',
                        parts: [{ text: msg.content }]
                    });
                }
            }

            // Add current message
            contents.push({
                role: 'user',
                parts: [{ text: message }]
            });

            // Call Gemini API Stream
            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:streamGenerateContent?alt=sse&key=${apiKey}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        system_instruction: {
                            parts: [{ text: systemPrompt }]
                        },
                        contents,
                        generationConfig: {
                            temperature: 0.7,
                            topP: 0.95,
                            topK: 40,
                            maxOutputTokens: 4096,
                        }
                    })
                }
            );

            if (!response.ok) {
                const error = await response.json().catch(() => ({}));
                console.error('Gemini API Error:', error);
                res.write(`data: ${JSON.stringify({ error: error?.error?.message || 'Gemini streaming error' })}\n\n`);
                res.end();
                return;
            }

            const decoder = new TextDecoder();
            let buffer = '';
            for await (const chunk of response.body) {
                buffer += decoder.decode(chunk, { stream: true });
                let lineIndex;
                while ((lineIndex = buffer.indexOf('\n')) !== -1) {
                    const line = buffer.slice(0, lineIndex).trim();
                    buffer = buffer.slice(lineIndex + 1);
                    if (line.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(line.slice(6));
                            const delta = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
                            if (delta) {
                                res.write(`data: ${JSON.stringify({ text: delta })}\n\n`);
                            }
                        } catch (e) {
                            console.error('Error parsing Gemini SSE line:', e.message, 'Line:', line);
                        }
                    }
                }
            }
        }

        // Send final chunk with snapshot and done signal
        res.write(`data: ${JSON.stringify({ done: true, dataSnapshot: snapshot })}\n\n`);
        res.end();

    } catch (error) {
        console.error('AI Assistant Error:', error);
        // If headers are already sent, we write SSE error message, otherwise send 500
        if (res.headersSent) {
            res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
            res.end();
        } else {
            res.status(500).json({ message: 'Failed to process AI request', error: error.message });
        }
    }
});

// ── Quick Insights Endpoint ──────────────────────────────────────────────────
router.get('/insights', protect, authorize('owner', 'admin'), async (req, res) => {
    try {
        const crmData = await gatherCRMData();

        const insights = [];

        // Financial insights
        if (crmData.summary.netProfit < 0) {
            insights.push({ type: 'danger', icon: '🔴', title: 'Negative Profit', message: `Your expenses (₹${crmData.summary.totalExpenses.toLocaleString('en-IN')}) exceed revenue (₹${crmData.summary.totalRevenue.toLocaleString('en-IN')}). Net loss: ₹${Math.abs(crmData.summary.netProfit).toLocaleString('en-IN')}` });
        }
        if (crmData.summary.overdueAmount > 0) {
            insights.push({ type: 'warning', icon: '⚠️', title: 'Overdue Invoices', message: `₹${crmData.summary.overdueAmount.toLocaleString('en-IN')} in overdue invoices. Follow up immediately!` });
        }
        if (crmData.summary.pendingAmount > 0) {
            insights.push({ type: 'info', icon: '💰', title: 'Pending Collections', message: `₹${crmData.summary.pendingAmount.toLocaleString('en-IN')} pending in invoices` });
        }

        // Task insights
        if (crmData.tasks.overdue > 0) {
            insights.push({ type: 'warning', icon: '📋', title: 'Overdue Tasks', message: `${crmData.tasks.overdue} tasks are overdue. Assign or reschedule them.` });
        }

        // Lead insights
        if (crmData.leads.new > 0) {
            insights.push({ type: 'info', icon: '🎯', title: 'New Leads', message: `${crmData.leads.new} new leads waiting for follow-up` });
        }

        // Ticket insights
        if (crmData.tickets.open > 0) {
            insights.push({ type: 'info', icon: '🎫', title: 'Open Tickets', message: `${crmData.tickets.open} support tickets need attention` });
        }

        // Positive insights
        if (crmData.projects.completed > 0) {
            insights.push({ type: 'success', icon: '✅', title: 'Projects Completed', message: `${crmData.projects.completed} of ${crmData.projects.total} projects completed successfully` });
        }

        res.json({
            insights,
            summary: crmData.summary,
            projects: crmData.projects,
            tasks: { total: crmData.tasks.total, open: crmData.tasks.open, overdue: crmData.tasks.overdue },
            leads: { total: crmData.leads.total, new: crmData.leads.new, conversionRate: crmData.leads.conversionRate },
        });
    } catch (error) {
        console.error('Insights Error:', error);
        res.status(500).json({ message: 'Failed to generate insights', error: error.message });
    }
});

module.exports = router;
