const Client = require('../models/Client');
const Project = require('../models/Project');
const crypto = require('crypto');
const Setting = require('../models/Setting');
const Notification = require('../models/Notification');
const ClientOnboardingTemplate = require('../models/ClientOnboardingTemplate');

exports.getClients = async (req, res, next) => {
    try {
        let filter = {};
        const Setting = require('../models/Setting');
        const settings = await Setting.findOne({ type: 'general' });
        const userRole = settings?.roles?.find(r => r.name === req.user.role);
        const canViewAll = userRole?.permissions?.clients?.view_all || req.user.role === 'owner' || req.user.role === 'admin';

        if (req.user && req.user.role === 'client') {
            filter = { _id: req.user.clientId };
        } else if (!canViewAll && req.user && req.user.role !== 'owner') {
            const userId = req.user._id.toString();

            // Clients for projects where I am PM or member
            const myProjects = await Project.find({
                $or: [{ pmId: userId }, { members: userId }]
            }).select('clientId');
            const myProjectClientIds = myProjects.map(p => p.clientId);

            filter = {
                $or: [
                    { assignedTo: userId },
                    { _id: { $in: myProjectClientIds } }
                ]
            };
        }
        const clients = await Client.find(filter).sort({ createdAt: -1 });
        res.json(clients);
    } catch (err) {
        next(err);
    }
};

exports.getClientById = async (req, res, next) => {
    try {
        const client = await Client.findById(req.params.id);
        if (!client) return res.status(404).json({ message: 'Client not found' });

        const Setting = require('../models/Setting');
        const settings = await Setting.findOne({ type: 'general' });
        const userRole = settings?.roles?.find(r => r.name === req.user.role);
        const canViewAll = userRole?.permissions?.clients?.view_all || req.user.role === 'owner' || req.user.role === 'admin';

        if (req.user && req.user.role === 'client') {
            if (client._id.toString() !== req.user.clientId) {
                return res.status(403).json({ message: 'Not authorized to view this client' });
            }
        } else if (!canViewAll && req.user && req.user.role !== 'owner') {
            const userId = req.user._id.toString();
            if (client.assignedTo !== userId) {
                // Secondary check: Are they working on any of this client's projects?
                const hasProject = await Project.findOne({
                    clientId: client._id.toString(),
                    $or: [{ pmId: userId }, { members: userId }]
                });

                if (!hasProject) {
                    return res.status(403).json({ message: 'Not authorized to view this client' });
                }
            }
        }
        res.json(client);
    } catch (err) {
        next(err);
    }
};

exports.createClient = async (req, res, next) => {
    try {
        const clientData = { ...req.body };
        if (req.user && !clientData.assignedTo) {
            clientData.assignedTo = req.user._id.toString();
        }
        const client = new Client(clientData);
        const newClient = await client.save();

        // Trigger Notification
        try {
            const Notification = require('../models/Notification');
            await Notification.create({
                title: 'New Client Registered',
                message: `Client "${newClient.company}" has been added to the system.`,
                type: 'new_client',
                relatedId: newClient._id
            });
        } catch (nErr) { console.error('Notif Error:', nErr); }

        res.status(201).json(newClient);
    } catch (err) {
        next(err);
    }
};

exports.updateClient = async (req, res, next) => {
    try {
        const client = await Client.findById(req.params.id);
        if (!client) return res.status(404).json({ message: 'Client not found' });

        // RBAC Check for Updates
        const Setting = require('../models/Setting');
        const settings = await Setting.findOne({ type: 'general' });
        const userRole = settings?.roles?.find(r => r.name === req.user.role);
        const canEditAll = userRole?.permissions?.clients?.edit_all || req.user.role === 'owner' || req.user.role === 'admin';

        if (!canEditAll && req.user && req.user.role !== 'owner') {
            const userId = req.user._id.toString();
            if (client.assignedTo !== userId) {
                const hasProject = await Project.findOne({
                    clientId: client._id.toString(),
                    $or: [{ pmId: userId }, { members: userId }]
                });
                if (!hasProject) {
                    return res.status(403).json({ message: 'Not authorized to update this client' });
                }
            }
        }

        const updatedClient = await Client.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(updatedClient);
    } catch (err) {
        next(err);
    }
};

