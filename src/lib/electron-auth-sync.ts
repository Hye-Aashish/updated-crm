/** Keep Electron main-process auth nudge in sync with web session. */

type AuthPayload = {
    loggedIn: boolean
    email?: string | null
    name?: string | null
}

export function syncElectronAuthState(payload: AuthPayload) {
    try {
        const api = (window as any).electronAPI
        if (!api?.syncAuthState) return
        api.syncAuthState({
            loggedIn: !!payload.loggedIn,
            email: payload.email || null,
            name: payload.name || null,
        })
    } catch {
        /* ignore — web-only */
    }
}

export function syncElectronAuthFromStorage(user?: { email?: string; name?: string } | null) {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null
    syncElectronAuthState({
        loggedIn: !!token,
        email: user?.email || null,
        name: user?.name || null,
    })
}
