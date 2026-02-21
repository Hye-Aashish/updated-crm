import { Project, Client, Task, User, Invoice, Expense, Lead } from '@/types';

export const mapProject = (p: any): Project => {
    if (!p) return {} as Project;
    return {
        id: p._id || p.id,
        name: p.name,
        description: p.description,
        clientId: p.clientId,
        status: p.status,
        deadline: p.dueDate || p.deadline ? new Date(p.dueDate || p.deadline) : new Date(),
        dueDate: p.dueDate || p.deadline ? new Date(p.dueDate || p.deadline) : new Date(),
        budget: p.budget || 0,
        type: p.type,
        paymentModel: p.paymentModel,
        progress: p.progress || 0,
        startDate: p.startDate ? new Date(p.startDate) : new Date(),
        milestones: p.milestones || [],
        pmId: p.pmId || 'u2',
        members: p.members || [],
        priority: p.priority,
        createdAt: p.createdAt ? new Date(p.createdAt) : new Date(),
        updatedAt: p.updatedAt || p.createdAt ? new Date(p.updatedAt || p.createdAt) : new Date(),
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
        name: l.name,
        company: l.company,
        value: l.value || 0,
        source: l.source,
        stage: l.stage,
        email: l.email,
        phone: l.phone,
        customFields: l.customFields || {},
        activities: l.activities || [],
        reminder: l.reminder,
        createdAt: l.createdAt ? new Date(l.createdAt) : new Date(),
        updatedAt: l.updatedAt || l.createdAt ? new Date(l.updatedAt || l.createdAt) : new Date(),
    }
};