exports.deleteClient = async (req, res, next) => {
    try {
        const deletedClient = await Client.findByIdAndDelete(req.params.id);
        if (!deletedClient) return res.status(404).json({ message: 'Client not found' });

        // Safe cascade cleanup of dependent records
        try {
            const ClientProduct = require('../models/ClientProduct');
            const Ticket = require('../models/Ticket');
            const Project = require('../models/Project');

            await ClientProduct.deleteMany({ client: req.params.id });
            await Ticket.deleteMany({ clientId: req.params.id });
            await Project.updateMany({ clientId: req.params.id }, { $unset: { clientId: "" } });
        } catch (cleanupErr) {
            console.error('Cascade cleanup error on client delete:', cleanupErr);
        }

        res.json({ message: 'Client deleted and dependencies safely cleaned' });
    } catch (err) {
        next(err);
    }
};

exports.createPublicClient = async (req, res, next) => {
    try {
        const clientData = { ...req.body };
        // Public form submissions might not have an assigned user, 
        // they will just be 'new' status
        clientData.status = 'new';
        
        const client = new Client(clientData);
        const newClient = await client.save();

        // Trigger Notification
        try {
            const Notification = require('../models/Notification');
            await Notification.create({
                title: 'New Client Onboarding Submitted',
                message: `Client "${newClient.company || newClient.name}" has completed the onboarding form.`,
                type: 'new_client',
                relatedId: newClient._id
            });
        } catch (nErr) { console.error('Notif Error:', nErr); }

        res.status(201).json({ message: 'Client onboarded successfully', client: { _id: newClient._id, name: newClient.name } });
    } catch (err) {
        next(err);
    }
};

// Generate or update client onboarding form config and link
exports.generateOnboardingLink = async (req, res, next) => {
    try {
        const client = await Client.findById(req.params.id);
        if (!client) return res.status(404).json({ message: 'Client not found' });

        const { config, forceNewToken } = req.body;

        // Generate token if not exists or if explicitly requested
        if (!client.onboardingToken || forceNewToken) {
            client.onboardingToken = crypto.randomBytes(24).toString('hex');
        }

        if (config) {
            client.customOnboardingConfig = config;
        }

        client.onboardingStatus = 'sent';
        client.onboardingSentAt = new Date();

        await client.save();

        res.json({
            message: 'Onboarding link generated successfully',
            token: client.onboardingToken,
            onboardingStatus: client.onboardingStatus,
            onboardingSentAt: client.onboardingSentAt,
            config: client.customOnboardingConfig,
            client
        });
    } catch (err) {
        next(err);
    }
};

// Update onboarding config without changing token
exports.updateOnboardingConfig = async (req, res, next) => {
    try {
        const client = await Client.findById(req.params.id);
        if (!client) return res.status(404).json({ message: 'Client not found' });

        client.customOnboardingConfig = req.body.config || req.body;
        await client.save();

        res.json({
            message: 'Onboarding configuration updated',
            config: client.customOnboardingConfig,
            client
        });
    } catch (err) {
        next(err);
    }
};

// Reset onboarding status (e.g. to allow resubmission or revert to draft)
exports.resetOnboardingStatus = async (req, res, next) => {
    try {
        const client = await Client.findById(req.params.id);
        if (!client) return res.status(404).json({ message: 'Client not found' });

        const { status = 'sent' } = req.body;
        client.onboardingStatus = status;
        if (status === 'sent') {
            client.onboardingSentAt = new Date();
        }
        await client.save();

        res.json({
            message: 'Onboarding status reset successfully',
            onboardingStatus: client.onboardingStatus,
            client
        });
    } catch (err) {
        next(err);
    }
};

