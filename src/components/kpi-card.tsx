import { LucideIcon } from 'lucide-react'
import { Card, CardContent } from './ui/card'
import { cn } from '@/lib/utils'

interface KpiCardProps {
    title: string
    value: string | number
    icon: LucideIcon
    trend?: {
        value: number
        isPositive: boolean
    }
    onClick?: () => void
    className?: string
}

export function KpiCard({ title, value, icon: Icon, trend, onClick, className }: KpiCardProps) {
    return (
        <Card
            className={cn(
                'transition-all hover:shadow-md',
                onClick && 'cursor-pointer',
                className
            )}
            onClick={onClick}
        >
            <CardContent className="p-6">
                <div className="flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-muted-foreground whitespace-nowrap truncate">{title}</p>
                        <h3 className="text-2xl font-bold mt-2 whitespace-nowrap">{value}</h3>
                        {trend && (
                            <p className={cn(
                                'text-xs mt-2 flex items-center gap-1 whitespace-nowrap',
                                trend.isPositive ? 'text-green-600' : 'text-red-600'
                            )}>
                                <span>{trend.isPositive ? '↑' : '↓'}</span>
                                <span>{Math.abs(trend.value)}%</span>
                                <span className="text-muted-foreground">vs last month</span>
                            </p>
                        )}
                    </div>
                    <div className="rounded-full bg-primary/10 p-3 shrink-0">
                        <Icon className="h-6 w-6 text-primary" />
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
