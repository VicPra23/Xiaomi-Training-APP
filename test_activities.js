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

        headers.forEach((header, h) => {
            const stop = headers[h + 1] ?? rows.length;
            const labels = [];
            for (let r = header + 3; r < stop; r++) {
                const label = value(r, 0);
                if (!label) continue;
                const alias = _matrixAlias(label);
                if (accounts[alias]) labels.push({ row: r, account: accounts[alias], label });
            }

            console.log(`\n=== Week Header Row ${header + 1} (${value(header, 1)}) ===`);

            labels.forEach((label, i) => {
                let limit = labels[i + 1]?.row ?? stop;
                while (limit > label.row + 1 && !Array.from({ length: 7 }, (_, c) => value(limit - 1, c + 1)).some(Boolean)) limit--;

                // Try finding day row
                let dayRow = header + 2;
                if (!Array.from({ length: 7 }, (_, c) => Number(value(dayRow, c + 1))).some(n => n > 0)) {
                    dayRow = header + 1;
                }

                for (let col = 1; col <= 7; col++) {
                    const dayNumber = Number(value(dayRow, col));
                    if (!Number.isInteger(dayNumber) || dayNumber < 1 || dayNumber > 31) continue;
                    const items = [];
                    for (let r = label.row; r < limit; r++) {
                        const val = value(r, col);
                        if (val) items.push(val);
                    }
                    if (items.length) {
                        console.log(`  Day ${dayNumber} | Trainer: ${label.account.user} (${label.account.name}): [${items.join(' ; ')}]`);
                    }
                }
            });
        });
    })
    .catch(err => console.error(err));
