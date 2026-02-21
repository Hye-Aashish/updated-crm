import {
    Toast,
    ToastClose,
    ToastDescription,
    ToastProvider,
    ToastTitle,
    ToastViewport,
} from "@/components/ui/toast"
import { useToast } from "@/hooks/use-toast"
import { AlertCircle, CheckCircle2, Info } from "lucide-react"

export function Toaster() {
    const { toasts } = useToast()

    return (
        <ToastProvider>
            {toasts.map(function ({ id, title, description, action, variant, ...props }) {
                return (
                    <Toast key={id} variant={variant} {...props} className="overflow-hidden">
                        <div className="flex gap-4">
                            {variant === 'destructive' && (
                                <div className="mt-0.5 h-6 w-6 rounded-full bg-destructive/10 flex items-center justify-center flex-shrink-0 animate-in zoom-in duration-300">
                                    <AlertCircle className="h-4 w-4 text-destructive" />
                                </div>
                            )}
                            {variant === 'success' && (
                                <div className="mt-0.5 h-6 w-6 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 animate-in zoom-in duration-300">
                                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                </div>
                            )}
                            {(!variant || variant === 'default') && (
                                <div className="mt-0.5 h-6 w-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 animate-in zoom-in duration-300">
                                    <Info className="h-4 w-4 text-blue-600" />
                                </div>
                            )}
                            <div className="grid gap-1">
                                {title && <ToastTitle className="text-[13px] font-black uppercase tracking-widest">{title}</ToastTitle>}
                                {description && (
                                    <ToastDescription className="text-sm font-medium opacity-90">{description}</ToastDescription>
                                )}
                            </div>
                        </div>
                        {action}
                        <ToastClose />
                    </Toast>
                )
            })}
            <ToastViewport />
        </ToastProvider>
    )
}
