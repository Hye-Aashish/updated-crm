const PREFIX = 'nexcrm-draft:'

export function saveDraft(key: string, data: unknown) {
    try {
        localStorage.setItem(PREFIX + key, JSON.stringify({ data, savedAt: Date.now() }))
    } catch (e) {
        console.warn('Draft save failed', e)
    }
}

export function loadDraft<T = any>(key: string): T | null {
    try {
        const raw = localStorage.getItem(PREFIX + key)
        if (!raw) return null
        const parsed = JSON.parse(raw)
        return (parsed?.data ?? null) as T
    } catch {
        return null
    }
}

export function clearDraft(key: string) {
    try {
        localStorage.removeItem(PREFIX + key)
    } catch { /* ignore */ }
}

export function onOnline(cb: () => void) {
    window.addEventListener('online', cb)
    return () => window.removeEventListener('online', cb)
}
