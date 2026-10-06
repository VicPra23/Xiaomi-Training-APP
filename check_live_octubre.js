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
        const lines = csv.split('\n').filter(Boolean);
        console.log(`Total non-empty lines in Octubre sheet: ${lines.length}`);
        let filledCells = 0;
        lines.forEach(l => {
            const cells = l.split(',').map(c => c.replace(/"/g, '').trim()).filter(Boolean);
            filledCells += cells.length;
        });
        console.log(`Total filled cells: ${filledCells}`);
        lines.slice(0, 10).forEach((l, i) => console.log(`L${i+1}:`, l));
    })
    .catch(err => console.error(err));
