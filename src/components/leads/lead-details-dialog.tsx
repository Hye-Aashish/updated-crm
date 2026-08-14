import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Trash2 } from 'lucide-react'
import type { Lead } from '@/types'
import { LeadDetailsPanel } from './lead-details-panel'

interface LeadDetailsDialogProps {
    lead: Lead | null
    isOpen: boolean
    onClose: () => void
    onUpdate: (updatedLead: Lead) => void
    onDelete: (leadId: string) => void
    onAddActivity: (leadId: string, content: string) => Promise<any>
}

export function LeadDetailsDialog({ lead, isOpen, onClose, onUpdate, onDelete, onAddActivity }: LeadDetailsDialogProps) {
    if (!lead) return null

    return (
        <Dialog open={isOpen} onOpenChange={(v) => !v && onClose()}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <LeadDetailsPanel 
                    lead={lead} 
                    onUpdate={onUpdate} 
                    onDelete={(id) => { onDelete(id); onClose(); }} 
                    onAddActivity={onAddActivity} 
                />
            </DialogContent>
        </Dialog>
    )
}
