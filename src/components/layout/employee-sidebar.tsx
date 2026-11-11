import { useMemo } from 'react'
import { PortalSidebar, type SidebarProps } from './portal-sidebar'
import { buildStaffNavItems } from './nav-items'

export function EmployeeSidebar(props: SidebarProps) {
    const navItems = useMemo(() => buildStaffNavItems('/employee'), [])

    return (
        <PortalSidebar
            {...props}
            navItems={navItems}
            defaultCompanyName="Employee Workspace"
            mobileBadge="Employee Suite"
            desktopBadge="Employee Suite"
            fallbackAvatarChar="E"
        />
    )
}
