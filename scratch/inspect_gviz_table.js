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
        console.log(`Cols: ${table.cols.length}, Rows: ${table.rows.length}`);

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

        const rows = table.rows;
        const headers = rows.map((_, r) => /\bW\s*\d{1,2}\b/i.test(value(r, 1)) ? r : -1).filter(r => r >= 0);
        console.log('Headers:', headers);

        headers.forEach(h => {
            console.log(`Row ${h}: "${value(h, 1)}"`);
            console.log(`  Row ${h+1}: [${Array.from({length:8}, (_,c)=>value(h+1, c)).join(', ')}]`);
            console.log(`  Row ${h+2}: [${Array.from({length:8}, (_,c)=>value(h+2, c)).join(', ')}]`);
            console.log(`  Row ${h+3}: [${Array.from({length:8}, (_,c)=>value(h+3, c)).join(', ')}]`);
        });
    })
    .catch(err => console.error(err));
