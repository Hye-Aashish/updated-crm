import { create } from 'zustand'
import api from '@/lib/api-client'
import type {
    User,
    Client,
    Project,
    Task,
    TimeEntry,
    Invoice,
    CommunicationLog,
    FileItem,
    Activity,
    Notification,
    Lead,
    Expense,
    Ticket,
} from '@/types'

interface AppState {
    // Current user
    currentUser: User

    // Data
    users: User[]
    clients: Client[]
    projects: Project[]
    tasks: Task[]
    timeEntries: TimeEntry[]
    invoices: Invoice[]
    communicationLogs: CommunicationLog[]
    files: FileItem[]
    activities: Activity[]
    notifications: Notification[]
    leads: Lead[]
    expenses: Expense[]
    tickets: Ticket[]


    // Running timer
    runningTimer: {
        projectId: string
        taskId: string
        startTime: Date
    } | null

    // Actions
    setCurrentUser: (user: User) => void
    setUsers: (users: User[]) => void // Add setUsers action

    // Client actions
    setLeads: (leads: Lead[]) => void
    setClients: (clients: Client[]) => void

    addClient: (client: Client) => void
    updateClient: (id: string, client: Partial<Client>) => void
    deleteClient: (id: string) => void

    // Project actions
    setProjects: (projects: Project[]) => void
    addProject: (project: Project) => void
    updateProject: (id: string, project: Partial<Project>) => void
    deleteProject: (id: string) => void

    // Task actions
    setTasks: (tasks: Task[]) => void // Added
    addTask: (task: Task) => void
    updateTask: (id: string, task: Partial<Task>) => void
    deleteTask: (id: string) => void

    // Time tracking actions
    setTimeEntries: (entries: TimeEntry[]) => void // Added
    startTimer: (projectId: string, taskId: string) => void
    stopTimer: (note: string) => void
    addTimeEntry: (entry: TimeEntry) => void

    // Invoice actions
    setInvoices: (invoices: Invoice[]) => void
    addInvoice: (invoice: Invoice) => void
    updateInvoice: (id: string, invoice: Partial<Invoice>) => void
    deleteInvoice: (id: string) => void

    // Expense actions
    setExpenses: (expenses: Expense[]) => void
    addExpense: (expense: Expense) => void

    // Communication log actions
    addCommunicationLog: (log: CommunicationLog) => void

    // File actions
    setFiles: (files: FileItem[]) => void
    addFile: (file: FileItem) => void
    deleteFile: (id: string) => void

    // Activity actions
    addActivity: (activity: Activity) => void

    // Notification actions
    setNotifications: (notifications: Notification[]) => void
    markNotificationRead: (id: string) => Promise<void>
    markAllNotificationsRead: () => Promise<void>
    addNotification: (notification: Notification) => void

    // Ticket actions
    setTickets: (tickets: Ticket[]) => void
    addTicket: (ticket: Ticket) => void
}

