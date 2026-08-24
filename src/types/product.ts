import type { Milestone } from './index'

// Product & Client Product Types

export interface Product {
    id: string
    _id?: string
    name: string
    description?: string
    features: string[]
    basePrice: number
    status: 'active' | 'inactive'
    createdAt?: Date | string
    updatedAt?: Date | string
}

export interface ClientProductTask {
    id?: string
    _id?: string
    title: string
    description?: string
    status: 'pending' | 'in_progress' | 'completed'
    dueDate?: string | Date
    completedAt?: string | Date
    assignedTo?: any
    createdAt?: string | Date
}

export interface ClientProductPayment {
    id?: string
    _id?: string
    amount: number
    date: string | Date
    paymentMethod?: string
    reference?: string
    notes?: string
    recordedBy?: any
    createdAt?: string | Date
}

export interface ClientProduct {
    id: string
    _id?: string
    client: string | any
    product: string | Product
    customPrice: number
    paidAmount?: number
    paymentStatus?: 'unpaid' | 'partial' | 'paid' | 'overdue'
    workStatus?: 'not_started' | 'in_progress' | 'review' | 'completed' | 'on_hold'
    progress?: number
    startDate?: string | Date
    dueDate?: string | Date
    assignedTo?: any[]
    customizations?: string
    tasks?: ClientProductTask[]
    milestones?: Milestone[]
    paymentHistory?: ClientProductPayment[]
    status: 'active' | 'cancelled' | 'suspended' | 'completed'
    assignedAt?: string | Date
    updatedAt?: string | Date
}
