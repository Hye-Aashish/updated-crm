const express = require('express');
const router = express.Router();
const ClientForm = require('../models/ClientForm');
const Client = require('../models/Client');
const { protect, checkPermission } = require('../middleware/authMiddleware');
const { applyCreatorScope, assertCreatorAccess } = require('../utils/dataScope');
const upload = require('../utils/multerConfig');
const { signFileAccess } = require('../utils/securityHelpers');

const DEFAULT_SUCCESS =
    'Your details have been submitted. Please wait for some time — our team will contact you shortly.';

const CLIENT_FIELD_KEYS = new Set([
    'name', 'company', 'email', 'phone', 'industry', 'city', 'state', 'country',
    'website', 'gstNumber', 'gst', 'address', 'services', 'budget', 'expectedDeadline'
]);

function pickValue(submission, keys) {
    for (const key of keys) {
        const v = submission[key];
        if (v != null && String(v).trim() !== '') return String(v).trim();
    }
    return '';
}

function mapSubmissionToClientFields(submission) {
    const name = pickValue(submission, ['name', 'full_name', 'fullName', 'contact_name']);
    const company = pickValue(submission, ['company', 'company_name', 'business_name']);
    const email = pickValue(submission, ['email', 'email_address']);
    const phone = pickValue(submission, ['phone', 'mobile', 'phone_number', 'contact_number']);
    const gstNumber = pickValue(submission, ['gstNumber', 'gst', 'gst_number']);
    const address = pickValue(submission, ['address', 'full_address']);
    const industry = pickValue(submission, ['industry']);
    const city = pickValue(submission, ['city']);
    const state = pickValue(submission, ['state']);
    const country = pickValue(submission, ['country']);
    const website = pickValue(submission, ['website', 'website_url']);
    const budget = pickValue(submission, ['budget']);
    const expectedDeadline = pickValue(submission, ['expectedDeadline', 'deadline', 'expected_deadline']);

    let services = submission.services;
    if (typeof services === 'string') {
        services = services.split(',').map((s) => s.trim()).filter(Boolean);
    }
    if (!Array.isArray(services)) services = [];

    const skipKeys = new Set([
        ...CLIENT_FIELD_KEYS,
        'onboardingFiles', '_files', 'name', 'company', 'email', 'phone',
        'full_name', 'fullName', 'company_name', 'business_name', 'email_address',
        'mobile', 'phone_number', 'contact_number', 'gst', 'gst_number',
        'full_address', 'website_url', 'deadline', 'expected_deadline', 'contact_name'
    ]);

    const onboardingData = {};
    for (const [key, value] of Object.entries(submission || {})) {
        if (skipKeys.has(key)) continue;
        onboardingData[key] = value;
    }

    return {
        name: name || company,
        company: company || name,
        email: email || undefined,
        phone: phone || 'N/A',
        gstNumber,
        address,
        industry,
        city,
        state,
        country,
        website,
        budget,
        services,
        expectedDeadline: expectedDeadline ? new Date(expectedDeadline) : undefined,
        onboardingData
    };
}

// ── Public routes FIRST (before /:id) ──────────────────────

