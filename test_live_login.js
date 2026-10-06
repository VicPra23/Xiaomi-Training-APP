const https = require('https');

const BASE_URL = 'https://script.google.com/macros/s/AKfycbynyrqF9OKToO0MSaQbhS8VIaiBz_RnMYoDTWXqSAkNx9bJ5nX8_6OoK2-AQZ3P0uovug/exec';

function request(url, options = {}) {
    return new Promise((resolve, reject) => {
        const req = https.request(url, options, (res) => {
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                return request(res.headers.location, { method: 'GET' }).then(resolve).catch(reject);
            }
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(data));
        });
        req.on('error', reject);
        if (options.body) req.write(options.body);
        req.end();
    });
}

async function testLive() {
    // 1. Try to login as Training Coordinator (Victor) or David or TM
    // Wait, what passwords exist in USUARIOS?
    // Let's see if we can read USUARIOS sheet directly or test login!
    console.log('Testing login...');
    // In Google Sheets USUARIOS sheet:
    // Let's check USUARIOS sheet via gviz CSV!
    const usersCsv = await request('https://docs.google.com/spreadsheets/d/1K0vGOPwteG6ZjNVT7cDaEwIeb3ONcjmNec3-FGlH10g/gviz/tq?tqx=out:csv&sheet=USUARIOS');
    console.log('Users sheet CSV head:');
    const uLines = usersCsv.split('\n').slice(0, 10);
    uLines.forEach(l => console.log('  ' + l.slice(0, 50)));
}

testLive().catch(console.error);
