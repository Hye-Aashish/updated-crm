import { useState } from 'react';
import { motion } from 'framer-motion';
import { Building2, User, Phone, Mail, MapPin, Globe, CreditCard, Briefcase, Calendar } from 'lucide-react';
import { useToast } from '../../hooks/use-toast';
import axios from 'axios';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { Label } from '../../components/ui/label';

export function PublicClientOnboarding() {
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        company: '',
        phone: '',
        email: '',
        industry: '',
        city: '',
        website: '',
        gstNumber: '',
        address: '',
        services: '',
        budget: '',
        expectedDeadline: ''
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            // Convert services to array
            const payload = {
                ...formData,
                services: formData.services ? formData.services.split(',').map(s => s.trim()) : []
            };

            await axios.post(`${import.meta.env.VITE_API_URL || '/api'}/clients/public/onboarding`, payload);
            setSubmitted(true);
            toast({
                title: "Success",
                description: "Your details have been submitted successfully. We will get back to you soon!",
            });
        } catch (error: any) {
            console.error("Submission error:", error);
            toast({
                variant: "destructive",
                title: "Submission Failed",
                description: error.response?.data?.message || "There was an error submitting the form. Please try again later.",
            });
        } finally {
            setLoading(false);
        }
    };

    if (submitted) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="max-w-md w-full bg-white p-8 rounded-2xl shadow-xl text-center"
                >
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <h2 className="text-3xl font-bold text-slate-800 mb-4">Thank You!</h2>
                    <p className="text-slate-600 mb-6">
                        We have successfully received your information. Our team will review your details and get back to you shortly.
                    </p>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-2xl shadow-xl overflow-hidden"
                >
                    <div className="bg-primary/10 py-8 px-6 text-center border-b border-primary/20">
                        <h1 className="text-3xl font-bold text-primary">Client Onboarding</h1>
                        <p className="mt-2 text-slate-600">Please provide your details so we can set up your account and get started.</p>
                    </div>

                    <form onSubmit={handleSubmit} className="p-8 space-y-6">
                        {/* Personal & Company Info */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label htmlFor="name" className="flex items-center gap-2">
                                    <User className="w-4 h-4 text-slate-500" /> Full Name *
                                </Label>
                                <Input id="name" name="name" required value={formData.name} onChange={handleChange} placeholder="John Doe" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="company" className="flex items-center gap-2">
                                    <Building2 className="w-4 h-4 text-slate-500" /> Company Name
                                </Label>
                                <Input id="company" name="company" value={formData.company} onChange={handleChange} placeholder="Acme Corp" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="email" className="flex items-center gap-2">
                                    <Mail className="w-4 h-4 text-slate-500" /> Email Address *
                                </Label>
                                <Input id="email" name="email" type="email" required value={formData.email} onChange={handleChange} placeholder="john@example.com" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="phone" className="flex items-center gap-2">
                                    <Phone className="w-4 h-4 text-slate-500" /> Phone Number *
                                </Label>
                                <Input id="phone" name="phone" required value={formData.phone} onChange={handleChange} placeholder="+1 234 567 8900" />
                            </div>
                        </div>

                        <div className="border-t border-slate-200 pt-6 mt-6"></div>

                        {/* Business Details */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label htmlFor="industry" className="flex items-center gap-2">
                                    <Briefcase className="w-4 h-4 text-slate-500" /> Industry
                                </Label>
                                <Input id="industry" name="industry" value={formData.industry} onChange={handleChange} placeholder="E.g. Technology, Healthcare" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="website" className="flex items-center gap-2">
                                    <Globe className="w-4 h-4 text-slate-500" /> Website
                                </Label>
                                <Input id="website" name="website" value={formData.website} onChange={handleChange} placeholder="https://www.example.com" />
                            </div>
                            <div className="space-y-2 md:col-span-2">
                                <Label htmlFor="address" className="flex items-center gap-2">
                                    <MapPin className="w-4 h-4 text-slate-500" /> Address & City
                                </Label>
                                <Input id="address" name="address" value={formData.address} onChange={handleChange} placeholder="Street Address" className="mb-2" />
                                <Input id="city" name="city" value={formData.city} onChange={handleChange} placeholder="City, State, Zip" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="gstNumber" className="flex items-center gap-2">
                                    <CreditCard className="w-4 h-4 text-slate-500" /> GST/Tax Number
                                </Label>
                                <Input id="gstNumber" name="gstNumber" value={formData.gstNumber} onChange={handleChange} placeholder="Optional" />
                            </div>
                        </div>

                        <div className="border-t border-slate-200 pt-6 mt-6"></div>

                        {/* Requirements */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2 md:col-span-2">
                                <Label htmlFor="services" className="flex items-center gap-2">
                                    <Briefcase className="w-4 h-4 text-slate-500" /> Required Services
                                </Label>
                                <Input id="services" name="services" value={formData.services} onChange={handleChange} placeholder="E.g. Web Development, SEO (comma separated)" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="budget" className="flex items-center gap-2">
                                    <CreditCard className="w-4 h-4 text-slate-500" /> Estimated Budget
                                </Label>
                                <Input id="budget" name="budget" value={formData.budget} onChange={handleChange} placeholder="E.g. $5,000" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="expectedDeadline" className="flex items-center gap-2">
                                    <Calendar className="w-4 h-4 text-slate-500" /> Expected Deadline
                                </Label>
                                <Input id="expectedDeadline" name="expectedDeadline" type="date" value={formData.expectedDeadline} onChange={handleChange} />
                            </div>
                        </div>

                        <div className="pt-6">
                            <Button type="submit" disabled={loading} className="w-full text-lg py-6 shadow-lg hover:shadow-xl transition-all">
                                {loading ? "Submitting..." : "Submit Onboarding Form"}
                            </Button>
                        </div>
                    </form>
                </motion.div>
            </div>
        </div>
    );
}
