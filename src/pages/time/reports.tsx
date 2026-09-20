import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import {
    ArrowLeft,
    Clock,
    Calendar as CalendarIcon,
    Download,
    Search,
    TrendingUp,
    Users as UsersIcon,
    Zap,
    History,
    CheckCircle2,
    Timer,
    AlertCircle,
    Loader2,
    Briefcase,
    FileSpreadsheet,
    Printer,
    UserCheck,
    Play
} from 'lucide-react'
import api from '@/lib/api-client'
import { timeEntryService, GranularTimeReportData, EmployeeSpeedMetric } from '@/lib/timeEntryService'
import { useToast } from '@/hooks/use-toast'
import { useAppStore } from '@/store'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

export function TimeReportsPage() {
    const navigate = useNavigate()
    const { toast } = useToast()
    const { users: globalUsers, projects: globalProjects, currentUser } = useAppStore()
    const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'owner'

    // Local Users & Projects Filter State
    const [usersList, setUsersList] = useState<any[]>([])
    const [projectsList, setProjectsList] = useState<any[]>([])

    useEffect(() => {
        const fetchFilterOptions = async () => {
            try {
                if (isAdmin) {
                    const uRes = await api.get('/users')
                    setUsersList(uRes.data || [])
                }
                const pRes = await api.get('/projects')
                setProjectsList(pRes.data || [])
            } catch (e) {
                console.error('Failed to load filter options:', e)
            }
        }
        fetchFilterOptions()
    }, [isAdmin])

    const availableUsers = usersList.length > 0 ? usersList : globalUsers
    const availableProjects = projectsList.length > 0 ? projectsList : globalProjects

    // Date Filters with local timezone precision
    const todayDate = new Date()
    const formatDateInput = (d: Date) => {
        const year = d.getFullYear()
        const month = String(d.getMonth() + 1).padStart(2, '0')
        const day = String(d.getDate()).padStart(2, '0')
        return `${year}-${month}-${day}`
    }

    const [presetFilter, setPresetFilter] = useState<'today' | 'yesterday' | '7days' | 'month' | 'custom'>('7days')
    const [startDate, setStartDate] = useState(formatDateInput(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)))
    const [endDate, setEndDate] = useState(formatDateInput(todayDate))
    const [selectedUser, setSelectedUser] = useState('all')
    const [selectedProject, setSelectedProject] = useState('all')
    const [searchQuery, setSearchQuery] = useState('')

    // Report State
    const [reportData, setReportData] = useState<GranularTimeReportData | null>(null)
    const [loading, setLoading] = useState(true)

    // Apply Preset Filter
    const applyPreset = (preset: 'today' | 'yesterday' | '7days' | 'month' | 'custom') => {
        setPresetFilter(preset)
        const now = new Date()

        if (preset === 'today') {
            const str = formatDateInput(now)
            setStartDate(str)
            setEndDate(str)
        } else if (preset === 'yesterday') {
            const yest = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)
            const str = formatDateInput(yest)
            setStartDate(str)
            setEndDate(str)
        } else if (preset === '7days') {
            const start7 = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6)
            setStartDate(formatDateInput(start7))
            setEndDate(formatDateInput(now))
        } else if (preset === 'month') {
            const startM = new Date(now.getFullYear(), now.getMonth(), 1)
            const endM = new Date(now.getFullYear(), now.getMonth() + 1, 0)
            setStartDate(formatDateInput(startM))
            setEndDate(formatDateInput(endM))
        }
    }

    // Fetch Report Data
    const fetchReport = async () => {
        try {
            setLoading(true)
            const data = await timeEntryService.getDetailedReport({
                startDate,
                endDate,
                userId: selectedUser !== 'all' ? selectedUser : undefined,
                projectId: selectedProject !== 'all' ? selectedProject : undefined
            })
            setReportData(data)
        } catch (error) {
            console.error('Error fetching detailed time report:', error)
            toast({
                title: 'Error',
                description: 'Failed to load detailed employee time report',
                variant: 'destructive'
            })
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchReport()
    }, [startDate, endDate, selectedUser, selectedProject])

    // Format Minutes helper
    const formatMinutesToHHMM = (totalMinutes: number) => {
        const hrs = Math.floor(totalMinutes / 60)
        const mins = Math.round(totalMinutes % 60)
        if (hrs === 0) return `${mins}m`
        return `${hrs}h ${mins}m`
    }

    // Format Start & End Time (12 hour AM/PM with seconds)
    const formatTimestamp = (dateStr?: string | Date) => {
        if (!dateStr) return '-'
        const d = new Date(dateStr)
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })
    }

    // Filter detailed entries by search query
    const filteredDetailedEntries = useMemo(() => {
        if (!reportData?.detailedEntries) return []
        return reportData.detailedEntries.filter(entry => {
            const empName = entry.userId?.name || ''
            const projName = entry.projectId?.name || ''
            const taskTitle = entry.taskId?.title || ''
            const noteText = entry.note || ''
            const q = searchQuery.toLowerCase()

            return (
                empName.toLowerCase().includes(q) ||
                projName.toLowerCase().includes(q) ||
                taskTitle.toLowerCase().includes(q) ||
                noteText.toLowerCase().includes(q)
            )
        })
    }, [reportData, searchQuery])

    // Export CSV Function
    const exportCSV = () => {
        if (!reportData || !filteredDetailedEntries.length) {
            toast({
                title: 'No Data',
                description: 'No logs available to export.',
                variant: 'destructive'
            })
            return
        }

        const headers = ['Employee Name', 'Employee Email', 'Project Name', 'Task Title', 'Start Date', 'Start Time', 'End Time', 'Duration (Mins)', 'Duration (Formatted)', 'Status', 'Notes']
        const rows = filteredDetailedEntries.map(entry => {
            const empName = entry.userId?.name || 'Unknown'
            const empEmail = entry.userId?.email || ''
            const projName = entry.projectId?.name || 'General'
            const taskTitle = entry.taskId?.title || 'Direct Work Log'
            const startDateStr = new Date(entry.startTime).toLocaleDateString()
            const startTimeStr = formatTimestamp(entry.startTime)
            const endTimeStr = entry.isRunning ? 'RUNNING' : formatTimestamp(entry.endTime)
            const durationMins = entry.isRunning ? Math.floor((Date.now() - new Date(entry.startTime).getTime()) / 1000 / 60) : (entry.duration || 0)
            const durationFormatted = formatMinutesToHHMM(durationMins)
            const statusStr = entry.isRunning ? 'Running' : 'Completed'
            const noteClean = (entry.note || '').replace(/"/g, '""')

            return [
                `"${empName}"`,
                `"${empEmail}"`,
                `"${projName}"`,
                `"${taskTitle}"`,
                `"${startDateStr}"`,
                `"${startTimeStr}"`,
                `"${endTimeStr}"`,
                durationMins,
                `"${durationFormatted}"`,
                `"${statusStr}"`,
                `"${noteClean}"`
            ].join(',')
        })

        const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n')
        const encodedUri = encodeURI(csvContent)
        const link = document.createElement('a')
        link.setAttribute('href', encodedUri)
        link.setAttribute('download', `Employee_Work_Speed_Report_${startDate}_to_${endDate}.csv`)
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)

        toast({
            title: 'Report Downloaded',
            description: 'CSV report has been successfully exported.'
        })
    }

    const getInitials = (name: string) => {
        if (!name) return 'U'
        return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)
    }

    return (
        <div className="space-y-6">
            {/* Header & Navigation */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <Button variant="outline" size="icon" onClick={() => navigate('/time')} className="h-10 w-10 rounded-xl">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h1 className="text-2xl md:text-3xl font-black tracking-tight flex items-center gap-2">
                            Employee Work & Speed Reports
                            <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 text-xs font-bold">
                                Granular Analytics
                            </Badge>
                        </h1>
                        <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
                            Minute-by-minute work logs, yesterday vs today comparison, and employee productivity speed ratings.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={exportCSV} className="rounded-xl font-bold flex items-center gap-2">
                        <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                        Export CSV
                    </Button>
                    <Button variant="outline" onClick={() => window.print()} className="rounded-xl font-bold flex items-center gap-2">
                        <Printer className="h-4 w-4" />
                        Print / PDF
                    </Button>
                </div>
            </div>

            {/* Filter Control Hub */}
            <Card className="border-muted/60 shadow-sm bg-card">
                <CardContent className="p-4 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3">
                        {/* Date Preset Buttons */}
                        <div className="flex flex-wrap gap-1.5 p-1 bg-muted/50 rounded-xl">
                            <Button
                                size="sm"
                                variant={presetFilter === 'today' ? 'default' : 'ghost'}
                                onClick={() => applyPreset('today')}
                                className="h-8 text-xs font-bold rounded-lg"
                            >
                                Today
                            </Button>
                            <Button
                                size="sm"
                                variant={presetFilter === 'yesterday' ? 'default' : 'ghost'}
                                onClick={() => applyPreset('yesterday')}
                                className="h-8 text-xs font-bold rounded-lg"
                            >
                                Yesterday
                            </Button>
                            <Button
                                size="sm"
                                variant={presetFilter === '7days' ? 'default' : 'ghost'}
                                onClick={() => applyPreset('7days')}
                                className="h-8 text-xs font-bold rounded-lg"
                            >
                                Last 7 Days
                            </Button>
                            <Button
                                size="sm"
                                variant={presetFilter === 'month' ? 'default' : 'ghost'}
                                onClick={() => applyPreset('month')}
                                className="h-8 text-xs font-bold rounded-lg"
                            >
                                This Month
                            </Button>
                        </div>

                        {/* Search Filter */}
                        <div className="relative flex-1 max-w-xs min-w-[200px]">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search task, employee, or note..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="pl-9 h-9 text-xs rounded-xl border-muted-foreground/20"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                        {/* Employee Filter */}
                        {isAdmin && (
                            <div className="space-y-1">
                                <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Employee</Label>
                                <Select value={selectedUser} onValueChange={setSelectedUser}>
                                    <SelectTrigger className="h-9 rounded-xl text-xs">
                                        <SelectValue placeholder="All Employees" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Employees</SelectItem>
                                        {availableUsers.map(u => {
                                            const idVal = u._id || (u as any).id || ''
                                            if (!idVal) return null
                                            return <SelectItem key={idVal} value={String(idVal)}>{u.name} ({u.role})</SelectItem>
                                        })}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        {/* Project Filter */}
                        <div className="space-y-1">
                            <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Project</Label>
                            <Select value={selectedProject} onValueChange={setSelectedProject}>
                                <SelectTrigger className="h-9 rounded-xl text-xs">
                                    <SelectValue placeholder="All Projects" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Projects</SelectItem>
                                    {availableProjects.map(p => {
                                        const pIdVal = p._id || (p as any).id || ''
                                        if (!pIdVal) return null
                                        return <SelectItem key={pIdVal} value={String(pIdVal)}>{p.name}</SelectItem>
                                    })}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Start Date */}
                        <div className="space-y-1">
                            <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">From Date</Label>
                            <Input
                                type="date"
                                value={startDate}
                                onChange={e => { setStartDate(e.target.value); setPresetFilter('custom'); }}
                                className="h-9 text-xs rounded-xl"
                            />
                        </div>

                        {/* End Date */}
                        <div className="space-y-1">
                            <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">To Date</Label>
                            <Input
                                type="date"
                                value={endDate}
                                onChange={e => { setEndDate(e.target.value); setPresetFilter('custom'); }}
                                className="h-9 text-xs rounded-xl"
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Top Metric Cards */}
            {loading ? (
                <div className="flex justify-center p-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : reportData && (
                <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <Card className="border-l-4 border-l-blue-500 shadow-sm">
                            <CardContent className="p-4 flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Total Time Logged</p>
                                    <h3 className="text-2xl font-black text-foreground mt-1">
                                        {formatMinutesToHHMM(reportData.summary.totalLoggedMinutes)}
                                    </h3>
                                    <p className="text-[10px] text-muted-foreground mt-0.5">
                                        {reportData.summary.totalEntriesCount} total time sessions
                                    </p>
                                </div>
                                <div className="p-3 bg-blue-500/10 text-blue-600 rounded-2xl">
                                    <Clock className="h-6 w-6" />
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border-l-4 border-l-purple-500 shadow-sm">
                            <CardContent className="p-4 flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Yesterday's Total</p>
                                    <h3 className="text-2xl font-black text-foreground mt-1">
                                        {formatMinutesToHHMM(reportData.summary.yesterdayLoggedMinutes)}
                                    </h3>
                                    <p className="text-[10px] text-muted-foreground mt-0.5">
                                        Completed yesterday
                                    </p>
                                </div>
                                <div className="p-3 bg-purple-500/10 text-purple-600 rounded-2xl">
                                    <History className="h-6 w-6" />
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border-l-4 border-l-emerald-500 shadow-sm">
                            <CardContent className="p-4 flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Today's Live Total</p>
                                    <h3 className="text-2xl font-black text-emerald-600 mt-1">
                                        {formatMinutesToHHMM(reportData.summary.todayLoggedMinutes)}
                                    </h3>
                                    <p className="text-[10px] text-emerald-600 font-medium mt-0.5 flex items-center gap-1">
                                        <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                        Live today work
                                    </p>
                                </div>
                                <div className="p-3 bg-emerald-500/10 text-emerald-600 rounded-2xl">
                                    <TrendingUp className="h-6 w-6" />
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border-l-4 border-l-amber-500 shadow-sm">
                            <CardContent className="p-4 flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Active Employees</p>
                                    <h3 className="text-2xl font-black text-foreground mt-1">
                                        {reportData.summary.uniqueEmployeesCount} Members
                                    </h3>
                                    <p className="text-[10px] text-muted-foreground mt-0.5">
                                        Logged work during period
                                    </p>
                                </div>
                                <div className="p-3 bg-amber-500/10 text-amber-600 rounded-2xl">
                                    <UserCheck className="h-6 w-6" />
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Main Analytics Tabs */}
                    <Tabs defaultValue="detailed-logs" className="space-y-6">
                        <TabsList className="p-1 bg-muted/60 rounded-2xl border w-full justify-start overflow-x-auto">
                            <TabsTrigger value="detailed-logs" className="rounded-xl text-xs font-bold px-4 py-2 flex items-center gap-2">
                                <Clock className="h-4 w-4" />
                                1-Min Granular Work Logs ({filteredDetailedEntries.length})
                            </TabsTrigger>
                            <TabsTrigger value="yesterday-vs-today" className="rounded-xl text-xs font-bold px-4 py-2 flex items-center gap-2">
                                <History className="h-4 w-4 text-purple-600" />
                                Yesterday vs Today Work Comparison
                            </TabsTrigger>
                            <TabsTrigger value="speed-leaderboard" className="rounded-xl text-xs font-bold px-4 py-2 flex items-center gap-2">
                                <Zap className="h-4 w-4 text-amber-500" />
                                Employee Speed & Efficiency Score ({reportData.employeeLeaderboard.length})
                            </TabsTrigger>
                        </TabsList>

                        {/* TAB 1: Detailed Minute-by-Minute Work Log Table */}
                        <TabsContent value="detailed-logs">
                            <Card className="border-muted/60 shadow-sm">
                                <CardHeader className="pb-3 border-b">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <CardTitle className="text-lg font-black flex items-center gap-2">
                                                <Clock className="h-5 w-5 text-primary" />
                                                Detailed Minute-by-Minute Work Log
                                            </CardTitle>
                                            <CardDescription className="text-xs mt-0.5">
                                                Exact start time, end time, and precise duration logged by each employee.
                                            </CardDescription>
                                        </div>
                                        <Badge variant="outline" className="text-xs font-mono font-bold">
                                            {filteredDetailedEntries.length} Sessions Logged
                                        </Badge>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-0 overflow-x-auto">
                                    <table className="w-full text-left text-xs">
                                        <thead className="bg-muted/40 uppercase text-[10px] font-black text-muted-foreground border-b tracking-wider">
                                            <tr>
                                                <th className="py-3 px-4">Employee</th>
                                                <th className="py-3 px-4">Task & Project</th>
                                                <th className="py-3 px-4">Start Time</th>
                                                <th className="py-3 px-4">End Time</th>
                                                <th className="py-3 px-4">Duration</th>
                                                <th className="py-3 px-4">Speed / Status</th>
                                                <th className="py-3 px-4">Work Note</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border/40">
                                            {filteredDetailedEntries.length === 0 ? (
                                                <tr>
                                                    <td colSpan={7} className="py-8 text-center text-muted-foreground">
                                                        No time entries match the selected filters.
                                                    </td>
                                                </tr>
                                            ) : (
                                                filteredDetailedEntries.map(entry => {
                                                    const empName = entry.userId?.name || 'Unknown'
                                                    const empEmail = entry.userId?.email || ''
                                                    const projName = entry.projectId?.name || 'General'
                                                    const taskTitle = entry.taskId?.title || 'Direct Work Log'
                                                    const startDateStr = new Date(entry.startTime).toLocaleDateString()
                                                    const startTimeStr = formatTimestamp(entry.startTime)
                                                    const isRunning = entry.isRunning
                                                    const endTimeStr = isRunning ? 'RUNNING 🟢' : formatTimestamp(entry.endTime)
                                                    const durationMins = isRunning
                                                        ? Math.floor((Date.now() - new Date(entry.startTime).getTime()) / 1000 / 60)
                                                        : (entry.duration || 0)

                                                    return (
                                                        <tr key={entry._id} className={`hover:bg-muted/30 transition-colors ${isRunning ? 'bg-emerald-500/5' : ''}`}>
                                                            <td className="py-3 px-4">
                                                                <div className="flex items-center gap-2.5">
                                                                    <Avatar className="h-8 w-8 bg-primary/10 text-primary font-bold text-xs">
                                                                        <AvatarFallback>{getInitials(empName)}</AvatarFallback>
                                                                    </Avatar>
                                                                    <div>
                                                                        <p className="font-bold text-foreground text-xs">{empName}</p>
                                                                        <p className="text-[10px] text-muted-foreground">{empEmail}</p>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="py-3 px-4">
                                                                <div className="space-y-0.5 max-w-xs">
                                                                    <p className="font-bold text-foreground truncate">{taskTitle}</p>
                                                                    <p className="text-[10px] text-primary flex items-center gap-1 font-semibold">
                                                                        <Briefcase className="h-3 w-3" />
                                                                        {projName}
                                                                    </p>
                                                                </div>
                                                            </td>
                                                            <td className="py-3 px-4 font-mono">
                                                                <div>
                                                                    <p className="font-bold text-foreground">{startTimeStr}</p>
                                                                    <p className="text-[10px] text-muted-foreground">{startDateStr}</p>
                                                                </div>
                                                            </td>
                                                            <td className="py-3 px-4 font-mono">
                                                                {isRunning ? (
                                                                    <span className="inline-flex items-center gap-1 text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full text-[10px]">
                                                                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                                                                        ACTIVE TIMER
                                                                    </span>
                                                                ) : (
                                                                    <p className="font-bold text-foreground">{endTimeStr}</p>
                                                                )}
                                                            </td>
                                                            <td className="py-3 px-4 font-mono font-bold">
                                                                <Badge variant="outline" className="bg-muted/40 text-foreground font-mono">
                                                                    {formatMinutesToHHMM(durationMins)} ({durationMins}m)
                                                                </Badge>
                                                            </td>
                                                            <td className="py-3 px-4">
                                                                {isRunning ? (
                                                                    <Badge className="bg-emerald-500 text-white font-bold text-[10px]">In Progress</Badge>
                                                                ) : durationMins <= 30 ? (
                                                                    <Badge variant="outline" className="border-emerald-500/30 text-emerald-600 bg-emerald-50 text-[10px] font-bold">
                                                                        ⚡ Fast Session
                                                                    </Badge>
                                                                ) : durationMins <= 120 ? (
                                                                    <Badge variant="outline" className="border-blue-500/30 text-blue-600 bg-blue-50 text-[10px] font-bold">
                                                                        ⏱️ Standard
                                                                    </Badge>
                                                                ) : (
                                                                    <Badge variant="outline" className="border-purple-500/30 text-purple-600 bg-purple-50 text-[10px] font-bold">
                                                                        🏋️ Deep Session
                                                                    </Badge>
                                                                )}
                                                            </td>
                                                            <td className="py-3 px-4 text-muted-foreground max-w-xs truncate">
                                                                {entry.note || <span className="italic text-muted-foreground/50">No notes provided</span>}
                                                            </td>
                                                        </tr>
                                                    )
                                                })
                                            )}
                                        </tbody>
                                    </table>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* TAB 2: Yesterday vs Today Work Comparison */}
                        <TabsContent value="yesterday-vs-today">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Yesterday's Work Column */}
                                <Card className="border-purple-500/30 bg-purple-500/5 shadow-sm">
                                    <CardHeader className="pb-3 border-b border-purple-500/20">
                                        <CardTitle className="text-base font-bold text-purple-700 dark:text-purple-400 flex items-center justify-between">
                                            <span className="flex items-center gap-2">
                                                <History className="h-5 w-5" />
                                                Yesterday's Completed Work Log
                                            </span>
                                            <Badge variant="outline" className="border-purple-500/30 text-purple-700 bg-purple-100 dark:bg-purple-950 font-mono font-bold">
                                                {formatMinutesToHHMM(reportData.summary.yesterdayLoggedMinutes)}
                                            </Badge>
                                        </CardTitle>
                                        <CardDescription className="text-xs">
                                            Summary of all time entries and tasks logged yesterday.
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="p-4 space-y-3">
                                        {reportData.yesterdayEntries.length === 0 ? (
                                            <div className="py-8 text-center text-xs text-muted-foreground">
                                                No work entries logged yesterday.
                                            </div>
                                        ) : (
                                            reportData.yesterdayEntries.map(entry => (
                                                <div key={entry.id} className="p-3 bg-card border rounded-xl space-y-1 shadow-2xs">
                                                    <div className="flex items-center justify-between text-xs">
                                                        <span className="font-bold text-foreground">{entry.userName}</span>
                                                        <span className="font-mono text-[11px] text-purple-600 font-bold">
                                                            {formatMinutesToHHMM(entry.durationMinutes)}
                                                        </span>
                                                    </div>
                                                    <p className="text-xs font-semibold text-primary">{entry.taskTitle}</p>
                                                    <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                                                        <span>Project: {entry.projectName}</span>
                                                        <span>{formatTimestamp(entry.startTime)} - {formatTimestamp(entry.endTime)}</span>
                                                    </div>
                                                    {entry.note && (
                                                        <p className="text-[11px] text-muted-foreground/80 italic border-t pt-1 mt-1">
                                                            "{entry.note}"
                                                        </p>
                                                    )}
                                                </div>
                                            ))
                                        )}
                                    </CardContent>
                                </Card>

                                {/* Today's Work Column */}
                                <Card className="border-emerald-500/30 bg-emerald-500/5 shadow-sm">
                                    <CardHeader className="pb-3 border-b border-emerald-500/20">
                                        <CardTitle className="text-base font-bold text-emerald-700 dark:text-emerald-400 flex items-center justify-between">
                                            <span className="flex items-center gap-2">
                                                <Play className="h-5 w-5" />
                                                Today's Real-Time Work Output
                                            </span>
                                            <Badge variant="outline" className="border-emerald-500/30 text-emerald-700 bg-emerald-100 dark:bg-emerald-950 font-mono font-bold">
                                                {formatMinutesToHHMM(reportData.summary.todayLoggedMinutes)}
                                            </Badge>
                                        </CardTitle>
                                        <CardDescription className="text-xs">
                                            Live real-time tasks logged and currently running today.
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="p-4 space-y-3">
                                        {reportData.todayEntries.length === 0 ? (
                                            <div className="py-8 text-center text-xs text-muted-foreground">
                                                No time entries logged yet today.
                                            </div>
                                        ) : (
                                            reportData.todayEntries.map(entry => (
                                                <div key={entry.id} className={`p-3 bg-card border rounded-xl space-y-1 shadow-2xs ${entry.isRunning ? 'ring-2 ring-emerald-500/40 bg-emerald-500/5' : ''}`}>
                                                    <div className="flex items-center justify-between text-xs">
                                                        <span className="font-bold text-foreground">{entry.userName}</span>
                                                        <span className="font-mono text-[11px] text-emerald-600 font-bold">
                                                            {entry.isRunning ? 'ACTIVE 🟢 ' : ''}{formatMinutesToHHMM(entry.durationMinutes)}
                                                        </span>
                                                    </div>
                                                    <p className="text-xs font-semibold text-primary">{entry.taskTitle}</p>
                                                    <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                                                        <span>Project: {entry.projectName}</span>
                                                        <span>Started: {formatTimestamp(entry.startTime)}</span>
                                                    </div>
                                                    {entry.note && (
                                                        <p className="text-[11px] text-muted-foreground/80 italic border-t pt-1 mt-1">
                                                            "{entry.note}"
                                                        </p>
                                                    )}
                                                </div>
                                            ))
                                        )}
                                    </CardContent>
                                </Card>
                            </div>
                        </TabsContent>

                        {/* TAB 3: Employee Speed & Efficiency Score Leaderboard */}
                        <TabsContent value="speed-leaderboard">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {reportData.employeeLeaderboard.map(emp => (
                                    <Card key={emp.userId} className="border-muted/60 shadow-sm hover:shadow-md transition-all">
                                        <CardHeader className="pb-2">
                                            <div className="flex items-start justify-between">
                                                <div className="flex items-center gap-3">
                                                    <Avatar className="h-10 w-10 bg-primary/10 text-primary font-bold">
                                                        <AvatarFallback>{getInitials(emp.userName)}</AvatarFallback>
                                                    </Avatar>
                                                    <div>
                                                        <CardTitle className="text-base font-bold">{emp.userName}</CardTitle>
                                                        <p className="text-xs text-muted-foreground">{emp.userEmail}</p>
                                                    </div>
                                                </div>
                                                <Badge className={`text-xs font-bold ${
                                                    emp.speedBadgeColor === 'emerald' ? 'bg-emerald-500 text-white' :
                                                    emp.speedBadgeColor === 'indigo' ? 'bg-indigo-600 text-white' :
                                                    'bg-amber-500 text-white'
                                                }`}>
                                                    {emp.speedRating}
                                                </Badge>
                                            </div>
                                        </CardHeader>
                                        <CardContent className="space-y-3 pt-2 text-xs">
                                            <div className="grid grid-cols-2 gap-2 bg-muted/30 p-2.5 rounded-xl text-center">
                                                <div>
                                                    <p className="text-[10px] font-bold text-muted-foreground uppercase">Total Work</p>
                                                    <p className="text-lg font-black text-foreground">{emp.totalHours}h</p>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-bold text-muted-foreground uppercase">Tasks Worked</p>
                                                    <p className="text-lg font-black text-primary">{emp.uniqueTasksCount}</p>
                                                </div>
                                            </div>

                                            <div className="space-y-1.5 pt-1">
                                                <div className="flex justify-between text-muted-foreground">
                                                    <span>Yesterday Work:</span>
                                                    <span className="font-bold text-foreground">{emp.yesterdayHours}h</span>
                                                </div>
                                                <div className="flex justify-between text-muted-foreground">
                                                    <span>Today Live Work:</span>
                                                    <span className="font-bold text-emerald-600">{emp.todayHours}h</span>
                                                </div>
                                                <div className="flex justify-between text-muted-foreground">
                                                    <span>Total Time Sessions:</span>
                                                    <span className="font-bold text-foreground">{emp.totalEntriesCount}</span>
                                                </div>
                                                <div className="flex justify-between text-muted-foreground">
                                                    <span>Work Speed Pace:</span>
                                                    <span className="font-bold text-foreground">{emp.tasksPerHour} tasks/hr</span>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </TabsContent>
                    </Tabs>
                </>
            )}
        </div>
    )
}

export default TimeReportsPage
