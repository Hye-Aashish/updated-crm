import { useState, useEffect } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { Loader2, X, Upload, FileIcon } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import api from '@/lib/api-client'
import { useAppStore } from '@/store'

// --- Data Lists (Static for now, can be moved to DB later) ---
const industries = [
    "Real Estate", "Coaching / Education", "Ecommerce", "Clinic / Healthcare",
    "Restaurant / Food", "Gym / Fitness", "Salon / Beauty", "IT / SaaS", "Other"
]

const servicesList = [
    "Website Development", "Web App (SaaS)", "Ecommerce Store", "SEO",
    "Google Ads", "Social Media Marketing", "Maintenance", "Graphic Design"
]

const budgetRanges = [
    "Under 10k", "10k – 25k", "25k – 50k", "50k – 1L", "1L+"
]

const leadSources = [
    "Instagram", "Facebook", "Google Search", "Referral", "WhatsApp",
    "LinkedIn", "Ads", "Other"
]

// --- Zod Schema ---
const clientFormSchema = z.object({
    // Basic Info
    name: z.string().min(2, { message: "Name must be at least 2 characters." }),
    company: z.string().optional(),
    phone: z.string().regex(/^\d{10}$/, { message: "Phone must be exactly 10 digits." }),
    email: z.string().email({ message: "Invalid email address." }).optional().or(z.literal("")),
    clientType: z.enum(["one-time", "retainer"], { required_error: "Client type is required." }),

    // Business Details
    industry: z.string().optional(),
    city: z.string().optional(),
    website: z.string().url({ message: "Invalid URL" }).optional().or(z.literal("")),
    gstNumber: z.string().optional(),
    address: z.string().optional(),

    // Project Checkboxes
    services: z.array(z.string()).optional(),
    budget: z.string().optional(),
    paymentModel: z.string().optional(),
    deadline: z.string().optional(),

    // Communication
    leadSource: z.string().optional(),
    status: z.string({ required_error: "Status is required." }),
    followUpDate: z.string().optional(),
    assignedTo: z.string().optional(),

    // Notes
    notes: z.string().optional(),
})

type ClientFormValues = z.infer<typeof clientFormSchema>

interface ClientFormProps {
    mode: 'create' | 'edit'
    initialData?: any
    clientId?: string
}

