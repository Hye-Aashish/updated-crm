import { useState, useEffect } from 'react'
import api from '@/lib/api-client'
import { useAppStore } from '@/store'
import { useToast } from '@/hooks/use-toast'
import type { PipelineStage, LeadForm } from '@/types'

export function useLeadsData() {
    const { toast } = useToast()
    const { leads, setLeads } = useAppStore()
    const [stages, setStages] = useState<PipelineStage[]>([])
    const [leadForms, setLeadForms] = useState<LeadForm[]>([])

    const fetchData = async () => {
        try {
            const [stagesRes, leadsRes, formsRes] = await Promise.all([
                api.get('/leads/stages'),
                api.get('/leads'),
                api.get('/lead-forms')
            ])

            setStages(stagesRes.data)
            setLeads(leadsRes.data.map((l: any) => ({
                id: l._id,
                name: l.name,
                company: l.company,
                value: l.value,
                source: l.source,
                stage: l.stage,
                email: l.email,
                phone: l.phone,
                activities: l.activities || [],
                reminder: l.reminder,
                customFields: l.customFields || {}
            })))
            setLeadForms(formsRes.data)
        } catch (error) {
            console.error("Failed to fetch leads data", error)
            toast({ title: "Error", description: "Failed to load pipeline data", variant: "destructive" })
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
            const updatedLeads = leads.map(l => l.id === leadId ? { ...l, activities: res.data.activities } : l)
            setLeads(updatedLeads)
            toast({ description: "Note added" })
            return res.data.activities
        } catch (error) {
            toast({ title: "Error", description: "Failed to add note", variant: "destructive" })
            return null
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
        addActivity
    }
}
