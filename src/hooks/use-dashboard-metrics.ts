import { useMemo } from 'react'
import { useAppStore } from '@/store'
import { Target, Briefcase, CheckSquare, Banknote } from 'lucide-react'

export function useDashboardMetrics(settings: any) {
    const { currentUser, projects, tasks, invoices, timeEntries, leads, expenses, tickets } = useAppStore()
    const userId = currentUser?.id || (currentUser as any)?._id

    // Early guard for unauthenticated state to prevent crashes
    if (!currentUser) {
        return {
            totalRevenue: 0, totalExpenses: 0, netProfit: 0, outstandingInvoices: 0,
            relevantProjects: [], relevantTasks: [], completedProjects: 0, inProgressProjects: 0,
            onHoldProjects: 0, planningProjects: 0, teamPerformance: [], winRate: 0,
            totalBillableHours: 0, revenueData: [], leadStatusData: [], healthMetrics: [],
            recentActivities: [], revenueTrend: '0%', expenseTrend: '0%', currentLayout: ['operational']
        }
    }

    const canViewAll = currentUser?.role === 'owner' || currentUser?.role === 'admin' || settings?.dashboardLayouts?.[currentUser.role]?.view_all === true
    const relevantProjects = useMemo(() => {
        if (canViewAll) return projects
        const projectsWithMyTasks = tasks.filter(t => t.assigneeId === userId).map(t => t.projectId)
        return projects.filter(p =>
            p.pmId === userId ||
            p.members?.includes(userId) ||
            projectsWithMyTasks.includes(p.id)
        )
    }, [canViewAll, projects, tasks, userId])
    const relevantTasks = useMemo(() => {
        if (canViewAll) return tasks
        const myProjectIds = relevantProjects.map(p => p.id)
        return tasks.filter(t => t.assigneeId === userId || myProjectIds.includes(t.projectId))
    }, [canViewAll, tasks, userId, relevantProjects])

    const totalRevenue = useMemo(() => invoices ? invoices.filter(i => i?.status === 'paid').reduce((sum, i) => sum + (i?.total || 0), 0) : 0, [invoices])
    const totalExpenses = useMemo(() => expenses ? expenses.reduce((sum, e) => sum + (e?.amount || 0), 0) : 0, [expenses])
    const netProfit = totalRevenue - totalExpenses
    const outstandingInvoices = useMemo(() => invoices ? invoices.filter(i => i?.status === 'pending' || i?.status === 'overdue').reduce((sum, i) => sum + (i?.total || 0), 0) : 0, [invoices])
    const totalBillableHours = useMemo(() => timeEntries ? Math.round(timeEntries.reduce((sum, t) => sum + (t?.duration || 0), 0) / 60) : 0, [timeEntries])
    const totalLeads = leads.length
    const wonLeads = useMemo(() => leads.filter(l => l.stage === 'won' || l.stage === 'closed').length, [leads])
    const winRate = totalLeads > 0 ? Math.round((wonLeads / totalLeads) * 100) : 0

    const revenueData = useMemo(() => {
        const last6Months = Array.from({ length: 6 }, (_, i) => {
            const d = new Date()
            d.setMonth(d.getMonth() - (5 - i))
            return {
                name: d.toLocaleString('default', { month: 'short' }),
                month: d.getMonth(),
                year: d.getFullYear(),
                revenue: 0,
                expense: 0
            }
        })

        invoices.filter(i => i.status === 'paid').forEach(inv => {
            const invDate = new Date(inv.date || inv.createdAt)
            const m = invDate.getMonth()
            const y = invDate.getFullYear()
            const entry = last6Months.find(d => d.month === m && d.year === y)
            if (entry) entry.revenue += inv.total
        })

        expenses.forEach(exp => {
            const expDate = new Date(exp.date || exp.createdAt)
            const m = expDate.getMonth()
            const y = expDate.getFullYear()
            const entry = last6Months.find(d => d.month === m && d.year === y)
            if (entry) entry.expense += exp.amount
        })

        return last6Months
    }, [invoices, expenses])

    const leadStatusData = useMemo(() => {
        const data = [
            { name: 'New', value: leads.filter(l => l.stage === 'new').length },
            { name: 'Contacted', value: leads.filter(l => l.stage === 'contacted').length },
            { name: 'Qualified', value: leads.filter(l => l.stage === 'qualified').length },
            { name: 'Won', value: leads.filter(l => l.stage === 'won' || l.stage === 'closed').length },
        ].filter(item => item.value > 0)
        return data.length > 0 ? data : [{ name: 'No Data', value: 1 }]
    }, [leads])

    const projectOnTimeRate = projects.length > 0
        ? Math.round((projects.filter(p => p.status === 'completed').length / projects.length) * 100)
        : 0
    const taskCompletionRate = tasks.length > 0
        ? Math.round((tasks.filter(t => t.status === 'done').length / tasks.length) * 100)
        : 0
    const collectionEfficiency = (totalRevenue + outstandingInvoices) > 0
        ? Math.round((totalRevenue / (totalRevenue + outstandingInvoices)) * 100)
        : 0

    const healthMetrics = [
        { label: 'Project Success Rate', value: projectOnTimeRate, color: 'bg-emerald-500' },
        { label: 'Task Throughput', value: taskCompletionRate, color: 'bg-blue-500' },
        { label: 'Lead Win Rate', value: winRate, color: 'bg-indigo-500' },
        { label: 'Collection Efficiency', value: collectionEfficiency, color: 'bg-amber-500' },
    ]

    const recentActivities = useMemo(() => {
        const activityList: any[] = []

        // Latest Lead
        const latestLead = [...leads].sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())[0]
        if (latestLead) {
            activityList.push({
                user: latestLead.name, action: `New Lead: ${latestLead.company}`,
                time: 'Recently', icon: Target, color: 'text-purple-500', bg: 'bg-purple-500/10',
                date: new Date(latestLead.createdAt || 0)
            })
        }

        // Latest Project
        const latestProject = [...projects].sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())[0]
        if (latestProject) {
            activityList.push({
                user: 'Project Team', action: `Project Started: ${latestProject.name}`,
                time: 'Recently', icon: Briefcase, color: 'text-indigo-500', bg: 'bg-indigo-500/10',
                date: new Date(latestProject.createdAt || 0)
            })
        }

        // Latest Task
        const latestTask = [...tasks].sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())[0]
        if (latestTask) {
            activityList.push({
                user: (latestTask as any).assignedTo?.name || 'User', action: `Assigned: ${latestTask.title}`,
                time: 'Recently', icon: CheckSquare, color: 'text-blue-500', bg: 'bg-blue-500/10',
                date: new Date(latestTask.createdAt || 0)
            })
        }

        // Latest Paid Invoice
        const latestPaid = [...invoices].filter(i => i.status === 'paid').sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime())[0]
        if (latestPaid) {
            activityList.push({
                user: 'Billing', action: `Invoice #${latestPaid.invoiceNumber} Paid`,
                time: 'Recently', icon: Banknote, color: 'text-emerald-500', bg: 'bg-emerald-500/10',
                date: new Date(latestPaid.updatedAt || 0)
            })
        }

        return activityList.sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 4)
    }, [leads, projects, tasks, invoices])

    // Trends
    const currentMonthData = revenueData[5]
    const prevMonthData = revenueData[4]
    const revenueTrend = prevMonthData.revenue > 0 ? `${(((currentMonthData.revenue - prevMonthData.revenue) / prevMonthData.revenue) * 100).toFixed(1)}%` : '+100%'
    const expenseTrend = prevMonthData.expense > 0 ? `${(((currentMonthData.expense - prevMonthData.expense) / prevMonthData.expense) * 100).toFixed(1)}%` : '+100%'


    const userRole = currentUser.role || 'employee'
    const layoutConfig = settings?.dashboardLayouts || {}
    let roleLayout = layoutConfig[userRole]

    // Normalizing layout format (handling both old array-based and new object-based configs)
    if (Array.isArray(roleLayout)) {
        roleLayout = {
            enabledSections: roleLayout,
            sectionOrder: roleLayout,
            customLabels: {},
            hiddenSubItems: []
        }
    } else if (!roleLayout) {
        roleLayout = {
            enabledSections: ['hero', 'session', 'financials', 'analytics', 'deadlines', 'tasks', 'projects_overview', 'support_tickets', 'funnel', 'health', 'activity'],
            customLabels: {},
            sectionOrder: ['hero', 'session', 'financials', 'analytics', 'deadlines', 'tasks', 'projects_overview', 'support_tickets', 'funnel', 'health', 'activity'],
            hiddenSubItems: []
        }
    }

    const allSections = ['hero', 'session', 'financials', 'analytics', 'deadlines', 'tasks', 'projects_overview', 'support_tickets', 'funnel', 'health', 'activity']

    const currentLayout = roleLayout.enabledSections && roleLayout.enabledSections.length > 0
        ? [...roleLayout.enabledSections]
        : allSections

    const sectionOrder = roleLayout.sectionOrder && roleLayout.sectionOrder.length > 0
        ? [...new Set(['projects_overview', 'support_tickets', ...roleLayout.sectionOrder, ...allSections])]
        : allSections

    const customLabels = roleLayout.customLabels || {}
    const hiddenSubItems = roleLayout.hiddenSubItems || []

    const completedProjects = relevantProjects.filter(p => p.status === 'completed').length
    const inProgressProjects = relevantProjects.filter(p => p.status === 'in-progress').length
    const onHoldProjects = relevantProjects.filter(p => p.status === 'on-hold').length
    const planningProjects = relevantProjects.filter(p => p.status === 'planning').length

    const openTickets = tickets.filter(t => t.status === 'open').length
    const resolvedTickets = tickets.filter(t => t.status === 'resolved' || t.status === 'closed').length
    const criticalTickets = tickets.filter(t => t.priority === 'critical' || t.priority === 'high').length

    const teamPerformance = useMemo(() => {
        const { users } = useAppStore.getState()
        if (!users || !Array.isArray(users)) return []
        return users.map(user => {
            if (!user) return null;
            const userTasks = tasks ? tasks.filter(t => t?.assigneeId === user.id || (t as any)?._id === user.id) : []
            const totalTime = timeEntries
                ? timeEntries.filter(te => te?.userId === user.id).reduce((sum, te) => sum + (te?.duration || 0), 0)
                : 0
            const hours = totalTime / 60

            // Performance Score Logic (Refined)
            // 1. Task Completion Rate (50%)
            // 2. Task Punctuality - On-time completion (20%)
            // 3. Working Hours Consistency (30%)

            const completedTasks = userTasks.filter(t => t?.status === 'done')
            const completedCount = completedTasks.length
            const totalCount = userTasks.length || 1

            // Punctuality: Check if updatedAt (completion time) <= dueDate
            const onTimeCount = completedTasks.filter(t => {
                const due = new Date(t.dueDate).getTime()
                const done = new Date(t.updatedAt).getTime()
                return done <= due
            }).length

            const completionScore = (completedCount / totalCount) * 50
            const punctualityScore = completedCount > 0 ? (onTimeCount / completedCount) * 20 : 0
            const hourScore = Math.min(30, (hours / 40) * 30) // Basis: 40 hours per week

            const score = Math.min(100, Math.round(completionScore + punctualityScore + hourScore))

            return {
                id: user.id || Math.random().toString(),
                name: user.name || 'Unknown',
                role: user.role || 'Staff',
                avatar: user.avatar,
                completedTasks: completedCount,
                onTimeTasks: onTimeCount,
                totalTimeHours: Math.round(hours),
                activeTasks: userTasks.filter(t => t?.status !== 'done').length,
                performanceScore: score
            }
        }).filter(Boolean).sort((a: any, b: any) => b.performanceScore - a.performanceScore)
    }, [tasks, timeEntries])

    const myPerformanceScore = useMemo(() => {
        const me = teamPerformance.find(p => p?.id === userId)
        return me ? me.performanceScore : 0
    }, [teamPerformance, userId])

    const todoTasks = relevantTasks.filter(t => t.status === 'todo').length
    const inProgressTasks = relevantTasks.filter(t => t.status === 'in-progress').length
    const reviewTasks = relevantTasks.filter(t => t.status === 'review').length
    const doneTasks = relevantTasks.filter(t => t.status === 'done').length

    const totalProjectCost = (relevantProjects || []).reduce((sum, p) => sum + (p?.budget || 0), 0)

    return {
        totalRevenue,
        totalExpenses,
        netProfit,
        outstandingInvoices,
        relevantProjects,
        relevantTasks,
        completedProjects,
        inProgressProjects,
        onHoldProjects,
        planningProjects,
        todoTasks,
        inProgressTasks,
        reviewTasks,
        doneTasks,
        totalProjectCost,
        teamPerformance,
        winRate,
        totalBillableHours,
        revenueData,
        leadStatusData,
        healthMetrics,
        recentActivities,
        revenueTrend,
        expenseTrend,
        myPerformanceScore,
        currentLayout,
        sectionOrder,
        customLabels,
        hiddenSubItems,
        openTickets,
        resolvedTickets,
        criticalTickets
    }
}
