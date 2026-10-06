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

fetch('https://docs.google.com/spreadsheets/d/1qNAt27vAvk5FAw4yga1imi1TEjtb11yKFf1tL2oXNhk/gviz/tq?tqx=out:json&gid=1806480274')
    .then(raw => {
        const jsonStr = raw.replace(/^[^{]*\(/, '').replace(/\);?$/, '');
        const data = JSON.parse(jsonStr);
        const table = data.table;

        const cell = (r, c) => {
            const row = table.rows[r];
            if (!row || !row.c || !row.c[c]) return {};
            const val = row.c[c];
            return {
                formattedValue: String(val.f ?? (val.v !== null && val.v !== undefined ? val.v : '')),
                userEnteredValue: { stringValue: String(val.v !== null && val.v !== undefined ? val.v : '') }
            };
        };

        const value = (r, c) => String(cell(r, c).formattedValue || '').trim();

        console.log('=== W41 Rows 21 to 39 ===');
        for (let r = 21; r < 39; r++) {
            const rowValues = Array.from({length:8}, (_,c)=>value(r, c));
            console.log(`Row ${r}: Col0="${rowValues[0]}" | Col1="${rowValues[1]}" | Col2="${rowValues[2]}" | Col3="${rowValues[3]}" | Col4="${rowValues[4]}" | Col5="${rowValues[5]}"`);
        }
    })
    .catch(err => console.error(err));
