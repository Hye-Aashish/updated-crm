import { useEffect } from 'react'
import { useAppStore } from '@/store'
import { useToast } from '@/hooks/use-toast'
import api from '@/lib/api-client'
import { ensureNotificationPermission, showDesktopNotification } from '@/lib/notifications'

// Helper: Get & Save notified keys in localStorage to prevent repeat toasts across page refreshes
const getNotifiedKeys = (): Set<string> => {
    try {
        const saved = localStorage.getItem('crm_notified_toast_keys')
        return saved ? new Set(JSON.parse(saved)) : new Set()
    } catch {
        return new Set()
    }
}

const saveNotifiedKey = (key: string) => {
    try {
        const set = getNotifiedKeys()
        set.add(key)
        const keysArr = Array.from(set).slice(-400) // Keep last 400 keys max
        localStorage.setItem('crm_notified_toast_keys', JSON.stringify(keysArr))
    } catch (e) {
        console.error(e)
    }
}

async function pingDesktop(title: string, body: string, tag?: string) {
    await showDesktopNotification({ title, body, tag })
}

export function ReminderManager() {
    const { leads, notifications, addNotification } = useAppStore()
    const { toast } = useToast()

    // Ask OS for notification permission once (Windows / browser)
    useEffect(() => {
        void ensureNotificationPermission()
    }, [])

    // 1. Fetch real-time system notifications (poll every 30s)
    useEffect(() => {
        let isMounted = true
        const fetchSystemNotifications = async () => {
            if (!localStorage.getItem('token')) return
            try {
                const res = await api.get('/notifications')
                if (isMounted && Array.isArray(res.data)) {
                    res.data.forEach((notif: any) => {
                        addNotification({
                            id: notif._id,
                            title: notif.title,
                            message: notif.message,
                            read: notif.read,
                            createdAt: new Date(notif.createdAt)
                        })
                    })
                }
            } catch (err) {
                console.error('Failed to fetch notifications:', err)
            }
        }

        fetchSystemNotifications()
        const interval = setInterval(fetchSystemNotifications, 30000)
        return () => {
            isMounted = false
            clearInterval(interval)
        }
    }, [addNotification])

    // 1b. Calendar / meeting reminders (poll every 30s)
    useEffect(() => {
        let alive = true
        const pollCalendar = async () => {
            if (!localStorage.getItem('token')) return
            try {
                const res = await api.get('/calendar/reminders/due')
                const due = res.data?.due || []
                if (!alive) return
                const notifiedKeys = getNotifiedKeys()
                for (const ev of due) {
                    const key = `cal-${ev._id}-${ev.startAt}`
                    if (notifiedKeys.has(key)) continue
                    saveNotifiedKey(key)
                    new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3').play().catch(() => {})
                    const title = `Meeting: ${ev.title}`
                    const description = [
                        ev.clientName ? `Client: ${ev.clientName}` : null,
                        ev.ownerName ? `With: ${ev.ownerName}` : null,
                        new Date(ev.startAt).toLocaleString()
                    ].filter(Boolean).join(' · ')
                    toast({ title: `Meeting reminder: ${ev.title}`, description })
                    await pingDesktop(title, description || 'Starting soon', key)
                }
            } catch { /* ignore */ }
        }
        pollCalendar()
        const interval = setInterval(pollCalendar, 30000)
        return () => { alive = false; clearInterval(interval) }
    }, [toast])

    // 2. Lead follow-up reminders + brand-new system notifications
    useEffect(() => {
        const checkReminders = async () => {
            const now = new Date()
            const notifiedKeys = getNotifiedKeys()

            // A. Lead follow-up / reminder due
            for (const lead of leads) {
                if (lead.reminder && lead.reminder.date && !lead.reminder.completed) {
                    const reminderDate = new Date(lead.reminder.date)
                    const leadId = lead.id
                    const reminderKey = `reminder-${leadId}-${reminderDate.getTime()}`

                    const diffMs = now.getTime() - reminderDate.getTime()

                    // Trigger ONLY if reminder date reached in last 2 mins AND never notified before
                    if (diffMs >= 0 && diffMs < 120000 && !notifiedKeys.has(reminderKey)) {
                        saveNotifiedKey(reminderKey)

                        let soundUrl = 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3'
                        if (lead.reminder.tone === 'urgent') soundUrl = 'https://assets.mixkit.co/active_storage/sfx/951/951-preview.mp3'
                        if (lead.reminder.tone === 'gentle') soundUrl = 'https://assets.mixkit.co/active_storage/sfx/2218/2218-preview.mp3'

                        new Audio(soundUrl).play().catch(() => { })

                        const title = 'Follow-up reminder'
                        const description = `${lead.company || lead.name || 'Lead'}${lead.reminder.note ? ` — ${lead.reminder.note}` : ''}`

                        toast({
                            title: 'Lead Reminder!',
                            description: `Follow-up for ${lead.company || lead.name}`,
                            variant: lead.reminder.tone === 'urgent' ? 'destructive' : 'default',
                        })
                        await pingDesktop(title, description, reminderKey)
                    }
                }
            }

            // B. System notifications (follow-ups, calls, deals, assignments, etc.)
            for (const notif of notifications) {
                const notifKey = `system-${notif.id}`
                const createdTime = notif.createdAt ? new Date(notif.createdAt).getTime() : 0
                const ageMs = now.getTime() - createdTime

                // Only toast + Windows notify if unread, never notified, AND created in last 5 minutes
                if (!notif.read && !notifiedKeys.has(notifKey) && ageMs < 300000 && ageMs >= 0) {
                    saveNotifiedKey(notifKey)

                    new Audio('https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3').play().catch(() => { })

                    toast({
                        title: notif.title,
                        description: notif.message,
                    })
                    await pingDesktop(notif.title || 'Nexprism', notif.message || '', notifKey)
                }
            }
        }

        const interval = setInterval(() => { void checkReminders() }, 10000)
        void checkReminders()
        return () => clearInterval(interval)
    }, [leads, notifications, toast])

    return null
}
