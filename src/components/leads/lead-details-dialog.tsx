import { Dialog, DialogContent } from '@/components/ui/dialog'
import type { Lead } from '@/types'
import { LeadDetailsPanel } from './lead-details-panel'

interface LeadDetailsDialogProps {
    lead: Lead | null
    isOpen: boolean
    onClose: () => void
    onUpdate: (updatedLead: Lead) => void
    onOpenFollowUp?: (lead: Lead) => void
    onDelete: (leadId: string) => void
    onAddActivity: (leadId: string, content: string) => Promise<any>
}

export function LeadDetailsDialog({ lead, isOpen, onClose, onUpdate, onOpenFollowUp, onDelete, onAddActivity }: LeadDetailsDialogProps) {
    if (!lead) return null

    return (
        <Dialog open={isOpen} onOpenChange={(v) => !v && onClose()}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl p-6">
                <LeadDetailsPanel 
                    lead={lead} 
                    onUpdate={onUpdate} 
                    onOpenFollowUp={(l) => { onClose(); onOpenFollowUp?.(l); }}
                    onDelete={(id) => { onDelete(id); onClose(); }} 
                    onAddActivity={onAddActivity} 
                />
            </DialogContent>
        </Dialog>
    )
}
