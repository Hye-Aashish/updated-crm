const mongoose = require('mongoose');
const User = require('./models/User');
const Client = require('./models/Client');
const Lead = require('./models/Lead');
const Project = require('./models/Project');
const Invoice = require('./models/Invoice');
const PipelineStage = require('./models/PipelineStage');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const seedData = async () => {
    try {
        console.log('🌱 Seeding Dummy Data...');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to DB');

        // 1. Clear Existing Data (Optional but recommended for a clean start)
        // await User.deleteMany({});
        // await Client.deleteMany({});
        // await Lead.deleteMany({});
        // await Project.deleteMany({});
        // await Invoice.deleteMany({});
        // await PipelineStage.deleteMany({});

        // 2. Seed Users
        const hashedPassword = bcrypt.hashSync('password123', 10);
        const admin = await User.findOneAndUpdate(
            { email: 'admin@example.com' },
            { name: 'Admin User', password: hashedPassword, role: 'admin', designation: 'Manager' },
            { upsert: true, new: true }
        );

        // Fetch client1 after it's defined below or move user seeding after client seeding
        // For now, I'll just add the logic to create a client user after client creation.

        // 3. Seed Pipeline Stages
        const stages = [
            { id: 'new', label: 'New Lead', color: 'bg-blue-500', order: 0 },
            { id: 'contacted', label: 'Contacted', color: 'bg-yellow-500', order: 1 },
            { id: 'qualified', label: 'Qualified', color: 'bg-purple-500', order: 2 },
            { id: 'won', label: 'Closed Won', color: 'bg-emerald-500', order: 3 }
        ];
        for (const s of stages) {
            await PipelineStage.findOneAndUpdate({ id: s.id }, s, { upsert: true });
        }
        console.log('✅ Pipeline Stages Ready');

        // 4. Seed Clients
        const client1 = await Client.findOneAndUpdate(
            { email: 'techcorp@example.com' },
            {
                name: 'John Smith',
                company: 'TechCorp Solutions',
                phone: '9876543210',
                status: 'active',
                type: 'retainer',
                industry: 'Software',
                city: 'San Francisco'
            },
            { upsert: true, new: true }
        );

        const client2 = await Client.findOneAndUpdate(
            { email: 'creative@example.com' },
            {
                name: 'Sarah Jane',
                company: 'Creative Studio',
                phone: '9876500123',
                status: 'confirmed',
                type: 'one-time',
                industry: 'Design',
                city: 'New York'
            },
            { upsert: true, new: true }
        );
        console.log('✅ Clients Ready');

        // 4.5 Seed Client User
        const clientUser = await User.findOneAndUpdate(
            { email: 'client@example.com' },
            {
                name: 'Client User',
                password: hashedPassword,
                role: 'client',
                clientId: client1._id.toString()
            },
            { upsert: true, new: true }
        );
        console.log('✅ Client User Ready');

        // 5. Seed Leads
        const leads = [
            { name: 'Alice Cooper', company: 'Global Ads', value: 50000, stage: 'new', email: 'alice@global.com' },
            { name: 'Bob Marley', company: 'Reggae Inc', value: 25000, stage: 'qualified', email: 'bob@reggae.com' },
            { name: 'Charlie Sheen', company: 'Winning Soft', value: 120000, stage: 'contacted', email: 'charlie@winning.com' }
        ];
        for (const l of leads) {
            await Lead.findOneAndUpdate({ email: l.email }, l, { upsert: true });
        }
        console.log('✅ Leads Ready');

        // 6. Seed Projects
        const project1 = await Project.findOneAndUpdate(
            { name: 'Corporate Website 2024' },
            {
                description: 'Full redesign of corporate portal',
                status: 'in-progress',
                clientId: client1._id.toString(),
                dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                budget: 15000,
                progress: 45
            },
            { upsert: true, new: true }
        );
        console.log('✅ Projects Ready');

        // 7. Seed Invoices
        const invoices = [
            {
                invoiceNumber: 'INV-2024-001',
                clientId: client1._id.toString(),
                projectId: project1._id.toString(),
                status: 'paid',
                total: 5000,
                date: new Date(),
                dueDate: new Date()
            },
            {
                invoiceNumber: 'INV-2024-002',
                clientId: client1._id.toString(),
                projectId: project1._id.toString(),
                status: 'pending',
                total: 10000,
                date: new Date(),
                dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
            }
        ];
        for (const inv of invoices) {
            await Invoice.findOneAndUpdate({ invoiceNumber: inv.invoiceNumber }, inv, { upsert: true });
        }
        console.log('✅ Invoices Ready');

        console.log('🚀 Seeding Completed Successfully');
        process.exit(0);
    } catch (err) {
        console.error('❌ Seeding Failed:', err);
        process.exit(1);
    }
};

seedData();
