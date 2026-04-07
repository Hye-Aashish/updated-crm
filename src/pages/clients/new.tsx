import { ClientForm } from '@/components/forms/client-form'
import { ChevronLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useNavigate } from 'react-router-dom'

export function NewClientPage() {
    const navigate = useNavigate()

    return (
        <div className="space-y-6 max-w-5xl mx-auto pb-10">
            <div className="flex items-center gap-4 mb-6">
                <Button variant="ghost" size="icon" onClick={() => navigate('/clients')}>
                    <ChevronLeft className="h-4 w-4" />
                </Button>
                {/* Title is handled inside ClientForm or can be here. 
            The requirements asked for title "Add Client", 
            ClientForm has it internally now or we can pass it if we refactor. 
            I updated ClientForm to have the header. So I'll keep this clean.
         */}
                <span className="sr-only">Back</span>
            </div>

            <ClientForm mode="create" />
        </div>
    )
}

export default NewClientPage
