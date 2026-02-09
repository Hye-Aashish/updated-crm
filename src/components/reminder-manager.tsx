import { useEffect, useRef } from 'react'
import { useAppStore } from '@/store'
import { useToast } from '@/hooks/use-toast'
import api from '@/lib/api-client'

export function ReminderManager() {
    const { leads, setLeads, notifications, addNotification } = useAppStore()
    const { toast } = useToast()
    const notifiedRef = useRef<Set<string>>(new Set())

    // 1. Fetch real-time system notifications
    useEffect(() => {
        const fetchSystemNotifications = async () => {
            try {
                const res = await api.get('/notifications')
                if (Array.isArray(res.data)) {
                    // We only add new ones to avoid duplicates/infinite loops
                    res.data.forEach((notif: any) => {
                        const exists = notifications.some(n => n.id === notif._id)
                        if (!exists) {
                            addNotification({
                                id: notif._id,
                                title: notif.title,
                                message: notif.message,
                                read: notif.read,
                                createdAt: new Date(notif.createdAt)
                            })
                        }
                    })
                }
            } catch (err) {
                console.error('Failed to fetch notifications:', err)
            }
        }

        fetchSystemNotifications()
        const interval = setInterval(fetchSystemNotifications, 15000) // Poll every 15s
        return () => clearInterval(interval)
    }, [addNotification, notifications])

    useEffect(() => {
        const checkReminders = () => {
            const now = new Date()

            // A. Check Lead Reminders (local time based)
            leads.forEach(lead => {
                if (lead.reminder && lead.reminder.date && !lead.reminder.completed) {
                    const reminderDate = new Date(lead.reminder.date)
                    const leadId = lead.id
                    const reminderKey = `reminder-${leadId}-${reminderDate.getTime()}`

                    if (reminderDate <= now && !notifiedRef.current.has(reminderKey)) {
                        notifiedRef.current.add(reminderKey)

                        let soundUrl = 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3'
                        if (lead.reminder.tone === 'urgent') soundUrl = 'https://assets.mixkit.co/active_storage/sfx/951/951-preview.mp3'
                        if (lead.reminder.tone === 'gentle') soundUrl = 'https://assets.mixkit.co/active_storage/sfx/2218/2218-preview.mp3'

                        new Audio(soundUrl).play().catch(() => { })

                        toast({
                            title: "Lead Reminder!",
                            description: `Follow-up for ${lead.company}`,
                            variant: lead.reminder.tone === 'urgent' ? "destructive" : "default",
                        })

                        markReminderCompleted(leadId)
                    }
                }
            })

            // B. Check System Notifications (new ones that haven't been "sounded" yet)
            notifications.forEach(notif => {
                const notifKey = `system-${notif.id}`
                if (!notif.read && !notifiedRef.current.has(notifKey)) {
                    notifiedRef.current.add(notifKey)

                    // Always play a standard chime for system events
                    new Audio('https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3').play().catch(() => { })

                    toast({
                        title: notif.title,
                        description: notif.message,
                    })
                }
            })
        }

        const markReminderCompleted = async (leadId: string) => {
            try {
                const leadToUpdate = leads.find(l => l.id === leadId)
                if (!leadToUpdate || !leadToUpdate.reminder) return

                const updatedReminder = { ...leadToUpdate.reminder, completed: true }

                // We update the lead in store immediately to stop checking
                setLeads(leads.map(l => l.id === leadId ? {
                    ...l,
                    reminder: updatedReminder
                } : l))

                // Update backend - sending full reminder to preserve date/tone
                await api.put(`/leads/${leadId}`, {
                    reminder: updatedReminder
                })
            } catch (error) {
                console.error('Failed to mark reminder as completed', error)
            }
        }

        const interval = setInterval(checkReminders, 10000) // Check every 10 seconds
        return () => clearInterval(interval)
    }, [leads, setLeads, toast])

    return null
}
