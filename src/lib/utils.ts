import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

import { useAppStore } from '@/store'

export function formatCurrency(amount: number): string {
    const currency = useAppStore.getState().settings?.companyProfile?.currency || 'INR'
    
    let locale = 'en-US'
    if (currency === 'INR') {
        locale = 'en-IN'
    } else if (currency === 'EUR') {
        locale = 'de-DE'
    } else if (currency === 'GBP') {
        locale = 'en-GB'
    } else if (currency === 'JPY') {
        locale = 'ja-JP'
    } else if (currency === 'CNY') {
        locale = 'zh-CN'
    } else if (currency === 'CAD') {
        locale = 'en-CA'
    } else if (currency === 'AUD') {
        locale = 'en-AU'
    } else if (currency === 'SGD') {
        locale = 'en-SG'
    } else if (currency === 'NZD') {
        locale = 'en-NZ'
    }

    return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: currency,
        maximumFractionDigits: 0,
    }).format(amount)
}

export function getCurrencySymbol(): string {
    const currency = useAppStore.getState().settings?.companyProfile?.currency || 'INR'
    const symbols: Record<string, string> = {
        INR: '₹',
        USD: '$',
        EUR: '€',
        GBP: '£',
        JPY: '¥',
        CNY: '¥',
        CAD: 'CA$',
        AUD: 'A$',
        SGD: 'S$',
        NZD: 'NZ$',
    }
    return symbols[currency] || currency
}

export function formatDate(date: Date | string): string {
    return new Intl.DateTimeFormat('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    }).format(new Date(date))
}

export function formatDateTime(date: Date | string): string {
    return new Intl.DateTimeFormat('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(new Date(date))
}

export function getInitials(name: string): string {
    return name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
}

export function calculateProgress(completed: number, total: number): number {
    if (total === 0) return 0
    return Math.round((completed / total) * 100)
}
