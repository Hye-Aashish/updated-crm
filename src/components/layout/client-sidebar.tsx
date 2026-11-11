import { useMemo } from 'react'
import { PortalSidebar, type SidebarProps } from './portal-sidebar'
import { buildClientNavItems } from './nav-items'

export function ClientSidebar(props: SidebarProps) {
    const navItems = useMemo(() => buildClientNavItems(), [])

    return (
        <PortalSidebar
            {...props}
            navItems={navItems}
            defaultCompanyName="Client Portal"
            mobileBadge="Client Suite"
            desktopBadge="Client Portal"
            fallbackAvatarChar="C"
            fixedRoleBadge="Client"
        />
    )
}
