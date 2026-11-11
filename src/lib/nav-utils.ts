import { useLocation } from 'react-router-dom'
import { useAppStore } from '@/store'

export type PortalPrefix = '' | '/employee' | '/client'

/** Normalizes a role key or label for case- and separator-insensitive matching. */
export function normalizeRoleKey(role?: string | null): string {
    return (role || '').toLowerCase().replace(/[\s_-]+/g, '')
}

/** Returns true when the role has full owner/administrator workspace access. */
export function isAdminOrOwnerRole(role?: string | null): boolean {
    const key = normalizeRoleKey(role)
    return key === 'owner' || key === 'admin'
}

/** Finds a role configuration object in settings.roles matching either name or label. */
export function findRoleConfig(roles: any[] | null | undefined, role?: string | null): any | null {
    if (!Array.isArray(roles) || !role) return null
    const target = normalizeRoleKey(role)
    if (!target) return null
    return roles.find((r: any) => {
        const rName = normalizeRoleKey(r?.name)
        const rLabel = normalizeRoleKey(r?.label)
        return rName === target || rLabel === target
    }) || null
}

/** Resolves the portal route prefix based on current URL path and user role. */
export function resolvePortalPrefix(pathname: string, role?: string | null): PortalPrefix {
    const norm = normalizeRoleKey(role)
    if (pathname.startsWith('/client') || norm === 'client') {
        return '/client'
    }
    if (pathname.startsWith('/employee') || norm === 'employee') {
        return '/employee'
    }
    return ''
}

/** Applies the active portal prefix (/client or /employee) to an internal CRM route. */
export function withPortalPrefix(path: string, pathname: string, role?: string | null): string {
    const cleanPath = path.startsWith('/') ? path : `/${path}`
    const prefix = resolvePortalPrefix(pathname, role)
    if (!prefix) return cleanPath
    if (cleanPath === prefix || cleanPath.startsWith(`${prefix}/`)) {
        return cleanPath
    }
    return `${prefix}${cleanPath}`
}

/** React hook returning portal prefix for the active layout and signed-in user. */
export function usePortalPrefix(): PortalPrefix {
    const location = useLocation()
    const currentUser = useAppStore((s) => s.currentUser)
    return resolvePortalPrefix(location.pathname, currentUser?.role)
}

/**
 * Determines whether a nav link is active while handling query parameters and
 * preventing parent paths (e.g. /tasks, /settings, /reports, /team) from staying
 * highlighted when a more specific sibling nav link matches (e.g. /tasks/my-day).
 */
export function isNavItemActive(pathname: string, href: string, allHrefs: string[] = []): boolean {
    const target = href.split('?')[0].replace(/\/+$/, '') || '/'
    const current = pathname.replace(/\/+$/, '') || '/'

    if (current === target) return true
    if (target === '/' || !current.startsWith(`${target}/`)) return false

    const hasMoreSpecificMatch = allHrefs.some((otherHref) => {
        const other = otherHref.split('?')[0].replace(/\/+$/, '') || '/'
        if (other === target || other.length <= target.length) return false
        return current === other || current.startsWith(`${other}/`)
    })

    return !hasMoreSpecificMatch
}

