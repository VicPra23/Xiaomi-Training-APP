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

fetch('https://docs.google.com/spreadsheets/d/1qNAt27vAvk5FAw4yga1imi1TEjtb11yKFf1tL2oXNhk/edit?usp=sharing')
    .then(html => {
        const months = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
        months.forEach(m => {
            const r = new RegExp(m + '[^"\\\\,\\]\\[]*', 'gi');
            const found = html.match(r);
            if (found) console.log(`Found month ${m}:`, Array.from(new Set(found)));
        });
    })
    .catch(console.error);
