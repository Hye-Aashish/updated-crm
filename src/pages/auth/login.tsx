import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '@/store'
import api from '@/lib/api-client'
import { useToast } from '@/hooks/use-toast'

export function LoginPage() {
    const navigate = useNavigate()
    const { setCurrentUser } = useAppStore()
    const { toast } = useToast()
    const [loading, setLoading] = useState(false)
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')

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
            toast({ description: `Welcome back, ${userData.name}` })
            navigate('/dashboard')
        } catch (error: any) {
            toast({
                title: "Login Failed",
                description: error.response?.data?.message || "Invalid credentials",
                variant: 'destructive'
            })
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen grid lg:grid-cols-2">
            {/* Left: Branding / Visual */}
            <div className="hidden lg:flex flex-col bg-muted text-foreground p-10 justify-between relative overflow-hidden">
                <div className="z-10">
                    {branding.logo ? (
                        <img src={String(branding.logo)} alt="Logo" className="h-12 object-contain" />
                    ) : (
                        <div className="text-3xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">{branding.name}</div>
                    )}
                </div>
                <div className="z-10 mb-20">
                    <h1 className="text-4xl font-bold tracking-tight mb-4">Manage your agency with confidence.</h1>
                    <p className="text-lg text-muted-foreground/80 max-w-md">Streamline projects, team, finance, and client relationships in one unified platform.</p>
                </div>
                {/* Decorative BG */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent pointer-events-none" />
                <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-primary/20 rounded-full blur-3xl" />
                <div className="absolute top-20 right-20 w-60 h-60 bg-purple-500/10 rounded-full blur-3xl" />
            </div>

            {/* Right: Login Form */}
            <div className="flex items-center justify-center p-6 bg-background">
                <Card className="w-full max-w-md border-0 shadow-none sm:border sm:shadow-lg">
                    <CardHeader className="space-y-1 text-center sm:text-left">
                        <CardTitle className="text-2xl font-bold tracking-tight">Sign in</CardTitle>
                        <CardDescription>Enter your email and password to access your account</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleLogin} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="email">Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="name@example.com"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="password">Password</Label>
                                    <a href="#" className="text-sm font-medium text-primary hover:underline">Forgot password?</a>
                                </div>
                                <Input
                                    id="password"
                                    type="password"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    required
                                />
                            </div>
                            <Button className="w-full" type="submit" disabled={loading}>
                                {loading && <span className="mr-2 h-4 w-4 animate-spin border-2 border-current border-t-transparent rounded-full" />}
                                Sign In
                            </Button>
                        </form>
                    </CardContent>
                    <CardFooter className="flex flex-col gap-4">
                        <div className="relative w-full">
                            <div className="absolute inset-0 flex items-center">
                                <span className="w-full border-t" />
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-background px-2 text-muted-foreground font-semibold">Quick Demo Login</span>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 w-full">
                            {[
                                { role: 'Owner', email: 'owner@example.com', icon: '👑' },
                                { role: 'Admin', email: 'admin@example.com', icon: '🛡️' },
                                { role: 'Employee', email: 'employee@example.com', icon: '👨‍💻' }
                            ].map((demo) => (
                                <button
                                    key={demo.role}
                                    type="button"
                                    onClick={() => {
                                        setEmail(demo.email);
                                        setPassword('password');
                                        // Trigger login after a short delay to show the fields being filled
                                        setTimeout(() => {
                                            const form = document.querySelector('form');
                                            form?.requestSubmit();
                                        }, 100);
                                    }}
                                    className="flex flex-col items-center justify-center p-3 rounded-xl border-2 border-muted bg-card hover:border-primary hover:bg-primary/5 transition-all group"
                                >
                                    <span className="text-xl mb-1 group-hover:scale-110 transition-transform">{demo.icon}</span>
                                    <span className="font-bold text-xs text-foreground">{demo.role}</span>
                                    <span className="text-[10px] text-muted-foreground truncate w-full">{demo.email}</span>
                                </button>
                            ))}
                        </div>
                        <p className="text-[10px] text-center text-muted-foreground">
                            Password for all accounts is <code className="bg-muted px-1 rounded">password</code>
                        </p>
                    </CardFooter>
                </Card>
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
