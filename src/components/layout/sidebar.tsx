import { useMemo } from 'react'
import { PortalSidebar, type SidebarProps } from './portal-sidebar'
import { buildStaffNavItems } from './nav-items'

export function Sidebar(props: SidebarProps) {
    const navItems = useMemo(() => buildStaffNavItems(''), [])

    return (
        <PortalSidebar
            {...props}
            navItems={navItems}
            defaultCompanyName="Nexprism"
            mobileBadge="CRM Workspace"
            desktopBadge="Enterprise"
            fallbackAvatarChar="U"
        />
    )
}