export const useAppStore = create<AppState>((set) => ({
    // Initial state with data transformations
    currentUser: null as any,
    users: [], // Initialize empty
    clients: [],
    projects: [],
    tasks: [],
    timeEntries: [],
    invoices: [],
    communicationLogs: [],
    files: [],
    activities: [],
    notifications: [],
    leads: [],
    expenses: [],
    tickets: [],
    runningTimer: null,


    // Actions
    setCurrentUser: (user) => set({ currentUser: user }),
    setUsers: (users) => set({ users }), // Implementation

    // Client actions
    setLeads: (leads) => set({ leads }),
    setClients: (clients) => set({ clients }),


    addClient: (client) => set((state) => ({
        clients: [...state.clients, client],
    })),

    updateClient: (id, updates) => set((state) => ({
        clients: state.clients.map((c) =>
            c.id === id ? { ...c, ...updates, updatedAt: new Date() } : c
        ),
    })),

    deleteClient: (id) => set((state) => ({
        clients: state.clients.filter((c) => c.id !== id),
    })),

    // Project actions
    setProjects: (projects) => set({ projects }),

    addProject: (project) => set((state) => ({
        projects: [...state.projects, project],
        activities: [
            {
                id: `a${Date.now()}`,
                type: 'task_created',
                userId: state.currentUser.id,
                projectId: project.id,
                description: `Created project "${project.name}"`,
                createdAt: new Date(),
            },
            ...state.activities,
        ],
    })),

    updateProject: (id, updates) => set((state) => ({
        projects: state.projects.map((p) =>
            p.id === id ? { ...p, ...updates, updatedAt: new Date() } : p
        ),
    })),

    deleteProject: (id) => set((state) => ({
        projects: state.projects.filter((p) => p.id !== id),
    })),

    // Task actions
    setTasks: (tasks) => set({ tasks }),
    addTask: (task) => set((state) => ({
        tasks: [...state.tasks, task],
        activities: [
            {
                id: `a${Date.now()}`,
                type: 'task_created',
                userId: state.currentUser.id,
                projectId: task.projectId,
                taskId: task.id,
                description: `Created task "${task.title}"`,
                createdAt: new Date(),
            },
            ...state.activities,
        ],
    })),

    updateTask: (id, updates) => set((state) => {
        const task = state.tasks.find((t) => t.id === id)
        const newActivities = []

        // Add activity if status changed
        if (updates.status && task && updates.status !== task.status) {
            newActivities.push({
                id: `a${Date.now()}`,
                type: 'status_changed' as const,
                userId: state.currentUser.id,
                projectId: task.projectId,
                taskId: id,
                description: `Changed status from "${task.status}" to "${updates.status}"`,
                metadata: { from: task.status, to: updates.status },
                createdAt: new Date(),
            })
        }

        return {
            tasks: state.tasks.map((t) =>
                t.id === id ? { ...t, ...updates, updatedAt: new Date() } : t
            ),
            activities: [...newActivities, ...state.activities],
        }
    }),

    deleteTask: (id) => set((state) => ({
        tasks: state.tasks.filter((t) => t.id !== id),
    })),

    // Time tracking actions
    setTimeEntries: (timeEntries) => set({ timeEntries }),
    startTimer: (projectId, taskId) => set((state) => ({
        runningTimer: {
            projectId,
            taskId,
            startTime: new Date(),
        },
        activities: [
            {
                id: `a${Date.now()}`,
                type: 'timer_started',
                userId: state.currentUser.id,
                projectId,
                taskId,
                description: `Started timer`,
                createdAt: new Date(),
            },
            ...state.activities,
        ],
    })),

    stopTimer: (note) => set((state) => {
        if (!state.runningTimer) return state

        const duration = Math.floor(
            (new Date().getTime() - state.runningTimer.startTime.getTime()) / 60000
        )

        const timeEntry: TimeEntry = {
            id: `te${Date.now()}`,
            projectId: state.runningTimer.projectId,
            taskId: state.runningTimer.taskId,
            userId: state.currentUser.id,
            startTime: state.runningTimer.startTime,
            endTime: new Date(),
            duration,
            note,
            createdAt: new Date(),
        }

        return {
            runningTimer: null,
            timeEntries: [...state.timeEntries, timeEntry],
            activities: [
                {
                    id: `a${Date.now()}`,
                    type: 'timer_stopped',
                    userId: state.currentUser.id,
                    projectId: state.runningTimer.projectId,
                    taskId: state.runningTimer.taskId,
                    description: `Stopped timer (${duration} minutes)`,
                    createdAt: new Date(),
                },
                ...state.activities,
            ],
        }
    }),

    addTimeEntry: (entry) => set((state) => ({
        timeEntries: [...state.timeEntries, entry],
    })),

    // Invoice actions
    setInvoices: (invoices) => set({ invoices }),
    addInvoice: (invoice) => set((state) => ({
        invoices: [...state.invoices, invoice],
        activities: [
            {
                id: `a${Date.now()}`,
                type: 'invoice_created',
                userId: state.currentUser.id,
                projectId: invoice.projectId,
                description: `Created invoice ${invoice.invoiceNumber}`,
                metadata: { invoiceId: invoice.id, amount: invoice.total },
                createdAt: new Date(),
            },
            ...state.activities,
        ],
    })),

    updateInvoice: (id, updates) => set((state) => ({
        invoices: state.invoices.map((i) =>
            i.id === id ? { ...i, ...updates, updatedAt: new Date() } : i
        ),
    })),

    deleteInvoice: (id) => set((state) => ({
        invoices: state.invoices.filter((i) => i.id !== id),
    })),

    // Expense actions
    setExpenses: (expenses) => set({ expenses }),
    addExpense: (expense) => set((state) => ({
        expenses: [expense, ...state.expenses],
    })),

    // Communication log actions
    addCommunicationLog: (log) => set((state) => ({
        communicationLogs: [...state.communicationLogs, log],
    })),

    // File actions
    setFiles: (files) => set({ files }),
    addFile: (file) => set((state) => ({
        files: [...state.files, file],
        activities: [
            {
                id: `a${Date.now()}`,
                type: 'file_uploaded',
                userId: state.currentUser.id,
                projectId: file.projectId,
                description: `Uploaded file "${file.name}"`,
                createdAt: new Date(),
            },
            ...state.activities,
        ],
    })),

    deleteFile: (id) => set((state) => ({
        files: state.files.filter((f) => f.id !== id),
    })),

    // Activity actions
    addActivity: (activity) => set((state) => ({
        activities: [activity, ...state.activities],
    })),

    // Notification actions
    setNotifications: (notifications) => set({ notifications }),

    markNotificationRead: async (id) => {
        try {
            await api.put(`/notifications/${id}/read`)
            set((state) => ({
                notifications: state.notifications.map((n) =>
                    n.id === id ? { ...n, read: true } : n
                ),
            }))
        } catch (err) { console.error(err) }
    },

    markAllNotificationsRead: async () => {
        try {
            await api.put('/notifications/mark-all-read')
            set((state) => ({
                notifications: state.notifications.map((n) => ({ ...n, read: true })),
            }))
        } catch (err) { console.error(err) }
    },

    addNotification: (notification) => set((state) => ({
        notifications: [notification, ...state.notifications],
    })),

    // Ticket actions
    setTickets: (tickets) => set({ tickets }),
    addTicket: (ticket) => set((state) => ({
        tickets: [...state.tickets, ticket],
    })),
}))
