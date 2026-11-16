import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { useAppStore } from '@/store';

const getSocketURL = () => {
    const envURL = (import.meta as any).env.VITE_API_URL || 'http://localhost:5000/api';
    return envURL.replace('/api', '');
};

const SOCKET_URL = getSocketURL();

type ElectronAPI = {
    getSources: () => Promise<Array<{ id: string; name: string }>>;
    onSystemIdle?: (cb: (idleTime: number) => void) => (() => void) | void;
    onBreakPrompt?: (cb: (payload: { open: boolean }) => void) => (() => void) | void;
    onBreakAction?: (cb: (payload: { action: string }) => void) => (() => void) | void;
    syncBreakState?: (payload: { isOnBreak?: boolean; showPrompt?: boolean }) => void;
};

function getElectronAPI(): ElectronAPI | null {
    return (window as any).electronAPI || null;
}

export function useEmployeeMonitor() {
    const { currentUser } = useAppStore();
    const socketRef = useRef<any>(null);
    const streamInterval = useRef<any>(null);
    const activeStream = useRef<MediaStream | null>(null);
    const isOnBreakRef = useRef(false);
    const [breakCheck, setBreakCheck] = useState<boolean>(false);
    const [isOnBreak, setIsOnBreak] = useState<boolean>(false);

    useEffect(() => {
        isOnBreakRef.current = isOnBreak;
    }, [isOnBreak]);

    useEffect(() => {
        const api = getElectronAPI();
        if (!api || !currentUser) {
            if (socketRef.current) stopMonitoring();
            return;
        }

        startMonitoring();

        const unsubs: Array<() => void> = [];

        // Main-process always-on-top popup drives these events (works while minimized)
        if (api.onBreakPrompt) {
            const off = api.onBreakPrompt((payload) => {
                setBreakCheck(!!payload?.open);
            });
            if (typeof off === 'function') unsubs.push(off);
        }

        if (api.onBreakAction) {
            const off = api.onBreakAction((payload) => {
                const action = payload?.action;
                if (action === 'start-break') {
                    applyStartBreak();
                } else if (action === 'still-working' || action === 'resume-work') {
                    applyResumeWork();
                }
            });
            if (typeof off === 'function') unsubs.push(off);
        }

        // Fallback for older preload: idle → in-app dialog only
        if (api.onSystemIdle) {
            const off = api.onSystemIdle((idleTime: number) => {
                console.log(`[MONITOR] System has been idle for ${idleTime}s`);
                if (!isOnBreakRef.current) {
                    setBreakCheck(true);
                }
            });
            if (typeof off === 'function') unsubs.push(off);
        }

        return () => {
            unsubs.forEach((fn) => fn());
            stopMonitoring();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentUser]);

    async function startMonitoring() {
        console.log('[MONITOR] Starting automatic screen tracking...');
        const token = localStorage.getItem('token');
        socketRef.current = io(SOCKET_URL, {
            auth: { token },
            query: { token }
        });

        socketRef.current.on('connect', async () => {
            console.log('[MONITOR] Connected to tracking server');
            const api = getElectronAPI();
            if (!api) return;

            const sources = await api.getSources();
            const screenSources = sources.filter((s) =>
                s.name.toLowerCase().includes('screen') || s.name.toLowerCase().includes('entire')
            );

            socketRef.current.emit('start-streaming', {
                id: currentUser.id || currentUser.email,
                email: currentUser.email,
                name: currentUser.name,
                screens: screenSources.map((s) => ({ id: s.id, name: s.name })),
                status: isOnBreakRef.current ? 'On Break' : 'Working'
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
                socketRef.current?.emit('screen-frame', {
                    userId: currentUser.id || currentUser.email,
                    frame,
                    status: isOnBreakRef.current ? 'On Break' : 'Working'
                });
            }, 1000);

        } catch (err) {
            console.error('[MONITOR] Screen capture error:', err);
        }
    }

    function applyStartBreak() {
        if (!currentUser) return;
        setIsOnBreak(true);
        setBreakCheck(false);
        isOnBreakRef.current = true;
        getElectronAPI()?.syncBreakState?.({ isOnBreak: true });
        socketRef.current?.emit('status-update', {
            userId: currentUser.id || currentUser.email,
            status: 'On Break'
        });
    }

    function applyResumeWork() {
        if (!currentUser) return;
        setIsOnBreak(false);
        setBreakCheck(false);
        isOnBreakRef.current = false;
        getElectronAPI()?.syncBreakState?.({ isOnBreak: false });
        socketRef.current?.emit('status-update', {
            userId: currentUser.id || currentUser.email,
            status: 'Working'
        });
    }

    function handleStartBreak() {
        applyStartBreak();
        // If user clicked in-app dialog, close native popup too
        getElectronAPI()?.syncBreakState?.({ isOnBreak: true });
    }

    function handleResumeWork() {
        applyResumeWork();
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
