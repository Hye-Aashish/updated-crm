export type AppDialogVariant = 'default' | 'destructive' | 'warning' | 'success' | 'info'

export type AppConfirmOptions = {
    title?: string
    description?: string
    confirmLabel?: string
    cancelLabel?: string
    variant?: AppDialogVariant
}

export type AppAlertOptions = {
    title?: string
    description?: string
    confirmLabel?: string
    variant?: AppDialogVariant
}

type ConfirmHandler = (options: AppConfirmOptions) => Promise<boolean>
type AlertHandler = (options: AppAlertOptions) => Promise<void>

let confirmHandler: ConfirmHandler | null = null
let alertHandler: AlertHandler | null = null

export function registerAppDialogHandlers(handlers: {
    confirm: ConfirmHandler
    alert: AlertHandler
}) {
    confirmHandler = handlers.confirm
    alertHandler = handlers.alert
}

function normalizeConfirm(input: string | AppConfirmOptions): AppConfirmOptions {
    if (typeof input === 'string') {
        return {
            title: 'Please confirm',
            description: input,
            variant: /delete|remove|cancel|permanent|discard|reset/i.test(input)
                ? 'destructive'
                : 'default',
        }
    }
    return input
}

function normalizeAlert(input: string | AppAlertOptions): AppAlertOptions {
    if (typeof input === 'string') {
        const isError = /fail|error|unable|invalid|please|required|missing/i.test(input)
        return {
            title: isError ? 'Notice' : 'Done',
            description: input,
            variant: isError ? 'warning' : 'info',
        }
    }
    return input
}

/** Platform-styled confirm. Use instead of window.confirm. */
export async function appConfirm(input: string | AppConfirmOptions): Promise<boolean> {
    const options = normalizeConfirm(input)
    if (confirmHandler) return confirmHandler(options)
    return window.confirm(options.description || options.title || 'Are you sure?')
}

/** Platform-styled alert. Use instead of window.alert. */
export async function appAlert(input: string | AppAlertOptions): Promise<void> {
    const options = normalizeAlert(input)
    if (alertHandler) {
        await alertHandler(options)
        return
    }
    window.alert(options.description || options.title || '')
}
