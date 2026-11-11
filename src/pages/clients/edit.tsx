import { useParams } from 'react-router-dom'
import { useAppStore } from '@/store'
import { ClientForm } from '@/components/forms/client-form'
import { useEffect } from 'react'
import api from '@/lib/api-client'
import { mapClient } from '@/lib/mappers'

export function EditClientPage() {
    const { id } = useParams()
    const { clients, setClients } = useAppStore()

    const client = clients.find(c => c.id === id)

    // Fetch if missing (Handle Refresh)
    useEffect(() => {
        if (!client && clients.length === 0) {
            const fetchClients = async () => {
                try {
                    const response = await api.get('/clients')
                    const backendClients = response.data.map(mapClient)
                    setClients(backendClients)
                } catch (error) {
                    console.error("Failed to fetch clients", error)
                }
            }
            fetchClients()
        }
    }, [client, clients.length, setClients])

    if (!client && clients.length > 0) {
        return <div>Client not found</div>
    }

    if (!client) {
        return <div className="p-10 text-center">Loading...</div>
    }

    // Map client data to form values
    const initialData = {
        name: client.name,
        company: client.company,
        phone: client.phone,
        email: client.email,
        clientType: client.type,
        industry: client.industry,
        city: client.city,
        website: client.website,
        gstNumber: client.gstNumber,
        address: client.address,
        services: client.services || [],
        budget: client.budget,
        paymentModel: client.paymentModel,
        deadline: client.deadline ? new Date(client.deadline).toISOString().split('T')[0] : '',
        leadSource: client.leadSource,
        status: client.status,
        followUpDate: client.followUpDate ? new Date(client.followUpDate).toISOString().split('T')[0] : '',
        assignedTo: client.assignedTo,
        notes: client.notes,
    }

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <ClientForm mode="edit" initialData={initialData} clientId={client.id} />
        </div>
    )
}

export default EditClientPage
