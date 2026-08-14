const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const Lead = require('./models/Lead');
const { analyzeLeadPriorityAndExtractReminder } = require('./services/aiService');

async function runTest() {
    const uri = process.env.MONGO_URI;
    if (!uri) {
        console.error('MONGO_URI is missing!');
        process.exit(1);
    }
    
    console.log('Connecting to MongoDB...');
    await mongoose.connect(uri);
    console.log('Connected!');

    // 1. Create a dummy test lead
    console.log('\n--- Creating Test Lead with 0 activities ---');
    const lead = new Lead({
        name: 'John Doe Test',
        company: 'Test Priority Inc',
        stage: 'new',
        value: 120000,
        activities: []
    });

    // Test 1: No activities (Should be Red)
    console.log('Running analysis on 0 activities...');
    let result = await analyzeLeadPriorityAndExtractReminder(lead.activities);
    console.log('Result:', result);
    lead.aiPriority = result.priority;
    lead.aiPriorityReason = result.reason;

    // Test 2: General note added (Should be Yellow)
    console.log('\n--- Adding note: "Sent email introduction, waiting for reply." ---');
    lead.activities.push({
        content: 'Sent email introduction, waiting for reply.',
        type: 'note',
        createdAt: new Date()
    });
    result = await analyzeLeadPriorityAndExtractReminder(lead.activities);
    console.log('Result:', result);
    lead.aiPriority = result.priority;
    lead.aiPriorityReason = result.reason;

    // Test 3: Reminder scheduled note added (Should be Green)
    console.log('\n--- Adding note: "Spoke on call. They confirmed and said let\'s talk tomorrow at 10 AM." ---');
    lead.activities.push({
        content: "Spoke on call. They confirmed and said let's talk tomorrow at 10 AM.",
        type: 'note',
        createdAt: new Date()
    });
    
    result = await analyzeLeadPriorityAndExtractReminder(lead.activities, new Date().toISOString());
    console.log('Result:', result);
    lead.aiPriority = result.priority;
    lead.aiPriorityReason = result.reason;
    if (result.extractedReminderDate) {
        lead.reminder = {
            date: new Date(result.extractedReminderDate),
            tone: 'default',
            completed: false,
            sentReminders: []
        };
        console.log('Auto-Scheduled Reminder Date:', lead.reminder.date.toString());
    }

    // Save lead
    await lead.save();
    console.log('\nSaved test lead successfully with ID:', lead._id);

    // Clean up
    console.log('Cleaning up test lead...');
    await Lead.findByIdAndDelete(lead._id);
    console.log('Cleaned up!');
    
    mongoose.disconnect();
    console.log('\nTest completed successfully!');
}

runTest().catch(err => {
    console.error('Test failed with error:', err);
    if (mongoose.connection) {
        mongoose.disconnect();
    }
});
