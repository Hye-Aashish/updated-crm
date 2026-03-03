import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, Server, ShieldCheck, AlertCircle } from 'lucide-react'
import api from '@/lib/api-client'

export default function HostingPage() {
    const [hosting, setHosting] = useState<any[]>([])

    useEffect(() => {
        fetchHosting()
    }, [])

    const fetchHosting = async () => {
        try {
            // Reusing a generic metadata or custom endpoint if exists, but for now placeholder
            const res = await api.get('/hosting').catch(() => ({ data: [] }))
            setHosting(res.data)
        } catch (error) {
            console.error("Failed to fetch hosting", error)
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold">Hosting Management</h1>
                    <p className="text-muted-foreground mt-1">Track server details, credentials and renewal dates</p>
                </div>
                <Button>
                    <Plus className="mr-2 h-4 w-4" /> Add Server
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="border-l-4 border-l-blue-500">
                    <CardContent className="p-6 flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Total Servers</p>
                            <h3 className="text-2xl font-bold mt-1">{hosting.length}</h3>
                        </div>
                        <div className="p-3 bg-blue-50 rounded-lg">
                            <Server className="h-6 w-6 text-blue-500" />
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-l-4 border-l-emerald-500">
                    <CardContent className="p-6 flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Active Subscriptions</p>
                            <h3 className="text-2xl font-bold mt-1">{hosting.filter(h => h.status === 'active').length}</h3>
                        </div>
                        <div className="p-3 bg-emerald-50 rounded-lg">
                            <ShieldCheck className="h-6 w-6 text-emerald-500" />
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-l-4 border-l-amber-500">
                    <CardContent className="p-6 flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Expiring Soon</p>
                            <h3 className="text-2xl font-bold mt-1">0</h3>
                        </div>
                        <div className="p-3 bg-amber-50 rounded-lg">
                            <AlertCircle className="h-6 w-6 text-amber-500" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>All Hosting Servers</CardTitle>
                    <CardDescription>Comprehensive list of all client and internal servers</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="text-center py-20 text-muted-foreground">
                        <Server className="h-12 w-12 mx-auto opacity-20 mb-4" />
                        <h3 className="font-medium">No Servers Found</h3>
                        <p className="text-sm">Start by adding your first hosting server/subscription.</p>
                        <Button variant="outline" className="mt-4">
                            Add Initial Data
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
