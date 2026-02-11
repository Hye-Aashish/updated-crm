import { useState, useEffect } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { EmployeeSidebar } from './employee-sidebar'
import { Topbar } from './topbar'
import { cn } from '@/lib/utils'
import { Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAppStore } from '@/store'
import api from '@/lib/api-client'

export function EmployeeLayout() {
    const navigate = useNavigate()
    const { currentUser, setCurrentUser } = useAppStore()
    const [authLoading, setAuthLoading] = useState(true)
    const [collapsed, setCollapsed] = useState(false)
    const [mobileOpen, setMobileOpen] = useState(false)

    // Auth / Session Check
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
                    console.error("Employee Auth failed:", err)
                    localStorage.removeItem('token')
                    navigate('/login')
                }
            }
            setAuthLoading(false)
        }
        checkAuth()
    }, [currentUser, navigate, setCurrentUser])

    if (authLoading) {
        return <div className="h-screen w-full flex items-center justify-center bg-background">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
        </div>
    }

    return (
        <div className="min-h-screen bg-gray-50/90 dark:bg-zinc-900">
            {/* Employee Sidebar */}
            <EmployeeSidebar
                collapsed={collapsed}
                setCollapsed={setCollapsed}
                mobileOpen={mobileOpen}
                setMobileOpen={setMobileOpen}
            />

            {/* Main Content Wrapper */}
            <div
                className={cn(
                    "flex flex-col min-h-screen transition-all duration-300 ease-in-out",
                    collapsed ? "lg:ml-20" : "lg:ml-64"
                )}
            >
                {/* Topbar */}
                <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background px-6 shadow-sm">
                    {/* Mobile Menu Trigger */}
                    <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobileOpen(true)}>
                        <Menu className="h-5 w-5" />
                    </Button>

                    <div className="flex-1">
                        <Topbar onMenuClick={() => setMobileOpen(true)} />
                    </div>
                </header>

                {/* Page Content */}
                <main className="flex-1 p-6 overflow-x-hidden">
                    <Outlet />
                </main>
            </div>
        </div>
    )
}
