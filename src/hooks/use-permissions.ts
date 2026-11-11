import { useState, useEffect, useCallback } from 'react'
import { useAppStore } from '@/store'
import api from '@/lib/api-client'
import { findRoleConfig, isAdminOrOwnerRole, normalizeRoleKey } from '@/lib/nav-utils'

let cachedSettingsPromise: Promise<any> | null = null
let cachedSettingsData: any = null

export function invalidatePermissionsCache() {
    cachedSettingsPromise = null
    cachedSettingsData = null
}

/** Signs the current user out and clears local auth/settings/permission state cleanly. */
export async function performAppLogout(
    navigate: (to: string, options?: any) => void,
    role?: string | null
) {
    if (normalizeRoleKey(role) !== 'client') {
        try {
            await api.post('/time-entries/stop-running')
        } catch (err) {
            console.error('Logout timer stop failed', err)
        }
    }
    localStorage.removeItem('token')
    invalidatePermissionsCache()
    const store = useAppStore.getState()
    store.resetWorkspaceData()
    navigate('/login', { replace: true })
}

/** Shared pure check so sidebars, bottom nav, and route guards agree 100%. */
export function canViewWithPermissions(
    permissions: Record<string, any> | null,
    role: string | undefined | null,
    module: string
): boolean {
    if (isAdminOrOwnerRole(role)) return true

    if (normalizeRoleKey(role) === 'client' && module === 'files') {
        if (permissions?.files?.view !== undefined) return !!permissions.files.view
        return true
    }

    if (!permissions) return false
    if (module === 'ai_assistant') return !!permissions[module]?.use
    if (permissions[module]?.view !== undefined) return !!permissions[module]?.view

    // Backward-compatibility fallbacks for unconfigured legacy or custom roles
    switch (module) {
        case 'calendar': return true
        case 'sales_dashboard': return !!(permissions.sales_dashboard?.view ?? (permissions.leads?.view || permissions.dashboard?.view))
        case 'products': return !!(permissions.products?.view ?? permissions.projects?.view)
        case 'my_day': return !!(permissions.my_day?.view ?? permissions.tasks?.view)
        case 'templates': return !!(permissions.templates?.view ?? permissions.projects?.view)
        case 'sales_automations': return !!(permissions.sales_automations?.view ?? permissions.leads?.view)
        case 'contracts': return !!(permissions.contracts?.view ?? permissions.leads?.view)
        case 'campaigns': return !!(permissions.campaigns?.view ?? permissions.leads?.view)
        case 'credit_notes': return !!(permissions.credit_notes?.view ?? permissions.invoices?.view)
        case 'vendor_bills': return !!(permissions.vendor_bills?.view ?? permissions.invoices?.view)
        case 'gst_reports': return !!(permissions.gst_reports?.view ?? permissions.reports?.view)
        case 'capacity_planning': return !!(permissions.capacity_planning?.view ?? permissions.team?.view)
        case 'approvals': return !!(permissions.approvals?.view ?? (permissions.payroll?.view || permissions.team?.view))
        case 'offer_letters': return !!(permissions.offer_letters?.view ?? permissions.team?.view)
        case 'goals': return !!(permissions.goals?.view ?? permissions.projects?.view)
        default: return !!permissions[module]?.view
    }
}

