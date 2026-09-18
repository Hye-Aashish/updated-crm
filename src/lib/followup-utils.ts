import { isPast, isToday, differenceInDays, differenceInHours } from 'date-fns'
import type { Lead } from '@/types'

export type FollowUpStatus = 'overdue' | 'today' | 'future' | 'completed' | 'none'

export interface FollowUpInfo {
    status: FollowUpStatus
    label: string
    color: string
    badgeBg: string
    badgeText: string
    badgeBorder: string
    borderLeft: string
    cardBg: string
    overdueText?: string
    formattedTime?: string
    priorityRank: number
}

export function getLeadFollowUpInfo(reminder?: Lead['reminder'] | null): FollowUpInfo {
    if (!reminder?.date) {
        return {
            status: 'none',
            label: 'No Follow-up',
            color: 'text-muted-foreground',
            badgeBg: 'bg-muted/40',
            badgeText: 'text-muted-foreground',
            badgeBorder: 'border-muted-foreground/20',
            borderLeft: '',
            cardBg: '',
            priorityRank: 5
        }
    }

    if (reminder.completed) {
        return {
            status: 'completed',
            label: 'Follow-up Completed',
            color: 'text-emerald-600 dark:text-emerald-400',
            badgeBg: 'bg-emerald-500/10',
            badgeText: 'text-emerald-600 dark:text-emerald-400',
            badgeBorder: 'border-emerald-500/30',
            borderLeft: 'border-l-4 border-l-emerald-500',
            cardBg: '',
            priorityRank: 4
        }
    }

    const date = new Date(reminder.date)
    if (isNaN(date.getTime())) {
        return {
            status: 'none',
            label: 'No Follow-up',
            color: 'text-muted-foreground',
            badgeBg: 'bg-muted/40',
            badgeText: 'text-muted-foreground',
            badgeBorder: 'border-muted-foreground/20',
            borderLeft: '',
            cardBg: '',
            priorityRank: 5
        }
    }

    const now = new Date()

    if (isPast(date) && !isToday(date)) {
        // Missed / Overdue -> RED
        const days = differenceInDays(now, date)
        const hours = differenceInHours(now, date)
        const overdueText = days > 0 ? `Overdue by ${days} day${days > 1 ? 's' : ''}` : `Overdue by ${hours} hr${hours > 1 ? 's' : ''}`

        return {
            status: 'overdue',
            label: 'Follow-up Overdue',
            color: 'text-red-600 dark:text-red-400',
            badgeBg: 'bg-red-500/15',
            badgeText: 'text-red-600 dark:text-red-300',
            badgeBorder: 'border-red-500/30',
            borderLeft: 'border-l-4 border-l-red-500',
            cardBg: 'bg-red-500/[0.04]',
            overdueText,
            priorityRank: 1
        }
    } else if (isToday(date)) {
        // Today -> ORANGE / AMBER
        return {
            status: 'today',
            label: 'Follow-up Due Today',
            color: 'text-amber-600 dark:text-amber-400',
            badgeBg: 'bg-amber-500/15',
            badgeText: 'text-amber-600 dark:text-amber-300',
            badgeBorder: 'border-amber-500/30',
            borderLeft: 'border-l-4 border-l-amber-500',
            cardBg: 'bg-amber-500/[0.04]',
            priorityRank: 2
        }
    } else {
        // Future / Upcoming -> GREEN
        return {
            status: 'future',
            label: 'Upcoming Follow-up',
            color: 'text-emerald-600 dark:text-emerald-400',
            badgeBg: 'bg-emerald-500/15',
            badgeText: 'text-emerald-600 dark:text-emerald-300',
            badgeBorder: 'border-emerald-500/30',
            borderLeft: 'border-l-4 border-l-emerald-500',
            cardBg: 'bg-emerald-500/[0.03]',
            priorityRank: 3
        }
    }
}

/**
 * Sorts leads dynamically in 4 priority tiers:
 * Tier 1: Overdue (Oldest overdue first)
 * Tier 2: Today (Earliest follow-up time first)
 * Tier 3: Upcoming (Nearest upcoming date first)
 * Tier 4: No Follow-up / Completed (Most recent update/created first)
 */
export function sortLeadsByFollowUpPriority(leads: Lead[]): Lead[] {
    return [...leads].sort((a, b) => {
        const infoA = getLeadFollowUpInfo(a.reminder)
        const infoB = getLeadFollowUpInfo(b.reminder)

        if (infoA.priorityRank !== infoB.priorityRank) {
            return infoA.priorityRank - infoB.priorityRank
        }

        const dateA = a.reminder?.date ? new Date(a.reminder.date).getTime() : 0
        const dateB = b.reminder?.date ? new Date(b.reminder.date).getTime() : 0

        if (infoA.status === 'overdue') {
            // Oldest overdue date first
            return dateA - dateB
        } else if (infoA.status === 'today') {
            // Earliest time today first
            return dateA - dateB
        } else if (infoA.status === 'future') {
            // Nearest upcoming date first
            return dateA - dateB
        } else {
            // No follow-up: Newest created/updated first
            const createdA = a.createdAt ? new Date(a.createdAt).getTime() : 0
            const createdB = b.createdAt ? new Date(b.createdAt).getTime() : 0
            return createdB - createdA
        }
    })
}
