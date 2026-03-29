import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { useAppStore } from '@/store';

const getSocketURL = () => {
    const envURL = (import.meta as any).env.VITE_API_URL || 'http://localhost:5000/api';
    return envURL.replace('/api', '');
};

const SOCKET_URL = getSocketURL();

export function useEmployeeMonitor() {
    const { currentUser } = useAppStore();
    const socketRef = useRef<any>(null);
    const streamInterval = useRef<any>(null);
    const activeStream = useRef<MediaStream | null>(null);
    const [breakCheck, setBreakCheck] = useState<boolean>(false);
    const [isOnBreak, setIsOnBreak] = useState<boolean>(false);

    useEffect(() => {
        if (!(window as any).electronAPI || !currentUser) {
            if (socketRef.current) stopMonitoring();
            return;
        }

        startMonitoring();

        // Listen for system idle alerts from Electron
        (window as any).electronAPI.onSystemIdle((idleTime: number) => {
            console.log(`[MONITOR] System has been idle for ${idleTime}s`);
            if (!isOnBreak && !breakCheck) {
                setBreakCheck(true);
            }
        });

        return () => {
            stopMonitoring();
        };
    }, [currentUser]);

    async function startMonitoring() {
        console.log('[MONITOR] Starting automatic screen tracking...');
        socketRef.current = io(SOCKET_URL);

        socketRef.current.on('connect', async () => {
            console.log('[MONITOR] Connected to tracking server');
            
            const sources = await (window as any).electronAPI.getSources();
            const screenSources = sources.filter((s: any) => s.name.toLowerCase().includes('screen') || s.name.toLowerCase().includes('entire'));

            socketRef.current.emit('start-streaming', {
                id: currentUser.id || currentUser.email,
                email: currentUser.email,
                name: currentUser.name,
                screens: screenSources.map((s: any) => ({ id: s.id, name: s.name })),
                status: 'Working'
            });

            if (screenSources.length > 0) {
                captureScreen(screenSources[0].id);
            }
        });

        socketRef.current.on('change-active-screen', (screenId: string) => {
            console.log(`[MONITOR] Switching to screen: ${screenId}`);
            captureScreen(screenId);
        });
    }

    async function captureScreen(screenId: string) {
        if (streamInterval.current) clearInterval(streamInterval.current);
        if (activeStream.current) {
            activeStream.current.getTracks().forEach(track => track.stop());
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: false,
                video: {
                    mandatory: {
                        chromeMediaSource: 'desktop',
                        chromeMediaSourceId: screenId,
                        minWidth: 1280,
                        maxWidth: 1280,
                        minHeight: 720,
                        maxHeight: 720
                    }
                } as any
            });

            activeStream.current = stream;

            const video = document.createElement('video');
            video.srcObject = stream;
            video.play();

            const canvas = document.createElement('canvas');
            canvas.width = 1200;
            canvas.height = 675;
            const ctx = canvas.getContext('2d');

            streamInterval.current = setInterval(() => {
                if (!ctx || !video.readyState) return;
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                const frame = canvas.toDataURL('image/jpeg', 0.6);
                socketRef.current.emit('screen-frame', { 
                    userId: currentUser.id || currentUser.email, 
                    frame,
                    status: isOnBreak ? 'On Break' : 'Working'
                });
            }, 1000);

        } catch (err) {
            console.error('[MONITOR] Screen capture error:', err);
        }
    }

    function handleStartBreak() {
        if (!currentUser) return;
        setIsOnBreak(true);
        setBreakCheck(false);
        if (socketRef.current) {
            socketRef.current.emit('status-update', { 
                userId: currentUser.id || currentUser.email, 
                status: 'On Break' 
            });
        }
    }

    function handleResumeWork() {
        if (!currentUser) return;
        setIsOnBreak(false);
        setBreakCheck(false);
        if (socketRef.current) {
            socketRef.current.emit('status-update', { 
                userId: currentUser.id || currentUser.email, 
                status: 'Working' 
            });
        }
    }

    function stopMonitoring() {
        console.log('[MONITOR] Stopping screen tracking');
        if (socketRef.current) socketRef.current.disconnect();
        if (streamInterval.current) clearInterval(streamInterval.current);
        if (activeStream.current) {
            activeStream.current.getTracks().forEach(track => track.stop());
        }
    }

    return { 
        breakCheck, 
        setBreakCheck, 
        isOnBreak, 
        handleStartBreak, 
        handleResumeWork 
    };
}
