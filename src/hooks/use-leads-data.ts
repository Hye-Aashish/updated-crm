import { useState, useEffect } from 'react'
import api from '@/lib/api-client'
import { handleApiError } from '@/lib/error-handler'
import { useAppStore } from '@/store'
import { useToast } from '@/hooks/use-toast'
import type { PipelineStage, LeadForm } from '@/types'
import { mapLead, mapUser } from '@/lib/mappers'

export function useLeadsData() {
    const { toast } = useToast()
    const { leads, setLeads, users, setUsers } = useAppStore()
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

            if (users.length === 0) {
                api.get('/users').then(res => {
                    if (Array.isArray(res.data)) {
                        setUsers(res.data.map(mapUser))
                    }
                }).catch(console.error)
            }
        } catch (error) {
            console.error("Failed to fetch leads data", error)
            handleApiError(error, toast, "Failed to load pipeline data")
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
            handleApiError(error, toast, "Failed to update lead stage")
        }
    }

    const assignLead = async (leadId: string, assignedTo: string, assignedToName: string) => {
        const previousLeads = [...leads]
        setLeads(leads.map(lead => lead.id === leadId ? { ...lead, assignedTo, assignedToName } : lead))

        try {
            const res = await api.put(`/leads/${leadId}`, {
                assignedTo,
                assignedToName
            })
            const updated = mapLead(res.data)
            setLeads(leads.map(lead => lead.id === leadId ? updated : lead))
            toast({ title: "Lead Assigned", description: `Successfully assigned to ${assignedToName}` })
            return updated
        } catch (error) {
            setLeads(previousLeads)
            handleApiError(error, toast, "Failed to assign lead")
            return null
        }
    }

    const bulkAssignLeads = async (leadIds: string[], newAgentId: string, newAgentName: string) => {
        const previousLeads = [...leads]
        setLeads(leads.map(lead => {
            if (leadIds.includes(lead.id)) {
                return { ...lead, assignedTo: newAgentId, assignedToName: newAgentName }
            }
            return lead
        }))

        try {
            await api.post('/leads/bulk-reassign', {
                leadIds,
                newAgentId,
                newAgentName
            })
            toast({
                title: "Leads Assigned Successfully",
                description: `${leadIds.length} lead(s) reassigned to ${newAgentName}`
            })
            fetchData()
            return true
        } catch (error) {
            setLeads(previousLeads)
            handleApiError(error, toast, "Failed to bulk reassign leads")
            return false
        }
    }

    const deleteLead = async (leadId: string) => {
        try {
            await api.delete(`/leads/${leadId}`)
            setLeads(leads.filter(l => l.id !== leadId))
            toast({ description: "Lead deleted successfully" })
        } catch (error) {
            handleApiError(error, toast, "Failed to delete lead")
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
            handleApiError(error, toast, "Failed to add note")
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
            handleApiError(error, toast, "Failed to record follow-up")
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
            handleApiError(error, toast, "Failed to save stage order")
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
        assignLead,
        bulkAssignLeads,
        deleteLead,
        addActivity,
        logFollowUp,
        reorderStages,
        loading
    }
}
