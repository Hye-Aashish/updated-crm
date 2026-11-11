import { useNavigate, useLocation } from 'react-router-dom'
import { LayoutDashboard, Briefcase, CheckSquare, MessageSquare, LifeBuoy } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/store'
import { useMemo, type ComponentType } from 'react'
import { usePermissions } from '@/hooks/use-permissions'
import { isNavItemActive, isAdminOrOwnerRole, resolvePortalPrefix } from '@/lib/nav-utils'

type NavItem = {
    label: string
    icon: ComponentType<{ className?: string }>
    path: string
    module: string
}

export function BottomNav() {
    const navigate = useNavigate()
    const location = useLocation()
    const currentUser = useAppStore((s) => s.currentUser)
    const { permissions, canView } = usePermissions()

    const role = currentUser?.role
    const baseUrl = resolvePortalPrefix(location.pathname, role)

    const filteredItems: NavItem[] = useMemo(() => {
        const items: NavItem[] = [
            { label: 'Home', icon: LayoutDashboard, path: `${baseUrl}/dashboard`, module: 'dashboard' },
            { label: 'Projects', icon: Briefcase, path: `${baseUrl}/projects`, module: 'projects' },
            { label: 'Tasks', icon: CheckSquare, path: `${baseUrl}/tasks`, module: 'tasks' },
        ]

        const hasProjectChat = canView('project_chat')
        const hasTickets = canView('tickets')
        if (hasProjectChat || (!permissions && isAdminOrOwnerRole(role))) {
            items.push({ label: 'Chat', icon: MessageSquare, path: `${baseUrl}/project-chat`, module: 'project_chat' })
        } else if (hasTickets) {
            items.push({ label: 'Tickets', icon: LifeBuoy, path: `${baseUrl}/tickets`, module: 'tickets' })
        }

        if (isAdminOrOwnerRole(role)) return items

        return items.filter((item) => {
            if (!permissions) return item.label === 'Home'
            if (item.label === 'Home' && baseUrl !== '') return true
            return canView(item.module)
        })
    }, [baseUrl, canView, permissions, role])

    const allPaths = useMemo(() => filteredItems.map((i) => i.path), [filteredItems])

    return (
        <nav
            className="md:hidden fixed bottom-0 inset-x-0 z-50 border-t border-border/60 bg-background/95 backdrop-blur-xl shadow-[0_-8px_30px_rgba(15,23,42,0.08)]"
            style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
            aria-label="Mobile navigation"
        >
            <div className="flex items-stretch justify-around h-16 px-1 max-w-lg mx-auto">
                {filteredItems.map((item) => {
                    const active = isNavItemActive(location.pathname, item.path, allPaths)
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
