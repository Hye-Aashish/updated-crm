import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    Brain,
    Send,
    Sparkles,
    AlertTriangle,
    CheckCircle2,
    Loader2,
    Bot,
    User,
    Zap,
    BarChart3,
    IndianRupee,
    ChevronRight,
    Trash2
} from 'lucide-react'
import api from '@/lib/api-client'

interface Message {
    id: string
    role: 'user' | 'assistant'
    content: string
    timestamp: Date
    dataSnapshot?: any
}

interface Insight {
    type: 'danger' | 'warning' | 'info' | 'success'
    icon: string
    title: string
    message: string
}

const SUGGESTED_QUESTIONS = [
    { icon: '📊', text: 'Mera overall business ka summary do', category: 'Overview' },
    { icon: '💰', text: 'Revenue aur expenses ka analysis karo', category: 'Finance' },
    { icon: '📋', text: 'Overdue tasks kaun se hain?', category: 'Tasks' },
    { icon: '🎯', text: 'Lead conversion rate kaisa hai? Kaise improve karein?', category: 'Leads' },
    { icon: '⚠️', text: 'Pending invoices ki list do aur follow-up plan suggest karo', category: 'Invoices' },
    { icon: '🚀', text: 'Next month ke liye kya action plan hona chahiye?', category: 'Strategy' },
    { icon: '👥', text: 'Team ki productivity kaisi hai?', category: 'Team' },
    { icon: '📈', text: 'Business growth ke liye top 5 suggestions do', category: 'Growth' },
]

