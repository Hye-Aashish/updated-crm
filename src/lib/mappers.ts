import { Project, Client, Task, User, Invoice, Expense, Lead } from '@/types';

export const mapProject = (p: any): Project => {
    if (!p) return {} as Project;
    return {
        id: p._id || p.id,
        _id: p._id || p.id,
        name: p.name,
        description: p.description,
        clientId: p.clientId,
        clientProductId: p.clientProductId,
        status: p.status,
        health: p.health || 'green',
        deadline: p.dueDate || p.deadline ? new Date(p.dueDate || p.deadline) : new Date(),
        dueDate: p.dueDate || p.deadline ? new Date(p.dueDate || p.deadline) : new Date(),
        budget: p.budget || 0,
        advanceAmount: p.advanceAmount || 0,
        milestoneAmount: p.milestoneAmount || 0,
        finalAmount: p.finalAmount || 0,
        paymentStatus: p.paymentStatus || 'pending',
        type: p.type || 'custom',
        paymentModel: p.paymentModel || 'milestone',
        progress: p.progress || 0,
        startDate: p.startDate ? new Date(p.startDate) : new Date(),
        pmId: p.pmId || 'u2',
        members: p.members || [],
        developers: p.developers || [],
        designers: p.designers || [],
        priority: p.priority || 'medium',
        autoInvoice: p.autoInvoice || false,

        // Deliverables
        websiteRequired: p.websiteRequired || false,
        websiteStatus: p.websiteStatus || 'not-started',
        domain: p.domain,
        websiteUrl: p.websiteUrl,
        stagingUrl: p.stagingUrl,
        productionUrl: p.productionUrl,

        androidRequired: p.androidRequired || false,
        androidStatus: p.androidStatus || 'not-started',
        androidAppUrl: p.androidAppUrl,
        androidVersion: p.androidVersion,
        androidBuildNumber: p.androidBuildNumber,

        iosRequired: p.iosRequired || false,
        iosStatus: p.iosStatus || 'not-started',
        iosAppUrl: p.iosAppUrl,
        iosVersion: p.iosVersion,
        iosBuildNumber: p.iosBuildNumber,

        adminPanelRequired: p.adminPanelRequired || false,
        apiRequired: p.apiRequired || false,
        hostingRequired: p.hostingRequired || false,
        maintenanceRequired: p.maintenanceRequired || false,

        // Client Communication
        lastClientUpdate: p.lastClientUpdate ? new Date(p.lastClientUpdate) : undefined,
        lastCallDate: p.lastCallDate ? new Date(p.lastCallDate) : undefined,
        lastWhatsAppDate: p.lastWhatsAppDate ? new Date(p.lastWhatsAppDate) : undefined,
        lastEmailDate: p.lastEmailDate ? new Date(p.lastEmailDate) : undefined,
        clientResponse: p.clientResponse,
        nextFollowUpDate: p.nextFollowUpDate ? new Date(p.nextFollowUpDate) : undefined,
        followUpNotes: p.followUpNotes,

        // Handover & Approval
        sourceCodeHandover: p.sourceCodeHandover || false,
        credentialsHandover: p.credentialsHandover || false,
        documentationHandover: p.documentationHandover || false,
        clientApproved: p.clientApproved || false,

        milestones: (p.milestones || []).map((m: any, i: number) => ({
            ...m,
            id: m._id ? m._id.toString() : (m.id || `m_${i}`),
            _id: m._id ? m._id.toString() : m.id
        })),
        createdAt: p.createdAt ? new Date(p.createdAt) : new Date(),
        updatedAt: p.updatedAt || p.createdAt ? new Date(p.updatedAt || p.createdAt) : new Date(),
        notes: p.notes ? p.notes.map((n: any) => ({
            _id: n._id,
            text: n.text,
            createdBy: n.createdBy,
            creatorName: n.creatorName,
            createdAt: new Date(n.createdAt)
        })) : [],
        credentials: p.credentials ? p.credentials.map((c: any) => ({
            _id: c._id,
            title: c.title,
            type: c.type,
            url: c.url,
            username: c.username,
            password: c.password,
            createdBy: c.createdBy,
            createdAt: new Date(c.createdAt)
        })) : []
    }
};

