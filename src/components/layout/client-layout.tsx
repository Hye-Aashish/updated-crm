import { useState, useEffect } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { ClientSidebar } from './client-sidebar'
import { Topbar } from './topbar'
import { BottomNav } from './bottom-nav'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/store'
import api from '@/lib/api-client'

export function ClientLayout() {
    const [collapsed, setCollapsed] = useState(false)
    const [mobileOpen, setMobileOpen] = useState(false)
    const navigate = useNavigate()
    const { currentUser, setCurrentUser } = useAppStore()
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
            <ClientSidebar
                collapsed={collapsed}
                setCollapsed={setCollapsed}
                mobileOpen={mobileOpen}
                setMobileOpen={setMobileOpen}
            />

            <div className={cn("flex-1 flex flex-col h-full transition-all duration-300 ease-in-out relative overflow-hidden")}>
                <header className="sticky top-0 z-30 flex h-16 items-center border-b border-border/40 bg-background/80 backdrop-blur-md px-4 md:px-6 shadow-sm shrink-0">
                    <div className="flex-1 min-w-0">
                        <Topbar onMenuClick={() => setMobileOpen(true)} />
                    </div>
                </header>

                <main className="flex-1 overflow-y-auto p-4 md:p-8 w-full scroll-smooth bg-slate-50/30">
                    <div className="mx-auto max-w-7xl animate-in fade-in slide-in-from-bottom-4 duration-500 pb-24 md:pb-20">
                        <Outlet />
                    </div>
                </main>

                {/* Mobile Bottom Navigation */}
                <BottomNav onMenuClick={() => setMobileOpen(true)} />
            </div>
        </div>
    )
}
