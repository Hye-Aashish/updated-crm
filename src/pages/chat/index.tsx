import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Search, Send, MoreVertical, Phone, Video } from 'lucide-react';
import { format } from 'date-fns';
import api from '@/lib/api-client';
import { useAppStore } from '@/store'; // Assuming you have a store for user info
import { ChatWidgetsDialog } from '@/components/chat/widget-manager-dialog';

interface Conversation {
    _id: string;
    visitor_name: string;
    visitor_email: string;
    last_message: string;
    last_message_time: string;
    unread_count: number;
    status: 'open' | 'closed';
}

interface Message {
    _id: string;
    conversation_id: string;
    sender_type: 'admin' | 'visitor' | 'system';
    message: string;
    createdAt: string;
}

export const ChatPage = () => {
    const { currentUser } = useAppStore();
    const navigate = useNavigate();

    useEffect(() => {
        if (currentUser?.role === 'client') {
            navigate('/project-chat');
        }
    }, [currentUser, navigate]);
    const [socket, setSocket] = useState<Socket | null>(null);
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputValue, setInputValue] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

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
            console.log('Admin connected to chat server');
            newSocket.emit('admin_join', currentUser.id || currentUser._id);
        });

        newSocket.on('new_conversation', (conv: Conversation) => {
            setConversations(prev => [conv, ...prev]);
        });

        newSocket.on('conversation_updated', (updatedConv: Conversation) => {
            setConversations(prev => {
                const newConvs = prev.map(c => c._id === updatedConv._id ? updatedConv : c);
                return newConvs.sort((a, b) => new Date(b.last_message_time).getTime() - new Date(a.last_message_time).getTime());
            });
        });

        newSocket.on('admin_message', (msg: Message) => {
            setMessages(prev => [...prev, msg]);
        });

        newSocket.on('message_received', (msg: Message) => {
            setMessages(prev => [...prev, msg]);
        });

        setSocket(newSocket);
        fetchConversations();

        return () => {
            newSocket.disconnect();
        };
    }, [currentUser]);

    // Scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Fetch conversations
    const fetchConversations = async () => {
        try {
            const res = await api.get('/chat/conversations');
            if (Array.isArray(res.data)) {
                setConversations(res.data);
            }
        } catch (error) {
            console.error(error);
        }
    };

    // Load Conversation Messages
    const selectConversation = async (conv: Conversation) => {
        setActiveConversation(conv);
        if (socket) {
            socket.emit('join_conversation', conv._id);
        }
        try {
            const res = await api.get(`/chat/conversations/${conv._id}/messages`);
            setMessages(res.data);
            // Update unread locally
            setConversations(prev => prev.map(c => c._id === conv._id ? { ...c, unread_count: 0 } : c));
        } catch (error) {
            console.error(error);
        }
    };

    const sendMessage = async () => {
        if (!inputValue.trim() || !activeConversation || !socket) return;

        const msgData = {
            conversationId: activeConversation._id,
            message: inputValue,
            userId: currentUser?.id
        };

        socket.emit('admin_message', msgData);
        setInputValue('');
    };

    return (
        <div className="flex h-[calc(100vh-2rem)] gap-4 p-4 bg-gray-50/50">
            {/* Sidebar List */}
            <div className="w-80 flex flex-col gap-4 bg-white rounded-xl shadow-sm border border-gray-100/50 overflow-hidden">
                <div className="p-4 border-b border-gray-100">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="font-semibold text-lg">Inbox</h2>
                        <ChatWidgetsDialog />
                    </div>
                    <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                        <Input placeholder="Search messages..." className="pl-9 bg-gray-50 border-none" />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                    <div className="flex flex-col">
                        {conversations.map(conv => (
                            <div
                                key={conv._id}
                                onClick={() => selectConversation(conv)}
                                className={`p-4 border-b border-gray-50 cursor-pointer hover:bg-gray-50 transition-colors ${activeConversation?._id === conv._id ? 'bg-blue-50/50' : ''}`}
                            >
                                <div className="flex justify-between items-start mb-1">
                                    <div className="flex items-center gap-3">
                                        <Avatar className="h-10 w-10 border-2 border-white shadow-sm">
                                            <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-500 text-white">
                                                {conv.visitor_name ? conv.visitor_name[0] : 'V'}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="overflow-hidden">
                                            <h3 className="font-medium text-sm text-gray-900 truncate">{conv.visitor_name || 'Visitor'}</h3>
                                            <p className="text-xs text-gray-500 truncate max-w-[120px]">{conv.last_message}</p>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end gap-1 shrink-0">
                                        <span className="text-[10px] text-gray-400">{format(new Date(conv.last_message_time || Date.now()), 'HH:mm')}</span>
                                        {conv.unread_count > 0 && (
                                            <Badge variant="default" className="h-5 w-5 rounded-full p-0 flex items-center justify-center bg-blue-600">
                                                {conv.unread_count}
                                            </Badge>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Chat Window */}
            <div className="flex-1 flex flex-col bg-white rounded-xl shadow-sm border border-gray-100/50 overflow-hidden relative">
                {activeConversation ? (
                    <>
                        {/* Header */}
                        <div className="h-16 border-b border-gray-100 flex items-center justify-between px-6 bg-white/80 backdrop-blur-sm z-10">
                            <div className="flex items-center gap-3">
                                <Avatar className="h-9 w-9">
                                    <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-500 text-white">
                                        {activeConversation.visitor_name ? activeConversation.visitor_name[0] : 'V'}
                                    </AvatarFallback>
                                </Avatar>
                                <div>
                                    <h3 className="font-semibold text-sm">{activeConversation.visitor_name || 'Visitor'}</h3>
                                    <div className="flex items-center gap-1.5">
                                        <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                                        <span className="text-xs text-gray-500">Online</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button variant="ghost" size="icon"><Phone className="h-4 w-4 text-gray-500" /></Button>
                                <Button variant="ghost" size="icon"><Video className="h-4 w-4 text-gray-500" /></Button>
                                <Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4 text-gray-500" /></Button>
                            </div>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 p-6 bg-gray-50/30 overflow-y-auto">
                            <div className="flex flex-col gap-4">
                                {messages.map((msg, i) => (
                                    <div
                                        key={i}
                                        className={`flex ${msg.sender_type === 'admin' ? 'justify-end' : 'justify-start'}`}
                                    >
                                        <div
                                            className={`max-w-[70%] p-3 px-4 rounded-2xl shadow-sm text-sm ${msg.sender_type === 'admin'
                                                ? 'bg-blue-600 text-white rounded-br-none'
                                                : 'bg-white border border-gray-100 text-gray-700 rounded-bl-none'
                                                }`}
                                        >
                                            <p>{msg.message}</p>
                                            <span className={`text-[10px] mt-1 block ${msg.sender_type === 'admin' ? 'text-blue-100' : 'text-gray-400'}`}>
                                                {format(new Date(msg.createdAt || Date.now()), 'HH:mm')}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                                <div ref={messagesEndRef} />
                            </div>
                        </div>

                        {/* Input */}
                        <div className="p-4 border-t border-gray-100 bg-white">
                            <div className="relative flex items-center gap-2">
                                <Input
                                    className="pr-12 py-6 bg-gray-50 border-gray-200 focus-visible:ring-blue-500"
                                    placeholder="Type a message..."
                                    value={inputValue}
                                    onChange={(e) => setInputValue(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                                />
                                <div className="absolute right-2 flex items-center gap-1">
                                    <Button size="icon" className="h-8 w-8 rounded-full bg-blue-600 hover:bg-blue-700" onClick={sendMessage}>
                                        <Send className="h-4 w-4 text-white" />
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                        <div className="h-16 w-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                            <MessageIcon className="h-8 w-8 text-gray-300" />
                        </div>
                        <p>Select a conversation to start chatting</p>
                    </div>
                )}
            </div>
        </div>
    );
};

const MessageIcon = ({ className }: { className?: string }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
    >
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
);

export default ChatPage;
