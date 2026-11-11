import type { ComponentType } from 'react'
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
    MessageCircle,
    MessageSquare,
    Activity,
    Shield,
    Globe,
    BellRing,
    Brain,
    FileSignature,
    Trophy,
    Package,
    Server,
    Zap,
    Calendar,
    Layers,
    Timer,
    UserCheck,
    KeyRound,
    ClipboardList,
} from 'lucide-react'
import { canViewWithPermissions } from '@/hooks/use-permissions'
import { isAdminOrOwnerRole, normalizeRoleKey } from '@/lib/nav-utils'

export interface SidebarNavItem {
    name: string
    href: string
    icon: ComponentType<{ className?: string }>
    category: string
    module: string
    alwaysVisible?: boolean
}

export function hexToHSL(hex: string) {
    if (!hex) return null
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    if (!result) return null
    let r = parseInt(result[1], 16)
    let g = parseInt(result[2], 16)
    let b = parseInt(result[3], 16)
    r /= 255
    g /= 255
    b /= 255
    const max = Math.max(r, g, b)
    const min = Math.min(r, g, b)
    let h = 0
    let s = 0
    const l = (max + min) / 2
    if (max !== min) {
        const d = max - min
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break
            case g: h = (b - r) / d + 2; break
            case b: h = (r - g) / d + 4; break
        }
        h /= 6
    }
    if (isNaN(h) || isNaN(s) || isNaN(l)) return null
    return `${(h * 360).toFixed(1)} ${(s * 100).toFixed(1)}% ${(l * 100).toFixed(1)}%`
}

export function applyCompanyBranding(cp: any) {
    if (!cp) return null
    if (cp.themeColor) {
        const hsl = hexToHSL(cp.themeColor)
        if (hsl) document.documentElement.style.setProperty('--primary', hsl)
    }
    return {
        logo: cp.logo || null,
        icon: cp.icon || null,
        name: cp.name || null,
        width: cp.logoWidth || 'auto',
        height: cp.logoHeight || '32px',
    }
}

/**
 * Master staff navigation catalog shared by DashboardLayout (baseUrl='') and
 * EmployeeLayout (baseUrl='/employee') so both portals expose identical,
 * permission-driven modules with portal-safe URLs.
 */
export function buildStaffNavItems(baseUrl: '' | '/employee'): SidebarNavItem[] {
    const isEmployee = baseUrl === '/employee'
    const p = (path: string) => `${baseUrl}${path}`

    const items: SidebarNavItem[] = [
        { name: 'Dashboard', href: p('/dashboard'), icon: LayoutDashboard, category: 'Executive', module: 'dashboard', alwaysVisible: isEmployee },
        { name: 'My Calendar', href: p('/calendar'), icon: Calendar, category: 'Executive', module: 'calendar' },
        { name: 'Sales Dashboard', href: p('/sales-dashboard'), icon: Target, category: 'Executive', module: 'sales_dashboard' },
        { name: 'User Tracker', href: p('/user-tracker'), icon: Activity, category: 'Executive', module: 'user_tracker' },
        { name: 'Screen Monitoring', href: p('/screen-monitoring'), icon: Monitor, category: 'Executive', module: 'screen_monitoring' },

        { name: 'Clients', href: p('/clients'), icon: Users, category: 'Work & Clients', module: 'clients' },
        { name: isEmployee ? 'My Projects' : 'Projects', href: p('/projects'), icon: Briefcase, category: 'Work & Clients', module: 'projects' },
        { name: 'Project Templates', href: p('/projects/templates'), icon: Layers, category: 'Work & Clients', module: 'templates' },
        { name: 'Digital Products', href: p('/products'), icon: Package, category: 'Work & Clients', module: 'products' },
        { name: isEmployee ? 'My Tasks' : 'Tasks', href: p('/tasks'), icon: CheckSquare, category: 'Work & Clients', module: 'tasks' },
        { name: 'My Day', href: p('/tasks/my-day'), icon: Clock, category: 'Work & Clients', module: 'my_day' },

        { name: 'Leads', href: p('/leads'), icon: Target, category: 'Sales & Pipeline', module: 'leads' },
        { name: 'Sales Automations', href: p('/sales/automations'), icon: Zap, category: 'Sales & Pipeline', module: 'sales_automations' },
        { name: 'Contracts Vault', href: p('/sales/contracts'), icon: FileSignature, category: 'Sales & Pipeline', module: 'contracts' },
        { name: 'Quotations', href: p('/quotations'), icon: FileText, category: 'Sales & Pipeline', module: 'quotations' },
        { name: 'Email Campaigns', href: p('/campaigns'), icon: MessageSquare, category: 'Sales & Pipeline', module: 'campaigns' },

        { name: 'Invoices', href: p('/invoices'), icon: FileText, category: 'Financial Hub', module: 'invoices' },
        { name: 'Credit Notes', href: p('/credit-notes'), icon: FileText, category: 'Financial Hub', module: 'credit_notes' },
        { name: 'Vendor Bills', href: p('/vendor-bills'), icon: Wallet, category: 'Financial Hub', module: 'vendor_bills' },
        { name: 'GST & P&L', href: p('/reports/gst'), icon: BarChart, category: 'Financial Hub', module: 'gst_reports' },
        { name: 'Expenses', href: p('/expenses'), icon: Wallet, category: 'Financial Hub', module: 'expenses' },
        { name: isEmployee ? 'My Payroll' : 'Payroll', href: p('/salary'), icon: Wallet, category: 'Financial Hub', module: 'payroll' },

        { name: 'AMC', href: p('/amc'), icon: Shield, category: 'Operations & Assets', module: 'amc' },
        { name: 'Domains', href: p('/domains'), icon: Globe, category: 'Operations & Assets', module: 'domains' },
        { name: 'Hosting', href: p('/hosting'), icon: Server, category: 'Operations & Assets', module: 'hosting' },
        { name: 'Expiry Alerts', href: p('/expiry-alerts'), icon: BellRing, category: 'Operations & Assets', module: 'expiry_alerts' },

        { name: 'Team', href: p('/team?tab=members'), icon: Users, category: 'Team & HR', module: 'team' },
        { name: 'Attendance', href: p('/attendance'), icon: UserCheck, category: 'Team & HR', module: 'attendance' },
        { name: 'Time Tracking', href: p('/time'), icon: Timer, category: 'Team & HR', module: 'time_tracking' },
        { name: 'Capacity Planning', href: p('/team/capacity'), icon: BarChart, category: 'Team & HR', module: 'capacity_planning' },
        { name: 'Approvals', href: p('/approvals'), icon: FileSignature, category: 'Team & HR', module: 'approvals' },
        { name: 'Offer Letters', href: p('/offer-letters'), icon: Shield, category: 'Team & HR', module: 'offer_letters' },
        { name: 'Goals & OKRs', href: p('/goals'), icon: Trophy, category: 'Team & HR', module: 'goals' },

        { name: 'Support Tickets', href: p('/tickets'), icon: LifeBuoy, category: 'Communications', module: 'tickets' },
        { name: 'Project Chat', href: p('/project-chat'), icon: MessageCircle, category: 'Communications', module: 'project_chat' },
        { name: 'Live Chat', href: p('/chat'), icon: MessageSquare, category: 'Communications', module: 'chat' },

        { name: 'Reports', href: p('/reports'), icon: BarChart, category: 'System & Intelligence', module: 'reports' },
        { name: isEmployee ? 'My Files' : 'Files', href: p('/files'), icon: FolderOpen, category: 'System & Intelligence', module: 'files' },
        { name: 'AI Assistant', href: p('/ai-assistant'), icon: Brain, category: 'System & Intelligence', module: 'ai_assistant' },
    ]

    if (!isEmployee) {
        items.push(
            { name: 'Employee Activity Log', href: '/work-audit', icon: ClipboardList, category: 'System & Intelligence', module: '__admin_audit__' },
            { name: 'Roles & Permissions', href: '/settings/roles', icon: Shield, category: 'System & Intelligence', module: 'roles' },
            { name: 'Settings', href: '/settings', icon: Settings, category: 'System & Intelligence', module: 'settings' },
            { name: 'Profile Settings', href: '/profile', icon: KeyRound, category: 'Account', module: '__profile__', alwaysVisible: true }
        )
    } else {
        items.push(
            { name: 'Workspace Settings', href: '/employee/workspace-settings', icon: Settings, category: 'System & Intelligence', module: 'settings' },
            { name: 'Profile Settings', href: '/employee/settings', icon: KeyRound, category: 'Account', module: '__profile__', alwaysVisible: true }
        )
    }

    return items
}

