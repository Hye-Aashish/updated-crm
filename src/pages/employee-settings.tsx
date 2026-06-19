import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { User, Bell, Lock, Save, Camera, Loader2 } from 'lucide-react'
import { useAppStore } from '@/store'
import api from '@/lib/api-client'
import { useToast } from '@/hooks/use-toast'
import { formatCurrency } from '@/lib/utils'

export function EmployeeSettingsPage() {
    const { currentUser, setCurrentUser } = useAppStore()
    const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'notifications'>('profile')
    const { toast } = useToast()

    const [name, setName] = useState(currentUser?.name || '')
    const [phone, setPhone] = useState(currentUser?.phone || '')
    const [currentPassword, setCurrentPassword] = useState('')
    const [newPassword, setNewPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [avatar, setAvatar] = useState(currentUser?.avatar || '')
    const avatarInputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        if (currentUser) {
            setName(currentUser.name || '')
            setPhone(currentUser.phone || '')
            setAvatar(currentUser.avatar || '')
        }
    }, [currentUser])

    const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            const reader = new FileReader()
            reader.onloadend = () => {
                setAvatar(reader.result as string)
            }
            reader.readAsDataURL(file)
        }
    }

    const handleProfileSave = async () => {
        if (!name.trim()) {
            toast({ description: "Full Name is required", variant: "destructive" })
            return
        }
        setLoading(true)
        try {
            const res = await api.put(`/users/${currentUser?._id}`, { name, phone, avatar })
            setCurrentUser(res.data)
            toast({ description: "Profile details updated successfully", variant: "success" })
        } catch (error: any) {
            console.error(error)
            toast({ description: error.response?.data?.message || "Failed to update profile", variant: "destructive" })
        } finally {
            setLoading(false)
        }
    }

    const handleSecuritySave = async () => {
        if (!currentPassword || !newPassword || !confirmPassword) {
            toast({ description: "Please fill in all password fields", variant: "destructive" })
            return
        }
        if (newPassword !== confirmPassword) {
            toast({ description: "New passwords do not match", variant: "destructive" })
            return
        }
        setLoading(true)
        try {
            await api.put(`/users/${currentUser?._id}`, { password: newPassword })
            setCurrentPassword('')
            setNewPassword('')
            setConfirmPassword('')
            toast({ description: "Password updated successfully", variant: "success" })
        } catch (error: any) {
            console.error(error)
            toast({ description: error.response?.data?.message || "Failed to update password", variant: "destructive" })
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold">My Settings</h1>
                <p className="text-muted-foreground mt-1">Manage your profile and preferences</p>
            </div>

            <div className="flex flex-col md:flex-row gap-6">
                {/* Sidebar Tabs */}
                <div className="w-full md:w-64 flex-shrink-0">
                    <Card>
                        <CardContent className="p-2">
                            <nav className="space-y-1">
                                <button
                                    onClick={() => setActiveTab('profile')}
                                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'profile' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-muted-foreground'}`}
                                >
                                    <User className="h-4 w-4" /> Profile
                                </button>
                                <button
                                    onClick={() => setActiveTab('security')}
                                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'security' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-muted-foreground'}`}
                                >
                                    <Lock className="h-4 w-4" /> Security
                                </button>
                                <button
                                    onClick={() => setActiveTab('notifications')}
                                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'notifications' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-muted-foreground'}`}
                                >
                                    <Bell className="h-4 w-4" /> Notifications
                                </button>
                            </nav>
                        </CardContent>
                    </Card>
                </div>

                {/* Content Area */}
                <div className="flex-1">
                    {activeTab === 'profile' && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Personal Information</CardTitle>
                                <CardDescription>Update your personal details</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="flex items-center gap-6">
                                    <div 
                                        className="h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center text-3xl font-bold text-primary relative group cursor-pointer overflow-hidden"
                                        onClick={() => avatarInputRef.current?.click()}
                                    >
                                        {avatar ? (
                                            <img src={avatar} alt="Profile" className="w-full h-full object-cover" />
                                        ) : (
                                            currentUser?.name?.charAt(0) || 'U'
                                        )}
                                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Camera className="h-6 w-6 text-white" />
                                        </div>
                                    </div>
                                    <input 
                                        type="file" 
                                        ref={avatarInputRef} 
                                        className="hidden" 
                                        accept="image/*" 
                                        onChange={handleAvatarChange} 
                                    />
                                    <div>
                                        <h3 className="font-semibold text-lg">{currentUser?.name}</h3>
                                        <p className="text-muted-foreground">{currentUser?.role}</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="name">Full Name</Label>
                                        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="email">Email Address</Label>
                                        <Input id="email" defaultValue={currentUser?.email} disabled />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="phone">Phone Number</Label>
                                        <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 99999 99999" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="designation">Designation</Label>
                                        <Input id="designation" defaultValue={currentUser?.designation || ''} disabled />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="salary">Monthly Salary</Label>
                                        <Input id="salary" value={currentUser?.salary ? formatCurrency(Number(currentUser.salary)) : 'N/A'} disabled className="font-bold text-emerald-600" />
                                    </div>
                                </div>

                                <Button onClick={handleProfileSave} disabled={loading}>
                                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                    Save Changes
                                </Button>
                            </CardContent>
                        </Card>
                    )}

                    {activeTab === 'security' && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Security</CardTitle>
                                <CardDescription>Manage your password and security settings</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="current-password">Current Password</Label>
                                        <Input id="current-password" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="new-password">New Password</Label>
                                            <Input id="new-password" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="confirm-password">Confirm New Password</Label>
                                            <Input id="confirm-password" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
                                        </div>
                                    </div>
                                </div>
                                <Button onClick={handleSecuritySave} disabled={loading}>
                                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Update Password
                                </Button>
                            </CardContent>
                        </Card>
                    )}

                    {activeTab === 'notifications' && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Notifications</CardTitle>
                                <CardDescription>Choose what you want to be notified about</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {[
                                        { label: 'Task Assignments', desc: 'When a new task is assigned to me' },
                                        { label: 'Task Updates', desc: 'When a task I follow is updated' },
                                        { label: 'Project Comments', desc: 'New comments on my projects' },
                                        { label: 'Meeting Reminders', desc: '15 minutes before meetings' }
                                    ].map((item, i) => (
                                        <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                                            <div>
                                                <div className="font-medium">{item.label}</div>
                                                <div className="text-sm text-muted-foreground">{item.desc}</div>
                                            </div>
                                            <div className="h-6 w-11 bg-primary rounded-full relative cursor-pointer">
                                                <div className="h-4 w-4 bg-white rounded-full absolute top-1 right-1" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    )
}

export default EmployeeSettingsPage
