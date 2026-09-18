import { useEffect } from 'react';
import { io } from 'socket.io-client';
import { useAppStore } from '@/store';
import { useToast } from '@/hooks/use-toast';
import { playMessageSound } from '@/lib/sound-notification';
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
                toast({
                    title: `💬 New Message from ${msg.senderName || 'Team Member'}`,
                    description: msg.message || 'Sent an attachment',
                    duration: 5000
                });
            }
        });

        // Incoming Live Chat Visitor Message
        socket.on('message_received', (msg: any) => {
            if (msg.sender_type === 'visitor') {
                playMessageSound();
                toast({
                    title: `💬 New Live Chat Message`,
                    description: msg.message || 'A visitor sent a new message',
                    duration: 5000
                });
            }
        });

        return () => {
            socket.disconnect();
        };
    }, [currentUser, toast]);

    return null;
}
