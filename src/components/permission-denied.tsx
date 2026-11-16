import { ShieldOff, ArrowLeft, LayoutDashboard } from 'lucide-react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { normalizeRoleKey } from '@/lib/nav-utils'
import { useAppStore } from '@/store'

const MODULE_NAMES: Record<string, string> = {
    dashboard: 'Dashboard',
    calendar: 'My Calendar',
    sales_dashboard: 'Sales Dashboard',
    user_tracker: 'User Tracker',
    screen_monitoring: 'Screen Monitoring',
    clients: 'Clients',
    projects: 'Projects',
    products: 'Digital Products',
    tasks: 'Tasks',
    my_day: 'My Day',
    templates: 'Project Templates',
    leads: 'Leads',
    leads_form: 'Lead Forms',
    sales_automations: 'Sales Automations',
    contracts: 'Contracts Vault',
    quotations: 'Quotations',
    campaigns: 'Email Campaigns',
    invoices: 'Invoices',
    credit_notes: 'Credit Notes',
    vendor_bills: 'Vendor Bills',
    gst_reports: 'GST & P&L',
    expenses: 'Expenses',
    payroll: 'Payroll',
    billing_settings: 'Billing Settings',
    amc: 'AMC',
    domains: 'Domains',
    hosting: 'Hosting',
    expiry_alerts: 'Expiry Alerts',
    team: 'Team',
    attendance: 'Attendance',
    time_tracking: 'Time Tracking',
    capacity_planning: 'Capacity Planning',
    approvals: 'Approvals',
    offer_letters: 'Offer Letters',
    goals: 'Goals & OKRs',
    tickets: 'Support Tickets',
    project_chat: 'Project Chat',
    chat: 'Live Chat',
    reports: 'Reports',
    files: 'Files',
    ai_assistant: 'AI Assistant',
    roles: 'Roles & Permissions',
    settings: 'Settings',
    work_audit: 'Employee Activity Log',
}

function homePathForRole(role?: string | null, pathname?: string) {
    const roleKey = normalizeRoleKey(role)
    if (roleKey === 'client') return '/client/dashboard'
    if (roleKey === 'employee' || (pathname || '').startsWith('/employee')) return '/employee/dashboard'
    return '/dashboard'
}

export function PermissionDenied({
    module,
    title = 'Permission Denied',
    description,
}: {
    module?: string
    title?: string
    description?: string
}) {
    const navigate = useNavigate()
    const location = useLocation()
    const currentUser = useAppStore((s) => s.currentUser)
    const featureName = module ? (MODULE_NAMES[module] || module.replace(/_/g, ' ')) : 'this feature'
    const home = homePathForRole(currentUser?.role, location.pathname)

    return (
        <div className="flex min-h-[60vh] items-center justify-center p-6">
            <div className="w-full max-w-lg rounded-2xl border bg-card p-8 text-center shadow-sm">
                <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                    <ShieldOff className="h-8 w-8" />
                </div>
                <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
                <p className="mt-2 text-sm text-muted-foreground">
                    {description || (
                        <>
                            Aapke paas <span className="font-semibold text-foreground">{featureName}</span> access karne ki permission nahi hai.
                            Admin se Roles &amp; Permissions mein access request karein.
                        </>
                    )}
                </p>
                <p className="mt-3 rounded-lg bg-muted/60 px-3 py-2 text-xs font-medium text-muted-foreground">
                    Permission Denied — You do not have permission to view this page.
                </p>
                <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
                    <Button variant="outline" onClick={() => navigate(-1)}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Go Back
                    </Button>
                    <Button onClick={() => navigate(home)}>
                        <LayoutDashboard className="mr-2 h-4 w-4" />
                        Go to Dashboard
                    </Button>
                </div>
            </div>
        </div>
    )
}

export default PermissionDenied
