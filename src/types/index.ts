export type UserRole = 'owner' | 'admin' | 'pm' | 'developer' | 'employee' | 'client'

export interface User {
    id: string
    _id?: string
    name: string
    email: string
    role: UserRole
    avatar?: string
    phone?: string

    // Extended Profile
    employeeId?: string
    salutation?: string
    designation?: string
    department?: string
    country?: string
    gender?: string
    dateOfBirth?: Date | string
    joiningDate?: Date | string
    reportingTo?: string
    language?: string
    address?: string
    about?: string

    // KYC
    aadharNumber?: string
    panNumber?: string
    documentAadhar?: string
    documentPan?: string
    documentOfferLetter?: string
    salary?: string

    createdAt?: Date
}

// Client Types
export type ClientType = 'one-time' | 'retainer'
export type ClientStatus = 'active' | 'inactive' | 'new' | 'in-discussion' | 'confirmed' | 'on-hold' | 'closed'

export interface Client {
    id: string
    name: string
    company: string
    email: string
    phone: string
    address?: string
    type: ClientType
    status: ClientStatus

    // Extended fields
    industry?: string
    city?: string
    website?: string
    gstNumber?: string
    leadSource?: string
    budget?: string
    paymentModel?: string
    deadline?: Date
    assignedTo?: string
    followUpDate?: Date
    services?: string[] // Added

    notes?: string
    createdAt: Date
    updatedAt: Date
}

// Project Types
export type ProjectType = 'website' | 'web-app' | 'ecommerce' | 'landing' | 'maintenance'
export type ProjectStatus = 'planning' | 'in-progress' | 'review' | 'completed' | 'on-hold'
export type PaymentModel = 'advance' | 'milestone' | 'retainer'

export interface Milestone {
    id: string
    name: string
    dueDate: Date
    amount: number
    percentage: number
    completed: boolean
    completedAt?: Date
}

export interface Project {
    id: string
    name: string
    clientId: string
    type: ProjectType
    status: ProjectStatus
    startDate: Date
    deadline: Date
    dueDate: Date // Alias for deadline
    budget: number
    paymentModel: PaymentModel
    description: string
    milestones: Milestone[]
    pmId: string
    members: string[] // Added for multi-user assignment
    priority?: 'low' | 'medium' | 'high' | 'urgent' // Added
    progress?: number // Progress percentage 0-100
    autoInvoice?: boolean // Auto generate invoice on completion
    createdAt: Date
    updatedAt: Date
}

// Task Types
export type TaskStatus = 'todo' | 'in-progress' | 'review' | 'client-approval' | 'done'
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent'

export interface Checklist {
    id: string
    text: string
    completed: boolean
}

export interface Task {
    id: string
    title: string
    description: string
    projectId: string
    status: TaskStatus
    priority: TaskPriority
    assigneeId: string
    dueDate: Date
    estimatedHours: number
    labels: string[]
    attachments?: { // Added
        name: string
        fileType: string
        data: string
    }[]
    checklist: Checklist[]

    // Time Tracking
    totalTimeSpent?: number // in milliseconds
    lastStartTime?: number // timestamp
    isTimerRunning?: boolean

    createdAt: Date
    updatedAt: Date
}

// Time Tracking Types
export interface TimeEntry {
    id: string
    projectId: string
    taskId: string
    userId: string
    startTime: Date
    endTime?: Date
    duration: number // in minutes
    note: string
    createdAt: Date
}

// Invoice Types
export type InvoiceStatus = 'draft' | 'pending' | 'paid' | 'overdue'
export type InvoiceType = 'advance' | 'milestone' | 'final' | 'amc'

export interface InvoiceLineItem {
    id: string
    name: string
    quantity: number
    rate: number
    taxPercentage: number
}

export interface Invoice {
    id: string
    invoiceNumber: string
    number: string // Alias for invoiceNumber
    clientId: string
    projectId: string
    type: InvoiceType
    status: InvoiceStatus
    lineItems: InvoiceLineItem[]
    subtotal: number
    tax: number
    total: number
    date: Date // Invoice date
    dueDate: Date
    paidDate?: Date
    createdAt: Date
    updatedAt: Date
}

// Communication Log Types
export type CommunicationType = 'call' | 'whatsapp' | 'email' | 'meeting'

export interface CommunicationLog {
    id: string
    clientId: string
    type: CommunicationType
    summary: string
    nextFollowUp?: Date
    createdBy: string
    createdAt: Date
}

// File Types
export interface FileItem {
    id: string
    name: string
    type: string
    size: number
    url: string
    projectId?: string
    clientId?: string
    uploadedBy: string
    uploadedAt: Date
}

// Activity Log Types
export type ActivityType =
    | 'task_created'
    | 'task_updated'
    | 'status_changed'
    | 'timer_started'
    | 'timer_stopped'
    | 'invoice_created'
    | 'comment_added'
    | 'file_uploaded'

export interface Activity {
    id: string
    type: ActivityType
    userId: string
    projectId?: string
    taskId?: string
    description: string
    metadata?: Record<string, any>
    createdAt: Date
}

// Lead & Pipeline Types
export interface LeadActivity {
    _id: string
    content: string
    type: 'note' | 'call' | 'meeting' | 'email'
    createdAt: Date | string
}

export interface Lead {
    id: string
    name: string
    company: string
    value: number
    source: string
    stage: string
    email?: string
    phone?: string
    customFields?: Record<string, string>
    activities?: LeadActivity[]
    reminder?: {
        date: Date | string
        tone?: string
        completed?: boolean
    }
    createdAt?: Date
    updatedAt?: Date
}

export interface PipelineStage {
    id: string
    label: string
    color: string
    order?: number
}

export interface LeadFormField {
    id: string
    label: string
    type: string
    required: boolean
    placeholder?: string
    options?: string[]
}

export interface LeadForm {
    _id: string
    title: string
    description?: string
    fields: LeadFormField[]
    isActive: boolean
    createdAt: Date
}


// Notification Types
export interface Notification {
    id: string
    title: string
    message: string
    read: boolean
    link?: string
    createdAt: Date
}

export interface Expense {
    id: string
    date: Date
    amount: number
    category: string
    paymentMode: string
    paidBy: string
    note?: string
    receipt?: string
    createdAt?: Date
}
export interface Ticket {
    id: string
    _id?: string
    subject: string
    description: string
    priority: 'low' | 'medium' | 'high' | 'critical'
    status: 'open' | 'in-progress' | 'resolved' | 'closed'
    clientName: string
    assignedTo: string
    screenshot?: string
    createdAt: Date
}
