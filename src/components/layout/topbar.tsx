import { useState, useEffect, useRef } from 'react'
import {
    Bell, Menu, Moon, Search, Sun, User, Settings, Plus,
    DollarSign, Zap, Code, Megaphone, Wifi, Car, LogOut
} from 'lucide-react'
import { Input } from '../ui/input'
import { Button } from '../ui/button'
import { Label } from '../ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '../ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar'

import { useTheme } from '../theme-provider'
import { useAppStore } from '@/store'
import { useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'

interface TopbarProps {
    onMenuClick: () => void
}

// Quick Category Chips
const QUICK_CATEGORIES = [
    { value: 'salary', label: 'Salary', icon: DollarSign },
    { value: 'electricity', label: 'Electricity', icon: Zap },
    { value: 'tools-software', label: 'Tools', icon: Code },
    { value: 'ads-marketing', label: 'Ads', icon: Megaphone },
    { value: 'internet', label: 'Internet', icon: Wifi },
    { value: 'travel', label: 'Travel', icon: Car },
]

const PAYMENT_MODES = ['UPI', 'Cash', 'Bank Transfer', 'Card']

export function Topbar({ onMenuClick }: TopbarProps) {
    const { theme, setTheme } = useTheme()
    const navigate = useNavigate()
    const { currentUser, notifications, markNotificationRead, markAllNotificationsRead } = useAppStore()

    const unreadCount = notifications.filter((n) => !n.read).length
    const initials = currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : 'U'

    // Quick Add Expense State
    const [isExpenseDialogOpen, setIsExpenseDialogOpen] = useState(false)
    const [lastCategory, setLastCategory] = useState('salary')
    const [expense, setExpense] = useState({
        amount: '',
        category: '',
        paymentMode: 'UPI',
        note: ''
    })
    const amountInputRef = useRef<HTMLInputElement>(null)

    // Auto-focus amount field when dialog opens
    useEffect(() => {
        if (isExpenseDialogOpen && amountInputRef.current) {
            setTimeout(() => amountInputRef.current?.focus(), 100)
        }
    }, [isExpenseDialogOpen])

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault()
                // Focus search logic here if implemented
                document.getElementById('global-search')?.focus()
            }

            if (!isExpenseDialogOpen) return

            if (e.key === 'Escape') {
                setIsExpenseDialogOpen(false)
            } else if (e.key === 'Enter' && !e.ctrlKey) {
                e.preventDefault()
                handleSave()
            } else if (e.key === 'Enter' && e.ctrlKey) {
                e.preventDefault()
                handleSaveAndAddAnother()
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [isExpenseDialogOpen, expense])

    const handleSave = () => {
        if (!expense.amount || !expense.category) {
            alert('Amount and Category are required!')
            return
        }
        // Save expense (mock)
        console.log('Expense saved:', { ...expense, createdBy: currentUser?.id })
        // eslint-disable-next-line no-alert
        alert('✅ Expense Added!')
        setLastCategory(expense.category)
        setIsExpenseDialogOpen(false)
        resetForm(expense.category)
    }

    const handleSaveAndAddAnother = () => {
        if (!expense.amount || !expense.category) {
            alert('Amount and Category are required!')
            return
        }
        console.log('Expense saved:', { ...expense, createdBy: currentUser?.id })
        // eslint-disable-next-line no-alert
        alert('✅ Expense Added!')
        setLastCategory(expense.category)
        resetForm(expense.category)
        setTimeout(() => amountInputRef.current?.focus(), 100)
    }

    const resetForm = (category = lastCategory) => {
        setExpense({
            amount: '',
            category,
            paymentMode: 'UPI',
            note: ''
        })
    }

    const handleCategoryChipClick = (category: string) => {
        setExpense({ ...expense, category })
    }

    return (
        <div className="flex w-full items-center justify-between gap-4">
            {/* Mobile Menu Button */}
            <Button variant="ghost" size="icon" className="lg:hidden shrink-0 text-muted-foreground hover:text-foreground" onClick={onMenuClick}>
                <Menu className="h-5 w-5" />
            </Button>

            {/* Premium Search Bar */}
            <div className="hidden md:flex flex-1 max-w-xl">
                <div className="relative w-full group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    </div>
                    <Input
                        id="global-search"
                        placeholder="Search for leads, projects, or tasks..."
                        className="pl-10 h-10 w-full bg-secondary/30 border-secondary-foreground/10 focus-visible:ring-1 focus-visible:ring-primary/30 focus-visible:bg-background transition-all rounded-xl"
                    />
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        <kbd className="hidden lg:inline-flex h-5 items-center gap-1 rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                            <span className="text-xs">⌘</span>K
                        </kbd>
                    </div>
                </div>
            </div>

            {/* Mobile Search Icon Only */}
            <Button variant="ghost" size="icon" className="md:hidden shrink-0 text-muted-foreground">
                <Search className="h-5 w-5" />
            </Button>

            {/* Right Side Actions */}
            <div className="flex items-center gap-2 md:gap-3">
                {/* Add Expense - Primary Action */}
                <Button
                    onClick={() => setIsExpenseDialogOpen(true)}
                    className="hidden sm:flex bg-gradient-to-r from-primary to-primary/90 hover:to-primary shadow-lg shadow-primary/20 hover:shadow-primary/30 text-primary-foreground border-0 rounded-xl h-9 px-4 font-semibold transition-all duration-300 hover:scale-[1.02]"
                >
                    <Plus className="h-4 w-4 mr-1.5" />
                    <span>New Expense</span>
                </Button>

                {/* Icons Container */}
                <div className="flex items-center gap-1">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-all"
                        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                    >
                        {theme === 'dark' ? <Sun className="h-4.5 w-4.5" /> : <Moon className="h-4.5 w-4.5" />}
                    </Button>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full relative text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-all">
                                <Bell className="h-4.5 w-4.5" />
                                {unreadCount > 0 && (
                                    <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-red-500 ring-2 ring-background animate-pulse" />
                                )}
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-80 p-0 rounded-xl border border-border/50 shadow-xl bg-popover/95 backdrop-blur-sm">
                            <div className="p-4 border-b border-border/40 flex justify-between items-center bg-muted/20">
                                <span className="font-semibold text-sm">Notifications</span>
                                {unreadCount > 0 && (
                                    <span className="text-xs text-primary font-medium cursor-pointer hover:underline" onClick={() => markAllNotificationsRead()}>Mark all read</span>
                                )}
                            </div>
                            <div className="max-h-[300px] overflow-y-auto p-1">
                                {notifications.length === 0 && <div className="p-8 text-center text-sm text-muted-foreground">No new notifications</div>}
                                {notifications.map(n => (
                                    <DropdownMenuItem key={n.id} className="cursor-pointer rounded-lg p-3 m-1 focus:bg-muted/50" onClick={() => markNotificationRead(n.id)}>
                                        <div className="flex gap-3 items-start">
                                            <div className="h-2 w-2 mt-1.5 rounded-full bg-primary shrink-0 opacity-100" />
                                            <div className="flex flex-col gap-1">
                                                <span className="font-semibold text-sm leading-none">{n.title}</span>
                                                <span className="text-xs text-muted-foreground line-clamp-2">{n.message}</span>
                                            </div>
                                        </div>
                                    </DropdownMenuItem>
                                ))}
                            </div>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>

                {/* User Profile */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-10 rounded-full pl-1.5 pr-3 gap-2 hover:bg-secondary/40 border border-transparent hover:border-border/40 transition-all ml-1">
                            <Avatar className="h-7 w-7 border border-border/50">
                                <AvatarImage src={currentUser?.avatar} />
                                <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">{initials}</AvatarFallback>
                            </Avatar>
                            <div className="hidden md:flex flex-col items-start text-xs">
                                <span className="font-bold text-foreground leading-none mb-0.5">{currentUser?.name?.split(' ')[0]}</span>
                                <span className="text-muted-foreground font-medium text-[10px]">Admin</span>
                            </div>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56 rounded-xl border border-border/50 shadow-xl">
                        <div className="flex flex-col space-y-1 p-2.5 bg-muted/30">
                            <p className="text-sm font-medium leading-none">{currentUser?.name}</p>
                            <p className="text-xs leading-none text-muted-foreground">{currentUser?.email}</p>
                        </div>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="cursor-pointer rounded-lg" onClick={() => navigate('/settings')}>
                            <User className="mr-2 h-4 w-4 text-muted-foreground" /> Profile
                        </DropdownMenuItem>
                        <DropdownMenuItem className="cursor-pointer rounded-lg" onClick={() => navigate('/settings')}>
                            <Settings className="mr-2 h-4 w-4 text-muted-foreground" /> Settings
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50 rounded-lg" onClick={() => navigate('/login')}>
                            <LogOut className="mr-2 h-4 w-4" /> Log out
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            {/* Quick Add Expense Modal */}
            <Dialog open={isExpenseDialogOpen} onOpenChange={setIsExpenseDialogOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Quick Add Expense</DialogTitle>
                    </DialogHeader>
                    {/* Quick Category Chips */}
                    <div className="flex flex-wrap gap-2 mb-2">
                        {QUICK_CATEGORIES.map((cat) => {
                            const Icon = cat.icon
                            return (
                                <button
                                    key={cat.value}
                                    onClick={() => handleCategoryChipClick(cat.value)}
                                    className={cn(
                                        "flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-colors border",
                                        expense.category === cat.value
                                            ? "bg-primary text-primary-foreground border-primary"
                                            : "bg-muted hover:bg-muted/80 text-muted-foreground border-transparent"
                                    )}
                                >
                                    <Icon className="h-3 w-3" />
                                    {cat.label}
                                </button>
                            )
                        })}
                    </div>

                    <div className="grid gap-4 py-2">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="quick-amount" className="text-right">
                                Amount
                            </Label>
                            <Input
                                id="quick-amount"
                                ref={amountInputRef}
                                type="number"
                                value={expense.amount}
                                onChange={(e) => setExpense({ ...expense, amount: e.target.value })}
                                className="col-span-3 text-lg font-bold"
                                placeholder="0.00"
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="quick-category" className="text-right">
                                Category
                            </Label>
                            <select
                                id="quick-category"
                                value={expense.category}
                                onChange={(e) => setExpense({ ...expense, category: e.target.value })}
                                className="col-span-3 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <option value="">Select Category</option>
                                {QUICK_CATEGORIES.map((cat) => (
                                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                                ))}
                                <option value="office-rent">Office Rent</option>
                                <option value="food-team">Food/Team</option>
                                <option value="hosting">Hosting</option>
                                <option value="misc">Misc</option>
                            </select>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="quick-payment" className="text-right">
                                Mode
                            </Label>
                            <select
                                id="quick-payment"
                                value={expense.paymentMode}
                                onChange={(e) => setExpense({ ...expense, paymentMode: e.target.value })}
                                className="col-span-3 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {PAYMENT_MODES.map((mode) => (
                                    <option key={mode} value={mode}>{mode}</option>
                                ))}
                            </select>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="quick-note" className="text-right">
                                Note
                            </Label>
                            <Input
                                id="quick-note"
                                value={expense.note}
                                onChange={(e) => setExpense({ ...expense, note: e.target.value })}
                                className="col-span-3"
                                placeholder="Optional description..."
                            />
                        </div>
                    </div>

                    <div className="flex justify-between items-center mt-2">
                        <span className="text-xs text-muted-foreground hidden sm:inline-block">
                            Enter = Save, Ctrl+Enter = Save & Add Next
                        </span>
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={handleSaveAndAddAnother}>
                                + Add Another
                            </Button>
                            <Button size="sm" onClick={handleSave}>
                                Save Expense
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}
