/**
 * Desktop / Windows notification helper.
 * In Electron → main-process Notification (reliable when minimized).
 * In browser → Web Notification API.
 */

export type DesktopNotificationOptions = {
    title: string
    body?: string
    /** Dedup / replace key (Windows toast tag) */
    tag?: string
    silent?: boolean
}

function isElectronShell() {
    if (typeof window === 'undefined') return false
    return !!(window as any).electronAPI || /Electron/i.test(navigator.userAgent)
}

/** Ask OS/browser for notification permission once. */
export async function ensureNotificationPermission(): Promise<boolean> {
    try {
        if (isElectronShell()) {
            const api = (window as any).electronAPI
            if (api?.requestNotificationPermission) {
                return !!(await api.requestNotificationPermission())
            }
            return true // main process can show without prompt on Windows
        }
        if (!('Notification' in window)) return false
        if (Notification.permission === 'granted') return true
        if (Notification.permission === 'denied') return false
        const permission = await Notification.requestPermission()
        return permission === 'granted'
    } catch {
        return false
    }
}

/** Show a native Windows / desktop notification. */
export async function showDesktopNotification(opts: DesktopNotificationOptions) {
    const title = (opts.title || 'Nexprism').trim()
    const body = (opts.body || '').trim()
    if (!title && !body) return

    try {
        if (isElectronShell()) {
            const api = (window as any).electronAPI
            if (api?.showDesktopNotification) {
                await api.showDesktopNotification({
                    title: title || 'Nexprism',
                    body,
                    tag: opts.tag,
                    silent: !!opts.silent,
                })
                return
            }
        }

        if (!('Notification' in window)) return
        const ok = await ensureNotificationPermission()
        if (!ok) return

        const n = new Notification(title || 'Nexprism', {
            body: body || undefined,
            tag: opts.tag,
            silent: !!opts.silent,
            icon: '/vite.svg',
        })
        n.onclick = () => {
            try {
                window.focus()
            } catch { /* ignore */ }
            n.close()
        }
    } catch (err) {
        console.warn('[notify] desktop notification failed', err)
    }
}

/** @deprecated use showDesktopNotification */
export const showSystemNotification = async (title: string, message: string) => {
    await showDesktopNotification({ title, body: message })
}
