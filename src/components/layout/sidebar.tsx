import {
    LayoutDashboard,
    Users,
    Briefcase,
    CheckSquare,
    Clock,
    Monitor,
    FileText,
    Settings,
    FolderOpen,
    LifeBuoy,
    BarChart,
    Wallet,
    Target,
    ChevronLeft,
    ChevronRight,
    MessageCircle,
    MessageSquare,
    LogOut,
    Activity,
    Shield,
    Globe,
    BellRing,
    Brain,
    FileSignature,
    Trophy,
    Package,
    Server,
    Sparkles,
    Zap
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
    const { currentUser, settings } = useAppStore()
    const [logo, setLogo] = useState<string | null>(null)
    const [icon, setIcon] = useState<string | null>(null)
    const [companyName, setCompanyName] = useState('Nexprism')

    const [logoDims, setLogoDims] = useState({ width: 'auto', height: '32px' })
    const [permissions, setPermissions] = useState<any>(null)

    const applyCompanyProfile = (cp: any, rolesData?: any) => {
        if (cp) {
            setLogo(cp.logo || null)
            setIcon(cp.icon || null)
            if (cp.name) setCompanyName(cp.name)
            setLogoDims({
                width: cp.logoWidth || 'auto',
                height: cp.logoHeight || '32px',
            })
            if (cp.themeColor) {
                const hsl = hexToHSL(cp.themeColor)
                if (hsl) document.documentElement.style.setProperty('--primary', hsl)
            }
        }

        if (currentUser?.role && currentUser.role !== 'owner' && rolesData) {
            const userRole = (currentUser.role || '').toLowerCase().replace(/[\s_]+/g, '');
            const role = rolesData.find((r: any) => {
                const rName = (r.name || '').toLowerCase().replace(/[\s_]+/g, '');
                const rLabel = (r.label || '').toLowerCase().replace(/[\s_]+/g, '');
                return rName === userRole || rLabel === userRole;
            });
            if (role) setPermissions(role.permissions || {});
        }
    }

    useEffect(() => {
        if (settings?.companyProfile) {
            applyCompanyProfile(settings.companyProfile, settings.roles)
            return
        }
        api.get('/settings').then(res => {
            applyCompanyProfile(res.data?.companyProfile, res.data?.roles)
        }).catch(err => console.error("Logo fetch error", err))
    }, [currentUser, settings])

    const navItems = [
        { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, category: 'Executive' },
        { name: 'My Calendar', href: '/calendar', icon: Clock, category: 'Executive' },
        { name: 'Sales Dashboard', href: '/sales-dashboard', icon: Target, category: 'Executive' },
        { name: 'User Tracker', href: '/user-tracker', icon: Activity, category: 'Executive' },
        { name: 'Screen Monitoring', href: '/screen-monitoring', icon: Monitor, category: 'Executive' },

        { name: 'Clients', href: '/clients', icon: Users, category: 'Work & Clients' },
        { name: 'Projects', href: '/projects', icon: Briefcase, category: 'Work & Clients' },
        { name: 'Digital Products', href: '/products', icon: Package, category: 'Work & Clients' },
        { name: 'Tasks', href: '/tasks', icon: CheckSquare, category: 'Work & Clients' },
        { name: 'My Day', href: '/tasks/my-day', icon: Clock, category: 'Work & Clients' },

        { name: 'Leads', href: '/leads', icon: Target, category: 'Sales & Pipeline' },
        { name: 'Sales Automations', href: '/sales/automations', icon: Zap, category: 'Sales & Pipeline' },
        { name: 'Contracts Vault', href: '/sales/contracts', icon: FileSignature, category: 'Sales & Pipeline' },
        { name: 'Quotations', href: '/quotations', icon: FileText, category: 'Sales & Pipeline' },
        { name: 'Email Campaigns', href: '/campaigns', icon: MessageSquare, category: 'Sales & Pipeline' },

        { name: 'Invoices', href: '/invoices', icon: FileText, category: 'Financial Hub' },
        { name: 'Credit Notes', href: '/credit-notes', icon: FileText, category: 'Financial Hub' },
        { name: 'Vendor Bills', href: '/vendor-bills', icon: Wallet, category: 'Financial Hub' },
        { name: 'GST & P&L', href: '/reports/gst', icon: BarChart, category: 'Financial Hub' },
        { name: 'Expenses', href: '/expenses', icon: Wallet, category: 'Financial Hub' },
        { name: 'Payroll', href: '/salary', icon: Wallet, category: 'Financial Hub' },

        { name: 'AMC', href: '/amc', icon: Shield, category: 'Operations & Assets' },
        { name: 'Domains', href: '/domains', icon: Globe, category: 'Operations & Assets' },
        { name: 'Hosting', href: '/hosting', icon: Server, category: 'Operations & Assets' },
        { name: 'Expiry Alerts', href: '/expiry-alerts', icon: BellRing, category: 'Operations & Assets' },

        { name: 'Team', href: '/team?tab=members', icon: Users, category: 'Team & HR' },
        { name: 'Attendance', href: '/attendance', icon: Clock, category: 'Team & HR' },
        { name: 'Time Tracking', href: '/time', icon: Clock, category: 'Team & HR' },
        { name: 'Capacity Planning', href: '/team/capacity', icon: BarChart, category: 'Team & HR' },
        { name: 'Approvals', href: '/approvals', icon: FileSignature, category: 'Team & HR' },
        { name: 'Offer Letters', href: '/offer-letters', icon: Shield, category: 'Team & HR' },
        { name: 'Goals & OKRs', href: '/goals', icon: Trophy, category: 'Team & HR' },

        { name: 'Support Tickets', href: '/tickets', icon: LifeBuoy, category: 'Communications' },
        { name: 'Project Chat', href: '/project-chat', icon: MessageCircle, category: 'Communications' },
        { name: 'Live Chat', href: '/chat', icon: MessageSquare, category: 'Communications' },

        { name: 'Reports', href: '/reports', icon: BarChart, category: 'System & Intelligence' },
        { name: 'Files', href: '/files', icon: FolderOpen, category: 'System & Intelligence' },
        { name: 'AI Assistant', href: '/ai-assistant', icon: Brain, category: 'System & Intelligence' },
        { name: 'Roles & Permissions', href: '/settings/roles', icon: Shield, category: 'System & Intelligence' },
        { name: 'Settings', href: '/settings', icon: Settings, category: 'System & Intelligence' },
    ]

    const filteredItems = navItems.filter(item => {
        if (currentUser?.role === 'owner' || currentUser?.role === 'admin') return true

        // Hardcoded restrictions for client role to ensure security
        if (currentUser?.role === 'client') {
            const allowedForClient = [
                'Dashboard',
                'Projects',
                'Tasks',
                'Invoices',
                'Support Tickets',
                'Project Chat',
                'Files'
            ]
            return allowedForClient.includes(item.name)
        }

        if (!permissions && (currentUser?.role as string) !== 'owner') {
            return ['Dashboard'].includes(item.name)
        }

        const p = permissions
        switch (item.name) {
            case 'Dashboard': return !!p.dashboard?.view
            case 'My Calendar': return true
            case 'Sales Dashboard': return !!(p.leads?.view || p.dashboard?.view)
            case 'User Tracker': return !!p.user_tracker?.view
            case 'Screen Monitoring': return !!p.screen_monitoring?.view
            case 'Clients': return !!p.clients?.view
            case 'Projects': return !!p.projects?.view
            case 'Digital Products': return !!p.projects?.view
            case 'Tasks': return !!p.tasks?.view
            case 'My Day': return !!p.tasks?.view
            case 'Sales Automations': return !!p.leads?.view
            case 'Contracts Vault': return !!p.leads?.view
            case 'Credit Notes': return !!p.invoices?.view
            case 'Vendor Bills': return !!p.invoices?.view
            case 'GST & P&L': return !!p.reports?.view
            case 'Team': return !!p.team?.view
            case 'Capacity Planning': return !!(p.capacity?.view || p.team?.view)
            case 'Approvals': return !!(p.approvals?.view || p.payroll?.view)
            case 'Email Campaigns': return !!(p.campaigns?.view || p.leads?.view)
            case 'Goals & OKRs': return !!(p.goals?.view || p.projects?.view)
            case 'Offer Letters': return !!p.team?.view
            case 'Attendance': return !!p.attendance?.view
            case 'Time Tracking': return !!p.time_tracking?.view
            case 'Invoices': return !!p.invoices?.view
            case 'AMC': return !!p.amc?.view
            case 'Domains': return !!p.domains?.view
            case 'Expiry Alerts': return !!p.expiry_alerts?.view
            case 'Hosting': return !!p.hosting?.view
            case 'Quotations': return !!p.quotations?.view
            case 'Leads': return !!p.leads?.view
            case 'Expenses': return !!p.expenses?.view
            case 'Payroll': return !!p.payroll?.view
            case 'Support Tickets': return !!p.tickets?.view
            case 'Project Chat': return !!p.project_chat?.view
            case 'Live Chat': return !!p.chat?.view
            case 'Reports': return !!p.reports?.view
            case 'Files': return !!p.files?.view
            case 'Settings': return !!p.settings?.view
            case 'Roles & Permissions': return !!p.roles?.view
            case 'AI Assistant': return !!p.ai_assistant?.use
            default: return false
        }
    })

    // Group items by category to render structured visual blocks
    let lastCategory = ''

    return (
        <>
            {/* Mobile Sidebar Overlay & Drawer */}
            <div 
                className={cn(
                    "fixed inset-0 z-[100] transition-opacity duration-300 lg:hidden",
                    mobileOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
                )} 
                onClick={() => setMobileOpen(false)}
            >
                <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md" />
                <div 
                    className={cn(
                        "fixed inset-y-0 left-0 flex w-72 flex-col bg-card/95 backdrop-blur-2xl shadow-2xl transition-transform duration-300 ease-in-out z-[101] border-r border-border/50",
                        mobileOpen ? "translate-x-0" : "-translate-x-full"
                    )}
                    onClick={e => e.stopPropagation()}
                >
                    {/* Mobile Brand Header */}
                    <div className="flex h-16 shrink-0 items-center px-4 border-b border-border/40 justify-between">
                        <div className={cn("flex items-center gap-2.5 min-w-0 flex-1", logo && "justify-center")}>
                            {logo ? (
                                <div className="flex items-center justify-center min-w-0 max-w-[180px]">
                                    <img
                                        src={logo}
                                        alt={companyName}
                                        className="max-h-10 w-auto max-w-full object-contain"
                                        style={{
                                            width: logoDims.width !== 'auto' ? logoDims.width : undefined,
                                            height: logoDims.height !== 'auto' ? logoDims.height : undefined,
                                        }}
                                    />
                                </div>
                            ) : (
                                <>
                                    <div className="clay-icon h-9 w-9 rounded-xl bg-gradient-to-br from-primary via-primary/90 to-primary/80 flex items-center justify-center text-white font-extrabold text-sm shadow-sm shrink-0">
                                        {companyName.charAt(0)}
                                    </div>
                                    <div className="min-w-0">
                                        <span className="text-sm font-extrabold text-foreground tracking-tight block truncate">
                                            {companyName}
                                        </span>
                                        <span className="clay-badge text-[9px] font-extrabold tracking-wider uppercase px-2 py-0.5 bg-primary/10 text-primary border-primary/20 inline-block">
                                            CRM Workspace
                                        </span>
                                    </div>
                                </>
                            )}
                        </div>
                        <button
                            onClick={() => setMobileOpen(false)}
                            className="clay-btn h-8 w-8 rounded-xl bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-all shrink-0 active:scale-95"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </button>
                    </div>

                    {/* Mobile Nav Links */}
                    <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1 scrollbar-hide">
                        {filteredItems.map((item, index) => {
                            const isActive = location.pathname === item.href || location.pathname.startsWith(`${item.href}/`)
                            return (
                                <Link
                                    key={index}
                                    to={item.href}
                                    onClick={() => setMobileOpen(false)}
                                    className={cn(
                                        "flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold transition-all relative group",
                                        isActive
                                            ? "clay-nav-active font-bold text-white shadow-md"
                                            : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                                    )}
                                >
                                    <div className={cn(
                                        "h-7 w-7 rounded-lg flex items-center justify-center shrink-0 transition-all",
                                        isActive
                                            ? "bg-white/20 text-white shadow-xs"
                                            : "text-muted-foreground group-hover:text-primary group-hover:bg-primary/10"
                                    )}>
                                        <item.icon className="h-4 w-4" />
                                    </div>
                                    <span className={cn(
                                        "truncate font-bold tracking-tight text-[12px] flex-1",
                                        isActive ? "text-white" : "text-foreground/80 group-hover:text-foreground"
                                    )}>
                                        {item.name}
                                    </span>
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
                                    {currentUser?.name?.charAt(0) || 'U'}
                                </div>
                                <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 border-2 border-card" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-xs font-extrabold text-foreground truncate leading-tight">
                                    {currentUser?.name}
                                </p>
                                <span className="clay-badge text-[9px] font-bold uppercase px-1.5 py-0.2 bg-muted text-muted-foreground truncate leading-tight mt-0.5 inline-block">
                                    {currentUser?.role}
                                </span>
                            </div>
                            <button
                                onClick={async () => {
                                    try {
                                        await api.post('/time-entries/stop-running')
                                    } catch (err) {
                                        console.error('Logout timer stop failed', err)
                                    } finally {
                                        localStorage.removeItem('token');
                                        navigate('/login');
                                    }
                                }}
                                className="clay-btn h-8 w-8 rounded-xl text-rose-500 hover:bg-rose-500 hover:text-white flex items-center justify-center transition-all shrink-0 active:scale-95 shadow-xs"
                                title="Logout"
                            >
                                <LogOut className="h-3.5 w-3.5" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Desktop Claymorphic Sidebar */}
            <aside 
                className={cn(
                    "hidden border-r border-border/50 bg-card/95 backdrop-blur-xl lg:flex flex-col transition-all duration-300 h-full relative z-20 shadow-xs",
                    collapsed ? "w-[72px]" : "w-64"
                )}
            >
                {/* Desktop Brand Header */}
                <div className="flex h-16 shrink-0 items-center px-3.5 border-b border-border/40 gap-2 justify-between overflow-hidden bg-card/50">
                    {!collapsed ? (
                        <div className={cn("flex items-center gap-2.5 min-w-0 flex-1", logo && "justify-center")}>
                            {logo ? (
                                <div className="flex items-center justify-center min-w-0 max-w-[180px]">
                                    <img
                                        src={logo}
                                        alt={companyName}
                                        className="max-h-10 w-auto max-w-full object-contain"
                                        style={{
                                            width: logoDims.width !== 'auto' ? logoDims.width : undefined,
                                            height: logoDims.height !== 'auto' ? logoDims.height : undefined,
                                        }}
                                    />
                                </div>
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
                                            Enterprise
                                        </span>
                                    </div>
                                </>
                            )}
                        </div>
                    ) : (
                        <div className="w-full flex justify-center">
                            {icon ? (
                                <div className="clay-icon h-9 w-9 rounded-xl bg-card flex items-center justify-center">
                                    <img src={icon} alt="Icon" className="h-6 w-6 object-contain" />
                                </div>
                            ) : (
                                <div className="clay-icon h-9 w-9 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center text-white font-extrabold text-sm shadow-sm">
                                    {companyName.charAt(0)}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Toggle Button */}
                    <button
                        onClick={() => setCollapsed(!collapsed)}
                        className="hidden lg:flex clay-btn h-8 w-8 rounded-xl bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground items-center justify-center transition-all shrink-0 active:scale-95 shadow-xs"
                        title={collapsed ? "Expand Sidebar" : "Collapse Sidebar"}
                    >
                        {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
                    </button>
                </div>

                {/* Desktop Nav Scrollable Container */}
                <div className="flex-1 overflow-y-auto px-2.5 py-3 space-y-0.5 scrollbar-hide">
                    {filteredItems.map((item, index) => {
                        const isActive = location.pathname === item.href || location.pathname.startsWith(`${item.href}/`)
                        const showHeader = !collapsed && item.category && item.category !== lastCategory
                        if (item.category) lastCategory = item.category

                        return (
                            <div key={index}>
                                {showHeader && (
                                    <div className="pt-3 pb-1 px-2.5 flex items-center justify-between">
                                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground/60 font-sans">
                                            {item.category}
                                        </span>
                                    </div>
                                )}
                                <Link
                                    to={item.href}
                                    className={cn(
                                        "flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs font-semibold transition-all relative group",
                                        isActive
                                            ? "clay-nav-active font-bold text-white shadow-md"
                                            : "text-foreground/80 hover:text-foreground hover:bg-card/80 hover:shadow-xs",
                                        collapsed && "justify-center px-1.5 py-2 h-10 w-10 mx-auto mb-1"
                                    )}
                                    title={collapsed ? item.name : undefined}
                                >
                                    <div className={cn(
                                        "h-7 w-7 rounded-lg flex items-center justify-center shrink-0 transition-all",
                                        isActive
                                            ? "bg-white/20 text-white shadow-xs"
                                            : "text-muted-foreground group-hover:text-primary group-hover:bg-primary/10"
                                    )}>
                                        <item.icon className="h-4 w-4" />
                                    </div>

                                    {!collapsed && (
                                        <span className={cn(
                                            "truncate font-bold tracking-tight text-[12px] flex-1",
                                            isActive ? "text-white" : "text-foreground/80 group-hover:text-foreground"
                                        )}>
                                            {item.name}
                                        </span>
                                    )}

                                    {isActive && !collapsed && (
                                        <span className="h-1.5 w-1.5 rounded-full bg-white shrink-0 shadow-xs" />
                                    )}
                                </Link>
                            </div>
                        )
                    })}
                </div>

                {/* Desktop User Profile Capsule Footer */}
                <div className="p-2.5 border-t border-border/40 bg-card/40">
                    {!collapsed ? (
                        <div className="clay-card p-2.5 rounded-2xl flex items-center gap-2.5 bg-card/90">
                            <div className="relative shrink-0">
                                <div className="clay-icon h-9 w-9 rounded-xl bg-primary/15 text-primary flex items-center justify-center font-extrabold text-xs">
                                    {currentUser?.name?.charAt(0) || 'U'}
                                </div>
                                <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 border-2 border-card" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-xs font-extrabold text-foreground truncate leading-tight">
                                    {currentUser?.name}
                                </p>
                                <span className="clay-badge text-[9px] font-bold uppercase px-1.5 py-0.2 bg-muted text-muted-foreground truncate leading-tight mt-0.5 inline-block">
                                    {currentUser?.role}
                                </span>
                            </div>
                            <button
                                onClick={async () => {
                                    try {
                                        await api.post('/time-entries/stop-running')
                                    } catch (err) {
                                        console.error('Logout timer stop failed', err)
                                    } finally {
                                        localStorage.removeItem('token');
                                        navigate('/login');
                                    }
                                }}
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
                                    {currentUser?.name?.charAt(0) || 'U'}
                                </div>
                                <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 border-2 border-card" />
                            </div>
                            <button
                                onClick={async () => {
                                    try {
                                        await api.post('/time-entries/stop-running')
                                    } catch (err) {
                                        console.error('Logout timer stop failed', err)
                                    } finally {
                                        localStorage.removeItem('token');
                                        navigate('/login');
                                    }
                                }}
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
