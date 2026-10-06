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

const accounts = {
  COORD: { user: 'Training Coordinator', name: 'Victor' },
  DAVID: { user: 'Training Creator', name: 'David' },
  TL: { user: 'TL', name: 'Francisco Javier' },
  TM: { user: 'TM', name: 'Tomás' },
  TB: { user: 'TB', name: 'Carles' },
  TS: { user: 'TS', name: 'Fabio' },
  TN: { user: 'TN', name: 'Hamza' }
};

function _matrixNorm(value) { return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase(); }
function _matrixAlias(value) { return String(value || '').trim().toUpperCase().replace(/^(TL|TM|TB|TS|TN)1$/, '$1'); }

// Fetch Octubre CSV
fetch('https://docs.google.com/spreadsheets/d/1qNAt27vAvk5FAw4yga1imi1TEjtb11yKFf1tL2oXNhk/gviz/tq?tqx=out:csv&gid=1806480274')
    .then(csv => {
        // Parse CSV lines into rows of cells
        const rows = csv.split('\n').map(line => {
            // simple csv parse
            const matches = line.match(/(".*?"|[^",\r\n]*)(?=,|\r?\n|$)/g) || [];
            return matches.map(m => m.replace(/^"|"$/g, '').trim());
        });

        const cell = (r, c) => ({ formattedValue: rows[r]?.[c] || '' });
        const value = (r, c) => (rows[r]?.[c] || '').trim();

        const headers = rows.map((_, r) => /\bW\s*\d{1,2}\b/i.test(value(r, 1)) ? r : -1).filter(r => r >= 0);
        console.log('Headers found at rows:', headers.map(r => `Row ${r + 1} (${value(r, 1)})`));

        const month = { month: 10, year: 2026 };
        const start = '2026-01-01', end = '2026-12-31';
        const days = {};

        headers.forEach((header, h) => {
            const stop = headers[h + 1] ?? rows.length;
            const labels = [];
            for (let r = header + 3; r < stop; r++) {
                const label = value(r, 0);
                if (!label) continue;
                const alias = _matrixAlias(label);
                if (!accounts[alias]) console.warn('Unknown alias:', alias, 'from label:', label, 'at row', r + 1);
                else labels.push({ row: r, account: accounts[alias], label });
            }
            console.log(`\nWeek header at row ${header + 1} (${value(header, 1)}): found trainers:`, labels.map(l => `${l.label} (row ${l.row + 1})`));

            labels.forEach((label, i) => {
                let limit = labels[i + 1]?.row ?? stop;
                while (limit > label.row + 1 && !Array.from({ length: 7 }, (_, c) => value(limit - 1, c + 1)).some(Boolean)) limit--;

                // Look at which row has day numbers:
                // Let's check header + 1 and header + 2
                console.log(`  Trainer ${label.account.name}: rows ${label.row + 1} to ${limit}`);

                for (let col = 1; col <= 7; col++) {
                    // Test dayNumber from header+1 and header+2:
                    const d1 = value(header + 1, col);
                    const d2 = value(header + 2, col);
                    // In Code.gs: const dayNumber = Number(value(header + 2,col));
                    const dayNumber = Number(d2);
                    if (!Number.isInteger(dayNumber) || dayNumber < 1 || dayNumber > 31) continue;

                    const iso = month.year + '-' + String(month.month).padStart(2, '0') + '-' + String(dayNumber).padStart(2, '0');
                    const items = [];
                    for (let r = label.row; r < limit; r++) {
                        const val = value(r, col);
                        if (val) items.push(val);
                    }
                    if (items.length) {
                        console.log(`    Date ${iso} (col ${col}) for ${label.account.name}: [${items.join(' | ')}]`);
                    }
                }
            });
        });
    })
    .catch(err => console.error(err));
