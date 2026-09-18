export type UserRole = 'owner' | 'admin' | 'pm' | 'developer' | 'employee' | 'client'

export interface User {
    id: string
    _id?: string
    name: string
    email: string
    role: UserRole
    avatar?: string
    phone?: string
    clientId?: string

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
export type ProjectType = 'website' | 'web-app' | 'mobile-app' | 'lms' | 'crm-erp' | 'ecommerce' | 'maintenance' | 'digital-product' | 'custom'
export type ProjectStatus = 'planning' | 'in-progress' | 'review' | 'completed' | 'on-hold'
export type ProjectHealth = 'green' | 'yellow' | 'red' | 'blue' | 'completed'
export type PaymentModel = 'advance' | 'milestone' | 'retainer'

export interface Milestone {
    id?: string
    _id?: string
    name: string
    description?: string
    dueDate?: Date | string
    amount: number
    percentage?: number
    completed: boolean
    status?: 'pending' | 'in-progress' | 'completed'
    paidAmount?: number
    paymentStatus?: 'unpaid' | 'partial' | 'paid'
    paidDate?: Date | string
    paymentMethod?: string
    paymentReference?: string
    paymentNotes?: string
    invoiceId?: string
    completedAt?: Date | string
}

export interface ProjectNote {
    _id: string
    text: string
    createdBy: string
    creatorName: string
    createdAt: Date
}

export interface ProjectCredential {
    _id: string
    title: string
    type: string
    url?: string
    username: string
    password?: string
    createdBy: string
    createdAt: Date
}

export interface ProjectCheckpoint {
    id?: string
    _id?: string
    projectId: string
    phase: string
    phaseOrder?: number
    title: string
    description?: string
    order?: number
    assignedTo?: string
    assignedRole?: string
    startDate?: Date | string
    dueDate?: Date | string
    completionDate?: Date | string
    status: 'not_started' | 'in_progress' | 'blocked' | 'pending_review' | 'completed' | 'rejected' | 'overdue'
    isMandatory: boolean
    priority: 'low' | 'medium' | 'high' | 'urgent'
    proofRequired?: boolean
    proofType?: 'url' | 'build_file' | 'version' | 'transaction_ref' | 'screenshot' | 'any'
    proofUrl?: string
    proofFile?: string
    proofVersion?: string
    proofRef?: string
    remarks?: string
    dependencies?: (ProjectCheckpoint | string)[]
    approvalRequired?: boolean
    approvedBy?: string
    approvedAt?: Date | string
    rejectionReason?: string
    createdAt?: Date | string
}

export interface ProjectBug {
    id?: string
    _id?: string
    projectId: string
    title: string
    description: string
    severity: 'critical' | 'high' | 'medium' | 'low'
    priority: 'low' | 'medium' | 'high' | 'urgent'
    assignedDeveloper?: string
    status: 'open' | 'in_progress' | 'fixed' | 'retest_required' | 'closed'
    attachment?: string
    resolution?: string
    createdBy: string
    createdAt: Date | string
}

export interface ProjectActivityLog {
    id?: string
    _id?: string
    projectId: string
    userId: string
    userName: string
    action: string
    description: string
    createdAt: Date | string
}

export interface ProjectFollowUpRecord {
    id?: string
    _id?: string
    projectId: string
    type: 'call' | 'whatsapp' | 'email' | 'meeting' | 'update'
    summary: string
    clientResponse?: string
    followUpDate: Date | string
    status: 'pending' | 'completed'
    createdBy: string
    createdAt: Date | string
}

export interface ProjectTemplatePhase {
    name: string
    order: number
    checkpoints: {
        title: string
        order: number
        defaultRole?: string
        defaultDurationDays?: number
        priority?: 'low' | 'medium' | 'high' | 'urgent'
        isMandatory?: boolean
        proofRequired?: boolean
        proofType?: 'url' | 'build_file' | 'version' | 'transaction_ref' | 'screenshot' | 'any'
        approvalRequired?: boolean
        dependencyIndices?: number[]
    }[]
}

export interface ProjectTemplate {
    id?: string
    _id?: string
    name: string
    projectType: string
    description?: string
    phases: ProjectTemplatePhase[]
    isSystemDefault?: boolean
}

export interface Project {
    id: string
    _id?: string
    name: string
    clientId: string
    clientProductId?: string
    type: ProjectType
    status: ProjectStatus
    health?: ProjectHealth
    startDate: Date
    deadline: Date
    dueDate: Date
    budget: number
    advanceAmount?: number
    milestoneAmount?: number
    finalAmount?: number
    paymentStatus?: 'paid' | 'partially-paid' | 'pending' | 'overdue'
    paymentModel: PaymentModel
    description: string
    milestones: Milestone[]
    pmId: string
    members: string[]
    developers?: string[]
    designers?: string[]
    priority?: 'low' | 'medium' | 'high' | 'urgent'
    progress?: number
    autoInvoice?: boolean
    notes?: ProjectNote[]
    credentials?: ProjectCredential[]

