import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { 
    Plus, Save, Shield, Loader2, Building2, 
    FolderKanban, Trash2, Users, CreditCard, Globe, MessageSquare,
    ToggleLeft
} from 'lucide-react'
import api from '@/lib/api-client'
import { useToast } from '@/hooks/use-toast'

// Module display names mapped exactly to sidebar names
const MODULE_LABELS: Record<string, string> = {
    dashboard: 'Dashboard',
    user_tracker: 'User Tracker',
    screen_monitoring: 'Screen Monitoring',
    clients: 'Clients',
    leads: 'Leads',
    leads_form: 'Lead Forms',
    projects: 'Projects',
    tasks: 'Tasks',
    team: 'Team',
    attendance: 'Attendance',
    time_tracking: 'Time Tracking',
    invoices: 'Invoices',
    amc: 'AMC',
    domains: 'Domains',
    hosting: 'Hosting',
    expiry_alerts: 'Expiry Alerts',
    quotations: 'Quotations',
    templates: 'Templates',
    expenses: 'Expenses',
    payroll: 'Payroll',
    tickets: 'Support Tickets',
    chat: 'Live Chat',
    project_chat: 'Project Chat',
    reports: 'Reports',
    files: 'Files',
    ai_assistant: 'AI Assistant',
    settings: 'Settings',
    roles: 'Roles & Permissions',
    billing_settings: 'Billing Settings'
}

// Per-module custom actions (sidebar items that don't follow basic CRUD)
const MODULE_ACTIONS: Record<string, string[]> = {
    dashboard:          ['view', 'view_revenue', 'view_stats'],
    user_tracker:       ['view'],
    screen_monitoring:  ['view', 'view_history', 'delete_logs', 'realtime_watch'],
    clients:            ['view', 'create', 'edit', 'delete'],
    leads:              ['view', 'create', 'edit', 'delete', 'claim', 'change_stage', 'transfer'],
    leads_form:         ['view', 'create', 'edit', 'delete'],
    projects:           ['view', 'create', 'edit', 'delete', 'view_budget', 'manage_team'],
    tasks:              ['view', 'create', 'edit', 'delete', 'assign_others', 'change_priority'],
    team:               ['view', 'create', 'edit', 'delete'],
    attendance:         ['view', 'manage', 'manage_all', 'edit_logs', 'approve_leaves'],
    time_tracking:      ['view', 'manage', 'manage_all', 'edit_entries'],
    invoices:           ['view', 'create', 'edit', 'delete', 'mark_paid', 'send_whatsapp', 'send_email'],
    amc:                ['view', 'create', 'edit', 'delete'],
    domains:            ['view', 'create', 'edit', 'delete'],
    hosting:            ['view', 'create', 'edit', 'delete'],
    expiry_alerts:      ['view'],
    quotations:         ['view', 'create', 'edit', 'delete'],
    templates:          ['view', 'create', 'edit', 'delete'],
    expenses:           ['view', 'create', 'edit', 'delete'],
    payroll:            ['view', 'manage', 'generate_slips', 'set_salaries'],
    tickets:            ['view', 'create', 'edit', 'delete'],
    chat:               ['view', 'reply', 'delete_history'],
    project_chat:       ['view', 'message', 'view_others'],
    reports:            ['view', 'export', 'view_financial_reports'],
    files:              ['view', 'upload', 'delete', 'download'],
    ai_assistant:       ['use', 'manage_keys', 'view_logs'],
    settings:           ['view', 'edit', 'edit_profile', 'edit_smtp', 'edit_api', 'manage_billing'],
    roles:              ['view', 'create', 'edit', 'delete'],
    billing_settings:   ['view', 'edit']
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
    manage_billing: 'Billing'
}

