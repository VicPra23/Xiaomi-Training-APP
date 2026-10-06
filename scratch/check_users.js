const https = require('https');

function fetch(url, options = {}) {
    return new Promise((resolve, reject) => {
        const req = https.request(url, options, (res) => {
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                return fetch(res.headers.location, { method: 'GET' }).then(resolve).catch(reject);
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

async function run() {
    const res = await fetch('https://script.google.com/macros/s/AKfycbynyrqF9OKToO0MSaQbhS8VIaiBz_RnMYoDTWXqSAkNx9bJ5nX8_6OoK2-AQZ3P0uovug/exec?action=getLoginUsers');
    console.log('Login users response:', res);
}

run().catch(console.error);
