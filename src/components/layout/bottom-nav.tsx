import { useNavigate, useLocation } from 'react-router-dom'
import { LayoutDashboard, Briefcase, CheckSquare, MessageSquare, Menu } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/store'

interface BottomNavProps {
    onMenuClick: () => void
}

export function BottomNav({ onMenuClick }: BottomNavProps) {
    const navigate = useNavigate()
    const location = useLocation()
    const { currentUser } = useAppStore()

    const getBaseUrl = () => {
        if (currentUser?.role === 'client') return '/client'
        if (currentUser?.role === 'employee' || currentUser?.role === 'developer' || currentUser?.role === 'pm') {
            // Check if we are currently in employee route
            if (location.pathname.startsWith('/employee')) return '/employee'
        }
        return ''
    }

    const baseUrl = getBaseUrl()

    const navItems = [
        {
            label: 'Home',
            icon: LayoutDashboard,
            path: `${baseUrl}/dashboard`.replace('//', '/'),
        },
        {
            label: 'Projects',
            icon: Briefcase,
            path: `${baseUrl}/projects`.replace('//', '/'),
        },
        {
            label: 'Tasks',
            icon: CheckSquare,
            path: `${baseUrl}/tasks`.replace('//', '/'),
        },
        {
            label: 'Chat',
            icon: MessageSquare,
            path: `${baseUrl}/project-chat`.replace('//', '/'),
        },
    ]

    return (
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-t border-border/50 pb-safe shadow-[0_-8px_40px_rgba(0,0,0,0.08)]">
            <div className="flex justify-around items-center h-16 px-4">
                {navItems.map((item) => {
                    const isActive = location.pathname === item.path
                    return (
                        <button
                            key={item.label}
                            onClick={() => navigate(item.path)}
                            className={cn(
                                "flex flex-col items-center justify-center flex-1 transition-all duration-300 relative py-1",
                                isActive ? "text-primary scale-105" : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <div className={cn(
                                "flex items-center justify-center w-10 h-10 rounded-2xl transition-all duration-500 mb-0.5",
                                isActive ? "bg-primary/10 shadow-inner" : "bg-transparent"
                            )}>
                                <item.icon className={cn("h-5 w-5 transition-transform duration-500", isActive && "stroke-[2.5px]")} />
                            </div>
                            <span className={cn(
                                "text-[10px] tracking-tight transition-all duration-300",
                                isActive ? "font-black opacity-100 uppercase" : "font-medium opacity-70"
                            )}>
                                {item.label}
                            </span>
                            {isActive && (
                                <div className="absolute -top-1 w-1 h-1 rounded-full bg-primary animate-pulse" />
                            )}
                        </button>
                    )
                })}
                <button
                    onClick={onMenuClick}
                    className="flex flex-col items-center justify-center flex-1 text-muted-foreground hover:text-foreground transition-all py-1"
                >
                    <div className="flex items-center justify-center w-10 h-10 rounded-2xl mb-0.5">
                        <Menu className="h-5 w-5" />
                    </div>
                    <span className="text-[10px] font-medium tracking-tight opacity-70">More</span>
                </button>
            </div>
        </div>
    )
}
