import {
    LayoutDashboard,
    Briefcase,
    CheckSquare,
    FileText,
    Settings,
    LifeBuoy,
    ChevronLeft,
    ChevronRight,
    LogOut,
    FolderOpen
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
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

export function ClientSidebar({ collapsed, setCollapsed, mobileOpen, setMobileOpen }: SidebarProps) {
    const location = useLocation()
    const navigate = useNavigate()
    const { currentUser } = useAppStore()
    const [permissions, setPermissions] = useState<any>(null)
    const [logo, setLogo] = useState<string | null>(null)
    const [companyName, setCompanyName] = useState('Client Portal')

    useEffect(() => {
        api.get('/settings').then(res => {
            const cp = res.data?.companyProfile
            if (cp) {
                if (cp.logo) setLogo(cp.logo)
                if (cp.name) setCompanyName(cp.name)
            }
            if (currentUser?.role && res.data.roles) {
                const role = res.data.roles.find((r: any) => r.name === currentUser.role)
                if (role) setPermissions(role.permissions)
            }
        }).catch(err => console.error("Logo/Permissions fetch error", err))
    }, [currentUser])

    const navItems = [
        { name: 'Dashboard', href: '/client/dashboard', icon: LayoutDashboard },
        { name: 'Projects', href: '/client/projects', icon: Briefcase },
        { name: 'Tasks', href: '/client/tasks', icon: CheckSquare },
        { name: 'Invoices', href: '/client/invoices', icon: FileText },
        { name: 'Files', href: '/client/files', icon: FolderOpen },
        { name: 'Support Tickets', href: '/client/tickets', icon: LifeBuoy },
        { name: 'Profile Settings', href: '/client/settings', icon: Settings },
    ]

    const filteredItems = navItems.filter(item => {
        if (currentUser?.role === 'owner') return true
        if (!permissions) {
            return ['Dashboard'].includes(item.name)
        }
        const p = permissions
        switch (item.name) {
            case 'Dashboard': return !!p.dashboard?.view
            case 'Projects': return !!p.projects?.view
            case 'Tasks': return !!p.tasks?.view
            case 'Invoices': return !!p.invoices?.view
            case 'Files': return p.files ? !!p.files.view : true
            case 'Support Tickets': return !!p.tickets?.view
            case 'Profile Settings': return !!p.settings?.view
            default: return true
        }
    })

    return (
        <>
            {/* Mobile Sidebar */}
            {mobileOpen && (
                <div className="fixed inset-0 z-[100] flex" onClick={() => setMobileOpen(false)}>
                    <div className="fixed inset-0 bg-black/50" />
                    <div className="relative flex w-64 flex-col bg-card shadow-xl transition-transform" onClick={e => e.stopPropagation()}>
                        <div className="flex h-16 shrink-0 items-center px-4 border-b">
                            {logo ? (
                                <img src={logo} alt="Logo" className="max-h-8 w-auto object-contain" />
                            ) : (
                                <span className="text-lg font-bold text-primary">{companyName}</span>
                            )}
                        </div>
                        <div className="flex-1 overflow-y-auto py-4">
                            <nav className="grid gap-1 px-2">
                                {filteredItems.map((item, index) => {
                                    const isActive = location.pathname === item.href
                                    return (
                                        <Link
                                            key={index}
                                            to={item.href}
                                            onClick={() => setMobileOpen(false)}
                                            className={cn(
                                                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                                                isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                                            )}
                                        >
                                            <item.icon className="h-4 w-4" />
                                            {item.name}
                                        </Link>
                                    )
                                })}
                            </nav>
                        </div>
                    </div>
                </div>
            )}

            {/* Desktop Sidebar */}
            <div className={cn(
                "hidden border-r bg-card lg:flex flex-col transition-all duration-300 h-full shadow-lg",
                collapsed ? "w-[70px]" : "w-64"
            )}>
                <div className="flex h-16 shrink-0 items-center px-4 border-b gap-2 justify-between">
                    {!collapsed && (
                        <div className="flex items-center gap-2 overflow-hidden">
                            <div className="h-8 w-8 shrink-0 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold">
                                C
                            </div>
                            <span className="font-bold text-lg truncate">Client Portal</span>
                        </div>
                    )}
                    <Button variant="ghost" size="icon" onClick={() => setCollapsed(!collapsed)}>
                        {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
                    </Button>
                </div>

                <div className="flex-1 overflow-y-auto py-6">
                    <nav className="grid gap-1 px-3">
                        {filteredItems.map((item, index) => {
                            const isActive = location.pathname === item.href || location.pathname.startsWith(`${item.href}/`)
                            return (
                                <Link
                                    key={index}
                                    to={item.href}
                                    className={cn(
                                        "flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-all relative group",
                                        isActive
                                            ? "bg-primary/10 text-primary shadow-sm"
                                            : "text-muted-foreground hover:bg-muted hover:text-foreground",
                                        collapsed && "justify-center px-2"
                                    )}
                                    title={collapsed ? item.name : undefined}
                                >
                                    <item.icon className={cn(
                                        "h-5 w-5 flex-shrink-0 transition-colors",
                                        isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                                    )} />
                                    {!collapsed && <span className={cn("truncate", isActive && "font-bold")}>{item.name}</span>}
                                </Link>
                            )
                        })}
                    </nav>
                </div>

                <div className="p-4 border-t bg-muted/20">
                    <div className={cn("flex items-center gap-3", collapsed && "justify-center")}>
                        {!collapsed ? (
                            <>
                                <div className="h-9 w-9 rounded-full bg-primary/20 flex items-center justify-center text-primary font-black text-xs">
                                    {currentUser?.name?.charAt(0) || 'C'}
                                </div>
                                <div className="overflow-hidden flex-1">
                                    <p className="text-sm font-bold truncate">{currentUser?.name}</p>
                                    <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">Customer</p>
                                </div>
                                <Button variant="ghost" size="icon" onClick={() => { localStorage.removeItem('token'); navigate('/login'); }}>
                                    <LogOut className="h-4 w-4 text-rose-500" />
                                </Button>
                            </>
                        ) : (
                            <Button variant="ghost" size="icon" onClick={() => { localStorage.removeItem('token'); navigate('/login'); }}>
                                <LogOut className="h-4 w-4 text-rose-500" />
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </>
    )
}
