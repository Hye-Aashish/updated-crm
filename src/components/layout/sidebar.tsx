import {
    LayoutDashboard,
    Users,
    Briefcase,
    CheckSquare,
    Clock,
    FileText,
    Settings,
    FolderOpen,

    LifeBuoy,
    BarChart,
    Wallet,
    Target,
    ChevronLeft,
    ChevronRight,
    LogOut,
    MessageSquare,
    Activity
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAppStore } from '@/store'
import { useState, useEffect } from 'react'
import api from '@/lib/api-client'

function hexToHSL(hex: string) {
    if (!hex) return null;
    let result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return null;
    let r = parseInt(result[1], 16);
    let g = parseInt(result[2], 16);
    let b = parseInt(result[3], 16);
    r /= 255; g /= 255; b /= 255;
    let max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0, l = (max + min) / 2;
    if (max !== min) {
        let d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }
    if (isNaN(h) || isNaN(s) || isNaN(l)) return null;
    return `${(h * 360).toFixed(1)} ${(s * 100).toFixed(1)}% ${(l * 100).toFixed(1)}%`;
}

interface SidebarProps {
    collapsed: boolean
    setCollapsed: (v: boolean) => void
    mobileOpen: boolean
    setMobileOpen: (v: boolean) => void
}

export function Sidebar({ collapsed, setCollapsed, mobileOpen, setMobileOpen }: SidebarProps) {
    const location = useLocation()
    const navigate = useNavigate()
    const { currentUser } = useAppStore()
    const [logo, setLogo] = useState<string | null>(null)
    const [icon, setIcon] = useState<string | null>(null)
    const [companyName, setCompanyName] = useState('Nexprism')

    const [logoDims, setLogoDims] = useState({ width: 'auto', height: '32px' })
    const [permissions, setPermissions] = useState<any>(null)

    useEffect(() => {
        api.get('/settings').then(res => {
            const cp = res.data?.companyProfile
            if (cp) {
                if (cp.logo) setLogo(cp.logo)
                if (cp.icon) setIcon(cp.icon)
                if (cp.name) setCompanyName(cp.name)
                if (cp.logoWidth) setLogoDims(prev => ({ ...prev, width: cp.logoWidth }))
                if (cp.logoHeight) setLogoDims(prev => ({ ...prev, height: cp.logoHeight }))
                if (cp.themeColor) {
                    const hsl = hexToHSL(cp.themeColor)
                    if (hsl) document.documentElement.style.setProperty('--primary', hsl)
                }
            }

            // Permissions Logic
            if (currentUser?.role && currentUser.role !== 'owner' && res.data.roles) {
                const role = res.data.roles.find((r: any) => r.name === currentUser.role)
                if (role) setPermissions(role.permissions)
            }
        }).catch(err => console.error("Logo fetch error", err))
    }, [currentUser])

    const navItems = [
        { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
        { name: 'User Tracker', href: '/user-tracker', icon: Activity },
        { name: 'Clients', href: '/clients', icon: Users },
        { name: 'Projects', href: '/projects', icon: Briefcase },
        { name: 'Tasks', href: '/tasks', icon: CheckSquare },
        { name: 'Team', href: '/team?tab=members', icon: Users },
        { name: 'Attendance', href: '/attendance', icon: Clock }, // Updated link
        { name: 'Time Tracking', href: '/time', icon: Clock },
        { name: 'Invoices', href: '/invoices', icon: FileText },
        { name: 'Quotations', href: '/quotations', icon: FileText },
        { name: 'Templates', href: '/quotations/templates', icon: LayoutDashboard },
        { name: 'Leads', href: '/leads', icon: Target },
        { name: 'Expenses', href: '/expenses', icon: Wallet },
        { name: 'Payroll', href: '/salary', icon: Wallet },
        { name: 'Support Tickets', href: '/tickets', icon: LifeBuoy },
        { name: 'Live Chat', href: '/chat', icon: MessageSquare },
        { name: 'Reports', href: '/reports', icon: BarChart },
        { name: 'Files', href: '/files', icon: FolderOpen },
        { name: 'Settings', href: '/settings', icon: Settings },
    ]
    const filteredItems = navItems.filter(item => {
        if (!permissions || currentUser?.role === 'owner') return true

        const p = permissions
        switch (item.name) {
            case 'Dashboard': return !!p.dashboard?.view
            case 'User Tracker': return !!p.user_tracker?.view
            case 'Clients': return !!p.clients?.view
            case 'Projects': return !!p.projects?.view
            case 'Tasks': return !!p.tasks?.view
            case 'Team': return !!p.team?.view
            case 'Attendance': return !!p.attendance?.view
            case 'Time Tracking': return !!p.time_tracking?.view
            case 'Invoices': return !!p.invoices?.view
            case 'Quotations': return !!p.quotations?.view
            case 'Templates': return !!p.templates?.view
            case 'Leads': return !!p.leads?.view
            case 'Expenses': return !!p.expenses?.view
            case 'Payroll': return !!p.payroll?.view
            case 'Support Tickets': return !!p.tickets?.view
            case 'Live Chat': return !!p.chat?.view
            case 'Reports': return !!p.reports?.view
            case 'Files': return !!p.files?.view
            case 'Settings': return !!p.settings?.view
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
                        {/* Mobile Logo */}
                        <div className="flex h-16 shrink-0 items-center px-4 border-b">
                            {logo ? (
                                <img src={logo} alt="Logo" className="max-h-8 w-auto object-contain" />
                            ) : (
                                <span className="text-lg font-bold text-primary">{companyName}</span>
                            )}
                        </div>
                        {/* Mobile Nav */}
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
                "hidden border-r bg-card lg:flex flex-col transition-all duration-300 h-full",
                collapsed ? "w-[70px]" : "w-64"
            )}>
                {/* Desktop Logo */}
                <div className="flex h-16 shrink-0 items-center px-4 border-b gap-2 justify-between overflow-hidden">
                    {!collapsed && (
                        logo ? (
                            <div className="flex-1 flex justify-start items-center overflow-hidden">
                                <img
                                    src={logo}
                                    alt="Logo"
                                    className="max-h-10 max-w-full object-contain"
                                    style={{
                                        width: logoDims.width !== 'auto' ? logoDims.width : undefined,
                                        height: logoDims.height !== 'auto' ? logoDims.height : undefined
                                    }}
                                />
                            </div>
                        ) : (
                            <div className="flex-1 flex items-center gap-2 overflow-hidden">
                                <div className="h-8 w-8 shrink-0 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold">
                                    {companyName.charAt(0)}
                                </div>
                                <span className="font-bold text-lg truncate">{companyName}</span>
                            </div>
                        )
                    )}
                    {collapsed && (
                        icon ? (
                            <div className="w-full flex justify-center">
                                <img src={icon} alt="Icon" className="h-8 w-8 object-contain" />
                            </div>
                        ) : (
                            logo ? (
                                <div className="w-full flex justify-center">
                                    <img src={logo} alt="Logo" className="h-8 w-auto object-contain" />
                                </div>
                            ) : (
                                <span className="mx-auto font-bold text-primary">{companyName.charAt(0)}</span>
                            )
                        )
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
                <div className="flex-1 overflow-y-auto py-6">
                    <nav className="grid gap-1 px-3">
                        {filteredItems.map((item, index) => {
                            const isActive = location.pathname === item.href || location.pathname.startsWith(`${item.href}/`)
                            return (
                                <Link
                                    key={index}
                                    to={item.href}
                                    onClick={() => setMobileOpen(false)}
                                    className={cn(
                                        "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all relative group",
                                        isActive
                                            ? "bg-primary/10 text-primary" // Professional: colored text/bg tint instead of solid fill
                                            : "text-muted-foreground hover:bg-muted hover:text-foreground",
                                        collapsed && "justify-center px-2"
                                    )}
                                    title={collapsed ? item.name : undefined}
                                >
                                    {/* Active Indicator Bar (Left) */}
                                    {isActive && !collapsed && (
                                        <div className="absolute left-0 top-1/2 -translate-y-1/2 h-8 w-1 bg-primary rounded-r-full" />
                                    )}

                                    <item.icon className={cn(
                                        "h-4 w-4 flex-shrink-0 transition-colors",
                                        isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                                    )} />

                                    {!collapsed && (
                                        <span className={cn(
                                            "truncate",
                                            isActive && "font-bold"
                                        )}>
                                            {item.name}
                                        </span>
                                    )}
                                </Link>
                            )
                        })}
                    </nav>
                </div>

                {/* User Profile (Collapsed/Expanded) */}
                <div className="p-4 border-t">
                    <div className={cn("flex items-center gap-3", collapsed && "justify-center")}>
                        {!collapsed ? (
                            <>
                                <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs ring-2 ring-background">
                                    {currentUser?.name?.charAt(0) || 'U'}
                                </div>
                                <div className="overflow-hidden flex-1">
                                    <p className="text-sm font-medium truncate">{currentUser?.name}</p>
                                    <p className="text-xs text-muted-foreground truncate capitalize">{currentUser?.role}</p>
                                </div>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => { localStorage.removeItem('token'); navigate('/login'); }} title="Logout">
                                    <LogOut className="h-4 w-4" />
                                </Button>
                            </>
                        ) : (
                            <div className="flex flex-col gap-2 items-center">
                                <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs ring-2 ring-background">
                                    {currentUser?.name?.charAt(0) || 'U'}
                                </div>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => { localStorage.removeItem('token'); navigate('/login'); }} title="Logout">
                                    <LogOut className="h-4 w-4" />
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    )
}
