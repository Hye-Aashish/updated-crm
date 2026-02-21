const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Models
const User = require('./models/User');
const Client = require('./models/Client');
const Lead = require('./models/Lead');
const Project = require('./models/Project');
const Task = require('./models/Task');
const Invoice = require('./models/Invoice');
const Expense = require('./models/Expense');
const Attendance = require('./models/Attendance');
const Notification = require('./models/Notification');
const PipelineStage = require('./models/PipelineStage');
const Setting = require('./models/Setting');
const Ticket = require('./models/Ticket');
const TimeEntry = require('./models/TimeEntry');

const seedComprehensive = async () => {
    try {
        console.log('🚀 Starting Comprehensive Database Seeding...');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('📦 Connected to MongoDB');

        // 1. Clear Data
        console.log('🧹 Clearing old data...');
        await Promise.all([
            User.deleteMany({ email: { $ne: 'owner@example.com' } }),
            Client.deleteMany({}),
            Lead.deleteMany({}),
            Project.deleteMany({}),
            Task.deleteMany({}),
            Invoice.deleteMany({}),
            Expense.deleteMany({}),
            Attendance.deleteMany({}),
            Notification.deleteMany({}),
            PipelineStage.deleteMany({}),
            Setting.deleteMany({}),
            Ticket.deleteMany({}),
            TimeEntry.deleteMany({})
        ]);

        // 2. Seed Settings
        const defaultSettings = {
            type: 'general',
            companyProfile: {
                name: 'Nexprism Digital Agency',
                email: 'hello@nexprism.com',
                themeColor: '#3b82f6',
                timezone: 'Asia/Kolkata',
                currency: 'INR'
            },
            dashboardLayouts: {
                'owner': ['financials', 'operational', 'analytics', 'funnel', 'deadlines', 'health', 'activity', 'leads'],
                'admin': ['financials', 'operational', 'analytics', 'funnel', 'deadlines', 'health', 'activity', 'leads'],
                'pm': ['operational', 'deadlines', 'activity'],
                'developer': ['operational', 'deadlines']
            }
        };
        await Setting.create(defaultSettings);
        console.log('✅ Settings Seeded');

        // 3. Seed Pipeline Stages
        const stages = [
            { id: 'new', label: 'New Lead', color: 'bg-blue-500', order: 0 },
            { id: 'contacted', label: 'Contacted', color: 'bg-yellow-500', order: 1 },
            { id: 'qualified', label: 'Qualified', color: 'bg-purple-500', order: 2 },
            { id: 'won', label: 'Closed Won', color: 'bg-emerald-500', order: 3 },
            { id: 'lost', label: 'Lost', color: 'bg-rose-500', order: 4 }
        ];
        await PipelineStage.insertMany(stages);
        console.log('✅ Pipeline Stages Seeded');

        // 4. Seed Users
        const rawPassword = 'password';
        const usersData = [
            { name: 'Demo Admin', email: 'admin@example.com', password: rawPassword, role: 'admin', designation: 'Technical Administrator' },
            { name: 'Demo Employee', email: 'employee@example.com', password: rawPassword, role: 'employee', designation: 'Software Engineer' },
            { name: 'Rahul PM', email: 'rahul@crm.com', password: rawPassword, role: 'pm', designation: 'Project Manager' },
            { name: 'Sneha Dev', email: 'sneha@crm.com', password: rawPassword, role: 'developer', designation: 'Sr. Backend Developer' },
            { name: 'Amit Dev', email: 'amit@crm.com', password: rawPassword, role: 'developer', designation: 'Frontend Developer' }
        ];

        // Use create for all to ensure hooks are triggered correctly
        const users = await User.create(usersData);

        let owner = await User.findOne({ email: 'owner@example.com' });
        if (owner) {
            owner.password = rawPassword;
            owner.name = 'Demo Owner';
            await owner.save();
        } else {
            owner = await User.create({ name: 'Demo Owner', email: 'owner@example.com', password: rawPassword, role: 'owner', designation: 'Founder' });
        }
        const allUsers = [owner, ...users];
        console.log('✅ Users Seeded (Hooks triggered for hashing)');

        // 5. Seed Clients
        const clientsData = [
            { name: 'Vikram Mehta', company: 'Global Logistics Inc', email: 'vikram@global.com', phone: '9876543210', status: 'active', type: 'retainer', industry: 'Logistics', city: 'Mumbai' },
            { name: 'Anita Desai', company: 'Desai & Co', email: 'anita@desai.com', phone: '9822113344', status: 'active', type: 'one-time', industry: 'Legal', city: 'Delhi' },
            { name: 'Robert Fox', company: 'Fox Studios', email: 'robert@fox.com', phone: '9000012345', status: 'confirmed', type: 'retainer', industry: 'Media', city: 'London' }
        ];
        const clients = await Client.insertMany(clientsData);
        console.log('✅ Clients Seeded');

        // 6. Seed Leads
        const leadsData = [
            { name: 'Mayank Kumar', company: 'EdTech Solutions', value: 85000, stage: 'qualified', email: 'mayank@edtech.com', source: 'Google Ads', createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) },
            { name: 'Pooja Singh', company: 'Organic Foods', value: 42000, stage: 'new', email: 'pooja@organic.com', source: 'Reference', createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) },
            { name: 'Karan Mehra', company: 'Auto Parts India', value: 95000, stage: 'won', email: 'karan@auto.com', source: 'SEO', createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000) },
            { name: 'James Clear', company: 'Habit Lab', value: 30000, stage: 'won', email: 'james@habit.com', source: 'Direct', createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) }
        ];
        await Lead.insertMany(leadsData);
        console.log('✅ Leads Seeded');

        // 7. Seed Projects
        const projectsData = [
            { name: 'E-commerce Redesign', description: 'React migration', status: 'in-progress', clientId: clients[0]._id.toString(), pmId: users[0]._id.toString(), budget: 25000, progress: 65, startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), dueDate: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000), createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
            { name: 'CRM Mobile App', description: 'React Native app', status: 'planning', clientId: clients[1]._id.toString(), pmId: users[0]._id.toString(), budget: 45000, progress: 10, startDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), dueDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) },
            { name: 'Legacy Upgrade', description: 'Node.js upgrade', status: 'completed', clientId: clients[0]._id.toString(), pmId: owner._id.toString(), budget: 5000, progress: 100, startDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000), dueDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000) }
        ];
        const projects = await Project.insertMany(projectsData);
        console.log('✅ Projects Seeded');

        // 8. Seed Tasks
        const tasksData = [
            { title: 'Setup Stripe Integration', projectId: projects[0]._id.toString(), status: 'todo', priority: 'high', assigneeId: users[1]._id.toString(), dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), createdAt: new Date() },
            { title: 'Product Filtering Logic', projectId: projects[0]._id.toString(), status: 'in-progress', priority: 'urgent', assigneeId: users[1]._id.toString(), dueDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), createdAt: new Date() },
            { title: 'Mobile Responsiveness', projectId: projects[2]._id.toString(), status: 'done', priority: 'high', assigneeId: users[2]._id.toString(), dueDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), createdAt: new Date() }
        ];
        const tasks = await Task.insertMany(tasksData);
        console.log('✅ Tasks Seeded');

        // 9. Seed Invoices
        const invoicesData = [
            { invoiceNumber: 'INV-001', clientId: clients[0]._id.toString(), projectId: projects[0]._id.toString(), type: 'milestone', status: 'paid', total: 5000, date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), dueDate: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000) },
            { invoiceNumber: 'INV-002', clientId: clients[0]._id.toString(), projectId: projects[0]._id.toString(), type: 'milestone', status: 'pending', total: 10000, date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000) },
            { invoiceNumber: 'INV-003', clientId: clients[1]._id.toString(), projectId: projects[1]._id.toString(), type: 'advance', status: 'paid', total: 15000, date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), dueDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) }
        ];
        await Invoice.insertMany(invoicesData);
        console.log('✅ Invoices Seeded');

        // 10. Seed Expenses
        const expensesData = [
            { amount: 1200, category: 'internet', paymentMode: 'Bank Transfer', paidBy: 'Company', note: 'Office Internet', date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
            { amount: 25000, category: 'rent', paymentMode: 'Bank Transfer', paidBy: 'Company', note: 'Rent', date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000) },
            { amount: 4500, category: 'food-team', paymentMode: 'UPI', paidBy: 'Owner', note: 'Dinner', date: new Date(), createdAt: new Date() }
        ];
        await Expense.insertMany(expensesData);
        console.log('✅ Expenses Seeded');

        // 11. Attendance
        const attendanceData = [];
        for (const u of allUsers) {
            const date = new Date();
            attendanceData.push({
                userId: u._id.toString(),
                date: new Date(date.setHours(0, 0, 0, 0)),
                checkIn: new Date(date.setHours(9, 30, 0, 0)),
                checkOut: new Date(date.setHours(18, 30, 0, 0)),
                status: 'present',
                duration: 9
            });
        }
        await Attendance.insertMany(attendanceData);
        console.log('✅ Attendance Seeded');

        // 12. Seed Tickets
        const ticketsData = [
            { subject: 'Payment gateway error', description: 'Stripe is failing for international cards', priority: 'high', status: 'open', clientName: 'Vikram Mehta' },
            { subject: 'UI Alignment on Mobile', description: 'Menu overlapping on small devices', priority: 'medium', status: 'in-progress', clientName: 'Anita Desai' },
            { subject: 'Logo update request', description: 'Replace old logo with new SVG', priority: 'low', status: 'resolved', clientName: 'Robert Fox' },
            { subject: 'Database migration delay', description: 'The migration is taking too long', priority: 'critical', status: 'open', clientName: 'Vikram Mehta' }
        ];
        await Ticket.insertMany(ticketsData);
        console.log('✅ Tickets Seeded');

        // 13. Seed Time Entries
        const timeEntriesData = [
            { userId: users[1]._id, projectId: projects[0]._id, taskId: tasks[0]._id, startTime: new Date(Date.now() - 3600000), endTime: new Date(), duration: 60, note: 'Initial setup' },
            { userId: users[2]._id, projectId: projects[0]._id, taskId: tasks[1]._id, startTime: new Date(Date.now() - 7200000), endTime: new Date(Date.now() - 3600000), duration: 60, note: 'Frontend UI' },
            { userId: owner._id, projectId: projects[2]._id, startTime: new Date(Date.now() - 10800000), endTime: new Date(Date.now() - 7200000), duration: 60, note: 'Maintenance' }
        ];
        await TimeEntry.insertMany(timeEntriesData);
        console.log('✅ Time Entries Seeded');

        console.log('🌟 COMPREHENSIVE SEEDING COMPLETED!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Seeding Failed:', err);
        process.exit(1);
    }
};

seedComprehensive();
