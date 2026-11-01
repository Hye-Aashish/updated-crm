import { useNavigate, useLocation } from 'react-router-dom'
import { LayoutDashboard, Briefcase, CheckSquare, MessageSquare } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/store'
import { useState, useEffect, useMemo, type ComponentType } from 'react'
import api from '@/lib/api-client'

type NavItem = {
    label: string
    icon: ComponentType<{ className?: string }>
    path: string
}

export function BottomNav() {
    const navigate = useNavigate()
    const location = useLocation()
    const { currentUser, settings } = useAppStore()
    const [permissions, setPermissions] = useState<any>(null)

    useEffect(() => {
        const apply = (roles: any[]) => {
            if (currentUser?.role && roles) {
                const role = roles.find((r: any) => r.name === currentUser.role)
                if (role) setPermissions(role.permissions)
            }
        }
        if (settings?.roles) {
            apply(settings.roles)
            return
        }
        api.get('/settings').then(res => apply(res.data?.roles || [])).catch(() => {})
    }, [currentUser, settings])

    const role = currentUser?.role
    const isEmployeePortal = location.pathname.startsWith('/employee')
        || role === 'employee' || role === 'developer' || role === 'pm'
    const isClientPortal = location.pathname.startsWith('/client') || role === 'client'
    const baseUrl = isClientPortal ? '/client' : isEmployeePortal ? '/employee' : ''

    const navItems: NavItem[] = useMemo(() => [
        { label: 'Home', icon: LayoutDashboard, path: `${baseUrl}/dashboard`.replace('//', '/') },
        { label: 'Projects', icon: Briefcase, path: `${baseUrl}/projects`.replace('//', '/') },
        { label: 'Tasks', icon: CheckSquare, path: `${baseUrl}/tasks`.replace('//', '/') },
        { label: 'Chat', icon: MessageSquare, path: `${baseUrl}/project-chat`.replace('//', '/') },
    ], [baseUrl])

    const canView = (item: NavItem) => {
        if (role === 'owner' || role === 'admin' || isClientPortal) return true
        if (!permissions) return item.label === 'Home'
        const p = permissions
        switch (item.label) {
            case 'Home': return !!p.dashboard?.view
            case 'Projects': return !!p.projects?.view
            case 'Tasks': return !!p.tasks?.view
            case 'Chat': return !!(p.project_chat?.view || p.tickets?.view)
            default: return true
        }
    }

    const filteredItems = navItems.filter(canView)

    const isPathActive = (path: string) =>
        location.pathname === path || location.pathname.startsWith(`${path}/`)

    return (
        <nav
            className="md:hidden fixed bottom-0 inset-x-0 z-50 border-t border-border/60 bg-background/95 backdrop-blur-xl shadow-[0_-8px_30px_rgba(15,23,42,0.08)]"
            style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
            aria-label="Mobile navigation"
        >
            <div className="flex items-stretch justify-around h-16 px-1 max-w-lg mx-auto">
                {filteredItems.map((item) => {
                    const active = isPathActive(item.path)
                    return (
                        <button
                            key={item.label}
                            type="button"
                            onClick={() => navigate(item.path)}
                            className={cn(
                                'flex flex-col items-center justify-center flex-1 min-w-0 gap-0.5 py-1 transition-colors',
                                active ? 'text-primary' : 'text-muted-foreground'
                            )}
                        >
                            <div className={cn(
                                'flex h-9 w-9 items-center justify-center rounded-xl transition-all',
                                active ? 'bg-primary/10' : 'bg-transparent'
                            )}>
                                <item.icon className={cn('h-5 w-5', active && 'stroke-[2.5]')} />
                            </div>
                            <span className={cn(
                                'text-[10px] leading-none truncate max-w-[4.5rem]',
                                active ? 'font-bold' : 'font-medium'
                            )}>
                                {item.label}
                            </span>
                        </button>
                    )
                })}
            </div>
        </nav>
    )
}