// Public: Get onboarding form details by secure token
exports.getPublicOnboardingForm = async (req, res, next) => {
    try {
        const { token } = req.params;
        if (!token) return res.status(400).json({ message: 'Onboarding token is required' });

        const client = await Client.findOne({ onboardingToken: token });
        if (!client) {
            return res.status(404).json({ message: 'Invalid or expired onboarding form link.' });
        }

        // Fetch agency general settings for branding
        let agencyInfo = {
            companyName: 'NexCRM Business Hub',
            logo: '',
            email: '',
            phone: '',
            website: ''
        };
        try {
            const settings = await Setting.findOne({ type: 'general' });
            if (settings) {
                agencyInfo = {
                    companyName: settings.companyName || settings.name || agencyInfo.companyName,
                    logo: settings.logo || '',
                    email: settings.email || '',
                    phone: settings.phone || '',
                    website: settings.website || ''
                };
            }
        } catch (sErr) {
            console.error('Settings fetch error:', sErr);
        }

        res.json({
            client: {
                id: client._id,
                _id: client._id,
                name: client.name,
                company: client.company,
                email: client.email,
                phone: client.phone,
                industry: client.industry,
                city: client.city,
                state: client.state,
                country: client.country,
                website: client.website,
                gstNumber: client.gstNumber,
                address: client.address,
                services: client.services || [],
                budget: client.budget,
                expectedDeadline: client.expectedDeadline,
                onboardingStatus: client.onboardingStatus,
                onboardingSentAt: client.onboardingSentAt,
                onboardingCompletedAt: client.onboardingCompletedAt,
                onboardingData: client.onboardingData || {},
                onboardingFiles: client.onboardingFiles || []
            },
            agency: agencyInfo,
            config: client.customOnboardingConfig || null
        });
    } catch (err) {
        next(err);
    }
};

// Public: Upload file for onboarding form
exports.uploadOnboardingFile = async (req, res, next) => {
    try {
        const { token } = req.params;
        if (!token) return res.status(400).json({ message: 'Token is required' });

        const client = await Client.findOne({ onboardingToken: token });
        if (!client) return res.status(404).json({ message: 'Client not found' });

        if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

        const fileUrl = `/public/uploads/${req.file.filename}`;
        res.json({
            fileName: req.file.originalname,
            fileUrl,
            fieldId: req.body.fieldId || '',
            fieldName: req.body.fieldName || req.file.originalname
        });
    } catch (err) {
        next(err);
    }
};

// Public: Submit completed onboarding form by client
exports.submitPublicOnboardingForm = async (req, res, next) => {
    try {
        const { token } = req.params;
        if (!token) return res.status(400).json({ message: 'Token is required' });

        const client = await Client.findOne({ onboardingToken: token });
        if (!client) return res.status(404).json({ message: 'Invalid or expired onboarding form link.' });

        const {
            // Core standard fields
            name,
            company,
            email,
            phone,
            industry,
            city,
            state,
            country,
            website,
            gstNumber,
            address,
            services,
            budget,
            expectedDeadline,
            // Custom responses and attachments
            onboardingData,
            onboardingFiles
        } = req.body;

        // Update core client attributes if provided
        if (name) client.name = name;
        if (company) client.company = company;
        if (email) client.email = email;
        if (phone) client.phone = phone;
        if (industry) client.industry = industry;
        if (city) client.city = city;
        if (state) client.state = state;
        if (country) client.country = country;
        if (website) client.website = website;
        if (gstNumber) client.gstNumber = gstNumber;
        if (address) client.address = address;
        if (services) {
            client.services = Array.isArray(services) ? services : String(services).split(',').map(s => s.trim()).filter(Boolean);
        }
        if (budget) client.budget = budget;
        if (expectedDeadline) client.expectedDeadline = new Date(expectedDeadline);

        // Store custom intake responses
        if (onboardingData && typeof onboardingData === 'object') {
            client.onboardingData = {
                ...(client.onboardingData || {}),
                ...onboardingData
            };
        }

        // Store file uploads
        if (Array.isArray(onboardingFiles) && onboardingFiles.length > 0) {
            client.onboardingFiles = [
                ...(client.onboardingFiles || []),
                ...onboardingFiles
            ];
        }

        // Mark as completed
        client.onboardingStatus = 'completed';
        client.onboardingCompletedAt = new Date();
        client.updatedAt = new Date();

        await client.save();

        // Trigger Notification for Admin & Team
        try {
            await Notification.create({
                title: 'Client Onboarding Completed',
                message: `${client.company || client.name} has submitted their custom onboarding details.`,
                type: 'client_onboarding',
                relatedId: client._id
            });
        } catch (nErr) {
            console.error('Notification error:', nErr);
        }

        res.json({
            message: 'Onboarding form submitted successfully! Thank you.',
            client: {
                id: client._id,
                name: client.name,
                company: client.company,
                onboardingStatus: client.onboardingStatus,
                onboardingCompletedAt: client.onboardingCompletedAt
            }
        });
    } catch (err) {
        next(err);
    }
};


