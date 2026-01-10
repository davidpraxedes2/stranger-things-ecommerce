const http = require('http');

const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/analytics/heartbeat',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json'
    }
};

const payload = JSON.stringify({
    sessionId: 'test_session_' + Date.now(),
    page: '/test-debug',
    title: 'Debug Page',
    action: 'view',
    location: null,
    device: 'Desktop',
    browser: 'TestBot'
});

console.log('🔍 Testing Heartbeat...');
const req = http.request(options, (res) => {
    console.log(`STATUS: ${res.statusCode}`);
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
        console.log('BODY:', data);
    });
});

req.on('error', (e) => {
    console.error(`problem with request: ${e.message}`);
});

req.write(payload);
req.end();

// Test Products
setTimeout(() => {
    console.log('\n🔍 Testing Products...');
    http.get('http://localhost:3000/api/products', (res) => {
        console.log(`STATUS: ${res.statusCode}`);
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
            console.log('BODY LENGTH:', data.length);
            if (res.statusCode !== 200) console.log('BODY:', data);
        });
    });
}, 2000);
