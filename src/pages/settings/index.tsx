import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

import {
    Building2, Users, CreditCard, FolderKanban, Bell,
    Upload, Save, Plus, Trash2, Edit, Eye, EyeOff, Shield, Mail, CheckCircle, AlertCircle, Loader2,
    Layout, GripVertical, Check
} from 'lucide-react'
import api from '@/lib/api-client'
import { useToast } from '@/hooks/use-toast'
import {
    Dialog, DialogContent, DialogDescription, DialogFooter,
    DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Switch } from "@/components/ui/switch"

function hexToHSL(hex: string) {
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
    return `${(h * 360).toFixed(1)} ${(s * 100).toFixed(1)}% ${(l * 100).toFixed(1)}%`;
}

type SettingsTab = 'company' | 'users' | 'roles' | 'billing' | 'templates' | 'project-settings' | 'notifications' | 'email' | 'dashboard-builder'

export function SettingsPage() {
    const [activeTab, setActiveTab] = useState<SettingsTab>('company')
    const [settings, setSettings] = useState<any>(null)
    const { toast } = useToast()

    useEffect(() => {
        fetchSettings()
    }, [])

    const fetchSettings = async () => {
        try {
            const res = await api.get('/settings')
            setSettings(res.data)
        } catch (error) {
            console.error("Failed to fetch settings", error)
        }
    }

    const updateSettings = async (section: string, data: any) => {
        try {
            const res = await api.put('/settings', { [section]: data })
            setSettings(res.data)
            toast({ description: "Settings updated successfully" })
        } catch (error) {
            console.error("Failed to update settings", error)
            toast({ title: "Error", description: "Failed to save settings", variant: "destructive" })
        }
    }

    const tabs = [
        { id: 'company' as SettingsTab, label: 'Company Profile', icon: Building2 },
        { id: 'users' as SettingsTab, label: 'Users', icon: Users },
        { id: 'roles' as SettingsTab, label: 'Roles & Permissions', icon: Shield },
        { id: 'billing' as SettingsTab, label: 'Billing & Payments', icon: CreditCard },
        { id: 'dashboard-builder' as SettingsTab, label: 'Dashboard Builder', icon: Layout },
        { id: 'notifications' as SettingsTab, label: 'Notifications', icon: Bell },
        { id: 'email' as SettingsTab, label: 'SMTP Settings', icon: Mail },
    ]

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold">Settings</h1>
                <p className="text-muted-foreground mt-1">Manage your CRM configuration and preferences</p>
            </div>

            <div className="flex flex-col md:flex-row gap-6">
                {/* Sidebar Tabs */}
                <div className="w-full md:w-64 flex-shrink-0">
                    <Card>
                        <CardContent className="p-2">
                            <nav className="space-y-1">
                                {tabs.map((tab) => {
                                    return (
                                        <button
                                            key={tab.id}
                                            onClick={() => setActiveTab(tab.id)}
                                            className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === tab.id
                                                ? 'bg-primary text-primary-foreground'
                                                : 'hover:bg-muted text-muted-foreground'
                                                }`}
                                        >
                                            {tab.id === 'company' && <Building2 className="h-4 w-4" />}
                                            {tab.id === 'users' && <Users className="h-4 w-4" />}
                                            {tab.id === 'roles' && <Shield className="h-4 w-4" />}
                                            {tab.id === 'billing' && <CreditCard className="h-4 w-4" />}
                                            {tab.id === 'dashboard-builder' && <Layout className="h-4 w-4" />}
                                            {tab.id === 'notifications' && <Bell className="h-4 w-4" />}
                                            {tab.id === 'email' && <Mail className="h-4 w-4" />}
                                            {tab.label}
                                        </button>
                                    )
                                })}
                            </nav>
                        </CardContent>
                    </Card>
                </div>

                {/* Content Area */}
                <div className="flex-1">
                    {!settings && activeTab !== 'users' ? (
                        <div className="flex h-full items-center justify-center text-muted-foreground animate-pulse">Loading settings...</div>
                    ) : (
                        <>
                            {activeTab === 'company' && <CompanyProfileTab data={settings?.companyProfile} onSave={(d: any) => updateSettings('companyProfile', d)} />}
                            {activeTab === 'users' && <UsersRolesTab />}
                            {activeTab === 'roles' && <RolesPermissionsTab data={settings?.roles} onSave={(d: any) => updateSettings('roles', d)} />}
                            {activeTab === 'billing' && <BillingTab data={settings?.billing} onSave={(d: any) => updateSettings('billing', d)} />}
                            {activeTab === 'dashboard-builder' && <DashboardBuilderTab data={settings?.dashboardLayouts} onSave={(d: any) => updateSettings('dashboardLayouts', d)} />}
                            {activeTab === 'notifications' && <NotificationsTab data={settings?.notifications} onSave={(d: any) => updateSettings('notifications', d)} />}
                            {activeTab === 'email' && <EmailSettingsTab data={settings?.emailSettings} onSave={(d: any) => updateSettings('emailSettings', d)} />}
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}

function CompanyProfileTab({ data, onSave }: any) {
    const [formData, setFormData] = useState(data || {})
    const fileInputRef = useRef<HTMLInputElement>(null)
    const iconInputRef = useRef<HTMLInputElement>(null)

    useEffect(() => { setFormData(data || {}) }, [data])

    const handleChange = (e: any) => {
        const { id, value } = e.target
        setFormData((prev: any) => ({ ...prev, [id]: value }))

        if (id === 'themeColor') {
            const hsl = hexToHSL(value)
            if (hsl) document.documentElement.style.setProperty('--primary', hsl)
        }
    }

    const handleFileChange = (e: any) => {
        const file = e.target.files?.[0]
        if (file) {
            const reader = new FileReader()
            reader.onloadend = () => {
                setFormData({ ...formData, logo: reader.result })
            }
            reader.readAsDataURL(file)
        }
    }

    const handleIconChange = (e: any) => {
        const file = e.target.files?.[0]
        if (file) {
            const reader = new FileReader()
            reader.onloadend = () => {
                setFormData({ ...formData, icon: reader.result })
            }
            reader.readAsDataURL(file)
        }
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Company Profile</CardTitle>
                <CardDescription>Basic information about your company</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Company Name *</Label>
                        <Input id="name" value={formData.name || ''} onChange={handleChange} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="website">Website</Label>
                        <Input id="website" value={formData.website || ''} onChange={handleChange} placeholder="https://" />
                    </div>
                </div>

                <div className="space-y-2">
                    <Label>Company Logo</Label>
                    <div className="flex items-center gap-4">
                        <div className="h-20 w-20 rounded-lg border-2 border-dashed flex items-center justify-center bg-muted overflow-hidden relative">
                            {formData.logo ? (
                                <img src={formData.logo} alt="Logo" className="w-full h-full object-contain" />
                            ) : (
                                <Upload className="h-6 w-6 text-muted-foreground" />
                            )}
                        </div>
                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                                {formData.logo ? 'Change Logo' : 'Upload Logo'}
                            </Button>
                            {formData.logo && (
                                <Button variant="destructive" size="icon" onClick={() => setFormData({ ...formData, logo: "" })}>
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            )}
                        </div>
                    </div>
                </div>

                <div className="space-y-2">
                    <Label>Company Icon (Collapsed Sidebar)</Label>
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-lg border-2 border-dashed flex items-center justify-center bg-muted overflow-hidden relative">
                            {formData.icon ? (
                                <img src={formData.icon} alt="Icon" className="w-full h-full object-contain" />
                            ) : (
                                <Upload className="h-4 w-4 text-muted-foreground" />
                            )}
                        </div>
                        <input type="file" ref={iconInputRef} className="hidden" accept="image/*" onChange={handleIconChange} />
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => iconInputRef.current?.click()}>
                                {formData.icon ? 'Change Icon' : 'Upload Icon'}
                            </Button>
                            {formData.icon && (
                                <Button variant="destructive" size="sm" onClick={() => setFormData({ ...formData, icon: "" })}>
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            )}
                        </div>
                    </div>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="themeColor">Theme Color (Primary)</Label>
                    <div className="flex gap-2">
                        <Input id="themeColor" type="color" value={formData.themeColor || '#0f172a'} onChange={handleChange} className="w-20 h-10 p-1 cursor-pointer" />
                        <Input
                            value={formData.themeColor || '#0f172a'}
                            onChange={(e) => {
                                const val = e.target.value
                                setFormData({ ...formData, themeColor: val })
                                const hsl = hexToHSL(val)
                                if (hsl) document.documentElement.style.setProperty('--primary', hsl)
                            }}
                            placeholder="#0f172a"
                            className="flex-1"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="logoWidth">Logo Width (e.g. 150px, auto)</Label>
                        <Input id="logoWidth" value={formData.logoWidth || 'auto'} onChange={handleChange} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="logoHeight">Logo Height (e.g. 32px)</Label>
                        <Input id="logoHeight" value={formData.logoHeight || '32px'} onChange={handleChange} />
                    </div>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="address">Address</Label>
                    <Input id="address" value={formData.address || ''} onChange={handleChange} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="phone">Phone</Label>
                        <Input id="phone" value={formData.phone || ''} onChange={handleChange} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input id="email" type="email" value={formData.email || ''} onChange={handleChange} />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="gst">GST Number</Label>
                        <Input id="gst" value={formData.gst || ''} onChange={handleChange} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="pan">PAN (Optional)</Label>
                        <Input id="pan" value={formData.pan || ''} onChange={handleChange} />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="currency">Default Currency</Label>
                        <select id="currency" value={formData.currency || 'INR'} onChange={handleChange} className="w-full h-10 px-3 rounded-md border border-input bg-background">
                            <option value="INR">INR (₹)</option>
                            <option value="USD">USD ($)</option>
                            <option value="EUR">EUR (€)</option>
                        </select>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="timezone">Timezone</Label>
                        <select id="timezone" value={formData.timezone || 'Asia/Kolkata'} onChange={handleChange} className="w-full h-10 px-3 rounded-md border border-input bg-background">
                            <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                            <option value="America/New_York">America/New_York (EST)</option>
                            <option value="Europe/London">Europe/London (GMT)</option>
                        </select>
                    </div>
                </div>

                <Button className="w-full" onClick={() => onSave(formData)}>
                    <Save className="mr-2 h-4 w-4" />
                    Save Company Profile
                </Button>
            </CardContent>
        </Card>
    )
}

function UsersRolesTab() {
    const [users, setUsers] = useState<any[]>([])
    const [isOpen, setIsOpen] = useState(false)
    const [editingUser, setEditingUser] = useState<any>(null)
    const [availableRoles, setAvailableRoles] = useState<any[]>([])
    const [formData, setFormData] = useState({
        name: '', email: '', password: '', role: 'employee', designation: ''
    })
    const { toast } = useToast()

    useEffect(() => {
        fetchUsers()
        fetchRoles()
    }, [])

    const fetchRoles = async () => {
        try {
            const res = await api.get('/settings')
            if (res.data.roles) setAvailableRoles(res.data.roles)
        } catch (error) {
            console.error("Failed to fetch roles", error)
        }
    }

    const fetchUsers = async () => {
        try {
            const res = await api.get('/users')
            setUsers(res.data)
        } catch (error) {
            console.error("Failed to fetch users", error)
        }
    }

    const openAdd = () => {
        setEditingUser(null)
        setFormData({ name: '', email: '', password: '', role: 'employee', designation: '' })
        setIsOpen(true)
    }

    const openEdit = (user: any) => {
        setEditingUser(user)
        setFormData({
            name: user.name,
            email: user.email,
            password: '',
            role: user.role || 'employee',
            designation: user.designation || ''
        })
        setIsOpen(true)
    }

    const handleSave = async () => {
        try {
            if (!formData.name || !formData.email) {
                toast({ description: "Name and Email are required", variant: "destructive" })
                return
            }

            if (editingUser) {
                await api.put(`/users/${editingUser._id}`, formData)
                toast({ description: "User updated successfully" })
            } else {
                if (!formData.password) {
                    toast({ description: "Password is required for new users", variant: "destructive" })
                    return
                }
                await api.post('/users', formData)
                toast({ description: "User added successfully" })
            }
            setIsOpen(false)
            fetchUsers()
        } catch (error: any) {
            console.error("Save error", error)
            toast({ description: error.response?.data?.message || "Failed to save user", variant: "destructive" })
        }
    }

    const handleDelete = async (id: string, name: string) => {
        if (!window.confirm(`Are you sure you want to delete ${name}?`)) return;
        try {
            await api.delete(`/users/${id}`)
            fetchUsers()
            toast({ description: "User deleted" })
        } catch (error) {
            console.error("Delete error", error)
        }
    }

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Users Management</CardTitle>
                    <CardDescription>Add, edit, and manage team members and roles</CardDescription>
                </div>
                <Button onClick={openAdd}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add User
                </Button>
            </CardHeader>
            <CardContent>
                <div className="space-y-3">
                    {users.map((user) => (
                        <div key={user._id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                            <div className="flex items-center gap-4">
                                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                                    {user.name.charAt(0)}
                                </div>
                                <div>
                                    <div className="font-medium">{user.name}</div>
                                    <div className="text-sm text-muted-foreground">{user.email} • <span className="capitalize">{user.role}</span></div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button variant="ghost" size="icon" onClick={() => openEdit(user)}>
                                    <Edit className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDelete(user._id, user.name)}>
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    ))}
                    {users.length === 0 && <div className="text-center py-8 text-muted-foreground">No users found. Click 'Add User' to start.</div>}
                </div>

                <Dialog open={isOpen} onOpenChange={setIsOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{editingUser ? 'Edit User' : 'Add New User'}</DialogTitle>
                            <DialogDescription>
                                {editingUser ? 'Update user details and roles.' : 'Create a new user account.'}
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label>Full Name</Label>
                                <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <Label>Email</Label>
                                <Input value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <Label>{editingUser ? 'New Password (Optional)' : 'Password'}</Label>
                                <Input type="password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <Label>Designation</Label>
                                <Input value={formData.designation} onChange={(e) => setFormData({ ...formData, designation: e.target.value })} placeholder="e.g. Senior Developer" />
                            </div>
                            <div className="space-y-2">
                                <Label>Role</Label>
                                <Select value={formData.role} onValueChange={(val) => setFormData({ ...formData, role: val })}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select role" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {availableRoles.length > 0 ? availableRoles.map((role: any) => (
                                            <SelectItem key={role.name} value={role.name}>{role.label || role.name}</SelectItem>
                                        )) : (
                                            <>
                                                <SelectItem value="owner">Owner</SelectItem>
                                                <SelectItem value="admin">Admin</SelectItem>
                                                <SelectItem value="pm">Project Manager</SelectItem>
                                                <SelectItem value="employee">Employee</SelectItem>
                                            </>
                                        )}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
                            <Button onClick={handleSave}>Save User</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </CardContent>
        </Card>
    )
}

function BillingTab({ data, onSave }: any) {
    const [formData, setFormData] = useState(data || {})
    const [showKey, setShowKey] = useState(false)

    useEffect(() => { setFormData(data || {}) }, [data])

    const handleChange = (e: any) => {
        setFormData({ ...formData, [e.target.id]: e.target.value })
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Billing & Payment Settings</CardTitle>
                <CardDescription>Configure payment gateways and invoice details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-4">
                    <h3 className="font-semibold">Razorpay Integration</h3>
                    <div className="space-y-2">
                        <Label htmlFor="razorpayKey">API Key</Label>
                        <div className="flex gap-2">
                            <Input id="razorpayKey" value={formData.razorpayKey || ''} onChange={handleChange} type={showKey ? 'text' : 'password'} />
                            <Button variant="outline" size="icon" onClick={() => setShowKey(!showKey)}>
                                <Eye className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="razorpaySecret">API Secret</Label>
                        <Input id="razorpaySecret" value={formData.razorpaySecret || ''} onChange={handleChange} type="password" />
                    </div>
                </div>

                <div className="border-t pt-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="invoiceFormat">Invoice Prefix</Label>
                            <Input id="invoiceFormat" value={formData.invoiceFormat || ''} onChange={handleChange} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="taxRate">Default Tax %</Label>
                            <Input id="taxRate" type="number" value={formData.taxRate || ''} onChange={handleChange} />
                        </div>
                    </div>
                </div>

                <Button className="w-full" onClick={() => onSave(formData)}>
                    <Save className="mr-2 h-4 w-4" />
                    Save Billing Settings
                </Button>
            </CardContent>
        </Card>
    )
}

function NotificationsTab({ data, onSave }: any) {
    const [prefs, setPrefs] = useState(data || {})

    useEffect(() => { setPrefs(data || {}) }, [data])

    const toggle = (key: string) => {
        const newPrefs = { ...prefs, [key]: !prefs[key] }
        setPrefs(newPrefs)
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Notifications & Alerts</CardTitle>
                <CardDescription>Manage notification preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {[
                    { key: 'taskOverdue', label: 'Task Overdue Alert', desc: 'Notify when tasks pass their due date' },
                    { key: 'invoiceDue', label: 'Invoice Due Reminder', desc: 'Send reminders for pending invoices' },
                    { key: 'clientApproval', label: 'Client Approval', desc: 'Alert when client approval is requested' },
                    { key: 'projectDeadline', label: 'Project Deadlines', desc: 'Notify before project milestones' },
                ].map((item) => (
                    <div key={item.key} className="flex items-center justify-between p-4 rounded-lg border">
                        <div>
                            <div className="font-medium">{item.label}</div>
                            <div className="text-sm text-muted-foreground">{item.desc}</div>
                        </div>
                        <button
                            onClick={() => toggle(item.key)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${prefs[item.key] ? 'bg-primary' : 'bg-muted'}`}
                        >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${prefs[item.key] ? 'translate-x-6' : 'translate-x-1'}`} />
                        </button>
                    </div>
                ))}

                <Button className="w-full mt-6" onClick={() => onSave(prefs)}>
                    <Save className="mr-2 h-4 w-4" />
                    Save Preferences
                </Button>
            </CardContent>
        </Card>
    )
}

function EmailSettingsTab({ data, onSave }: any) {
    const [formData, setFormData] = useState(data || { host: '', port: 587, user: '', pass: '', secure: false, fromEmail: '', fromName: '' })
    const [testing, setTesting] = useState(false)
    const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)
    const [showPass, setShowPass] = useState(false)

    useEffect(() => { if (data) setFormData(data) }, [data])

    const handleChange = (e: any) => {
        setFormData({ ...formData, [e.target.id]: e.target.value })
    }

    const handleTest = async () => {
        setTesting(true)
        setTestResult(null)
        try {
            const res = await api.post('/settings/test-smtp', formData)
            setTestResult({ success: true, message: res.data.message })
        } catch (error: any) {
            setTestResult({ success: false, message: error.response?.data?.message || "Failed to connect to SMTP server." })
        } finally {
            setTesting(false)
        }
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>SMTP Settings</CardTitle>
                <CardDescription>Configure outgoing email server (SMTP) for system notifications and invoices.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {testResult && (
                    <Alert variant={testResult.success ? "default" : "destructive"} className={testResult.success ? "border-green-500 text-green-700 bg-green-50" : ""}>
                        {testResult.success ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                        <AlertTitle>{testResult.success ? "Success" : "Connection Failed"}</AlertTitle>
                        <AlertDescription>{testResult.message}</AlertDescription>
                    </Alert>
                )}

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="host">SMTP Host</Label>
                        <Input id="host" value={formData.host || ''} onChange={handleChange} placeholder="smtp.gmail.com" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="port">Port</Label>
                        <Input id="port" value={formData.port || ''} onChange={handleChange} placeholder="587" />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="user">SMTP Username / Email</Label>
                        <Input id="user" value={formData.user || ''} onChange={handleChange} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="pass">SMTP Password</Label>
                        <div className="flex gap-2">
                            <Input id="pass" type={showPass ? "text" : "password"} value={formData.pass || ''} onChange={handleChange} />
                            <Button variant="outline" size="icon" onClick={() => setShowPass(!showPass)}>
                                {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </Button>
                        </div>
                    </div>
                </div>

                <div className="flex items-center space-x-2 py-2">
                    <Switch
                        checked={formData.secure}
                        onCheckedChange={(checked) => setFormData({ ...formData, secure: checked })}
                        id="secure"
                    />
                    <Label htmlFor="secure">Use SSL (Secure Connection for Port 465)</Label>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="fromName">Sender Name</Label>
                        <Input id="fromName" value={formData.fromName || ''} onChange={handleChange} placeholder="My Company App" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="fromEmail">Sender Email (From)</Label>
                        <Input id="fromEmail" value={formData.fromEmail || ''} onChange={handleChange} placeholder="notifications@mycompany.com" />
                        <p className="text-[10px] text-muted-foreground">Should match SMTP User ideally</p>
                    </div>
                </div>

                <div className="flex gap-4 pt-4 border-t">
                    <Button variant="outline" className="w-full" onClick={handleTest} disabled={testing}>
                        {testing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                        Test Connection
                    </Button>
                    <Button className="w-full" onClick={() => onSave(formData)}>
                        <Save className="h-4 w-4 mr-2" />
                        Save Settings
                    </Button>
                </div>
            </CardContent>
        </Card>
    )
}

function RolesPermissionsTab({ data, onSave }: any) {
    const [roles, setRoles] = useState<any[]>(data || [])
    const [selectedRoleIndex, setSelectedRoleIndex] = useState(0)

    useEffect(() => { if (data) setRoles(data) }, [data])

    const handlePermissionChange = (module: string, action: string, checked: boolean) => {
        const newRoles = [...roles]
        if (!newRoles[selectedRoleIndex].permissions) newRoles[selectedRoleIndex].permissions = {}
        if (!newRoles[selectedRoleIndex].permissions[module]) newRoles[selectedRoleIndex].permissions[module] = {}
        if (!newRoles[selectedRoleIndex].permissions[module][action]) newRoles[selectedRoleIndex].permissions[module][action] = false
        newRoles[selectedRoleIndex].permissions[module][action] = checked
        setRoles(newRoles)
    }

    const handleNestedChange = (module: string, sub: string, key: string, checked: boolean) => {
        const newRoles = [...roles]
        if (!newRoles[selectedRoleIndex].permissions) newRoles[selectedRoleIndex].permissions = {}
        if (!newRoles[selectedRoleIndex].permissions[module]) newRoles[selectedRoleIndex].permissions[module] = {}
        if (!newRoles[selectedRoleIndex].permissions[module][sub]) newRoles[selectedRoleIndex].permissions[module][sub] = {}

        newRoles[selectedRoleIndex].permissions[module][sub][key] = checked
        setRoles(newRoles)
    }

    const modules = ['dashboard', 'projects', 'tasks', 'clients', 'finance', 'users', 'settings']
    const actions = ['view', 'create', 'edit', 'delete']

    return (
        <Card>
            <CardHeader><CardTitle>Roles & Permissions</CardTitle><CardDescription>Manage granular access controls for each role</CardDescription></CardHeader>
            <CardContent className="flex flex-col md:flex-row gap-6">
                <div className="w-full md:w-1/4 border-r pr-0 md:pr-4 space-y-2">
                    {roles.map((role, idx) => (
                        <div
                            key={idx}
                            className={`p-2 rounded cursor-pointer font-medium ${selectedRoleIndex === idx ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
                            onClick={() => setSelectedRoleIndex(idx)}
                        >
                            {role.label || role.name}
                        </div>
                    ))}
                    <Button variant="outline" className="w-full mt-4" onClick={() => {
                        setRoles([...roles, { name: 'new_role', label: 'New Role', permissions: {} }])
                        setSelectedRoleIndex(roles.length)
                    }}>
                        <Plus className="mr-2 h-4 w-4" /> Add Role
                    </Button>
                </div>
                <div className="flex-1 space-y-6">
                    {roles[selectedRoleIndex] && (
                        <>
                            <div className="space-y-2">
                                <Label>Role Label</Label>
                                <Input
                                    value={roles[selectedRoleIndex].label}
                                    onChange={(e) => {
                                        const newRoles = [...roles]
                                        newRoles[selectedRoleIndex].label = e.target.value
                                        newRoles[selectedRoleIndex].name = e.target.value.toLowerCase().replace(/\s+/g, '_')
                                        setRoles(newRoles)
                                    }}
                                />
                            </div>
                            <div className="border rounded-lg overflow-hidden">
                                <div className="grid grid-cols-5 gap-4 bg-muted p-3 font-medium text-sm">
                                    <div className="col-span-1">Module</div>
                                    <div className="text-center">View</div>
                                    <div className="text-center">Create</div>
                                    <div className="text-center">Edit</div>
                                    <div className="text-center">Delete</div>
                                </div>
                                {modules.map(module => (
                                    <div key={module} className="grid grid-cols-5 gap-4 items-center border-t p-3 hover:bg-muted/5">
                                        <div className="capitalize font-medium text-sm">{module}</div>
                                        {actions.map(action => {
                                            if (module === 'dashboard' && action !== 'view') return <div key={action} />
                                            if (module === 'settings' && (action === 'create' || action === 'delete')) return <div key={action} />

                                            return (
                                                <div key={action} className="flex justify-center">
                                                    <input
                                                        type="checkbox"
                                                        checked={roles[selectedRoleIndex]?.permissions?.[module]?.[action] || false}
                                                        onChange={(e) => handlePermissionChange(module, action, e.target.checked)}
                                                        className="h-4 w-4 accent-primary cursor-pointer"
                                                    />
                                                </div>
                                            )
                                        })}
                                    </div>
                                ))}
                            </div>

                            <div className="mt-8 border-t pt-6">
                                <h3 className="font-medium mb-4">Detailed Visibility Controls</h3>
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                    <div>
                                        <h4 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                                            <Building2 className="h-4 w-4" /> Dashboard Widgets
                                        </h4>
                                        <div className="grid grid-cols-2 gap-3">
                                            {['Revenue', 'Tasks', 'Projects', 'Clients'].map(item => {
                                                const key = item.toLowerCase()
                                                return (
                                                    <label key={key} className="flex items-center gap-2 text-sm cursor-pointer border p-2 rounded hover:bg-muted/50">
                                                        <input
                                                            type="checkbox"
                                                            checked={roles[selectedRoleIndex]?.permissions?.dashboard?.widgets?.[key] || false}
                                                            onChange={(e) => handleNestedChange('dashboard', 'widgets', key, e.target.checked)}
                                                            className="h-4 w-4 accent-primary"
                                                        />
                                                        {item}
                                                    </label>
                                                )
                                            })}
                                        </div>
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                                            <FolderKanban className="h-4 w-4" /> Project Fields
                                        </h4>
                                        <div className="grid grid-cols-2 gap-3">
                                            {['Budget', 'Invoices', 'Team', 'Client'].map(item => {
                                                const key = item.toLowerCase()
                                                return (
                                                    <label key={key} className="flex items-center gap-2 text-sm cursor-pointer border p-2 rounded hover:bg-muted/50">
                                                        <input
                                                            type="checkbox"
                                                            checked={roles[selectedRoleIndex]?.permissions?.projects?.fields?.[key] || false}
                                                            onChange={(e) => handleNestedChange('projects', 'fields', key, e.target.checked)}
                                                            className="h-4 w-4 accent-primary"
                                                        />
                                                        Show {item}
                                                    </label>
                                                )
                                            })}
                                        </div>
                                    </div>

                                    <div className="col-span-1 lg:col-span-2 border-t pt-4 mt-2">
                                        <h4 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                                            <Shield className="h-4 w-4" /> Data Access Scope
                                        </h4>
                                        <label className="flex items-center gap-2 text-sm cursor-pointer border p-3 rounded hover:bg-muted/50 w-full sm:w-auto inline-flex">
                                            <input
                                                type="checkbox"
                                                checked={roles[selectedRoleIndex]?.permissions?.dashboard?.scope?.view_all || false}
                                                onChange={(e) => handleNestedChange('dashboard', 'scope', 'view_all', e.target.checked)}
                                                className="h-4 w-4 accent-primary"
                                            />
                                            <div className="flex-1">
                                                <div className="font-medium">View All Data (Global Admin)</div>
                                                <div className="text-xs text-muted-foreground">If unchecked, user only sees their own assigned items.</div>
                                            </div>
                                        </label>
                                    </div>
                                </div>
                            </div>

                            <Button className="mt-6" onClick={() => onSave(roles)}>
                                <Save className="mr-2 h-4 w-4" /> Save Roles & Permissions
                            </Button>
                        </>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}

function DashboardBuilderTab({ data, onSave }: any) {
    const [layouts, setLayouts] = useState<any>(data || {})
    const [selectedRole, setSelectedRole] = useState('owner')

    useEffect(() => { if (data) setLayouts(data) }, [data])

    const sections = [
        { id: 'financials', label: 'Financial Overview', desc: 'Revenue, Expenses, Profit metrics' },
        { id: 'operational', label: 'Operational Efficiency', desc: 'Active projects, Win rate, Hours' },
        { id: 'analytics', label: 'Financial Analytics', desc: 'Revenue vs Expense chart' },
        { id: 'funnel', label: 'Lead Funnel', desc: 'Lead status distribution chart' },
        { id: 'deadlines', label: 'Critical Deadlines', desc: 'Tasks approaching due dates' },
        { id: 'health', label: 'Operational Health', desc: 'Completion rates and utilization' },
        { id: 'activity', label: 'Recent Activity', desc: 'Log of latest system actions' },
        { id: 'leads', label: 'Opportunity Table', desc: 'List of latest business leads' },
    ]

    const toggleSection = (sectionId: string) => {
        const currentLayout = layouts[selectedRole] || []
        let newLayout = []
        if (currentLayout.includes(sectionId)) {
            newLayout = currentLayout.filter((id: string) => id !== sectionId)
        } else {
            newLayout = [...currentLayout, sectionId]
        }

        const newLayouts = { ...layouts, [selectedRole]: newLayout }
        setLayouts(newLayouts)
    }

    const roles = ['owner', 'admin', 'pm', 'employee']

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Layout className="h-5 w-5" />
                    Role-Based Dashboard Builder
                </CardTitle>
                <CardDescription>
                    Configure which sections are visible for each user role on their primary dashboard.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
                <div className="flex gap-2 p-1 bg-muted rounded-lg w-fit">
                    {roles.map(role => (
                        <button
                            key={role}
                            onClick={() => setSelectedRole(role)}
                            className={`px-4 py-2 rounded-md text-sm font-semibold capitalize transition-all ${selectedRole === role ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                            {role}
                        </button>
                    ))}
                </div>

                <div className="grid gap-3">
                    {sections.map(section => {
                        const isVisible = (layouts[selectedRole] || []).includes(section.id)
                        return (
                            <div
                                key={section.id}
                                onClick={() => toggleSection(section.id)}
                                className={`flex items-center justify-between p-4 rounded-xl border transition-all cursor-pointer group ${isVisible ? 'bg-primary/5 border-primary/20 shadow-sm' : 'hover:border-border/80 bg-card'
                                    }`}
                            >
                                <div className="flex items-center gap-4">
                                    <div className={`p-2 rounded-lg transition-colors ${isVisible ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                                        <GripVertical className="h-4 w-4" />
                                    </div>
                                    <div>
                                        <div className={`font-semibold transition-colors ${isVisible ? 'text-primary' : 'text-foreground'}`}>{section.label}</div>
                                        <div className="text-sm text-muted-foreground">{section.desc}</div>
                                    </div>
                                </div>
                                <div className={`h-6 w-6 rounded-full border-2 flex items-center justify-center transition-all ${isVisible ? 'bg-primary border-primary text-white' : 'border-muted-foreground/30'
                                    }`}>
                                    {isVisible && <Check className="h-3.5 w-3.5" />}
                                </div>
                            </div>
                        )
                    })}
                </div>

                <div className="border-t pt-6 bg-muted/30 -mx-6 px-6 pb-6 rounded-b-xl">
                    <div className="flex justify-between items-center bg-background p-4 rounded-xl border shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-emerald-500/10 rounded-lg">
                                <Save className="h-5 w-5 text-emerald-600" />
                            </div>
                            <div>
                                <div className="font-bold">Save Configuration</div>
                                <div className="text-xs text-muted-foreground">Apply these layout changes for the {selectedRole} role.</div>
                            </div>
                        </div>
                        <Button onClick={() => onSave(layouts)} className="font-bold">
                            Update Global Settings
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
