import { useState, useMemo, useEffect } from 'react'
import {
    Check, X, Plane, Calendar, Search,
    ChevronLeft, ChevronRight,
    Star, Info, Wallet
} from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { getInitials, formatCurrency } from '@/lib/utils'
import type { User } from '@/types'
import api from '@/lib/api-client'
import { useToast } from '@/hooks/use-toast'
import { useAppStore } from '@/store'

interface AttendanceSheetProps {
    users: User[]
    currentUserId?: string
    externalDate?: Date
    onDateChange?: (date: Date) => void
}

type AttendanceStatus = 'present' | 'absent' | 'late' | 'half-day' | 'leave' | 'holiday' | 'off' | 'checked-out'

export function AttendanceSheet({ users, externalDate, onDateChange }: AttendanceSheetProps) {
    const { toast } = useToast()
    const { currentUser } = useAppStore()
    const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'owner'
    const [internalDate, setInternalDate] = useState(new Date())

    const currentDate = externalDate || internalDate
    const setCurrentDate = (date: Date) => {
        if (onDateChange) {
            onDateChange(date)
        } else {
            setInternalDate(date)
        }
    }
    const [searchTerm, setSearchTerm] = useState('')
    const [attendanceData, setAttendanceData] = useState<any[]>([])
    const [payrollData, setPayrollData] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    // Global Settings for Payroll
    const [offDays, setOffDays] = useState<number[]>([0]) // Default Sunday
    const [holidays, setHolidays] = useState<{ date: string, label: string }[]>([])

    const fetchAllData = async () => {
        setLoading(true)
        try {
            const month = currentDate.getMonth()
            const year = currentDate.getFullYear()
            const userId = currentUser?.id || (currentUser as any)?._id

            const payrollEndpoint = isAdmin ? '/payroll/all' : `/payroll/my/${userId}`

            const [attRes, payRes, settingsRes] = await Promise.all([
                api.get(`/attendance/monthly?month=${month}&year=${year}`),
                api.get(`${payrollEndpoint}?month=${month}&year=${year}`),
                api.get('/settings')
            ])

            setAttendanceData(attRes.data)
            setPayrollData(Array.isArray(payRes.data) ? payRes.data : [payRes.data])

            if (settingsRes.data.payroll) {
                setOffDays(settingsRes.data.payroll.offDays || [0])
                setHolidays(settingsRes.data.payroll.holidays || [])
            }
        } catch (error) {
            console.error("Failed to fetch sheet data", error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (currentUser) {
            fetchAllData()
        }
    }, [currentDate, currentUser])

    const daysInMonth = useMemo(() => {
        const year = currentDate.getFullYear()
        const month = currentDate.getMonth()
        const days = new Date(year, month + 1, 0).getDate()
        return Array.from({ length: days }, (_, i) => {
            const date = new Date(year, month, i + 1)
            const dateStr = date.toISOString().split('T')[0]
            const isWeekend = offDays.includes(date.getDay())
            const isHoliday = holidays.some(h => h.date === dateStr)
            return {
                date: i + 1,
                dayName: date.toLocaleDateString('en-US', { weekday: 'short' }),
                fullDate: dateStr,
                isWeekend,
                isHoliday,
                holidayLabel: holidays.find(h => h.date === dateStr)?.label
            }
        })
    }, [currentDate, holidays, offDays])

    const saveSettings = async (newOffDays: number[], newHolidays: typeof holidays) => {
        try {
            await api.put('/settings', {
                payroll: {
                    offDays: newOffDays,
                    holidays: newHolidays
                }
            })
            toast({ title: "CALENDAR UPDATED", description: "Global schedule settings saved", variant: 'success' })
            fetchAllData()
        } catch (error: any) {
            toast({ title: "SETTINGS ERROR", description: error.response?.data?.message || "Failed to save settings", variant: "destructive" })
        }
    }

    const toggleOffDay = (dayIndex: number) => {
        const updated = offDays.includes(dayIndex)
            ? offDays.filter(d => d !== dayIndex)
            : [...offDays, dayIndex]
        setOffDays(updated)
        saveSettings(updated, holidays)
    }

    const toggleHoliday = (dateStr: string) => {
        if (!isAdmin) return
        const updated = holidays.find(h => h.date === dateStr)
            ? holidays.filter(h => h.date !== dateStr)
            : [...holidays, { date: dateStr, label: 'Public Holiday' }]
        setHolidays(updated)
        saveSettings(offDays, updated)
    }

    const setStatus = async (userId: string, dateStr: string, status: AttendanceStatus) => {
        try {
            await api.post('/attendance/manual', {
                userId,
                date: dateStr,
                status: status === 'leave' ? 'absent' : status
            })
            toast({ title: "ATTENDANCE UPDATED", description: "Status changed successfully", variant: 'success' })
            fetchAllData()
        } catch (error: any) {
            toast({ title: "UPDATE FAILED", description: error.response?.data?.message || "Could not update status", variant: "destructive" })
        }
    }

    const getStatusForDay = (userId: string, day: number): AttendanceStatus => {
        const record = attendanceData.find(a =>
            (a.userId === userId) &&
            (new Date(a.date).getDate() === day)
        )

        if (record) return record.status as AttendanceStatus

        const dayObj = daysInMonth.find(d => d.date === day)
        if (dayObj?.isHoliday) return 'holiday'
        if (dayObj?.isWeekend) return 'off'

        return 'absent'
    }

    const filteredUsers = users.filter(u =>
        u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (u.role && u.role.toLowerCase().includes(searchTerm.toLowerCase()))
    )

    const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
    const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))

    const renderIcon = (status: AttendanceStatus) => {
        switch (status) {
            case 'present': return <Check className="h-4 w-4 text-emerald-500" strokeWidth={3} />
            case 'checked-out': return <Check className="h-4 w-4 text-emerald-500" strokeWidth={3} />
            case 'absent': return <X className="h-4 w-4 text-slate-400" strokeWidth={3} />
            case 'late': return <Info className="h-4 w-4 text-amber-500 fill-amber-50" />
            case 'half-day': return <Star className="h-4 w-4 text-rose-500 fill-rose-500" />
            case 'leave': return <Plane className="h-4 w-4 text-rose-600" />
            case 'holiday': return <Star className="h-4 w-4 text-amber-400 fill-amber-400" />
            case 'off': return <Calendar className="h-4 w-4 text-rose-500" />
            default: return <X className="h-4 w-4 text-slate-200" />
        }
    }

    const LegendItem = ({ icon, label }: { icon: any, label: string }) => (
        <div className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground whitespace-nowrap">
            {icon}
            <span>&rarr;</span>
            <span className="text-foreground">{label}</span>
        </div>
    )

    if (loading && attendanceData.length === 0) return <div className="p-12 text-center text-muted-foreground">Syncing Data...</div>

    return (
        <Card className="shadow-none border-none bg-transparent">
            <CardHeader className="px-0 pb-6">
                <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-2 flex-wrap text-sm text-muted-foreground">
                        <span className="font-bold text-foreground">Note:</span>
                        <LegendItem icon={<Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />} label="Holiday" />
                        <span className="text-muted-foreground/30 px-1">|</span>
                        <LegendItem icon={<Calendar className="h-3.5 w-3.5 text-rose-500" />} label="Day Off" />
                        <span className="text-muted-foreground/30 px-1">|</span>
                        <LegendItem icon={<Check className="h-3.5 w-3.5 text-emerald-500" strokeWidth={3} />} label="Present" />
                        <span className="text-muted-foreground/30 px-1">|</span>
                        <LegendItem icon={<Star className="h-3.5 w-3.5 text-rose-500 fill-rose-500" />} label="Half Day" />
                        <span className="text-muted-foreground/30 px-1">|</span>
                        <LegendItem icon={<Info className="h-3.5 w-3.5 text-amber-500 fill-amber-50" />} label="Late" />
                        <span className="text-muted-foreground/30 px-1">|</span>
                        <LegendItem icon={<X className="h-3.5 w-3.5 text-slate-400" strokeWidth={3} />} label="Absent" />
                    </div>

                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div className="flex items-center gap-3">
                            <h2 className="text-lg font-bold">Sheet {loading && <span className="text-[10px] text-primary animate-pulse ml-2">Syncing...</span>}</h2>
                            <div className="flex items-center border rounded-lg bg-background shadow-sm overflow-hidden h-9">
                                <Button variant="ghost" size="icon" onClick={prevMonth} className="h-full rounded-none"><ChevronLeft className="h-4 w-4" /></Button>
                                <span className="px-3 font-bold text-xs min-w-[100px] text-center uppercase tracking-wider">
                                    {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                                </span>
                                <Button variant="ghost" size="icon" onClick={nextMonth} className="h-full rounded-none"><ChevronRight className="h-4 w-4" /></Button>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 w-full md:w-auto">
                            {isAdmin && (
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" size="sm" className="h-9 gap-2 shadow-sm font-bold border-primary/20 text-primary hover:bg-primary/5">
                                            <Calendar className="h-4 w-4" /> Manage Schedule
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-80 p-4 shadow-2xl">
                                        <div className="space-y-4">
                                            <div>
                                                <h3 className="font-bold text-sm mb-3">Weekly Off-Days</h3>
                                                <div className="grid grid-cols-4 gap-2">
                                                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, idx) => (
                                                        <Button
                                                            key={day}
                                                            variant={offDays.includes(idx) ? 'default' : 'outline'}
                                                            size="sm"
                                                            className="h-8 text-[10px] px-0"
                                                            onClick={() => toggleOffDay(idx)}
                                                        >
                                                            {day}
                                                        </Button>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="pt-4 border-t">
                                                <h3 className="font-bold text-sm mb-3">Public Holidays</h3>
                                                <div className="space-y-2 max-h-[150px] overflow-y-auto mb-3">
                                                    {holidays.length === 0 && <p className="text-[10px] text-muted-foreground italic">No holidays set.</p>}
                                                    {holidays.map((h, i) => (
                                                        <div key={i} className="flex items-center justify-between bg-muted/50 p-2 rounded text-[10px] group">
                                                            <div className="flex flex-col">
                                                                <span className="font-bold">{h.label}</span>
                                                                <span className="text-muted-foreground">{h.date}</span>
                                                            </div>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-6 w-6 text-rose-500 opacity-0 group-hover:opacity-100"
                                                                onClick={() => toggleHoliday(h.date)}
                                                            >
                                                                <X className="h-3 w-3" />
                                                            </Button>
                                                        </div>
                                                    ))}
                                                </div>

                                                <div className="flex flex-col gap-2 pt-3 border-t mt-3">
                                                    <h4 className="text-[11px] font-bold">Add Custom Holiday</h4>
                                                    <div className="flex gap-2">
                                                        <Input type="date" className="h-7 text-[10px]" id="new-h-date" />
                                                        <Input placeholder="Label" className="h-7 text-[10px]" id="new-h-label" />
                                                    </div>
                                                    <Button
                                                        size="sm"
                                                        className="h-7 text-[10px] font-bold"
                                                        onClick={() => {
                                                            const d = (document.getElementById('new-h-date') as HTMLInputElement).value
                                                            const l = (document.getElementById('new-h-label') as HTMLInputElement).value
                                                            if (d && l) {
                                                                const updated = [...holidays, { date: d, label: l }]
                                                                setHolidays(updated)
                                                                saveSettings(offDays, updated)
                                                                    ; (document.getElementById('new-h-date') as HTMLInputElement).value = ''
                                                                    ; (document.getElementById('new-h-label') as HTMLInputElement).value = ''
                                                            }
                                                        }}
                                                    >
                                                        Add
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    </PopoverContent>
                                </Popover>
                            )}
                            <div className="relative w-full md:w-auto">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search..."
                                    className="pl-9 w-full md:w-64 h-9"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="p-0 overflow-hidden border rounded-xl bg-card shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-[11px]">
                        <thead>
                            <tr className="bg-muted/30">
                                <th className="sticky left-0 z-20 bg-card border-b border-r py-4 px-4 min-w-[200px] text-left font-bold text-slate-500 uppercase tracking-wider">
                                    Employee
                                </th>
                                <th className="border-b border-r py-4 px-2 min-w-[100px] text-emerald-500 font-bold uppercase tracking-wider bg-emerald-500/5">
                                    Final Salary
                                </th>
                                {daysInMonth.map((d) => (
                                    <th
                                        key={d.date}
                                        onClick={() => toggleHoliday(d.fullDate)}
                                        title={isAdmin ? (d.isHoliday ? `Holiday: ${d.holidayLabel}` : 'Click to mark as Holiday') : d.holidayLabel}
                                        className={`
                                            border-b border-r py-2 min-w-[32px] w-[32px] transition-colors
                                            ${isAdmin ? 'cursor-pointer hover:bg-amber-500/10' : 'cursor-default'}
                                            ${d.isWeekend ? 'bg-muted/20' : ''}
                                            ${d.isHoliday ? 'bg-amber-500/20' : ''}
                                        `}
                                    >
                                        <div className="flex flex-col items-center justify-center">
                                            <span className={`font-bold ${d.isWeekend ? 'text-muted-foreground/50' : (d.isHoliday ? 'text-amber-500' : 'text-foreground')}`}>{d.date}</span>
                                            <span className="text-[8px] uppercase font-bold text-muted-foreground/50 leading-none mt-0.5">{d.dayName}</span>
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/50">
                            {filteredUsers.map((user) => {
                                const payroll = payrollData.find(p => p.userId === (user.id || (user as any)._id))

                                return (
                                    <tr key={user.id || (user as any)._id} className="group hover:bg-muted/30 transition-colors">
                                        <td className="sticky left-0 z-10 bg-card group-hover:bg-muted/30 border-r py-3 px-4 transition-colors">
                                            <div className="flex items-center gap-3">
                                                <Avatar className="h-8 w-8 border border-border/50">
                                                    <AvatarFallback className="text-[10px] bg-muted text-muted-foreground font-bold">{getInitials(user.name)}</AvatarFallback>
                                                </Avatar>
                                                <div className="overflow-hidden">
                                                    <p className="font-bold text-foreground truncate">{user.name}</p>
                                                    <p className="text-[9px] text-muted-foreground font-medium truncate uppercase">{user.role}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="border-r py-3 px-2 text-center bg-emerald-500/5">
                                            <div className="flex items-center justify-center gap-1 font-black text-emerald-500">
                                                <Wallet className="h-3 w-3" />
                                                {formatCurrency(payroll?.calculatedSalary || 0)}
                                            </div>
                                        </td>

                                        {daysInMonth.map((d) => {
                                            const status = getStatusForDay(user.id || (user as any)._id, d.date)

                                            return (
                                                <td
                                                    key={d.date}
                                                    className={`
                                                        border-r p-0 h-10 text-center relative
                                                        ${d.isWeekend ? 'bg-muted/10' : ''}
                                                    `}
                                                >
                                                    {isAdmin ? (
                                                        <Popover>
                                                            <PopoverTrigger asChild>
                                                                <div className="h-full w-full flex items-center justify-center cursor-pointer hover:bg-muted/50">
                                                                    {renderIcon(status)}
                                                                </div>
                                                            </PopoverTrigger>
                                                            <PopoverContent className="w-40 p-1 shadow-2xl">
                                                                <div className="grid gap-1">
                                                                    {(['present', 'half-day', 'absent'] as const).map((s) => (
                                                                        <Button
                                                                            key={s}
                                                                            variant="ghost"
                                                                            className="justify-start h-8 text-[10px] font-bold gap-2 px-2"
                                                                            onClick={() => setStatus(user.id || (user as any)._id, d.fullDate, s)}
                                                                        >
                                                                            {renderIcon(s)}
                                                                            <span className="capitalize">{s}</span>
                                                                        </Button>
                                                                    ))}
                                                                </div>
                                                            </PopoverContent>
                                                        </Popover>
                                                    ) : (
                                                        <div className="h-full w-full flex items-center justify-center">
                                                            {renderIcon(status)}
                                                        </div>
                                                    )}
                                                </td>
                                            )
                                        })}
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            </CardContent>
        </Card>
    )
}
