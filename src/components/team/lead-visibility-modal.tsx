import { useState, useEffect, useMemo } from 'react'
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
import { Checkbox } from '@/components/ui/checkbox'
import { Avatar } from '@/components/ui/avatar'
import { 
    Shield, 
    Users, 
    Lock, 
    Search, 
    CheckCircle2, 
    AlertCircle, 
    Loader2, 
    Eye, 
    UserCheck,
    CheckSquare,
    Square
} from 'lucide-react'
import { getInitials } from '@/lib/utils'
import api from '@/lib/api-client'
import { useToast } from '@/hooks/use-toast'
import { useAppStore } from '@/store'
import type { User } from '@/types'

interface LeadVisibilityModalProps {
    isOpen: boolean
    onClose: () => void
    targetUser: User | null
    allUsers: User[]
    onSuccess?: (updatedUser: any) => void
}

export function LeadVisibilityModal({
    isOpen,
    onClose,
    targetUser,
    allUsers,
    onSuccess
}: LeadVisibilityModalProps) {
    const { toast } = useToast()
    const { users, setUsers, currentUser, setCurrentUser } = useAppStore()

    const [scope, setScope] = useState<'own' | 'all' | 'custom'>('own')
    const [selectedAgentIds, setSelectedAgentIds] = useState<string[]>([])
    const [searchQuery, setSearchQuery] = useState('')
    const [saving, setSaving] = useState(false)

    // Sync state whenever modal opens or targetUser changes
    useEffect(() => {
        if (targetUser && isOpen) {
            setScope(targetUser.leadViewScope || 'own')
            const existingIds = (targetUser.allowedLeadAgents || []).map((a: any) => 
                typeof a === 'string' ? a : (a._id || a.id)
            ).filter(Boolean)
            setSelectedAgentIds(existingIds)
            setSearchQuery('')
        }
    }, [targetUser, isOpen])

    const targetUserId = targetUser ? (targetUser.id || (targetUser as any)._id) : ''

    // Candidate agents to select: all team members except clients and the target user themselves
    const candidateAgents = useMemo(() => {
        return allUsers.filter(u => {
            const uid = u.id || (u as any)._id
            if (uid === targetUserId) return false
            if (u.role === 'client') return false
            return true
        })
    }, [allUsers, targetUserId])

    // Filter candidate agents by search query
    const filteredAgents = useMemo(() => {
        if (!searchQuery.trim()) return candidateAgents
        const q = searchQuery.toLowerCase().trim()
        return candidateAgents.filter(u => 
            u.name.toLowerCase().includes(q) ||
            u.email.toLowerCase().includes(q) ||
            (u.designation && u.designation.toLowerCase().includes(q))
        )
    }, [candidateAgents, searchQuery])

    const handleToggleAgent = (agentId: string) => {
        setSelectedAgentIds(prev => 
            prev.includes(agentId) 
                ? prev.filter(id => id !== agentId)
                : [...prev, agentId]
        )
    }

    const handleSelectAll = () => {
        const allIds = candidateAgents.map(a => a.id || (a as any)._id)
        setSelectedAgentIds(allIds)
    }

    const handleDeselectAll = () => {
        setSelectedAgentIds([])
    }

    const handleSave = async () => {
        if (!targetUser || !targetUserId) return

        setSaving(true)
        try {
            const payload = {
                leadViewScope: scope,
                allowedLeadAgents: scope === 'custom' ? selectedAgentIds : []
            }

            const res = await api.put(`/users/${targetUserId}/lead-access`, payload)
            const updatedUser = res.data.user || res.data

            // Update user in global store
            const updatedUsers = users.map(u => {
                const uid = u.id || (u as any)._id
                if (uid === targetUserId) {
                    return {
                        ...u,
                        leadViewScope: scope,
                        allowedLeadAgents: updatedUser.allowedLeadAgents || payload.allowedLeadAgents
                    }
                }
                return u
            })
            setUsers(updatedUsers)

            // If updating current user's own profile, update currentUser too
            const currentId = currentUser?.id || (currentUser as any)?._id
            if (currentId === targetUserId) {
                setCurrentUser({
                    ...currentUser,
                    leadViewScope: scope,
                    allowedLeadAgents: updatedUser.allowedLeadAgents || payload.allowedLeadAgents
                })
            }

            toast({
                title: 'Permissions Updated',
                description: `Lead visibility for ${targetUser.name} saved as ${
                    scope === 'all' 
                        ? 'All Leads (Company-wide)' 
                        : scope === 'custom' 
                            ? `Custom (${selectedAgentIds.length} agents)` 
                            : 'Own Leads Only'
                }`,
                variant: 'success'
            })

            if (onSuccess) onSuccess(updatedUser)
            onClose()
        } catch (error: any) {
            console.error('Failed to update lead access:', error)
            toast({
                title: 'Update Failed',
                description: error.response?.data?.message || 'Could not save lead visibility permissions',
                variant: 'destructive'
            })
        } finally {
            setSaving(false)
        }
    }

    if (!targetUser) return null

    // Names of currently selected agents for the preview banner
    const selectedAgentNames = candidateAgents
        .filter(a => selectedAgentIds.includes(a.id || (a as any)._id))
        .map(a => a.name)

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 overflow-hidden shadow-2xl border-border/60">
                {/* Header */}
                <DialogHeader className="p-6 border-b bg-muted/20">
                    <div className="flex items-center gap-3">
                        <Avatar className="h-12 w-12 border-2 border-primary/20 shrink-0">
                            {targetUser.avatar ? (
                                <img src={targetUser.avatar} className="h-full w-full object-cover" />
                            ) : (
                                <div className="flex h-full w-full items-center justify-center bg-primary/10 text-primary font-bold text-base">
                                    {getInitials(targetUser.name)}
                                </div>
                            )}
                        </Avatar>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                                <DialogTitle className="text-xl font-bold truncate">
                                    {targetUser.name}
                                </DialogTitle>
                                <Badge variant="outline" className="capitalize text-xs font-semibold">
                                    {targetUser.role}
                                </Badge>
                            </div>
                            <DialogDescription className="text-xs text-muted-foreground truncate">
                                {targetUser.email} &bull; Manage lead visibility and agent-to-agent lead viewing permissions
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Scope Options */}
                    <div>
                        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 block">
                            Select Lead Visibility Scope
                        </label>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            {/* Option 1: Own Only */}
                            <div
                                onClick={() => setScope('own')}
                                className={`cursor-pointer rounded-xl p-4 border transition-all text-left flex flex-col justify-between ${
                                    scope === 'own'
                                        ? 'border-primary bg-primary/5 ring-2 ring-primary/20 shadow-sm'
                                        : 'border-border/60 hover:border-border hover:bg-muted/30'
                                }`}
                            >
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <div className={`p-2 rounded-lg ${scope === 'own' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                                            <Lock className="h-4 w-4" />
                                        </div>
                                        {scope === 'own' && <CheckCircle2 className="h-4 w-4 text-primary" />}
                                    </div>
                                    <h4 className="font-semibold text-sm">Own Leads Only</h4>
                                    <p className="text-xs text-muted-foreground">
                                        Can only view leads assigned to or created by {targetUser.name}.
                                    </p>
                                </div>
                                <div className="mt-3 pt-2 border-t text-[11px] font-medium text-muted-foreground">
                                    Default restriction
                                </div>
                            </div>

                            {/* Option 2: All Leads */}
                            <div
                                onClick={() => setScope('all')}
                                className={`cursor-pointer rounded-xl p-4 border transition-all text-left flex flex-col justify-between ${
                                    scope === 'all'
                                        ? 'border-emerald-500 bg-emerald-500/5 ring-2 ring-emerald-500/20 shadow-sm'
                                        : 'border-border/60 hover:border-border hover:bg-muted/30'
                                }`}
                            >
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <div className={`p-2 rounded-lg ${scope === 'all' ? 'bg-emerald-600 text-white' : 'bg-muted text-muted-foreground'}`}>
                                            <Eye className="h-4 w-4" />
                                        </div>
                                        {scope === 'all' && <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
                                    </div>
                                    <h4 className="font-semibold text-sm">All Leads</h4>
                                    <p className="text-xs text-muted-foreground">
                                        Can view every lead across the entire company and all agents.
                                    </p>
                                </div>
                                <div className="mt-3 pt-2 border-t text-[11px] font-medium text-emerald-600">
                                    Company-wide access
                                </div>
                            </div>

                            {/* Option 3: Custom Specific Agents */}
                            <div
                                onClick={() => setScope('custom')}
                                className={`cursor-pointer rounded-xl p-4 border transition-all text-left flex flex-col justify-between ${
                                    scope === 'custom'
                                        ? 'border-blue-500 bg-blue-500/5 ring-2 ring-blue-500/20 shadow-sm'
                                        : 'border-border/60 hover:border-border hover:bg-muted/30'
                                }`}
                            >
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <div className={`p-2 rounded-lg ${scope === 'custom' ? 'bg-blue-600 text-white' : 'bg-muted text-muted-foreground'}`}>
                                            <Users className="h-4 w-4" />
                                        </div>
                                        {scope === 'custom' && <CheckCircle2 className="h-4 w-4 text-blue-600" />}
                                    </div>
                                    <h4 className="font-semibold text-sm">Specific Agents</h4>
                                    <p className="text-xs text-muted-foreground">
                                        Can view own leads plus leads of selected agents.
                                    </p>
                                </div>
                                <div className="mt-3 pt-2 border-t text-[11px] font-medium text-blue-600">
                                    {selectedAgentIds.length} agents selected
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Custom Agent Selection Panel */}
                    {scope === 'custom' && (
                        <div className="space-y-3 pt-2 border-t animate-in fade-in duration-200">
                            <div className="flex items-center justify-between flex-wrap gap-2">
                                <div>
                                    <h4 className="text-sm font-bold flex items-center gap-2">
                                        <Users className="h-4 w-4 text-blue-600" />
                                        Choose Agents Whose Leads {targetUser.name} Can View
                                    </h4>
                                    <p className="text-xs text-muted-foreground">
                                        Check the agents below to grant lead viewing visibility.
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="h-8 text-xs gap-1.5"
                                        onClick={handleSelectAll}
                                    >
                                        <CheckSquare className="h-3.5 w-3.5" /> Select All ({candidateAgents.length})
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 text-xs gap-1.5 text-muted-foreground"
                                        onClick={handleDeselectAll}
                                    >
                                        <Square className="h-3.5 w-3.5" /> Clear
                                    </Button>
                                </div>
                            </div>

                            {/* Search box */}
                            <div className="relative">
                                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search agents by name, email or designation..."
                                    className="pl-9 h-9 text-xs"
                                />
                            </div>

                            {/* Agent Checklist */}
                            <div className="border rounded-xl divide-y max-h-56 overflow-y-auto bg-muted/10">
                                {filteredAgents.length === 0 ? (
                                    <div className="p-6 text-center text-xs text-muted-foreground">
                                        No agents found matching &ldquo;{searchQuery}&rdquo;
                                    </div>
                                ) : (
                                    filteredAgents.map(agent => {
                                        const agentId = agent.id || (agent as any)._id
                                        const isChecked = selectedAgentIds.includes(agentId)

                                        return (
                                            <label
                                                key={agentId}
                                                className={`flex items-center justify-between p-3 cursor-pointer hover:bg-muted/40 transition-colors ${
                                                    isChecked ? 'bg-blue-500/5' : ''
                                                }`}
                                            >
                                                <div className="flex items-center gap-3 min-w-0 pr-2">
                                                    <Checkbox
                                                        checked={isChecked}
                                                        onCheckedChange={() => handleToggleAgent(agentId)}
                                                        className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                                                    />
                                                    <Avatar className="h-8 w-8 text-xs shrink-0">
                                                        {agent.avatar ? (
                                                            <img src={agent.avatar} className="h-full w-full object-cover" />
                                                        ) : (
                                                            <div className="flex h-full w-full items-center justify-center bg-secondary font-medium">
                                                                {getInitials(agent.name)}
                                                            </div>
                                                        )}
                                                    </Avatar>
                                                    <div className="min-w-0">
                                                        <div className="text-xs font-semibold text-foreground truncate">
                                                            {agent.name}
                                                        </div>
                                                        <div className="text-[11px] text-muted-foreground truncate">
                                                            {agent.email} {agent.designation ? `• ${agent.designation}` : ''}
                                                        </div>
                                                    </div>
                                                </div>
                                                <Badge variant="outline" className="capitalize text-[10px] shrink-0 font-normal">
                                                    {agent.role}
                                                </Badge>
                                            </label>
                                        )
                                    })
                                )}
                            </div>

                            {/* Live Explanation Preview */}
                            <div className="rounded-xl p-3 bg-blue-500/10 border border-blue-500/20 text-xs text-blue-900 dark:text-blue-200">
                                <div className="font-semibold flex items-center gap-1.5 mb-1">
                                    <Eye className="h-3.5 w-3.5 text-blue-600" />
                                    Active Permissions Preview:
                                </div>
                                {selectedAgentNames.length === 0 ? (
                                    <p className="text-muted-foreground">
                                        No other agents selected yet. {targetUser.name} will only see their own leads.
                                    </p>
                                ) : (
                                    <p>
                                        <strong>{targetUser.name}</strong> will see their own leads <strong>PLUS</strong> leads assigned to:{' '}
                                        <span className="font-semibold underline">
                                            {selectedAgentNames.slice(0, 5).join(', ')}
                                            {selectedAgentNames.length > 5 ? ` and ${selectedAgentNames.length - 5} others` : ''}
                                        </span>.
                                    </p>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Scope Explanation Banners */}
                    {scope === 'own' && (
                        <div className="rounded-xl p-3 bg-muted/40 border text-xs text-muted-foreground flex items-start gap-2.5">
                            <AlertCircle className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                            <div>
                                <strong className="text-foreground">Restricted View:</strong> {targetUser.name} can only see leads assigned directly to them or created by them. All other team members&apos; leads remain hidden.
                            </div>
                        </div>
                    )}

                    {scope === 'all' && (
                        <div className="rounded-xl p-3 bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-900 dark:text-emerald-200 flex items-start gap-2.5">
                            <Shield className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                            <div>
                                <strong className="text-emerald-700 dark:text-emerald-300">Company-wide Access:</strong> {targetUser.name} will be able to see and search all leads across all sales agents, telecallers, and managers.
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <DialogFooter className="p-4 border-t bg-muted/20 gap-2 sm:gap-0">
                    <Button variant="outline" onClick={onClose} disabled={saving}>
                        Cancel
                    </Button>
                    <Button 
                        onClick={handleSave} 
                        disabled={saving} 
                        className="brand-gradient border-none gap-2 shadow-md"
                    >
                        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserCheck className="h-4 w-4" />}
                        {saving ? 'Saving Permissions...' : 'Save Lead Permissions'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
