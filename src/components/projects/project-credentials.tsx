import { useState } from 'react'
import { useAppStore } from '@/store'
import api from '@/lib/api-client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Trash2, Edit2, Plus, Eye, EyeOff, ExternalLink, Copy } from 'lucide-react'
import { mapProject } from '@/lib/mappers'

const CREDENTIAL_TYPES = [
    { value: 'website', label: 'Website' },
    { value: 'application', label: 'Application' },
    { value: 'database', label: 'Database' },
    { value: 'server', label: 'Server / Hosting' },
    { value: 'other', label: 'Other' },
]

export function ProjectCredentials({ projectId }: { projectId: string }) {
    const { projects, setProjects, currentUser } = useAppStore()
    const project = projects.find(p => p.id === projectId)
    
    const [isFormOpen, setIsFormOpen] = useState(false)
    const [editingCredId, setEditingCredId] = useState<string | null>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)
    
    const [formData, setFormData] = useState({
        title: '',
        type: 'website',
        url: '',
        username: '',
        password: ''
    })

    const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({})

    if (!project) return null

    const credentials = project.credentials || []
    const isClient = currentUser?.role === 'client'

    const resetForm = () => {
        setFormData({ title: '', type: 'website', url: '', username: '', password: '' })
        setIsFormOpen(false)
        setEditingCredId(null)
    }

    const togglePasswordVisibility = (id: string) => {
        setVisiblePasswords(prev => ({ ...prev, [id]: !prev[id] }))
    }

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text)
    }

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!formData.title || !formData.username || isSubmitting) return
        
        setIsSubmitting(true)
        try {
            if (editingCredId) {
                // Update
                const payload: any = { ...formData }
                if (!payload.password) delete payload.password // Don't send empty password if not changed
                
                const res = await api.put(`/projects/${projectId}/credentials/${editingCredId}`, payload)
                setProjects(projects.map(p => p.id === projectId ? mapProject(res.data) : p))
            } else {
                // Create
                if (!formData.password) return // Password required on create
                const res = await api.post(`/projects/${projectId}/credentials`, formData)
                setProjects(projects.map(p => p.id === projectId ? mapProject(res.data) : p))
            }
            resetForm()
        } catch (error) {
            console.error('Failed to save credential', error)
            alert('Failed to save credential.')
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        const uploadData = new FormData()
        uploadData.append('file', file)

        setIsSubmitting(true)
        try {
            const res = await api.post('/files/upload', uploadData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            })
            setFormData(prev => ({ ...prev, url: res.data.url }))
        } catch (error) {
            console.error('File upload failed', error)
            alert('Failed to upload the application file.')
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleDelete = async (credId: string) => {
        if (!window.confirm('Are you sure you want to delete this credential?')) return
        try {
            const res = await api.delete(`/projects/${projectId}/credentials/${credId}`)
            setProjects(projects.map(p => p.id === projectId ? mapProject(res.data) : p))
        } catch (error) {
            console.error('Failed to delete credential', error)
            alert('Failed to delete credential.')
        }
    }

    const canManageCred = (creatorId: string) => {
        if (isClient) return false
        if (currentUser?.role === 'admin' || currentUser?.role === 'owner') return true
        return currentUser?.id === creatorId
    }

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Project Credentials</CardTitle>
                {!isClient && !isFormOpen && (
                    <Button onClick={() => setIsFormOpen(true)} size="sm">
                        <Plus className="w-4 h-4 mr-2" />
                        Add Credential
                    </Button>
                )}
            </CardHeader>
            <CardContent className="space-y-6">
                {isFormOpen && (
                    <div className="p-4 border rounded-lg bg-muted/30">
                        <form onSubmit={handleSave} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Title *</Label>
                                    <Input 
                                        required 
                                        placeholder="e.g. WordPress Admin" 
                                        value={formData.title}
                                        onChange={e => setFormData({...formData, title: e.target.value})}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Type</Label>
                                    <Select value={formData.type} onValueChange={v => setFormData({...formData, type: v})}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            {CREDENTIAL_TYPES.map(t => (
                                                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2 col-span-2">
                                    <Label>{formData.type === 'application' ? 'Application File (Optional)' : 'URL (Optional)'}</Label>
                                    {formData.type === 'application' ? (
                                        <div className="flex gap-2 items-center">
                                            <Input 
                                                type="file" 
                                                onChange={handleFileUpload}
                                                disabled={isSubmitting}
                                            />
                                            {formData.url && <span className="text-sm text-green-600 font-medium">Uploaded</span>}
                                        </div>
                                    ) : (
                                        <Input 
                                            placeholder="https://..." 
                                            type="url"
                                            value={formData.url}
                                            onChange={e => setFormData({...formData, url: e.target.value})}
                                        />
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <Label>Username / Email *</Label>
                                    <Input 
                                        required 
                                        value={formData.username}
                                        onChange={e => setFormData({...formData, username: e.target.value})}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Password {editingCredId ? '(Leave blank to keep unchanged)' : '*'}</Label>
                                    <Input 
                                        required={!editingCredId}
                                        type="text" 
                                        value={formData.password}
                                        onChange={e => setFormData({...formData, password: e.target.value})}
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end gap-2 pt-2">
                                <Button type="button" variant="outline" onClick={resetForm}>
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={isSubmitting}>
                                    {editingCredId ? 'Update' : 'Save'} Credential
                                </Button>
                            </div>
                        </form>
                    </div>
                )}

                <div className="grid gap-4 md:grid-cols-2">
                    {credentials.length === 0 && !isFormOpen ? (
                        <p className="col-span-full text-center text-muted-foreground py-8">
                            No credentials have been added yet.
                        </p>
                    ) : (
                        credentials.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map(cred => (
                            <div key={cred._id} className="p-4 rounded-lg border bg-card relative group">
                                <div className="flex justify-between items-start mb-3">
                                    <div>
                                        <h4 className="font-semibold">{cred.title}</h4>
                                        <div className="text-xs text-muted-foreground mt-0.5 capitalize">
                                            {cred.type}
                                        </div>
                                    </div>
                                    {canManageCred(cred.createdBy) && (
                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                className="h-7 w-7 text-muted-foreground"
                                                onClick={() => {
                                                    setFormData({
                                                        title: cred.title,
                                                        type: cred.type,
                                                        url: cred.url || '',
                                                        username: cred.username,
                                                        password: '' // Keep empty
                                                    })
                                                    setEditingCredId(cred._id)
                                                    setIsFormOpen(true)
                                                }}
                                            >
                                                <Edit2 className="h-3.5 w-3.5" />
                                            </Button>
                                            <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                className="h-7 w-7 text-red-500"
                                                onClick={() => handleDelete(cred._id)}
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </Button>
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-2 text-sm">
                                    {cred.url && (
                                        <div className="flex items-center gap-2">
                                            <span className="text-muted-foreground w-20">
                                                {cred.type === 'application' ? 'File:' : 'URL:'}
                                            </span>
                                            <a href={cred.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate flex items-center gap-1">
                                                {cred.type === 'application' ? 'Download Application' : cred.url} <ExternalLink className="w-3 h-3" />
                                            </a>
                                        </div>
                                    )}
                                    <div className="flex items-center gap-2 group/copy">
                                        <span className="text-muted-foreground w-20">Username:</span>
                                        <span className="font-medium truncate flex-1">{cred.username}</span>
                                        <Button variant="ghost" size="icon" className="h-5 w-5 opacity-0 group-hover/copy:opacity-100" onClick={() => copyToClipboard(cred.username)}>
                                            <Copy className="h-3 w-3" />
                                        </Button>
                                    </div>
                                    <div className="flex items-center gap-2 group/copy">
                                        <span className="text-muted-foreground w-20">Password:</span>
                                        <span className="font-mono flex-1">
                                            {visiblePasswords[cred._id] ? cred.password : '••••••••••••'}
                                        </span>
                                        <div className="flex gap-1 opacity-0 group-hover/copy:opacity-100">
                                            <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => togglePasswordVisibility(cred._id)}>
                                                {visiblePasswords[cred._id] ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => copyToClipboard(cred.password || '')}>
                                                <Copy className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </CardContent>
        </Card>
    )
}
