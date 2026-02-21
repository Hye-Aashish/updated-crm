import { useState, useEffect } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { Sidebar } from './sidebar'
import { Topbar } from './topbar'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/store'
import api from '@/lib/api-client'

export function DashboardLayout() {
    const [collapsed, setCollapsed] = useState(false)
    const [mobileOpen, setMobileOpen] = useState(false)
    const navigate = useNavigate()
    const { currentUser, setCurrentUser, leads, setLeads } = useAppStore()
    const [authLoading, setAuthLoading] = useState(true)

    // 0. Auth / Session Check
    useEffect(() => {
        const checkAuth = async () => {
            const token = localStorage.getItem('token')
            if (!token) {
                navigate('/login')
                return
            }

            if (!currentUser) {
                try {
                    const res = await api.get('/auth/me')
                    setCurrentUser(res.data)
                } catch (err) {
                    console.error("Auth failed:", err)
                    localStorage.removeItem('token')
                    navigate('/login')
                }
            }
            setAuthLoading(false)
        }
        checkAuth()
    }, [currentUser, navigate, setCurrentUser])

    // 1. Load Leads if empty (Global Check)
    useEffect(() => {
        if (!authLoading && currentUser && leads.length === 0) {
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
    }, [authLoading, currentUser, leads.length, setLeads])



    if (authLoading) {
        return (
            <div className="h-screen w-full flex flex-col items-center justify-center bg-background space-y-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
                <p className="text-sm font-medium text-muted-foreground animate-pulse">Authenticating...</p>
            </div>
        )
    }

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
                <header className="sticky top-0 z-30 flex h-16 items-center border-b border-border/40 bg-background/80 backdrop-blur-md px-4 md:px-6 shadow-sm shrink-0">
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
