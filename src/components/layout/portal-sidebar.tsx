import { useState, useEffect, useMemo } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/store'
import api from '@/lib/api-client'
import { usePermissions, performAppLogout } from '@/hooks/use-permissions'
import { isNavItemActive } from '@/lib/nav-utils'
import {
    applyCompanyBranding,
    filterNavItems,
    type SidebarNavItem,
} from './nav-items'

export interface SidebarProps {
    collapsed: boolean
    setCollapsed: (v: boolean) => void
    mobileOpen: boolean
    setMobileOpen: (v: boolean) => void
}

interface PortalSidebarConfig extends SidebarProps {
    navItems: SidebarNavItem[]
    defaultCompanyName: string
    mobileBadge: string
    desktopBadge: string
    fallbackAvatarChar: string
    fixedRoleBadge?: string
}

export function PortalSidebar({
    collapsed,
    setCollapsed,
    mobileOpen,
    setMobileOpen,
    navItems,
    defaultCompanyName,
    mobileBadge,
    desktopBadge,
    fallbackAvatarChar,
    fixedRoleBadge,
}: PortalSidebarConfig) {
    const location = useLocation()
    const navigate = useNavigate()
    const currentUser = useAppStore((s) => s.currentUser)
    const settings = useAppStore((s) => s.settings)
    const setSettings = useAppStore((s) => s.setSettings)
    const { permissions } = usePermissions()

    const [logo, setLogo] = useState<string | null>(null)
    const [icon, setIcon] = useState<string | null>(null)
    const [companyName, setCompanyName] = useState(defaultCompanyName)
    const [logoDims, setLogoDims] = useState({ width: 'auto', height: '32px' })

    useEffect(() => {
        const applyCp = (cp: any) => {
            const branding = applyCompanyBranding(cp)
            if (!branding) return
            setLogo(branding.logo)
            setIcon(branding.icon)
            if (branding.name) setCompanyName(branding.name)
            setLogoDims({ width: branding.width, height: branding.height })
        }

        if (settings?.companyProfile) {
            applyCp(settings.companyProfile)
            return
        }

        api.get('/settings')
            .then((res) => {
                if (res.data) setSettings(res.data)
                applyCp(res.data?.companyProfile)
            })
            .catch((err) => console.error('Branding fetch error', err))
    }, [settings, setSettings])

    const filteredItems = useMemo(
        () => filterNavItems(navItems, permissions, currentUser?.role),
        [navItems, permissions, currentUser?.role]
    )

    const allHrefs = useMemo(() => filteredItems.map((item) => item.href), [filteredItems])

    const handleLogout = () => performAppLogout(navigate, currentUser?.role)

    const renderNavList = (isMobile: boolean) =>
        filteredItems.map((item, index) => {
            const isActive = isNavItemActive(location.pathname, item.href, allHrefs)
            const prevCategory = index > 0 ? filteredItems[index - 1]?.category : undefined
            const showHeader = (isMobile || !collapsed) && !!item.category && item.category !== prevCategory
            const Icon = item.icon

            return (
                <div key={item.href + item.name}>
                    {showHeader && (
                        <div className={cn(
                            'pb-1 px-2.5 flex items-center justify-between',
                            index === 0 ? 'pt-1' : 'pt-3'
                        )}>
                            <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground/60 font-sans">
                                {item.category}
                            </span>
                        </div>
                    )}
                    <Link
                        to={item.href}
                        onClick={isMobile ? () => setMobileOpen(false) : undefined}
                        className={cn(
                            'flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs font-semibold transition-all relative group',
                            isActive
                                ? 'clay-nav-active font-bold text-white shadow-md'
                                : 'text-foreground/80 hover:text-foreground hover:bg-card/80 hover:shadow-xs',
                            !isMobile && collapsed && 'justify-center px-1.5 py-2 h-10 w-10 mx-auto mb-1'
                        )}
                        title={!isMobile && collapsed ? item.name : undefined}
                    >
                        <div className={cn(
                            'h-7 w-7 rounded-lg flex items-center justify-center shrink-0 transition-all',
                            isActive
                                ? 'bg-white/20 text-white shadow-xs'
                                : 'text-muted-foreground group-hover:text-primary group-hover:bg-primary/10'
                        )}>
                            <Icon className="h-4 w-4" />
                        </div>

                        {(isMobile || !collapsed) && (
                            <span className={cn(
                                'truncate font-bold tracking-tight text-[12px] flex-1',
                                isActive ? 'text-white' : 'text-foreground/80 group-hover:text-foreground'
                            )}>
                                {item.name}
                            </span>
                        )}

                        {isActive && (isMobile || !collapsed) && (
                            <span className="h-1.5 w-1.5 rounded-full bg-white shrink-0 shadow-xs" />
                        )}
                    </Link>
                </div>
            )
        })

    const roleText = fixedRoleBadge || currentUser?.role || 'User'

    const renderProfileFooter = (isCollapsedDesktop: boolean) => {
        if (isCollapsedDesktop) {
            return (
                <div className="flex flex-col gap-2 items-center py-1">
                    <div className="relative">
                        <div
                            className="clay-icon h-9 w-9 rounded-xl bg-primary/15 text-primary flex items-center justify-center font-extrabold text-xs"
                            title={currentUser?.name}
                        >
                            {currentUser?.name?.charAt(0) || fallbackAvatarChar}
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
            )
        }

        return (
            <div className="clay-card p-2.5 rounded-2xl flex items-center gap-2.5 bg-card/90">
                <div className="relative shrink-0">
                    <div className="clay-icon h-9 w-9 rounded-xl bg-primary/15 text-primary flex items-center justify-center font-extrabold text-xs">
                        {currentUser?.name?.charAt(0) || fallbackAvatarChar}
                    </div>
                    <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 border-2 border-card" />
                </div>
                <div className="min-w-0 flex-1">
                    <p className="text-xs font-extrabold text-foreground truncate leading-tight">
                        {currentUser?.name}
                    </p>
                    <span className="clay-badge text-[9px] font-bold uppercase px-1.5 py-0.2 bg-muted text-muted-foreground truncate leading-tight mt-0.5 inline-block">
                        {roleText}
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
        )
    }

    return (
        <>
            {/* Mobile Sidebar Overlay & Drawer */}
            <div
                className={cn(
                    'fixed inset-0 z-[100] transition-opacity duration-300 lg:hidden',
                    mobileOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
                )}
                onClick={() => setMobileOpen(false)}
            >
                <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md" />
                <div
                    className={cn(
                        'fixed inset-y-0 left-0 flex w-72 flex-col bg-card/95 backdrop-blur-2xl shadow-2xl transition-transform duration-300 ease-in-out z-[101] border-r border-border/50',
                        mobileOpen ? 'translate-x-0' : '-translate-x-full'
                    )}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="flex h-16 shrink-0 items-center px-4 border-b border-border/40 justify-between gap-2">
                        <div className={cn('flex items-center gap-2.5 min-w-0 flex-1', logo && 'justify-center')}>
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
                                            {mobileBadge}
                                        </span>
                                    </div>
                                </>
                            )}
                        </div>
                        <button
                            onClick={() => setMobileOpen(false)}
                            className="clay-btn h-8 w-8 rounded-xl bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-all shrink-0 active:scale-95"
                            aria-label="Close navigation menu"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5 scrollbar-hide">
                        {renderNavList(true)}
                    </div>

                    <div className="p-3 border-t border-border/40 bg-card/40">
                        {renderProfileFooter(false)}
                    </div>
                </div>
            </div>

            {/* Desktop Claymorphic Sidebar */}
            <aside
                className={cn(
                    'hidden border-r border-border/50 bg-card/95 backdrop-blur-xl lg:flex flex-col transition-all duration-300 h-full relative z-20 shadow-xs select-none',
                    collapsed ? 'w-[72px]' : 'w-64'
                )}
            >
                <div className="flex h-16 shrink-0 items-center px-3.5 border-b border-border/40 gap-2 justify-between overflow-hidden bg-card/50">
                    {!collapsed ? (
                        <div className={cn('flex items-center gap-2.5 min-w-0 flex-1', logo && 'justify-center')}>
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
                                            {desktopBadge}
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
                                <div
                                    className="clay-icon h-9 w-9 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center text-white font-extrabold text-sm shadow-sm"
                                    title={companyName}
                                >
                                    {companyName.charAt(0)}
                                </div>
                            )}
                        </div>
                    )}

                    {!collapsed && (
                        <button
                            onClick={() => setCollapsed(true)}
                            className="hidden lg:flex clay-btn h-8 w-8 rounded-xl bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground items-center justify-center transition-all shrink-0 active:scale-95 shadow-xs"
                            title="Collapse Sidebar"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </button>
                    )}
                </div>

                {collapsed && (
                    <div className="flex justify-center py-2 border-b border-border/30 bg-muted/20">
                        <button
                            onClick={() => setCollapsed(false)}
                            className="clay-btn h-7 w-7 rounded-lg bg-card hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-all active:scale-95 shadow-xs"
                            title="Expand Sidebar"
                        >
                            <ChevronRight className="h-3.5 w-3.5" />
                        </button>
                    </div>
                )}

                <div className="flex-1 overflow-y-auto px-2.5 py-3 space-y-0.5 scrollbar-hide">
                    {renderNavList(false)}
                </div>

                <div className="p-2.5 border-t border-border/40 bg-card/40">
                    {renderProfileFooter(collapsed)}
                </div>
            </aside>
        </>
    )
}

