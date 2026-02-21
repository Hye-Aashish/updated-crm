import { useState, useEffect } from 'react'
import api from '@/lib/api-client'
import { useToast } from '@/hooks/use-toast'

export function useAttendance(userId: string | undefined) {
    const { toast } = useToast()
    const [currentTime, setCurrentTime] = useState(new Date())
    const [attendanceStatus, setAttendanceStatus] = useState<'out' | 'in' | 'break' | 'checked-out' | 'half-day'>('out')
    const [clockInTime, setClockInTime] = useState<Date | null>(null)
    const [elapsedTime, setElapsedTime] = useState(0)

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000)
        return () => clearInterval(timer)
    }, [])

    useEffect(() => {
        if (!userId) return
        api.get(`/attendance/today/${userId}`)
            .then(res => {
                const data = res.data
                if (data.status) {
                    if (data.status === 'present') setAttendanceStatus('in')
                    else if (data.status === 'on-break') setAttendanceStatus('break')
                    else if (data.status === 'checked-out' || data.status === 'half-day') setAttendanceStatus('checked-out')
                    else setAttendanceStatus('out')

                    if (data.checkIn) {
                        setClockInTime(new Date(data.checkIn))
                        if (data.status === 'present' || data.status === 'on-break') {
                            const diff = Math.floor((new Date().getTime() - new Date(data.checkIn).getTime()) / 1000)
                            setElapsedTime(diff)
                        }
                    }
                }
            })
            .catch(err => console.error("Attendance fetch error", err))
    }, [userId])

    useEffect(() => {
        let interval: any
        if (attendanceStatus === 'in' && clockInTime) {
            interval = setInterval(() => {
                const now = new Date()
                const seconds = Math.floor((now.getTime() - clockInTime.getTime()) / 1000)
                setElapsedTime(seconds)
            }, 1000)
        }
        return () => clearInterval(interval)
    }, [attendanceStatus, clockInTime])

    const handleClockIn = async () => {
        try {
            await api.post('/attendance/check-in', { userId })
            setAttendanceStatus('in')
            setClockInTime(new Date())
            toast({ description: "Clocked in successfully" })
        } catch (error: any) {
            toast({ title: "Error", description: error.response?.data?.message || "Failed to clock in", variant: "destructive" })
        }
    }

    const handleBreakToggle = async () => {
        try {
            if (attendanceStatus === 'in') {
                await api.post('/attendance/break-start', { userId })
                setAttendanceStatus('break')
                toast({ description: "Break started" })
            } else {
                await api.post('/attendance/break-end', { userId })
                setAttendanceStatus('in')
                toast({ description: "Break ended" })
            }
        } catch (error: any) {
            toast({ title: "Error", description: error.response?.data?.message || "Action failed", variant: "destructive" })
        }
    }

    const handleClockOut = async () => {
        try {
            const res = await api.post('/attendance/check-out', { userId })
            setAttendanceStatus('checked-out')
            setElapsedTime(0)
            if (res.data.isHalfDay) {
                toast({ title: "Clocked Out", description: "Marked as Half-Day (< 4 hours)" })
            } else {
                toast({ description: "Clocked out successfully" })
            }
        } catch (error: any) {
            toast({ title: "Error", description: error.response?.data?.message || "Failed to clock out", variant: "destructive" })
        }
    }

    const formatElapsedTime = (seconds: number) => {
        const h = Math.floor(seconds / 3600).toString().padStart(2, '0')
        const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0')
        const s = (seconds % 60).toString().padStart(2, '0')
        return `${h}:${m}:${s}`
    }

    return {
        currentTime,
        attendanceStatus,
        elapsedTime,
        handleClockIn,
        handleBreakToggle,
        handleClockOut,
        formatElapsedTime
    }
}