router.get('/public/:id', async (req, res) => {
    try {
        const form = await ClientForm.findById(req.params.id);
        if (!form || !form.isActive) {
            return res.status(404).json({ message: 'Form not found or inactive' });
        }
        res.json({
            _id: form._id,
            title: form.title,
            description: form.description,
            fields: form.fields,
            successMessage: form.successMessage || DEFAULT_SUCCESS
        });
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

router.post('/public/:id/upload', upload.uploadPrivate.single('file'), async (req, res) => {
    try {
        const form = await ClientForm.findById(req.params.id);
        if (!form || !form.isActive) {
            return res.status(404).json({ message: 'Form not found or inactive' });
        }
        if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

        const fileUrl = `/api/files/secure/${encodeURIComponent(req.file.filename)}?access=${signFileAccess(req.file.filename)}`;
        res.json({
            fileName: req.file.originalname,
            fileUrl,
            fieldId: req.body.fieldId || '',
            fieldName: req.body.fieldName || req.file.originalname
        });
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

router.post('/public/:id/submit', async (req, res) => {
    try {
        const form = await ClientForm.findById(req.params.id);
        if (!form || !form.isActive) {
            return res.status(404).json({ message: 'Form not found or inactive' });
        }

        const submission = req.body || {};
        const mapped = mapSubmissionToClientFields(submission);
        const files = Array.isArray(submission.onboardingFiles)
            ? submission.onboardingFiles
            : (Array.isArray(submission._files) ? submission._files : []);

        if (!mapped.name && !mapped.company) {
            return res.status(400).json({ message: 'Name or Company is required' });
        }
        if ((!mapped.email || mapped.email === '') && (!mapped.phone || mapped.phone === 'N/A')) {
            return res.status(400).json({ message: 'Email or Phone is required' });
        }

        mapped.onboardingData = {
            ...mapped.onboardingData,
            _formId: form._id.toString(),
            _formTitle: form.title
        };

        let client = null;
        let created = false;

        if (mapped.email) {
            const escaped = mapped.email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            client = await Client.findOne({ email: new RegExp(`^${escaped}$`, 'i') });
        }

        if (client) {
            client.name = mapped.name || client.name;
            client.company = mapped.company || client.company;
            if (mapped.phone && mapped.phone !== 'N/A') client.phone = mapped.phone;
            if (mapped.gstNumber) client.gstNumber = mapped.gstNumber;
            if (mapped.address) client.address = mapped.address;
            if (mapped.industry) client.industry = mapped.industry;
            if (mapped.city) client.city = mapped.city;
            if (mapped.state) client.state = mapped.state;
            if (mapped.country) client.country = mapped.country;
            if (mapped.website) client.website = mapped.website;
            if (mapped.budget) client.budget = mapped.budget;
            if (mapped.services?.length) client.services = mapped.services;
            if (mapped.expectedDeadline) client.expectedDeadline = mapped.expectedDeadline;
            client.onboardingStatus = 'completed';
            client.onboardingCompletedAt = new Date();
            client.onboardingData = { ...(client.onboardingData || {}), ...mapped.onboardingData };
            if (files.length) {
                client.onboardingFiles = [...(client.onboardingFiles || []), ...files];
            }
            client.leadSource = client.leadSource || `Client Form: ${form.title}`;
            client.updatedAt = new Date();
            client.markModified('onboardingData');
            client.markModified('onboardingFiles');
            await client.save();
        } else {
            if (!mapped.phone || mapped.phone === 'N/A') {
                return res.status(400).json({ message: 'Phone is required for new clients' });
            }
            client = new Client({
                name: mapped.name,
                company: mapped.company,
                phone: mapped.phone,
                email: mapped.email,
                industry: mapped.industry || '',
                city: mapped.city || '',
                state: mapped.state || '',
                country: mapped.country || '',
                website: mapped.website || '',
                gstNumber: mapped.gstNumber || '',
                address: mapped.address || '',
                services: mapped.services || [],
                budget: mapped.budget || '',
                expectedDeadline: mapped.expectedDeadline,
                status: 'active',
                type: 'one-time',
                leadSource: `Client Form: ${form.title}`,
                onboardingStatus: 'completed',
                onboardingCompletedAt: new Date(),
                onboardingData: mapped.onboardingData,
                onboardingFiles: files
            });
            client.markModified('onboardingData');
            client.markModified('onboardingFiles');
            await client.save();
            created = true;
        }

        try {
            const Notification = require('../models/Notification');
            await Notification.create({
                title: created ? 'New Client via Form' : 'Client Form Resubmitted',
                message: `"${client.company || client.name}" ${created ? 'registered' : 'updated'} via form "${form.title}".`,
                type: 'new_client',
                relatedId: client._id
            });
        } catch (nErr) {
            console.error('Client form notification error:', nErr);
        }

        res.status(created ? 201 : 200).json({
            success: true,
            message: form.successMessage || DEFAULT_SUCCESS,
            client: {
                id: client._id,
                name: client.name,
                company: client.company
            },
            created
        });
    } catch (err) {
        console.error('Client form submit error:', err);
        res.status(400).json({ message: err.message });
    }
});

// ── Auth CRUD ──────────────────────────────────────────────

router.get('/', protect, checkPermission('client_forms', 'view'), async (req, res) => {
    try {
        const filter = await applyCreatorScope({}, req.user, 'client_forms');
        const forms = await ClientForm.find(filter).sort({ createdAt: -1 });
        res.json(forms);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.post('/', protect, checkPermission('client_forms', 'create'), async (req, res) => {
    try {
        const { title, description, fields, isActive, successMessage } = req.body;
        if (!title) return res.status(400).json({ message: 'Form title is required' });

        const newForm = new ClientForm({
            title,
            description,
            fields: fields || [],
            isActive: isActive !== false,
            successMessage: successMessage || DEFAULT_SUCCESS,
            createdBy: req.user._id
        });
        const saved = await newForm.save();
        res.status(201).json(saved);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

router.get('/:id', protect, checkPermission('client_forms', 'view'), async (req, res) => {
    try {
        const form = await ClientForm.findById(req.params.id);
        if (!form) return res.status(404).json({ message: 'Form not found' });
        const access = await assertCreatorAccess(req.user, form, 'client_forms');
        if (!access.ok) return res.status(access.status).json({ message: access.message });
        res.json(form);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.put('/:id', protect, checkPermission('client_forms', 'edit'), async (req, res) => {
    try {
        const existing = await ClientForm.findById(req.params.id);
        if (!existing) return res.status(404).json({ message: 'Form not found' });
        const access = await assertCreatorAccess(req.user, existing, 'client_forms');
        if (!access.ok) return res.status(access.status).json({ message: access.message });

        const updateData = { ...req.body, updatedAt: new Date() };
        delete updateData._id;
        delete updateData.__v;
        delete updateData.createdBy;

        const form = await ClientForm.findByIdAndUpdate(req.params.id, updateData, { new: true });
        res.json(form);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

router.delete('/:id', protect, checkPermission('client_forms', 'delete'), async (req, res) => {
    try {
        const existing = await ClientForm.findById(req.params.id);
        if (!existing) return res.status(404).json({ message: 'Form not found' });
        const access = await assertCreatorAccess(req.user, existing, 'client_forms');
        if (!access.ok) return res.status(access.status).json({ message: access.message });
        await ClientForm.findByIdAndDelete(req.params.id);
        res.json({ message: 'Form deleted successfully' });
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

module.exports = router;
