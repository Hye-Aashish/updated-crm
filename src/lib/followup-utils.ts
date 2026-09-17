import { isPast, isToday } from 'date-fns'
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
            cardBg: ''
        }
    }

    if (reminder.completed) {
        return {
            status: 'completed',
            label: 'Completed',
            color: 'text-emerald-600 dark:text-emerald-400',
            badgeBg: 'bg-emerald-500/10',
            badgeText: 'text-emerald-600 dark:text-emerald-400',
            badgeBorder: 'border-emerald-500/30',
            borderLeft: 'border-l-4 border-l-emerald-500',
            cardBg: ''
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
            cardBg: ''
        }
    }

    if (isPast(date) && !isToday(date)) {
        // Missed / Overdue -> RED
        return {
            status: 'overdue',
            label: 'Missed Follow-up',
            color: 'text-red-600 dark:text-red-400',
            badgeBg: 'bg-red-500/15',
            badgeText: 'text-red-600 dark:text-red-300',
            badgeBorder: 'border-red-500/30',
            borderLeft: 'border-l-4 border-l-red-500',
            cardBg: 'bg-red-500/[0.03]'
        }
    } else if (isToday(date)) {
        // Today -> YELLOW / AMBER
        return {
            status: 'today',
            label: "Today's Follow-up",
            color: 'text-amber-600 dark:text-amber-400',
            badgeBg: 'bg-amber-500/15',
            badgeText: 'text-amber-600 dark:text-amber-300',
            badgeBorder: 'border-amber-500/30',
            borderLeft: 'border-l-4 border-l-amber-500',
            cardBg: 'bg-amber-500/[0.03]'
        }
    } else {
        // Future -> GREEN
        return {
            status: 'future',
            label: 'Future Follow-up',
            color: 'text-emerald-600 dark:text-emerald-400',
            badgeBg: 'bg-emerald-500/15',
            badgeText: 'text-emerald-600 dark:text-emerald-300',
            badgeBorder: 'border-emerald-500/30',
            borderLeft: 'border-l-4 border-l-emerald-500',
            cardBg: 'bg-emerald-500/[0.03]'
        }
    }
}
