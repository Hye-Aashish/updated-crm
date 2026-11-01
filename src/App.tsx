import { BrowserRouter } from 'react-router-dom'
import { AppRoutes } from './routes'
import { ThemeProvider } from './components/theme-provider'
import { Toaster } from './components/ui/toaster'
import { ConfirmProvider } from './components/confirm-provider'

import { ReminderManager } from './components/reminder-manager'
import { useEmployeeMonitor } from './hooks/use-employee-monitor'
import { BreakCheck, BreakOverlay } from './components/analytics/break-ui'
import { PwaInstallBanner } from './components/pwa-install-banner'

function App() {
    const { 
        breakCheck, 
        setBreakCheck, 
        isOnBreak, 
        handleStartBreak, 
        handleResumeWork 
    } = useEmployeeMonitor();

    return (
        <ThemeProvider defaultTheme="light" storageKey="nexprism-theme">
            <ConfirmProvider>
                <BrowserRouter>
                    {/* Break Management Components (Visible only in Electron) */}
                    <BreakCheck 
                        open={breakCheck} 
                        onStartBreak={handleStartBreak} 
                        onClose={() => setBreakCheck(false)} 
                    />
                    <BreakOverlay 
                        open={isOnBreak} 
                        onResume={handleResumeWork} 
                        />
                    <ReminderManager />
                    <PwaInstallBanner />
                    <AppRoutes />
                    <Toaster />
                </BrowserRouter>
            </ConfirmProvider>
        </ThemeProvider>
    )
}

export default App
