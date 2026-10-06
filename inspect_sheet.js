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

fetch('https://docs.google.com/spreadsheets/d/1qNAt27vAvk5FAw4yga1imi1TEjtb11yKFf1tL2oXNhk/gviz/tq?tqx=out:csv&gid=1806480274')
    .then(csv => {
        const lines = csv.split('\n');
        lines.forEach((l, idx) => {
            const rawCol0 = l.split(',')[0] || '';
            const col0 = rawCol0.replace(/"/g, '').trim();
            if (col0) {
                console.log(`Row ${idx + 1}: [${col0}]`);
            }
        });
    })
    .catch(err => console.error(err));
