import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Download, X } from 'lucide-react'

export function PwaInstallBanner() {
    const [deferred, setDeferred] = useState<any>(null)
    const [hidden, setHidden] = useState(() => localStorage.getItem('nexcrm-pwa-hide') === '1')

    useEffect(() => {
        const onBip = (e: Event) => {
            e.preventDefault()
            setDeferred(e)
        }
        window.addEventListener('beforeinstallprompt', onBip as any)
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('./sw.js').catch(() => {})
        }
        return () => window.removeEventListener('beforeinstallprompt', onBip as any)
    }, [])

    if (hidden || !deferred) return null

    return (
        <div className="md:hidden fixed top-14 inset-x-2 z-40 rounded-2xl border border-border/60 bg-card/95 backdrop-blur shadow-lg p-3 flex items-center gap-2">
            <Download className="h-4 w-4 text-primary shrink-0" />
            <div className="min-w-0 flex-1">
                <p className="text-xs font-bold">Install Nexprism</p>
                <p className="text-[10px] text-muted-foreground">Add to home screen for quick access</p>
            </div>
            <Button size="sm" className="h-8" onClick={async () => {
                deferred.prompt()
                await deferred.userChoice
                setDeferred(null)
            }}>Install</Button>
            <button type="button" className="p-1 text-muted-foreground" onClick={() => {
                localStorage.setItem('nexcrm-pwa-hide', '1')
                setHidden(true)
            }}><X className="h-4 w-4" /></button>
        </div>
    )
}
