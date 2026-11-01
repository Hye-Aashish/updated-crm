import React, { useCallback, useEffect, useRef, useState } from 'react'
import { AlertTriangle, CheckCircle2, Info, Trash2 } from 'lucide-react'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
    registerAppDialogHandlers,
    type AppAlertOptions,
    type AppConfirmOptions,
    type AppDialogVariant,
} from '@/lib/app-dialog'

type PendingConfirm = AppConfirmOptions & {
    resolve: (value: boolean) => void
}

type PendingAlert = AppAlertOptions & {
    resolve: () => void
}

/** Full-viewport flex shell — avoids transform centering that jumps on hover */
const CONFIRM_SHELL =
    'fixed inset-0 left-0 top-0 z-[101] flex items-center justify-center w-screen h-[100dvh] max-w-none translate-x-0 translate-y-0 border-0 bg-transparent p-4 shadow-none rounded-none gap-0 data-[state=open]:zoom-in-100 data-[state=closed]:zoom-out-100 data-[state=closed]:slide-out-to-left-0 data-[state=closed]:slide-out-to-top-0 data-[state=open]:slide-in-from-left-0 data-[state=open]:slide-in-from-top-0'

const VARIANT_UI: Record<
    AppDialogVariant,
    { icon: React.ElementType; wrap: string; confirmVariant: 'default' | 'destructive' }
> = {
    default: {
        icon: Info,
        wrap: 'bg-primary/10 text-primary',
        confirmVariant: 'default',
    },
    info: {
        icon: Info,
        wrap: 'bg-primary/10 text-primary',
        confirmVariant: 'default',
    },
    success: {
        icon: CheckCircle2,
        wrap: 'bg-emerald-500/10 text-emerald-600',
        confirmVariant: 'default',
    },
    warning: {
        icon: AlertTriangle,
        wrap: 'bg-amber-500/10 text-amber-600',
        confirmVariant: 'default',
    },
    destructive: {
        icon: Trash2,
        wrap: 'bg-destructive/10 text-destructive',
        confirmVariant: 'destructive',
    },
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
    const [confirmState, setConfirmState] = useState<PendingConfirm | null>(null)
    const [alertState, setAlertState] = useState<PendingAlert | null>(null)
    const confirmRef = useRef(confirmState)
    const alertRef = useRef(alertState)
    confirmRef.current = confirmState
    alertRef.current = alertState

    const openConfirm = useCallback((options: AppConfirmOptions) => {
        return new Promise<boolean>((resolve) => {
            setConfirmState({ ...options, resolve })
        })
    }, [])

    const openAlert = useCallback((options: AppAlertOptions) => {
        return new Promise<void>((resolve) => {
            setAlertState({ ...options, resolve })
        })
    }, [])

    useEffect(() => {
        registerAppDialogHandlers({ confirm: openConfirm, alert: openAlert })
    }, [openConfirm, openAlert])

    const finishConfirm = (value: boolean) => {
        confirmRef.current?.resolve(value)
        setConfirmState(null)
    }

    const finishAlert = () => {
        alertRef.current?.resolve()
        setAlertState(null)
    }

    const confirmVariant = confirmState?.variant || 'default'
    const alertVariant = alertState?.variant || 'info'
    const ConfirmIcon = VARIANT_UI[confirmVariant].icon
    const AlertIcon = VARIANT_UI[alertVariant].icon

    return (
        <>
            {children}

            <Dialog
                open={!!confirmState}
                onOpenChange={(open) => {
                    if (!open) finishConfirm(false)
                }}
            >
                <DialogContent
                    showCloseButton={false}
                    overlayClassName="z-[100]"
                    className={CONFIRM_SHELL}
                    onOpenAutoFocus={(e) => e.preventDefault()}
                >
                    {confirmState && (
                        <div className="w-full max-w-[400px] rounded-3xl border border-border/60 bg-card p-6 space-y-5 shadow-2xl">
                            <DialogHeader className="space-y-0">
                                <div className="flex gap-4 items-start">
                                    <div
                                        className={cn(
                                            'h-11 w-11 rounded-2xl flex items-center justify-center shrink-0',
                                            VARIANT_UI[confirmVariant].wrap
                                        )}
                                    >
                                        <ConfirmIcon className="h-5 w-5" />
                                    </div>
                                    <div className="space-y-1.5 pt-0.5 min-w-0">
                                        <DialogTitle className="text-base font-extrabold tracking-tight text-left">
                                            {confirmState.title || 'Please confirm'}
                                        </DialogTitle>
                                        {confirmState.description ? (
                                            <DialogDescription className="text-sm text-muted-foreground leading-relaxed text-left">
                                                {confirmState.description}
                                            </DialogDescription>
                                        ) : null}
                                    </div>
                                </div>
                            </DialogHeader>
                            <DialogFooter className="flex-row justify-end gap-2 sm:space-x-0">
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="rounded-xl h-10 px-4 font-bold hover:!translate-y-0 hover:!scale-100 active:!scale-100"
                                    onClick={() => finishConfirm(false)}
                                >
                                    {confirmState.cancelLabel || 'Cancel'}
                                </Button>
                                <Button
                                    type="button"
                                    variant={VARIANT_UI[confirmVariant].confirmVariant}
                                    className="rounded-xl h-10 px-4 font-bold hover:!translate-y-0 hover:!scale-100 active:!scale-100"
                                    autoFocus
                                    onClick={() => finishConfirm(true)}
                                >
                                    {confirmState.confirmLabel || 'OK'}
                                </Button>
                            </DialogFooter>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            <Dialog
                open={!!alertState}
                onOpenChange={(open) => {
                    if (!open) finishAlert()
                }}
            >
                <DialogContent
                    showCloseButton={false}
                    overlayClassName="z-[100]"
                    className={CONFIRM_SHELL}
                    onOpenAutoFocus={(e) => e.preventDefault()}
                >
                    {alertState && (
                        <div className="w-full max-w-[400px] rounded-3xl border border-border/60 bg-card p-6 space-y-5 shadow-2xl">
                            <DialogHeader className="space-y-0">
                                <div className="flex gap-4 items-start">
                                    <div
                                        className={cn(
                                            'h-11 w-11 rounded-2xl flex items-center justify-center shrink-0',
                                            VARIANT_UI[alertVariant].wrap
                                        )}
                                    >
                                        <AlertIcon className="h-5 w-5" />
                                    </div>
                                    <div className="space-y-1.5 pt-0.5 min-w-0">
                                        <DialogTitle className="text-base font-extrabold tracking-tight text-left">
                                            {alertState.title || 'Notice'}
                                        </DialogTitle>
                                        {alertState.description ? (
                                            <DialogDescription className="text-sm text-muted-foreground leading-relaxed text-left whitespace-pre-wrap">
                                                {alertState.description}
                                            </DialogDescription>
                                        ) : null}
                                    </div>
                                </div>
                            </DialogHeader>
                            <DialogFooter className="flex-row justify-end gap-2 sm:space-x-0">
                                <Button
                                    type="button"
                                    variant={VARIANT_UI[alertVariant].confirmVariant}
                                    className="rounded-xl h-10 px-5 font-bold min-w-[88px] hover:!translate-y-0 hover:!scale-100 active:!scale-100"
                                    autoFocus
                                    onClick={finishAlert}
                                >
                                    {alertState.confirmLabel || 'OK'}
                                </Button>
                            </DialogFooter>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </>
    )
}
