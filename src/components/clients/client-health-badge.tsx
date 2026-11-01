import { useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import api from '@/lib/api-client'
import { cn } from '@/lib/utils'

export function ClientHealthBadge({ clientId, className }: { clientId: string; className?: string }) {
    const [health, setHealth] = useState<{ score: number; label: string } | null>(null)

    useEffect(() => {
        if (!clientId) return
        let cancelled = false
        api.get(`/clients/${clientId}/health`)
            .then(res => { if (!cancelled) setHealth({ score: res.data.score, label: res.data.label }) })
            .catch(() => {})
        return () => { cancelled = true }
    }, [clientId])

    if (!health) return null

    const tone = health.score >= 70
        ? 'bg-emerald-500/15 text-emerald-700 border-emerald-500/20'
        : health.score >= 40
            ? 'bg-amber-500/15 text-amber-700 border-amber-500/20'
            : 'bg-rose-500/15 text-rose-700 border-rose-500/20'

    return (
        <Badge variant="outline" className={cn('text-[10px] font-bold', tone, className)}>
            {health.label} {health.score}
        </Badge>
    )
}
