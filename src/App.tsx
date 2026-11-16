import { useEffect } from 'react'
import { BrowserRouter, HashRouter, useNavigate } from 'react-router-dom'
import { AppRoutes } from './routes'
import { ThemeProvider } from './components/theme-provider'
import { Toaster } from './components/ui/toaster'
import { ConfirmProvider } from './components/confirm-provider'

import { ReminderManager } from './components/reminder-manager'
import { useEmployeeMonitor } from './hooks/use-employee-monitor'
import { BreakCheck, BreakOverlay } from './components/analytics/break-ui'
import { PwaInstallBanner } from './components/pwa-install-banner'
import { syncElectronAuthFromStorage } from './lib/electron-auth-sync'
import { useAppStore } from './store'

/** Electron loads UI via file:// — BrowserRouter white-screens; HashRouter works. */
function isElectronShell() {
    if (typeof window === 'undefined') return false
    return !!(window as any).electronAPI || /Electron/i.test(navigator.userAgent)
}

function ElectronBridge() {
    const navigate = useNavigate()
    const currentUser = useAppStore((s) => s.currentUser)

    useEffect(() => {
        syncElectronAuthFromStorage(currentUser)
    }, [currentUser])

    useEffect(() => {
        const api = (window as any).electronAPI
        if (!api?.onOpenLogin) return
        const off = api.onOpenLogin(() => {
            navigate('/login', { replace: true })
        })
        return typeof off === 'function' ? off : undefined
    }, [navigate])

    return null
}

function App() {
    const { 
        breakCheck, 
        setBreakCheck, 
        isOnBreak, 
        handleStartBreak, 
        handleResumeWork 
    } = useEmployeeMonitor();

    const Router = isElectronShell() ? HashRouter : BrowserRouter

    return (
        <ThemeProvider defaultTheme="light" storageKey="nexprism-theme">
            <ConfirmProvider>
                <Router>
                    <ElectronBridge />
                    {/* Break Management Components (Visible only in Electron) */}
                    <BreakCheck 
                        open={breakCheck} 
                        onStartBreak={handleStartBreak} 
                        onClose={() => {
                            // Keep main-process popup / idle state in sync when dismissing in-app dialog
                            setBreakCheck(false)
                            ;(window as any).electronAPI?.syncBreakState?.({ isOnBreak: false })
                        }} 
                    />
                    <BreakOverlay 
                        open={isOnBreak} 
                        onResume={handleResumeWork} 
                        />
                    <ReminderManager />
                    <PwaInstallBanner />
                    <AppRoutes />
                    <Toaster />
                </Router>
            </ConfirmProvider>
        </ThemeProvider>
    )
}

export default App
