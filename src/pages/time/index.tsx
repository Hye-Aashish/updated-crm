import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Clock, Calendar as CalendarIcon, Timer, TrendingUp, Users as UsersIcon, Play, Loader2, Plus, Square, ChevronLeft, ChevronRight } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { timeEntryService, TimeEntry, TimeEntryStats } from '@/lib/timeEntryService'
import api from '@/lib/api-client'
import { useToast } from '@/hooks/use-toast'

interface Project {
    _id: string
    name: string
}

interface Task {
    _id: string
    title: string
    projectId: string
}

export function TimePage() {
    const navigate = useNavigate()
    const { toast } = useToast()

    // State
    const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([])
    const [stats, setStats] = useState<TimeEntryStats>({
        totalHours: 0,
        todayHours: 0,
        activeTimers: 0,
        totalEntries: 0
    })
    const [loading, setLoading] = useState(true)
    const [starting, setStarting] = useState(false)
    const [currentPage, setCurrentPage] = useState(1)
    const itemsPerPage = 5
    const [, setTick] = useState(0) // State to force re-render for timer updates

    // Live Timer Update
    useEffect(() => {
        const interval = setInterval(() => {
            setTick(t => t + 1)
        }, 1000) // Update every second for real-time display
        return () => clearInterval(interval)
    }, [])

    // Start Timer Modal
    const [showStartModal, setShowStartModal] = useState(false)
    const [projects, setProjects] = useState<Project[]>([])
    const [tasks, setTasks] = useState<Task[]>([])
    const [selectedProject, setSelectedProject] = useState('')
    const [selectedTask, setSelectedTask] = useState('')
    const [timerNote, setTimerNote] = useState('')

    // Date Filter Logic
    const today = new Date()
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0)

    const formatDateForInput = (d: Date) => d.toISOString().split('T')[0]

    const [dateRange, setDateRange] = useState({
        start: formatDateForInput(startOfMonth),
        end: formatDateForInput(endOfMonth)
    })

    const handleDateChange = (key: 'start' | 'end', value: string) => {
        setDateRange(prev => ({ ...prev, [key]: value }))
    }

    // Fetch projects and tasks
    const fetchProjectsAndTasks = async () => {
        try {
            const [projectsRes, tasksRes] = await Promise.all([
                api.get('/projects'),
                api.get('/tasks')
            ])

            if (projectsRes.data) {
                setProjects(projectsRes.data)
            }

            if (tasksRes.data) {
                setTasks(tasksRes.data)
            }
        } catch (error) {
            console.error('Error fetching projects/tasks:', error)
        }
    }

    // Fetch data
    const fetchData = async () => {
        try {
            setLoading(true)

            // Fetch time entries with date filter
            const entries = await timeEntryService.getAll({
                startDate: dateRange.start,
                endDate: dateRange.end
            })
            setTimeEntries(entries)

            // Fetch stats
            const statsData = await timeEntryService.getStats({
                startDate: dateRange.start,
                endDate: dateRange.end
            })
            setStats(statsData)

        } catch (error) {
            console.error('Error fetching time data:', error)
            toast({
                title: 'Error',
                description: 'Failed to load time tracking data',
                variant: 'destructive'
            })
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchData()
        fetchProjectsAndTasks()
        setCurrentPage(1) // Reset to first page when dates change
    }, [dateRange])

    // Start timer handler
    const handleStartTimer = async () => {
        if (!selectedProject) {
            toast({
                title: 'Error',
                description: 'Please select a project',
                variant: 'destructive'
            })
            return
        }

        try {
            setStarting(true)

            // For demo purposes, using a hardcoded user ID
            // In production, get this from auth context
            const userId = '507f1f77bcf86cd799439011' // Replace with actual user ID

            await timeEntryService.startTimer(
                userId,
                selectedProject,
                selectedTask || undefined,
                timerNote || undefined
            )

            toast({
                title: 'Timer Started',
                description: 'Time tracking has begun'
            })

            // Reset form and close modal
            setShowStartModal(false)
            setSelectedProject('')
            setSelectedTask('')
            setTimerNote('')

            // Refresh data
            await fetchData()
        } catch (error) {
            console.error('Error starting timer:', error)
            toast({
                title: 'Error',
                description: 'Failed to start timer',
                variant: 'destructive'
            })
        } finally {
            setStarting(false)
        }
    }

    const handleStopTimer = async (entryId: string) => {
        try {
            await timeEntryService.stopTimer(entryId)
            toast({
                title: 'Timer Stopped',
                description: 'Time entry has been saved'
            })
            await fetchData()
        } catch (error) {
            console.error('Error stopping timer:', error)
            toast({
                title: 'Error',
                description: 'Failed to stop timer',
                variant: 'destructive'
            })
        }
    }

    // KPI Card Component
    const StatsCard = ({ title, value, icon: Icon, color, bg }: any) => (
        <Card className="border-l-4 shadow-sm" style={{ borderLeftColor: color }}>
            <CardContent className="p-4 flex items-center justify-between">
                <div>
                    <p className="text-sm font-medium text-muted-foreground">{title}</p>
                    <h3 className="text-2xl font-bold mt-1">{value}</h3>
                </div>
                <div className={`p-2 rounded-lg ${bg}`}>
                    <Icon className="h-5 w-5" style={{ color: color }} />
                </div>
            </CardContent>
        </Card>
    )

    // Calculate project hours from entries
    const projectHours = timeEntries.reduce((acc, entry) => {
        if (!entry.projectId || !entry.projectId._id) return acc

        const projectId = entry.projectId._id
        const projectName = entry.projectId.name || 'Unknown Project'

        if (!acc[projectId]) {
            acc[projectId] = {
                id: projectId,
                name: projectName,
                hours: 0
            }
        }

        acc[projectId].hours += entry.duration / 60

        return acc
    }, {} as Record<string, { id: string; name: string; hours: number }>)

    const topProjects = Object.values(projectHours)
        .sort((a, b) => b.hours - a.hours)
        .slice(0, 5)

    // Filter tasks by selected project
    const filteredTasks = selectedProject
        ? tasks.filter(t => t.projectId === selectedProject)
        : []

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold">Time Tracking</h1>
                    <p className="text-muted-foreground mt-1">Monitor time spent on projects and tasks.</p>
                </div>
                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2 bg-muted/40 p-2 rounded-lg border">
                        <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                        <Input
                            type="date"
                            className="h-8 w-auto bg-background border-none shadow-none text-sm"
                            value={dateRange.start}
                            onChange={(e) => handleDateChange('start', e.target.value)}
                        />
                        <span className="text-muted-foreground">-</span>
                        <Input
                            type="date"
                            className="h-8 w-auto bg-background border-none shadow-none text-sm"
                            value={dateRange.end}
                            onChange={(e) => handleDateChange('end', e.target.value)}
                        />
                    </div>
                    <Button onClick={() => setShowStartModal(true)}>
                        <Plus className="mr-2 h-4 w-4" />
                        Start Timer
                    </Button>
                    <Button variant="outline" onClick={() => navigate('/time/reports')}>
                        Reports
                    </Button>
                </div>
            </div>

            {/* Module Specific KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatsCard title="Total Hours" value={`${stats.totalHours}h`} icon={Clock} color="#3b82f6" bg="bg-blue-50" />
                <StatsCard title="Today" value={`${stats.todayHours}h`} icon={TrendingUp} color="#22c55e" bg="bg-green-50" />
                <StatsCard title="Active Timers" value={stats.activeTimers} icon={Timer} color="#f59e0b" bg="bg-amber-50" />
                <StatsCard title="Total Entries" value={stats.totalEntries} icon={UsersIcon} color="#8b5cf6" bg="bg-purple-50" />
            </div>

            {/* Running Tasks List */}
            {timeEntries.filter(e => e.isRunning).length > 0 && (
                <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent shadow-md">
                    <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <div className="relative flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                            </div>
                            Running Tasks ({timeEntries.filter(e => e.isRunning).length})
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {timeEntries.filter(e => e.isRunning).map((entry) => {
                            const startTime = new Date(entry.startTime);
                            const now = new Date();
                            const elapsedMs = now.getTime() - startTime.getTime();

                            const seconds = Math.floor((elapsedMs / 1000) % 60);
                            const minutes = Math.floor((elapsedMs / (1000 * 60)) % 60);
                            const hours = Math.floor(elapsedMs / (1000 * 60 * 60));

                            return (
                                <div key={entry._id} className="group flex items-center justify-between p-4 bg-card hover:bg-muted/50 transition-colors rounded-xl border shadow-sm">
                                    <div className="flex items-center gap-4">
                                        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                                            <Timer className="h-6 w-6 text-primary animate-pulse" />
                                        </div>
                                        <div>
                                            <h4 className="font-semibold text-foreground text-lg tracking-tight">{entry.taskId?.title || 'No Task'}</h4>
                                            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-0.5">
                                                <Badge variant="outline" className="text-xs font-normal bg-background/50 backdrop-blur-sm">
                                                    {entry.projectId?.name || 'No project'}
                                                </Badge>
                                                <span>•</span>
                                                <span className="font-mono text-xs opacity-80">Started at {startTime.toLocaleTimeString()}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-3xl font-bold font-mono text-primary tabular-nums tracking-tighter">
                                            {hours.toString().padStart(2, '0')}:
                                            {minutes.toString().padStart(2, '0')}:
                                            <span className="text-primary/60 text-2xl">{seconds.toString().padStart(2, '0')}</span>
                                        </div>
                                        <div className="flex items-center justify-end gap-3 mt-1">
                                            <div className="flex items-center gap-1.5">
                                                <span className="relative flex h-2 w-2">
                                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                                                </span>
                                                <span className="text-xs font-medium text-green-600 uppercase tracking-wider">Active</span>
                                            </div>
                                            <Button size="icon" variant="destructive" className="h-7 w-7 rounded-full shadow-sm hover:shadow-md" onClick={() => handleStopTimer(entry._id)} title="Stop Timer manually">
                                                <Square className="h-3 w-3 fill-current" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </CardContent>
                </Card>
            )}

            <div className="grid gap-6 lg:grid-cols-3">
                <div className="lg:col-span-2 space-y-4">
                    <h2 className="text-xl font-semibold">Recent Activity</h2>
                    {timeEntries.length === 0 ? (
                        <Card>
                            <CardContent className="p-12 text-center">
                                <Clock className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                                <h3 className="text-lg font-semibold mb-2">No Time Entries</h3>
                                <p className="text-muted-foreground">
                                    No time entries found for the selected date range.
                                </p>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="space-y-4">
                            {timeEntries
                                .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                                .map((entry) => (
                                    <Card key={entry._id} className="hover:shadow-md transition-shadow">
                                        <CardContent className="p-4 flex items-center justify-between">
                                            <div className="space-y-1">
                                                <div className="font-medium flex items-center gap-2">
                                                    {entry.taskId?.title || 'No Task'}
                                                    <Badge variant="outline" className="text-[10px] font-normal py-0">
                                                        {entry.projectId?.name || 'No project'}
                                                    </Badge>
                                                    {entry.isRunning && (
                                                        <Badge variant="default" className="text-[10px] py-0 bg-green-500 hover:bg-green-600">
                                                            <div className="flex items-center gap-1">
                                                                <span className="relative flex h-1.5 w-1.5">
                                                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                                                                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-white"></span>
                                                                </span>
                                                                Running
                                                            </div>
                                                        </Badge>
                                                    )}
                                                </div>
                                                <div className="text-xs text-muted-foreground flex items-center gap-2">
                                                    <span className="font-medium text-foreground">{entry.userId?.name || 'Unknown user'}</span>
                                                    <span>•</span>
                                                    <span>{formatDate(new Date(entry.startTime))}</span>
                                                </div>
                                                {entry.note && (
                                                    <p className="text-xs italic text-muted-foreground border-l-2 pl-2 mt-2">"{entry.note}"</p>
                                                )}
                                            </div>
                                            <div className="text-right">
                                                <div className="text-xl font-bold font-mono tracking-tight">
                                                    {Math.floor(entry.duration / 60)}h {entry.duration % 60}m
                                                </div>
                                                <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Duration</div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}

                            {/* Pagination Controls */}
                            {timeEntries.length > itemsPerPage && (
                                <div className="flex items-center justify-between px-2 py-4">
                                    <p className="text-sm text-muted-foreground font-medium">
                                        Showing <span className="text-foreground font-bold">{Math.min(timeEntries.length, (currentPage - 1) * itemsPerPage + 1)}</span> to{' '}
                                        <span className="text-foreground font-bold">{Math.min(timeEntries.length, currentPage * itemsPerPage)}</span> of{' '}
                                        <span className="text-foreground font-bold">{timeEntries.length}</span> entries
                                    </p>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                            disabled={currentPage === 1}
                                            className="h-8 w-8 p-0"
                                        >
                                            <ChevronLeft className="h-4 w-4" />
                                        </Button>
                                        <div className="flex items-center gap-1">
                                            {Array.from({ length: Math.ceil(timeEntries.length / itemsPerPage) }, (_, i) => i + 1).map((page) => (
                                                <Button
                                                    key={page}
                                                    variant={currentPage === page ? 'default' : 'ghost'}
                                                    size="sm"
                                                    onClick={() => setCurrentPage(page)}
                                                    className={`h-8 w-8 p-0 text-xs font-bold ${currentPage === page ? 'shadow-sm shadow-primary/20' : ''}`}
                                                >
                                                    {page}
                                                </Button>
                                            ))}
                                        </div>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setCurrentPage(p => Math.min(Math.ceil(timeEntries.length / itemsPerPage), p + 1))}
                                            disabled={currentPage === Math.ceil(timeEntries.length / itemsPerPage)}
                                            className="h-8 w-8 p-0"
                                        >
                                            <ChevronRight className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Top Projects by Hours</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {topProjects.length === 0 ? (
                                <p className="text-sm text-muted-foreground text-center py-4">
                                    No project data available
                                </p>
                            ) : (
                                topProjects.map(p => (
                                    <div key={p.id} className="flex items-center justify-between">
                                        <div className="truncate flex-1 pr-4">
                                            <div className="font-medium truncate">{p.name}</div>
                                            <div className="h-2 bg-secondary rounded-full mt-1 overflow-hidden">
                                                <div className="h-full bg-primary" style={{ width: `${Math.min(100, (p.hours / 20) * 100)}%` }} />
                                            </div>
                                        </div>
                                        <div className="font-mono text-sm font-bold">
                                            {p.hours.toFixed(1)}h
                                        </div>
                                    </div>
                                ))
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Start Timer Modal */}
            <Dialog open={showStartModal} onOpenChange={setShowStartModal}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Start Timer</DialogTitle>
                        <DialogDescription>
                            Select a project and optionally a task to start tracking time.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="project">Project *</Label>
                            <Select value={selectedProject} onValueChange={setSelectedProject}>
                                <SelectTrigger id="project">
                                    <SelectValue placeholder="Select a project" />
                                </SelectTrigger>
                                <SelectContent>
                                    {projects.map(project => (
                                        <SelectItem key={project._id} value={project._id}>
                                            {project.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="task">Task (Optional)</Label>
                            <Select
                                value={selectedTask}
                                onValueChange={setSelectedTask}
                                disabled={!selectedProject}
                            >
                                <SelectTrigger id="task">
                                    <SelectValue placeholder="Select a task" />
                                </SelectTrigger>
                                <SelectContent>
                                    {filteredTasks.map(task => (
                                        <SelectItem key={task._id} value={task._id}>
                                            {task.title}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="note">Note (Optional)</Label>
                            <Textarea
                                id="note"
                                placeholder="Add a note about what you're working on..."
                                value={timerNote}
                                onChange={(e) => setTimerNote(e.target.value)}
                                rows={3}
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowStartModal(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleStartTimer} disabled={starting || !selectedProject}>
                            {starting ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Starting...
                                </>
                            ) : (
                                <>
                                    <Play className="mr-2 h-4 w-4" />
                                    Start Timer
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