export function ClientForm({ mode, initialData, clientId }: ClientFormProps) {
    const { toast } = useToast()
    const navigate = useNavigate()
    const { addClient, updateClient, users, setUsers } = useAppStore()
    const [loading, setLoading] = useState(false)
    const [files, setFiles] = useState<File[]>([])

    // Fetch Users for "Assigned To"
    useEffect(() => {
        const fetchUsers = async () => {
            if (users.length > 0) return // Already loaded
            try {
                const response = await api.get('/users')
                const backendUsers = response.data.map((u: any) => ({
                    id: u._id,
                    name: u.name,
                    email: u.email,
                    role: u.role,
                    phone: u.phone, // Optional
                }))
                setUsers(backendUsers)
            } catch (error) {
                console.error("Failed to fetch users:", error)
            }
        }
        fetchUsers()
    }, [users.length, setUsers])

    // Form definition
    const form = useForm<ClientFormValues>({
        resolver: zodResolver(clientFormSchema),
        defaultValues: initialData || {
            name: "",
            company: "",
            phone: "",
            email: "",
            clientType: "one-time",
            industry: "",
            city: "",
            website: "",
            gstNumber: "",
            address: "",
            services: [],
            budget: "",
            paymentModel: "full-advance",
            deadline: "",
            leadSource: "",
            status: "new",
            followUpDate: "",
            assignedTo: "",
            notes: "",
        },
    })

    const onSubmit = async (data: ClientFormValues) => {
        setLoading(true)

        try {
            if (mode === 'create') {
                // Send to Backend
                const response = await api.post('/clients', {
                    ...data,
                    expectedDeadline: data.deadline // Map field
                })

                const savedClient = response.data

                // Update Store
                addClient({
                    id: savedClient._id,
                    name: savedClient.name,
                    company: savedClient.company,
                    email: savedClient.email,
                    phone: savedClient.phone,
                    address: savedClient.address,
                    type: savedClient.type as any,
                    status: savedClient.status as any,
                    industry: savedClient.industry,
                    city: savedClient.city,
                    website: savedClient.website,
                    gstNumber: savedClient.gstNumber,
                    leadSource: savedClient.leadSource,
                    budget: savedClient.budget,
                    paymentModel: savedClient.paymentModel,
                    deadline: savedClient.expectedDeadline,
                    assignedTo: savedClient.assignedTo,
                    followUpDate: savedClient.followUpDate,
                    notes: savedClient.notes,
                    createdAt: new Date(savedClient.createdAt),
                    updatedAt: new Date(savedClient.updatedAt)
                })

                toast({
                    title: "Client Created Successfully",
                    description: `${data.name} has been added to the system.`,
                })
            } else {
                // UPDATE / Edit Mode
                if (!clientId) throw new Error("Client ID missing for update")

                const response = await api.put(`/clients/${clientId}`, {
                    ...data,
                    expectedDeadline: data.deadline
                })

                const updated = response.data

                // Update Store
                updateClient(clientId, {
                    ...updated,
                    id: updated._id, // Ensure ID mapping
                    // Map other fields if necessary, though partial update might serve
                    name: updated.name,
                    company: updated.company,
                    email: updated.email,
                    phone: updated.phone,
                    type: updated.type,
                    status: updated.status,
                    industry: updated.industry,
                    city: updated.city,
                    website: updated.website,
                    gstNumber: updated.gstNumber,
                    leadSource: updated.leadSource,
                    budget: updated.budget,
                    paymentModel: updated.paymentModel,
                    deadline: updated.expectedDeadline,
                    assignedTo: updated.assignedTo,
                    followUpDate: updated.followUpDate,
                    notes: updated.notes
                })

                toast({
                    title: "Client Updated Successfully",
                    description: "Changes have been saved.",
                })
            }

            navigate('/clients')
        } catch (error) {
            console.error(error)
            toast({
                title: "Error",
                description: "Failed to save client. Please try again.",
                variant: "destructive"
            })
        } finally {
            setLoading(false)
        }
    }

    // Handle Mock File Upload
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setFiles((prev) => [...prev, ...Array.from(e.target.files!)])
        }
    }

    const removeFile = (index: number) => {
        setFiles((prev) => prev.filter((_, i) => i !== index))
    }

    // Handle Services Checkbox Logic


    const handleCancel = () => {
        if (window.confirm("Are you sure you want to discard changes?")) {
            navigate('/clients')
        }
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">

                {/* Top Header with Actions */}
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight">{mode === 'create' ? 'Add Client' : 'Edit Client'}</h2>
                        <p className="text-muted-foreground">{mode === 'create' ? 'Onboard a new client to Nexprism.' : 'Update client details.'}</p>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" type="button" onClick={handleCancel}>Cancel</Button>

                        <Button type="submit" disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {mode === 'create' ? 'Save Client' : 'Update Client'}
                        </Button>
                    </div>
                </div>

                <div className="grid gap-6 md:grid-cols-2">

                    {/* 1. Basic Information */}
                    <Card className="md:col-span-1">
                        <CardHeader>
                            <CardTitle>Basic Information</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Client Name <span className="text-destructive">*</span></FormLabel>
                                        <FormControl>
                                            <Input placeholder="e.g. Rahul Sharma" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="company"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Company Name</FormLabel>
                                        <FormControl>
                                            <Input placeholder="e.g. Tech Solutions" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="phone"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Phone <span className="text-destructive">*</span></FormLabel>
                                            <FormControl>
                                                <Input placeholder="9876543210" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="clientType"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Type <span className="text-destructive">*</span></FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select type" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="one-time">One-time Project</SelectItem>
                                                    <SelectItem value="retainer">Retainer / AMC</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <FormField
                                control={form.control}
                                name="email"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Email</FormLabel>
                                        <FormControl>
                                            <Input placeholder="rahul@example.com" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </CardContent>
                    </Card>

                    {/* 2. Business Details */}
                    <Card className="md:col-span-1">
                        <CardHeader>
                            <CardTitle>Business Details</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="industry"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Industry</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select Industry" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {industries.map(ind => (
                                                        <SelectItem key={ind} value={ind}>{ind}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="city"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>City / Location</FormLabel>
                                            <FormControl>
                                                <Input placeholder="e.g. Mumbai" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <FormField
                                control={form.control}
                                name="website"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Website URL</FormLabel>
                                        <FormControl>
                                            <Input placeholder="https://example.com" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="gstNumber"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>GST Number</FormLabel>
                                        <FormControl>
                                            <Input placeholder="22AAAAA0000A1Z5" className="uppercase" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="address"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Billing Address</FormLabel>
                                        <FormControl>
                                            <Textarea placeholder="Full address..." className="min-h-[80px]" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </CardContent>
                    </Card>

                    {/* 3. Project & Payment Setup */}
                    <Card className="md:col-span-2">
                        <CardHeader>
                            <CardTitle>Project & Payment Setup</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <FormItem>
                                <div className="mb-4">
                                    <FormLabel>Interested Services</FormLabel>
                                    <FormDescription>Select all services the client is interested in.</FormDescription>
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    {servicesList.map((service) => (
                                        <div
                                            key={service}
                                            className={`flex flex-row items-center space-x-3 space-y-0 rounded-md border p-3 cursor-pointer transition-colors ${(form.watch('services') || []).includes(service)
                                                ? 'bg-primary/10 border-primary'
                                                : 'bg-muted/20 hover:bg-muted/50 border-transparent'
                                                }`}
                                            onClick={() => {
                                                const current = form.getValues("services") || []
                                                const updated = current.includes(service)
                                                    ? current.filter((s) => s !== service)
                                                    : [...current, service]
                                                form.setValue("services", updated, { shouldValidate: true, shouldDirty: true, shouldTouch: true })
                                            }}
                                        >
                                            <input
                                                type="checkbox"
                                                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary pointer-events-none"
                                                checked={(form.watch('services') || []).includes(service)}
                                                readOnly
                                            />
                                            <span className={`font-normal text-sm ${(form.watch('services') || []).includes(service) ? 'font-medium text-primary' : ''
                                                }`}>{service}</span>
                                        </div>
                                    ))}
                                </div>
                            </FormItem>

                            <div className="grid md:grid-cols-3 gap-6">
                                <FormField
                                    control={form.control}
                                    name="budget"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Budget Range</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select Range" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {budgetRanges.map(range => (
                                                        <SelectItem key={range} value={range}>{range}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="paymentModel"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Payment Model</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select Model" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="full-advance">Full Advance</SelectItem>
                                                    <SelectItem value="milestone">Milestone Billing</SelectItem>
                                                    <SelectItem value="monthly">Monthly Retainer</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="deadline"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Expected Deadline</FormLabel>
                                            <FormControl>
                                                <Input type="date" {...field} />
                                            </FormControl>
                                        </FormItem>
                                    )}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* 4. Communication & Follow-up */}
                    <Card className="md:col-span-1">
                        <CardHeader>
                            <CardTitle>Communication</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <FormField
                                control={form.control}
                                name="leadSource"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Lead Source</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Where did they come from?" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {leadSources.map(source => (
                                                    <SelectItem key={source} value={source}>{source}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="status"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Client Status <span className="text-destructive">*</span></FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Current Status" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="new">New Lead</SelectItem>
                                                <SelectItem value="in-discussion">In Discussion</SelectItem>
                                                <SelectItem value="confirmed">Confirmed / Signed</SelectItem>
                                                <SelectItem value="on-hold">On Hold</SelectItem>
                                                <SelectItem value="closed">Closed / Lost</SelectItem>
                                                <SelectItem value="active">Active</SelectItem>
                                                <SelectItem value="inactive">Inactive</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </CardContent>
                    </Card>

                    {/* 5. Assigned & Notes */}
                    <Card className="md:col-span-1">
                        <CardHeader>
                            <CardTitle>Assignment & Notes</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="assignedTo"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Assigned Person</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select Team Member" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {users.length > 0 ? (
                                                        users.map(u => (
                                                            <SelectItem key={u.id} value={u.id}>{u.name} ({u.role})</SelectItem>
                                                        ))
                                                    ) : (
                                                        <SelectItem value="no-users" disabled>No users found</SelectItem>
                                                    )}
                                                </SelectContent>
                                            </Select>
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="followUpDate"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Next Follow-up</FormLabel>
                                            <FormControl>
                                                <Input type="date" {...field} />
                                            </FormControl>
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <FormField
                                control={form.control}
                                name="notes"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Notes / Requirements</FormLabel>
                                        <FormControl>
                                            <Textarea placeholder="Any specific requirements or meeting notes..." className="min-h-[80px]" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* Attachment Mock */}
                            <div className="space-y-2">
                                <FormLabel>Attachments (Mock)</FormLabel>
                                <div className="flex items-center gap-2">
                                    <Input
                                        type="file"
                                        id="file-upload"
                                        multiple
                                        className="hidden"
                                        onChange={handleFileChange}
                                    />
                                    <Label
                                        htmlFor="file-upload"
                                        className="flex items-center gap-2 px-4 py-2 border rounded-md cursor-pointer hover:bg-accent text-sm"
                                    >
                                        <Upload className="h-4 w-4" /> Upload Files
                                    </Label>
                                    <span className="text-xs text-muted-foreground">{files.length} files selected</span>
                                </div>

                                {files.length > 0 && (
                                    <div className="space-y-2 mt-2">
                                        {files.map((file, index) => (
                                            <div key={index} className="flex items-center justify-between p-2 bg-muted/40 rounded text-sm group">
                                                <div className="flex items-center gap-2 overflow-hidden">
                                                    <FileIcon className="h-4 w-4 flex-shrink-0" />
                                                    <span className="truncate max-w-[200px]">{file.name}</span>
                                                    <span className="text-xs text-muted-foreground">({(file.size / 1024).toFixed(0)} KB)</span>
                                                </div>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-6 w-6 text-muted-foreground hover:text-destructive"
                                                    onClick={() => removeFile(index)}
                                                >
                                                    <X className="h-3 w-3" />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                </div>
            </form>
        </Form>
    )
}
