import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Monitor, Play, Square, Loader2, Maximize2, Minimize2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent } from '@/components/ui/dialog';

const getSocketURL = () => {
    const envURL = (import.meta as any).env.VITE_API_URL || 'http://localhost:5000/api';
    return envURL.replace('/api', '');
};

const SOCKET_URL = getSocketURL();

export function LiveMonitor() {
    const [streamers, setStreamers] = useState<any[]>([]);
    const [activeUserId, setActiveUserId] = useState<string | null>(null);
    const [activeScreenId, setActiveScreenId] = useState<string | null>(null);
    const [currentFrame, setCurrentFrame] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const socketRef = useRef<any>(null);

    useEffect(() => {
        socketRef.current = io(SOCKET_URL);

        socketRef.current.on('connect', () => {
            console.log('Connected to monitoring socket');
            socketRef.current.emit('get-streamers');
        });

        socketRef.current.on('streamer-list-update', (list: any[]) => {
            setStreamers(list);
        });

        socketRef.current.on('screen-frame-update', (frame: string) => {
            setCurrentFrame(frame);
            setLoading(false);
        });

        return () => {
            if (socketRef.current) socketRef.current.disconnect();
        };
    }, []);

    const startWatching = (userId: string) => {
        if (activeUserId) {
            socketRef.current.emit('stop-watching', activeUserId);
        }
        setActiveUserId(userId);
        setCurrentFrame(null);
        setLoading(true);
        socketRef.current.emit('watch-user', userId);
        
        // Default to first screen if available
        const user = streamers.find(s => s.id === userId);
        if (user?.screens?.length > 0) {
            setActiveScreenId(user.screens[0].id);
        }
    };

    const switchScreen = (screenId: string) => {
        setActiveScreenId(screenId);
        setCurrentFrame(null);
        setLoading(true);
        socketRef.current.emit('request-screen-change', { userId: activeUserId, screenId });
    };

    const stopWatching = () => {
        if (activeUserId) {
            socketRef.current.emit('stop-watching', activeUserId);
        }
        setActiveUserId(null);
        setCurrentFrame(null);
    };

    const activeUser = streamers.find(s => s.id === activeUserId);

    return (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Streamers Sidebar */}
            <Card className="lg:col-span-1">
                <CardHeader>
                    <CardTitle className="text-sm font-semibold">Online Employees</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="divide-y">
                        {streamers.length === 0 ? (
                            <div className="p-8 text-center text-muted-foreground text-xs">
                                No employees currently using the desktop app.
                            </div>
                        ) : (
                            streamers.map(user => (
                                <div 
                                    key={user.id} 
                                    className={`p-4 flex items-center justify-between hover:bg-muted/50 transition-colors cursor-pointer ${activeUserId === user.id ? 'bg-primary/5' : ''}`}
                                    onClick={() => startWatching(user.id)}
                                >
                                    <div className="flex items-center gap-3">
                                        <Avatar className="h-8 w-8">
                                            <AvatarFallback>{user.name?.[0] || 'U'}</AvatarFallback>
                                        </Avatar>
                                        <div className="overflow-hidden">
                                            <p className="text-sm font-medium truncate">{user.name}</p>
                                            <div className="flex items-center gap-2">
                                                <Badge variant={user.status === 'On Break' ? 'warning' : 'success'} className="text-[8px] h-3 px-1 uppercase leading-none">
                                                    {user.status || 'Working'}
                                                </Badge>
                                                <p className="text-[10px] text-muted-foreground whitespace-nowrap">{user.screens?.length || 1} Screen(s)</p>
                                            </div>
                                        </div>
                                    </div>
                                    {activeUserId === user.id ? (
                                        <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                                    ) : (
                                        <Play className="h-3 w-3 text-muted-foreground" />
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Monitor View */}
            <Card className="lg:col-span-3 min-h-[500px] flex flex-col">
                <CardHeader className="flex flex-row items-center justify-between border-b py-3">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <Monitor className="h-4 w-4 text-blue-600" />
                            <CardTitle className="text-base">
                                {activeUserId ? `Monitoring: ${activeUser?.name || activeUserId}` : 'Live Screen Feed'}
                            </CardTitle>
                        </div>
                        
                        {/* Screen Selector */}
                        {activeUser?.screens?.length > 1 && (
                            <div className="flex items-center gap-2 bg-muted p-1 rounded-lg">
                                {activeUser.screens.map((screen: any, idx: number) => (
                                    <Badge 
                                        key={screen.id} 
                                        variant={activeScreenId === screen.id ? 'default' : 'outline'}
                                        className="cursor-pointer hover:opacity-80 transition-opacity"
                                        onClick={() => switchScreen(screen.id)}
                                    >
                                        Screen {idx + 1}
                                    </Badge>
                                ))}
                            </div>
                        )}
                    </div>
                    {activeUserId && (
                        <div className="flex items-center gap-2">
                            {currentFrame && (
                                <Button variant="outline" size="sm" onClick={() => setIsFullscreen(true)} className="flex items-center gap-2">
                                    <Maximize2 className="h-4 w-4" /> Full Screen
                                </Button>
                            )}
                            <Button variant="ghost" size="sm" onClick={stopWatching} className="text-red-500 hover:text-red-600 hover:bg-red-50">
                                <Square className="h-3 w-3 mr-2 fill-current" /> Stop Stream
                            </Button>
                        </div>
                    )}
                </CardHeader>
                <CardContent className="flex-1 p-0 flex items-center justify-center bg-gray-950 relative overflow-hidden">
                    {!activeUserId && (
                        <div className="text-center text-gray-500">
                            <Monitor className="h-12 w-12 mx-auto mb-4 opacity-20" />
                            <p>Select an employee from the list to view their screen in real-time.</p>
                        </div>
                    )}

                    {activeUserId && loading && (
                        <div className="text-white flex flex-col items-center gap-4">
                            <Loader2 className="h-8 w-8 animate-spin" />
                            <p className="text-sm font-medium">Connecting to {activeScreenId ? 'Remote Display' : 'Employee' }...</p>
                        </div>
                    )}

                    {activeUserId && currentFrame && (
                        <div className="relative w-full h-full flex items-center justify-center group">
                            <img 
                                src={currentFrame} 
                                alt="Live Screen" 
                                className="max-w-full max-h-full object-contain shadow-2xl transition-transform duration-300" 
                                style={{ imageRendering: 'auto' }}
                            />
                            {/* Overlay info */}
                            <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-md border border-white/10 text-white text-[10px] px-3 py-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                                🟢 Live Feed • {activeScreenId ? activeUser?.screens?.find((s:any) => s.id === activeScreenId)?.name : 'Screen 1'}
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Fullscreen Viewer Dialog */}
            <Dialog open={isFullscreen} onOpenChange={setIsFullscreen}>
                <DialogContent className="max-w-[100vw] w-screen h-screen p-0 m-0 border-0 bg-black flex items-center justify-center">
                    {currentFrame && (
                        <div className="relative w-full h-full flex items-center justify-center p-4">
                            <img 
                                src={currentFrame} 
                                alt="Full Screen Feed" 
                                className="max-w-full max-h-full object-contain"
                            />
                            <div className="absolute top-6 left-6 flex items-center gap-3">
                                <Avatar className="h-10 w-10 border-2 border-primary/20 bg-black/40 backdrop-blur-md">
                                    <AvatarFallback>{activeUser?.name?.[0] || 'U'}</AvatarFallback>
                                </Avatar>
                                <div className="text-white drop-shadow-md">
                                    <p className="font-bold text-lg">{activeUser?.name}</p>
                                    <p className="text-xs text-white/60">Live Feed • {activeScreenId ? activeUser?.screens?.find((s:any) => s.id === activeScreenId)?.name : 'Screen 1'}</p>
                                </div>
                            </div>
                            <Button 
                                variant="outline" 
                                className="absolute top-6 right-6 bg-white/10 border-white/20 text-white hover:bg-white/20 hover:text-white backdrop-blur-md"
                                onClick={() => setIsFullscreen(false)}
                            >
                                <Minimize2 className="h-4 w-4 mr-2" /> Exit Full Screen
                            </Button>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
