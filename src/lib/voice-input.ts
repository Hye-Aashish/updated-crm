export function isSpeechSupported() {
    if (typeof window === 'undefined') return false
    return !!(window as any).SpeechRecognition || !!(window as any).webkitSpeechRecognition
}

export function startVoiceInput(onResult: (text: string) => void, onError?: (err: string) => void): () => void {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) {
        onError?.('Speech recognition not supported on this browser')
        return () => {}
    }
    const recognition = new SR()
    recognition.lang = 'en-IN'
    recognition.interimResults = false
    recognition.maxAlternatives = 1
    recognition.onresult = (event: any) => {
        const text = event.results?.[0]?.[0]?.transcript || ''
        if (text) onResult(text)
    }
    recognition.onerror = (e: any) => onError?.(e.error || 'voice error')
    recognition.start()
    return () => {
        try { recognition.stop() } catch { /* ignore */ }
    }
}
