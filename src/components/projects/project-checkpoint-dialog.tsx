import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Shield, Plus } from 'lucide-react'
import api from '@/lib/api-client'
import { useToast } from '@/hooks/use-toast'

interface ProjectCheckpointDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    projectId: string
    onSuccess: () => void
}

export function ProjectCheckpointDialog({
    open,
    onOpenChange,
    projectId,
    onSuccess
}: ProjectCheckpointDialogProps) {
    const { toast } = useToast()
    const [loading, setLoading] = useState(false)

    const [title, setTitle] = useState('')
    const [phase, setPhase] = useState('Phase 1: Setup')
    const [customPhase, setCustomPhase] = useState('')
    const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium')
    const [dueDate, setDueDate] = useState('')
    const [isMandatory, setIsMandatory] = useState(true)
    const [proofRequired, setProofRequired] = useState(false)
    const [proofType, setProofType] = useState('any')
    const [description, setDescription] = useState('')

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!title.trim()) return

        setLoading(true)
        try {
            const selectedPhase = phase === 'custom' ? (customPhase.trim() || 'General') : phase

            await api.post(`/projects/${projectId}/checkpoints`, {
                title: title.trim(),
                phase: selectedPhase,
                priority,
                dueDate: dueDate ? new Date(dueDate) : undefined,
                isMandatory,
                proofRequired,
                proofType,
                description: description.trim(),
                status: 'not_started'
            })

            toast({
                title: 'Checkpoint Created! 🛡️',
                description: `"${title}" has been added to the project pipeline.`
            })

            // Reset form
            setTitle('')
            setDescription('')
            setDueDate('')
            onOpenChange(false)
            onSuccess()
        } catch (error: any) {
            console.error('Failed to create checkpoint', error)
            toast({
                title: 'Error',
                description: error.response?.data?.message || 'Failed to create checkpoint.',
                variant: 'destructive'
            })
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[520px] font-sans">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle className="text-lg font-bold flex items-center gap-2">
                            <Shield className="h-5 w-5 text-primary" /> Add Project Checkpoint
                        </DialogTitle>
                        <DialogDescription className="text-xs font-medium">
                            Create a custom workflow checkpoint with verification rules & deadline.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 py-4 text-xs font-medium">
                        <div className="space-y-1.5">
                            <Label className="font-bold">Checkpoint Title <span className="text-red-500">*</span></Label>
                            <Input
                                placeholder="e.g. SSL Certificate & Domain Configuration"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                required
                                className="h-9 font-semibold text-xs"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label className="font-bold">Project Phase</Label>
                                <Select value={phase} onValueChange={setPhase}>
                                    <SelectTrigger className="h-9 font-bold text-xs">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Phase 1: Setup" className="font-bold text-xs">Phase 1: Setup</SelectItem>
                                        <SelectItem value="Phase 2: Development" className="font-bold text-xs">Phase 2: Development</SelectItem>
                                        <SelectItem value="Phase 3: QA & Testing" className="font-bold text-xs">Phase 3: QA & Testing</SelectItem>
                                        <SelectItem value="Phase 4: Deployment & Go-Live" className="font-bold text-xs">Phase 4: Go-Live</SelectItem>
                                        <SelectItem value="custom" className="font-bold text-xs">Custom Phase...</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-1.5">
                                <Label className="font-bold">Priority</Label>
                                <Select value={priority} onValueChange={(v: any) => setPriority(v)}>
                                    <SelectTrigger className="h-9 font-bold text-xs">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="low" className="font-bold text-xs text-gray-600">Low</SelectItem>
                                        <SelectItem value="medium" className="font-bold text-xs text-blue-600">Medium</SelectItem>
                                        <SelectItem value="high" className="font-bold text-xs text-amber-600">High</SelectItem>
                                        <SelectItem value="urgent" className="font-bold text-xs text-red-600">Urgent</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {phase === 'custom' && (
                            <div className="space-y-1.5">
                                <Label className="font-bold">Custom Phase Name</Label>
                                <Input
                                    placeholder="e.g. Phase 5: Client Training"
                                    value={customPhase}
                                    onChange={(e) => setCustomPhase(e.target.value)}
                                    className="h-9 font-semibold text-xs"
                                />
                            </div>
                        )}

                        <div className="space-y-1.5">
                            <Label className="font-bold">Target Due Date</Label>
                            <Input
                                type="date"
                                value={dueDate}
                                onChange={(e) => setDueDate(e.target.value)}
                                className="h-9 text-xs font-semibold"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3 pt-2 border-t">
                            <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
                                <div>
                                    <Label className="font-bold block text-xs">Mandatory Step?</Label>
                                    <span className="text-[10px] text-muted-foreground">Required for project completion</span>
                                </div>
                                <Switch checked={isMandatory} onCheckedChange={setIsMandatory} />
                            </div>

                            <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
                                <div>
                                    <Label className="font-bold block text-xs">Proof Required?</Label>
                                    <span className="text-[10px] text-muted-foreground">Requires proof before completion</span>
                                </div>
                                <Switch checked={proofRequired} onCheckedChange={setProofRequired} />
                            </div>
                        </div>

                        {proofRequired && (
                            <div className="space-y-1.5 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                                <Label className="font-bold text-blue-700 dark:text-blue-300">Required Proof Type</Label>
                                <Select value={proofType} onValueChange={setProofType}>
                                    <SelectTrigger className="h-9 bg-card font-bold text-xs">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="any" className="font-bold text-xs">Any Proof (URL / File / Ref)</SelectItem>
                                        <SelectItem value="url" className="font-bold text-xs">Production / Demo URL</SelectItem>
                                        <SelectItem value="build_file" className="font-bold text-xs">APK / Build File Upload</SelectItem>
                                        <SelectItem value="screenshot" className="font-bold text-xs">Screenshot / Image</SelectItem>
                                        <SelectItem value="transaction_ref" className="font-bold text-xs">Transaction Reference</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        <div className="space-y-1.5">
                            <Label className="font-bold">Instructions / Verification Criteria</Label>
                            <Textarea
                                placeholder="Details or acceptance criteria for completing this step..."
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                rows={2}
                                className="text-xs"
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="h-9 text-xs font-bold">
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading || !title.trim()} className="h-9 text-xs font-bold gap-1">
                            <Plus className="h-3.5 w-3.5" /> {loading ? 'Creating...' : 'Create Checkpoint'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
