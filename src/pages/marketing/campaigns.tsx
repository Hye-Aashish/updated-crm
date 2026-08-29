import { useState, useEffect, useMemo, useRef } from 'react'
import api from '@/lib/api-client'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
    Mail, Send, Plus, CheckCircle2, RefreshCw, Sparkles, Loader2,
    Search, Copy, Trash2, Eye, Smartphone, Monitor, BarChart2,
    TrendingUp, MousePointer, Tag
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

// ── PRE-BUILT HTML EMAIL TEMPLATES ───────────────────────────────────────────
const EMAIL_TEMPLATES = [
    {
        id: 'promo',
        name: 'Special Promotion / Discount',
        category: 'promo',
        icon: '🎁',
        subject: '🔥 Limited Time Offer: Exclusive {{company}} Upgrade Discount inside!',
        content: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0;">
  <div style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); padding: 32px; text-align: center; color: white;">
    <span style="background: rgba(255,255,255,0.2); padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; text-transform: uppercase;">SPECIAL OFFER</span>
    <h1 style="font-size: 26px; margin: 16px 0 8px 0; font-weight: 800;">Exclusive 20% Discount for {{name}}</h1>
    <p style="font-size: 14px; opacity: 0.9; margin: 0;">Boost your business productivity with Nexprism Agency Solution.</p>
  </div>
  <div style="padding: 32px; color: #1e293b; line-height: 1.6;">
    <p style="font-size: 15px;">Hi <strong>{{name}}</strong>,</p>
    <p>We are excited to offer <strong>{{company}}</strong> an exclusive 20% discount on all premium digital agency services and automated workflows for this month!</p>
    <div style="background: #f8fafc; border-left: 4px solid #4f46e5; padding: 16px; border-radius: 8px; margin: 20px 0;">
      <h4 style="margin: 0 0 8px 0; color: #4f46e5;">What's Included:</h4>
      <ul style="margin: 0; padding-left: 20px; font-size: 14px; color: #475569;">
        <li>Dedicated Project Manager & Priority Support</li>
        <li>Custom Portal & Real-time Milestone Tracking</li>
        <li>Guaranteed 99.9% Uptime & Performance Optimization</li>
      </ul>
    </div>
    <div style="text-align: center; margin: 30px 0;">
      <a href="https://example.com" style="background: #4f46e5; color: white; padding: 14px 28px; border-radius: 12px; font-weight: bold; text-decoration: none; display: inline-block; box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3);">Claim Your 20% Discount Now →</a>
    </div>
    <p style="font-size: 12px; color: #94a3b8; text-align: center; margin-top: 24px;">Offer valid until {{date}}. Terms and conditions apply.</p>
  </div>
</div>`
    },
    {
        id: 'feature',
        name: 'Product / Feature Announcement',
        category: 'feature',
        icon: '🚀',
        subject: '🚀 Exciting New Features Released for {{company}}!',
        content: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; border-radius: 16px; overflow: hidden; color: #f8fafc;">
  <div style="padding: 32px; text-align: center; border-b: 1px solid #1e293b;">
    <span style="background: rgba(99, 102, 241, 0.2); color: #818cf8; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold;">PRODUCT UPDATE</span>
    <h1 style="font-size: 26px; margin: 16px 0 8px 0; font-weight: 800; color: #ffffff;">Next-Gen Workflows Are Here</h1>
    <p style="font-size: 14px; color: #94a3b8;">Designed specifically to elevate {{company}}'s operations.</p>
  </div>
  <div style="padding: 32px; line-height: 1.6;">
    <p style="font-size: 15px; color: #cbd5e1;">Hello <strong>{{name}}</strong>,</p>
    <p style="color: #94a3b8;">We just rolled out major performance upgrades to your workspace! Here is what's new:</p>
    <div style="margin: 24px 0;">
      <div style="background: #1e293b; padding: 16px; border-radius: 12px; margin-bottom: 12px;">
        <h4 style="margin: 0 0 4px 0; color: #818cf8;">⚡ 3x Faster Client Approvals & E-Signatures</h4>
        <p style="margin: 0; font-size: 13px; color: #94a3b8;">Sign and approve deliverables with multi-mode signatures & audit trail certificates.</p>
      </div>
      <div style="background: #1e293b; padding: 16px; border-radius: 12px;">
        <h4 style="margin: 0 0 4px 0; color: #34d399;">📊 Automated Financial Reporting</h4>
        <p style="margin: 0; font-size: 13px; color: #94a3b8;">Instant real-time analytics for invoices, team capacity, and project margins.</p>
      </div>
    </div>
    <div style="text-align: center; margin-top: 32px;">
      <a href="https://example.com" style="background: #6366f1; color: white; padding: 14px 28px; border-radius: 12px; font-weight: bold; text-decoration: none; display: inline-block;">Explore Your Upgraded Dashboard →</a>
    </div>
  </div>
</div>`
    },
    {
        id: 'newsletter',
        name: 'Company Newsletter & Updates',
        category: 'newsletter',
        icon: '📰',
        subject: '📰 Monthly Insights & Business Highlights - {{date}}',
        content: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden;">
  <div style="padding: 28px; background: #020617; color: white; text-align: center;">
    <h2 style="margin: 0; font-size: 22px; font-weight: 800;">AGENCY NEWSLETTER</h2>
    <p style="margin: 4px 0 0 0; font-size: 12px; color: #94a3b8;">Curated Insights & Monthly Updates for {{company}}</p>
  </div>
  <div style="padding: 32px; color: #334155; line-height: 1.6;">
    <p>Dear <strong>{{name}}</strong>,</p>
    <p>Welcome to this month's edition of our business digest. Here are the top highlights and industry trends you should know about:</p>
    <h3 style="color: #0f172a; margin-top: 24px;">1. Scaling Digital Agency Efficiency</h3>
    <p style="font-size: 14px; color: #64748b;">Discover how automated tracking and milestone approvals reduce turnaround times by over 40%.</p>
    <h3 style="color: #0f172a; margin-top: 24px;">2. Q3 Roadmap Preview</h3>
    <p style="font-size: 14px; color: #64748b;">We are adding brand new AI-assisted tools to streamline client communication and proposal creation.</p>
    <div style="border-top: 1px solid #e2e8f0; margin-top: 32px; padding-top: 20px; text-align: center; font-size: 12px; color: #94a3b8;">
      Sent to {{email}} | You are receiving this because you are a valued client of {{company}}.
    </div>
  </div>
</div>`
    },
    {
        id: 'onboarding',
        name: 'Client Welcome & Onboarding',
        category: 'onboarding',
        icon: '🤝',
        subject: '👋 Welcome to Nexprism, {{name}}! Let\'s get started.',
        content: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden;">
  <div style="background: #0f766e; padding: 32px; text-align: center; color: white;">
    <h1 style="margin: 0; font-size: 24px; font-weight: 800;">Welcome Aboard! 🎉</h1>
    <p style="margin: 8px 0 0 0; font-size: 14px; opacity: 0.9;">We are thrilled to partner with {{company}}.</p>
  </div>
  <div style="padding: 32px; color: #334155; line-height: 1.6;">
    <p>Hi <strong>{{name}}</strong>,</p>
    <p>Thank you for choosing us! Your dedicated client portal is officially ready. Here are the 3 quick steps to kick off your project:</p>
    <ol style="font-size: 14px; color: #475569; padding-left: 20px; line-height: 1.8;">
      <li>Log in to your client portal to review your project scope.</li>
      <li>Upload initial assets and requirements documents.</li>
      <li>Connect directly with your assigned Project Manager via Live Chat.</li>
    </ol>
    <div style="text-align: center; margin: 28px 0;">
      <a href="https://example.com" style="background: #0f766e; color: white; padding: 12px 24px; border-radius: 10px; font-weight: bold; text-decoration: none; display: inline-block;">Access Your Client Portal →</a>
    </div>
  </div>
</div>`
    }
]

