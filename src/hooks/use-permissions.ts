import { useState, useEffect } from 'react'
import { useAppStore } from '@/store'
import api from '@/lib/api-client'

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

        api.get('/settings').then(res => {
            if (res.data.roles) {
                const role = res.data.roles.find((r: any) => r.name === currentUser.role)
                if (role) setPermissions(role.permissions)
            }
            setLoading(false)
        }).catch(err => {
            console.error("Permission fetch error", err)
            setLoading(false)
        })
    }, [currentUser])

    const canView = (module: string) => {
        if (currentUser?.role === 'owner') return true
        if (!permissions) return false
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

    return { permissions, loading, canView, canCreate, canEdit, canDelete }
}
