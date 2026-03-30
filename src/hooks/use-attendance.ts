import { useState, useEffect } from 'react'
import api from '@/lib/api-client'
import { useToast } from '@/hooks/use-toast'
import { showSystemNotification } from '@/lib/notifications'

export function useAttendance(userId: string | undefined) {
    const { toast } = useToast()
    const [currentTime, setCurrentTime] = useState(new Date())
    const [attendanceStatus, setAttendanceStatus] = useState<'out' | 'in' | 'break' | 'checked-out' | 'half-day'>('out')
    const [elapsedTime, setElapsedTime] = useState(0) // Now tracks actual work seconds

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
                        if (data.status === 'present') {
                            // Calculate current session seconds if present
                            // Note: Backend might not return accurate live seconds without this
                            const diff = Math.floor((new Date().getTime() - new Date(data.checkIn).getTime()) / 1000)
                            // Better: calculate since checkIn minus totalBreakTime stored in DB
                            const workSecondsSinceCheckIn = Math.max(0, diff - (data.totalBreakTime || 0) * 60)
                            setElapsedTime(workSecondsSinceCheckIn)
                        } else if (data.status === 'on-break') {
                            setElapsedTime((data.totalWorkTime || 0) * 60)
                        }
                    }
                }
            })
            .catch(err => console.error("Attendance fetch error", err))
    }, [userId])

    useEffect(() => {
        let interval: any
        if (attendanceStatus === 'in') {
            interval = setInterval(() => {
                setElapsedTime(prev => prev + 1) // Simply increment work seconds while status is 'in'
            }, 1000)
        }
        return () => clearInterval(interval)
    }, [attendanceStatus])

    const handleClockIn = async () => {
        try {
            await api.post('/attendance/check-in', { userId })
            setAttendanceStatus('in')
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
                showSystemNotification("Break Started", "Your work session is paused. Take a rest!")
            } else {
                await api.post('/attendance/break-end', { userId })
                setAttendanceStatus('in')
                toast({ description: "Break ended" })
                showSystemNotification("Work Resumed", "Your clock has started automatically. Welcome back!")
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
