import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { RefreshCw } from 'lucide-react'
import api from '@/lib/api-client'
import { useToast } from '@/hooks/use-toast'
import { PageSkeleton } from '@/components/ui/page-skeleton'
import type { ProjectTemplate } from '@/types'

export function ProjectTemplatesPage() {
    const { toast } = useToast()
    const [templates, setTemplates] = useState<ProjectTemplate[]>([])
    const [loading, setLoading] = useState(true)

    const fetchTemplates = async () => {
        try {
            setLoading(true)
            const res = await api.get('/project-templates')
            setTemplates(res.data || [])
        } catch (err) {
            console.error(err)
            toast({ title: 'Error', description: 'Failed to load project templates', variant: 'destructive' })
        } finally {
            setLoading(false)
        }
    }

    const handleSeedTemplates = async () => {
        try {
            await api.post('/project-templates/seed')
            toast({ description: 'System project templates initialized successfully!' })
            fetchTemplates()
        } catch (err) {
            toast({ title: 'Error', description: 'Failed to seed templates', variant: 'destructive' })
        }
    }

    useEffect(() => {
        fetchTemplates()
    }, [])

    if (loading) return <PageSkeleton />

    return (
        <div className="space-y-6 font-sans pb-10">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">Project Template Engine</h1>
                    <p className="text-sm text-muted-foreground font-medium">Configure automated phases, checkpoints, dependencies, and proof rules for new projects.</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={handleSeedTemplates} className="h-9 font-bold text-xs">
                        <RefreshCw className="mr-2 h-3.5 w-3.5" /> Re-seed System Templates
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {templates.map((t) => {
                    const totalCheckpoints = t.phases.reduce((sum, p) => sum + (p.checkpoints?.length || 0), 0)

                    return (
                        <Card key={t._id || t.id} className="border border-border/60 bg-card hover:border-primary/50 transition-all">
                            <CardHeader className="p-5 pb-3">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="space-y-1">
                                        <Badge variant="outline" className="text-[9px] font-bold uppercase tracking-wider text-primary border-primary/30">
                                            {t.projectType}
                                        </Badge>
                                        <CardTitle className="text-lg font-bold text-foreground">
                                            {t.name}
                                        </CardTitle>
                                    </div>
                                    <Badge variant="secondary" className="text-xs font-bold">
                                        {totalCheckpoints} Checkpoints
                                    </Badge>
                                </div>
                                <CardDescription className="text-xs text-muted-foreground line-clamp-2 pt-1">
                                    {t.description || 'Automated project template workflow.'}
                                </CardDescription>
                            </CardHeader>

                            <CardContent className="p-5 pt-2 space-y-4">
                                <div className="space-y-2">
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Phases Breakdown:</p>
                                    <div className="space-y-1.5">
                                        {t.phases.map((phase, pIdx) => (
                                            <div key={phase.name} className="flex items-center justify-between p-2 rounded-lg bg-muted/30 text-xs font-semibold border border-border/40">
                                                <span className="flex items-center gap-2 truncate">
                                                    <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold shrink-0">
                                                        {pIdx + 1}
                                                    </span>
                                                    <span className="truncate">{phase.name}</span>
                                                </span>
                                                <span className="text-[10px] text-muted-foreground font-bold shrink-0 ml-2">
                                                    {phase.checkpoints?.length || 0} steps
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )
                })}
            </div>
        </div>
    )
}
