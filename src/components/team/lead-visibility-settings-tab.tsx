import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar } from '@/components/ui/avatar'
import { 
    Shield, 
    Users, 
    Lock, 
    Eye, 
    Search, 
    SlidersHorizontal, 
    UserCheck, 
    ArrowRight,
    RefreshCw
} from 'lucide-react'
import { getInitials } from '@/lib/utils'
import { LeadVisibilityModal } from './lead-visibility-modal'
import { useAppStore } from '@/store'
import api from '@/lib/api-client'
import type { User } from '@/types'

export function LeadVisibilitySettingsTab() {
    const { users, setUsers } = useAppStore()
    const [searchQuery, setSearchQuery] = useState('')
    const [filterScope, setFilterScope] = useState<'all' | 'own' | 'all_leads' | 'custom'>('all')
    const [selectedUserForEdit, setSelectedUserForEdit] = useState<User | null>(null)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [refreshing, setRefreshing] = useState(false)

    // Filter agents (all non-client users)
    const agents = useMemo(() => {
        return users.filter(u => u.role !== 'client')
    }, [users])

    // KPI Metrics
    const stats = useMemo(() => {
        const total = agents.length
        const ownCount = agents.filter(a => !a.leadViewScope || a.leadViewScope === 'own').length
        const allCount = agents.filter(a => a.leadViewScope === 'all').length
        const customCount = agents.filter(a => a.leadViewScope === 'custom').length
        return { total, ownCount, allCount, customCount }
    }, [agents])

    // Filtered list based on search and scope tab
    const filteredAgents = useMemo(() => {
        return agents.filter(agent => {
            const currentScope = agent.leadViewScope || 'own'
            if (filterScope === 'own' && currentScope !== 'own') return false
            if (filterScope === 'all_leads' && currentScope !== 'all') return false
            if (filterScope === 'custom' && currentScope !== 'custom') return false

            if (!searchQuery.trim()) return true
            const q = searchQuery.toLowerCase().trim()
            return (
                agent.name.toLowerCase().includes(q) ||
                agent.email.toLowerCase().includes(q) ||
                (agent.role && agent.role.toLowerCase().includes(q)) ||
                (agent.designation && agent.designation.toLowerCase().includes(q))
            )
        })
    }, [agents, filterScope, searchQuery])

    const handleRefresh = async () => {
        setRefreshing(true)
        try {
            const res = await api.get('/users')
            setUsers(res.data.map((u: any) => ({ id: u._id, ...u })))
        } catch (e) {
            console.error('Failed to refresh users', e)
        } finally {
            setRefreshing(false)
        }
    }

    const handleConfigure = (agent: User) => {
        setSelectedUserForEdit(agent)
        setIsModalOpen(true)
    }

    // Helper to format allowed agents names
    const getAllowedAgentNames = (agent: User) => {
        const allowed = agent.allowedLeadAgents || []
        if (allowed.length === 0) return []

        return allowed.map((item: any) => {
            if (typeof item === 'string') {
                const found = users.find(u => (u.id || (u as any)._id) === item)
                return found ? found.name : 'Unknown Agent'
            }
            return item.name || 'Unknown Agent'
        })
    }

    return (
        <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="border-border/60 shadow-sm bg-card/60 backdrop-blur-sm">
                    <CardContent className="p-4 flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                            <Users className="h-5 w-5" />
                        </div>
                        <div>
                            <div className="text-2xl font-bold tracking-tight">{stats.total}</div>
                            <div className="text-xs text-muted-foreground">Total Staff / Agents</div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-border/60 shadow-sm bg-card/60 backdrop-blur-sm">
                    <CardContent className="p-4 flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-slate-500/10 text-slate-500">
                            <Lock className="h-5 w-5" />
                        </div>
                        <div>
                            <div className="text-2xl font-bold tracking-tight">{stats.ownCount}</div>
                            <div className="text-xs text-muted-foreground">Own Leads Only (Restricted)</div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-border/60 shadow-sm bg-card/60 backdrop-blur-sm">
                    <CardContent className="p-4 flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600">
                            <Eye className="h-5 w-5" />
                        </div>
                        <div>
                            <div className="text-2xl font-bold tracking-tight">{stats.allCount}</div>
                            <div className="text-xs text-muted-foreground">All Leads (Company-Wide)</div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-border/60 shadow-sm bg-card/60 backdrop-blur-sm">
                    <CardContent className="p-4 flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600">
                            <Shield className="h-5 w-5" />
                        </div>
                        <div>
                            <div className="text-2xl font-bold tracking-tight">{stats.customCount}</div>
                            <div className="text-xs text-muted-foreground">Specific Agents' Leads</div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Controls Bar */}
            <Card className="border-border/60 shadow-sm">
                <CardContent className="p-4 flex flex-col md:flex-row items-center justify-between gap-4">
                    {/* Search */}
                    <div className="relative w-full md:w-80">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search agents by name, email..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 h-9 text-xs"
                        />
                    </div>

                    {/* Filter Pills */}
                    <div className="flex items-center gap-1.5 flex-wrap w-full md:w-auto">
                        <Button
                            variant={filterScope === 'all' ? 'default' : 'outline'}
                            size="sm"
                            className="h-8 text-xs rounded-lg"
                            onClick={() => setFilterScope('all')}
                        >
                            All ({agents.length})
                        </Button>
                        <Button
                            variant={filterScope === 'own' ? 'default' : 'outline'}
                            size="sm"
                            className="h-8 text-xs rounded-lg"
                            onClick={() => setFilterScope('own')}
                        >
                            Own Only ({stats.ownCount})
                        </Button>
                        <Button
                            variant={filterScope === 'all_leads' ? 'default' : 'outline'}
                            size="sm"
                            className="h-8 text-xs rounded-lg"
                            onClick={() => setFilterScope('all_leads')}
                        >
                            All Leads ({stats.allCount})
                        </Button>
                        <Button
                            variant={filterScope === 'custom' ? 'default' : 'outline'}
                            size="sm"
                            className="h-8 text-xs rounded-lg"
                            onClick={() => setFilterScope('custom')}
                        >
                            Specific Agents ({stats.customCount})
                        </Button>

                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            onClick={handleRefresh}
                            title="Refresh List"
                        >
                            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Agents Table */}
            <Card className="border-border/60 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-muted/40 border-b text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                            <tr>
                                <th className="p-4">Agent / Employee</th>
                                <th className="p-4">Role</th>
                                <th className="p-4">Lead View Scope</th>
                                <th className="p-4">Permitted Leads Access</th>
                                <th className="p-4 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/60">
                            {filteredAgents.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center text-xs text-muted-foreground">
                                        No agents found matching your filter criteria.
                                    </td>
                                </tr>
                            ) : (
                                filteredAgents.map((agent) => {
                                    const scope = agent.leadViewScope || 'own'
                                    const allowedNames = getAllowedAgentNames(agent)

                                    return (
                                        <tr key={agent.id || (agent as any)._id} className="hover:bg-muted/20 transition-colors">
                                            {/* Agent Details */}
                                            <td className="p-4">
                                                <div className="flex items-center gap-3">
                                                    <Avatar className="h-9 w-9 shrink-0">
                                                        {agent.avatar ? (
                                                            <img src={agent.avatar} className="h-full w-full object-cover" />
                                                        ) : (
                                                            <div className="flex h-full w-full items-center justify-center bg-primary/10 text-primary font-bold text-xs">
                                                                {getInitials(agent.name)}
                                                            </div>
                                                        )}
                                                    </Avatar>
                                                    <div className="min-w-0">
                                                        <div className="font-semibold text-xs text-foreground truncate">
                                                            {agent.name}
                                                        </div>
                                                        <div className="text-[11px] text-muted-foreground truncate">
                                                            {agent.email} {agent.designation ? `• ${agent.designation}` : ''}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Role */}
                                            <td className="p-4">
                                                <Badge variant="outline" className="capitalize text-[11px] font-medium">
                                                    {agent.role}
                                                </Badge>
                                            </td>

                                            {/* Scope Badge */}
                                            <td className="p-4">
                                                {scope === 'all' && (
                                                    <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-xs font-semibold gap-1.5 hover:bg-emerald-500/20">
                                                        <Eye className="h-3 w-3" /> All Leads
                                                    </Badge>
                                                )}
                                                {scope === 'custom' && (
                                                    <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20 text-xs font-semibold gap-1.5 hover:bg-blue-500/20">
                                                        <Users className="h-3 w-3" /> Specific Agents ({allowedNames.length})
                                                    </Badge>
                                                )}
                                                {scope === 'own' && (
                                                    <Badge variant="secondary" className="text-xs font-medium gap-1.5 text-muted-foreground">
                                                        <Lock className="h-3 w-3" /> Own Leads Only
                                                    </Badge>
                                                )}
                                            </td>

                                            {/* Permitted Leads Summary */}
                                            <td className="p-4 text-xs">
                                                {scope === 'all' && (
                                                    <span className="text-emerald-700 dark:text-emerald-400 font-medium">
                                                        Can view leads from all agents across the company
                                                    </span>
                                                )}
                                                {scope === 'own' && (
                                                    <span className="text-muted-foreground">
                                                        Only leads assigned to or created by {agent.name}
                                                    </span>
                                                )}
                                                {scope === 'custom' && (
                                                    <div>
                                                        {allowedNames.length === 0 ? (
                                                            <span className="text-amber-600 italic">
                                                                No agents chosen yet (restricted to own)
                                                            </span>
                                                        ) : (
                                                            <div className="flex flex-wrap gap-1 items-center">
                                                                <span className="text-muted-foreground text-[11px] mr-1">Own +</span>
                                                                {allowedNames.slice(0, 3).map((name, i) => (
                                                                    <span key={i} className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                                                                        {name}
                                                                    </span>
                                                                ))}
                                                                {allowedNames.length > 3 && (
                                                                    <span className="text-[10px] text-muted-foreground font-semibold">
                                                                        +{allowedNames.length - 3} more
                                                                    </span>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </td>

                                            {/* Action */}
                                            <td className="p-4 text-right">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="h-8 text-xs gap-1.5 rounded-lg hover:border-primary hover:text-primary transition-all"
                                                    onClick={() => handleConfigure(agent)}
                                                >
                                                    <SlidersHorizontal className="h-3.5 w-3.5" />
                                                    Configure Access
                                                </Button>
                                            </td>
                                        </tr>
                                    )
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* Modal for editing selected user */}
            <LeadVisibilityModal
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false)
                    setSelectedUserForEdit(null)
                }}
                targetUser={selectedUserForEdit}
                allUsers={users}
                onSuccess={(updatedUser) => {
                    // Update user in current store list
                    const updatedUsers = users.map(u => 
                        (u.id || (u as any)._id) === (updatedUser._id || updatedUser.id)
                            ? { ...u, ...updatedUser, id: updatedUser._id || u.id }
                            : u
                    )
                    setUsers(updatedUsers)
                }}
            />
        </div>
    )
}