const DEFAULT_ONBOARDING_TEMPLATES = [
    {
        name: 'Web Design & Development',
        icon: 'Globe',
        description: 'Brand identity, design preferences, reference websites & target features',
        isDefault: true,
        fields: [
            { id: 'brand_colors', label: 'Brand Color Palette & Aesthetic Preferences', type: 'text', placeholder: 'e.g. Royal Blue & Gold, Minimalist & Modern', required: false },
            { id: 'ref_websites', label: 'Reference Websites You Admire (URLs)', type: 'textarea', placeholder: 'List 2-3 websites and what you like about them', required: true },
            { id: 'target_audience', label: 'Primary Target Audience & Demographics', type: 'text', placeholder: 'e.g. B2B Enterprise Decision Makers in Tech', required: false },
            { id: 'must_have_features', label: 'Must-Have Core Website Features', type: 'textarea', placeholder: 'e.g. Lead capture forms, Client portal, Blog, Payment gateway', required: true },
            { id: 'domain_hosting_status', label: 'Current Domain & Hosting Status', type: 'select', required: true, options: ['I have domain and hosting ready', 'I have domain only (need hosting)', 'I need help purchasing domain and hosting'] },
            { id: 'brand_assets', label: 'Upload Brand Assets (Logo, Guidelines, Media)', type: 'file', required: false, helpText: 'Attach high-res logo (.png, .svg) or zip' }
        ]
    },
    {
        name: 'Mobile App Development',
        icon: 'Smartphone',
        description: 'Platforms (iOS/Android), core user journey & external API integrations',
        isDefault: true,
        fields: [
            { id: 'target_platforms', label: 'Target Platforms', type: 'select', required: true, options: ['Cross-platform (iOS + Android Flutter/React Native)', 'Native iOS Only', 'Native Android Only'] },
            { id: 'app_summary', label: 'Elevator Pitch / Problem the App Solves', type: 'textarea', placeholder: 'Brief summary of what your mobile app does', required: true },
            { id: 'user_roles', label: 'User Roles & Account Types', type: 'text', placeholder: 'e.g. Customer, Vendor, Super Admin', required: false },
            { id: 'third_party_apis', label: 'Required Third-Party APIs / Integrations', type: 'textarea', placeholder: 'e.g. Stripe, Twilio SMS, Google Maps API', required: false },
            { id: 'app_wireframes', label: 'Existing Wireframes / PRD Documents', type: 'file', required: false, helpText: 'Upload PDF, Figma links or wireframe documents' }
        ]
    },
    {
        name: 'E-Commerce Solution',
        icon: 'ShoppingCart',
        description: 'Product catalog size, payment gateways & logistics integration',
        isDefault: true,
        fields: [
            { id: 'approx_skus', label: 'Estimated Number of Products / SKUs', type: 'select', required: true, options: ['1 - 25 Products', '25 - 100 Products', '100 - 1000 Products', '1000+ Enterprise SKUs'] },
            { id: 'payment_gateways', label: 'Preferred Payment Gateways', type: 'text', placeholder: 'e.g. Razorpay, Stripe, PhonePe, Cashfree', required: true },
            { id: 'shipping_partners', label: 'Shipping & Logistics Partners', type: 'text', placeholder: 'e.g. Shiprocket, Delhivery, BlueDart', required: false },
            { id: 'tax_rules', label: 'GST & Invoice Tax Requirements', type: 'textarea', placeholder: 'e.g. Standard 18% GST with HSN codes support', required: false },
            { id: 'product_catalog_sample', label: 'Product Catalog / Sample Inventory File', type: 'file', required: false, helpText: 'Excel, CSV or PDF of product samples' }
        ]
    },
    {
        name: 'Digital Marketing & SEO',
        icon: 'TrendingUp',
        description: 'Target keywords, competitor analysis & advertising budget',
        isDefault: true,
        fields: [
            { id: 'target_keywords', label: 'Core Target Keywords / Search Queries', type: 'textarea', placeholder: 'List key phrases customers use to find your business', required: true },
            { id: 'top_competitors', label: 'Top 3 Competitor Websites', type: 'textarea', placeholder: 'e.g. competitor1.com, competitor2.com', required: true },
            { id: 'current_ad_spend', label: 'Estimated Monthly Ad Spend Budget', type: 'text', placeholder: 'e.g. ₹50,000 / month on Google Ads', required: false },
            { id: 'active_social_profiles', label: 'Existing Social Media Profiles', type: 'textarea', placeholder: 'Instagram, LinkedIn, Facebook page links', required: false }
        ]
    },
    {
        name: 'General Corporate Intake',
        icon: 'Building2',
        description: 'Standard enterprise onboarding with billing & stakeholder points of contact',
        isDefault: true,
        fields: [
            { id: 'billing_contact_name', label: 'Billing / Accounts Point of Contact', type: 'text', placeholder: 'Accounts Manager Name & Email', required: true },
            { id: 'project_poc', label: 'Primary Technical / Project Decision Maker', type: 'text', placeholder: 'Full Name & Direct Phone', required: true },
            { id: 'project_notes', label: 'Key Goals & Success Criteria', type: 'textarea', placeholder: 'What defines a successful project delivery for you?', required: true },
            { id: 'company_documents', label: 'GST Certificate / Company Registration Document', type: 'file', required: false }
        ]
    }
];

