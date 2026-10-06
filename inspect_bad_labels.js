const https = require('https');

function fetch(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                return fetch(res.headers.location).then(resolve).catch(reject);
            }
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(data));
        }).on('error', reject);
    });
}

async function inspect(gid, name, badLabel) {
    const url = `https://docs.google.com/spreadsheets/d/1qNAt27vAvk5FAw4yga1imi1TEjtb11yKFf1tL2oXNhk/gviz/tq?tqx=out:csv&gid=${gid}`;
    const csv = await fetch(url);
    const lines = csv.split('\n');
    lines.forEach((l, idx) => {
        const col0 = l.split(',')[0].replace(/"/g, '').trim();
        if (col0.toLowerCase() === badLabel.toLowerCase()) {
            console.log(`[${name}] Row ${idx + 1}: ${l}`);
        }
    });
}

async function run() {
    await inspect('1900489345', 'Abril', 'cta');
    await inspect('186182084', 'Julio', '25');
    await inspect('884494823', 'Agosto', '0');
}

run();
