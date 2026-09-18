import { useState, useEffect } from 'react'
import api from '@/lib/api-client'
import { useAppStore } from '@/store'
import { useToast } from '@/hooks/use-toast'
import type { PipelineStage, LeadForm } from '@/types'
import { mapLead } from '@/lib/mappers'

export function useLeadsData() {
    const { toast } = useToast()
    const { leads, setLeads } = useAppStore()
    const [stages, setStages] = useState<PipelineStage[]>([])
    const [leadForms, setLeadForms] = useState<LeadForm[]>([])
    const [loading, setLoading] = useState(true)

    const fetchData = async () => {
        setLoading(true)
        try {
            const [stagesRes, leadsRes, formsRes] = await Promise.all([
                api.get('/leads/stages'),
                api.get('/leads'),
                api.get('/lead-forms')
            ])

            setStages(stagesRes.data)
            setLeads(leadsRes.data.map(mapLead))
            setLeadForms(formsRes.data)
        } catch (error) {
            console.error("Failed to fetch leads data", error)
            toast({ title: "Error", description: "Failed to load pipeline data", variant: "destructive" })
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchData()
    }, [])

    const updateLeadStage = async (leadId: string, targetStage: string) => {
        const previousLeads = [...leads]
        setLeads(leads.map(lead => lead.id === leadId ? { ...lead, stage: targetStage } : lead))

        try {
            await api.put(`/leads/${leadId}`, { stage: targetStage })
            toast({ description: "Lead stage updated" })
        } catch (error) {
            setLeads(previousLeads)
            toast({ title: "Error", description: "Failed to update lead stage", variant: "destructive" })
        }
    }

    const deleteLead = async (leadId: string) => {
        try {
            await api.delete(`/leads/${leadId}`)
            setLeads(leads.filter(l => l.id !== leadId))
            toast({ description: "Lead deleted successfully" })
        } catch (error) {
            toast({ title: "Error", description: "Failed to delete lead", variant: "destructive" })
        }
    }

    const addActivity = async (leadId: string, content: string) => {
        try {
            const res = await api.post(`/leads/${leadId}/activities`, {
                content,
                type: 'note'
            })
            const updatedLead = mapLead(res.data)
            const updatedLeads = leads.map(l => l.id === leadId ? updatedLead : l)
            setLeads(updatedLeads)
            toast({ description: "Note added" })
            return updatedLead
        } catch (error: any) {
            toast({ title: "Error", description: error?.response?.data?.message || error.message || "Failed to add note", variant: "destructive" })
            return null
        }
    }

    const logFollowUp = async (leadId: string, payload: any) => {
        try {
            const res = await api.post(`/leads/${leadId}/followups`, payload)
            const updatedLead = mapLead(res.data)
            setLeads(leads.map(l => l.id === leadId ? updatedLead : l))
            toast({ title: "Success", description: "Follow-up recorded successfully!" })
            return updatedLead
        } catch (error: any) {
            console.error("Log Follow-up Error:", error)
            toast({ title: "Error", description: error?.response?.data?.message || "Failed to record follow-up", variant: "destructive" })
            return null
        }
    }

    const reorderStages = async (newStages: PipelineStage[]) => {
        setStages(newStages)
        try {
            const stageOrders = newStages.map((s, index) => ({ id: s.id, order: index }))
            await api.put('/leads/stages/reorder', { stageOrders })
            toast({ description: "Stage order updated" })
        } catch (error) {
            console.error("Reorder stages error:", error)
            toast({ title: "Error", description: "Failed to save stage order", variant: "destructive" })
            fetchData()
        }
    }

    return {
        leads,
        stages,
        leadForms,
        setLeads,
        setStages,
        setLeadForms,
        fetchData,
        updateLeadStage,
        deleteLead,
        addActivity,
        logFollowUp,
        reorderStages,
        loading
    }
}