    // Deliverables
    websiteRequired?: boolean
    websiteStatus?: 'not-started' | 'development' | 'testing' | 'ready' | 'deployed' | 'live' | 'down'
    domain?: string
    websiteUrl?: string
    stagingUrl?: string
    productionUrl?: string

    androidRequired?: boolean
    androidStatus?: 'not-started' | 'development' | 'build-generated' | 'testing' | 'production-build' | 'submitted' | 'live'
    androidAppUrl?: string
    androidVersion?: string
    androidBuildNumber?: string

    iosRequired?: boolean
    iosStatus?: 'not-started' | 'development' | 'build-generated' | 'testing' | 'production-build' | 'submitted' | 'live'
    iosAppUrl?: string
    iosVersion?: string
    iosBuildNumber?: string

    adminPanelRequired?: boolean
    apiRequired?: boolean
    hostingRequired?: boolean
    maintenanceRequired?: boolean

    // Client Communication
    lastClientUpdate?: Date | string
    lastCallDate?: Date | string
    lastWhatsAppDate?: Date | string
    lastEmailDate?: Date | string
    clientResponse?: string
    nextFollowUpDate?: Date | string
    followUpNotes?: string

    // Handover & Approval
    sourceCodeHandover?: boolean
    credentialsHandover?: boolean
    documentationHandover?: boolean
    clientApproved?: boolean

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
    timeEntryId?: string

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
export type InvoiceStatus = 'draft' | 'pending' | 'paid' | 'overdue' | 'cancelled'
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
    projectId?: string
    clientProductId?: string
    type: InvoiceType
    status: InvoiceStatus
    lineItems: InvoiceLineItem[]
    subtotal: number
    tax: number
    total: number
    date: Date // Invoice date
    billingInfo?: {
        name?: string
        address?: string
        gstNumber?: string
    }
    currency?: string
    dueDate: Date
    paidDate?: Date
    termsAndConditions?: string
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
    _id?: string
    content: string
    type?: string
    outcome?: string
    nextFollowUpDate?: Date | string
    reminderMinutes?: number
    createdByName?: string
    createdAt: Date | string
}

export interface Lead {
    id: string
    _id?: string
    name: string
    company: string
    value: number
    source: string
    stage: string
    email?: string
    phone?: string
    project?: string
    rating?: number
    assignedTo?: string
    lastFollowUpDate?: Date | string
    lastFollowUpOutcome?: string
    lastNote?: string
    customFields?: Record<string, string>
    activities?: LeadActivity[]
    reminder?: {
        date: Date | string | null
        tone?: string
        completed?: boolean
        reminderMinutes?: number
    }
    tags?: string[]
    aiPriority?: 'red' | 'yellow' | 'green'
    aiPriorityReason?: string
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
    paidById?: string
    projectId?: string
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
    status: 'open' | 'in-progress' | 'resolved' | 'closed' | 'declined' | 'live' | 'need-discussion'
    discussionNote?: string
    clientName: string
    clientId?: string
    projectId?: string
    assignedTo: string
    screenshot?: string
    createdAt: Date
}

export * from './product'
