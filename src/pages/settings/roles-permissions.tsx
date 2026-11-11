import { useState, useEffect, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { 
    Plus, Save, Shield, Loader2, Building2, 
    FolderKanban, Trash2, Users, CreditCard, Globe, MessageSquare,
    LayoutDashboard, Briefcase, Target, Search, CheckCheck, XCircle,
    Check, X
} from 'lucide-react'
import api from '@/lib/api-client'
import { useToast } from '@/hooks/use-toast'
import { LeadVisibilitySettingsTab } from '@/components/team/lead-visibility-settings-tab'
import { appConfirm } from '@/lib/app-dialog'
import { invalidatePermissionsCache } from '@/hooks/use-permissions'
import { useAppStore } from '@/store'

// Complete module display names mapped 1-to-1 to sidebar navigation items
const MODULE_LABELS: Record<string, string> = {
    // Executive
    dashboard: 'Dashboard',
    calendar: 'My Calendar',
    sales_dashboard: 'Sales Dashboard',
    user_tracker: 'User Tracker',
    screen_monitoring: 'Screen Monitoring',

    // Work & Clients
    clients: 'Clients',
    projects: 'Projects',
    products: 'Digital Products',
    tasks: 'Tasks',
    my_day: 'My Day',
    templates: 'Project Templates',

    // Sales & Pipeline
    leads: 'Leads',
    leads_form: 'Lead Forms',
    sales_automations: 'Sales Automations',
    contracts: 'Contracts Vault',
    quotations: 'Quotations',
    campaigns: 'Email Campaigns',

    // Financial Hub
    invoices: 'Invoices',
    credit_notes: 'Credit Notes',
    vendor_bills: 'Vendor Bills',
    gst_reports: 'GST & P&L',
    expenses: 'Expenses',
    payroll: 'Payroll',
    billing_settings: 'Billing Settings',

    // Operations & Assets
    amc: 'AMC',
    domains: 'Domains',
    hosting: 'Hosting',
    expiry_alerts: 'Expiry Alerts',

    // Team & HR
    team: 'Team',
    attendance: 'Attendance',
    time_tracking: 'Time Tracking',
    capacity_planning: 'Capacity Planning',
    approvals: 'Approvals',
    offer_letters: 'Offer Letters',
    goals: 'Goals & OKRs',

    // Communications
    tickets: 'Support Tickets',
    project_chat: 'Project Chat',
    chat: 'Live Chat',

    // System & Intelligence
    reports: 'Reports',
    files: 'Files',
    ai_assistant: 'AI Assistant',
    roles: 'Roles & Permissions',
    settings: 'Settings'
}

// Per-module granular actions covering all operations
const MODULE_ACTIONS: Record<string, string[]> = {
    // Executive
    dashboard:          ['view', 'view_revenue', 'view_stats'],
    calendar:           ['view', 'create', 'edit', 'delete'],
    sales_dashboard:    ['view', 'view_revenue', 'view_team_stats'],
    user_tracker:       ['view', 'manage'],
    screen_monitoring:  ['view', 'view_history', 'delete_logs', 'realtime_watch'],

    // Work & Clients
    clients:            ['view', 'create', 'edit', 'delete'],
    projects:           ['view', 'create', 'edit', 'delete', 'view_budget', 'manage_team'],
    products:           ['view', 'create', 'edit', 'delete'],
    tasks:              ['view', 'create', 'edit', 'delete', 'assign_others', 'change_priority'],
    my_day:             ['view', 'manage'],
    templates:          ['view', 'create', 'edit', 'delete'],

    // Sales & Pipeline
    leads:              ['view', 'create', 'edit', 'delete', 'claim', 'change_stage', 'transfer'],
    leads_form:         ['view', 'create', 'edit', 'delete'],
    sales_automations:  ['view', 'create', 'edit', 'delete'],
    contracts:          ['view', 'create', 'edit', 'delete', 'download'],
    quotations:         ['view', 'create', 'edit', 'delete'],
    campaigns:          ['view', 'create', 'edit', 'delete', 'send'],

    // Financial Hub
    invoices:           ['view', 'create', 'edit', 'delete', 'mark_paid', 'send_whatsapp', 'send_email'],
    credit_notes:       ['view', 'create', 'edit', 'delete'],
    vendor_bills:       ['view', 'create', 'edit', 'delete', 'mark_paid'],
    gst_reports:        ['view', 'export'],
    expenses:           ['view', 'create', 'edit', 'delete'],
    payroll:            ['view', 'manage', 'generate_slips', 'set_salaries'],
    billing_settings:   ['view', 'edit'],

    // Operations & Assets
    amc:                ['view', 'create', 'edit', 'delete'],
    domains:            ['view', 'create', 'edit', 'delete'],
    hosting:            ['view', 'create', 'edit', 'delete'],
    expiry_alerts:      ['view', 'manage'],

    // Team & HR
    team:               ['view', 'create', 'edit', 'delete'],
    attendance:         ['view', 'manage', 'manage_all', 'edit_logs', 'approve_leaves'],
    time_tracking:      ['view', 'manage', 'manage_all', 'edit_entries'],
    capacity_planning:  ['view', 'manage'],
    approvals:          ['view', 'approve', 'reject'],
    offer_letters:      ['view', 'create', 'edit', 'delete', 'download'],
    goals:              ['view', 'create', 'edit', 'delete'],

    // Communications
    tickets:            ['view', 'create', 'edit', 'delete'],
    project_chat:       ['view', 'message', 'view_others'],
    chat:               ['view', 'reply', 'delete_history'],

    // System & Intelligence
    reports:            ['view', 'export', 'view_financial_reports'],
    files:              ['view', 'upload', 'delete', 'download'],
    ai_assistant:       ['use', 'manage_keys', 'view_logs'],
    roles:              ['view', 'create', 'edit', 'delete'],
    settings:           ['view', 'edit', 'edit_profile', 'edit_smtp', 'edit_api', 'manage_billing']
}

const ACTION_LABELS: Record<string, string> = {
    view: 'View',
    create: 'Create',
    edit: 'Edit',
    delete: 'Delete',
    manage: 'Manage',
    manage_all: 'Manage All',
    view_revenue: 'Revenue',
    view_stats: 'Statistics',
    view_team_stats: 'Team Stats',
    view_history: 'History',
    delete_logs: 'Delete Logs',
    realtime_watch: 'Real-time',
    claim: 'Claim',
    change_stage: 'Stage Change',
    transfer: 'Transfer',
    view_budget: 'View Budget',
    manage_team: 'Manage Team',
    assign_others: 'Assign Others',
    change_priority: 'Priority',
    edit_logs: 'Edit Logs',
    approve_leaves: 'Approve Leaves',
    edit_entries: 'Edit Entries',
    mark_paid: 'Mark Paid',
    send_whatsapp: 'WhatsApp',
    send_email: 'Email',
    generate_slips: 'Gen. Slips',
    set_salaries: 'Set Salaries',
    reply: 'Reply',
    delete_history: 'Delete Chat',
    message: 'Message',
    view_others: 'View Others',
    export: 'Export',
    view_financial_reports: 'Financial',
    upload: 'Upload',
    download: 'Download',
    use: 'Use',
    manage_keys: 'API Keys',
    view_logs: 'Logs',
    edit_profile: 'Profile',
    edit_smtp: 'SMTP',
    edit_api: 'API Config',
    manage_billing: 'Billing',
    approve: 'Approve',
    reject: 'Reject',
    send: 'Send'
}

export function RolesPermissionsPage() {
    const [roles, setRoles] = useState<any[]>([])
    const [selectedRoleIndex, setSelectedRoleIndex] = useState(0)
    const [mainTab, setMainTab] = useState<'roles' | 'lead_access'>('roles')
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const { toast } = useToast()
    const { fetchSettings: reloadAppStoreSettings } = useAppStore()

    // 8 Sidebar-matched categories
    const moduleGroups = useMemo(() => [
        {
            group: 'Executive',
            icon: <LayoutDashboard className="h-4 w-4" />,
            description: 'Executive dashboards, calendar, user tracking and screen monitoring',
            items: ['dashboard', 'calendar', 'sales_dashboard', 'user_tracker', 'screen_monitoring']
        },
        {
            group: 'Work & Clients',
            icon: <Briefcase className="h-4 w-4" />,
            description: 'Client records, projects, digital products, task management, and my day',
            items: ['clients', 'projects', 'products', 'tasks', 'my_day', 'templates']
        },
        {
            group: 'Sales & Pipeline',
            icon: <Target className="h-4 w-4" />,
            description: 'Lead generation, sales workflows, contracts vault, quotations, and marketing campaigns',
            items: ['leads', 'leads_form', 'sales_automations', 'contracts', 'quotations', 'campaigns']
        },
        {
            group: 'Financial Hub',
            icon: <CreditCard className="h-4 w-4" />,
            description: 'Invoicing, credit notes, vendor bills, tax reports, expenses, and payroll',
            items: ['invoices', 'credit_notes', 'vendor_bills', 'gst_reports', 'expenses', 'payroll', 'billing_settings']
        },
        {
            group: 'Operations & Assets',
            icon: <Globe className="h-4 w-4" />,
            description: 'Annual maintenance contracts, domains, hosting accounts, and renewal alerts',
            items: ['amc', 'domains', 'hosting', 'expiry_alerts']
        },
        {
            group: 'Team & HR',
            icon: <Users className="h-4 w-4" />,
            description: 'Staff directory, attendance records, time tracking, resource capacity, approvals, and candidate offers',
            items: ['team', 'attendance', 'time_tracking', 'capacity_planning', 'approvals', 'offer_letters', 'goals']
        },
        {
            group: 'Communications',
            icon: <MessageSquare className="h-4 w-4" />,
            description: 'Customer support tickets, project internal chat, and website live chat',
            items: ['tickets', 'project_chat', 'chat']
        },
        {
            group: 'System & Intelligence',
            icon: <Shield className="h-4 w-4" />,
            description: 'Analytics reports, asset files, AI assistant, role permissions, and global settings',
            items: ['reports', 'files', 'ai_assistant', 'roles', 'settings']
        }
    ], [])

    useEffect(() => {
        fetchSettings()
    }, [])

    const fetchSettings = async () => {
        try {
            const res = await api.get('/settings')
            if (res.data.roles) setRoles(res.data.roles)
        } catch (error) {
            console.error("Failed to fetch settings", error)
        } finally {
            setLoading(false)
        }
    }

    const onSave = async (updatedRoles: any) => {
        setSaving(true)
        try {
            await api.put('/settings', { roles: updatedRoles })
            invalidatePermissionsCache()
            if (reloadAppStoreSettings) {
                await reloadAppStoreSettings().catch(() => {})
            }
            toast({
                title: 'Permissions Saved',
                description: "Role permissions have been saved successfully and applied across the system.",
                variant: 'success'
            })
        } catch (error: any) {
            toast({
                title: 'Error',
                description: error.response?.data?.message || "Failed to save roles",
                variant: "destructive"
            })
        } finally {
            setSaving(false)
        }
    }

    const handlePermissionChange = (moduleKey: string, action: string, checked: boolean) => {
        const newRoles = JSON.parse(JSON.stringify(roles))
        if (!newRoles[selectedRoleIndex].permissions) newRoles[selectedRoleIndex].permissions = {}
        if (!newRoles[selectedRoleIndex].permissions[moduleKey]) newRoles[selectedRoleIndex].permissions[moduleKey] = {}
        newRoles[selectedRoleIndex].permissions[moduleKey][action] = checked
        setRoles(newRoles)
    }

    const handleNestedChange = (moduleKey: string, sub: string, key: string, checked: boolean) => {
        const newRoles = JSON.parse(JSON.stringify(roles))
        if (!newRoles[selectedRoleIndex].permissions) newRoles[selectedRoleIndex].permissions = {}
        if (!newRoles[selectedRoleIndex].permissions[moduleKey]) newRoles[selectedRoleIndex].permissions[moduleKey] = {}
        if (!newRoles[selectedRoleIndex].permissions[moduleKey][sub]) newRoles[selectedRoleIndex].permissions[moduleKey][sub] = {}
        newRoles[selectedRoleIndex].permissions[moduleKey][sub][key] = checked
        setRoles(newRoles)
    }

    const isProtectedRole = (roleName: string) => {
        const protectedNames = ['admin', 'owner']
        return protectedNames.includes((roleName || '').toLowerCase())
    }

    const handleDeleteRole = async (idx: number) => {
        const roleToDelete = roles[idx]
        if (!roleToDelete) return
        const roleLabel = roleToDelete.label || roleToDelete.name

        if (isProtectedRole(roleToDelete.name)) {
            toast({
                title: "Cannot Delete System Role",
                description: "Default Administrator and Owner roles cannot be deleted.",
                variant: "destructive"
            })
            return
        }

        if (!await appConfirm(`Are you sure you want to delete the role "${roleLabel}"?`)) return

        const newRoles = roles.filter((_, i) => i !== idx)
        setRoles(newRoles)
        const nextIndex = Math.max(0, Math.min(selectedRoleIndex, newRoles.length - 1))
        setSelectedRoleIndex(nextIndex)

        setSaving(true)
        try {
            await api.put('/settings', { roles: newRoles })
            invalidatePermissionsCache()
            if (reloadAppStoreSettings) await reloadAppStoreSettings().catch(() => {})
            toast({
                title: 'Role Deleted',
                description: `The role "${roleLabel}" has been removed successfully.`,
                variant: 'success'
            })
        } catch (error: any) {
            toast({
                title: 'Error',
                description: error.response?.data?.message || "Failed to delete role",
                variant: "destructive"
            })
        } finally {
            setSaving(false)
        }
    }

    const handleToggleAllGroup = (groupItems: string[], enable: boolean) => {
        const newRoles = JSON.parse(JSON.stringify(roles))
        const perms = newRoles[selectedRoleIndex].permissions || {}
        groupItems.forEach(moduleKey => {
            const moduleActions = MODULE_ACTIONS[moduleKey] || ['view', 'create', 'edit', 'delete']
            if (!perms[moduleKey]) perms[moduleKey] = {}
            moduleActions.forEach(action => {
                perms[moduleKey][action] = enable
            })
        })
        newRoles[selectedRoleIndex].permissions = perms
        setRoles(newRoles)
    }

    const handleToggleEntireRole = (enable: boolean) => {
        const newRoles = JSON.parse(JSON.stringify(roles))
        const perms = newRoles[selectedRoleIndex].permissions || {}
        Object.keys(MODULE_ACTIONS).forEach(moduleKey => {
            const moduleActions = MODULE_ACTIONS[moduleKey]
            if (!perms[moduleKey]) perms[moduleKey] = {}
            moduleActions.forEach(action => {
                perms[moduleKey][action] = enable
            })
        })
        newRoles[selectedRoleIndex].permissions = perms
        setRoles(newRoles)
    }

    // Filter module groups by search query
    const filteredGroups = useMemo(() => {
        if (!searchQuery.trim()) return moduleGroups
        const q = searchQuery.toLowerCase().trim()
        return moduleGroups
            .map(group => {
                const filteredItems = group.items.filter(itemKey => {
                    const label = MODULE_LABELS[itemKey] || itemKey
                    return label.toLowerCase().includes(q) || itemKey.toLowerCase().includes(q)
                })
                return { ...group, items: filteredItems }
            })
            .filter(group => group.items.length > 0)
    }, [moduleGroups, searchQuery])

    if (loading) return (
        <div className="flex items-center justify-center h-[60vh]">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
    )

    const selectedRole = roles[selectedRoleIndex]

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Roles & Permissions</h1>
                    <p className="text-muted-foreground mt-1">
                        Control role-based access for all sidebar navigation options and agent lead visibility.
                    </p>
                </div>
                {mainTab === 'roles' && (
                    <Button onClick={() => onSave(roles)} disabled={saving} className="brand-gradient border-none shadow-lg">
                        {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        {saving ? 'Saving...' : 'Save All Changes'}
                    </Button>
                )}
            </div>

            {/* Sub-tab Navigation */}
            <div className="flex items-center gap-2 border-b pb-3">
                <button
                    onClick={() => setMainTab('roles')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                        mainTab === 'roles'
                            ? 'bg-primary text-primary-foreground shadow-sm'
                            : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                    }`}
                >
                    <Shield className="h-4 w-4" />
                    Role Matrix & Module Permissions
                </button>
                <button
                    onClick={() => setMainTab('lead_access')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                        mainTab === 'lead_access'
                            ? 'bg-primary text-primary-foreground shadow-sm'
                            : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                    }`}
                >
                    <Users className="h-4 w-4" />
                    Agent Lead Visibility (एजेंट लीड परमिशन)
                </button>
            </div>

            {mainTab === 'lead_access' ? (
                <LeadVisibilitySettingsTab />
            ) : (
                <Card className="border-none shadow-xl bg-card/50 backdrop-blur-sm">
                    <CardContent className="p-6 flex flex-col lg:flex-row gap-8">
                    {/* Role Sidebar */}
                    <div className="w-full lg:w-60 shrink-0 space-y-4">
                        <div className="flex items-center justify-between px-1">
                            <h3 className="font-bold text-xs uppercase tracking-widest text-muted-foreground">Roles</h3>
                            <span className="text-[10px] font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                                {roles.length} roles
                            </span>
                        </div>
                        <div className="space-y-1.5">
                            {roles.map((role, idx) => {
                                const isProtected = isProtectedRole(role.name)
                                const isSelected = selectedRoleIndex === idx

                                return (
                                    <div
                                        key={idx}
                                        className={`group flex items-center justify-between p-3 rounded-xl cursor-pointer font-semibold transition-all ${
                                            isSelected 
                                            ? 'bg-primary text-primary-foreground shadow-lg scale-[1.02]' 
                                            : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                                        }`}
                                        onClick={() => setSelectedRoleIndex(idx)}
                                    >
                                        <div className="flex items-center gap-2.5 min-w-0 pr-1">
                                            <Shield className={`h-4 w-4 shrink-0 ${isSelected ? 'text-primary-foreground' : 'text-primary'}`} />
                                            <span className="truncate text-sm">{role.label || role.name}</span>
                                        </div>
                                        {!isProtected && (
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); handleDeleteRole(idx); }}
                                                className={`p-1.5 rounded-lg transition-all shrink-0 ${
                                                    isSelected 
                                                    ? 'text-primary-foreground/70 hover:text-white hover:bg-white/20' 
                                                    : 'text-muted-foreground hover:text-destructive hover:bg-destructive/10'
                                                }`}
                                                title={`Delete ${role.label || role.name}`}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                        <Button variant="outline" className="w-full border-dashed rounded-xl text-xs" onClick={() => {
                            setRoles([...roles, { name: `custom_role_${roles.length}`, label: 'New Role', permissions: {} }])
                            setSelectedRoleIndex(roles.length)
                        }}>
                            <Plus className="mr-2 h-3.5 w-3.5" /> Add Role
                        </Button>
                    </div>

                    {/* Permissions Editor */}
                    <div className="flex-1 min-w-0 space-y-6">
                        {selectedRole && (
                            <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                                {/* Role Header with Name and Global Toggles */}
                                <div className="mb-6 p-4 bg-muted/30 rounded-2xl border border-dashed flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <div className="flex-1">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-primary">Role Display Name</Label>
                                        <Input
                                            value={selectedRole.label || ''}
                                            className="bg-transparent border-none font-bold text-xl p-0 focus-visible:ring-0 h-auto"
                                            onChange={(e) => {
                                                const newRoles = JSON.parse(JSON.stringify(roles))
                                                newRoles[selectedRoleIndex].label = e.target.value
                                                if (!isProtectedRole(newRoles[selectedRoleIndex].name)) {
                                                    newRoles[selectedRoleIndex].name = e.target.value.toLowerCase().replace(/\s+/g, '_')
                                                }
                                                setRoles(newRoles)
                                            }}
                                        />
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <div className="px-3 py-1.5 bg-background rounded-lg border flex items-center gap-2">
                                            <span className="text-[10px] font-bold text-muted-foreground uppercase">Key:</span>
                                            <code className="text-xs font-mono font-bold text-primary">{selectedRole.name}</code>
                                        </div>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleToggleEntireRole(true)}
                                            className="text-xs h-8 rounded-lg text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 border-emerald-300/40"
                                        >
                                            <CheckCheck className="h-3.5 w-3.5 mr-1" />
                                            Grant All
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleToggleEntireRole(false)}
                                            className="text-xs h-8 rounded-lg text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 border-rose-300/40"
                                        >
                                            <XCircle className="h-3.5 w-3.5 mr-1" />
                                            Revoke All
                                        </Button>
                                        {!isProtectedRole(selectedRole.name) && (
                                            <Button
                                                variant="destructive"
                                                size="sm"
                                                onClick={() => handleDeleteRole(selectedRoleIndex)}
                                                className="rounded-lg h-8 flex items-center gap-1.5 shadow-sm text-xs font-bold shrink-0"
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                                Delete
                                            </Button>
                                        )}
                                    </div>
                                </div>

                                {/* Quick Search Filter */}
                                <div className="relative mb-4">
                                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Search any sidebar option (e.g. Calendar, Screen Monitoring, Quotations, Payroll)..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="pl-10 h-10 rounded-xl bg-background border-muted-foreground/20 text-sm"
                                    />
                                    {searchQuery && (
                                        <button
                                            onClick={() => setSearchQuery('')}
                                            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground hover:text-foreground"
                                        >
                                            Clear
                                        </button>
                                    )}
                                </div>

                                {/* Permissions Matrix by Categories */}
                                <div className="border rounded-2xl overflow-hidden shadow-inner bg-background divide-y divide-border">
                                    {filteredGroups.length === 0 ? (
                                        <div className="p-8 text-center text-muted-foreground text-sm">
                                            No modules found matching "{searchQuery}".
                                        </div>
                                    ) : (
                                        filteredGroups.map(group => (
                                            <div key={group.group} className="divide-y divide-border/50">
                                                {/* Group Header */}
                                                <div className="bg-muted/40 px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sticky top-0 z-10 backdrop-blur-sm">
                                                    <div className="flex items-center gap-2.5">
                                                        <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                                                            {group.icon}
                                                        </div>
                                                        <div>
                                                            <div className="text-xs font-black uppercase tracking-wider text-foreground">
                                                                {group.group}
                                                            </div>
                                                            <div className="text-[10px] text-muted-foreground hidden sm:block">
                                                                {group.description}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-1.5 self-end sm:self-center">
                                                        <button
                                                            type="button"
                                                            className="text-[10px] font-bold uppercase px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 transition-colors"
                                                            onClick={() => handleToggleAllGroup(group.items, true)}
                                                        >
                                                            Category On
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className="text-[10px] font-bold uppercase px-2.5 py-1 rounded-md bg-rose-500/10 text-rose-600 hover:bg-rose-500/20 transition-colors"
                                                            onClick={() => handleToggleAllGroup(group.items, false)}
                                                        >
                                                            Category Off
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Module Rows */}
                                                {group.items.map(moduleKey => {
                                                    const moduleActions = MODULE_ACTIONS[moduleKey] || ['view', 'create', 'edit', 'delete']
                                                    const label = MODULE_LABELS[moduleKey] || moduleKey

                                                    return (
                                                        <div key={moduleKey} className="px-4 py-3.5 hover:bg-muted/10 transition-colors">
                                                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5">
                                                                <div className="min-w-[180px]">
                                                                    <div className="font-bold text-sm flex items-center gap-2">
                                                                        <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                                                                        <span>{label}</span>
                                                                    </div>
                                                                    <span className="text-[10px] font-mono text-muted-foreground ml-3.5">
                                                                        {moduleKey}
                                                                    </span>
                                                                </div>

                                                                <div className="flex flex-wrap items-center gap-2 flex-1 md:justify-end">
                                                                    {moduleActions.map(action => {
                                                                        const isChecked = selectedRole?.permissions?.[moduleKey]?.[action] || false
                                                                        const actionLabel = ACTION_LABELS[action] || action

                                                                        return (
                                                                            <label
                                                                                key={action}
                                                                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-bold uppercase tracking-tight cursor-pointer transition-all ${
                                                                                    isChecked 
                                                                                    ? 'bg-primary/10 border-primary/40 text-primary shadow-xs' 
                                                                                    : 'bg-muted/30 border-transparent text-muted-foreground hover:border-muted-foreground/20'
                                                                                }`}
                                                                            >
                                                                                <Switch
                                                                                    checked={isChecked}
                                                                                    onCheckedChange={(checked) => handlePermissionChange(moduleKey, action, checked)}
                                                                                    className="scale-[0.65]"
                                                                                />
                                                                                {actionLabel}
                                                                            </label>
                                                                        )
                                                                    })}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        ))
                                    )}
                                </div>

                                {/* Advanced Controls Section */}
                                <div className="mt-8 pt-6 border-t space-y-6">
                                    <h3 className="font-black text-xs uppercase tracking-[0.2em] text-primary">Advanced Controls</h3>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <Card className="bg-muted/20 border-dashed rounded-2xl">
                                            <CardHeader className="pb-2">
                                                <CardTitle className="text-sm font-bold flex items-center gap-2">
                                                    <Building2 className="h-4 w-4 text-primary" /> Dashboard Widgets Visibility
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent className="grid grid-cols-2 gap-2">
                                                {['Revenue', 'Tasks', 'Projects', 'Clients', 'Leads', 'Invoices'].map(item => {
                                                    const key = item.toLowerCase()
                                                    return (
                                                        <label key={key} className="flex items-center gap-2.5 p-2 rounded-lg border bg-background hover:border-primary/40 cursor-pointer transition-all">
                                                            <Switch 
                                                                checked={selectedRole?.permissions?.dashboard?.widgets?.[key] || false}
                                                                onCheckedChange={(checked) => handleNestedChange('dashboard', 'widgets', key, checked)}
                                                                className="scale-[0.65]"
                                                            />
                                                            <span className="text-[11px] font-bold">{item}</span>
                                                        </label>
                                                    )
                                                })}
                                            </CardContent>
                                        </Card>

                                        <Card className="bg-muted/20 border-dashed rounded-2xl">
                                            <CardHeader className="pb-2">
                                                <CardTitle className="text-sm font-bold flex items-center gap-2">
                                                    <FolderKanban className="h-4 w-4 text-primary" /> Project Field Visibility
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent className="grid grid-cols-2 gap-2">
                                                {['Budget', 'Invoices', 'Team Members', 'Client Info', 'Salary', 'Revenue'].map(item => {
                                                    const key = item.toLowerCase().replace(/\s+/g, '_')
                                                    return (
                                                        <label key={key} className="flex items-center gap-2.5 p-2 rounded-lg border bg-background hover:border-primary/40 cursor-pointer transition-all">
                                                            <Switch 
                                                                checked={selectedRole?.permissions?.projects?.fields?.[key] || false}
                                                                onCheckedChange={(checked) => handleNestedChange('projects', 'fields', key, checked)}
                                                                className="scale-[0.65]"
                                                            />
                                                            <span className="text-[11px] font-bold">Show {item}</span>
                                                        </label>
                                                    )
                                                })}
                                            </CardContent>
                                        </Card>
                                    </div>

                                    {/* System Scope & Critical Delete */}
                                    <div className="p-4 rounded-2xl bg-slate-900 text-white space-y-4">
                                        <div className="flex items-center justify-between">
                                            <div className="space-y-0.5">
                                                <h4 className="font-bold text-sm">Full System Visibility</h4>
                                                <p className="text-[10px] text-slate-400">See all users' data, projects, and financials across the entire workspace.</p>
                                            </div>
                                            <Switch
                                                checked={selectedRole?.permissions?.dashboard?.scope?.view_all || false}
                                                onCheckedChange={(checked) => handleNestedChange('dashboard', 'scope', 'view_all', checked)}
                                            />
                                        </div>
                                        <div className="border-t border-white/10 pt-4 flex items-center justify-between">
                                            <div className="space-y-0.5">
                                                <h4 className="font-bold text-sm text-red-400">Critical Data Deletion</h4>
                                                <p className="text-[10px] text-slate-400">Allow permanently deleting invoices, salaries, financial bills, and lead data.</p>
                                            </div>
                                            <Switch
                                                checked={selectedRole?.permissions?.global?.allow_critical_delete?.allowed || false}
                                                onCheckedChange={(checked) => handleNestedChange('global', 'allow_critical_delete', 'allowed', checked)}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
            )}
        </div>
    )
}

export default RolesPermissionsPage
