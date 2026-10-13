import { useState, useMemo } from 'react'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
    UserCheck,
    Search,
    Shield,
    PhoneCall,
    Check,
    UserX,
    Users,
    Layers,
    Loader2,
    Sparkles
} from 'lucide-react'
import type { Lead, User } from '@/types'

interface AssignLeadDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    leadsToAssign: Lead[]
    users: User[]
    allLeads?: Lead[]
    onConfirmAssign: (targetUserId: string, targetUserName: string) => Promise<void>
}

export function AssignLeadDialog({
    open,
    onOpenChange,
    leadsToAssign,
    users,
    allLeads = [],
    onConfirmAssign
}: AssignLeadDialogProps) {
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedRoleFilter, setSelectedRoleFilter] = useState<'all' | 'telecaller' | 'admin'>('all')
    const [selectedUserId, setSelectedUserId] = useState<string>('')
    const [isSubmitting, setIsSubmitting] = useState(false)

    // Calculate active lead count per user
    const userWorkloadMap = useMemo(() => {
        const counts = new Map<string, number>()
        allLeads.forEach(l => {
            const agentKey = l.assignedTo || l.assignedToName || l.createdByName
            if (agentKey) {
                counts.set(agentKey, (counts.get(agentKey) || 0) + 1)
            }
        })
        return counts
    }, [allLeads])

    // Filter staff members (exclude clients)
    const staffUsers = useMemo(() => {
        return (users || []).filter(u => u.role !== 'client')
    }, [users])

    // Filtered users according to search & role tab
    const filteredUsers = useMemo(() => {
        return staffUsers.filter(u => {
            const nameMatch = (u.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                              (u.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                              (u.designation || '').toLowerCase().includes(searchQuery.toLowerCase())
            if (!nameMatch) return false

            const r = (u.role || '').toLowerCase()
            if (selectedRoleFilter === 'telecaller') {
                return r.includes('tele') || r.includes('caller') || r.includes('sales') || r === 'employee'
            }
            if (selectedRoleFilter === 'admin') {
                return r === 'admin' || r === 'owner' || r.includes('manager')
            }
            return true
        })
    }, [staffUsers, searchQuery, selectedRoleFilter])

    const isBulk = leadsToAssign.length > 1
    const singleLead = leadsToAssign[0]

    const handleAssign = async () => {
        if (!selectedUserId) return
        setIsSubmitting(true)
        try {
            if (selectedUserId === 'unassigned') {
                await onConfirmAssign('', 'Unassigned')
            } else {
                const targetUser = staffUsers.find(u => (u.id || (u as any)._id) === selectedUserId)
                const name = targetUser ? targetUser.name : 'Telecaller'
                await onConfirmAssign(selectedUserId, name)
            }
            onOpenChange(false)
        } catch (error) {
            console.error('Assign error:', error)
        } finally {
            setIsSubmitting(false)
        }
    }

    const getInitials = (name: string) => {
        return name
            ? name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
            : 'U'
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md sm:max-w-lg rounded-2xl p-0 overflow-hidden border-border/60 shadow-2xl">
                {/* Header */}
                <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-5 border-b border-border/40">
                    <DialogHeader>
                        <div className="flex items-center gap-2.5 mb-1">
                            <div className="w-9 h-9 rounded-xl bg-primary/15 text-primary flex items-center justify-center shadow-xs">
                                <UserCheck className="h-5 w-5" />
                            </div>
                            <div>
                                <DialogTitle className="text-lg font-bold tracking-tight text-foreground">
                                    {isBulk ? `Assign ${leadsToAssign.length} Leads` : 'Assign Lead to Telecaller'}
                                </DialogTitle>
                                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                                    {isBulk
                                        ? `Transfer ${leadsToAssign.length} selected leads to any team member or telecaller.`
                                        : `Assign "${singleLead?.company || singleLead?.name}" to an active telecaller.`}
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>

                    {/* Lead Info Banner */}
                    {!isBulk && singleLead && (
                        <div className="mt-3.5 p-3 rounded-xl bg-card border border-border/60 flex items-center justify-between text-xs font-sans">
                            <div className="space-y-0.5 truncate pr-2">
                                <div className="font-bold text-foreground text-sm truncate">{singleLead.company}</div>
                                <div className="text-muted-foreground text-[11px] truncate">
                                    Contact: <strong className="text-foreground">{singleLead.name}</strong>
                                    {singleLead.phone ? ` • ${singleLead.phone}` : ''}
                                </div>
                            </div>
                            <div className="text-right shrink-0">
                                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Current Assignee</span>
                                <Badge variant="secondary" className="text-[10px] font-semibold mt-0.5 bg-primary/10 text-primary border-primary/20">
                                    {singleLead.assignedToName || singleLead.createdByName || 'Unassigned'}
                                </Badge>
                            </div>
                        </div>
                    )}

                    {isBulk && (
                        <div className="mt-3 p-2.5 rounded-xl bg-card/80 border border-border/60 flex items-center gap-2 text-xs font-semibold text-primary">
                            <Layers className="h-4 w-4" />
                            <span>Assigning in bulk across {leadsToAssign.length} leads</span>
                        </div>
                    )}
                </div>

                <div className="p-5 space-y-4">
                    {/* Search & Filters */}
                    <div className="space-y-2.5">
                        <div className="relative">
                            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search telecaller by name or designation..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9 h-9 text-xs rounded-xl border-border/60 bg-muted/20"
                            />
                        </div>

                        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
                            <button
                                type="button"
                                onClick={() => setSelectedRoleFilter('all')}
                                className={`text-[11px] font-bold px-2.5 py-1 rounded-lg transition-all ${
                                    selectedRoleFilter === 'all'
                                        ? 'bg-primary text-primary-foreground shadow-xs'
                                        : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                                }`}
                            >
                                All Staff ({staffUsers.length})
                            </button>
                            <button
                                type="button"
                                onClick={() => setSelectedRoleFilter('telecaller')}
                                className={`text-[11px] font-bold px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 ${
                                    selectedRoleFilter === 'telecaller'
                                        ? 'bg-primary text-primary-foreground shadow-xs'
                                        : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                                }`}
                            >
                                <PhoneCall className="h-3 w-3" />
                                Telecallers & Sales
                            </button>
                            <button
                                type="button"
                                onClick={() => setSelectedRoleFilter('admin')}
                                className={`text-[11px] font-bold px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 ${
                                    selectedRoleFilter === 'admin'
                                        ? 'bg-primary text-primary-foreground shadow-xs'
                                        : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                                }`}
                            >
                                <Shield className="h-3 w-3" />
                                Admins / Managers
                            </button>
                        </div>
                    </div>

                    {/* Telecaller Selection List */}
                    <div className="space-y-1.5 max-h-[260px] overflow-y-auto pr-1 custom-scrollbar">
                        {/* Option: Unassign */}
                        <div
                            onClick={() => setSelectedUserId('unassigned')}
                            className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                                selectedUserId === 'unassigned'
                                    ? 'border-amber-500 bg-amber-500/10 ring-1 ring-amber-500/50'
                                    : 'border-border/40 hover:bg-muted/30 bg-card'
                            }`}
                        >
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-full bg-amber-500/15 text-amber-600 flex items-center justify-center shrink-0">
                                    <UserX className="h-4 w-4" />
                                </div>
                                <div>
                                    <div className="text-xs font-bold text-foreground">Pool (Unassigned)</div>
                                    <div className="text-[10px] text-muted-foreground">Keep lead in shared pool without a dedicated agent</div>
                                </div>
                            </div>
                            {selectedUserId === 'unassigned' && (
                                <div className="w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center shrink-0">
                                    <Check className="h-3 w-3 stroke-[3]" />
                                </div>
                            )}
                        </div>

                        {/* List of staff */}
                        {filteredUsers.map(user => {
                            const uId = user.id || (user as any)._id
                            const isSelected = selectedUserId === uId
                            const workload = userWorkloadMap.get(uId) || userWorkloadMap.get(user.name) || 0
                            const isCurrent = !isBulk && (singleLead?.assignedTo === uId || singleLead?.assignedToName === user.name)

                            return (
                                <div
                                    key={uId}
                                    onClick={() => setSelectedUserId(uId)}
                                    className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                                        isSelected
                                            ? 'border-primary bg-primary/10 ring-1 ring-primary/40'
                                            : 'border-border/40 hover:bg-muted/30 bg-card'
                                    }`}
                                >
                                    <div className="flex items-center gap-2.5 min-w-0 pr-2">
                                        <Avatar className="h-8 w-8 rounded-lg shrink-0 border border-border/40">
                                            {user.avatar ? (
                                                <AvatarImage src={user.avatar} alt={user.name} />
                                            ) : null}
                                            <AvatarFallback className="rounded-lg text-[11px] font-bold bg-primary/10 text-primary">
                                                {getInitials(user.name)}
                                            </AvatarFallback>
                                        </Avatar>

                                        <div className="min-w-0">
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-xs font-bold text-foreground truncate">{user.name}</span>
                                                {isCurrent && (
                                                    <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-muted text-muted-foreground">
                                                        Current
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-[10px] text-muted-foreground flex items-center gap-1.5 truncate">
                                                <span className="capitalize">{user.role}</span>
                                                {user.designation ? <span>• {user.designation}</span> : null}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 shrink-0">
                                        <span className="text-[10px] font-bold text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-md" title="Active leads assigned">
                                            {workload} {workload === 1 ? 'lead' : 'leads'}
                                        </span>

                                        <div className={`w-5 h-5 rounded-full flex items-center justify-center transition-all ${
                                            isSelected ? 'bg-primary text-primary-foreground' : 'border border-border/60'
                                        }`}>
                                            {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                                        </div>
                                    </div>
                                </div>
                            )
                        })}

                        {filteredUsers.length === 0 && (
                            <div className="p-8 text-center text-xs text-muted-foreground">
                                No telecaller found matching "{searchQuery}"
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="p-4 bg-muted/20 border-t border-border/40 flex items-center justify-between">
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={() => onOpenChange(false)}
                        className="h-9 rounded-xl text-xs font-semibold"
                        disabled={isSubmitting}
                    >
                        Cancel
                    </Button>

                    <Button
                        type="button"
                        onClick={handleAssign}
                        disabled={!selectedUserId || isSubmitting}
                        className="h-9 px-5 rounded-xl font-bold text-xs bg-primary text-primary-foreground hover:bg-primary/90 shadow-md flex items-center gap-1.5"
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                Assigning...
                            </>
                        ) : (
                            <>
                                <UserCheck className="h-3.5 w-3.5" />
                                {isBulk ? `Assign ${leadsToAssign.length} Leads` : 'Confirm Assignment'}
                            </>
                        )}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
