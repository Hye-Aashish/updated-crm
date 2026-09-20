import { useState, useEffect } from 'react'
import { StickyNote, Plus, Trash2, Copy, Check, X, Pin, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'

type Note = {
    id: string
    title: string
    content: string
    color: 'yellow' | 'blue' | 'green' | 'purple' | 'pink'
    updatedAt: string
    pinned?: boolean
}

const COLOR_MAP = {
    yellow: 'bg-amber-100/90 dark:bg-amber-950/80 border-amber-300/60 dark:border-amber-700/60 text-amber-950 dark:text-amber-100',
    blue: 'bg-blue-100/90 dark:bg-blue-950/80 border-blue-300/60 dark:border-blue-700/60 text-blue-950 dark:text-blue-100',
    green: 'bg-emerald-100/90 dark:bg-emerald-950/80 border-emerald-300/60 dark:border-emerald-700/60 text-emerald-950 dark:text-emerald-100',
    purple: 'bg-purple-100/90 dark:bg-purple-950/80 border-purple-300/60 dark:border-purple-700/60 text-purple-950 dark:text-purple-100',
    pink: 'bg-rose-100/90 dark:bg-rose-950/80 border-rose-300/60 dark:border-rose-700/60 text-rose-950 dark:text-rose-100',
}

export function QuickNotesWidget() {
    const { toast } = useToast()
    const [isOpen, setIsOpen] = useState(false)
    const [isHovered, setIsHovered] = useState(false)
    const [copiedId, setCopiedId] = useState<string | null>(null)

    const [notes, setNotes] = useState<Note[]>(() => {
        try {
            const saved = localStorage.getItem('admin_quick_notes')
            if (saved) return JSON.parse(saved)
        } catch (e) {
            console.error('Error reading quick notes', e)
        }
        return [
            {
                id: '1',
                title: 'Quick Scratchpad',
                content: 'Urgent reminders, client phone numbers, task IDs, or quick memos...',
                color: 'yellow',
                updatedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                pinned: true
            }
        ]
    })

    const [activeNoteId, setActiveNoteId] = useState<string>(notes[0]?.id || '1')

    // Save to localStorage whenever notes change
    useEffect(() => {
        try {
            localStorage.setItem('admin_quick_notes', JSON.stringify(notes))
        } catch (e) {
            console.error('Error saving quick notes', e)
        }
    }, [notes])

    const activeNote = notes.find(n => n.id === activeNoteId) || notes[0] || {
        id: '1', title: 'Quick Note', content: '', color: 'yellow', updatedAt: 'Just now'
    }

    const handleCreateNote = () => {
        const newNote: Note = {
            id: Date.now().toString(),
            title: `Note ${notes.length + 1}`,
            content: '',
            color: 'yellow',
            updatedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
        setNotes([newNote, ...notes])
        setActiveNoteId(newNote.id)
    }

    const handleUpdateNote = (id: string, updates: Partial<Note>) => {
        setNotes(notes.map(n => n.id === id ? {
            ...n,
            ...updates,
            updatedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        } : n))
    }

    const handleDeleteNote = (id: string) => {
        if (notes.length <= 1) {
            const resetNote: Note = {
                id: Date.now().toString(),
                title: 'Quick Note',
                content: '',
                color: 'yellow',
                updatedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }
            setNotes([resetNote])
            setActiveNoteId(resetNote.id)
            return
        }
        const updated = notes.filter(n => n.id !== id)
        setNotes(updated)
        if (activeNoteId === id) {
            setActiveNoteId(updated[0].id)
        }
    }

    const handleCopy = (text: string, id: string) => {
        if (!text) return
        navigator.clipboard.writeText(text)
        setCopiedId(id)
        toast({ description: "Quick note copied!" })
        setTimeout(() => setCopiedId(null), 2000)
    }

    const showCard = isOpen || isHovered

    return (
        <div
            className="fixed bottom-6 right-6 z-50 font-sans"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {showCard ? (
                <div className="w-80 sm:w-96 bg-card border border-border shadow-2xl rounded-2xl overflow-hidden animate-in slide-in-from-bottom-4 fade-in duration-200 backdrop-blur-xl">
                    {/* Card Header */}
                    <div className="flex items-center justify-between p-3.5 bg-gradient-to-r from-amber-500/15 via-primary/10 to-transparent border-b">
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 rounded-lg bg-amber-500 text-white shadow-xs">
                                <StickyNote className="h-4 w-4" />
                            </div>
                            <div>
                                <h3 className="text-xs font-extrabold text-foreground flex items-center gap-1.5">
                                    Quick Notes <Sparkles className="h-3 w-3 text-amber-500 fill-amber-500" />
                                </h3>
                                <span className="text-[10px] text-muted-foreground font-medium">Hover & auto-saved scratchpad</span>
                            </div>
                        </div>

                        <div className="flex items-center gap-1">
                            <Button
                                size="sm"
                                variant="outline"
                                className="h-7 px-2 text-[11px] font-bold gap-1 rounded-lg"
                                onClick={handleCreateNote}
                            >
                                <Plus className="h-3.5 w-3.5 text-amber-500" /> New
                            </Button>
                            <button
                                type="button"
                                onClick={() => { setIsOpen(false); setIsHovered(false) }}
                                className="p-1 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                    </div>

                    {/* Note selector tabs */}
                    <div className="flex items-center gap-1.5 px-3 py-2 overflow-x-auto bg-muted/40 border-b custom-scrollbar">
                        {notes.map(note => (
                            <button
                                key={note.id}
                                type="button"
                                onClick={() => setActiveNoteId(note.id)}
                                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1 ${
                                    activeNoteId === note.id
                                        ? 'bg-background text-primary shadow-xs border border-border'
                                        : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                                }`}
                            >
                                {note.pinned && <Pin className="h-3 w-3 text-amber-500 fill-amber-500 shrink-0" />}
                                <span className="truncate max-w-[85px]">{note.title || 'Untitled'}</span>
                            </button>
                        ))}
                    </div>

                    {/* Active Note Workspace */}
                    {activeNote && (
                        <div className={`p-3.5 space-y-3 transition-colors ${COLOR_MAP[activeNote.color] || COLOR_MAP.yellow}`}>
                            <div className="flex items-center justify-between gap-2">
                                <Input
                                    value={activeNote.title}
                                    onChange={(e) => handleUpdateNote(activeNote.id, { title: e.target.value })}
                                    placeholder="Note Title..."
                                    className="h-7 text-xs font-bold bg-transparent border-none shadow-none focus-visible:ring-0 p-0 text-foreground placeholder:text-muted-foreground/60"
                                />

                                {/* Color Picker & Pin */}
                                <div className="flex items-center gap-1.5 shrink-0">
                                    <button
                                        type="button"
                                        onClick={() => handleUpdateNote(activeNote.id, { pinned: !activeNote.pinned })}
                                        className={`p-1 rounded transition-colors ${activeNote.pinned ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground hover:text-foreground'}`}
                                        title={activeNote.pinned ? "Unpin Note" : "Pin Note"}
                                    >
                                        <Pin className={`h-3.5 w-3.5 ${activeNote.pinned ? 'fill-amber-500' : ''}`} />
                                    </button>

                                    {(['yellow', 'blue', 'green', 'purple', 'pink'] as const).map(color => (
                                        <button
                                            key={color}
                                            type="button"
                                            onClick={() => handleUpdateNote(activeNote.id, { color })}
                                            className={`w-3.5 h-3.5 rounded-full border transition-transform ${
                                                color === 'yellow' ? 'bg-amber-400 border-amber-600' :
                                                color === 'blue' ? 'bg-blue-400 border-blue-600' :
                                                color === 'green' ? 'bg-emerald-400 border-emerald-600' :
                                                color === 'purple' ? 'bg-purple-400 border-purple-600' :
                                                'bg-rose-400 border-rose-600'
                                            } ${activeNote.color === color ? 'scale-125 ring-2 ring-primary/40' : 'hover:scale-110'}`}
                                        />
                                    ))}
                                </div>
                            </div>

                            <Textarea
                                value={activeNote.content}
                                onChange={(e) => handleUpdateNote(activeNote.id, { content: e.target.value })}
                                placeholder="Type quick notes, phone numbers, client reminders or scratchpad details..."
                                className="min-h-[130px] text-xs font-medium bg-transparent border-none shadow-none focus-visible:ring-0 p-0 resize-none leading-relaxed text-foreground placeholder:text-muted-foreground/60"
                            />

                            {/* Footer Actions */}
                            <div className="flex items-center justify-between pt-2 border-t border-black/10 dark:border-white/10 text-[10px] font-semibold text-muted-foreground">
                                <span>Saved {activeNote.updatedAt}</span>

                                <div className="flex items-center gap-3">
                                    <button
                                        type="button"
                                        onClick={() => handleCopy(activeNote.content, activeNote.id)}
                                        className="hover:text-foreground flex items-center gap-1 font-bold text-xs"
                                    >
                                        {copiedId === activeNote.id ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                                        {copiedId === activeNote.id ? 'Copied' : 'Copy'}
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => handleDeleteNote(activeNote.id)}
                                        className="text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-0.5 font-bold text-xs"
                                    >
                                        <Trash2 className="h-3.5 w-3.5" /> Delete
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                /* Hover Floating Pill Button */
                <button
                    type="button"
                    onClick={() => setIsOpen(true)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-full shadow-xl font-bold text-xs transition-all hover:scale-105 active:scale-95 group border border-amber-400/40"
                >
                    <StickyNote className="h-4 w-4 transition-transform group-hover:rotate-12" />
                    <span>Quick Notes</span>
                    <span className="px-1.5 py-0.5 bg-black/25 rounded-full text-[10px] font-extrabold">{notes.length}</span>
                </button>
            )}
        </div>
    )
}

export default QuickNotesWidget
