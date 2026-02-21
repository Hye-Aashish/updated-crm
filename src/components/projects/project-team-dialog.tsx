import { useState } from 'react'
import { useAppStore } from '@/store'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { getInitials } from '@/lib/utils'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import api from '@/lib/api-client'
import { useToast } from '@/hooks/use-toast'
import { Project } from '@/types'

interface ProjectTeamDialogProps {
    project: Project
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function ProjectTeamDialog({ project, open, onOpenChange }: ProjectTeamDialogProps) {
    const { users, updateProject } = useAppStore()
    const { toast } = useToast()
    const [selectedMembers, setSelectedMembers] = useState<string[]>(project.members || [])
    const [searchQuery, setSearchQuery] = useState('')
    const [loading, setLoading] = useState(false)

    const filteredUsers = users.filter(user =>
        (user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            user.email.toLowerCase().includes(searchQuery.toLowerCase())) &&
        user.role !== 'client' // Don't assign clients as team members
    )

    const toggleMember = (userId: string) => {
        setSelectedMembers(prev =>
            prev.includes(userId)
                ? prev.filter(id => id !== userId)
                : [...prev, userId]
        )
    }

    const handleSave = async () => {
        setLoading(true)
        try {
            const response = await api.put(`/projects/${project.id}`, {
                members: selectedMembers
            })

            updateProject(project.id, { members: response.data.members })

            toast({
                title: "Team Updated",
                description: "Project team members have been updated successfully.",
            })
            onOpenChange(false)
        } catch (error) {
            console.error(error)
            toast({
                title: "Error",
                description: "Failed to update project team.",
                variant: "destructive"
            })
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Manage Project Team</DialogTitle>
                    <DialogDescription>
                        Assign or remove members from this project.
                    </DialogDescription>
                </DialogHeader>

                <div className="relative my-4">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search users..."
                        className="pl-8"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                <ScrollArea className="h-[300px] pr-4">
                    <div className="space-y-4">
                        {filteredUsers.map(user => (
                            <div key={user.id} className="flex items-center justify-between space-x-4">
                                <div className="flex items-center space-x-4">
                                    <Avatar>
                                        <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <p className="text-sm font-medium leading-none">{user.name}</p>
                                        <p className="text-sm text-muted-foreground capitalize">{user.role}</p>
                                    </div>
                                </div>
                                <Checkbox
                                    checked={selectedMembers.includes(user.id)}
                                    onCheckedChange={() => toggleMember(user.id)}
                                />
                            </div>
                        ))}
                    </div>
                </ScrollArea>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleSave} disabled={loading}>
                        {loading ? 'Saving...' : 'Save Changes'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
