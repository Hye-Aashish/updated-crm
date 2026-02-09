import { useState, useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './sidebar'
import { Topbar } from './topbar'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/store'
import api from '@/lib/api-client'

export function DashboardLayout() {
    const [collapsed, setCollapsed] = useState(false)
    const [mobileOpen, setMobileOpen] = useState(false)
    const { leads, setLeads, addNotification } = useAppStore()

    // 1. Load Leads if empty (Global Check)
    useEffect(() => {
        if (leads.length === 0) {
            api.get('/leads').then(res => {
                const mappedLeads = res.data.map((l: any) => ({
                    id: l._id,
                    name: l.name,
                    company: l.company,
                    value: l.value,
                    source: l.source,
                    stage: l.stage,
                    email: l.email,
                    phone: l.phone,
                    activities: l.activities || [],
                    reminder: l.reminder
                }))
                setLeads(mappedLeads)
            }).catch(e => console.error("Reminder Sys: Load failed", e))
        }
    }, [])

    // 2. Poll for Reminders
    useEffect(() => {
        const checkReminders = () => {
            const now = new Date()
            let hasUpdates = false
            const updatedLeads = leads.map(lead => {
                if (lead.reminder?.date && !lead.reminder.completed) {
                    const reminderTime = new Date(lead.reminder.date)
                    if (now >= reminderTime) {
                        console.log(`🔔 Reminder Triggered for ${lead.name}`)

                        // Play Tone
                        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3')
                        audio.volume = 0.5
                        audio.play().catch(e => console.error("Audio denied", e))

                        // Add Notification
                        addNotification({
                            id: `rem-${Date.now()}-${lead.id}`,
                            title: `Reminder: ${lead.name}`,
                            message: `Follow up due for ${lead.company}`,
                            read: false,
                            createdAt: new Date()
                        })

                        // Update Backend
                        api.put(`/leads/${lead.id}`, {
                            reminder: { ...lead.reminder, completed: true }
                        }).catch(console.error)

                        hasUpdates = true
                        return { ...lead, reminder: { ...lead.reminder, completed: true } }
                    }
                }
                return lead
            })

            if (hasUpdates) {
                setLeads(updatedLeads)
            }
        }

        const interval = setInterval(checkReminders, 10000) // Check every 10s
        return () => clearInterval(interval)
    }, [leads, addNotification, setLeads])

    return (

        <div className="flex h-screen bg-background overflow-hidden w-full font-sans">
            {/* Sidebar with shared state */}
            <Sidebar
                collapsed={collapsed}
                setCollapsed={setCollapsed}
                mobileOpen={mobileOpen}
                setMobileOpen={setMobileOpen}
            />

            {/* Main Content Wrapper */}
            <div
                className={cn(
                    "flex-1 flex flex-col h-full transition-all duration-300 ease-in-out relative overflow-hidden"
                )}
            >
                {/* Topbar */}
                <header className="sticky top-0 z-30 flex h-16 items-center border-b border-border/40 bg-background/80 backdrop-blur-md px-6 shadow-sm shrink-0">
                    <div className="flex-1 min-w-0">
                        <Topbar onMenuClick={() => setMobileOpen(true)} />
                    </div>
                </header>

                {/* Page Content */}
                <main className="flex-1 overflow-y-auto p-4 md:p-8 w-full scroll-smooth">
                    <div className="mx-auto max-w-7xl animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    )
}
