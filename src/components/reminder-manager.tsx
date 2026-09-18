import { useEffect, useRef } from 'react'
import { useAppStore } from '@/store'
import { useToast } from '@/hooks/use-toast'
import api from '@/lib/api-client'

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
        const keysArr = Array.from(set).slice(-300) // Keep last 300 keys max
        localStorage.setItem('crm_notified_toast_keys', JSON.stringify(keysArr))
    } catch (e) {
        console.error(e)
    }
}

export function ReminderManager() {
    const { leads, notifications, addNotification } = useAppStore()
    const { toast } = useToast()

    // 1. Fetch real-time system notifications (poll every 60s)
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
        const interval = setInterval(fetchSystemNotifications, 60000)
        return () => {
            isMounted = false
            clearInterval(interval)
        }
    }, [])

    // 2. Check Lead Reminders and Brand-New System Notifications
    useEffect(() => {
        const checkReminders = () => {
            const now = new Date()
            const notifiedKeys = getNotifiedKeys()

            // A. Check Lead Reminders (local time based)
            leads.forEach(lead => {
                if (lead.reminder && lead.reminder.date && !lead.reminder.completed) {
                    const reminderDate = new Date(lead.reminder.date)
                    const leadId = lead.id
                    const reminderKey = `reminder-${leadId}-${reminderDate.getTime()}`
                    
                    const diffMs = now.getTime() - reminderDate.getTime()

                    // Trigger toast ONLY if reminder date reached in last 2 mins AND never notified before
                    if (diffMs >= 0 && diffMs < 120000 && !notifiedKeys.has(reminderKey)) {
                        saveNotifiedKey(reminderKey)

                        let soundUrl = 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3'
                        if (lead.reminder.tone === 'urgent') soundUrl = 'https://assets.mixkit.co/active_storage/sfx/951/951-preview.mp3'
                        if (lead.reminder.tone === 'gentle') soundUrl = 'https://assets.mixkit.co/active_storage/sfx/2218/2218-preview.mp3'

                        new Audio(soundUrl).play().catch(() => { })

                        toast({
                            title: "Lead Reminder!",
                            description: `Follow-up for ${lead.company}`,
                            variant: lead.reminder.tone === 'urgent' ? "destructive" : "default",
                        })
                    }
                }
            })

            // B. Check System Notifications (ONLY toast brand new ones created in last 3 minutes)
            notifications.forEach(notif => {
                const notifKey = `system-${notif.id}`
                const createdTime = notif.createdAt ? new Date(notif.createdAt).getTime() : 0
                const ageMs = now.getTime() - createdTime

                // Only show toast if unread, never notified before, AND created in the last 3 minutes
                if (!notif.read && !notifiedKeys.has(notifKey) && ageMs < 180000 && ageMs >= 0) {
                    saveNotifiedKey(notifKey)

                    new Audio('https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3').play().catch(() => { })

                    toast({
                        title: notif.title,
                        description: notif.message,
                    })
                }
            })
        }

        const interval = setInterval(checkReminders, 10000)
        return () => clearInterval(interval)
    }, [leads, notifications, toast])

    return null
}

