import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAppStore } from '@/store'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'

import { Label } from '@/components/ui/label'
import { ArrowLeft, Mail, Phone, Briefcase, MapPin, User, FileText, Shield, Edit, Save, SlidersHorizontal, Eye, Users as UsersIcon } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import api from '@/lib/api-client'
import { useToast } from '@/hooks/use-toast'
import { getInitials, formatDate, formatCurrency } from '@/lib/utils'
import { LeadVisibilityModal } from '@/components/team/lead-visibility-modal'

export function TeamMemberPage() {
    const { id } = useParams()
    const navigate = useNavigate()
    const { users, currentUser, setUsers } = useAppStore()
    const isAdminOrOwner = currentUser?.role === 'admin' || currentUser?.role === 'owner'
    const [user, setUser] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
    const [isLeadAccessModalOpen, setIsLeadAccessModalOpen] = useState(false)
    const [editForm, setEditForm] = useState<any>({})
    const [newPassword, setNewPassword] = useState('')
    const { toast } = useToast()

    // State for New Member Form (Simulated here if ID is new, but main Add is in Modal now)

    useEffect(() => {
        if (!isEditDialogOpen) {
            setNewPassword('')
        }
    }, [isEditDialogOpen])

    useEffect(() => {
        const fetchUser = async () => {
            if (id === 'new') {
                setLoading(false)
                return
            }

            const found = users.find(u => u.id === id)
            if (found) {
                setUser(found)
                setEditForm(found)
                setLoading(false)
            } else {
                try {
                    const res = await api.get(`/users/${id}`)
                    const mapped = { ...res.data, id: res.data._id }
                    setUser(mapped)
                    setEditForm(mapped)
                } catch (error) {
                    toast({ variant: "destructive", title: "Error", description: "User not found" })
                } finally {
                    setLoading(false)
                }
            }
        }
        fetchUser()
    }, [id, users, toast])

    const handleUpdateUser = async () => {
        try {
            const payload = { ...editForm }
            if (newPassword) {
                payload.password = newPassword
            } else {
                delete payload.password
            }
            const res = await api.put(`/users/${id}`, payload)
            const updated = { ...res.data, id: res.data._id }
            setUser(updated)
            setNewPassword('')
            setIsEditDialogOpen(false)
            toast({ title: "Success", description: "User updated successfully" })
        } catch (error) {
            toast({ variant: "destructive", title: "Error", description: "Failed to update user" })
        }
    }

    const getManagerName = (managerId: string) => {
        if (!managerId) return 'N/A'
        const manager = users.find(u => u.id === managerId)
        return manager ? manager.name : 'Unknown'
    }

    const openDocument = (url?: string) => {
        if (url) {
            const win = window.open()
            if (win) {
                win.document.write(`<iframe src="${url}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`)
            }
        }
    }

    if (loading) return <div className="p-8 flex justify-center">Loading member details...</div>
    if (id === 'new') return <div className="p-8">Please use the 'Add Member' button on the Team page.</div>
    if (!user) return <div className="p-8">User not found</div>

    const current = useAppStore.getState().currentUser
    const isAdminOrOwner = current && ['admin', 'owner'].includes(current.role)
    const isSelf = current && current.id === id

    if (current && !isAdminOrOwner && !isSelf) {
        return (
            <div className="p-8 max-w-md mx-auto text-center space-y-4 border rounded-lg bg-card shadow mt-10">
                <Shield className="h-12 w-12 text-destructive mx-auto" />
                <h2 className="text-xl font-bold text-destructive">Access Denied</h2>
                <p className="text-muted-foreground text-sm">You do not have permission to view other members' private profiles.</p>
                <Button onClick={() => navigate('/team')} className="w-full mt-4">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back to Team
                </Button>
            </div>
        )
    }

    // --- VIEW USER PROFILE ---
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => navigate('/team')}>
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold">Member Profile</h1>
                        <p className="text-muted-foreground text-sm">View full employee details.</p>
                    </div>
                </div>
                {(isAdminOrOwner || isSelf) && (
                    <Button onClick={() => setIsEditDialogOpen(true)} className="gap-2">
                        <Edit className="h-4 w-4" /> Edit Profile
                    </Button>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column: ID Card */}
                <Card className="lg:col-span-1 h-fit">
                    <CardContent className="p-6 flex flex-col items-center text-center space-y-6">
                        <div className="relative">
                            <Avatar className="h-32 w-32 border-4 border-muted/50">
                                {user.avatar ? (
                                    <img src={user.avatar} className="h-full w-full object-cover" />
                                ) : (
                                    <div className="flex h-full w-full items-center justify-center bg-primary/10 text-4xl font-bold text-primary">
                                        {getInitials(user.name)}
                                    </div>
                                )}
                            </Avatar>
                            <span className="absolute bottom-0 right-0 bg-green-500 w-5 h-5 rounded-full border-4 border-white"></span>
                        </div>

                        <div>
                            <h2 className="text-2xl font-bold">{user.salutation} {user.name}</h2>
                            <div className="text-muted-foreground font-medium mt-1">{user.designation || user.role}</div>
                            <Badge variant="secondary" className="mt-3 capitalize">{user.role}</Badge>
                        </div>

                        <div className="w-full space-y-4 pt-6 border-t text-sm text-left">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-primary/10 rounded-lg"><Mail className="h-4 w-4 text-primary" /></div>
                                <div>
                                    <div className="text-xs text-muted-foreground">Email</div>
                                    <div className="font-medium">{user.email}</div>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-primary/10 rounded-lg"><Phone className="h-4 w-4 text-primary" /></div>
                                <div>
                                    <div className="text-xs text-muted-foreground">Phone</div>
                                    <div className="font-medium">{user.phone || 'N/A'}</div>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-primary/10 rounded-lg"><MapPin className="h-4 w-4 text-primary" /></div>
                                <div>
                                    <div className="text-xs text-muted-foreground">Location</div>
                                    <div className="font-medium">{user.country || 'N/A'}</div>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Right Column: Detailed Info */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Professional Details */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Briefcase className="h-5 w-5 text-muted-foreground" />
                                Professional Details
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <Label className="text-muted-foreground text-xs">Employee ID</Label>
                                <div className="font-medium">{user.employeeId || 'N/A'}</div>
                            </div>
                            <div>
                                <Label className="text-muted-foreground text-xs">Department</Label>
                                <div className="font-medium">{user.department || 'N/A'}</div>
                            </div>
                            <div>
                                <Label className="text-muted-foreground text-xs">Designation</Label>
                                <div className="font-medium">{user.designation || 'N/A'}</div>
                            </div>
                            <div>
                                <Label className="text-muted-foreground text-xs">Reporting To</Label>
                                <div className="font-medium flex items-center gap-2">
                                    {user.reportingTo ? (
                                        <Badge variant="outline">{getManagerName(user.reportingTo)}</Badge>
                                    ) : 'N/A'}
                                </div>
                            </div>
                            <div>
                                <Label className="text-muted-foreground text-xs">Joining Date</Label>
                                <div className="font-medium">{user.joiningDate ? formatDate(user.joiningDate) : 'N/A'}</div>
                            </div>
                            <div>
                                <Label className="text-muted-foreground text-xs">Work Status</Label>
                                <div className="font-medium text-green-600">Active</div>
                            </div>
                            <div>
                                <Label className="text-muted-foreground text-xs">Monthly Salary</Label>
                                <div className="font-medium">{user.salary ? formatCurrency(Number(user.salary)) : 'N/A'}</div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Personal Information */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <User className="h-5 w-5 text-muted-foreground" />
                                Personal Information
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <Label className="text-muted-foreground text-xs">Date of Birth</Label>
                                <div className="font-medium">{user.dateOfBirth ? formatDate(user.dateOfBirth) : 'N/A'}</div>
                            </div>
                            <div>
                                <Label className="text-muted-foreground text-xs">Gender</Label>
                                <div className="font-medium">{user.gender || 'N/A'}</div>
                            </div>
                            <div>
                                <Label className="text-muted-foreground text-xs">Language</Label>
                                <div className="font-medium">{user.language || 'English'}</div>
                            </div>
                            <div className="md:col-span-2">
                                <Label className="text-muted-foreground text-xs">Address</Label>
                                <div className="font-medium">{user.address || 'N/A'}</div>
                            </div>
                            <div className="md:col-span-2">
                                <Label className="text-muted-foreground text-xs">About</Label>
                                <p className="font-medium text-sm leading-relaxed text-muted-foreground px-3 py-2 bg-muted/30 rounded-lg">
                                    {user.about || 'No bio provided.'}
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* KYC Documents */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Shield className="h-5 w-5 text-muted-foreground" />
                                KYC & Documents
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <Label className="text-muted-foreground text-xs">Aadhar Number</Label>
                                <div className="font-medium font-mono">{user.aadharNumber || 'N/A'}</div>
                            </div>
                            <div>
                                <Label className="text-muted-foreground text-xs">PAN Number</Label>
                                <div className="font-medium font-mono">{user.panNumber || 'N/A'}</div>
                            </div>
                            <div className="p-4 border rounded-lg flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <FileText className="h-8 w-8 text-blue-500" />
                                    <div>
                                        <div className="font-medium">Aadhar Card</div>
                                        <div className="text-xs text-muted-foreground">Document</div>
                                    </div>
                                </div>
                                {user.documentAadhar ? (
                                    <Button variant="outline" size="sm" onClick={() => openDocument(user.documentAadhar)}>View</Button>
                                ) : <span className="text-xs text-muted-foreground">Not uploaded</span>}
                            </div>
                            <div className="p-4 border rounded-lg flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <FileText className="h-8 w-8 text-blue-500" />
                                    <div>
                                        <div className="font-medium">PAN Card</div>
                                        <div className="text-xs text-muted-foreground">Document</div>
                                    </div>
                                </div>
                                {user.documentPan ? (
                                    <Button variant="outline" size="sm" onClick={() => openDocument(user.documentPan)}>View</Button>
                                ) : <span className="text-xs text-muted-foreground">Not uploaded</span>}
                            </div>
                            <div className="p-4 border rounded-lg flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <FileText className="h-8 w-8 text-blue-500" />
                                    <div>
                                        <div className="font-medium">Offer Letter</div>
                                        <div className="text-xs text-muted-foreground">Document</div>
                                    </div>
                                </div>
                                {user.documentOfferLetter ? (
                                    <Button variant="outline" size="sm" onClick={() => openDocument(user.documentOfferLetter)}>View</Button>
                                ) : <span className="text-xs text-muted-foreground">Not uploaded</span>}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Lead Visibility Permissions Card */}
                    <Card className="border-border/60 shadow-sm">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="flex items-center gap-2 text-base">
                                <Eye className="h-5 w-5 text-primary" />
                                Lead Visibility Access (लीड परमिशन)
                            </CardTitle>
                            {isAdminOrOwner && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 text-xs gap-1.5"
                                    onClick={() => setIsLeadAccessModalOpen(true)}
                                >
                                    <SlidersHorizontal className="h-3.5 w-3.5" />
                                    Configure Access
                                </Button>
                            )}
                        </CardHeader>
                        <CardContent className="space-y-4 pt-2">
                            <div className="flex items-center justify-between flex-wrap gap-2">
                                <div>
                                    <Label className="text-muted-foreground text-xs block mb-1">Current Lead View Scope</Label>
                                    <div className="flex items-center gap-2">
                                        {user.leadViewScope === 'all' && (
                                            <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-xs font-semibold gap-1.5">
                                                <Eye className="h-3.5 w-3.5" /> All Leads (Company-Wide)
                                            </Badge>
                                        )}
                                        {user.leadViewScope === 'custom' && (
                                            <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20 text-xs font-semibold gap-1.5">
                                                <UsersIcon className="h-3.5 w-3.5" /> Specific Agents ({user.allowedLeadAgents?.length || 0})
                                            </Badge>
                                        )}
                                        {(!user.leadViewScope || user.leadViewScope === 'own') && (
                                            <Badge variant="secondary" className="text-xs font-medium gap-1.5 text-muted-foreground">
                                                <Shield className="h-3.5 w-3.5" /> Own Leads Only (Restricted)
                                            </Badge>
                                        )}
                                    </div>
                                </div>
                                <div className="text-xs text-muted-foreground">
                                    {user.leadViewScope === 'all' && 'Can view, search and follow up on leads from all team members.'}
                                    {(!user.leadViewScope || user.leadViewScope === 'own') && 'Only sees leads created by or assigned to them.'}
                                    {user.leadViewScope === 'custom' && 'Sees own leads plus leads belonging to selected team agents.'}
                                </div>
                            </div>

                            {user.leadViewScope === 'custom' && user.allowedLeadAgents && user.allowedLeadAgents.length > 0 && (
                                <div className="p-3 bg-muted/30 rounded-xl border border-dashed space-y-2">
                                    <span className="text-xs font-semibold text-muted-foreground block">
                                        Permitted Agents whose leads {user.name} can access:
                                    </span>
                                    <div className="flex flex-wrap gap-1.5">
                                        {user.allowedLeadAgents.map((ag: any, i: number) => {
                                            const agName = typeof ag === 'string' 
                                                ? (users.find(u => (u.id || (u as any)._id) === ag)?.name || 'Agent')
                                                : (ag.name || 'Agent')
                                            return (
                                                <span key={i} className="px-2.5 py-1 rounded-lg text-xs font-medium bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                                                    {agName}
                                                </span>
                                            )
                                        })}
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                </div>
            </div>

            {/* Edit Dialog */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent className="max-w-2xl h-[80vh] flex flex-col p-0">
                    <DialogHeader className="p-6 border-b">
                        <DialogTitle>Edit Employee Details</DialogTitle>
                    </DialogHeader>
                    <div className="flex-1 overflow-y-auto p-6 space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Name</Label>
                                <Input value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <Label>Email</Label>
                                <Input value={editForm.email} onChange={e => setEditForm({ ...editForm, email: e.target.value })} />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Designation</Label>
                                <Input value={editForm.designation} onChange={e => setEditForm({ ...editForm, designation: e.target.value })} disabled={!isAdminOrOwner} />
                            </div>
                            <div className="space-y-2">
                                <Label>Department</Label>
                                <Input value={editForm.department} onChange={e => setEditForm({ ...editForm, department: e.target.value })} disabled={!isAdminOrOwner} />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Monthly Salary</Label>
                                <Input value={editForm.salary} onChange={e => setEditForm({ ...editForm, salary: e.target.value })} placeholder="e.g. 50000" disabled={!isAdminOrOwner} />
                            </div>
                            <div className="space-y-2">
                                <Label>Phone</Label>
                                <Input value={editForm.phone} onChange={e => setEditForm({ ...editForm, phone: e.target.value })} />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Address</Label>
                            <Textarea value={editForm.address} onChange={e => setEditForm({ ...editForm, address: e.target.value })} />
                        </div>
                        <div className="space-y-2">
                            <Label>Change Password (leave blank to keep current)</Label>
                            <Input 
                                type="password" 
                                value={newPassword} 
                                onChange={e => setNewPassword(e.target.value)} 
                                placeholder="Enter new password" 
                            />
                        </div>
                    </div>
                    <DialogFooter className="p-4 border-t gap-2">
                        <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleUpdateUser} className="gap-2">
                            <Save className="h-4 w-4" /> Save Changes
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Lead Visibility Permission Modal */}
            <LeadVisibilityModal
                isOpen={isLeadAccessModalOpen}
                onClose={() => setIsLeadAccessModalOpen(false)}
                targetUser={user}
                allUsers={users}
                onSuccess={(updatedUser) => {
                    const mapped = { ...updatedUser, id: updatedUser._id || updatedUser.id }
                    setUser(mapped)
                    const updatedUsers = users.map(u => 
                        (u.id || (u as any)._id) === mapped.id ? mapped : u
                    )
                    setUsers(updatedUsers)
                }}
            />
        </div>
    )
}
