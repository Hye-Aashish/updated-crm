import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '@/store'
import api from '@/lib/api-client'
import { useToast } from '@/hooks/use-toast'
import { motion } from 'framer-motion'
import { Mail, Lock, Eye, EyeOff } from 'lucide-react'

export function LoginPage() {
    const navigate = useNavigate()
    const { setCurrentUser } = useAppStore()
    const { toast } = useToast()
    const [loading, setLoading] = useState(false)
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)

    // Branding state
    const [branding, setBranding] = useState({ name: 'Nexprism', logo: null, themeColor: '' })

    useEffect(() => {
        // Fetch Branding
        api.get('/settings').then(res => {
            const cp = res.data?.companyProfile
            if (cp) {
                setBranding({
                    name: cp.name || 'Nexprism',
                    logo: cp.logo,
                    themeColor: cp.themeColor
                })
                if (cp.themeColor) {
                    const hsl = hexToHSL(cp.themeColor)
                    if (hsl) document.documentElement.style.setProperty('--primary', hsl)
                }
            }
        }).catch(() => { })
    }, [])

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        try {
            const res = await api.post('/auth/login', { email, password })
            const userData = res.data

            // Save token for api-client
            if (userData.token) {
                localStorage.setItem('token', userData.token)
            }

            setCurrentUser(userData)
            
            // Identify in Tracker if available
            try {
                if ((window as any).CRMTracker) {
                    (window as any).CRMTracker.identify(userData.email, userData.name);
                }
            } catch (e) {
                console.warn('Tracker identify failed', e);
            }

            toast({ description: `Welcome back, ${userData.name}` })
            navigate('/dashboard')
        } catch (error: any) {
            toast({
                title: "Login Failed",
                description: error.message || "Something went wrong",
                variant: 'destructive'
            })
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen grid lg:grid-cols-2">
            {/* Left: Branding / Visual */}
            <div className="hidden lg:flex flex-col bg-muted text-foreground p-10 pt-16 pb-8 justify-between relative overflow-hidden">
                <div className="z-10">
                    {branding.logo ? (
                        <img src={String(branding.logo)} alt="Logo" className="h-12 object-contain" />
                    ) : (
                        <div className="text-3xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">{branding.name}</div>
                    )}
                </div>

                {/* Animated visual preview cards */}
                <div className="flex-1 flex items-center justify-center relative my-8 min-h-[320px] z-10 translate-y-16">
                    {/* Glowing background circles for visual depth */}
                    <div className="absolute w-72 h-72 rounded-full bg-primary/10 blur-3xl animate-pulse" />
                    
                    {/* Mini Floating Dashboard UI */}
                    <div className="relative w-full max-w-sm h-full flex items-center justify-center scale-95 md:scale-100">
                        {/* 1. Main Stats / Graph Widget */}
                        <motion.div 
                            initial={{ y: 0 }}
                            animate={{ y: [0, -10, 0] }}
                            transition={{ repeat: Infinity, duration: 6, ease: "easeInOut" }}
                            className="absolute -left-4 top-4 w-64 bg-card/75 backdrop-blur-md border border-border/40 rounded-2xl p-4 shadow-xl shadow-foreground/5 z-20"
                        >
                            <div className="flex justify-between items-center mb-3">
                                <div>
                                    <span className="text-[10px] uppercase font-bold text-muted-foreground/85 tracking-wider">Agency Revenue</span>
                                    <h4 className="text-xl font-extrabold text-foreground">$45,280</h4>
                                </div>
                                <span className="text-[10px] text-green-500 font-extrabold bg-green-500/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                                    ↑ 12%
                                </span>
                            </div>
                            
                            {/* SVG Animated Sparkline */}
                            <div className="h-20 w-full flex items-end overflow-hidden">
                                <svg viewBox="0 0 100 40" className="w-full h-full overflow-visible">
                                    <defs>
                                        <linearGradient id="gradient-primary" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.4"/>
                                            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0"/>
                                        </linearGradient>
                                    </defs>
                                    {/* Filled area */}
                                    <motion.path
                                        d="M0 40 Q 15 25, 30 35 T 60 15 T 90 20 T 100 5 L 100 40 Z"
                                        fill="url(#gradient-primary)"
                                        initial={{ pathLength: 0 }}
                                        animate={{ pathLength: 1 }}
                                        transition={{ duration: 2, ease: "easeInOut" }}
                                    />
                                    {/* Line */}
                                    <motion.path
                                        d="M0 40 Q 15 25, 30 35 T 60 15 T 90 20 T 100 5"
                                        fill="none"
                                        stroke="hsl(var(--primary))"
                                        strokeWidth="2.5"
                                        strokeLinecap="round"
                                        initial={{ pathLength: 0 }}
                                        animate={{ pathLength: 1 }}
                                        transition={{ duration: 2, ease: "easeInOut" }}
                                    />
                                    {/* Pulse dot at the end */}
                                    <motion.circle
                                        cx="100"
                                        cy="5"
                                        r="3"
                                        fill="hsl(var(--primary))"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: [0, 1, 0] }}
                                        transition={{ repeat: Infinity, duration: 2 }}
                                    />
                                </svg>
                            </div>
                        </motion.div>

                        {/* 2. Circular Progress/Task Widget */}
                        <motion.div 
                            initial={{ y: 0 }}
                            animate={{ y: [0, 12, 0] }}
                            transition={{ repeat: Infinity, duration: 5, ease: "easeInOut", delay: 0.5 }}
                            className="absolute -right-4 -top-8 w-48 bg-card/75 backdrop-blur-md border border-border/40 rounded-2xl p-4 shadow-xl shadow-foreground/5 z-10"
                        >
                            <div className="flex items-center gap-3">
                                <div className="relative w-12 h-12">
                                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                                        <path
                                            className="text-muted/30"
                                            strokeWidth="3.5"
                                            stroke="currentColor"
                                            fill="none"
                                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                        />
                                        <motion.path
                                            className="text-primary"
                                            strokeWidth="3.5"
                                            strokeLinecap="round"
                                            stroke="currentColor"
                                            fill="none"
                                            strokeDasharray="75, 100"
                                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                            initial={{ strokeDasharray: "0, 100" }}
                                            animate={{ strokeDasharray: "75, 100" }}
                                            transition={{ duration: 1.5, ease: "easeOut", delay: 0.5 }}
                                        />
                                    </svg>
                                    <div className="absolute inset-0 flex items-center justify-center text-xs font-bold">
                                        75%
                                    </div>
                                </div>
                                <div>
                                    <h5 className="text-sm font-bold text-foreground">Tasks Done</h5>
                                    <p className="text-[10px] text-muted-foreground">15 of 20 completed</p>
                                </div>
                            </div>
                        </motion.div>

                        {/* 3. Team Member Bubble Widget */}
                        <motion.div 
                            initial={{ scale: 0.9, y: 0 }}
                            animate={{ scale: 1, y: [0, -8, 0] }}
                            transition={{ repeat: Infinity, duration: 7, ease: "easeInOut", delay: 1 }}
                            className="absolute right-0 bottom-6 w-52 bg-card/75 backdrop-blur-md border border-border/40 rounded-2xl p-3 shadow-xl shadow-foreground/5 z-25"
                        >
                            <span className="text-[9px] uppercase font-bold text-muted-foreground/85 tracking-wider block mb-2">Team Tracking</span>
                            <div className="flex -space-x-2 overflow-hidden mb-2">
                                <img className="inline-block h-6 w-6 rounded-full ring-2 ring-background" src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80" alt="Avatar"/>
                                <img className="inline-block h-6 w-6 rounded-full ring-2 ring-background" src="https://images.unsplash.com/photo-1519345182560-3f2917c472ef?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80" alt="Avatar"/>
                                <img className="inline-block h-6 w-6 rounded-full ring-2 ring-background" src="https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80" alt="Avatar"/>
                                <div className="h-6 w-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[9px] font-bold ring-2 ring-background">+4</div>
                            </div>
                            <div className="flex items-center justify-between text-[10px]">
                                <span className="text-muted-foreground">5 members active</span>
                                <span className="w-2 h-2 rounded-full bg-green-500 animate-ping" />
                            </div>
                        </motion.div>
                    </div>
                </div>

                <div className="z-10 mb-8 mt-12">
                    <h1 className="text-4xl font-bold tracking-tight mb-4">Manage your agency with confidence.</h1>
                    <p className="text-lg text-muted-foreground/80 max-w-md">Streamline projects, team, finance, and client relationships in one unified platform.</p>
                </div>
                {/* Decorative BG */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent pointer-events-none" />
                <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-primary/20 rounded-full blur-3xl" />
                <div className="absolute top-20 right-20 w-60 h-60 bg-purple-500/10 rounded-full blur-3xl" />
            </div>

            {/* Right: Login Form */}
            <div className="flex items-center justify-center p-6 bg-background relative overflow-hidden">
                {/* Subtle background grid pattern */}
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />
                
                {/* Soft glowing ambient light behind the form */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-primary/5 rounded-full blur-3xl pointer-events-none" />

                <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                    className="w-full max-w-md z-10 px-4"
                >
                    <div className="relative group">
                        {/* Glowing backdrop decorative border behind the card */}
                        <div className="absolute -inset-0.5 bg-gradient-to-r from-primary to-blue-500 rounded-2xl blur opacity-25 group-hover:opacity-35 transition duration-1000 group-hover:duration-200" />
                        
                        <Card className="relative w-full border border-border/40 bg-card/75 backdrop-blur-xl shadow-2xl rounded-2xl overflow-hidden">
                            {/* Colorful top bar indicator */}
                            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-blue-500 to-primary/80" />
                            
                            <CardHeader className="space-y-2 text-center pb-4 pt-8">
                                {/* Decorative Key/Shield Badge */}
                                <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-1 border border-primary/20 shadow-inner">
                                    <Lock className="h-5 w-5 text-primary" />
                                </div>
                                <CardTitle className="text-3xl font-black tracking-tight bg-gradient-to-b from-foreground to-foreground/80 bg-clip-text text-transparent">Welcome Back</CardTitle>
                                <CardDescription className="text-muted-foreground text-sm font-medium">Please enter your credentials to login</CardDescription>
                            </CardHeader>
                            <CardContent className="px-6 pb-8">
                                <form onSubmit={handleLogin} className="space-y-5">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="email" className="text-xs uppercase tracking-wider font-bold text-muted-foreground">Email Address</Label>
                                        <div className="relative group/input">
                                            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60 transition-colors group-focus-within/input:text-primary" />
                                            <Input
                                                id="email"
                                                type="email"
                                                placeholder="name@example.com"
                                                value={email}
                                                onChange={e => setEmail(e.target.value)}
                                                required
                                                className="pl-10 h-12 bg-background/40 border-border/50 rounded-xl transition-all duration-300 focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary focus:bg-background/80"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <div className="flex items-center justify-between">
                                            <Label htmlFor="password" className="text-xs uppercase tracking-wider font-bold text-muted-foreground">Password</Label>
                                            <a href="#" className="text-xs font-bold text-primary/80 hover:text-primary transition-colors">Forgot?</a>
                                        </div>
                                        <div className="relative group/input">
                                            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60 transition-colors group-focus-within/input:text-primary" />
                                            <Input
                                                id="password"
                                                type={showPassword ? "text" : "password"}
                                                placeholder="••••••••"
                                                value={password}
                                                onChange={e => setPassword(e.target.value)}
                                                required
                                                className="pl-10 pr-10 h-12 bg-background/40 border-border/50 rounded-xl transition-all duration-300 focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary focus:bg-background/80"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-foreground transition-colors"
                                            >
                                                {showPassword ? (
                                                    <EyeOff className="h-4 w-4" />
                                                ) : (
                                                    <Eye className="h-4 w-4" />
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                    <Button 
                                        className="w-full h-12 rounded-xl font-bold bg-primary hover:bg-primary/95 text-primary-foreground shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/35 transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0 mt-2" 
                                        type="submit" 
                                        disabled={loading}
                                    >
                                        {loading ? (
                                            <span className="mr-2 h-4 w-4 animate-spin border-2 border-current border-t-transparent rounded-full" />
                                        ) : "Sign In"}
                                    </Button>
                                </form>
                            </CardContent>
                        </Card>
                    </div>
                </motion.div>
            </div>
        </div>
    )
}

function hexToHSL(hex: string) {
    let result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return null;
    let r = parseInt(result[1], 16);
    let g = parseInt(result[2], 16);
    let b = parseInt(result[3], 16);
    r /= 255; g /= 255; b /= 255;
    let max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0, l = (max + min) / 2;
    if (max !== min) {
        let d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }
    return `${(h * 360).toFixed(1)} ${(s * 100).toFixed(1)}% ${(l * 100).toFixed(1)}%`;
}