export const mapClient = (c: any): Client => ({
    id: c._id || c.id,
    name: c.name,
    company: c.company,
    email: c.email,
    phone: c.phone,
    address: c.address,
    type: c.type,
    status: c.status,
    industry: c.industry,
    city: c.city,
    website: c.website,
    gstNumber: c.gstNumber,
    leadSource: c.leadSource,
    notes: c.notes,
    createdAt: new Date(c.createdAt),
    updatedAt: new Date(c.updatedAt || c.createdAt),
});

export const mapTask = (t: any): Task => {
    if (!t) return {} as Task;
    return {
        id: t._id || t.id,
        title: t.title,
        description: t.description,
        projectId: t.projectId,
        status: t.status,
        priority: t.priority,
        assigneeId: t.assigneeId,
        dueDate: t.dueDate ? new Date(t.dueDate) : new Date(),
        estimatedHours: t.estimatedHours,
        labels: t.labels || [],
        checklist: t.checklist || [],
        totalTimeSpent: t.totalTimeSpent,
        lastStartTime: t.lastStartTime,
        isTimerRunning: t.isTimerRunning,
        timeEntryId: t.timeEntryId,
        createdAt: t.createdAt ? new Date(t.createdAt) : new Date(),
        updatedAt: t.updatedAt || t.createdAt ? new Date(t.updatedAt || t.createdAt) : new Date(),
    }
};

export const mapUser = (u: any): User => ({
    id: u._id || u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    avatar: u.avatar,
    phone: u.phone,
    designation: u.designation,
    department: u.department,
    createdAt: new Date(u.createdAt),
});

export const mapInvoice = (i: any): Invoice => {
    if (!i) return {} as Invoice;
    return {
        id: i._id || i.id,
        invoiceNumber: i.invoiceNumber,
        number: i.invoiceNumber,
        clientId: i.clientId,
        projectId: i.projectId,
        type: i.type,
        status: i.status,
        lineItems: i.lineItems || [],
        subtotal: i.subtotal || 0,
        tax: i.tax || 0,
        total: i.total || 0,
        billingInfo: i.billingInfo,
        currency: i.currency || 'INR',
        date: i.date ? new Date(i.date) : new Date(),
        dueDate: i.dueDate ? new Date(i.dueDate) : new Date(),
        paidDate: i.paidDate ? new Date(i.paidDate) : undefined,
        createdAt: i.createdAt ? new Date(i.createdAt) : new Date(),
        updatedAt: i.updatedAt || i.createdAt ? new Date(i.updatedAt || i.createdAt) : new Date(),
    }
};

export const mapExpense = (e: any): Expense => ({
    id: e._id || e.id,
    date: new Date(e.date),
    amount: e.amount || 0,
    category: e.category,
    paymentMode: e.paymentMode,
    paidBy: e.paidBy,
    note: e.note,
    receipt: e.receipt,
    createdAt: new Date(e.createdAt),
});

export const mapLead = (l: any): Lead => {
    if (!l) return {} as Lead;
    return {
        id: l._id || l.id,
        _id: l._id || l.id,
        name: l.name,
        company: l.company,
        value: l.value || 0,
        source: l.source || 'Direct',
        stage: l.stage,
        email: l.email,
        phone: l.phone,
        project: l.project,
        rating: l.rating,
        assignedTo: l.assignedTo,
        lastFollowUpDate: l.lastFollowUpDate ? new Date(l.lastFollowUpDate) : undefined,
        lastFollowUpOutcome: l.lastFollowUpOutcome,
        lastNote: l.lastNote,
        customFields: l.customFields || {},
        activities: l.activities || [],
        reminder: l.reminder,
        tags: l.tags || [],
        aiPriority: l.aiPriority || 'red',
        aiPriorityReason: l.aiPriorityReason || 'No interaction history.',
        createdAt: l.createdAt ? new Date(l.createdAt) : new Date(),
        updatedAt: l.updatedAt || l.createdAt ? new Date(l.updatedAt || l.createdAt) : new Date(),
    }
};
