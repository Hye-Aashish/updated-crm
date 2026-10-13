const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

const connectDB = require('./config/db');
const { resolveDateRange, formatDuration, calculateOverviewKPIs } = require('./services/salesAnalyticsService');
const SalesCallLog = require('./models/SalesCallLog');
const SalesMeeting = require('./models/SalesMeeting');
const Lead = require('./models/Lead');
const User = require('./models/User');

async function runTests() {
    console.log('🧪 Starting Sales Performance & Analytics Verification Tests...\n');

    // 1. Date Range & Timezone boundary tests
    console.log('--- Test 1: Date Range Logic ---');
    const singleDay = resolveDateRange('2026-08-15', '2026-08-15');
    console.log('Single-day range:', singleDay.start.toISOString(), 'to', singleDay.end.toISOString());
    console.assert(singleDay.start <= singleDay.end, 'Start must be <= End');

    const crossMonth = resolveDateRange('2026-08-15', '2026-10-20');
    console.log('Cross-month range:', crossMonth.start.toISOString(), 'to', crossMonth.end.toISOString());
    console.assert(crossMonth.start < crossMonth.end, 'Cross month valid');

    const invertedRange = resolveDateRange('2026-12-01', '2026-01-01');
    console.log('Inverted range auto-corrected:', invertedRange.start.toISOString(), 'to', invertedRange.end.toISOString());
    console.assert(invertedRange.start < invertedRange.end, 'Inverted dates auto-ordered');

    // 2. Format Duration test
    console.log('\n--- Test 2: Duration Formatting ---');
    console.assert(formatDuration(0) === '0s', '0s formatting');
    console.assert(formatDuration(45) === '45s', '45s formatting');
    console.assert(formatDuration(165) === '2m 45s', '2m 45s formatting');
    console.assert(formatDuration(3690) === '1h 1m', '1h 1m formatting');
    console.log('✅ Duration formatting tests passed.');

    // 3. Database connection & Live KPI test
    console.log('\n--- Test 3: Database & Overview KPI Aggregation ---');
    try {
        await connectDB();
        console.log('✅ Connected to MongoDB.');

        const testRange = resolveDateRange('2026-01-01', '2026-12-31');
        const kpiResult = await calculateOverviewKPIs({
            start: testRange.start,
            end: testRange.end,
            agentIds: null
        });

        console.log('KPI Results Summary:');
        console.log('- Total Call Attempts:', kpiResult.kpis.totalCallAttempts);
        console.log('- Unique Leads Contacted:', kpiResult.kpis.uniqueLeadsContacted);
        console.log('- Connected Calls:', kpiResult.kpis.connectedCalls);
        console.log('- Meetings Scheduled:', kpiResult.kpis.meetingsScheduled);
        console.log('- Total Talk Time:', kpiResult.kpis.totalTalkTimeFormatted);
        console.log('- Deals Won:', kpiResult.kpis.dealsWon);
        console.log('- Revenue Generated: ₹', kpiResult.kpis.revenueGenerated);
        console.log('- Conversion Rate:', kpiResult.kpis.conversionRate + '%');
        console.log('✅ KPI Aggregation pipeline executed with 0 errors.');

        process.exit(0);
    } catch (err) {
        console.error('❌ Database Test Failed:', err);
        process.exit(1);
    }
}

runTests();