export function buildClientNavItems(): SidebarNavItem[] {
    return [
        { name: 'Dashboard', href: '/client/dashboard', icon: LayoutDashboard, category: 'Workspace', module: 'dashboard', alwaysVisible: true },
        { name: 'Projects', href: '/client/projects', icon: Briefcase, category: 'Workspace', module: 'projects' },
        { name: 'Tasks', href: '/client/tasks', icon: CheckSquare, category: 'Workspace', module: 'tasks' },
        { name: 'Invoices', href: '/client/invoices', icon: FileText, category: 'Workspace', module: 'invoices' },
        { name: 'Project Chat', href: '/client/project-chat', icon: MessageCircle, category: 'Support & Comms', module: 'project_chat' },
        { name: 'Files', href: '/client/files', icon: FolderOpen, category: 'Support & Comms', module: 'files' },
        { name: 'Support Tickets', href: '/client/tickets', icon: LifeBuoy, category: 'Support & Comms', module: 'tickets' },
        { name: 'Profile Settings', href: '/client/settings', icon: Settings, category: 'Account', module: '__profile__', alwaysVisible: true },
    ]
}

export function filterNavItems(
    items: SidebarNavItem[],
    permissions: Record<string, any> | null,
    role: string | undefined | null
): SidebarNavItem[] {
    const isClient = normalizeRoleKey(role) === 'client'
    const adminOrOwner = isAdminOrOwnerRole(role)
    const canViewSystemSettings = canViewWithPermissions(permissions, role, 'settings')

    return items.filter((item) => {
        if (item.module === '__admin_audit__') {
            return adminOrOwner
        }

        // Hide redundant personal Profile Settings item on admin sidebar when full Workspace Settings is already shown
        if (item.module === '__profile__' && canViewSystemSettings && item.href === '/profile') {
            return false
        }

        if (item.alwaysVisible) return true

        if (adminOrOwner) return true

        if (isClient) {
            const clientAllowedModules = ['dashboard', 'projects', 'tasks', 'invoices', 'tickets', 'project_chat', 'files', '__profile__']
            if (!clientAllowedModules.includes(item.module)) return false
            return canViewWithPermissions(permissions, role, item.module)
        }

        if (!permissions) {
            return item.module === 'dashboard' || !!item.alwaysVisible
        }

        return canViewWithPermissions(permissions, role, item.module)
    })
}

