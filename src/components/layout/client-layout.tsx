import { useState, useEffect } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { ClientSidebar } from './client-sidebar'
import { Topbar } from './topbar'
import { BottomNav } from './bottom-nav'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/store'
import api from '@/lib/api-client'

import { ChatNotificationListener } from '../chat-notification-listener'

export function ClientLayout() {
    const [collapsed, setCollapsed] = useState(false)
    const [mobileOpen, setMobileOpen] = useState(false)
    const navigate = useNavigate()
    const { currentUser, setCurrentUser, settings, fetchSettings } = useAppStore()
    const [authLoading, setAuthLoading] = useState(true)

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
                    if (res.data.role !== 'client') {
                        navigate('/dashboard')
                        return
                    }
                    setCurrentUser(res.data)
                } catch (err) {
                    console.error("Auth failed:", err)
                    localStorage.removeItem('token')
                    navigate('/login')
                }
            } else if (currentUser.role !== 'client') {
                navigate('/dashboard')
                return
            }
            setAuthLoading(false)
        }
        checkAuth()
    }, [currentUser, navigate, setCurrentUser])

    // Load Settings
    useEffect(() => {
        if (currentUser && !settings) {
            fetchSettings()
        }
    }, [currentUser, settings, fetchSettings])

    if (authLoading) {
        return (
            <div className="h-screen w-full flex flex-col items-center justify-center bg-background space-y-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
                <p className="text-sm font-medium text-muted-foreground animate-pulse">Entering Client Portal...</p>
            </div>
        )
    }

    return (
        <div className="flex h-[100dvh] bg-background overflow-hidden w-full font-sans">
            <ChatNotificationListener />
            <ClientSidebar
                collapsed={collapsed}
                setCollapsed={setCollapsed}
                mobileOpen={mobileOpen}
                setMobileOpen={setMobileOpen}
            />

            <div className={cn("flex-1 flex flex-col h-full transition-all duration-300 ease-in-out relative overflow-hidden")}>
                <header className="sticky top-0 z-30 flex h-14 items-center border-b border-border/60 bg-background/90 backdrop-blur-md px-3 sm:px-5 shadow-2xs shrink-0">
                    <div className="flex-1 min-w-0">
                        <Topbar onMenuClick={() => setMobileOpen(true)} />
                    </div>
                </header>

                <main className="flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-4 md:p-6 w-full max-w-full scroll-smooth pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] md:pb-6">
                    <div className="mx-auto max-w-7xl w-full min-w-0 animate-in fade-in duration-300">
                        <Outlet />
                    </div>
                </main>

                <BottomNav />
            </div>
        </div>
    )
}