export function usePermissions() {
    const currentUser = useAppStore((s) => s.currentUser)
    const settings = useAppStore((s) => s.settings)
    const setSettings = useAppStore((s) => s.setSettings)

    const resolveFromSettings = useCallback(
        (settingsObj: any, role?: string | null) => {
            if (!settingsObj?.roles || !role) return null
            const roleConfig = findRoleConfig(settingsObj.roles, role)
            return roleConfig ? roleConfig.permissions || {} : null
        },
        []
    )

    const initialSettings = settings || cachedSettingsData
    const [permissions, setPermissions] = useState<any>(() =>
        currentUser && !isAdminOrOwnerRole(currentUser.role)
            ? resolveFromSettings(initialSettings, currentUser.role)
            : null
    )
    const [loading, setLoading] = useState<boolean>(() => {
        if (!currentUser) return false
        if (isAdminOrOwnerRole(currentUser.role)) return false
        return !initialSettings?.roles
    })

    useEffect(() => {
        let active = true

        if (!currentUser) {
            setPermissions(null)
            setLoading(false)
            return
        }

        if (isAdminOrOwnerRole(currentUser.role)) {
            setPermissions(null)
            setLoading(false)
            return
        }

        if (settings?.roles) {
            cachedSettingsData = settings
            setPermissions(resolveFromSettings(settings, currentUser.role))
            setLoading(false)
            return
        }

        setLoading(true)
        if (!cachedSettingsPromise) {
            cachedSettingsPromise = api
                .get('/settings')
                .then((res) => {
                    cachedSettingsData = res.data
                    setSettings(res.data)
                    return res.data
                })
                .catch((err) => {
                    console.error('Permission fetch error', err)
                    cachedSettingsPromise = null
                    return null
                })
        }

        cachedSettingsPromise.then((data) => {
            if (!active) return
            if (data) {
                setPermissions(resolveFromSettings(data, currentUser.role))
            }
            setLoading(false)
        })

        return () => {
            active = false
        }
    }, [currentUser, settings, setSettings, resolveFromSettings])

    const canView = useCallback(
        (module: string) => canViewWithPermissions(permissions, currentUser?.role, module),
        [permissions, currentUser?.role]
    )

    const canCreate = (module: string) => {
        if (isAdminOrOwnerRole(currentUser?.role)) return true
        if (!permissions) return false
        if (permissions[module]?.create !== undefined) return !!permissions[module]?.create
        switch (module) {
            case 'products': return !!(permissions.products?.create ?? permissions.projects?.create)
            case 'credit_notes': return !!(permissions.credit_notes?.create ?? permissions.invoices?.create)
            case 'vendor_bills': return !!(permissions.vendor_bills?.create ?? permissions.invoices?.create)
            case 'sales_automations': return !!(permissions.sales_automations?.create ?? permissions.leads?.create)
            case 'contracts': return !!(permissions.contracts?.create ?? permissions.leads?.create)
            case 'campaigns': return !!(permissions.campaigns?.create ?? permissions.leads?.create)
            case 'offer_letters': return !!(permissions.offer_letters?.create ?? permissions.team?.create)
            case 'goals': return !!(permissions.goals?.create ?? permissions.projects?.create)
            default: return !!permissions[module]?.create
        }
    }

    const canEdit = (module: string) => {
        if (isAdminOrOwnerRole(currentUser?.role)) return true
        if (!permissions) return false
        if (permissions[module]?.edit !== undefined) return !!permissions[module]?.edit
        switch (module) {
            case 'products': return !!(permissions.products?.edit ?? permissions.projects?.edit)
            case 'credit_notes': return !!(permissions.credit_notes?.edit ?? permissions.invoices?.edit)
            case 'vendor_bills': return !!(permissions.vendor_bills?.edit ?? permissions.invoices?.edit)
            case 'sales_automations': return !!(permissions.sales_automations?.edit ?? permissions.leads?.edit)
            case 'contracts': return !!(permissions.contracts?.edit ?? permissions.leads?.edit)
            case 'campaigns': return !!(permissions.campaigns?.edit ?? permissions.leads?.edit)
            case 'offer_letters': return !!(permissions.offer_letters?.edit ?? permissions.team?.edit)
            case 'goals': return !!(permissions.goals?.edit ?? permissions.projects?.edit)
            default: return !!permissions[module]?.edit
        }
    }

    const canDelete = (module: string) => {
        if (isAdminOrOwnerRole(currentUser?.role)) return true
        if (!permissions) return false
        if (permissions[module]?.delete !== undefined) return !!permissions[module]?.delete
        switch (module) {
            case 'products': return !!(permissions.products?.delete ?? permissions.projects?.delete)
            case 'credit_notes': return !!(permissions.credit_notes?.delete ?? permissions.invoices?.delete)
            case 'vendor_bills': return !!(permissions.vendor_bills?.delete ?? permissions.invoices?.delete)
            case 'sales_automations': return !!(permissions.sales_automations?.delete ?? permissions.leads?.delete)
            case 'contracts': return !!(permissions.contracts?.delete ?? permissions.leads?.delete)
            case 'campaigns': return !!(permissions.campaigns?.delete ?? permissions.leads?.delete)
            case 'offer_letters': return !!(permissions.offer_letters?.delete ?? permissions.team?.delete)
            case 'goals': return !!(permissions.goals?.delete ?? permissions.projects?.delete)
            default: return !!permissions[module]?.delete
        }
    }

    const hasPermission = (module: string, action: string) => {
        if (isAdminOrOwnerRole(currentUser?.role)) return true
        if (module === 'files' && action === 'upload' && normalizeRoleKey(currentUser?.role) === 'client') return true
        if (!permissions) return false
        return !!permissions[module]?.[action]
    }

    return { permissions, loading, canView, canCreate, canEdit, canDelete, hasPermission }
}
