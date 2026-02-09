import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAppStore } from '@/store'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
    Plus, Mail, Phone, Briefcase, CheckSquare, Users, UserCog, Code,
    Clock, CheckCircle, Trash2, Upload, MoreHorizontal
} from 'lucide-react'
import { getInitials } from '@/lib/utils'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import api from '@/lib/api-client'
import { useToast } from '@/hooks/use-toast'

import { AttendanceSheet } from '@/components/attendance/attendance-sheet'

export function TeamPage() {
    const navigate = useNavigate()
    const location = useLocation()
    const { toast } = useToast()
    const { users, setUsers, tasks } = useAppStore()

    // UI State
    const [activeTab, setActiveTab] = useState<'members' | 'attendance'>('members')
    const [isAddUserOpen, setIsAddUserOpen] = useState(false)
    const [userToDelete, setUserToDelete] = useState<string | null>(null)

    // Form State with ALL fields
    const [newUser, setNewUser] = useState({
        employeeId: '',
        salutation: 'Mr.',
        name: '',
        email: '',
        password: 'password123',
        role: 'employee',
        avatar: '',
        designation: '',
        department: '',
        country: 'India',
        phone: '',
        gender: 'Male',
        dateOfBirth: '',
        joiningDate: new Date().toISOString().split('T')[0],
        reportingTo: '',
        language: 'English',
        address: '',
        about: '',
        aadharNumber: '',
        panNumber: '',
        documentAadhar: '',
        documentPan: '',
        documentOfferLetter: '',
        salary: ''
    })

    // Attendance Settings State - Removed as part of redesign
    // const [settings, setSettings] = useState(...) 

    // Handle initial tab selection from URL
    useEffect(() => {
        const params = new URLSearchParams(location.search)
        const tab = params.get('tab')
        if (tab === 'attendance') {
            setActiveTab('attendance')
        } else if (tab === 'members') {
            setActiveTab('members')
        }
    }, [location.search])

    // Fetch Users
    useEffect(() => {
        const fetchUsers = async () => {
            if (users.length === 0) {
                try {
                    const res = await api.get('/users')
                    const mapped = res.data.map((u: any) => ({
                        id: u._id,
                        ...u
                    }))
                    setUsers(mapped)
                } catch (error) {
                    console.error("Failed to fetch users", error)
                }
            }
        }
        fetchUsers()
    }, [users.length, setUsers])

    // File Upload Handler
    const handleFileChange = (field: 'avatar' | 'documentAadhar' | 'documentPan' | 'documentOfferLetter', e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        const reader = new FileReader()
        reader.onloadend = () => {
            setNewUser(prev => ({ ...prev, [field]: reader.result as string }))
        }
        reader.readAsDataURL(file)
    }

    // Add User
    const handleAddUser = async () => {
        if (!newUser.name || !newUser.email) {
            toast({ variant: "destructive", title: "Validation Error", description: "Name and Email are required" })
            return
        }
        try {
            const res = await api.post('/users', newUser)
            const created = { id: res.data._id, ...res.data }
            setUsers([...users, created])
            setIsAddUserOpen(false)
            setNewUser({
                employeeId: '', salutation: 'Mr.', name: '', email: '', password: 'password123', role: 'employee',
                avatar: '', designation: '', department: '', country: 'India', phone: '', gender: 'Male',
                dateOfBirth: '', joiningDate: '', reportingTo: '', language: 'English', address: '', about: '',
                aadharNumber: '', panNumber: '', documentAadhar: '', documentPan: '', documentOfferLetter: '', salary: ''
            })
            toast({ title: "Account Created", description: `${created.name} added successfully.` })
        } catch (error: any) {
            const msg = error.response?.data?.message || "Failed to add user"
            toast({ variant: "destructive", title: "Error", description: msg })
        }
    }

    // Delete User
    const confirmDeleteUser = async () => {
        if (!userToDelete) return
        try {
            await api.delete(`/users/${userToDelete}`)
            setUsers(users.filter(u => u.id !== userToDelete))
            toast({ title: "Member Released", description: "User has been removed." })
        } catch (error) {
            toast({ variant: "destructive", title: "Failed", description: "Could not delete user." })
        } finally {
            setUserToDelete(null)
        }
    }


    // --- KPI Calculations (Members) ---
    const totalMembers = users.length
    const developers = users.filter(u => u.role === 'developer' || u.role === 'employee').length
    const projectManagers = users.filter(u => u.role === 'pm').length
    const owners = users.filter(u => u.role === 'owner' || u.role === 'admin').length

    const StatsCard = ({ title, value, icon: Icon, color, bg }: any) => (
        <Card className="border-l-4 shadow-sm" style={{ borderLeftColor: color }}>
            <CardContent className="p-4 flex items-center justify-between">
                <div>
                    <p className="text-sm font-medium text-muted-foreground">{title}</p>
                    <h3 className="text-2xl font-bold mt-1">{value}</h3>
                </div>
                <div className={`p-2 rounded-lg ${bg}`}>
                    <Icon className="h-5 w-5" style={{ color: color }} />
                </div>
            </CardContent>
        </Card>
    )

    const getUserStats = (userId: string) => {
        const userTasks = tasks.filter((t) => t.assigneeId === userId)
        return {
            activeTasks: userTasks.filter((t) => t.status !== 'done').length,
            completedTasks: userTasks.filter((t) => t.status === 'done').length
        }
    }

    const roleColors: Record<string, 'default' | 'secondary' | 'outline'> = {
        'owner': 'default', 'admin': 'default', 'pm': 'secondary', 'developer': 'outline', 'employee': 'outline'
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold">Team & Attendance</h1>
                    <p className="text-muted-foreground mt-1">Manage team members, roles, and track daily attendance.</p>
                </div>
                <div className="flex gap-2">
                    <Button
                        variant={activeTab === 'members' ? 'default' : 'outline'}
                        className={activeTab === 'members' ? "bg-blue-600 hover:bg-blue-700 text-white border-blue-600" : ""}
                        onClick={() => { setActiveTab('members'); navigate('/team?tab=members', { replace: true }) }}
                    >
                        <Users className="mr-2 h-4 w-4" /> Members
                    </Button>
                    <Button
                        variant={activeTab === 'attendance' ? 'default' : 'outline'}
                        className={activeTab === 'attendance' ? "bg-blue-600 hover:bg-blue-700 text-white border-blue-600" : ""}
                        onClick={() => { setActiveTab('attendance'); navigate('/team?tab=attendance', { replace: true }) }}
                    >
                        <Clock className="mr-2 h-4 w-4" /> Attendance
                    </Button>
                    {activeTab === 'members' && (
                        <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
                            <DialogTrigger asChild>
                                <Button>
                                    <Plus className="mr-2 h-4 w-4" /> Add Member
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-5xl h-[85vh] flex flex-col p-0">
                                <DialogHeader className="p-6 border-b">
                                    <DialogTitle className="text-xl">Account Details</DialogTitle>
                                    <DialogDescription>Enter the employee's information.</DialogDescription>
                                </DialogHeader>

                                <div className="flex-1 overflow-y-auto p-6">
                                    <div className="flex flex-col lg:flex-row gap-8">
                                        {/* Form Fields */}
                                        <div className="flex-1 space-y-6">
                                            {/* Row 1 */}
                                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                                <div className="space-y-2">
                                                    <Label>Employee ID *</Label>
                                                    <Input value={newUser.employeeId} onChange={e => setNewUser({ ...newUser, employeeId: e.target.value })} placeholder="e.g. 101" />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>Salutation</Label>
                                                    <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={newUser.salutation} onChange={e => setNewUser({ ...newUser, salutation: e.target.value })}>
                                                        <option>Mr.</option>
                                                        <option>Ms.</option>
                                                        <option>Mrs.</option>
                                                        <option>Dr.</option>
                                                    </select>
                                                </div>
                                                <div className="space-y-2 md:col-span-2">
                                                    <Label>Employee Name *</Label>
                                                    <Input value={newUser.name} onChange={e => setNewUser({ ...newUser, name: e.target.value })} placeholder="John Doe" />
                                                </div>
                                            </div>

                                            {/* Row 2 */}
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <Label>Employee Email *</Label>
                                                    <Input value={newUser.email} onChange={e => setNewUser({ ...newUser, email: e.target.value })} placeholder="email@example.com" />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>Designation</Label>
                                                    <Input value={newUser.designation} onChange={e => setNewUser({ ...newUser, designation: e.target.value })} placeholder="Senior Developer" />
                                                </div>
                                            </div>

                                            {/* Row 3 */}
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                <div className="space-y-2">
                                                    <Label>Date of Birth</Label>
                                                    <Input type="date" value={newUser.dateOfBirth} onChange={e => setNewUser({ ...newUser, dateOfBirth: e.target.value })} />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>Department</Label>
                                                    <Input value={newUser.department} onChange={e => setNewUser({ ...newUser, department: e.target.value })} placeholder="Engineering" />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>Gender</Label>
                                                    <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={newUser.gender} onChange={e => setNewUser({ ...newUser, gender: e.target.value })}>
                                                        <option>Male</option>
                                                        <option>Female</option>
                                                        <option>Other</option>
                                                    </select>
                                                </div>
                                            </div>

                                            {/* Row 4 */}
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                <div className="space-y-2">
                                                    <Label>Country</Label>
                                                    <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={newUser.country} onChange={e => setNewUser({ ...newUser, country: e.target.value })}>
                                                        <option>India</option>
                                                        <option>USA</option>
                                                        <option>UK</option>
                                                        <option>Canada</option>
                                                        <option>Australia</option>
                                                    </select>
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>Mobile</Label>
                                                    <Input value={newUser.phone} onChange={e => setNewUser({ ...newUser, phone: e.target.value })} placeholder="+91 1234567890" />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>Joining Date *</Label>
                                                    <Input type="date" value={newUser.joiningDate} onChange={e => setNewUser({ ...newUser, joiningDate: e.target.value })} />
                                                </div>
                                            </div>

                                            {/* Row 5 */}
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                <div className="space-y-2">
                                                    <Label>Monthly Salary</Label>
                                                    <Input value={newUser.salary} onChange={e => setNewUser({ ...newUser, salary: e.target.value })} placeholder="e.g. 50000" />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>Reporting To</Label>
                                                    <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={newUser.reportingTo} onChange={e => setNewUser({ ...newUser, reportingTo: e.target.value })}>
                                                        <option value="">Select Manager</option>
                                                        {users.map(u => (
                                                            <option key={u.id} value={u.id}>{u.name}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>Language</Label>
                                                    <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={newUser.language} onChange={e => setNewUser({ ...newUser, language: e.target.value })}>
                                                        <option>English</option>
                                                        <option>Spanish</option>
                                                        <option>French</option>
                                                        <option>Hindi</option>
                                                    </select>
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>User Role</Label>
                                                    <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={newUser.role} onChange={e => setNewUser({ ...newUser, role: e.target.value })}>
                                                        <option value="employee">Employee</option>
                                                        <option value="developer">Developer</option>
                                                        <option value="pm">Project Manager</option>
                                                        <option value="admin">Admin</option>
                                                    </select>
                                                </div>
                                            </div>

                                            {/* Address & About */}
                                            <div className="space-y-2">
                                                <Label>Address</Label>
                                                <Textarea value={newUser.address} onChange={e => setNewUser({ ...newUser, address: e.target.value })} placeholder="Enter full address" />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>About</Label>
                                                <Textarea value={newUser.about} onChange={e => setNewUser({ ...newUser, about: e.target.value })} placeholder="Brief bio..." />
                                            </div>

                                            {/* KYC Documents */}
                                            <div className="pt-4 border-t">
                                                <Label className="text-lg font-semibold mb-4 block">KYC Documents</Label>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                    <div className="space-y-2">
                                                        <Label>Aadhar Number</Label>
                                                        <Input value={newUser.aadharNumber} onChange={e => setNewUser({ ...newUser, aadharNumber: e.target.value })} placeholder="1234 5678 9012" />
                                                        <div className="flex items-center gap-2 mt-2">
                                                            <Input id="aadhar-upload" type="file" className="text-xs" onChange={(e) => handleFileChange('documentAadhar', e)} />
                                                        </div>
                                                        {newUser.documentAadhar && <p className="text-xs text-green-600 flex items-center"><CheckCircle className="h-3 w-3 mr-1" /> Uploaded</p>}
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label>PAN Number</Label>
                                                        <Input value={newUser.panNumber} onChange={e => setNewUser({ ...newUser, panNumber: e.target.value })} placeholder="ABCDE1234F" />
                                                        <div className="flex items-center gap-2 mt-2">
                                                            <Input id="pan-upload" type="file" className="text-xs" onChange={(e) => handleFileChange('documentPan', e)} />
                                                        </div>
                                                        {newUser.documentPan && <p className="text-xs text-green-600 flex items-center"><CheckCircle className="h-3 w-3 mr-1" /> Uploaded</p>}
                                                    </div>
                                                </div>

                                                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
                                                    <div className="space-y-2">
                                                        <Label>Offer Letter</Label>
                                                        <div className="flex items-center gap-2 mt-2">
                                                            <Input id="offer-upload" type="file" className="text-xs" onChange={(e) => handleFileChange('documentOfferLetter', e)} />
                                                        </div>
                                                        {newUser.documentOfferLetter && <p className="text-xs text-green-600 flex items-center"><CheckCircle className="h-3 w-3 mr-1" /> Uploaded</p>}
                                                    </div>
                                                </div>
                                            </div>

                                        </div>

                                        {/* Profile Picture Side */}
                                        <div className="w-full lg:w-64 flex flex-col gap-4">
                                            <Label>Profile Picture</Label>
                                            <div className="border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-muted/50 h-48 relative" onClick={() => document.getElementById('avatar-upload')?.click()}>
                                                {newUser.avatar ? (
                                                    <img src={newUser.avatar} className="absolute inset-0 w-full h-full object-cover rounded-lg" alt="Profile" />
                                                ) : (
                                                    <>
                                                        <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                                                        <span className="text-sm text-muted-foreground">Choose a file</span>
                                                    </>
                                                )}
                                                <input id="avatar-upload" type="file" className="hidden" accept="image/*" onChange={(e) => handleFileChange('avatar', e)} />
                                            </div>
                                            {newUser.avatar && (
                                                <Button variant="outline" size="sm" onClick={() => setNewUser(prev => ({ ...prev, avatar: '' }))}>Remove Picture</Button>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <DialogFooter className="p-4 border-t">
                                    <Button variant="outline" onClick={() => setIsAddUserOpen(false)}>Cancel</Button>
                                    <Button onClick={handleAddUser}>Create Account</Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    )}
                </div>
            </div>

            {/* List View & Attendance Content (Unchanged Logic, just re-rendered with new file) */}
            {activeTab === 'members' ? (
                <div className="space-y-6">
                    {/* Members KPIs */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <StatsCard title="Total Members" value={totalMembers} icon={Users} color="#3b82f6" bg="bg-blue-500/10" />
                        <StatsCard title="Developers" value={developers} icon={Code} color="#22c55e" bg="bg-green-500/10" />
                        <StatsCard title="Project Managers" value={projectManagers} icon={UserCog} color="#8b5cf6" bg="bg-purple-500/10" />
                        <StatsCard title="Admins/Owners" value={owners} icon={Briefcase} color="#f59e0b" bg="bg-amber-500/10" />
                    </div>

                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {users.map((user) => {
                            const stats = getUserStats(user.id)
                            return (
                                <Card key={user.id} className="cursor-pointer hover:shadow-md transition-all">
                                    <CardContent className="p-6">
                                        <div className="flex justify-end -mt-2 -mr-2">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-6 w-6"><MoreHorizontal className="h-4 w-4" /></Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent>
                                                    <DropdownMenuItem onClick={() => navigate(`/team/${user.id}`)}>View Profile</DropdownMenuItem>
                                                    <DropdownMenuItem className="text-red-600" onClick={() => setUserToDelete(user.id)}><Trash2 className="mr-2 h-4 w-4" /> Release</DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                        <div className="flex flex-col items-center text-center space-y-4 -mt-4">
                                            <Avatar className="h-20 w-20">
                                                {user.avatar ? (
                                                    <img src={user.avatar} className="h-full w-full object-cover" />
                                                ) : (
                                                    <div className="flex h-full w-full items-center justify-center bg-primary/10 text-2xl font-bold text-primary">
                                                        {getInitials(user.name)}
                                                    </div>
                                                )}
                                            </Avatar>
                                            <div>
                                                <h3 className="font-semibold text-lg">{user.name}</h3>
                                                <Badge variant={roleColors[user.role] || 'outline'} className="mt-2 capitalize">{user.role}</Badge>
                                                {user.designation && <div className="text-xs text-muted-foreground mt-1">{user.designation}</div>}
                                            </div>
                                            <div className="w-full space-y-2 pt-4 border-t text-sm">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center text-muted-foreground"><Mail className="mr-2 h-4 w-4" /> Email</div>
                                                    <span className="font-medium text-xs truncate max-w-[150px]">{user.email}</span>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center text-muted-foreground"><Phone className="mr-2 h-4 w-4" /> Phone</div>
                                                    <span className="font-medium text-xs">{user.phone || '-'}</span>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4 w-full pt-4">
                                                <div className="bg-secondary/20 p-3 rounded-lg">
                                                    <div className="text-2xl font-bold text-primary">{stats.activeTasks}</div>
                                                    <div className="text-xs text-muted-foreground flex items-center justify-center gap-1"><Briefcase className="h-3 w-3" /> Active</div>
                                                </div>
                                                <div className="bg-secondary/20 p-3 rounded-lg">
                                                    <div className="text-2xl font-bold text-green-600">{stats.completedTasks}</div>
                                                    <div className="text-xs text-muted-foreground flex items-center justify-center gap-1"><CheckSquare className="h-3 w-3" /> Done</div>
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            )
                        })}
                    </div>
                </div>
            ) : (
                <div className="space-y-6">
                    {/* Attendance Sheet View */}
                    <AttendanceSheet users={users} />
                </div>
            )}

            {/* Delete Dialog */}
            <Dialog open={!!userToDelete} onOpenChange={(open) => !open && setUserToDelete(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Confirm Delete</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to remove this team member? This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setUserToDelete(null)}>Cancel</Button>
                        <Button variant="destructive" onClick={confirmDeleteUser}>Delete</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
