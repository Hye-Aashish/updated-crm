import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 select-none",
    {
        variants: {
            variant: {
                default: "clay-btn bg-primary text-primary-foreground hover:bg-primary/95 shadow-sm active:scale-[0.97]",
                destructive:
                    "clay-btn bg-destructive text-destructive-foreground hover:bg-destructive/95 shadow-sm active:scale-[0.97]",
                outline:
                    "clay-card border-border/70 bg-card hover:bg-accent text-foreground active:scale-[0.97]",
                secondary:
                    "clay-card bg-secondary text-secondary-foreground hover:bg-secondary/80 active:scale-[0.97]",
                ghost: "hover:bg-accent hover:text-accent-foreground rounded-xl active:scale-[0.97]",
                link: "text-primary underline-offset-4 hover:underline",
            },
            size: {
                default: "h-10 px-4 py-2",
                sm: "h-9 rounded-xl px-3 text-xs",
                lg: "h-11 rounded-2xl px-6 text-base",
                icon: "h-9 w-9 rounded-xl",
            },
        },
        defaultVariants: {
            variant: "default",
            size: "default",
        },
    }
)

export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
    asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant, size, asChild = false, ...props }, ref) => {
        const Comp = asChild ? Slot : "button"
        return (
            <Comp
                className={cn(buttonVariants({ variant, size, className }))}
                ref={ref}
                {...props}
            />
        )
    }
)
Button.displayName = "Button"

export { Button, buttonVariants }
