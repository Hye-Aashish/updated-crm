import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    Dialog,
    DialogContent,
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
import { Wallet, Calendar, TrendingUp, Clock, Edit2 } from 'lucide-react'
import { useAppStore } from '@/store'
import api from '@/lib/api-client'
import { formatCurrency } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'

interface PayrollRecord {
    userId: string
    name: string
    role: string
    designation: string
    baseSalary: number
    stats: {
        present: number
        halfDay: number
        absent: number
        paidDays: number
    }
    calculatedSalary: number
    month: number
    year: number
    daysInMonth?: number
    workingDays?: number
}

export function SalaryPage() {
    const { currentUser } = useAppStore()
    const { toast } = useToast()
    const [payroll, setPayroll] = useState<PayrollRecord[]>([])
    const [myPayroll, setMyPayroll] = useState<PayrollRecord | null>(null)
    const [loading, setLoading] = useState(true)
    const [workingDays, setWorkingDays] = useState('26')

    // Manual Management State
    const [isManageDialogOpen, setIsManageDialogOpen] = useState(false)
    const [selectedUser, setSelectedUser] = useState<{ id: string, name: string } | null>(null)
    const [manualDate, setManualDate] = useState(new Date().toISOString().split('T')[0])
    const [manualStatus, setManualStatus] = useState('present')

    const isAdmin = currentUser.role === 'owner' || currentUser.role === 'admin'
    const currentMonth = new Date().toLocaleString('default', { month: 'long' })
    const currentYear = new Date().getFullYear()

    const fetchPayroll = async () => {
        try {
            if (isAdmin) {
                const res = await api.get(`/payroll/all?workingDays=${workingDays}`)
                setPayroll(res.data)
            } else {
                const res = await api.get(`/payroll/my/${currentUser.id || (currentUser as any)._id}`)
                setMyPayroll(res.data)
            }
        } catch (error) {
            console.error("Failed to fetch payroll", error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchPayroll()
    }, [isAdmin, currentUser, workingDays])

    const handleUpdateAttendance = async () => {
        if (!selectedUser) return
        try {
            await api.post('/attendance/manual', {
                userId: selectedUser.id,
                date: manualDate,
                status: manualStatus
            })
            toast({ title: "Success", description: "Attendance updated manually" })
            setIsManageDialogOpen(false)
            fetchPayroll()
        } catch (error) {
            toast({ title: "Error", description: "Failed to update attendance", variant: "destructive" })
        }
    }

    if (loading) return <div className="p-8 text-center">Loading payroll data...</div>

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Real-time Payroll</h1>
                    <p className="text-muted-foreground">
                        {isAdmin ? 'Salary overview for all employees' : 'My real-time salary details'}
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    {isAdmin && (
                        <div className="flex items-center gap-2 bg-muted/50 p-1 rounded-lg border">
                            <Label htmlFor="wd" className="pl-2 border-r pr-2 h-8 flex items-center text-xs font-semibold">MTD Days</Label>
                            <Input
                                id="wd"
                                type="number"
                                className="w-16 h-8 border-none bg-transparent focus-visible:ring-0"
                                value={workingDays}
                                onChange={(e) => setWorkingDays(e.target.value)}
                            />
                        </div>
                    )}
                    <Badge variant="outline" className="text-sm py-1.5 px-3 bg-muted/50 shadow-sm border-primary/20">
                        <Calendar className="mr-2 h-4 w-4 text-primary" />
                        {currentMonth} {currentYear}
                    </Badge>
                </div>
            </div>

            {isAdmin ? (
                <div className="grid grid-cols-1 gap-4">
                    {payroll.map((record) => (
                        <Card key={record.userId} className="overflow-hidden border-none shadow-sm bg-muted/20 hover:bg-muted/30 transition-colors">
                            <CardHeader className="pb-4">
                                <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-3">
                                        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary text-lg">
                                            {record.name.charAt(0)}
                                        </div>
                                        <div>
                                            <CardTitle className="text-lg leading-none">{record.name}</CardTitle>
                                            <p className="text-xs text-muted-foreground uppercase mt-1.5 font-medium tracking-wider">{record.designation} • {record.role}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-8 text-xs gap-1.5"
                                            onClick={() => {
                                                setSelectedUser({ id: record.userId, name: record.name })
                                                setIsManageDialogOpen(true)
                                            }}
                                        >
                                            <Edit2 className="h-3.5 w-3.5" />
                                            Manage
                                        </Button>
                                        <div className="text-right">
                                            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">Expected Payout</p>
                                            <p className="text-2xl font-black text-emerald-500 leading-none">{formatCurrency(record.calculatedSalary)}</p>
                                        </div>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="pt-2">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/10 rounded-xl border border-border/50">
                                    <div className="space-y-1">
                                        <p className="text-[10px] text-muted-foreground uppercase font-bold">Base Salary</p>
                                        <p className="font-bold text-sm text-foreground">{formatCurrency(record.baseSalary)}</p>
                                    </div>
                                    <div className="space-y-1 text-center border-x border-border/50 px-4">
                                        <p className="text-[10px] text-muted-foreground uppercase font-bold">Attendance</p>
                                        <div className="flex items-center justify-center gap-2 mt-1">
                                            <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 border-emerald-500/20 text-[10px]">
                                                {record.stats.present}F
                                            </Badge>
                                            <Badge variant="secondary" className="bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 border-amber-500/20 text-[10px]">
                                                {record.stats.halfDay}H
                                            </Badge>
                                        </div>
                                    </div>
                                    <div className="space-y-1 text-center border-r border-border/50 px-4">
                                        <p className="text-[10px] text-muted-foreground uppercase font-bold">Paid Days</p>
                                        <p className="font-black text-primary text-sm">{record.stats.paidDays} / {record.workingDays}</p>
                                    </div>
                                    <div className="space-y-1 text-right">
                                        <p className="text-[10px] text-muted-foreground uppercase font-bold">Remaining</p>
                                        <p className="font-bold text-sm text-foreground">{(Number(record.workingDays) || 26) - record.stats.paidDays} Days</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : myPayroll && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <Card className="border-none shadow-sm bg-emerald-500 text-white overflow-hidden relative">
                            <div className="absolute -right-4 -bottom-4 opacity-10">
                                <TrendingUp className="h-32 w-32" />
                            </div>
                            <CardContent className="pt-6">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="text-emerald-100 text-xs font-bold uppercase tracking-widest">Expected Payout</p>
                                        <h3 className="text-3xl font-black mt-1">{formatCurrency(myPayroll.calculatedSalary)}</h3>
                                        <p className="text-xs text-emerald-100/80 mt-2 font-medium">Calculated based on {myPayroll.stats.paidDays} days</p>
                                    </div>
                                    <div className="p-3 bg-white/20 rounded-xl backdrop-blur-md">
                                        <TrendingUp className="h-6 w-6 text-white" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border-none shadow-sm bg-blue-600 text-white overflow-hidden relative">
                            <div className="absolute -right-4 -bottom-4 opacity-10">
                                <Wallet className="h-32 w-32" />
                            </div>
                            <CardContent className="pt-6">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="text-blue-100 text-xs font-bold uppercase tracking-widest">Base Salary</p>
                                        <h3 className="text-3xl font-black mt-1">{formatCurrency(myPayroll.baseSalary)}</h3>
                                        <p className="text-xs text-blue-100/80 mt-2 font-medium">Monthly Gross</p>
                                    </div>
                                    <div className="p-3 bg-white/20 rounded-xl backdrop-blur-md">
                                        <Wallet className="h-6 w-6 text-white" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border-none shadow-sm bg-purple-600 text-white overflow-hidden relative">
                            <div className="absolute -right-4 -bottom-4 opacity-10">
                                <Clock className="h-32 w-32" />
                            </div>
                            <CardContent className="pt-6">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="text-purple-100 text-xs font-bold uppercase tracking-widest">Attendance Status</p>
                                        <h3 className="text-3xl font-black mt-1">{myPayroll.stats.paidDays} / {myPayroll.workingDays || 26}</h3>
                                        <p className="text-xs text-purple-100/80 mt-2 font-medium">Paid Days so far</p>
                                    </div>
                                    <div className="p-3 bg-white/20 rounded-xl backdrop-blur-md">
                                        <Clock className="h-6 w-6 text-white" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <Card className="border-none shadow-sm">
                        <CardHeader>
                            <CardTitle>Attendance Details</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="text-center p-6 bg-emerald-500/5 rounded-2xl border border-emerald-500/20">
                                    <p className="text-xs text-emerald-500 font-bold uppercase mb-2">Present</p>
                                    <p className="text-3xl font-black text-emerald-500">{myPayroll.stats.present}</p>
                                </div>
                                <div className="text-center p-6 bg-amber-500/5 rounded-2xl border border-amber-500/20">
                                    <p className="text-xs text-amber-500 font-bold uppercase mb-2">Half Days</p>
                                    <p className="text-3xl font-black text-amber-500">{myPayroll.stats.halfDay}</p>
                                </div>
                                <div className="text-center p-6 bg-red-500/5 rounded-2xl border border-red-500/20">
                                    <p className="text-xs text-red-500 font-bold uppercase mb-2">Absents</p>
                                    <p className="text-3xl font-black text-red-500">{myPayroll.stats.absent}</p>
                                </div>
                                <div className="text-center p-6 bg-primary/5 rounded-2xl border border-primary/20">
                                    <p className="text-xs text-primary font-bold uppercase mb-2">Total Paid</p>
                                    <p className="text-3xl font-black text-primary">{myPayroll.stats.paidDays}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Attendance Management Dialog */}
            <Dialog open={isManageDialogOpen} onOpenChange={setIsManageDialogOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Manage Attendance: {selectedUser?.name}</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="date">Select Date</Label>
                            <Input
                                id="date"
                                type="date"
                                value={manualDate}
                                onChange={(e) => setManualDate(e.target.value)}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="status">Status</Label>
                            <Select value={manualStatus} onValueChange={setManualStatus}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="present">Full Day Present</SelectItem>
                                    <SelectItem value="half-day">Half Day</SelectItem>
                                    <SelectItem value="absent">Leave/Absent</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <div className="flex justify-end pt-4">
                        <Button onClick={handleUpdateAttendance}>Update Attendance</Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}

function Button({ children, variant = "default", size = "default", className = "", onClick }: any) {
    const base = "inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
    const variants = {
        default: "bg-primary text-primary-foreground shadow hover:bg-primary/90",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        outline: "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground"
    }
    const sizes = {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-8"
    }
    return (
        <button
            className={`${base} ${(variants as any)[variant]} ${(sizes as any)[size]} ${className}`}
            onClick={onClick}
        >
            {children}
        </button>
    )
}