export function RolesPermissionsPage() {
    const [roles, setRoles] = useState<any[]>([])
    const [selectedRoleIndex, setSelectedRoleIndex] = useState(0)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const { toast } = useToast()

    const moduleGroups = [
        {
            group: 'Core Management',
            icon: <Building2 className="h-3.5 w-3.5" />,
            items: ['dashboard', 'clients', 'leads', 'leads_form', 'projects', 'tasks']
        },
        {
            group: 'Employee & Operations',
            icon: <Users className="h-3.5 w-3.5" />,
            items: ['team', 'attendance', 'time_tracking', 'user_tracker', 'screen_monitoring']
        },
        {
            group: 'Financials',
            icon: <CreditCard className="h-3.5 w-3.5" />,
            items: ['invoices', 'quotations', 'expenses', 'payroll', 'amc', 'billing_settings']
        },
        {
            group: 'Infrastructure',
            icon: <Globe className="h-3.5 w-3.5" />,
            items: ['domains', 'hosting', 'expiry_alerts', 'files', 'templates']
        },
        {
            group: 'Communication & AI',
            icon: <MessageSquare className="h-3.5 w-3.5" />,
            items: ['chat', 'project_chat', 'tickets', 'ai_assistant', 'reports', 'settings', 'roles']
        }
    ]

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
            toast({
                title: 'Permissions Saved',
                description: "Role permissions have been updated successfully.",
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

    const handleDeleteRole = (idx: number) => {
        if (!window.confirm("Are you sure you want to delete this role?")) return
        const newRoles = roles.filter((_, i) => i !== idx)
        setRoles(newRoles)
        if (selectedRoleIndex >= newRoles.length) setSelectedRoleIndex(0)
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

    if (loading) return (
        <div className="flex items-center justify-center h-[60vh]">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
    )

    const selectedRole = roles[selectedRoleIndex]

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Roles & Permissions</h1>
                    <p className="text-muted-foreground mt-1">
                        Control what each role can access across <strong>{Object.keys(MODULE_LABELS).length}</strong> modules.
                    </p>
                </div>
                <Button onClick={() => onSave(roles)} disabled={saving} className="brand-gradient border-none shadow-lg">
                    {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    {saving ? 'Saving...' : 'Save All Changes'}
                </Button>
            </div>

            <Card className="border-none shadow-xl bg-card/50 backdrop-blur-sm">
                <CardContent className="p-6 flex flex-col lg:flex-row gap-8">
                    {/* Role Sidebar */}
                    <div className="w-full lg:w-56 shrink-0 space-y-4">
                        <h3 className="font-bold text-xs uppercase tracking-widest text-muted-foreground px-1">Roles</h3>
                        <div className="space-y-1.5">
                            {roles.map((role, idx) => (
                                <div
                                    key={idx}
                                    className={`group flex items-center justify-between p-3 rounded-xl cursor-pointer font-semibold transition-all ${
                                        selectedRoleIndex === idx 
                                        ? 'bg-primary text-primary-foreground shadow-lg scale-[1.02]' 
                                        : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                                    }`}
                                    onClick={() => setSelectedRoleIndex(idx)}
                                >
                                    <div className="flex items-center gap-2.5">
                                        <Shield className={`h-4 w-4 ${selectedRoleIndex === idx ? 'text-primary-foreground' : 'text-primary'}`} />
                                        <span className="truncate text-sm">{role.label || role.name}</span>
                                    </div>
                                    {selectedRoleIndex !== idx && !['admin', 'owner', 'employee', 'client', 'pm', 'developer'].includes(role.name) && (
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); handleDeleteRole(idx); }}
                                            className="opacity-0 group-hover:opacity-100 p-1 hover:text-destructive transition-all"
                                        >
                                            <Trash2 className="h-3 w-3" />
                                        </button>
                                    )}
                                </div>
                            ))}
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
                                {/* Role Name Header */}
                                <div className="mb-6 p-4 bg-muted/30 rounded-2xl border border-dashed flex flex-col sm:flex-row sm:items-center gap-4">
                                    <div className="flex-1">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-primary">Role Display Name</Label>
                                        <Input
                                            value={selectedRole.label || ''}
                                            className="bg-transparent border-none font-bold text-lg p-0 focus-visible:ring-0 h-auto"
                                            onChange={(e) => {
                                                const newRoles = JSON.parse(JSON.stringify(roles))
                                                newRoles[selectedRoleIndex].label = e.target.value
                                                if (!['admin', 'owner', 'employee', 'client', 'pm', 'developer'].includes(newRoles[selectedRoleIndex].name)) {
                                                    newRoles[selectedRoleIndex].name = e.target.value.toLowerCase().replace(/\s+/g, '_')
                                                }
                                                setRoles(newRoles)
                                            }}
                                        />
                                    </div>
                                    <div className="px-3 py-1.5 bg-background rounded-lg border flex items-center gap-2">
                                        <span className="text-[10px] font-bold text-muted-foreground uppercase">Key:</span>
                                        <code className="text-xs font-mono font-bold text-primary">{selectedRole.name}</code>
                                    </div>
                                </div>

                                {/* Permissions Matrix */}
                                <div className="border rounded-2xl overflow-hidden shadow-inner bg-background">
                                    {moduleGroups.map(group => (
                                        <div key={group.group}>
                                            {/* Group Header */}
                                            <div className="bg-muted/40 px-4 py-2.5 flex items-center justify-between border-b sticky top-0 z-10">
                                                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-primary">
                                                    {group.icon}
                                                    {group.group}
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <button
                                                        className="text-[9px] font-bold uppercase px-2 py-0.5 rounded bg-green-500/10 text-green-600 hover:bg-green-500/20 transition-colors"
                                                        onClick={() => handleToggleAllGroup(group.items, true)}
                                                    >
                                                        All On
                                                    </button>
                                                    <button
                                                        className="text-[9px] font-bold uppercase px-2 py-0.5 rounded bg-red-500/10 text-red-600 hover:bg-red-500/20 transition-colors"
                                                        onClick={() => handleToggleAllGroup(group.items, false)}
                                                    >
                                                        All Off
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Module Rows */}
                                            {group.items.map(moduleKey => {
                                                const moduleActions = MODULE_ACTIONS[moduleKey] || ['view', 'create', 'edit', 'delete']
                                                const label = MODULE_LABELS[moduleKey] || moduleKey

                                                return (
                                                    <div key={moduleKey} className="border-b last:border-b-0 hover:bg-muted/5 transition-colors">
                                                        <div className="px-4 py-3">
                                                            <div className="font-bold text-sm mb-2.5 flex items-center gap-2">
                                                                <div className="h-1.5 w-1.5 rounded-full bg-primary/50" />
                                                                {label}
                                                            </div>
                                                            <div className="flex flex-wrap gap-2">
                                                                {moduleActions.map(action => {
                                                                    const isChecked = selectedRole?.permissions?.[moduleKey]?.[action] || false
                                                                    const actionLabel = ACTION_LABELS[action] || action

                                                                    return (
                                                                        <label
                                                                            key={action}
                                                                            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[10px] font-bold uppercase tracking-tight cursor-pointer transition-all ${
                                                                                isChecked 
                                                                                ? 'bg-primary/10 border-primary/30 text-primary' 
                                                                                : 'bg-muted/20 border-transparent text-muted-foreground hover:border-muted-foreground/20'
                                                                            }`}
                                                                        >
                                                                            <Switch
                                                                                checked={isChecked}
                                                                                onCheckedChange={(checked) => handlePermissionChange(moduleKey, action, checked)}
                                                                                className="scale-[0.6]"
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
                                    ))}
                                </div>

                                {/* Advanced Section */}
                                <div className="mt-8 pt-6 border-t space-y-6">
                                    <h3 className="font-black text-xs uppercase tracking-[0.2em] text-primary">Advanced Controls</h3>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <Card className="bg-muted/20 border-dashed rounded-2xl">
                                            <CardHeader className="pb-2">
                                                <CardTitle className="text-sm font-bold flex items-center gap-2">
                                                    <Building2 className="h-4 w-4 text-primary" /> Dashboard Widgets
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
                                                    <FolderKanban className="h-4 w-4 text-primary" /> Field Visibility
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

                                    {/* God Mode & Critical Delete */}
                                    <div className="p-4 rounded-2xl bg-slate-900 text-white space-y-4">
                                        <div className="flex items-center justify-between">
                                            <div className="space-y-0.5">
                                                <h4 className="font-bold text-sm">Full System Visibility</h4>
                                                <p className="text-[10px] text-slate-400">See all users' data, projects, and financials.</p>
                                            </div>
                                            <Switch
                                                checked={selectedRole?.permissions?.dashboard?.scope?.view_all || false}
                                                onCheckedChange={(checked) => handleNestedChange('dashboard', 'scope', 'view_all', checked)}
                                            />
                                        </div>
                                        <div className="border-t border-white/10 pt-4 flex items-center justify-between">
                                            <div className="space-y-0.5">
                                                <h4 className="font-bold text-sm text-red-400">Critical Data Deletion</h4>
                                                <p className="text-[10px] text-slate-400">Allow deleting invoices, salaries, and lead data.</p>
                                            </div>
                                            <Switch
                                                checked={selectedRole?.permissions?.global?.allow_critical_delete || false}
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
        </div>
    )
}

export default RolesPermissionsPage