export default function AIAssistantPage() {
    const [messages, setMessages] = useState<Message[]>([])
    const [input, setInput] = useState('')
    const [loading, setLoading] = useState(false)
    const [insights, setInsights] = useState<Insight[]>([])
    const [insightsData, setInsightsData] = useState<any>(null)
    const [insightsLoading, setInsightsLoading] = useState(true)
    const [apiKeyMissing, setApiKeyMissing] = useState(false)
    const scrollContainerRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLTextAreaElement>(null)

    // Scroll to bottom on new messages with user override check
    useEffect(() => {
        const container = scrollContainerRef.current
        if (!container) return

        // Check if user is scrolled near the bottom (within 120px tolerance)
        const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 120

        if (isNearBottom || messages.length === 0 || messages[messages.length - 1]?.role === 'user') {
            container.scrollTo({
                top: container.scrollHeight,
                behavior: 'smooth'
            })
        }
    }, [messages])

    // Fetch insights on load
    useEffect(() => {
        fetchInsights()
    }, [])

    const fetchInsights = async () => {
        try {
            setInsightsLoading(true)
            const res = await api.get('/ai-assistant/insights')
            setInsights(res.data.insights || [])
            setInsightsData(res.data)
        } catch (err) {
            console.error('Failed to fetch insights:', err)
        } finally {
            setInsightsLoading(false)
        }
    }

    const sendMessage = async (text?: string) => {
        const messageText = text || input.trim()
        if (!messageText || loading) return

        const userMessage: Message = {
            id: `msg-${Date.now()}`,
            role: 'user',
            content: messageText,
            timestamp: new Date()
        }

        setMessages(prev => [...prev, userMessage])
        setInput('')
        setLoading(true)
        setApiKeyMissing(false)

        const assistantMsgId = `msg-${Date.now()}-ai`
        const assistantMessage: Message = {
            id: assistantMsgId,
            role: 'assistant',
            content: '',
            timestamp: new Date()
        }
        setMessages(prev => [...prev, assistantMessage])

        try {
            const conversationHistory = messages.map(m => ({
                role: m.role,
                content: m.content
            }))

            const token = localStorage.getItem('token')
            const baseURL = api.defaults.baseURL || 'http://localhost:5008/api'

            const response = await fetch(`${baseURL}/ai-assistant/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': token ? `Bearer ${token}` : ''
                },
                body: JSON.stringify({
                    message: messageText,
                    conversationHistory
                })
            })

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}))
                if (errData?.needsApiKey) {
                    setApiKeyMissing(true)
                }
                throw new Error(errData?.message || 'Failed to connect to AI server')
            }

            const reader = response.body?.getReader()
            const decoder = new TextDecoder()
            if (!reader) throw new Error('Streaming not supported by browser.')

            let accumulatedContent = ''

            while (true) {
                const { done, value } = await reader.read()
                if (done) break

                const chunk = decoder.decode(value, { stream: true })
                const lines = chunk.split('\n')
                for (const line of lines) {
                    const trimmed = line.trim()
                    if (trimmed.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(trimmed.slice(6))
                            if (data.error) {
                                throw new Error(data.error)
                            }
                            if (data.text) {
                                accumulatedContent += data.text
                                setMessages(prev => prev.map(m =>
                                    m.id === assistantMsgId ? { ...m, content: accumulatedContent } : m
                                ))
                            }
                            if (data.done) {
                                if (data.dataSnapshot) {
                                    setMessages(prev => prev.map(m =>
                                        m.id === assistantMsgId ? { ...m, dataSnapshot: data.dataSnapshot } : m
                                    ))
                                    fetchInsights()
                                }
                            }
                        } catch (e) {
                            // ignore partial JSON
                        }
                    }
                }
            }
        } catch (err: any) {
            setMessages(prev => prev.map(m =>
                m.id === assistantMsgId
                    ? { ...m, content: `❌ Error: ${err.message || 'Something went wrong. Please try again.'}` }
                    : m
            ))
        } finally {
            setLoading(false)
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            sendMessage()
        }
    }

    const clearChat = () => {
        setMessages([])
    }

    const formatMarkdown = (text: string) => {
        if (!text) return '';

        // Extract triple-backtick code blocks first to protect them from other replaces
        const codeBlocks: string[] = [];
        let processedText = text.replace(/```([\s\S]*?)```/g, (_, codeContent) => {
            const index = codeBlocks.length;
            
            let cleanedCode = codeContent.trim();
            const firstLineBreak = cleanedCode.indexOf('\n');
            let lang = '';
            if (firstLineBreak !== -1 && firstLineBreak < 15) {
                const possibleLang = cleanedCode.substring(0, firstLineBreak).trim();
                if (/^[a-zA-Z0-9+#-]+$/.test(possibleLang)) {
                    lang = possibleLang;
                    cleanedCode = cleanedCode.substring(firstLineBreak + 1).trim();
                }
            }

            const escapedCode = cleanedCode
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#039;');

            const codeBlockHtml = `
                <div class="my-3 rounded-lg overflow-hidden border border-border bg-slate-900 dark:bg-slate-950 font-mono text-xs text-slate-200">
                    <div class="flex items-center justify-between px-4 py-1.5 bg-slate-800 dark:bg-slate-950 border-b border-border/40 text-[10px] uppercase font-semibold text-slate-400">
                        <span>${lang || 'code'}</span>
                        <button onclick="navigator.clipboard.writeText(\`${escapedCode.replace(/`/g, '\\`').replace(/\$/g, '\\$')}\`); const btn = this; btn.innerText = 'Copied!'; setTimeout(() => btn.innerText = 'Copy', 2000);" class="px-2 py-0.5 rounded bg-slate-700/50 hover:bg-slate-700 hover:text-white transition-colors cursor-pointer">Copy</button>
                    </div>
                    <pre class="p-4 overflow-x-auto whitespace-pre-wrap break-all select-text leading-relaxed"><code>${escapedCode}</code></pre>
                </div>
            `;
            codeBlocks.push(codeBlockHtml);
            return `__CODE_BLOCK_PLACEHOLDER_${index}__`;
        });

        processedText = processedText
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/__CODE_BLOCK_PLACEHOLDER_(\d+)__/g, '___CODE_BLOCK_PLACEHOLDER_$1___');

        processedText = processedText
            .replace(/^### (.*$)/gm, '<h3 class="text-base font-bold mt-4 mb-2 text-foreground">$1</h3>')
            .replace(/^## (.*$)/gm, '<h2 class="text-lg font-bold mt-5 mb-2.5 text-foreground border-b pb-1">$1</h2>')
            .replace(/^# (.*$)/gm, '<h1 class="text-xl font-bold mt-6 mb-3 text-foreground">$1</h1>')
            .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-foreground">$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/`(.*?)`/g, '<code class="bg-muted px-1.5 py-0.5 rounded text-xs font-mono font-semibold">$1</code>')
            .replace(/^[\-\*] (.*$)/gm, '<li class="ml-4 list-disc my-1">$1</li>')
            .replace(/^\d+\.\s(.*$)/gm, '<li class="ml-4 list-decimal my-1">$1</li>')
            .replace(/\n\n/g, '<br/><br/>')
            .replace(/\n/g, '<br/>');

        codeBlocks.forEach((blockHtml, i) => {
            processedText = processedText.replace(`___CODE_BLOCK_PLACEHOLDER_${i}___`, blockHtml);
        });

        return processedText;
    }

    const getInsightColor = (type: string) => {
        switch (type) {
            case 'danger': return 'bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400'
            case 'warning': return 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400'
            case 'success': return 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
            case 'info': return 'bg-blue-500/10 border-blue-500/30 text-blue-600 dark:text-blue-400'
            default: return 'bg-muted border-border text-foreground'
        }
    }

    return (
        <div className="flex h-[calc(100vh-8rem)] md:h-[calc(100vh-4rem)] -mx-3 -mt-3 sm:-mx-4 sm:-mt-4 md:-mx-8 md:-mt-8 -mb-28 bg-background overflow-hidden">
            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Header */}
                <div className="border-b bg-card px-6 py-4 shrink-0">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="relative">
                                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/25">
                                    <Brain className="h-5 w-5 text-white" />
                                </div>
                                <div className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-emerald-500 border-2 border-card" />
                            </div>
                            <div>
                                <h1 className="text-lg font-bold flex items-center gap-2">
                                    Nexprism AI
                                    <span className="text-[10px] font-medium bg-gradient-to-r from-violet-500 to-indigo-500 text-white px-2 py-0.5 rounded-full uppercase tracking-wider">Beta</span>
                                </h1>
                                <p className="text-xs text-muted-foreground">Your intelligent CRM business advisor</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {messages.length > 0 && (
                                <button
                                    onClick={clearChat}
                                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-destructive transition-colors px-3 py-1.5 rounded-lg hover:bg-destructive/10"
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                    Clear Chat
                                </button>
                            )}
                            <button
                                onClick={() => sendMessage('Give me a complete business analysis with actionable insights')}
                                className="flex items-center gap-1.5 text-xs font-medium bg-gradient-to-r from-violet-500 to-indigo-500 text-white px-4 py-2 rounded-lg hover:opacity-90 transition-opacity shadow-md shadow-violet-500/25"
                            >
                                <Zap className="h-3.5 w-3.5" />
                                Quick Analysis
                            </button>
                        </div>
                    </div>
                </div>

                {/* Messages Area */}
                <div ref={scrollContainerRef} className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                    {messages.length === 0 ? (
                        /* Welcome State */
                        <div className="flex flex-col items-center justify-center h-full">
                            <motion.div
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ duration: 0.5 }}
                                className="text-center max-w-2xl"
                            >
                                <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-violet-500 via-purple-500 to-indigo-600 flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-violet-500/30">
                                    <Sparkles className="h-10 w-10 text-white" />
                                </div>
                                <h2 className="text-2xl font-bold mb-2">Nexprism AI Assistant</h2>
                                <p className="text-muted-foreground mb-8">
                                    Main aapke poore CRM ka data analyze karke aapko smart business decisions lene mein madad karunga.
                                    Koi bhi sawal puchiye! 🚀
                                </p>

                                {/* Suggested Questions */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-left">
                                    {SUGGESTED_QUESTIONS.map((q, i) => (
                                        <motion.button
                                            key={i}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: i * 0.05 }}
                                            onClick={() => sendMessage(q.text)}
                                            className="flex items-center gap-3 p-3 rounded-xl border bg-card hover:bg-accent hover:border-primary/30 transition-all group text-sm"
                                        >
                                            <span className="text-lg">{q.icon}</span>
                                            <span className="flex-1 text-foreground/80 group-hover:text-foreground">{q.text}</span>
                                            <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </motion.button>
                                    ))}
                                </div>
                            </motion.div>
                        </div>
                    ) : (
                        /* Chat Messages */
                        <AnimatePresence>
                            {messages.map((msg) => (
                                <motion.div
                                    key={msg.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                >
                                    {msg.role === 'assistant' && (
                                        <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shrink-0 mt-1">
                                            <Bot className="h-4 w-4 text-white" />
                                        </div>
                                    )}
                                    <div className={`max-w-[75%] rounded-2xl px-4 py-3 ${msg.role === 'user'
                                        ? 'bg-primary text-primary-foreground rounded-br-md'
                                        : 'bg-card border rounded-bl-md shadow-sm'
                                        }`}>
                                        {msg.role === 'assistant' ? (
                                            <div
                                                className="text-sm leading-relaxed prose prose-sm dark:prose-invert max-w-none [&_li]:my-0.5 [&_h1]:text-base [&_h2]:text-sm [&_h3]:text-sm"
                                                dangerouslySetInnerHTML={{ __html: formatMarkdown(msg.content) }}
                                            />
                                        ) : (
                                            <p className="text-sm">{msg.content}</p>
                                        )}
                                        <p className={`text-[10px] mt-2 ${msg.role === 'user' ? 'text-primary-foreground/60' : 'text-muted-foreground'}`}>
                                            {new Date(msg.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                    </div>
                                    {msg.role === 'user' && (
                                        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-1">
                                            <User className="h-4 w-4 text-primary" />
                                        </div>
                                    )}
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    )}

                    {/* Loading indicator */}
                    {loading && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex gap-3"
                        >
                            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shrink-0">
                                <Bot className="h-4 w-4 text-white" />
                            </div>
                            <div className="bg-card border rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    <span>Analyzing CRM data...</span>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* API Key Warning */}
                    {apiKeyMissing && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 text-sm"
                        >
                            <p className="font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-2 mb-2">
                                <AlertTriangle className="h-4 w-4" /> API Key Required
                            </p>
                            <p className="text-muted-foreground">
                                To use AI Assistant, add your Google Gemini API key:
                            </p>
                            <ol className="list-decimal ml-5 mt-2 text-muted-foreground space-y-1">
                                <li>Go to <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" className="text-primary underline">Google AI Studio</a> and get a free API key</li>
                                <li>Add <code className="bg-muted px-1.5 py-0.5 rounded text-xs">GEMINI_API_KEY=your-key-here</code> to <code className="bg-muted px-1.5 py-0.5 rounded text-xs">backend/.env</code></li>
                                <li>Restart the backend server</li>
                            </ol>
                        </motion.div>
                    )}
                </div>

                {/* Input Area */}
                <div className="border-t bg-card px-6 py-4 shrink-0">
                    <div className="flex items-end gap-3 max-w-4xl mx-auto">
                        <div className="flex-1 relative">
                            <textarea
                                ref={inputRef}
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Apna sawal puchiye... (e.g., 'Mera revenue kaisa hai?')"
                                rows={1}
                                className="w-full resize-none rounded-xl border bg-background px-4 py-3 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all placeholder:text-muted-foreground/60"
                                style={{ minHeight: '44px', maxHeight: '120px' }}
                                onInput={(e) => {
                                    const target = e.target as HTMLTextAreaElement
                                    target.style.height = '44px'
                                    target.style.height = target.scrollHeight + 'px'
                                }}
                            />
                        </div>
                        <button
                            onClick={() => sendMessage()}
                            disabled={!input.trim() || loading}
                            className="h-11 w-11 rounded-xl bg-gradient-to-r from-violet-500 to-indigo-600 text-white flex items-center justify-center hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-all shrink-0 shadow-lg shadow-violet-500/25"
                        >
                            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                        </button>
                    </div>
                    <p className="text-[10px] text-muted-foreground text-center mt-2">
                        AI analyzes your real CRM data · Powered by Gemini · Admin & Owner only
                    </p>
                </div>
            </div>

            {/* Right Sidebar — Quick Insights */}
            <div className="hidden xl:flex w-80 border-l bg-card flex-col shrink-0">
                <div className="px-4 py-4 border-b">
                    <h3 className="font-semibold text-sm flex items-center gap-2">
                        <BarChart3 className="h-4 w-4 text-primary" />
                        Live Insights
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">Real-time CRM health</p>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {insightsLoading ? (
                        <div className="flex items-center justify-center py-10">
                            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                        </div>
                    ) : (
                        <>
                            {/* KPI Cards */}
                            {insightsData && (
                                <div className="grid grid-cols-2 gap-2 mb-4">
                                    <div className="bg-emerald-500/10 rounded-lg p-3 border border-emerald-500/20">
                                        <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium uppercase tracking-wider">Revenue</p>
                                        <p className="text-sm font-bold flex items-center gap-0.5 mt-1">
                                            <IndianRupee className="h-3 w-3" />{(insightsData.summary?.totalRevenue || 0).toLocaleString('en-IN')}
                                        </p>
                                    </div>
                                    <div className="bg-red-500/10 rounded-lg p-3 border border-red-500/20">
                                        <p className="text-[10px] text-red-600 dark:text-red-400 font-medium uppercase tracking-wider">Expenses</p>
                                        <p className="text-sm font-bold flex items-center gap-0.5 mt-1">
                                            <IndianRupee className="h-3 w-3" />{(insightsData.summary?.totalExpenses || 0).toLocaleString('en-IN')}
                                        </p>
                                    </div>
                                    <div className="bg-blue-500/10 rounded-lg p-3 border border-blue-500/20">
                                        <p className="text-[10px] text-blue-600 dark:text-blue-400 font-medium uppercase tracking-wider">Projects</p>
                                        <p className="text-sm font-bold mt-1">{insightsData.projects?.active || 0} active</p>
                                    </div>
                                    <div className="bg-amber-500/10 rounded-lg p-3 border border-amber-500/20">
                                        <p className="text-[10px] text-amber-600 dark:text-amber-400 font-medium uppercase tracking-wider">Leads</p>
                                        <p className="text-sm font-bold mt-1">{insightsData.leads?.conversionRate || '0%'}</p>
                                    </div>
                                </div>
                            )}

                            {/* Insight Cards */}
                            {insights.map((insight, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, x: 10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.05 }}
                                    className={`rounded-lg border p-3 ${getInsightColor(insight.type)}`}
                                >
                                    <p className="text-xs font-semibold flex items-center gap-1.5">
                                        <span>{insight.icon}</span> {insight.title}
                                    </p>
                                    <p className="text-xs mt-1 opacity-80">{insight.message}</p>
                                </motion.div>
                            ))}

                            {insights.length === 0 && (
                                <div className="text-center text-muted-foreground text-xs py-8">
                                    <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-emerald-500" />
                                    <p>Everything looks good! 🎉</p>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Quick Actions */}
                <div className="border-t p-4 space-y-2">
                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2">Quick Ask</p>
                    {[
                        { text: 'Kya problems hain?', icon: '⚠️' },
                        { text: 'Aaj kya karna chahiye?', icon: '📋' },
                        { text: 'Revenue kaise badhein?', icon: '📈' },
                    ].map((q, i) => (
                        <button
                            key={i}
                            onClick={() => sendMessage(q.text)}
                            className="w-full text-left text-xs px-3 py-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors flex items-center gap-2"
                        >
                            <span>{q.icon}</span> {q.text}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    )
}
