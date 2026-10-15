import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
    Calendar, 
    Filter, 
    RotateCcw, 
    Download, 
    Check, 
    ChevronDown,
    SlidersHorizontal
} from 'lucide-react'
import { format } from 'date-fns'

export interface SalesFilterState {
    range: 'today' | 'yesterday' | 'this_week' | 'this_month' | 'all' | 'custom'
    startDate: string
    endDate: string
    selectedAgent: string
    leadSource: string
    pipelineStage: string
}

interface SalesFilterBarProps {
    filters: SalesFilterState
    onChangeFilters: (filters: Partial<SalesFilterState>) => void
    onApply: () => void
    onReset: () => void
    onExport: () => void
    agents: any[]
    stages?: any[]
    isPersonalView?: boolean
}

export function SalesFilterBar({
    filters,
    onChangeFilters,
    onApply,
    onReset,
    onExport,
    agents = [],
    stages = [],
    isPersonalView = false
}: SalesFilterBarProps) {
    const [showCustomRange, setShowCustomRange] = useState<boolean>(filters.range === 'custom')

    const handlePresetRange = (preset: 'today' | 'yesterday' | 'this_week' | 'this_month' | 'all') => {
        setShowCustomRange(false)
        const now = new Date()
        let start = new Date()
        let end = new Date()

        if (preset === 'today') {
            start.setHours(0, 0, 0, 0)
            end.setHours(23, 59, 59, 999)
        } else if (preset === 'yesterday') {
            start.setDate(start.getDate() - 1)
            start.setHours(0, 0, 0, 0)
            end.setDate(end.getDate() - 1)
            end.setHours(23, 59, 59, 999)
        } else if (preset === 'this_week') {
            start.setDate(start.getDate() - 7)
            start.setHours(0, 0, 0, 0)
        } else if (preset === 'this_month') {
            start.setDate(start.getDate() - 30)
            start.setHours(0, 0, 0, 0)
        } else {
            start = new Date('2024-01-01')
        }

        onChangeFilters({
            range: preset,
            startDate: start.toISOString().split('T')[0],
            endDate: end.toISOString().split('T')[0]
        })
    }

    return (
        <div className="p-4 rounded-3xl bg-card border border-border/50 shadow-xs space-y-3">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                {/* Left: Preset Range Pills + Custom Toggle */}
                <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mr-1">
                        Timeframe:
                    </span>
                    {[
                        { key: 'today', label: 'Today' },
                        { key: 'yesterday', label: 'Yesterday' },
                        { key: 'this_week', label: 'Last 7 Days' },
                        { key: 'this_month', label: 'Last 30 Days' },
                        { key: 'all', label: 'All Time' },
                    ].map(t => (
                        <button
                            key={t.key}
                            type="button"
                            onClick={() => handlePresetRange(t.key as any)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                                filters.range === t.key && !showCustomRange
                                    ? 'bg-primary text-primary-foreground shadow-xs'
                                    : 'bg-muted/40 hover:bg-muted text-foreground'
                            }`}
                        >
                            {t.label}
                        </button>
                    ))}

                    <button
                        type="button"
                        onClick={() => {
                            setShowCustomRange(!showCustomRange)
                            if (!showCustomRange) onChangeFilters({ range: 'custom' })
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
                            showCustomRange || filters.range === 'custom'
                                ? 'bg-primary text-primary-foreground shadow-xs'
                                : 'bg-muted/40 hover:bg-muted text-foreground'
                        }`}
                    >
                        <Calendar className="h-3 w-3" />
                        Custom Date Range
                    </button>
                </div>

                {/* Right: Export & Action Buttons */}
                <div className="flex items-center gap-2 self-start lg:self-auto">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={onReset}
                        className="h-8 px-3 text-xs font-semibold rounded-xl border-border/60 hover:bg-muted gap-1"
                        title="Reset all filters to defaults"
                    >
                        <RotateCcw className="h-3 w-3" />
                        Reset
                    </Button>
                    <Button
                        size="sm"
                        onClick={onApply}
                        className="h-8 px-4 text-xs font-bold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs gap-1"
                    >
                        <Check className="h-3.5 w-3.5" />
                        Apply Filters
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={onExport}
                        className="h-8 px-3 text-xs font-bold rounded-xl border-border/60 hover:bg-muted gap-1"
                    >
                        <Download className="h-3.5 w-3.5" />
                        Export Report
                    </Button>
                </div>
            </div>

            {/* Custom Date Pickers & Dimension Selectors */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 pt-2 border-t border-border/30">
                {/* Start Date */}
                <div className="space-y-1">
                    <span className="text-[10px] font-bold uppercase text-muted-foreground">Start Date</span>
                    <Input
                        type="date"
                        value={filters.startDate}
                        onChange={(e) => {
                            setShowCustomRange(true)
                            onChangeFilters({ startDate: e.target.value, range: 'custom' })
                        }}
                        className="h-8 text-xs font-semibold rounded-xl bg-background border-border/60"
                    />
                </div>

                {/* End Date */}
                <div className="space-y-1">
                    <span className="text-[10px] font-bold uppercase text-muted-foreground">End Date</span>
                    <Input
                        type="date"
                        value={filters.endDate}
                        onChange={(e) => {
                            setShowCustomRange(true)
                            onChangeFilters({ endDate: e.target.value, range: 'custom' })
                        }}
                        className="h-8 text-xs font-semibold rounded-xl bg-background border-border/60"
                    />
                </div>

                {/* Sales Agent Selector (Admin view) */}
                {!isPersonalView && (
                    <div className="space-y-1">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase text-muted-foreground">Sales Agent</span>
                            {filters.selectedAgent && filters.selectedAgent !== 'all' && (
                                <button
                                    type="button"
                                    onClick={() => onChangeFilters({ selectedAgent: 'all' })}
                                    className="text-[9px] font-bold text-primary hover:underline flex items-center gap-0.5"
                                >
                                    Show All ✕
                                </button>
                            )}
                        </div>
                        <Select 
                            value={filters.selectedAgent || 'all'} 
                            onValueChange={(v) => onChangeFilters({ selectedAgent: v })}
                        >
                            <SelectTrigger className="h-8 text-xs font-semibold rounded-xl bg-background border-border/60">
                                <SelectValue placeholder="All Agents" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all" className="text-xs font-semibold">All Team Members</SelectItem>
                                {agents.map((ag) => {
                                    const val = String(ag.userId || ag.name)
                                    return (
                                        <SelectItem key={val} value={val} className="text-xs font-semibold">
                                            {ag.name} {ag.role ? `(${ag.role})` : ''}
                                        </SelectItem>
                                    )
                                })}
                            </SelectContent>
                        </Select>
                    </div>
                )}

                {/* Lead Source */}
                <div className="space-y-1">
                    <span className="text-[10px] font-bold uppercase text-muted-foreground">Lead Source</span>
                    <Select 
                        value={filters.leadSource} 
                        onValueChange={(v) => onChangeFilters({ leadSource: v })}
                    >
                        <SelectTrigger className="h-8 text-xs font-semibold rounded-xl bg-background border-border/60">
                            <SelectValue placeholder="All Sources" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all" className="text-xs font-semibold">All Lead Sources</SelectItem>
                            <SelectItem value="Direct" className="text-xs font-semibold">Direct</SelectItem>
                            <SelectItem value="Website" className="text-xs font-semibold">Website Form</SelectItem>
                            <SelectItem value="Referral" className="text-xs font-semibold">Referral</SelectItem>
                            <SelectItem value="LinkedIn" className="text-xs font-semibold">LinkedIn</SelectItem>
                            <SelectItem value="Cold Calling" className="text-xs font-semibold">Cold Calling</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* Pipeline Stage */}
                <div className="space-y-1">
                    <span className="text-[10px] font-bold uppercase text-muted-foreground">Pipeline Stage</span>
                    <Select 
                        value={filters.pipelineStage} 
                        onValueChange={(v) => onChangeFilters({ pipelineStage: v })}
                    >
                        <SelectTrigger className="h-8 text-xs font-semibold rounded-xl bg-background border-border/60">
                            <SelectValue placeholder="All Stages" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all" className="text-xs font-semibold">All Stages</SelectItem>
                            <SelectItem value="new" className="text-xs font-semibold">New Lead</SelectItem>
                            <SelectItem value="contacted" className="text-xs font-semibold">Contacted</SelectItem>
                            <SelectItem value="qualified" className="text-xs font-semibold">Qualified</SelectItem>
                            <SelectItem value="pending-meeting" className="text-xs font-semibold">Pending Meeting</SelectItem>
                            <SelectItem value="closed" className="text-xs font-semibold">Deals Won</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>
        </div>
    )
}
