import { useEffect } from 'react';
import { io } from 'socket.io-client';
import { useAppStore } from '@/store';
import { useToast } from '@/hooks/use-toast';
import { playMessageSound } from '@/lib/sound-notification';
import { showDesktopNotification } from '@/lib/notifications';
import api from '@/lib/api-client';

const getSocketURL = () => {
    const envURL = (import.meta as any).env.VITE_API_URL || 'http://localhost:5000/api';
    return envURL.replace('/api', '');
};

const SOCKET_URL = getSocketURL();

export function ChatNotificationListener() {
    const { currentUser } = useAppStore();
    const { toast } = useToast();

    useEffect(() => {
        if (!currentUser) return;

        const token = localStorage.getItem('token');
        const socket = io(SOCKET_URL, {
            auth: { token },
            query: { token }
        });

        socket.on('connect', () => {
            // If user is client or admin, listen to project rooms they belong to
            api.get('/projects').then(res => {
                const projects = res.data || [];
                projects.forEach((p: any) => {
                    const pId = p._id || p.id;
                    if (pId) {
                        socket.emit('join_project_chat', pId);
                    }
                });
            }).catch(() => {});
        });

        // Incoming Project Chat Message
        socket.on('project_message_received', (msg: any) => {
            const currentUserId = currentUser._id || currentUser.id;
            const senderId = msg.senderId;

            // Only notify if message is sent by someone else
            if (senderId && currentUserId && senderId.toString() !== currentUserId.toString()) {
                playMessageSound();
                const title = `New message from ${msg.senderName || 'Team Member'}`;
                const body = msg.message || 'Sent an attachment';
                toast({
                    title: `💬 ${title}`,
                    description: body,
                    duration: 5000
                });
                void showDesktopNotification({
                    title,
                    body,
                    tag: `chat-${msg._id || msg.id || Date.now()}`,
                });
            }
        });

        // Incoming Live Chat Visitor Message
        socket.on('message_received', (msg: any) => {
            if (msg.sender_type === 'visitor') {
                playMessageSound();
                const title = 'New live chat message';
                const body = msg.message || 'A visitor sent a new message';
                toast({
                    title: `💬 ${title}`,
                    description: body,
                    duration: 5000
                });
                void showDesktopNotification({
                    title,
                    body,
                    tag: `livechat-${msg._id || msg.id || Date.now()}`,
                });
            }
        });

        return () => {
            socket.disconnect();
        };
    }, [currentUser, toast]);

    return null;
}
