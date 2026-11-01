import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { FileSignature, FolderOpen, Loader2, ExternalLink } from 'lucide-react'
import api from '@/lib/api-client'

export default function ContractsVaultPage() {
    const [loading, setLoading] = useState(true)
    const [approvals, setApprovals] = useState<any[]>([])
    const [files, setFiles] = useState<any[]>([])

    useEffect(() => {
        Promise.all([
            api.get('/approvals').catch(() => ({ data: [] })),
            api.get('/files').catch(() => ({ data: [] })),
        ]).then(([a, f]) => {
            setApprovals(Array.isArray(a.data) ? a.data : a.data?.approvals || [])
            const allFiles = Array.isArray(f.data) ? f.data : f.data?.files || []
            setFiles(allFiles.filter((x: any) =>
                /contract|nda|msa|agreement|legal/i.test(`${x.name || ''} ${x.folder || ''} ${x.tags || ''}`)
            ).slice(0, 40))
        }).finally(() => setLoading(false))
    }, [])

    if (loading) {
        return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
    }

    return (
        <div className="space-y-6 max-w-5xl mx-auto min-w-0">
            <div>
                <h1 className="text-xl font-extrabold tracking-tight">Contract & E-Sign Vault</h1>
                <p className="text-sm text-muted-foreground">Unified view of approvals and contract-like files (reuses existing modules)</p>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
                <Card>
                    <CardHeader className="pb-3 flex-row items-center justify-between space-y-0">
                        <CardTitle className="text-base flex items-center gap-2"><FileSignature className="h-4 w-4" /> Approvals / E-Sign</CardTitle>
                        <Button asChild variant="outline" size="sm"><Link to="/approvals">Open</Link></Button>
                    </CardHeader>
                    <CardContent className="space-y-2 max-h-[420px] overflow-y-auto">
                        {approvals.length === 0 && <p className="text-sm text-muted-foreground">No approvals yet.</p>}
                        {approvals.slice(0, 30).map((a: any) => (
                            <div key={a._id || a.id} className="p-3 rounded-xl border flex items-center justify-between gap-2">
                                <div className="min-w-0">
                                    <p className="text-sm font-bold truncate">{a.title || a.name || 'Approval'}</p>
                                    <p className="text-[11px] text-muted-foreground truncate">{a.projectName || a.clientName || ''}</p>
                                </div>
                                <Badge variant="secondary">{a.status || 'pending'}</Badge>
                            </div>
                        ))}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-3 flex-row items-center justify-between space-y-0">
                        <CardTitle className="text-base flex items-center gap-2"><FolderOpen className="h-4 w-4" /> Contract Files</CardTitle>
                        <Button asChild variant="outline" size="sm"><Link to="/files">Files</Link></Button>
                    </CardHeader>
                    <CardContent className="space-y-2 max-h-[420px] overflow-y-auto">
                        {files.length === 0 && <p className="text-sm text-muted-foreground">No contract-tagged files found. Upload under Files with “contract/NDA/MSA” in the name.</p>}
                        {files.map((f: any) => (
                            <div key={f._id || f.id} className="p-3 rounded-xl border flex items-center justify-between gap-2">
                                <p className="text-sm font-semibold truncate">{f.name}</p>
                                {f.url || f.fileUrl ? (
                                    <a href={f.url || f.fileUrl} target="_blank" rel="noreferrer" className="text-primary">
                                        <ExternalLink className="h-4 w-4" />
                                    </a>
                                ) : null}
                            </div>
                        ))}
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
