import { useState, useEffect } from 'react'
import { useAppStore } from '@/store'
import api from '@/lib/api-client'

let cachedPermissionsPromise: Promise<any> | null = null;
let cachedPermissions: any = null;
let cachedRole: string | null = null;

export function usePermissions() {
    const { currentUser } = useAppStore()
    const [permissions, setPermissions] = useState<any>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (!currentUser) {
            setLoading(false)
            return
        }

        if (currentUser.role === 'owner') {
            setLoading(false)
            return
        }

        if (cachedPermissions && cachedRole === currentUser.role) {
            setPermissions(cachedPermissions)
            setLoading(false)
            return
        }

        if (!cachedPermissionsPromise || cachedRole !== currentUser.role) {
            cachedRole = currentUser.role
            cachedPermissionsPromise = api.get('/settings').then(res => {
                if (res.data.roles) {
                    const role = res.data.roles.find((r: any) => r.name === currentUser.role)
                    if (role) {
                        cachedPermissions = role.permissions
                        return role.permissions
                    }
                }
                return null
            }).catch(err => {
                console.error("Permission fetch error", err)
                cachedPermissionsPromise = null
                return null
            })
        }

        cachedPermissionsPromise.then(perms => {
            if (perms) setPermissions(perms)
            setLoading(false)
        })
    }, [currentUser])

    const canView = (module: string) => {
        if (currentUser?.role === 'owner') return true
        if (module === 'ai_assistant' && currentUser?.role === 'admin') return true
        if (module === 'files' && currentUser?.role === 'client') return true
        if (!permissions) return false
        if (module === 'ai_assistant') return !!permissions[module]?.use
        return !!permissions[module]?.view
    }

    const canCreate = (module: string) => {
        if (currentUser?.role === 'owner') return true
        if (!permissions) return false
        return !!permissions[module]?.create
    }

    const canEdit = (module: string) => {
        if (currentUser?.role === 'owner') return true
        if (!permissions) return false
        return !!permissions[module]?.edit
    }

    const canDelete = (module: string) => {
        if (currentUser?.role === 'owner') return true
        if (!permissions) return false
        return !!permissions[module]?.delete
    }

    const hasPermission = (module: string, action: string) => {
        if (currentUser?.role === 'owner') return true
        if (module === 'files' && action === 'upload' && currentUser?.role === 'client') return true
        if (!permissions) return false
        return !!permissions[module]?.[action]
    }

    return { permissions, loading, canView, canCreate, canEdit, canDelete, hasPermission }
}
