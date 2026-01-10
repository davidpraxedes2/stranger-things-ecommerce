const fetch = require('node-fetch');

const BASE_URL = 'https://netflix.strangeroficial.shop';
// const BASE_URL = 'https://strangerthingslojabr-n567wlx8v-david-silvas-projects-a1e86f73.vercel.app'; // Alternate

async function triggerRemoteSeed() {
    console.log(`🔌 Connecting to ${BASE_URL}...`);

    // 1. Login
    console.log('🔑 Logging in as admin...');
    const loginRes = await fetch(`${BASE_URL}/api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'admin', password: 'admin123' })
    });

    if (!loginRes.ok) {
        console.error(`❌ Login failed: ${loginRes.status} ${loginRes.statusText}`);
        const text = await loginRes.text();
        console.error('Response:', text);
        return;
    }

    const loginData = await loginRes.json();
    const token = loginData.token;

    if (!token) {
        console.error('❌ No token received in login response.');
        return;
    }

    console.log('✅ Login successful! Token received.');

    // 2. Trigger Seed
    console.log('🚀 Triggering Funko Seed (this may take a minute)...');

    // Set a long timeout for this request if possible, or just wait
    // node-fetch default timeout is usually okay, but Vercel functions have limits.
    // The manual seed logic fetches 4 pages. It might take ~10-20 seconds.

    const seedRes = await fetch(`${BASE_URL}/api/admin/seed-funkos`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        }
    });

    if (!seedRes.ok) {
        console.error(`❌ Seed request failed: ${seedRes.status} ${seedRes.statusText}`);
        const text = await seedRes.text();
        console.error('Response:', text);

        if (seedRes.status === 504) {
            console.log('⚠️  Gateway Timeout. The seeding might still be running in the background or was cut off.');
            console.log('    Check the "Funkos" collection on the database/site in a few minutes.');
        }
        return;
    }

    const seedData = await seedRes.json();
    console.log('✅ Seed Response:', seedData);
    console.log('🎉 Funko Seeding Triggered Successfully!');
}

triggerRemoteSeed();
