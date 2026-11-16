import { useEffect, useState } from 'react'
import api from '@/lib/api-client'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select'
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog'
import { PageSkeleton } from '@/components/ui/page-skeleton'
import { useToast } from '@/hooks/use-toast'
import { format } from 'date-fns'
import { BookOpen, Plus, Search, Pin, Trash2, Eye, Edit } from 'lucide-react'

type Article = {
    _id: string
    title: string
    category: string
    tags?: string[]
    summary?: string
    content?: string
    status: string
    isPinned?: boolean
    views?: number
    updatedAt: string
    createdBy?: { name?: string }
}

const CATEGORIES = ['sop', 'onboarding', 'delivery', 'sales', 'support', 'finance', 'hr', 'general']

const emptyForm = {
    title: '',
    category: 'sop',
    summary: '',
    content: '',
    tags: '',
    status: 'published',
    isPinned: false
}

export function KnowledgeBasePage() {
    const { toast } = useToast()
    const [articles, setArticles] = useState<Article[]>([])
    const [loading, setLoading] = useState(true)
    const [q, setQ] = useState('')
    const [category, setCategory] = useState('all')
    const [open, setOpen] = useState(false)
    const [viewOpen, setViewOpen] = useState(false)
    const [editing, setEditing] = useState<Article | null>(null)
    const [viewing, setViewing] = useState<Article | null>(null)
    const [form, setForm] = useState(emptyForm)
    const [saving, setSaving] = useState(false)

    const load = async () => {
        setLoading(true)
        try {
            const params: Record<string, string> = {}
            if (category !== 'all') params.category = category
            if (q.trim()) params.q = q.trim()
            const res = await api.get('/knowledge', { params })
            setArticles(res.data || [])
        } catch (err: any) {
            toast({ title: 'Error', description: err?.response?.data?.message || 'Failed to load', variant: 'destructive' })
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { load() }, [category])

    const openCreate = () => {
        setEditing(null)
        setForm(emptyForm)
        setOpen(true)
    }

    const openEdit = async (article: Article) => {
        try {
            const res = await api.get(`/knowledge/${article._id}`)
            const a = res.data
            setEditing(a)
            setForm({
                title: a.title || '',
                category: a.category || 'general',
                summary: a.summary || '',
                content: a.content || '',
                tags: (a.tags || []).join(', '),
                status: a.status || 'published',
                isPinned: Boolean(a.isPinned)
            })
            setOpen(true)
        } catch {
            toast({ title: 'Error', description: 'Could not open article', variant: 'destructive' })
        }
    }

    const openView = async (article: Article) => {
        try {
            const res = await api.get(`/knowledge/${article._id}`)
            setViewing(res.data)
            setViewOpen(true)
            load()
        } catch {
            toast({ title: 'Error', description: 'Could not open article', variant: 'destructive' })
        }
    }

    const save = async () => {
        if (!form.title.trim() || !form.content.trim()) {
            toast({ title: 'Missing fields', description: 'Title and content required', variant: 'destructive' })
            return
        }
        setSaving(true)
        try {
            const payload = {
                title: form.title.trim(),
                category: form.category,
                summary: form.summary,
                content: form.content,
                tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
                status: form.status,
                isPinned: form.isPinned
            }
            if (editing) {
                await api.put(`/knowledge/${editing._id}`, payload)
                toast({ title: 'Article updated' })
            } else {
                await api.post('/knowledge', payload)
                toast({ title: 'Article published' })
            }
            setOpen(false)
            load()
        } catch (err: any) {
            toast({ title: 'Error', description: err?.response?.data?.message || 'Save failed', variant: 'destructive' })
        } finally {
            setSaving(false)
        }
    }

    const remove = async (id: string) => {
        if (!confirm('Delete this article?')) return
        try {
            await api.delete(`/knowledge/${id}`)
            toast({ title: 'Deleted' })
            load()
        } catch (err: any) {
            toast({ title: 'Error', description: err?.response?.data?.message || 'Delete failed', variant: 'destructive' })
        }
    }

    if (loading && articles.length === 0) return <PageSkeleton />

    return (
        <div className="space-y-6 p-4 sm:p-6 max-w-5xl mx-auto">
            <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                        <BookOpen className="h-6 w-6 text-primary" /> Knowledge Base / SOP
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        SOPs, onboarding guides, delivery checklists for the team
                    </p>
                </div>
                <Button size="sm" onClick={openCreate} className="gap-1.5">
                    <Plus className="h-3.5 w-3.5" /> New Article
                </Button>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        className="pl-9"
                        placeholder="Search SOPs…"
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') load() }}
                    />
                </div>
                <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger className="w-full sm:w-44"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All categories</SelectItem>
                        {CATEGORIES.map((c) => (
                            <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <Button variant="outline" onClick={load}>Search</Button>
            </div>

            <div className="grid gap-3">
                {articles.map((a) => (
                    <Card key={a._id} className="rounded-2xl border-border/60 hover:border-primary/30 transition-colors">
                        <CardContent className="p-4 flex gap-3 justify-between">
                            <button type="button" className="text-left min-w-0 flex-1 space-y-1" onClick={() => openView(a)}>
                                <div className="flex items-center gap-2 flex-wrap">
                                    {a.isPinned && <Pin className="h-3.5 w-3.5 text-amber-500" />}
                                    <p className="font-bold text-base">{a.title}</p>
                                    <Badge variant="secondary" className="text-[10px] uppercase font-bold">{a.category}</Badge>
                                </div>
                                {a.summary && <p className="text-xs text-muted-foreground line-clamp-2">{a.summary}</p>}
                                <p className="text-[10px] text-muted-foreground">
                                    Updated {format(new Date(a.updatedAt), 'dd MMM yyyy')}
                                    {a.views != null ? ` · ${a.views} views` : ''}
                                    {a.createdBy?.name ? ` · ${a.createdBy.name}` : ''}
                                </p>
                            </button>
                            <div className="flex flex-col gap-1 shrink-0">
                                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openView(a)}>
                                    <Eye className="h-3.5 w-3.5" />
                                </Button>
                                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(a)}>
                                    <Edit className="h-3.5 w-3.5" />
                                </Button>
                                <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => remove(a._id)}>
                                    <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ))}
                {articles.length === 0 && (
                    <div className="py-16 text-center text-muted-foreground border border-dashed rounded-2xl">
                        No articles yet. Add your first SOP.
                    </div>
                )}
            </div>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="max-w-2xl rounded-2xl max-h-[92vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{editing ? 'Edit Article' : 'New Article'}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3 py-2">
                        <div className="space-y-1.5">
                            <Label>Title</Label>
                            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label>Category</Label>
                                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {CATEGORIES.map((c) => (
                                            <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <Label>Status</Label>
                                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="published">Published</SelectItem>
                                        <SelectItem value="draft">Draft</SelectItem>
                                        <SelectItem value="archived">Archived</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <Label>Summary</Label>
                            <Input value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} />
                        </div>
                        <div className="space-y-1.5">
                            <Label>Tags (comma separated)</Label>
                            <Input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="handover, checklist" />
                        </div>
                        <div className="space-y-1.5">
                            <Label>Content</Label>
                            <Textarea
                                value={form.content}
                                onChange={(e) => setForm({ ...form, content: e.target.value })}
                                rows={12}
                                className="font-mono text-sm"
                                placeholder="Write the SOP steps here…"
                            />
                        </div>
                        <label className="flex items-center gap-2 text-sm font-medium">
                            <input
                                type="checkbox"
                                checked={form.isPinned}
                                onChange={(e) => setForm({ ...form, isPinned: e.target.checked })}
                            />
                            Pin to top
                        </label>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                        <Button onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={viewOpen} onOpenChange={setViewOpen}>
                <DialogContent className="max-w-2xl rounded-2xl max-h-[92vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="pr-6">{viewing?.title}</DialogTitle>
                    </DialogHeader>
                    {viewing && (
                        <div className="space-y-3">
                            <div className="flex gap-2 flex-wrap">
                                <Badge variant="secondary" className="uppercase text-[10px] font-bold">{viewing.category}</Badge>
                                {(viewing.tags || []).map((t) => (
                                    <Badge key={t} variant="outline" className="text-[10px]">{t}</Badge>
                                ))}
                            </div>
                            {viewing.summary && <p className="text-sm text-muted-foreground">{viewing.summary}</p>}
                            <pre className="whitespace-pre-wrap text-sm leading-relaxed font-sans bg-muted/30 rounded-xl p-4 border border-border/40">
                                {viewing.content}
                            </pre>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    )
}

export default KnowledgeBasePage