export function CampaignsPage() {
    const { toast } = useToast()
    const [campaigns, setCampaigns] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [createModalOpen, setCreateModalOpen] = useState(false)
    const [previewModalOpen, setPreviewModalOpen] = useState(false)
    const [testModalOpen, setTestModalOpen] = useState(false)
    const [analyticsModalOpen, setAnalyticsModalOpen] = useState(false)
    const [selectedCampaign, setSelectedCampaign] = useState<any>(null)
    const [sendingId, setSendingId] = useState<string | null>(null)
    const [testing, setTesting] = useState(false)

    // Form state
    const [title, setTitle] = useState('')
    const [subject, setSubject] = useState('')
    const [templateCategory, setTemplateCategory] = useState('custom')
    const [targetAudience, setTargetAudience] = useState('leads')
    const [customEmailsInput, setCustomEmailsInput] = useState('')
    const [content, setContent] = useState('')
    const [testEmail, setTestEmail] = useState('')
    const [statusFilter, setStatusFilter] = useState('all')
    const [searchQuery, setSearchQuery] = useState('')
    const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop')

    const textareaRef = useRef<HTMLTextAreaElement>(null)

    const fetchCampaigns = async () => {
        setLoading(true)
        try {
            const res = await api.get('/campaigns')
            setCampaigns(res.data || [])
        } catch (err) {
            console.error('Failed to load campaigns', err)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchCampaigns()
    }, [])

    // Analytics Metrics
    const metrics = useMemo(() => {
        const total = campaigns.length
        let totalSent = 0
        let totalOpens = 0
        let totalClicks = 0

        campaigns.forEach(c => {
            if (c.stats) {
                totalSent += c.stats.sentCount || 0
                totalOpens += c.stats.opensCount || 0
                totalClicks += c.stats.clicksCount || 0
            }
        })

        const avgOpenRate = totalSent > 0 ? Math.round((totalOpens / totalSent) * 100) : 0
        const avgClickRate = totalSent > 0 ? Math.round((totalClicks / totalSent) * 100) : 0

        return { total, totalSent, avgOpenRate, avgClickRate }
    }, [campaigns])

    // Filtered campaigns
    const filteredCampaigns = useMemo(() => {
        return campaigns.filter(c => {
            const matchesSearch = c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                c.subject.toLowerCase().includes(searchQuery.toLowerCase())
            const matchesStatus = statusFilter === 'all' || c.status === statusFilter
            return matchesSearch && matchesStatus
        })
    }, [campaigns, searchQuery, statusFilter])

    const handleSelectTemplate = (tpl: typeof EMAIL_TEMPLATES[0]) => {
        setSubject(tpl.subject)
        setContent(tpl.content)
        setTemplateCategory(tpl.category)
        toast({ title: 'Template Loaded', description: `Loaded "${tpl.name}" HTML email layout.` })
    }

    const insertMergeTag = (tag: string) => {
        const textarea = textareaRef.current
        if (!textarea) {
            setContent(prev => prev + ` ${tag} `)
            return
        }

        const start = textarea.selectionStart
        const end = textarea.selectionEnd
        const text = textarea.value
        const newText = text.substring(0, start) + ` ${tag} ` + text.substring(end)
        setContent(newText)
        setTimeout(() => {
            textarea.focus()
            textarea.setSelectionRange(start + tag.length + 2, start + tag.length + 2)
        }, 50)
    }

    const handleCreateCampaign = async (e: React.FormEvent) => {
        e.preventDefault()
        try {
            const customEmails = targetAudience === 'custom'
                ? customEmailsInput.split(',').map(e => e.trim()).filter(Boolean)
                : []

            await api.post('/campaigns', {
                title,
                subject,
                templateCategory,
                targetAudience,
                customEmails,
                content
            })
            toast({ title: 'Campaign Draft Saved', description: 'Your email broadcast draft is ready for testing or dispatch.' })
            setCreateModalOpen(false)
            resetForm()
            fetchCampaigns()
        } catch (err: any) {
            toast({ title: 'Error', description: err.response?.data?.message || 'Failed to save campaign', variant: 'destructive' })
        }
    }

    const handleSendBroadcast = async (id: string) => {
        setSendingId(id)
        try {
            await api.post(`/campaigns/${id}/send`)
            toast({ title: 'Broadcast Complete! 🚀', description: 'Emails have been personalized and dispatched to recipient list.' })
            fetchCampaigns()
        } catch (err: any) {
            toast({ title: 'Broadcast Failed', description: err.response?.data?.message || 'Error sending campaign', variant: 'destructive' })
        } finally {
            setSendingId(null)
        }
    }

    const handleSendTestEmail = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!selectedCampaign || !testEmail.trim()) return
        setTesting(true)
        try {
            await api.post(`/campaigns/${selectedCampaign._id}/test-send`, { testEmail })
            toast({ title: 'Test Email Dispatched! ✉️', description: `Check inbox of ${testEmail} for preview.` })
            setTestModalOpen(false)
            setTestEmail('')
        } catch (err: any) {
            toast({ title: 'Test Failed', description: err.response?.data?.message || 'Failed to send test email', variant: 'destructive' })
        } finally {
            setTesting(false)
        }
    }

    const handleDuplicate = async (id: string) => {
        try {
            await api.post(`/campaigns/${id}/duplicate`)
            toast({ title: 'Campaign Cloned', description: 'New draft copy created.' })
            fetchCampaigns()
        } catch (err: any) {
            toast({ title: 'Cloning Failed', description: err.response?.data?.message || 'Could not duplicate', variant: 'destructive' })
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this campaign?')) return
        try {
            await api.delete(`/campaigns/${id}`)
            toast({ title: 'Campaign Deleted' })
            fetchCampaigns()
        } catch (err: any) {
            toast({ title: 'Error', description: err.response?.data?.message || 'Failed to delete' })
        }
    }

    const resetForm = () => {
        setTitle('')
        setSubject('')
        setTemplateCategory('custom')
        setTargetAudience('leads')
        setCustomEmailsInput('')
        setContent('')
    }

    return (
        <div className="space-y-6 pb-16">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground flex items-center gap-3">
                        <div className="p-2.5 bg-primary/10 rounded-2xl text-primary">
                            <Mail className="h-6 w-6" />
                        </div>
                        Email Marketing & Broadcast Campaigns
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Enterprise HTML templates, merge-tag personalization, live device previews, and broadcast analytics.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Button variant="outline" size="sm" onClick={fetchCampaigns} disabled={loading} className="rounded-xl">
                        <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> Refresh
                    </Button>
                    <Button onClick={() => setCreateModalOpen(true)} className="rounded-xl font-bold shadow-md hover:shadow-lg">
                        <Plus className="h-4 w-4 mr-2" /> Create Campaign
                    </Button>
                </div>
            </div>

            {/* Metrics Header */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="rounded-2xl border bg-card/60 p-4 space-y-1">
                    <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Total Campaigns</p>
                    <div className="text-2xl font-black text-foreground">{metrics.total}</div>
                </Card>
                <Card className="rounded-2xl border bg-blue-500/5 border-blue-500/20 p-4 space-y-1">
                    <p className="text-xs text-blue-600 font-bold uppercase tracking-wider flex items-center gap-1">
                        <Send className="w-3.5 h-3.5" /> Total Delivered
                    </p>
                    <div className="text-2xl font-black text-blue-600">{metrics.totalSent}</div>
                </Card>
                <Card className="rounded-2xl border bg-emerald-500/5 border-emerald-500/20 p-4 space-y-1">
                    <p className="text-xs text-emerald-600 font-bold uppercase tracking-wider flex items-center gap-1">
                        <TrendingUp className="w-3.5 h-3.5" /> Avg Open Rate
                    </p>
                    <div className="text-2xl font-black text-emerald-600">{metrics.avgOpenRate}%</div>
                </Card>
                <Card className="rounded-2xl border bg-purple-500/5 border-purple-500/20 p-4 space-y-1">
                    <p className="text-xs text-purple-600 font-bold uppercase tracking-wider flex items-center gap-1">
                        <MousePointer className="w-3.5 h-3.5" /> Avg Click Rate
                    </p>
                    <div className="text-2xl font-black text-purple-600">{metrics.avgClickRate}%</div>
                </Card>
            </div>

            {/* Search & Filter Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-card/80 p-3 rounded-2xl border">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder="Search campaigns by title or subject..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 rounded-xl text-xs bg-background"
                    />
                </div>

                <Tabs value={statusFilter} onValueChange={setStatusFilter} className="shrink-0">
                    <TabsList className="rounded-xl p-1 bg-muted/60 h-9">
                        <TabsTrigger value="all" className="rounded-lg text-xs font-bold px-3">All</TabsTrigger>
                        <TabsTrigger value="draft" className="rounded-lg text-xs font-bold px-3">Drafts</TabsTrigger>
                        <TabsTrigger value="sent" className="rounded-lg text-xs font-bold px-3">Sent</TabsTrigger>
                    </TabsList>
                </Tabs>
            </div>

            {/* Campaign Grid */}
            {loading ? (
                <div className="p-16 text-center text-muted-foreground animate-pulse font-medium">Loading email campaigns...</div>
            ) : filteredCampaigns.length === 0 ? (
                <Card className="p-16 text-center text-muted-foreground rounded-2xl border-dashed">
                    <Mail className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p className="font-bold text-base text-foreground">No email campaigns found</p>
                    <p className="text-xs text-muted-foreground mt-1">Click "Create Campaign" to compose an email broadcast.</p>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {filteredCampaigns.map(item => (
                        <Card key={item._id} className="rounded-2xl border bg-card hover:shadow-xl transition-all duration-300 flex flex-col justify-between overflow-hidden">
                            <CardHeader className="pb-3 space-y-2">
                                <div className="flex items-start justify-between gap-2">
                                    <Badge variant="outline" className="uppercase font-black text-[9px] tracking-wider">
                                        Audience: {item.targetAudience.replace('_', ' ')}
                                    </Badge>

                                    <div>
                                        {item.status === 'sent' && (
                                            <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-200 font-black text-[10px] uppercase">
                                                <CheckCircle2 className="w-3 h-3 mr-1" /> Sent
                                            </Badge>
                                        )}
                                        {item.status === 'draft' && (
                                            <Badge variant="secondary" className="font-black text-[10px] uppercase">
                                                Draft
                                            </Badge>
                                        )}
                                        {item.status === 'sending' && (
                                            <Badge className="bg-blue-500/10 text-blue-600 border-blue-200 font-black text-[10px] uppercase">
                                                <Loader2 className="w-3 h-3 mr-1 animate-spin" /> Broadcasting...
                                            </Badge>
                                        )}
                                    </div>
                                </div>

                                <h3 className="font-black text-lg text-foreground leading-snug">{item.title}</h3>
                                <p className="text-xs text-muted-foreground line-clamp-1">
                                    Subject: <strong className="text-foreground">{item.subject}</strong>
                                </p>
                            </CardHeader>

                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-3 gap-2 bg-muted/40 p-3 rounded-xl text-center text-xs">
                                    <div>
                                        <p className="text-[10px] text-muted-foreground uppercase font-bold">Recipients</p>
                                        <p className="font-black text-foreground">{item.stats?.totalRecipients || 0}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-muted-foreground uppercase font-bold">Delivered</p>
                                        <p className="font-black text-emerald-600">{item.stats?.sentCount || 0}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-muted-foreground uppercase font-bold">Opens (Est)</p>
                                        <p className="font-black text-blue-600">{item.stats?.opensCount || 0}</p>
                                    </div>
                                </div>

                                {/* Actions Bar */}
                                <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/50">
                                    <div className="flex items-center gap-1.5">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-8 text-xs rounded-lg gap-1"
                                            onClick={() => {
                                                setSelectedCampaign(item)
                                                setPreviewModalOpen(true)
                                            }}
                                        >
                                            <Eye className="w-3.5 h-3.5" /> Preview
                                        </Button>

                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-8 text-xs rounded-lg gap-1"
                                            onClick={() => {
                                                setSelectedCampaign(item)
                                                setTestModalOpen(true)
                                            }}
                                        >
                                            <Send className="w-3.5 h-3.5" /> Test Send
                                        </Button>

                                        {item.status === 'sent' && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-8 text-xs rounded-lg gap-1 text-purple-600"
                                                onClick={() => {
                                                    setSelectedCampaign(item)
                                                    setAnalyticsModalOpen(true)
                                                }}
                                            >
                                                <BarChart2 className="w-3.5 h-3.5" /> Stats
                                            </Button>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-1">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-8 w-8 p-0 rounded-lg text-muted-foreground hover:text-foreground"
                                            title="Duplicate Campaign"
                                            onClick={() => handleDuplicate(item._id)}
                                        >
                                            <Copy className="w-3.5 h-3.5" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-8 w-8 p-0 rounded-lg text-rose-500 hover:text-rose-600"
                                            title="Delete Campaign"
                                            onClick={() => handleDelete(item._id)}
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </Button>
                                    </div>
                                </div>

                                {item.status === 'draft' && (
                                    <div className="pt-2">
                                        <Button
                                            size="sm"
                                            onClick={() => handleSendBroadcast(item._id)}
                                            disabled={sendingId === item._id}
                                            className="w-full rounded-xl font-bold gap-1.5 shadow-md"
                                        >
                                            {sendingId === item._id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                            {sendingId === item._id ? 'Broadcasting Email...' : 'Broadcast Campaign Now'}
                                        </Button>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Create Campaign Modal */}
            <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
                <DialogContent className="sm:max-w-2xl rounded-3xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="font-black text-xl flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-primary" /> Create Email Campaign
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            Select a pre-designed HTML template or compose custom email broadcast with merge tags.
                        </DialogDescription>
                    </DialogHeader>

                    {/* Pre-built Templates Bar */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-1.5">
                            <Tag className="w-3.5 h-3.5 text-primary" /> Select Pre-built HTML Template:
                        </label>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {EMAIL_TEMPLATES.map(tpl => (
                                <button
                                    key={tpl.id}
                                    type="button"
                                    onClick={() => handleSelectTemplate(tpl)}
                                    className={`p-2.5 rounded-2xl border text-left transition-all ${templateCategory === tpl.category ? 'border-primary bg-primary/5 ring-2 ring-primary/20' : 'border-border bg-card hover:bg-muted/40'}`}
                                >
                                    <span className="text-lg block mb-1">{tpl.icon}</span>
                                    <span className="text-[11px] font-bold text-foreground block truncate">{tpl.name}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <form onSubmit={handleCreateCampaign} className="space-y-4 pt-2">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold uppercase text-muted-foreground">Internal Title *</label>
                                <Input
                                    value={title}
                                    onChange={e => setTitle(e.target.value)}
                                    required
                                    placeholder="e.g. Q3 Promotion Offer Broadcast"
                                    className="rounded-xl"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-bold uppercase text-muted-foreground">Target Audience</label>
                                <Select value={targetAudience} onValueChange={setTargetAudience}>
                                    <SelectTrigger className="rounded-xl">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="leads">All Leads & Prospects</SelectItem>
                                        <SelectItem value="clients">All Active Clients</SelectItem>
                                        <SelectItem value="all_staff">All Internal Agency Staff</SelectItem>
                                        <SelectItem value="custom">Custom Email List</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {targetAudience === 'custom' && (
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold uppercase text-muted-foreground">Custom Email List (Comma Separated)</label>
                                <Input
                                    value={customEmailsInput}
                                    onChange={e => setCustomEmailsInput(e.target.value)}
                                    placeholder="john@example.com, sara@client.com, sales@company.org"
                                    className="rounded-xl font-mono text-xs"
                                />
                            </div>
                        )}

                        <div className="space-y-1.5">
                            <label className="text-xs font-bold uppercase text-muted-foreground">Email Subject Line *</label>
                            <Input
                                value={subject}
                                onChange={e => setSubject(e.target.value)}
                                required
                                placeholder="e.g. Special Offer for {{name}} at {{company}}"
                                className="rounded-xl font-medium"
                            />
                        </div>

                        {/* Merge Tags Quick Chips */}
                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                                <label className="text-xs font-bold uppercase text-muted-foreground">Email Body (HTML / Rich Text) *</label>
                                <div className="flex items-center gap-1.5">
                                    <span className="text-[10px] text-muted-foreground font-bold">Merge Tags:</span>
                                    {['{{name}}', '{{company}}', '{{email}}', '{{date}}'].map(tag => (
                                        <button
                                            key={tag}
                                            type="button"
                                            onClick={() => insertMergeTag(tag)}
                                            className="px-2 py-0.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-[10px] font-mono font-bold transition-colors"
                                        >
                                            {tag}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <textarea
                                ref={textareaRef}
                                value={content}
                                onChange={e => setContent(e.target.value)}
                                required
                                rows={8}
                                placeholder="Enter HTML body content or load a template..."
                                className="w-full rounded-2xl border border-input bg-background p-3 text-xs font-mono ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            />
                        </div>

                        <div className="flex justify-end gap-3 pt-2">
                            <Button type="button" variant="outline" onClick={() => setCreateModalOpen(false)} className="rounded-xl">
                                Cancel
                            </Button>
                            <Button type="submit" className="rounded-xl font-bold">
                                Save Campaign Draft
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Live Desktop & Mobile Device Preview Modal */}
            <Dialog open={previewModalOpen} onOpenChange={setPreviewModalOpen}>
                <DialogContent className="sm:max-w-3xl rounded-3xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <div className="flex items-center justify-between pr-6">
                            <div>
                                <DialogTitle className="font-black text-xl flex items-center gap-2">
                                    <Eye className="w-5 h-5 text-primary" /> Live Email Preview
                                </DialogTitle>
                                <DialogDescription className="text-xs">
                                    Inspect how "{selectedCampaign?.title}" renders on desktop and mobile screens.
                                </DialogDescription>
                            </div>

                            <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl">
                                <Button
                                    variant={previewDevice === 'desktop' ? 'secondary' : 'ghost'}
                                    size="sm"
                                    className="h-7 text-xs rounded-lg gap-1"
                                    onClick={() => setPreviewDevice('desktop')}
                                >
                                    <Monitor className="w-3.5 h-3.5" /> Desktop
                                </Button>
                                <Button
                                    variant={previewDevice === 'mobile' ? 'secondary' : 'ghost'}
                                    size="sm"
                                    className="h-7 text-xs rounded-lg gap-1"
                                    onClick={() => setPreviewDevice('mobile')}
                                >
                                    <Smartphone className="w-3.5 h-3.5" /> Mobile
                                </Button>
                            </div>
                        </div>
                    </DialogHeader>

                    {selectedCampaign && (
                        <div className="space-y-4 pt-2">
                            <div className="p-3 bg-muted/40 rounded-2xl text-xs space-y-1">
                                <p><span className="text-muted-foreground font-bold">Subject:</span> <strong>{selectedCampaign.subject}</strong></p>
                                <p><span className="text-muted-foreground font-bold">Target:</span> <span className="capitalize">{selectedCampaign.targetAudience}</span></p>
                            </div>

                            <div className="flex justify-center bg-slate-950 p-6 rounded-3xl overflow-hidden border border-slate-800 shadow-inner">
                                <div className={`bg-white text-slate-900 rounded-2xl overflow-hidden shadow-2xl transition-all duration-300 ${previewDevice === 'mobile' ? 'w-[360px]' : 'w-full max-w-[660px]'}`}>
                                    <div className="p-4 border-b bg-slate-100 text-[11px] text-slate-500 font-mono flex items-center justify-between">
                                        <span>From: agency@nexprism.com</span>
                                        <span>To: john@client.com</span>
                                    </div>
                                    <div
                                        className="p-4 sm:p-6 overflow-y-auto max-h-[500px]"
                                        dangerouslySetInnerHTML={{
                                            __html: selectedCampaign.content
                                                .replace(/\{\{\s*name\s*\}\}/gi, 'John Doe')
                                                .replace(/\{\{\s*company\s*\}\}/gi, 'Acme Corp')
                                                .replace(/\{\{\s*date\s*\}\}/gi, new Date().toLocaleDateString())
                                        }}
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Test Send Modal */}
            <Dialog open={testModalOpen} onOpenChange={setTestModalOpen}>
                <DialogContent className="sm:max-w-md rounded-3xl">
                    <DialogHeader>
                        <DialogTitle className="font-black text-xl flex items-center gap-2">
                            <Send className="w-5 h-5 text-primary" /> Dispatch Test Email
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            Send a single preview copy of "{selectedCampaign?.title}" to test subject rendering and links.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSendTestEmail} className="space-y-4 pt-2">
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold uppercase text-muted-foreground">Test Email Recipient Address *</label>
                            <Input
                                type="email"
                                value={testEmail}
                                onChange={e => setTestEmail(e.target.value)}
                                required
                                placeholder="yourname@gmail.com"
                                className="rounded-xl font-medium"
                            />
                        </div>

                        <div className="flex justify-end gap-3 pt-2">
                            <Button type="button" variant="outline" onClick={() => setTestModalOpen(false)} className="rounded-xl">
                                Cancel
                            </Button>
                            <Button type="submit" disabled={testing} className="rounded-xl font-bold">
                                {testing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                                {testing ? 'Sending...' : 'Send Test Copy'}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Analytics Modal */}
            <Dialog open={analyticsModalOpen} onOpenChange={setAnalyticsModalOpen}>
                <DialogContent className="sm:max-w-lg rounded-3xl">
                    <DialogHeader>
                        <DialogTitle className="font-black text-xl flex items-center gap-2 text-purple-600">
                            <BarChart2 className="w-5 h-5" /> Campaign Performance Stats
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            Delivery and engagement metrics for "{selectedCampaign?.title}".
                        </DialogDescription>
                    </DialogHeader>

                    {selectedCampaign && (
                        <div className="space-y-4 pt-2">
                            <div className="grid grid-cols-3 gap-3 text-center">
                                <div className="p-3 rounded-2xl bg-muted/40">
                                    <p className="text-[10px] text-muted-foreground font-bold uppercase">Total Sent</p>
                                    <p className="text-xl font-black text-foreground">{selectedCampaign.stats?.sentCount || 0}</p>
                                </div>
                                <div className="p-3 rounded-2xl bg-blue-500/10 text-blue-600">
                                    <p className="text-[10px] font-bold uppercase">Est Opens</p>
                                    <p className="text-xl font-black">{selectedCampaign.stats?.opensCount || 0}</p>
                                </div>
                                <div className="p-3 rounded-2xl bg-purple-500/10 text-purple-600">
                                    <p className="text-[10px] font-bold uppercase">Est Clicks</p>
                                    <p className="text-xl font-black">{selectedCampaign.stats?.clicksCount || 0}</p>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <p className="text-xs font-bold uppercase text-muted-foreground">Recipient Dispatch Log</p>
                                <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                                    {selectedCampaign.recipientLogs?.length > 0 ? (
                                        selectedCampaign.recipientLogs.map((log: any, idx: number) => (
                                            <div key={idx} className="p-2.5 rounded-xl bg-muted/30 flex items-center justify-between text-xs">
                                                <div className="truncate">
                                                    <span className="font-bold text-foreground block truncate">{log.name || 'Recipient'}</span>
                                                    <span className="text-[11px] text-muted-foreground truncate">{log.email}</span>
                                                </div>
                                                <Badge className="bg-emerald-500/10 text-emerald-600 text-[10px] uppercase font-bold shrink-0">
                                                    {log.status}
                                                </Badge>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-xs text-muted-foreground italic">No detailed logs recorded for this broadcast.</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    )
}
