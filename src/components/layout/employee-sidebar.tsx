import {
    LayoutDashboard,
    Briefcase,
    CheckSquare,
    Clock,
    FolderOpen,
    Settings,
    LifeBuoy,
    ChevronLeft,
    ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Link, useLocation } from 'react-router-dom'
import { useAppStore } from '@/store'
import { useState, useEffect } from 'react'
import api from '@/lib/api-client'

interface SidebarProps {
    collapsed: boolean
    setCollapsed: (v: boolean) => void
    mobileOpen: boolean
    setMobileOpen: (v: boolean) => void
}

export function EmployeeSidebar({ collapsed, setCollapsed, mobileOpen, setMobileOpen }: SidebarProps) {
    const location = useLocation()
    const { currentUser } = useAppStore()
    const [permissions, setPermissions] = useState<any>(null)

    useEffect(() => {
        api.get('/settings').then(res => {
            if (currentUser?.role && res.data.roles) {
                const role = res.data.roles.find((r: any) => r.name === currentUser.role)
                if (role) setPermissions(role.permissions)
            }
        }).catch(err => console.error("Permissions fetch error", err))
    }, [currentUser])

    const navItems = [
        { name: 'Dashboard', href: '/employee/dashboard', icon: LayoutDashboard },
        { name: 'My Projects', href: '/employee/projects', icon: Briefcase },
        { name: 'My Tasks', href: '/employee/tasks', icon: CheckSquare },
        { name: 'Attendance', href: '/employee/attendance', icon: Clock },
        { name: 'Time Tracking', href: '/employee/time', icon: Clock },
        { name: 'My Files', href: '/employee/files', icon: FolderOpen },
        { name: 'Support Tickets', href: '/employee/tickets', icon: LifeBuoy },
        { name: 'Profile Settings', href: '/employee/settings', icon: Settings },
    ]

    const filteredItems = navItems.filter(item => {
        if (currentUser?.role === 'owner') return true
        if (!permissions) {
            return ['Dashboard'].includes(item.name)
        }
        const p = permissions
        switch (item.name) {
            case 'Dashboard': return !!p.dashboard?.view
            case 'My Projects': return !!p.projects?.view
            case 'My Tasks': return !!p.tasks?.view
            case 'Attendance': return !!p.attendance?.view
            case 'Time Tracking': return !!p.time_tracking?.view
            case 'My Files': return !!p.files?.view
            case 'Support Tickets': return !!p.tickets?.view
            case 'Profile Settings': return !!p.settings?.view
            default: return true
        }
    })

    return (
        <>
            {/* Mobile Overlay */}
            {mobileOpen && (
                <div
                    className="fixed inset-0 z-40 bg-black/50 lg:hidden"
                    onClick={() => setMobileOpen(false)}
                />
            )}

            {/* Sidebar Container */}
            <div className={cn(
                "fixed inset-y-0 left-0 z-50 flex flex-col bg-card border-r transition-all duration-300",
                collapsed ? "w-20" : "w-64",
                mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
            )}>
                {/* Logo Section */}
                <div className="flex h-16 items-center justify-between px-4 border-b">
                    {!collapsed && (
                        <div className="flex items-center gap-2">
                            <span className="text-xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent truncate">
                                Nexprism
                            </span>
                            <span className="text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded">Emp</span>
                        </div>
                    )}
                    {collapsed && (
                        <span className="mx-auto font-bold text-primary">N</span>
                    )}

                    <Button
                        variant="ghost"
                        size="icon"
                        className="hidden lg:flex"
                        onClick={() => setCollapsed(!collapsed)}
                    >
                        {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
                    </Button>

                    <Button
                        variant="ghost"
                        size="icon"
                        className="lg:hidden"
                        onClick={() => setMobileOpen(false)}
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                </div>

                {/* Navigation */}
                <div className="flex-1 overflow-y-auto py-4">
                    <nav className="grid gap-1 px-2">
                        {filteredItems.map((item, index) => {
                            const isActive = location.pathname === item.href || location.pathname.startsWith(`${item.href}/`)
                            return (
                                <Link
                                    key={index}
                                    to={item.href}
                                    onClick={() => setMobileOpen(false)}
                                    className={cn(
                                        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors relative",
                                        isActive
                                            ? "bg-primary text-primary-foreground shadow-sm"
                                            : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                                        collapsed && "justify-center px-2"
                                    )}
                                    title={collapsed ? item.name : undefined}
                                >
                                    <item.icon className="h-4 w-4 flex-shrink-0" />
                                    {!collapsed && <span>{item.name}</span>}
                                </Link>
                            )
                        })}
                    </nav>
                </div>

                {/* User Profile (Collapsed/Expanded) */}
                <div className="p-4 border-t">
                    <div className={cn("flex items-center gap-3", collapsed && "justify-center")}>
                        <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs ring-2 ring-background">
                            {currentUser?.name?.charAt(0) || 'U'}
                        </div>
                        {!collapsed && (
                            <div className="overflow-hidden">
                                <p className="text-sm font-medium truncate">{currentUser?.name}</p>
                                <p className="text-xs text-muted-foreground truncate capitalize">{currentUser?.role || 'Employee'}</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    )
}
