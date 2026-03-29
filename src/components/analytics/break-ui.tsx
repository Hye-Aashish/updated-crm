import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Timer, Coffee, PlayCircle } from 'lucide-react';

interface BreakCheckProps {
    open: boolean;
    onStartBreak: () => void;
    onClose: () => void;
}

export function BreakCheck({ open, onStartBreak, onClose }: BreakCheckProps) {
    const [secondsLeft, setSecondsLeft] = useState(30);

    useEffect(() => {
        if (!open) {
            setSecondsLeft(30);
            return;
        }

        const interval = setInterval(() => {
            setSecondsLeft(prev => {
                if (prev <= 1) {
                    onStartBreak(); // Auto-break after 30s
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [open, onStartBreak]);

    return (
        <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <div className="mx-auto bg-blue-100 p-3 rounded-full w-fit mb-4">
                        <Timer className="h-8 w-8 text-blue-600 animate-pulse" />
                    </div>
                    <DialogTitle className="text-center text-xl">Are you on break?</DialogTitle>
                    <DialogDescription className="text-center">
                        We've detected no activity for over 5 minutes.
                    </DialogDescription>
                </DialogHeader>
                <div className="flex flex-col items-center justify-center p-6 space-y-4">
                    <div className="text-4xl font-bold text-primary">
                        {secondsLeft}s
                    </div>
                    <p className="text-sm text-muted-foreground">
                        Your status will automatically switch to <span className="font-semibold text-orange-500">"On Break"</span> soon.
                    </p>
                </div>
                <DialogFooter className="sm:justify-center gap-2">
                    <Button variant="outline" onClick={onClose}>
                        No, I'm working
                    </Button>
                    <Button onClick={onStartBreak} className="bg-orange-600 hover:bg-orange-700">
                        <Coffee className="h-4 w-4 mr-2" /> Start Break Now
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export function BreakOverlay({ open, onResume }: { open: boolean, onResume: () => void }) {
    if (!open) return null;

    return (
        <div className="fixed inset-0 z-[9999] bg-black/90 backdrop-blur-xl flex items-center justify-center text-white">
            <div className="text-center space-y-8 p-10 max-w-lg">
                <div className="relative">
                    <div className="absolute inset-0 bg-orange-500/20 rounded-full blur-3xl scale-150 animate-pulse" />
                    <Coffee className="h-32 w-32 text-orange-500 mx-auto relative drop-shadow-2xl" />
                </div>
                
                <div className="space-y-4">
                    <h1 className="text-5xl font-black tracking-tighter">YOU ARE ON BREAK</h1>
                    <p className="text-xl text-white/60">Take your time. Your activity is currently not being monitored.</p>
                </div>

                <div className="pt-10">
                    <Button 
                        onClick={onResume} 
                        size="lg" 
                        className="h-16 px-10 text-xl font-bold bg-white text-black hover:bg-gray-200 transition-all rounded-full shadow-2xl hover:scale-105"
                    >
                        <PlayCircle className="h-6 w-6 mr-3" /> Resume Working
                    </Button>
                </div>
                
                <p className="text-sm text-white/30 tracking-widest uppercase">Nexprism Productivity Manager</p>
            </div>
        </div>
    );
}
