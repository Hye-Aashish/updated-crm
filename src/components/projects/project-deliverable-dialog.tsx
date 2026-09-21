import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Globe, Smartphone } from 'lucide-react'
import api from '@/lib/api-client'
import { useToast } from '@/hooks/use-toast'
import { mapProject } from '@/lib/mappers'
import type { Project } from '@/types'

interface ProjectDeliverableDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    project: Project
    type: 'website' | 'android' | 'ios'
    onSuccess: (updated: Project) => void
}

export function ProjectDeliverableDialog({
    open,
    onOpenChange,
    project,
    type,
    onSuccess
}: ProjectDeliverableDialogProps) {
    const { toast } = useToast()
    const [loading, setLoading] = useState(false)

    // Form state
    const [websiteStatus, setWebsiteStatus] = useState(project.websiteStatus || 'not-started')
    const [domain, setDomain] = useState(project.domain || '')
    const [productionUrl, setProductionUrl] = useState(project.productionUrl || project.websiteUrl || '')
    const [stagingUrl, setStagingUrl] = useState(project.stagingUrl || '')

    const [androidStatus, setAndroidStatus] = useState(project.androidStatus || 'not-started')
    const [androidVersion, setAndroidVersion] = useState(project.androidVersion || 'v1.0.0')
    const [androidAppUrl, setAndroidAppUrl] = useState(project.androidAppUrl || '')

    const [iosStatus, setIosStatus] = useState(project.iosStatus || 'not-started')
    const [iosVersion, setIosVersion] = useState(project.iosVersion || 'v1.0.0')
    const [iosAppUrl, setIosAppUrl] = useState(project.iosAppUrl || '')

    useEffect(() => {
        if (open) {
            setWebsiteStatus(project.websiteStatus || 'not-started')
            setDomain(project.domain || '')
            setProductionUrl(project.productionUrl || project.websiteUrl || '')
            setStagingUrl(project.stagingUrl || '')

            setAndroidStatus(project.androidStatus || 'not-started')
            setAndroidVersion(project.androidVersion || 'v1.0.0')
            setAndroidAppUrl(project.androidAppUrl || '')

            setIosStatus(project.iosStatus || 'not-started')
            setIosVersion(project.iosVersion || 'v1.0.0')
            setIosAppUrl(project.iosAppUrl || '')
        }
    }, [open, project])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        const pId = project.id || (project as any)._id
        let payload: any = {}

        if (type === 'website') {
            payload = {
                websiteStatus,
                domain: domain.trim(),
                productionUrl: productionUrl.trim(),
                websiteUrl: productionUrl.trim(),
                stagingUrl: stagingUrl.trim()
            }
        } else if (type === 'android') {
            payload = {
                androidStatus,
                androidVersion: androidVersion.trim(),
                androidAppUrl: androidAppUrl.trim()
            }
        } else if (type === 'ios') {
            payload = {
                iosStatus,
                iosVersion: iosVersion.trim(),
                iosAppUrl: iosAppUrl.trim()
            }
        }

        try {
            const res = await api.put(`/projects/${pId}`, payload)
            const updated = mapProject(res.data)

            toast({
                title: 'Updated Successfully! 🚀',
                description: `${type.toUpperCase()} deployment details updated.`
            })

            onOpenChange(false)
            onSuccess(updated)
        } catch (error: any) {
            console.error('Failed to update deliverable', error)
            toast({
                title: 'Error',
                description: error.response?.data?.message || 'Failed to update details.',
                variant: 'destructive'
            })
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[480px] font-sans">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle className="text-lg font-bold flex items-center gap-2">
                            {type === 'website' ? (
                                <>
                                    <Globe className="h-5 w-5 text-blue-500" /> Edit Website Details & URLs
                                </>
                            ) : type === 'android' ? (
                                <>
                                    <Smartphone className="h-5 w-5 text-emerald-500" /> Edit Android App Details
                                </>
                            ) : (
                                <>
                                    <Smartphone className="h-5 w-5 text-purple-500" /> Edit iOS App Details
                                </>
                            )}
                        </DialogTitle>
                        <DialogDescription className="text-xs font-medium">
                            Update live production links, domain settings, and deployment status.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 py-4 text-xs font-medium">
                        {type === 'website' && (
                            <>
                                <div className="space-y-1.5">
                                    <Label className="font-bold">Website Deployment Status</Label>
                                    <Select value={websiteStatus} onValueChange={(val: any) => setWebsiteStatus(val)}>
                                        <SelectTrigger className="h-9 font-bold">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="not-started">⏳ Not Started</SelectItem>
                                            <SelectItem value="development">💻 In Development</SelectItem>
                                            <SelectItem value="testing">🧪 Testing & QA</SelectItem>
                                            <SelectItem value="ready">✅ Ready for Deployment</SelectItem>
                                            <SelectItem value="live">🚀 Live & Production</SelectItem>
                                            <SelectItem value="down">⚠️ Maintenance / Down</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="font-bold">Domain Name</Label>
                                    <Input
                                        placeholder="e.g. acmeacademy.com"
                                        value={domain}
                                        onChange={(e) => setDomain(e.target.value)}
                                        className="h-9 font-semibold"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="font-bold">Production URL (Live Link)</Label>
                                    <Input
                                        placeholder="e.g. https://www.acmeacademy.com"
                                        value={productionUrl}
                                        onChange={(e) => setProductionUrl(e.target.value)}
                                        className="h-9 font-semibold text-primary"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="font-bold">Staging / Demo Link (Optional)</Label>
                                    <Input
                                        placeholder="e.g. https://staging.acmeacademy.com"
                                        value={stagingUrl}
                                        onChange={(e) => setStagingUrl(e.target.value)}
                                        className="h-9 font-semibold text-muted-foreground"
                                    />
                                </div>
                            </>
                        )}

                        {type === 'android' && (
                            <>
                                <div className="space-y-1.5">
                                    <Label className="font-bold">Android Release Status</Label>
                                    <Select value={androidStatus} onValueChange={(val: any) => setAndroidStatus(val)}>
                                        <SelectTrigger className="h-9 font-bold">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="not-started">⏳ Not Started</SelectItem>
                                            <SelectItem value="development">💻 Development</SelectItem>
                                            <SelectItem value="build-generated">📦 Build Generated</SelectItem>
                                            <SelectItem value="testing">🧪 Internal Testing</SelectItem>
                                            <SelectItem value="submitted">🚀 Submitted to Play Store</SelectItem>
                                            <SelectItem value="live">🟢 Live on Play Store</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="font-bold">App Version</Label>
                                    <Input
                                        placeholder="e.g. v1.0.0"
                                        value={androidVersion}
                                        onChange={(e) => setAndroidVersion(e.target.value)}
                                        className="h-9 font-semibold"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="font-bold">Play Store URL / APK Download Link</Label>
                                    <Input
                                        placeholder="e.g. https://play.google.com/store/apps/details?id=com.acme.app"
                                        value={androidAppUrl}
                                        onChange={(e) => setAndroidAppUrl(e.target.value)}
                                        className="h-9 font-semibold text-primary"
                                    />
                                </div>
                            </>
                        )}

                        {type === 'ios' && (
                            <>
                                <div className="space-y-1.5">
                                    <Label className="font-bold">iOS Release Status</Label>
                                    <Select value={iosStatus} onValueChange={(val: any) => setIosStatus(val)}>
                                        <SelectTrigger className="h-9 font-bold">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="not-started">⏳ Not Started</SelectItem>
                                            <SelectItem value="development">💻 Development</SelectItem>
                                            <SelectItem value="build-generated">📦 Build Generated</SelectItem>
                                            <SelectItem value="testing">🧪 TestFlight Testing</SelectItem>
                                            <SelectItem value="submitted">🚀 Submitted to App Store</SelectItem>
                                            <SelectItem value="live">🟢 Live on App Store</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="font-bold">App Version</Label>
                                    <Input
                                        placeholder="e.g. v1.0.0"
                                        value={iosVersion}
                                        onChange={(e) => setIosVersion(e.target.value)}
                                        className="h-9 font-semibold"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="font-bold">App Store URL / TestFlight Link</Label>
                                    <Input
                                        placeholder="e.g. https://apps.apple.com/app/id123456789"
                                        value={iosAppUrl}
                                        onChange={(e) => setIosAppUrl(e.target.value)}
                                        className="h-9 font-semibold text-primary"
                                    />
                                </div>
                            </>
                        )}
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="h-9 text-xs font-bold">
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading} className="h-9 text-xs font-bold">
                            {loading ? 'Saving Changes...' : 'Save Changes'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
