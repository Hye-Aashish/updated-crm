import { BrowserRouter } from 'react-router-dom'
import { AppRoutes } from './routes'
import { ThemeProvider } from './components/theme-provider'
import { Toaster } from './components/ui/toaster'

import { ReminderManager } from './components/reminder-manager'
import { useEmployeeMonitor } from './hooks/use-employee-monitor'
import { BreakCheck, BreakOverlay } from './components/analytics/break-ui'

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
                <AppRoutes />
                <Toaster />
            </BrowserRouter>
        </ThemeProvider>
    )
}

export default App
