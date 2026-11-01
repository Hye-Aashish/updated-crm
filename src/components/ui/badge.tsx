import * as React from "react"
import { cn } from "@/lib/utils"

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
    variant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning'
}

const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
    ({ className, variant = 'default', ...props }, ref) => {
        const variantClasses = {
            default: 'bg-primary text-primary-foreground',
            secondary: 'bg-secondary text-secondary-foreground',
            destructive: 'bg-destructive text-destructive-foreground',
            outline: 'text-foreground border border-input bg-card/80',
            success: 'bg-emerald-500 text-white',
            warning: 'bg-amber-500 text-white',
        }

        return (
            <div
                ref={ref}
                className={cn(
                    'clay-badge inline-flex items-center justify-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold transition-all whitespace-nowrap shrink-0 select-none',
                    variantClasses[variant],
                    className
                )}
                {...props}
            />
        )
    }
)
Badge.displayName = 'Badge'

export { Badge }
