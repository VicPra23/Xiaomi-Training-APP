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

function parseCSVLine(line) {
    const result = [];
    let cur = '', inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const c = line[i];
        if (c === '"') {
            if (inQuotes && line[i+1] === '"') { cur += '"'; i++; }
            else { inQuotes = !inQuotes; }
        } else if (c === ',' && !inQuotes) {
            result.push(cur.trim());
            cur = '';
        } else {
            cur += c;
        }
    }
    result.push(cur.trim());
    return result;
}

const accounts = {
  COORD: { user: 'Training Coordinator', name: 'Victor' },
  DAVID: { user: 'Training Creator', name: 'David' },
  TL: { user: 'TL', name: 'Francisco Javier' },
  TM: { user: 'TM', name: 'Tomás' },
  TB: { user: 'TB', name: 'Carles' },
  TS: { user: 'TS', name: 'Fabio' },
  TN: { user: 'TN', name: 'Hamza' }
};

function _matrixAlias(value) { return String(value || '').trim().toUpperCase().replace(/^(TL|TM|TB|TS|TN)1$/, '$1'); }

fetch('https://docs.google.com/spreadsheets/d/1qNAt27vAvk5FAw4yga1imi1TEjtb11yKFf1tL2oXNhk/gviz/tq?tqx=out:csv&gid=1806480274')
    .then(csv => {
        const rows = csv.split('\n').filter(Boolean).map(parseCSVLine);
        const value = (r, c) => (rows[r]?.[c] || '').trim();

        const headers = rows.map((_, r) => /\bW\s*\d{1,2}\b/i.test(value(r, 1)) ? r : -1).filter(r => r >= 0);
        console.log('Headers found at rows:', headers.map(r => `Row ${r + 1} (${value(r, 1)})`));

        headers.forEach((header, h) => {
            const stop = headers[h + 1] ?? rows.length;
            console.log(`\n==================\nHeader: Row ${header + 1} (${value(header, 1)}) -> Stop at Row ${stop}`);
            
            // Check rows around header
            for (let r = header; r <= header + 3; r++) {
                console.log(`  Row ${r + 1}: Col0="${value(r,0)}", Col1="${value(r,1)}", Col2="${value(r,2)}", Col3="${value(r,3)}", Col4="${value(r,4)}", Col5="${value(r,5)}", Col6="${value(r,6)}", Col7="${value(r,7)}"`);
            }

            const labels = [];
            for (let r = header + 3; r < stop; r++) {
                const label = value(r, 0);
                if (!label) continue;
                const alias = _matrixAlias(label);
                if (!accounts[alias]) console.warn(`  UNKNOWN_TRAINER at Row ${r + 1}: "${label}" (alias: "${alias}")`);
                else labels.push({ row: r, alias, account: accounts[alias], label });
            }
            console.log(`  Trainers found in this block:`, labels.map(l => `${l.label} (Row ${l.row + 1})`));
        });
    })
    .catch(err => console.error(err));
