import { useState, useEffect } from 'react'
import { Plus, Users, UserCheck, UserX, Building2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '@/store'
import { EmptyState } from '@/components/empty-state'
import { ClientService } from '@/lib/services/client.service'
import { StatsCard } from '@/components/stats-card'

export function ClientsPage() {
    const navigate = useNavigate()
    const { clients, setClients } = useAppStore()
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    // Fetch Clients
    useEffect(() => {
        const fetchClients = async () => {
            try {
                setLoading(true)
                setError(null)
                const backendClients = await ClientService.getAll()
                setClients(backendClients)
            } catch (error: any) {
                console.error("Failed to fetch clients:", error)
                setError(error.message || "Failed to fetch clients from server.")
            } finally {
                setLoading(false)
            }
        }
        fetchClients()
    }, [setClients])

    // --- KPI Calculations ---
    const totalClients = clients.length
    const activeClients = clients.filter(c => c.status === 'active').length
    const inactiveClients = clients.filter(c => c.status === 'inactive').length
    const retainerClients = clients.filter(c => c.type === 'retainer').length

    if (loading && clients.length === 0) {
        return <div className="flex items-center justify-center h-full">Loading...</div>
    }

    return (
        <div className="space-y-6">
            {error && (
                <div className="bg-destructive/15 text-destructive p-4 rounded-md border border-destructive/20 flex items-center gap-2">
                    <UserX className="h-4 w-4" />
                    <div>
                        <p className="font-medium">Connection Error</p>
                        <p className="text-sm">{error}</p>
                    </div>
                </div>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Clients</h1>
                    <p className="text-muted-foreground mt-1">Manage your client relationships and contacts.</p>
                </div>
                <Button onClick={() => navigate('/clients/new')} className="w-full sm:w-auto">
                    <Plus className="mr-2 h-4 w-4" /> Add Client
                </Button>
            </div>

            {/* --- Module Specific KPIs --- */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <StatsCard title="Total Clients" value={totalClients} icon={Users} color="#3b82f6" bg="bg-blue-50" />
                <StatsCard title="Active" value={activeClients} icon={UserCheck} color="#22c55e" bg="bg-green-50" />
                <StatsCard title="Inactive" value={inactiveClients} icon={UserX} color="#ef4444" bg="bg-red-50" />
                <StatsCard title="Retainer" value={retainerClients} icon={Building2} color="#8b5cf6" bg="bg-purple-50" />
            </div>



            {clients.length === 0 && !error ? (
                <EmptyState
                    icon={Users}
                    title="No clients yet"
                    description="Get started by adding your first client"
                    action={
                        <Button onClick={() => navigate('/clients/new')}>
                            <Plus className="mr-2 h-4 w-4" /> Add Client
                        </Button>
                    }
                />
            ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {clients.map((client) => (
                        <Card
                            key={client.id}
                            className="cursor-pointer hover:shadow-md transition-shadow"
                            onClick={() => navigate(`/clients/${client.id}`)}
                        >
                            <CardHeader>
                                <div className="flex items-start justify-between">
                                    <div>
                                        <CardTitle className="text-lg">{client.name}</CardTitle>
                                        <p className="text-sm text-muted-foreground mt-1">
                                            {client.company}
                                        </p>
                                    </div>
                                    <Badge variant={client.status === 'active' ? 'default' : 'secondary'}>
                                        {client.status}
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2 text-sm">
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                        <span>📧</span>
                                        <span className="truncate">{client.email}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                        <span>📞</span>
                                        <span>{client.phone}</span>
                                    </div>
                                    <div className="mt-3 pt-3 border-t">
                                        <Badge variant="outline" className="capitalize">
                                            {client.type}
                                        </Badge>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    )
}

