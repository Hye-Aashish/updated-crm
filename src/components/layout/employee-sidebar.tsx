import {
    LayoutDashboard,
    Briefcase,
    CheckSquare,
    Clock,
    FolderOpen,
    Settings,
    LifeBuoy,
    Package,
    ChevronLeft,
    ChevronRight,
    LogOut,
    Sparkles,
    User,
    Calendar
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Link, useLocation, useNavigate } from 'react-router-dom'
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
    const navigate = useNavigate()
    const { currentUser, settings } = useAppStore()
    const [permissions, setPermissions] = useState<any>(null)
    const [logo, setLogo] = useState<string | null>(null)
    const [companyName, setCompanyName] = useState('Employee Workspace')

    const applySettings = (data: any) => {
        const cp = data?.companyProfile
        if (cp) {
            setLogo(cp.logo || null)
            if (cp.name) setCompanyName(cp.name)
        }
        if (currentUser?.role && data?.roles) {
            const role = data.roles.find((r: any) => r.name === currentUser.role)
            if (role) setPermissions(role.permissions)
        }
    }

    useEffect(() => {
        if (settings) {
            applySettings(settings)
            return
        }
        api.get('/settings').then(res => {
            applySettings(res.data)
        }).catch(err => console.error("Permissions fetch error", err))
    }, [currentUser, settings])

    const navItems = [
        { name: 'Dashboard', href: '/employee/dashboard', icon: LayoutDashboard, category: 'Core' },
        { name: 'My Calendar', href: '/employee/calendar', icon: Calendar, category: 'Core' },
        { name: 'My Projects', href: '/employee/projects', icon: Briefcase, category: 'Work' },
        { name: 'Digital Products', href: '/employee/products', icon: Package, category: 'Work' },
        { name: 'My Tasks', href: '/employee/tasks', icon: CheckSquare, category: 'Work' },
        { name: 'Attendance', href: '/employee/attendance', icon: Clock, category: 'Time & HR' },
        { name: 'Time Tracking', href: '/employee/time', icon: Clock, category: 'Time & HR' },
        { name: 'My Files', href: '/employee/files', icon: FolderOpen, category: 'Resources' },
        { name: 'Support Tickets', href: '/employee/tickets', icon: LifeBuoy, category: 'Support' },
        { name: 'Profile Settings', href: '/employee/settings', icon: Settings, category: 'Account' },
    ]

    const filteredItems = navItems.filter(item => {
        if (currentUser?.role === 'owner') return true
        if (!permissions) {
            return ['Dashboard'].includes(item.name)
        }
        const p = permissions
        switch (item.name) {
            case 'Dashboard': return !!p.dashboard?.view
            case 'My Calendar': return true
            case 'My Projects': return !!p.projects?.view
            case 'Digital Products': return !!p.projects?.view
            case 'My Tasks': return !!p.tasks?.view
            case 'Attendance': return !!p.attendance?.view
            case 'Time Tracking': return !!p.time_tracking?.view
            case 'My Files': return !!p.files?.view
            case 'Support Tickets': return !!p.tickets?.view
            case 'Profile Settings': return !!p.settings?.view
            default: return true
        }
    })

    const handleLogout = async () => {
        try {
            await api.post('/time-entries/stop-running')
        } catch (err) {
            console.error('Logout timer stop failed', err)
        } finally {
            localStorage.removeItem('token')
            navigate('/login')
        }
    }

    return (
        <>
            {/* Mobile Sidebar Overlay */}
            {mobileOpen && (
                <div 
                    className="fixed inset-0 z-[100] flex bg-black/50 backdrop-blur-sm transition-opacity" 
                    onClick={() => setMobileOpen(false)}
                >
                    <div 
                        className="relative flex w-72 flex-col bg-card/95 backdrop-blur-xl border-r border-border/50 shadow-2xl transition-transform" 
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Mobile Brand Header */}
                        <div className={cn("flex h-16 shrink-0 items-center px-4 border-b border-border/40 gap-3 min-w-0", logo && "justify-center")}>
                            {logo ? (
                                <img src={logo} alt={companyName} className="max-h-10 w-auto max-w-[180px] object-contain" />
                            ) : (
                                <>
                                    <div className="clay-icon h-9 w-9 rounded-xl bg-gradient-to-br from-primary via-primary/90 to-primary/80 flex items-center justify-center text-white font-extrabold text-sm shrink-0 shadow-sm">
                                        {companyName.charAt(0)}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <span className="font-extrabold text-sm text-foreground tracking-tight truncate block leading-snug">
                                            {companyName}
                                        </span>
                                        <span className="clay-badge text-[9px] font-extrabold tracking-wider uppercase px-2 py-0.5 bg-primary/10 text-primary border-primary/20 inline-block leading-tight">
                                            Employee Suite
                                        </span>
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Mobile Nav Links */}
                        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1.5">
                            {filteredItems.map((item, index) => {
                                const isActive = location.pathname === item.href || location.pathname.startsWith(`${item.href}/`)
                                const Icon = item.icon
                                return (
                                    <Link
                                        key={index}
                                        to={item.href}
                                        onClick={() => setMobileOpen(false)}
                                        className={cn(
                                            "flex items-center gap-3 rounded-2xl px-3.5 py-2.5 text-xs font-bold transition-all",
                                            isActive
                                                ? "clay-nav-active text-white shadow-md"
                                                : "text-muted-foreground hover:text-foreground hover:bg-card/80 hover:shadow-xs"
                                        )}
                                    >
                                        <div className={cn(
                                            "clay-icon h-8 w-8 rounded-xl flex items-center justify-center shrink-0",
                                            isActive ? "bg-white/20 text-white" : "bg-muted/50 text-muted-foreground"
                                        )}>
                                            <Icon className="h-4 w-4" />
                                        </div>
                                        <span className="truncate flex-1">{item.name}</span>
                                        {isActive && (
                                            <span className="h-1.5 w-1.5 rounded-full bg-white shrink-0 shadow-xs" />
                                        )}
                                    </Link>
                                )
                            })}
                        </div>

                        {/* Mobile Profile Footer */}
                        <div className="p-3 border-t border-border/40 bg-card/40">
                            <div className="clay-card p-2.5 rounded-2xl flex items-center gap-2.5 bg-card/90">
                                <div className="relative shrink-0">
                                    <div className="clay-icon h-9 w-9 rounded-xl bg-primary/15 text-primary flex items-center justify-center font-extrabold text-xs">
                                        {currentUser?.name?.charAt(0) || 'E'}
                                    </div>
                                    <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 border-2 border-card" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-xs font-extrabold text-foreground truncate leading-tight">
                                        {currentUser?.name}
                                    </p>
                                    <span className="clay-badge text-[9px] font-bold uppercase px-1.5 py-0.2 bg-muted text-muted-foreground truncate leading-tight mt-0.5 inline-block">
                                        {currentUser?.role || 'Staff'}
                                    </span>
                                </div>
                                <button
                                    onClick={handleLogout}
                                    className="clay-btn h-8 w-8 rounded-xl text-rose-500 hover:bg-rose-500 hover:text-white flex items-center justify-center transition-all shrink-0 active:scale-95 shadow-xs"
                                    title="Logout"
                                >
                                    <LogOut className="h-3.5 w-3.5" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Desktop Claymorphic Sidebar */}
            <aside 
                className={cn(
                    "hidden border-r border-border/50 bg-card/95 backdrop-blur-xl lg:flex flex-col transition-all duration-300 h-full relative z-20 shadow-xs select-none",
                    collapsed ? "w-[72px]" : "w-64"
                )}
            >
                {/* Desktop Brand Header */}
                <div className="flex h-16 shrink-0 items-center px-3.5 border-b border-border/40 gap-2 justify-between overflow-hidden bg-card/50">
                    {!collapsed ? (
                        <div className={cn("flex items-center gap-2.5 min-w-0 flex-1", logo && "justify-center")}>
                            {logo ? (
                                <img src={logo} alt={companyName} className="max-h-10 w-auto max-w-[180px] object-contain" />
                            ) : (
                                <>
                                    <div className="clay-icon h-9 w-9 rounded-xl bg-gradient-to-br from-primary via-primary/90 to-primary/80 flex items-center justify-center text-white font-extrabold text-sm shrink-0 shadow-sm">
                                        {companyName.charAt(0)}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <span className="font-extrabold text-sm text-foreground tracking-tight truncate block leading-snug">
                                            {companyName}
                                        </span>
                                        <span className="clay-badge text-[9px] font-extrabold tracking-wider uppercase px-2 py-0.5 bg-primary/10 text-primary border-primary/20 inline-block leading-tight">
                                            Employee Suite
                                        </span>
                                    </div>
                                </>
                            )}
                        </div>
                    ) : (
                        <div className="w-full flex justify-center">
                            <div className="clay-icon h-9 w-9 rounded-xl bg-gradient-to-br from-primary via-primary/90 to-primary/80 flex items-center justify-center text-white font-extrabold text-sm shadow-sm" title={companyName}>
                                {companyName.charAt(0)}
                            </div>
                        </div>
                    )}

                    {!collapsed && (
                        <button
                            onClick={() => setCollapsed(!collapsed)}
                            className="clay-btn h-8 w-8 rounded-xl bg-card hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-all shrink-0 active:scale-95 shadow-xs"
                            title="Collapse sidebar"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </button>
                    )}
                </div>

                {/* Collapsed Toggle Button below header */}
                {collapsed && (
                    <div className="flex justify-center py-2 border-b border-border/30 bg-muted/20">
                        <button
                            onClick={() => setCollapsed(!collapsed)}
                            className="clay-btn h-7 w-7 rounded-lg bg-card hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-all active:scale-95 shadow-xs"
                            title="Expand sidebar"
                        >
                            <ChevronRight className="h-3.5 w-3.5" />
                        </button>
                    </div>
                )}

                {/* Navigation Links */}
                <div className="flex-1 overflow-y-auto py-4 px-2.5 space-y-1.5 scrollbar-thin scrollbar-thumb-muted-foreground/20">
                    {filteredItems.map((item, index) => {
                        const isActive = location.pathname === item.href || location.pathname.startsWith(`${item.href}/`)
                        const Icon = item.icon
                        return (
                            <Link
                                key={index}
                                to={item.href}
                                className={cn(
                                    "flex items-center gap-3 rounded-2xl transition-all duration-200 group relative",
                                    collapsed ? "justify-center h-10 w-10 mx-auto p-0" : "px-3 py-2 text-xs",
                                    isActive
                                        ? "clay-nav-active text-white font-bold shadow-md"
                                        : "text-foreground/80 hover:text-foreground hover:bg-card/80 hover:shadow-xs font-semibold"
                                )}
                                title={collapsed ? item.name : undefined}
                            >
                                <div className={cn(
                                    "clay-icon flex items-center justify-center shrink-0 transition-all",
                                    collapsed ? "h-9 w-9 rounded-xl" : "h-7.5 w-7.5 rounded-lg",
                                    isActive 
                                        ? "bg-white/20 text-white shadow-none" 
                                        : "bg-muted/40 text-muted-foreground group-hover:text-primary group-hover:bg-primary/10"
                                )}>
                                    <Icon className={cn(collapsed ? "h-4 w-4" : "h-3.5 w-3.5")} />
                                </div>

                                {!collapsed && (
                                    <span className={cn(
                                        "truncate tracking-tight flex-1",
                                        isActive ? "text-white" : "text-foreground/80 group-hover:text-foreground"
                                    )}>
                                        {item.name}
                                    </span>
                                )}

                                {isActive && !collapsed && (
                                    <span className="h-1.5 w-1.5 rounded-full bg-white shrink-0 shadow-xs" />
                                )}
                            </Link>
                        )
                    })}
                </div>

                {/* Desktop User Profile Capsule Footer */}
                <div className="p-2.5 border-t border-border/40 bg-card/40">
                    {!collapsed ? (
                        <div className="clay-card p-2.5 rounded-2xl flex items-center gap-2.5 bg-card/90">
                            <div className="relative shrink-0">
                                <div className="clay-icon h-9 w-9 rounded-xl bg-primary/15 text-primary flex items-center justify-center font-extrabold text-xs">
                                    {currentUser?.name?.charAt(0) || 'E'}
                                </div>
                                <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 border-2 border-card" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-xs font-extrabold text-foreground truncate leading-tight">
                                    {currentUser?.name}
                                </p>
                                <span className="clay-badge text-[9px] font-bold uppercase px-1.5 py-0.2 bg-muted text-muted-foreground truncate leading-tight mt-0.5 inline-block">
                                    {currentUser?.role || 'Staff'}
                                </span>
                            </div>
                            <button
                                onClick={handleLogout}
                                className="clay-btn h-8 w-8 rounded-xl text-rose-500 hover:bg-rose-500 hover:text-white flex items-center justify-center transition-all shrink-0 active:scale-95 shadow-xs"
                                title="Logout"
                            >
                                <LogOut className="h-3.5 w-3.5" />
                            </button>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-2 items-center py-1">
                            <div className="relative">
                                <div className="clay-icon h-9 w-9 rounded-xl bg-primary/15 text-primary flex items-center justify-center font-extrabold text-xs" title={currentUser?.name}>
                                    {currentUser?.name?.charAt(0) || 'E'}
                                </div>
                                <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 border-2 border-card" />
                            </div>
                            <button
                                onClick={handleLogout}
                                className="clay-btn h-8 w-8 rounded-xl text-rose-500 hover:bg-rose-500 hover:text-white flex items-center justify-center transition-all active:scale-95 shadow-xs"
                                title="Logout"
                            >
                                <LogOut className="h-3.5 w-3.5" />
                            </button>
                        </div>
                    )}
                </div>
            </aside>
        </>
    )
}