exports.getOnboardingTemplates = async (req, res, next) => {
    try {
        let templates = await ClientOnboardingTemplate.find().sort({ isDefault: -1, createdAt: 1 });
        if (!templates || templates.length === 0) {
            await ClientOnboardingTemplate.insertMany(DEFAULT_ONBOARDING_TEMPLATES);
            templates = await ClientOnboardingTemplate.find().sort({ isDefault: -1, createdAt: 1 });
        }
        res.json(templates);
    } catch (err) {
        next(err);
    }
};

exports.createOnboardingTemplate = async (req, res, next) => {
    try {
        const { name, description, icon, fields, standardFields } = req.body;
        if (!name || !name.trim()) {
            return res.status(400).json({ message: 'Template name is required' });
        }
        const newTemplate = new ClientOnboardingTemplate({
            name: name.trim(),
            description: description || '',
            icon: icon || 'Globe',
            fields: Array.isArray(fields) ? fields : [],
            standardFields: standardFields || {},
            isDefault: false
        });
        await newTemplate.save();
        res.status(201).json(newTemplate);
    } catch (err) {
        next(err);
    }
};

exports.updateOnboardingTemplate = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { name, description, icon, fields, standardFields } = req.body;
        const template = await ClientOnboardingTemplate.findById(id);
        if (!template) {
            return res.status(404).json({ message: 'Template not found' });
        }
        if (name) template.name = name.trim();
        if (description !== undefined) template.description = description;
        if (icon) template.icon = icon;
        if (fields) template.fields = fields;
        if (standardFields) template.standardFields = standardFields;
        template.updatedAt = new Date();
        await template.save();
        res.json(template);
    } catch (err) {
        next(err);
    }
};

exports.deleteOnboardingTemplate = async (req, res, next) => {
    try {
        const { id } = req.params;
        const template = await ClientOnboardingTemplate.findById(id);
        if (!template) {
            return res.status(404).json({ message: 'Template not found' });
        }
        if (template.isDefault) {
            return res.status(400).json({ message: 'Default templates cannot be deleted' });
        }
        await ClientOnboardingTemplate.findByIdAndDelete(id);
        res.json({ message: 'Template deleted successfully' });
    } catch (err) {
        next(err);
    }
};
