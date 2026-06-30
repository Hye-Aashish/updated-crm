require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Client = require('./models/Client');

const createDemoAccounts = async () => {
    try {
        console.log('Connecting to database...');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected.');

        // Define credentials
        const adminEmail = 'admin_demo@nexprism.com';
        const adminPassword = 'AdminPassword123';
        
        const employeeEmail = 'employee_demo@nexprism.com';
        const employeePassword = 'EmployeePassword123';

        const clientEmail = 'client_demo@nexprism.com';
        const clientPassword = 'ClientPassword123';

        // 1. Create or Update Admin Account
        let admin = await User.findOne({ email: adminEmail });
        if (admin) {
            admin.password = adminPassword;
            admin.name = 'Demo Admin';
            admin.role = 'admin';
            admin.designation = 'Administrator';
            await admin.save();
            console.log(`Admin account updated: ${adminEmail}`);
        } else {
            admin = await User.create({
                name: 'Demo Admin',
                email: adminEmail,
                password: adminPassword,
                role: 'admin',
                designation: 'Administrator'
            });
            console.log(`Admin account created: ${adminEmail}`);
        }

        // 2. Create or Update Employee Account
        let employee = await User.findOne({ email: employeeEmail });
        if (employee) {
            employee.password = employeePassword;
            employee.name = 'Demo Employee';
            employee.role = 'employee';
            employee.designation = 'Developer';
            await employee.save();
            console.log(`Employee account updated: ${employeeEmail}`);
        } else {
            employee = await User.create({
                name: 'Demo Employee',
                email: employeeEmail,
                password: employeePassword,
                role: 'employee',
                designation: 'Developer'
            });
            console.log(`Employee account created: ${employeeEmail}`);
        }

        // 3. Create or Update Client Record and User
        let clientRecord = await Client.findOne({ email: clientEmail });
        if (!clientRecord) {
            clientRecord = await Client.create({
                name: 'Demo Client Representative',
                company: 'Demo Company Corp',
                phone: '9998887776',
                email: clientEmail,
                status: 'active',
                type: 'retainer',
                industry: 'Technology',
                city: 'New York'
            });
            console.log(`Client record created for: ${clientEmail}`);
        } else {
            clientRecord.name = 'Demo Client Representative';
            clientRecord.company = 'Demo Company Corp';
            clientRecord.phone = '9998887776';
            clientRecord.status = 'active';
            await clientRecord.save();
            console.log(`Client record updated for: ${clientEmail}`);
        }

        let clientUser = await User.findOne({ email: clientEmail });
        if (clientUser) {
            clientUser.password = clientPassword;
            clientUser.name = 'Demo Client User';
            clientUser.role = 'client';
            clientUser.clientId = clientRecord._id.toString();
            clientUser.designation = 'Client Representative';
            await clientUser.save();
            console.log(`Client user account updated: ${clientEmail}`);
        } else {
            clientUser = await User.create({
                name: 'Demo Client User',
                email: clientEmail,
                password: clientPassword,
                role: 'client',
                clientId: clientRecord._id.toString(),
                designation: 'Client Representative'
            });
            console.log(`Client user account created: ${clientEmail}`);
        }

        console.log('\n--- SUCCESS ---');
        console.log('Admin Credentials:');
        console.log(`  Email: ${adminEmail}`);
        console.log(`  Password: ${adminPassword}`);
        console.log('\nEmployee Credentials:');
        console.log(`  Email: ${employeeEmail}`);
        console.log(`  Password: ${employeePassword}`);
        console.log('\nClient Credentials:');
        console.log(`  Email: ${clientEmail}`);
        console.log(`  Password: ${clientPassword}`);
        console.log('----------------\n');

        process.exit(0);
    } catch (err) {
        console.error('Error creating demo accounts:', err);
        process.exit(1);
    }
};

createDemoAccounts();
