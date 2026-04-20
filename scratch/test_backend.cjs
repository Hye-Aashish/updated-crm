const axios = require('axios');
const API_URL = 'http://localhost:5000/api';

async function testEndpoints() {
    console.log('Testing Backend Endpoints...');
    
    // First login to get a token
    try {
        const loginRes = await axios.post(`${API_URL}/auth/login`, {
            email: 'owner@example.com',
            password: 'password'
        });
        const token = loginRes.data.token;
        console.log('✅ Login Successful');
        
        const config = { headers: { Authorization: `Bearer ${token}` } };
        
        const endpoints = [
            '/settings',
            '/leads',
            '/projects',
            '/invoices',
            '/tasks',
            '/users',
            '/time-entries',
            '/tickets',
            '/amc/stats/summary',
            '/domains/stats/summary',
            '/expiry-alerts'
        ];
        
        for (const ep of endpoints) {
            try {
                const res = await axios.get(`${API_URL}${ep}`, config);
                console.log(`✅ ${ep}: ${res.status} (${Array.isArray(res.data) ? res.data.length + ' items' : 'Object'})`);
            } catch (err) {
                console.log(`❌ ${ep}: ${err.response?.status} - ${err.response?.data?.message || err.message}`);
            }
        }
    } catch (err) {
        console.log(`❌ Login Failed: ${err.response?.status} - ${err.response?.data?.message || err.message}`);
    }
}

testEndpoints();
