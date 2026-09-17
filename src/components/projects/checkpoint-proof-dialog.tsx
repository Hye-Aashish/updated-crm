import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { CheckCircle2, Link, FileUp, Hash, CreditCard } from 'lucide-react'
import type { ProjectCheckpoint } from '@/types'

interface CheckpointProofDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    checkpoint: ProjectCheckpoint | null
    onSubmitProof: (proofData: {
        proofUrl?: string
        proofFile?: string
        proofVersion?: string
        proofRef?: string
        remarks?: string
    }) => Promise<void>
}

export function CheckpointProofDialog({ open, onOpenChange, checkpoint, onSubmitProof }: CheckpointProofDialogProps) {
    const [proofUrl, setProofUrl] = useState('')
    const [proofFile, setProofFile] = useState('')
    const [proofVersion, setProofVersion] = useState('')
    const [proofRef, setProofRef] = useState('')
    const [remarks, setRemarks] = useState('')
    const [submitting, setSubmitting] = useState(false)

    if (!checkpoint) return null

    const handleSubmit = async () => {
        setSubmitting(true)
        try {
            await onSubmitProof({
                proofUrl: proofUrl.trim() || undefined,
                proofFile: proofFile.trim() || undefined,
                proofVersion: proofVersion.trim() || undefined,
                proofRef: proofRef.trim() || undefined,
                remarks: remarks.trim() || undefined
            })
            setProofUrl('')
            setProofFile('')
            setProofVersion('')
            setProofRef('')
            setRemarks('')
            onOpenChange(false)
        } catch (err) {
            console.error(err)
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md rounded-xl font-sans">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-lg font-bold">
                        <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                        Complete Checkpoint & Submit Proof
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    <div className="p-3 bg-muted/40 rounded-lg border border-border/50 text-xs space-y-1">
                        <p className="font-bold text-foreground">{checkpoint.title}</p>
                        <p className="text-muted-foreground">{checkpoint.phase} • Mandatory: {checkpoint.isMandatory ? 'Yes' : 'No'}</p>
                        {checkpoint.proofRequired && (
                            <p className="text-amber-600 dark:text-amber-400 font-semibold">
                                ⚠️ Proof required: {checkpoint.proofType?.toUpperCase()}
                            </p>
                        )}
                    </div>

                    {(checkpoint.proofType === 'url' || checkpoint.proofType === 'any') && (
                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold flex items-center gap-1.5">
                                <Link className="h-3.5 w-3.5 text-primary" /> Live URL / Link
                            </Label>
                            <Input
                                placeholder="https://..."
                                value={proofUrl}
                                onChange={(e) => setProofUrl(e.target.value)}
                                className="h-9 text-xs"
                            />
                        </div>
                    )}

                    {(checkpoint.proofType === 'build_file' || checkpoint.proofType === 'any') && (
                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold flex items-center gap-1.5">
                                <FileUp className="h-3.5 w-3.5 text-primary" /> Build / APK File Link
                            </Label>
                            <Input
                                placeholder="Drive / Cloud URL or File Name"
                                value={proofFile}
                                onChange={(e) => setProofFile(e.target.value)}
                                className="h-9 text-xs"
                            />
                        </div>
                    )}

                    {(checkpoint.proofType === 'version' || checkpoint.proofType === 'any') && (
                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold flex items-center gap-1.5">
                                <Hash className="h-3.5 w-3.5 text-primary" /> Version & Build Number
                            </Label>
                            <Input
                                placeholder="e.g. v1.0.4 (Build 42)"
                                value={proofVersion}
                                onChange={(e) => setProofVersion(e.target.value)}
                                className="h-9 text-xs"
                            />
                        </div>
                    )}

                    {(checkpoint.proofType === 'transaction_ref' || checkpoint.proofType === 'any') && (
                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold flex items-center gap-1.5">
                                <CreditCard className="h-3.5 w-3.5 text-primary" /> Transaction / UTR Ref
                            </Label>
                            <Input
                                placeholder="e.g. UTR987654321"
                                value={proofRef}
                                onChange={(e) => setProofRef(e.target.value)}
                                className="h-9 text-xs"
                            />
                        </div>
                    )}

                    <div className="space-y-1.5">
                        <Label className="text-xs font-bold">Remarks / Notes</Label>
                        <Textarea
                            placeholder="Add developer remarks or verification notes..."
                            value={remarks}
                            onChange={(e) => setRemarks(e.target.value)}
                            className="min-h-[70px] text-xs"
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button size="sm" onClick={handleSubmit} disabled={submitting} className="font-bold">
                        {submitting ? 'Submitting...' : 'Submit & Mark Completed'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
