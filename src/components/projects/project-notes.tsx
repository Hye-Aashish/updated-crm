import { useState } from 'react'
import { useAppStore } from '@/store'
import api from '@/lib/api-client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Trash2, Edit2, Send, X } from 'lucide-react'
import { mapProject } from '@/lib/mappers'

export function ProjectNotes({ projectId }: { projectId: string }) {
    const { projects, setProjects, currentUser } = useAppStore()
    const project = projects.find(p => p.id === projectId)
    const [noteText, setNoteText] = useState('')
    const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)

    if (!project) return null

    const notes = project.notes || []

    const handleAddNote = async () => {
        if (!noteText.trim() || isSubmitting) return
        setIsSubmitting(true)
        try {
            const res = await api.post(`/projects/${projectId}/notes`, { text: noteText })
            setProjects(projects.map(p => p.id === projectId ? mapProject(res.data) : p))
            setNoteText('')
        } catch (error) {
            console.error('Failed to add note', error)
            alert('Failed to add note.')
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleUpdateNote = async (noteId: string) => {
        if (!noteText.trim() || isSubmitting) return
        setIsSubmitting(true)
        try {
            const res = await api.put(`/projects/${projectId}/notes/${noteId}`, { text: noteText })
            setProjects(projects.map(p => p.id === projectId ? mapProject(res.data) : p))
            setEditingNoteId(null)
            setNoteText('')
        } catch (error) {
            console.error('Failed to update note', error)
            alert('Failed to update note.')
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleDeleteNote = async (noteId: string) => {
        if (!window.confirm('Are you sure you want to delete this note?')) return
        try {
            const res = await api.delete(`/projects/${projectId}/notes/${noteId}`)
            setProjects(projects.map(p => p.id === projectId ? mapProject(res.data) : p))
        } catch (error) {
            console.error('Failed to delete note', error)
            alert('Failed to delete note.')
        }
    }

    const canManageNote = (noteCreatorId: string) => {
        if (currentUser?.role === 'client') return false
        if (currentUser?.role === 'admin' || currentUser?.role === 'owner') return true
        return currentUser?.id === noteCreatorId
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Project Notes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                {currentUser?.role !== 'client' && !editingNoteId && (
                    <div className="space-y-3">
                        <Textarea 
                            placeholder="Type a new note here..." 
                            value={noteText}
                            onChange={(e) => setNoteText(e.target.value)}
                            className="min-h-[100px]"
                        />
                        <div className="flex justify-end">
                            <Button 
                                onClick={handleAddNote} 
                                disabled={!noteText.trim() || isSubmitting}
                            >
                                <Send className="w-4 h-4 mr-2" />
                                Add Note
                            </Button>
                        </div>
                    </div>
                )}

                <div className="space-y-4 mt-6">
                    {notes.length === 0 ? (
                        <p className="text-center text-muted-foreground py-8">No notes have been added to this project yet.</p>
                    ) : (
                        notes.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map(note => (
                            <div key={note._id} className="p-4 rounded-lg border bg-card">
                                {editingNoteId === note._id ? (
                                    <div className="space-y-3">
                                        <Textarea 
                                            value={noteText}
                                            onChange={(e) => setNoteText(e.target.value)}
                                            className="min-h-[100px]"
                                        />
                                        <div className="flex justify-end gap-2">
                                            <Button 
                                                variant="outline" 
                                                onClick={() => {
                                                    setEditingNoteId(null)
                                                    setNoteText('')
                                                }}
                                            >
                                                <X className="w-4 h-4 mr-2" />
                                                Cancel
                                            </Button>
                                            <Button 
                                                onClick={() => handleUpdateNote(note._id)} 
                                                disabled={!noteText.trim() || isSubmitting}
                                            >
                                                Save Changes
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="flex items-center gap-2">
                                                <div className="font-semibold text-sm">{note.creatorName || 'Unknown'}</div>
                                                <div className="text-xs text-muted-foreground">
                                                    {new Date(note.createdAt).toLocaleString()}
                                                </div>
                                            </div>
                                            {canManageNote(note.createdBy) && (
                                                <div className="flex gap-1">
                                                    <Button 
                                                        variant="ghost" 
                                                        size="icon" 
                                                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                                        onClick={() => {
                                                            setEditingNoteId(note._id)
                                                            setNoteText(note.text)
                                                        }}
                                                    >
                                                        <Edit2 className="h-4 w-4" />
                                                    </Button>
                                                    <Button 
                                                        variant="ghost" 
                                                        size="icon" 
                                                        className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                                                        onClick={() => handleDeleteNote(note._id)}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                        <p className="text-sm whitespace-pre-wrap">{note.text}</p>
                                    </>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </CardContent>
        </Card>
    )
}
