import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
    Clock,
    Coffee,
    LogOut,
    LogIn,
    Calendar,
    Play,
    Pause,
    History,
    CheckCircle2,
    Info
} from 'lucide-react'
import api from '@/lib/api-client'
import { useToast } from '@/hooks/use-toast'
import { format } from 'date-fns'
import { useAppStore } from '@/store'
import { AttendanceSheet } from '@/components/attendance/attendance-sheet'

export function AttendancePage() {
    const { toast } = useToast()
    const { currentUser } = useAppStore()
    const [status, setStatus] = useState<any>(null)
    const [history, setHistory] = useState<any[]>([])
    const [users, setUsers] = useState<any[]>([])
    const [currentTime, setCurrentTime] = useState(new Date())

    useEffect(() => {
        if (currentUser?.id) {
            fetchStatus()
            fetchHistory()
            fetchUsers()
        }
        const timer = setInterval(() => setCurrentTime(new Date()), 1000)
        return () => clearInterval(timer)
    }, [currentUser])

    const fetchStatus = async () => {
        try {
            const res = await api.get(`/attendance/today/${currentUser?.id || (currentUser as any)._id}`)
            setStatus(res.data)
        } catch (error) {
            console.error('Failed to fetch status')
        }
    }

    const fetchHistory = async () => {
        try {
            const res = await api.get(`/attendance/history/${currentUser?.id || (currentUser as any)._id}`)
            setHistory(res.data)
        } catch (error) {
            console.error('Failed to fetch history')
        }
    }

    const fetchUsers = async () => {
        try {
            const res = await api.get('/users')
            setUsers(res.data)
        } catch (error) {
            console.error('Failed to fetch users')
        }
    }

    const handleAction = async (endpoint: string, successMsg: string) => {
        try {
            const res = await api.post(`/attendance/${endpoint}`, { userId: currentUser?.id })
            setStatus(res.data)
            toast({ title: 'Success', description: successMsg })
            fetchHistory()
        } catch (error: any) {
            toast({
                title: 'Error',
                description: error.response?.data?.message || 'Action failed',
                variant: 'destructive'
            })
        }
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'present': return 'bg-green-500'
            case 'on-break': return 'bg-amber-500'
            case 'checked-out': return 'bg-slate-500'
            default: return 'bg-rose-500'
        }
    }

    const formatTime = (date: any) => {
        if (!date) return '--:--'
        return format(new Date(date), 'hh:mm a')
    }

    const formatDuration = (mins: number) => {
        if (!mins) return '0m'
        const h = Math.floor(mins / 60)
        const m = mins % 60
        return h > 0 ? `${h}h ${m}m` : `${m}m`
    }

    return (
        <div className="p-6 space-y-8 max-w-6xl mx-auto animate-in fade-in duration-700">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Attendance Tracking</h1>
                    <p className="text-muted-foreground mt-1">Manage your daily check-ins, breaks, and shifts.</p>
                </div>
                <div className="flex items-center gap-3 bg-card p-3 rounded-xl border shadow-sm">
                    <div className="bg-primary/10 p-2 rounded-lg">
                        <Calendar className="h-5 w-5 text-primary" />
                    </div>
                    <div className="text-right">
                        <p className="text-xs font-bold text-muted-foreground uppercase">{format(currentTime, 'EEEE')}</p>
                        <p className="text-lg font-bold">{format(currentTime, 'dd MMM yyyy')}</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Action Card */}
                <Card className="lg:col-span-2 overflow-hidden border-2 border-primary/10 shadow-xl relative group">
                    <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                        <Clock className="w-48 h-48" />
                    </div>
                    <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                            <CardTitle>Daily Shift</CardTitle>
                            <Badge className={`${getStatusColor(status?.status)} text-white px-3 py-1`}>
                                {status?.status?.toUpperCase() || 'ABSENT'}
                            </Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-8 py-6">
                        <div className="text-center space-y-2 relative">
                            <h2 className="text-5xl md:text-7xl font-black font-mono tracking-tighter text-primary">
                                {format(currentTime, 'hh:mm:ss')}
                                <span className="text-xl md:text-2xl ml-2 font-sans font-bold text-muted-foreground">{format(currentTime, 'a')}</span>
                            </h2>
                            <p className="text-sm font-medium text-muted-foreground">Current Session Time</p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-muted/40 p-4 rounded-2xl text-center space-y-1">
                                <LogIn className="h-4 w-4 mx-auto text-green-500 mb-1" />
                                <p className="text-xs font-bold text-muted-foreground uppercase">Check In</p>
                                <p className="text-lg md:text-xl font-bold">{formatTime(status?.checkIn)}</p>
                            </div>
                            <div className="bg-muted/40 p-4 rounded-2xl text-center space-y-1">
                                <Coffee className="h-4 w-4 mx-auto text-amber-500 mb-1" />
                                <p className="text-xs font-bold text-muted-foreground uppercase">Break Time</p>
                                <p className="text-lg md:text-xl font-bold">{formatDuration(status?.totalBreakTime)}</p>
                            </div>
                            <div className="bg-muted/40 p-4 rounded-2xl text-center space-y-1">
                                <LogOut className="h-4 w-4 mx-auto text-rose-500 mb-1" />
                                <p className="text-xs font-bold text-muted-foreground uppercase">Check Out</p>
                                <p className="text-lg md:text-xl font-bold">{formatTime(status?.checkOut)}</p>
                            </div>
                            <div className="bg-muted/40 p-4 rounded-2xl text-center space-y-1">
                                <History className="h-4 w-4 mx-auto text-blue-500 mb-1" />
                                <p className="text-xs font-bold text-muted-foreground uppercase">Work Hours</p>
                                <p className="text-lg md:text-xl font-bold">{formatDuration(status?.totalWorkTime)}</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                            {!status?.checkIn && (
                                <Button
                                    size="lg"
                                    className="md:col-span-2 h-16 text-lg font-bold gap-3 shadow-lg shadow-primary/20 hover:scale-[1.02] transition-transform"
                                    onClick={() => handleAction('check-in', 'Checked in successfully!')}
                                >
                                    <Play className="h-6 w-6" /> Check In Now
                                </Button>
                            )}

                            {status?.checkIn && !status?.checkOut && (
                                <>
                                    {status.status === 'on-break' ? (
                                        <Button
                                            size="lg"
                                            variant="secondary"
                                            className="h-16 text-lg font-bold gap-3 bg-amber-100 hover:bg-amber-200 text-amber-900"
                                            onClick={() => handleAction('break-end', 'Break ended!')}
                                        >
                                            <Play className="h-6 w-6" /> End Break
                                        </Button>
                                    ) : (
                                        <Button
                                            size="lg"
                                            variant="outline"
                                            className="h-16 text-lg font-bold gap-3 border-amber-200 hover:bg-amber-50 text-amber-700"
                                            onClick={() => handleAction('break-start', 'Break started!')}
                                        >
                                            <Pause className="h-6 w-6" /> Start Break
                                        </Button>
                                    )}

                                    <Button
                                        size="lg"
                                        variant="destructive"
                                        className="h-16 text-lg font-bold gap-3 shadow-lg shadow-rose-200"
                                        onClick={() => handleAction('check-out', 'Checked out successfully!')}
                                    >
                                        <LogOut className="h-6 w-6" /> Check Out
                                    </Button>
                                </>
                            )}

                            {status?.checkOut && (
                                <div className="col-span-2 text-center p-4 bg-green-50 border border-green-100 rounded-xl text-green-800 font-bold flex items-center justify-center gap-2">
                                    <CheckCircle2 className="h-5 w-5" />
                                    Shift completed for today.
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Sidebar Info */}
                <Card className="shadow-lg">
                    <CardHeader>
                        <CardTitle className="text-lg">Recent History</CardTitle>
                        <CardDescription>Your last 30 days activity</CardDescription>
                    </CardHeader>
                    <CardContent className="px-0">
                        <div className="space-y-1 max-h-[450px] overflow-y-auto px-6">
                            {history.length === 0 ? (
                                <div className="text-center py-10 opacity-30">
                                    <Clock className="w-12 h-12 mx-auto mb-2" />
                                    <p className="text-sm">No history found</p>
                                </div>
                            ) : (
                                history.map((entry, idx) => (
                                    <div key={idx} className="flex items-center justify-between py-3 border-b last:border-0 group">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-bold">{format(new Date(entry.date), 'dd MMM')}</span>
                                            <span className="text-[10px] text-muted-foreground uppercase">{format(new Date(entry.date), 'EEEE')}</span>
                                        </div>
                                        <div className="text-right">
                                            <div className="flex items-center gap-2 text-xs font-bold">
                                                <span className="text-muted-foreground">{formatTime(entry.checkIn)}</span>
                                                <span className="text-muted-foreground opacity-30">→</span>
                                                <span>{formatTime(entry.checkOut)}</span>
                                            </div>
                                            <Badge variant="secondary" className="text-[9px] h-4 mt-1">
                                                {formatDuration(entry.totalWorkTime)} work
                                            </Badge>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="bg-gradient-to-br from-blue-500/5 to-transparent border-none shadow-sm">
                    <CardContent className="p-6 flex items-center gap-4">
                        <div className="bg-blue-500 rounded-2xl p-3 text-white shadow-lg shadow-blue-200">
                            <Clock className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Standard Shift</p>
                            <p className="text-2xl font-black">9.0 Hours</p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-amber-500/5 to-transparent border-none shadow-sm">
                    <CardContent className="p-6 flex items-center gap-4">
                        <div className="bg-amber-500 rounded-2xl p-3 text-white shadow-lg shadow-amber-200">
                            <Coffee className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Lunch Break</p>
                            <p className="text-2xl font-black">1.0 Hour</p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-purple-500/5 to-transparent border-none shadow-sm">
                    <CardContent className="p-6 flex items-center gap-4">
                        <div className="bg-purple-500 rounded-2xl p-3 text-white shadow-lg shadow-purple-200">
                            <Info className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Monthly Status</p>
                            <p className="text-2xl font-black">Consistent</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Monthly Attendance Sheet (Requested) */}
            <div className="space-y-4 pt-8 border-t">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Team Attendance Sheet</h2>
                    <p className="text-muted-foreground mt-1">Full monthly overview of all team members.</p>
                </div>
                <AttendanceSheet users={users} />
            </div>
        </div>
    )
}
