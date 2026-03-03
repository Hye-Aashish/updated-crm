import { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
// Removed unused Avatar imports
import { Badge } from '@/components/ui/badge';
import { Search, Send, MoreVertical, Briefcase, User, Paperclip } from 'lucide-react';
import { format } from 'date-fns';
import api from '@/lib/api-client';
import { useAppStore } from '@/store';
import { useToast } from '@/hooks/use-toast';

interface ProjectChat {
    _id: string;
    id?: string;
    name: string;
    status: string;
    lastMessage?: string;
    lastMessageAt?: string;
}

interface Message {
    _id: string;
    projectId: string;
    senderId: string;
    senderName: string;
    senderRole: string;
    message: string;
    attachments: any[];
    createdAt: string;
}

export const ProjectChatPage = () => {
    const { currentUser } = useAppStore();
    const [socket, setSocket] = useState<Socket | null>(null);
    const [projects, setProjects] = useState<ProjectChat[]>([]);
    const [activeProject, setActiveProject] = useState<ProjectChat | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
    const [lastMessages, setLastMessages] = useState<Record<string, Message>>({});
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [permissions, setPermissions] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const filteredProjects = projects.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    useEffect(() => {
        const fetchPermissions = async () => {
            try {
                const res = await api.get('/settings');
                if (currentUser?.role && currentUser.role !== 'owner' && res.data.roles) {
                    const role = res.data.roles.find((r: any) => r.name === currentUser.role);
                    if (role) setPermissions(role.permissions);
                }
            } catch (err) {
                console.error("Permissions fetch error", err);
            } finally {
                setLoading(false);
            }
        };
        fetchPermissions();
    }, [currentUser]);

    const hasViewPermission = currentUser?.role === 'owner' || (permissions ? !!permissions.project_chat?.view : true);
    const hasMessagePermission = currentUser?.role === 'owner' || (permissions ? !!permissions.project_chat?.message : true);

    // Grouping logic
    const activeDiscussions = filteredProjects.filter(p => (unreadCounts[p._id] || unreadCounts[p.id || ''] || 0) > 0);

    const { toast } = useToast();

    const getBaseUrl = () => {
        const url = api.defaults.baseURL || '';
        if (url.startsWith('http')) {
            return url.replace('/api', '');
        }
        return window.location.origin;
    };
    const SOCKET_URL = getBaseUrl();

    // Initial Load & Socket Setup
    useEffect(() => {
        if (!currentUser) return;

        const newSocket = io(SOCKET_URL);

        newSocket.on('connect', () => {
            console.log('Connected to project chat');
            toast({
                title: "Chat Connected",
                description: "You are now connected to the project discussion.",
            });
        });

        newSocket.on('connect_error', (err) => {
            console.error('Socket connection error:', err);
            toast({
                title: "Connection Error",
                description: "Could not connect to the chat server.",
                variant: "destructive",
            });
        });

        // We use a listener that doesn't depend on activeProject in the closure
        newSocket.on('project_message_received', (msg: Message) => {
            // We'll use a functional update and check the active project ID from a ref or just update state 
            // and let the component filter or re-render based on activeProject state
            // since we're in a functional component, we can access the latest activeProject if we're careful
            // or just always add to state if it matches some criteria
            // However, the cleanest way in a closure is to use a Ref for activeProject or a custom event
            window.dispatchEvent(new CustomEvent('project-message', { detail: msg }));
        });

        setSocket(newSocket);
        fetchProjects();

        return () => {
            newSocket.disconnect();
        };
    }, [currentUser]); // Remove activeProject from deps

    // Handle incoming messages via event to avoid closure stale state
    useEffect(() => {
        const handler = (e: any) => {
            const msg = e.detail;
            const pId = msg.projectId;

            // Update last messages for the sidebar preview
            setLastMessages(prev => ({ ...prev, [pId]: msg }));

            if (activeProject && (pId === activeProject._id || pId === activeProject.id)) {
                setMessages(prev => [...prev, msg]);
            } else {
                // Increment unread count if not active
                setUnreadCounts(prev => ({
                    ...prev,
                    [pId]: (prev[pId] || 0) + 1
                }));
            }
        };
        window.addEventListener('project-message', handler);
        return () => window.removeEventListener('project-message', handler);
    }, [activeProject]);

    // Scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Fetch conversations (Projects)
    const fetchProjects = async () => {
        try {
            const res = await api.get('/project-chat/projects');
            if (Array.isArray(res.data)) {
                setProjects(res.data);
            }
        } catch (error) {
            console.error(error);
        }
    };

    // Load Project Messages
    const selectProject = async (project: ProjectChat) => {
        const pId = project._id || project.id;
        if (!pId) return;

        setActiveProject(project);

        // Clear unread count when project is selected
        setUnreadCounts(prev => ({
            ...prev,
            [pId]: 0
        }));

        try {
            const res = await api.get(`/project-chat/messages/${pId}`);
            setMessages(res.data);
        } catch (error) {
            console.error(error);
        }
    };

    // join room when project or socket changes
    useEffect(() => {
        if (socket && activeProject) {
            const pId = activeProject._id || activeProject.id;
            if (pId) {
                socket.emit('join_project_chat', pId);
                console.log('Emitted join_project_chat for', pId);
            }
        }
    }, [socket, activeProject]);

    const renderProjectItem = (project: ProjectChat) => {
        const pId = project._id || project.id || '';
        const isActive = activeProject?._id === pId || activeProject?.id === pId;
        const unreadCount = unreadCounts[pId] || 0;
        const lastMsg = lastMessages[pId];

        const statusColors: Record<string, string> = {
            'completed': 'bg-emerald-50 text-emerald-600 border-emerald-100',
            'in-progress': 'bg-blue-50 text-blue-600 border-blue-100',
            'on-hold': 'bg-rose-50 text-rose-600 border-rose-100',
            'planning': 'bg-amber-50 text-amber-600 border-amber-100'
        };

        return (
            <div
                key={pId}
                onClick={() => selectProject(project)}
                className={`group relative p-3 rounded-[1.5rem] cursor-pointer transition-all duration-300 border-2 ${isActive
                    ? 'bg-blue-50/70 border-blue-600 shadow-lg shadow-blue-500/10'
                    : unreadCount > 0
                        ? 'bg-white border-blue-200 shadow-md ring-2 ring-blue-500/10'
                        : 'bg-transparent border-transparent hover:bg-gray-50/80 hover:border-gray-100'
                    }`}
            >
                <div className="flex items-center gap-4 relative z-10">
                    <div className={`h-12 w-12 rounded-[1.1rem] flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-105 ${isActive ? 'bg-blue-600 text-white shadow-xl shadow-blue-500/30' : unreadCount > 0 ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400 group-hover:bg-white group-hover:shadow-md'
                        }`}>
                        <Briefcase className="h-5 w-5" />
                    </div>
                    <div className="flex-1 overflow-hidden">
                        <div className="flex items-center justify-between mb-1">
                            <h3 className={`font-bold text-sm truncate ${isActive ? 'text-blue-900' : 'text-gray-700 group-hover:text-gray-900'}`}>
                                {project.name}
                            </h3>
                            {unreadCount > 0 && (
                                <Badge className="bg-red-500 h-4 min-w-[1rem] flex items-center justify-center px-1 text-[9px] animate-bounce">
                                    {unreadCount}
                                </Badge>
                            )}
                        </div>
                        <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className={`text-[9px] px-2 h-4 border leading-none uppercase font-black tracking-wider rounded-full ${statusColors[project.status] || 'bg-gray-50 text-gray-500 border-gray-100'}`}>
                                {project.status?.replace('-', ' ')}
                            </Badge>
                            {unreadCount > 0 && (
                                <span className="flex h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                            )}
                        </div>
                        <div className="flex items-center justify-between">
                            <p className={`text-xs truncate max-w-[140px] ${isActive ? 'text-blue-700/70' : unreadCount > 0 ? 'text-blue-600 font-bold' : 'text-gray-400'}`}>
                                {lastMsg ? lastMsg.message : 'Click to view discussion'}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const sendMessage = async () => {
        if (!inputValue.trim() || !activeProject) return;

        if (!socket || !socket.connected) {
            toast({
                title: "Not Connected",
                description: "Waiting for chat connection...",
                variant: "destructive",
            });
            return;
        }

        const pId = activeProject._id || activeProject.id;
        if (!pId) return;

        const msgData = {
            projectId: pId,
            senderId: currentUser?.id || currentUser?._id,
            senderName: currentUser?.name,
            senderRole: currentUser?.role,
            message: inputValue,
            attachments: []
        };

        socket.emit('send_project_message', msgData);
        setInputValue('');
    };

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center bg-background">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
            </div>
        );
    }

    if (!hasViewPermission) {
        return (
            <div className="flex flex-col h-[calc(100vh-80px)] items-center justify-center text-center p-10 bg-slate-50 rounded-3xl border border-gray-100/50 shadow-sm">
                <div className="h-20 w-20 bg-white rounded-3xl shadow-xl flex items-center justify-center mb-6">
                    <Briefcase className="h-10 w-10 text-red-100" />
                </div>
                <h3 className="text-gray-900 font-bold mb-2 text-xl italic">Access Restricted</h3>
                <p className="text-sm max-w-[320px] text-gray-500 leading-relaxed">
                    You do not have permission to view project chats. Please contact your administrator to request access.
                </p>
            </div>
        );
    }

    return (
        <div className="flex h-[calc(100vh-2rem)] gap-4 p-4 bg-gray-50/50">
            {/* Project List Sidebar */}
            <div className="w-80 flex flex-col bg-white rounded-[2rem] shadow-xl shadow-blue-900/5 border border-gray-100 overflow-hidden">
                <div className="p-6 bg-gradient-to-br from-indigo-700 via-blue-700 to-blue-600 text-white relative overflow-hidden">
                    {/* Decorative element */}
                    <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-2xl" />

                    <div className="flex items-center gap-3 mb-6 relative z-10">
                        <div className="h-10 w-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-inner">
                            <Briefcase className="h-5 w-5 text-white" />
                        </div>
                        <div>
                            <h2 className="font-black text-xl tracking-tight leading-none">Collab Rooms</h2>
                            <p className="text-[10px] uppercase tracking-[0.2em] font-black text-blue-100/70 mt-1">Project Groups</p>
                        </div>
                    </div>

                    <div className="relative group z-10">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/50 group-focus-within:text-white transition-colors" />
                        <Input
                            placeholder="Find discussion..."
                            className="bg-white/10 border-white/10 text-white placeholder:text-white/40 focus-visible:ring-1 focus-visible:ring-white/30 focus-visible:bg-white/15 h-11 pl-10 rounded-2xl transition-all"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto px-3 py-4 custom-scrollbar">
                    <div className="flex flex-col gap-6">
                        {/* Active Discussions Group */}
                        {activeDiscussions.length > 0 && (
                            <div className="flex flex-col gap-2">
                                <div className="flex items-center justify-between px-3">
                                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600/60">Active Activity</h4>
                                    <Badge className="bg-blue-600 h-4 px-1.5 text-[9px]">{activeDiscussions.length}</Badge>
                                </div>
                                {activeDiscussions.map(project => renderProjectItem(project))}
                            </div>
                        )}

                        {/* All Projects Group */}
                        <div className="flex flex-col gap-2">
                            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 px-3">
                                {activeDiscussions.length > 0 ? 'Recently Assigned' : 'All Projects'}
                            </h4>
                            {filteredProjects.length === 0 && activeDiscussions.length === 0 ? (
                                <div className="py-20 text-center px-6">
                                    <div className="h-16 w-16 bg-gray-50 rounded-3xl flex items-center justify-center mx-auto mb-4 border border-dashed border-gray-200">
                                        <Search className="h-6 w-6 text-gray-300" />
                                    </div>
                                    <h4 className="text-gray-900 font-bold text-sm">No Projects Found</h4>
                                    <p className="text-xs text-gray-500 mt-1">Try a different search term or check active projects.</p>
                                </div>
                            ) : (
                                filteredProjects.map(project => {
                                    // If already shown in active discussions, maybe skip? 
                                    // User said "alag se show ho", so let's skip if in activeDiscussions
                                    const isRead = !(unreadCounts[project._id] || unreadCounts[project.id || ''] > 0);
                                    if (!isRead && activeDiscussions.length > 0) return null;
                                    return renderProjectItem(project);
                                })
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Chat Window */}
            <div className="flex-1 flex flex-col bg-white rounded-xl shadow-sm border border-gray-100/50 overflow-hidden relative">
                {activeProject ? (
                    <>
                        {/* Header */}
                        <div className="h-16 border-b border-gray-100 flex items-center justify-between px-6 bg-white/80 backdrop-blur-sm z-10">
                            <div className="flex items-center gap-3">
                                <div className="h-9 w-9 bg-blue-600 rounded-lg flex items-center justify-center text-white">
                                    <Briefcase className="h-5 w-5" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-sm">{activeProject.name}</h3>
                                    <p className="text-[10px] text-gray-500 uppercase tracking-widest font-black">Project Discussion Room</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button variant="ghost" size="icon" className="rounded-full"><User className="h-4 w-4 text-gray-500" /></Button>
                                <Button variant="ghost" size="icon" className="rounded-full"><MoreVertical className="h-4 w-4 text-gray-500" /></Button>
                            </div>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 p-6 bg-slate-50 overflow-y-auto space-y-4">
                            {messages.map((msg, i) => {
                                const isSystem = msg.senderRole === 'system';
                                if (isSystem) {
                                    return (
                                        <div key={msg._id || i} className="flex justify-center my-4">
                                            <div className="bg-gray-100/50 border border-dashed border-gray-300 rounded-xl px-4 py-2 text-center max-w-[80%]">
                                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">System Notification</p>
                                                <p className="text-xs text-gray-600 font-medium italic">{msg.message}</p>
                                            </div>
                                        </div>
                                    );
                                }

                                const isMe = msg.senderId === (currentUser?.id || currentUser?._id);
                                return (
                                    <div key={msg._id || i} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`flex flex-col max-w-[70%] ${isMe ? 'items-end' : 'items-start'}`}>
                                            {!isMe && (
                                                <div className="flex items-center gap-2 mb-1 px-1">
                                                    <span className="text-[10px] font-black text-gray-500 uppercase">{msg.senderName}</span>
                                                    <Badge variant="outline" className="text-[9px] h-3 px-1 leading-none uppercase font-bold text-blue-600 bg-blue-50 border-blue-100">
                                                        {msg.senderRole}
                                                    </Badge>
                                                </div>
                                            )}
                                            <div className={`p-3 px-4 rounded-2xl shadow-sm text-sm ${isMe
                                                ? 'bg-blue-600 text-white rounded-tr-none'
                                                : 'bg-white border border-gray-100 text-gray-700 rounded-tl-none'}`}
                                            >
                                                <p className="whitespace-pre-wrap">{msg.message}</p>
                                                <div className={`flex items-center justify-end gap-1 mt-1 ${isMe ? 'text-blue-100' : 'text-gray-400'}`}>
                                                    <span className="text-[9px] font-bold">
                                                        {format(new Date(msg.createdAt || Date.now()), 'hh:mm a')}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input Area */}
                        <div className="p-4 border-t border-gray-100 bg-white">
                            <div className={`flex items-center gap-2 ${hasMessagePermission ? 'bg-gray-50' : 'bg-gray-100 cursor-not-allowed'} p-1.5 rounded-2xl border border-gray-200`}>
                                <Button variant="ghost" size="icon" className="h-10 w-10 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-[0.8rem]" disabled={!hasMessagePermission}>
                                    <Paperclip className="h-5 w-5" />
                                </Button>
                                <Input
                                    className="border-none bg-transparent focus-visible:ring-0 shadow-none text-sm px-2"
                                    placeholder={hasMessagePermission ? "Discuss anything about the project..." : "Viewing only (Permission restricted)"}
                                    value={inputValue}
                                    onChange={(e) => setInputValue(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && hasMessagePermission && sendMessage()}
                                    disabled={!hasMessagePermission}
                                />
                                <Button
                                    onClick={sendMessage}
                                    disabled={!hasMessagePermission || !inputValue.trim()}
                                    className="h-10 w-10 bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200 rounded-[0.8rem] shrink-0"
                                >
                                    <Send className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-400 bg-slate-50/50">
                        <div className="h-20 w-20 bg-white rounded-3xl shadow-xl flex items-center justify-center mb-6">
                            <Briefcase className="h-10 w-10 text-gray-200" />
                        </div>
                        <h3 className="text-gray-900 font-bold mb-1">Project Collaboration</h3>
                        <p className="text-sm max-w-[280px] text-center">Select a project from the sidebar to start collaborating with the team and client.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ProjectChatPage;
