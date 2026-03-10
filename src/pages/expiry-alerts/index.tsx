import { useState, useEffect, useCallback } from 'react'
import api from '@/lib/api-client'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import {
    Send, AlertTriangle, Shield, Globe, Server,
    FileText, RefreshCw, CheckCircle, Mail, ChevronDown, ChevronUp,
    Zap, ArrowUpRight, Filter, BellRing, Loader2
} from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface ExpiryAlert {
    id: string
    type: string
    name: string
    clientName: string
    clientEmail: string
    clientCompany: string
    projectName?: string
    expiryDate: string
    amount: number
    status: string
    daysLeft: number
    urgency: 'expired' | 'critical' | 'warning'
    frequency?: string
    provider?: string
    invoiceNumber?: string
}

interface AlertSummary {
    totalAlerts: number
    expired: number
    critical: number
    warning: number
    amcAlerts: number
    domainAlerts: number
    invoiceAlerts: number
}

const getTypeIcon = (type: string) => {
    switch (type) {
        case 'amc': return Shield
        case 'domain': return Globe
        case 'hosting': return Server
        case 'ssl': return Shield
        case 'invoice': return FileText
        default: return AlertTriangle
    }
}

const getTypeLabel = (type: string) => {
    switch (type) {
        case 'amc': return 'AMC Contract'
        case 'domain': return 'Domain'
        case 'hosting': return 'Hosting'
        case 'ssl': return 'SSL'
        case 'invoice': return 'Invoice'
        case 'both': return 'Domain + Hosting'
        default: return type.charAt(0).toUpperCase() + type.slice(1)
    }
}

const getUrgencyStyles = (urgency: string) => {
    switch (urgency) {
        case 'expired':
            return {
                bg: 'bg-red-50 border-red-200',
                badge: 'bg-red-100 text-red-700 border-red-200',
                icon: 'text-red-500',
                glow: 'shadow-red-100',
                dot: 'bg-red-500'
            }
        case 'critical':
            return {
                bg: 'bg-amber-50 border-amber-200',
                badge: 'bg-amber-100 text-amber-700 border-amber-200',
                icon: 'text-amber-500',
                glow: 'shadow-amber-100',
                dot: 'bg-amber-500'
            }
        case 'warning':
            return {
                bg: 'bg-blue-50 border-blue-200',
                badge: 'bg-blue-100 text-blue-700 border-blue-200',
                icon: 'text-blue-500',
                glow: 'shadow-blue-100',
                dot: 'bg-blue-500'
            }
        default:
            return {
                bg: 'bg-gray-50 border-gray-200',
                badge: 'bg-gray-100 text-gray-700 border-gray-200',
                icon: 'text-gray-500',
                glow: 'shadow-gray-100',
                dot: 'bg-gray-500'
            }
    }
}

