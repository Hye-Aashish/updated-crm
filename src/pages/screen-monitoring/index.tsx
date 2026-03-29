import { LiveMonitor } from '@/components/analytics/live-monitor';
import { Monitor } from 'lucide-react';

const ScreenMonitoringPage = () => {
    return (
        <div className="p-6 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
                            <Monitor className="h-8 w-8 text-blue-600" />
                            Screen Monitoring
                        </h1>
                        <p className="text-gray-500 mt-1">Real-time remote desktop monitoring for employees and team members.</p>
                    </div>
                    
                    <div className="flex items-center gap-3">
                        <div className="text-right hidden sm:block">
                            <p className="text-sm font-medium">Monitoring Client</p>
                            <p className="text-xs text-muted-foreground">Required for employees</p>
                        </div>
                        <button 
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-all shadow-md flex items-center gap-2"
                            onClick={() => alert('Download guide: \n1. Run "npm run build:electron" on your computer.\n2. Go to "dist-electron" folder.\n3. Share the "Nexprism Employee Monitor Setup.exe" with your employees.')}
                        >
                            <Monitor className="h-4 w-4" /> Download Employee App
                        </button>
                    </div>
                </div>

            <LiveMonitor />
        </div>
    );
};

export default ScreenMonitoringPage;
