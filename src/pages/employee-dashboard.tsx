import { useNavigate } from 'react-router-dom'
import { useAppStore } from '@/store'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
    Briefcase, CheckSquare, Clock,
    Calendar, PlayCircle, StopCircle, Coffee
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { useAttendance } from '@/hooks/use-attendance'

export function EmployeeDashboardPage() {
    const navigate = useNavigate()
    const { projects, tasks, currentUser } = useAppStore()
    const userId = currentUser?.id || (currentUser as any)?._id

    const {
        currentTime, attendanceStatus, elapsedTime,
        handleClockIn, handleBreakToggle, handleClockOut, formatElapsedTime
    } = useAttendance(userId)

    if (!currentUser) return null;

    // --- Metrics for Employee (Filtered by Current User is harder with mock data, simulating "My" data) ---
    // In a real app, I'd filter like: .filter(t => t.assigneeId === currentUser.id)
    // For this mock, I'll filter by 'u4' (Sneha Patel - Developer) roughly or just show general stats if currentUser id doesn't match mock.

    // Assuming currentUser is the logged in user.
    const myTasks = tasks.filter(t => t.assigneeId === currentUser.id || t.assigneeId === 'u4') // Fallback ID for demo if needed

    const myPendingTasks = myTasks.filter(t => t.status !== 'done').length
    const myTasksDueToday = myTasks.filter(t => {
        if (t.status === 'done') return false
        const d = new Date(t.dueDate)
        const now = new Date()
        return d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    }).length

    const myActiveProjects = projects.filter(p => !p.status?.includes('completed')).length // Simply showing all active projects as user might be part of them

    const myRecentTasks = myTasks.filter(t => t.status !== 'done').slice(0, 5)

    const metrics = [
        { title: 'My Active Tasks', value: myPendingTasks, icon: CheckSquare, color: '#3b82f6', bg: 'bg-blue-50', link: '/employee/tasks' },
        { title: 'Due Today', value: myTasksDueToday, icon: Calendar, color: '#eab308', bg: 'bg-yellow-50', link: '/employee/tasks?due=today' },
        { title: 'Assigned Projects', value: myActiveProjects, icon: Briefcase, color: '#8b5cf6', bg: 'bg-purple-50', link: '/employee/projects' },
        { title: 'Logged Hours', value: "24h", icon: Clock, color: '#10b981', bg: 'bg-emerald-50', link: '/employee/time' },
    ]

    return (
        <div className="space-y-6 pb-10">
            {/* Header and Attendance */}
            <div className="flex flex-col xl:flex-row gap-6">
                <div className="flex-1 space-y-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-primary">Employee Panel</h1>
                        <p className="text-muted-foreground">Welcome back, {currentUser?.name || 'Employee'}. You have {myTasksDueToday} tasks due today.</p>
                    </div>

                    {/* Metrics */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                        {metrics.map((m, i) => (
                            <Card
                                key={i}
                                className="cursor-pointer hover:shadow-md transition-all border-l-4 overflow-hidden relative"
                                style={{ borderLeftColor: m.color }}
                                onClick={() => navigate(m.link)}
                            >
                                <CardContent className="p-4 relative z-10">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="text-[13px] font-medium text-muted-foreground whitespace-nowrap">{m.title}</p>
                                            <h3 className="text-2xl font-bold mt-1 text-foreground">{m.value}</h3>
                                        </div>
                                        <div className={`p-2 rounded-lg ${m.bg}`}>
                                            <m.icon className="h-5 w-5" style={{ color: m.color }} />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>

                {/* Attendance Widget */}
                <Card className="flex-shrink-0 w-full xl:w-96 border-l-4 border-l-primary shadow-sm">
                    <CardContent className="p-5">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <Clock className="h-5 w-5 text-primary" />
                                <h3 className="font-semibold text-lg">Attendance</h3>
                            </div>
                            <Badge variant={attendanceStatus === 'in' ? 'default' : attendanceStatus === 'break' ? 'secondary' : 'outline'} className="capitalize px-3 py-1">
                                {attendanceStatus === 'out' ? 'Clocked Out' : attendanceStatus === 'in' ? 'Clocked In' : 'On Break'}
                            </Badge>
                        </div>

                        <div className="text-center py-2 bg-muted/20 rounded-lg mb-4">
                            <div className="text-3xl font-mono font-bold tracking-wider">
                                {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </div>
                            <div className="text-sm text-muted-foreground mt-1">
                                {currentTime.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}
                            </div>
                        </div>

                        {attendanceStatus === 'in' && (
                            <div className="text-center mb-4">
                                <span className="text-xs text-muted-foreground uppercase tracking-widest">Session Duration</span>
                                <div className="text-xl font-mono font-medium text-primary mt-1">
                                    {formatElapsedTime(elapsedTime)}
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-3">
                            {attendanceStatus === 'out' ? (
                                <Button className="col-span-2 w-full gap-2 bg-green-600 hover:bg-green-700" onClick={handleClockIn}>
                                    <PlayCircle className="h-5 w-5" />
                                    Clock In
                                </Button>
                            ) : (
                                <>
                                    {attendanceStatus === 'in' ? (
                                        <Button variant="outline" className="gap-2 border-yellow-500 text-yellow-600 hover:bg-yellow-50" onClick={handleBreakToggle}>
                                            <Coffee className="h-4 w-4" />
                                            Take Break
                                        </Button>
                                    ) : (
                                        <Button className="gap-2 bg-green-600 hover:bg-green-700" onClick={handleBreakToggle}>
                                            <PlayCircle className="h-4 w-4" />
                                            Resume
                                        </Button>
                                    )}
                                    <Button variant="destructive" className="gap-2" onClick={handleClockOut}>
                                        <StopCircle className="h-4 w-4" />
                                        Clock Out
                                    </Button>
                                </>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* My Tasks List */}
            <div className="grid gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">My Priority Tasks</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {myRecentTasks.length > 0 ? (
                            <div className="space-y-4">
                                {myRecentTasks.map(task => (
                                    <div key={task.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-2 h-2 rounded-full ${task.priority === 'urgent' ? 'bg-red-500' : task.priority === 'high' ? 'bg-orange-500' : 'bg-blue-500'}`} />
                                            <div>
                                                <p className="font-medium text-sm">{task.title}</p>
                                                <p className="text-xs text-muted-foreground">{task.projectId}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <Badge variant="outline">{task.status}</Badge>
                                            <span className="text-xs text-muted-foreground">Due: {new Date(task.dueDate).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8 text-muted-foreground">
                                No pending tasks. Good job!
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