export default function ExpiryAlertsPage() {
    const navigate = useNavigate()
    const { toast } = useToast()
    const [loading, setLoading] = useState(true)
    const [alerts, setAlerts] = useState<ExpiryAlert[]>([])
    const [summary, setSummary] = useState<AlertSummary | null>(null)
    const [sendingId, setSendingId] = useState<string | null>(null)
    const [bulkSending, setBulkSending] = useState(false)
    const [filter, setFilter] = useState('all')
    const [typeFilter, setTypeFilter] = useState('all')
    const [sentReminders, setSentReminders] = useState<Set<string>>(new Set())
    const [expandedId, setExpandedId] = useState<string | null>(null)

    const fetchAlerts = useCallback(async () => {
        setLoading(true)
        try {
            const res = await api.get('/expiry-alerts')
            setAlerts(res.data.alerts)
            setSummary(res.data.summary)
        } catch (err: any) {
            toast({
                title: 'Error',
                description: err.response?.data?.message || 'Failed to load expiry alerts',
                variant: 'destructive'
            })
        } finally {
            setLoading(false)
        }
    }, [toast])

    useEffect(() => { fetchAlerts() }, [fetchAlerts])

    const handleSendReminder = async (alert: ExpiryAlert) => {
        setSendingId(alert.id)
        try {
            const res = await api.post('/expiry-alerts/send-reminder', {
                alertId: alert.id,
                alertType: alert.type,
                clientEmail: alert.clientEmail,
                clientName: alert.clientName,
                itemName: alert.name,
                expiryDate: alert.expiryDate,
                amount: alert.amount
            })
            toast({
                title: '✅ Reminder Sent!',
                description: res.data.message,
            })
            setSentReminders(prev => new Set(prev).add(alert.id))
        } catch (err: any) {
            toast({
                title: 'Failed',
                description: err.response?.data?.message || 'Failed to send reminder',
                variant: 'destructive'
            })
        } finally {
            setSendingId(null)
        }
    }

    const handleBulkSend = async () => {
        const criticalAlerts = filteredAlerts.filter(a => a.urgency === 'expired' || a.urgency === 'critical')
        if (criticalAlerts.length === 0) {
            toast({ title: 'No critical alerts', description: 'No expired or critical items to send reminders for.' })
            return
        }
        if (!confirm(`Send reminders for ${criticalAlerts.length} critical/expired items?`)) return

        setBulkSending(true)
        try {
            const res = await api.post('/expiry-alerts/send-bulk', {
                alertIds: criticalAlerts.map(a => ({
                    id: a.id,
                    type: a.type,
                    clientEmail: a.clientEmail,
                    clientName: a.clientName,
                    itemName: a.name,
                    expiryDate: a.expiryDate,
                    amount: a.amount
                }))
            })
            toast({
                title: '✅ Bulk Reminders Sent!',
                description: res.data.message,
            })
            criticalAlerts.forEach(a => setSentReminders(prev => new Set(prev).add(a.id)))
        } catch (err: any) {
            toast({
                title: 'Failed',
                description: err.response?.data?.message || 'Bulk send failed',
                variant: 'destructive'
            })
        } finally {
            setBulkSending(false)
        }
    }

    // Filtering
    const filteredAlerts = alerts.filter(a => {
        if (filter !== 'all' && a.urgency !== filter) return false
        if (typeFilter !== 'all' && a.type !== typeFilter) return false
        return true
    })

    if (loading) {
        return (
            <div className="h-[80vh] w-full flex flex-col items-center justify-center space-y-4">
                <div className="h-16 w-16 rounded-2xl bg-amber-100 flex items-center justify-center animate-pulse">
                    <BellRing className="h-8 w-8 text-amber-600" />
                </div>
                <p className="text-xs font-black uppercase tracking-[0.15em] text-muted-foreground">Scanning Expiry Data...</p>
            </div>
        )
    }

    return (
        <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                    <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-amber-500 to-red-500 flex items-center justify-center shadow-lg shadow-amber-200">
                        <BellRing className="h-7 w-7 text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black tracking-tight">Expiry Alerts</h1>
                        <p className="text-sm text-muted-foreground font-medium mt-0.5">Send renewal notifications for expiring AMCs, domains & overdue invoices</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={fetchAlerts}
                        className="text-xs font-bold"
                    >
                        <RefreshCw className="h-4 w-4 mr-2" /> Refresh
                    </Button>
                    {summary && (summary.expired > 0 || summary.critical > 0) && (
                        <Button
                            onClick={handleBulkSend}
                            disabled={bulkSending}
                            className="bg-gradient-to-r from-red-500 to-amber-500 hover:from-red-600 hover:to-amber-600 text-white text-xs font-black uppercase tracking-wider shadow-lg shadow-red-200 transition-all"
                        >
                            {bulkSending ? (
                                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Sending...</>
                            ) : (
                                <><Zap className="h-4 w-4 mr-2" /> Send All Critical ({(summary?.expired || 0) + (summary?.critical || 0)})</>
                            )}
                        </Button>
                    )}
                </div>
            </div>

            {/* Summary Cards */}
            {summary && (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                    {[
                        { label: 'Total Alerts', value: summary.totalAlerts, color: 'text-foreground', bg: 'bg-muted', filterVal: 'all' },
                        { label: 'Expired', value: summary.expired, color: 'text-red-600', bg: 'bg-red-50', filterVal: 'expired' },
                        { label: 'Critical', value: summary.critical, color: 'text-amber-600', bg: 'bg-amber-50', filterVal: 'critical' },
                        { label: 'Warning', value: summary.warning, color: 'text-blue-600', bg: 'bg-blue-50', filterVal: 'warning' },
                        { label: 'AMC', value: summary.amcAlerts, color: 'text-indigo-600', bg: 'bg-indigo-50', filterVal: '' },
                        { label: 'Domain/Host', value: summary.domainAlerts, color: 'text-teal-600', bg: 'bg-teal-50', filterVal: '' },
                        { label: 'Invoices', value: summary.invoiceAlerts, color: 'text-purple-600', bg: 'bg-purple-50', filterVal: '' },
                    ].map((stat) => (
                        <button
                            key={stat.label}
                            onClick={() => stat.filterVal !== '' ? setFilter(stat.filterVal) : null}
                            className={`p-4 rounded-2xl border-2 transition-all text-left ${filter === stat.filterVal ? 'border-foreground/30 shadow-lg scale-[1.02]' : 'border-transparent hover:border-foreground/10'} ${stat.bg}`}
                        >
                            <div className={`text-2xl font-black ${stat.color}`}>{stat.value}</div>
                            <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mt-1">{stat.label}</div>
                        </button>
                    ))}
                </div>
            )}

            {/* Filters */}
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Type:</span>
                </div>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="w-48 h-9 text-xs font-bold">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="amc">AMC Contracts</SelectItem>
                        <SelectItem value="domain">Domains</SelectItem>
                        <SelectItem value="hosting">Hosting</SelectItem>
                        <SelectItem value="ssl">SSL Certificates</SelectItem>
                        <SelectItem value="invoice">Overdue Invoices</SelectItem>
                    </SelectContent>
                </Select>
                <span className="text-xs font-bold text-muted-foreground ml-auto">
                    Showing {filteredAlerts.length} of {alerts.length} alerts
                </span>
            </div>

            {/* Alerts List */}
            {filteredAlerts.length === 0 ? (
                <Card className="flex flex-col items-center justify-center py-20 rounded-3xl border-dashed border-2">
                    <CheckCircle className="h-16 w-16 text-green-300 mb-6" />
                    <h3 className="text-xl font-black text-muted-foreground mb-2">All Clear!</h3>
                    <p className="text-sm text-muted-foreground">No expiring items found for the selected filters</p>
                </Card>
            ) : (
                <div className="space-y-4">
                    {filteredAlerts.map((alert) => {
                        const styles = getUrgencyStyles(alert.urgency)
                        const TypeIcon = getTypeIcon(alert.type)
                        const isExpanded = expandedId === alert.id
                        const isSent = sentReminders.has(alert.id)
                        const isSending = sendingId === alert.id

                        return (
                            <Card
                                key={`${alert.type}-${alert.id}`}
                                className={`rounded-2xl border-2 overflow-hidden transition-all duration-200 ${styles.bg} ${styles.glow} ${isExpanded ? 'shadow-xl' : 'hover:shadow-lg'}`}
                            >
                                <div className="p-5 lg:p-6">
                                    <div className="flex items-start lg:items-center gap-4 flex-col lg:flex-row">
                                        {/* Left - Icon & Info */}
                                        <div className="flex items-center gap-4 flex-1 min-w-0">
                                            {/* Urgency dot */}
                                            <div className="relative flex-shrink-0">
                                                <div className={`h-12 w-12 rounded-2xl flex items-center justify-center ${alert.urgency === 'expired' ? 'bg-red-100' : alert.urgency === 'critical' ? 'bg-amber-100' : 'bg-blue-100'}`}>
                                                    <TypeIcon className={`h-6 w-6 ${styles.icon}`} />
                                                </div>
                                                {alert.urgency === 'expired' && (
                                                    <div className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 rounded-full animate-pulse border-2 border-white" />
                                                )}
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <h3 className="text-sm font-black text-foreground truncate">{alert.name}</h3>
                                                    <Badge variant="outline" className={`text-[9px] font-black uppercase tracking-widest ${styles.badge} border px-2 py-0`}>
                                                        {getTypeLabel(alert.type)}
                                                    </Badge>
                                                </div>
                                                <div className="flex items-center gap-3 text-xs text-muted-foreground font-medium">
                                                    <span>{alert.clientName}</span>
                                                    {alert.clientEmail && <span className="hidden lg:inline">• {alert.clientEmail}</span>}
                                                    {alert.projectName && <span className="hidden xl:inline">• {alert.projectName}</span>}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Center - Status */}
                                        <div className="flex items-center gap-4 lg:gap-6">
                                            {/* Days Countdown */}
                                            <div className="text-center min-w-[80px]">
                                                {alert.daysLeft <= 0 ? (
                                                    <>
                                                        <div className="text-xl font-black text-red-600">{Math.abs(alert.daysLeft)}</div>
                                                        <div className="text-[9px] font-black text-red-500 uppercase tracking-widest">Days Overdue</div>
                                                    </>
                                                ) : (
                                                    <>
                                                        <div className={`text-xl font-black ${alert.daysLeft <= 7 ? 'text-amber-600' : 'text-blue-600'}`}>{alert.daysLeft}</div>
                                                        <div className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Days Left</div>
                                                    </>
                                                )}
                                            </div>

                                            {/* Amount */}
                                            <div className="text-center min-w-[100px]">
                                                <div className="text-lg font-black text-foreground">₹{alert.amount?.toLocaleString('en-IN')}</div>
                                                <div className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">{alert.type === 'invoice' ? 'Due' : 'Renewal'}</div>
                                            </div>

                                            {/* Expiry Date */}
                                            <div className="text-center min-w-[90px] hidden lg:block">
                                                <div className="text-xs font-bold text-foreground">
                                                    {new Date(alert.expiryDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                </div>
                                                <div className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">
                                                    {alert.daysLeft <= 0 ? 'Expired On' : 'Expires'}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Right - Actions */}
                                        <div className="flex items-center gap-2 flex-shrink-0">
                                            {isSent ? (
                                                <Button disabled size="sm" variant="outline" className="text-xs font-bold text-green-600 border-green-200 bg-green-50">
                                                    <CheckCircle className="h-4 w-4 mr-1.5" /> Sent
                                                </Button>
                                            ) : (
                                                <Button
                                                    size="sm"
                                                    onClick={() => handleSendReminder(alert)}
                                                    disabled={isSending}
                                                    className={`text-xs font-black uppercase tracking-wider shadow-sm transition-all ${alert.urgency === 'expired'
                                                        ? 'bg-red-600 hover:bg-red-700 text-white shadow-red-200'
                                                        : alert.urgency === 'critical'
                                                            ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-200'
                                                            : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-200'
                                                        }`}
                                                >
                                                    {isSending ? (
                                                        <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Sending...</>
                                                    ) : (
                                                        <><Send className="h-3.5 w-3.5 mr-1.5" /> Send Reminder</>
                                                    )}
                                                </Button>
                                            )}
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => setExpandedId(isExpanded ? null : alert.id)}
                                                className="h-8 w-8 p-0"
                                            >
                                                {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                            </Button>
                                        </div>
                                    </div>

                                    {/* Expanded Detail */}
                                    {isExpanded && (
                                        <div className="mt-5 pt-5 border-t border-foreground/10 grid grid-cols-2 lg:grid-cols-4 gap-4">
                                            <div>
                                                <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Client</div>
                                                <div className="text-sm font-bold">{alert.clientName}</div>
                                                {alert.clientCompany && <div className="text-xs text-muted-foreground">{alert.clientCompany}</div>}
                                            </div>
                                            <div>
                                                <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Email</div>
                                                <div className="text-sm font-bold flex items-center gap-1.5">
                                                    <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                                                    {alert.clientEmail || 'Not available'}
                                                </div>
                                            </div>
                                            {alert.provider && (
                                                <div>
                                                    <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Provider</div>
                                                    <div className="text-sm font-bold">{alert.provider}</div>
                                                </div>
                                            )}
                                            {alert.frequency && (
                                                <div>
                                                    <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Frequency</div>
                                                    <div className="text-sm font-bold capitalize">{alert.frequency}</div>
                                                </div>
                                            )}
                                            {alert.projectName && (
                                                <div>
                                                    <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Project</div>
                                                    <div className="text-sm font-bold">{alert.projectName}</div>
                                                </div>
                                            )}
                                            <div className="col-span-2 lg:col-span-4 flex items-center gap-3 mt-2">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="text-xs font-bold"
                                                    onClick={() => {
                                                        if (alert.type === 'amc') navigate('/amc')
                                                        else if (alert.type === 'invoice') navigate('/invoices')
                                                        else navigate('/domains')
                                                    }}
                                                >
                                                    <ArrowUpRight className="h-3.5 w-3.5 mr-1.5" />
                                                    View {getTypeLabel(alert.type)}
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </Card>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
