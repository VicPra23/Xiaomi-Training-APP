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
function _matrixText(cell) {
  let text = String(cell.userEnteredValue?.stringValue ?? cell.formattedValue ?? '').trim();
  return text;
}

fetch('https://docs.google.com/spreadsheets/d/1qNAt27vAvk5FAw4yga1imi1TEjtb11yKFf1tL2oXNhk/gviz/tq?tqx=out:json&gid=1806480274')
    .then(raw => {
        const jsonStr = raw.replace(/^[^{]*\(/, '').replace(/\);?$/, '');
        const table = JSON.parse(jsonStr).table;
        const rows = table.rows;

        const cell = (r, c) => {
            const row = rows[r];
            if (!row || !row.c || !row.c[c]) return {};
            const val = row.c[c];
            return {
                formattedValue: String(val.f ?? (val.v !== null && val.v !== undefined ? val.v : '')),
                userEnteredValue: { stringValue: String(val.v !== null && val.v !== undefined ? val.v : '') }
            };
        };
        const value = (r, c) => String(cell(r, c).formattedValue || '').trim();

        // In Google Sheets API, Row 1 of sheet is Row 0 of rows
        // Let's check headers
        const headers = rows.map((_, r) => /\bW\s*\d{1,2}\b/i.test(value(r, 1)) ? r : -1).filter(r => r >= 0);
        console.log('Headers:', headers);

        const days = {};
        const month = { month: 10, year: 2026 };
        const start = '2026-01-01', end = '2026-12-31';

        headers.forEach((header, h) => {
            const stop = headers[h + 1] ?? rows.length;
            const labels = [];
            for (let r = header + 3; r < stop; r++) {
                const label = value(r, 0);
                if (!label) continue;
                const alias = _matrixAlias(label);
                if (!accounts[alias]) console.warn('Unknown alias:', alias, 'from label:', label);
                else labels.push({ row: r, account: accounts[alias], label });
            }
            console.log(`\nHeader ${header} (${value(header, 1)}): Labels:`, labels.map(l => `${l.label}(r=${l.row})`));

            labels.forEach((label, i) => {
                let limit = labels[i + 1]?.row ?? stop;
                // In Code.gs line 2535:
                // else if (i === labels.length - 1) {
                //   while (limit > label.row + 1 && !Array.from({length:7},(_,c)=>value(limit-1,c+1)).some(Boolean)) limit--;
                // }

                for (let col = 1; col <= 7; col++) {
                    const dayNumber = Number(value(header + 2, col));
                    if (!Number.isInteger(dayNumber) || dayNumber < 1 || dayNumber > 31) continue;
                    const iso = month.year + '-' + String(month.month).padStart(2, '0') + '-' + String(dayNumber).padStart(2, '0');
                    if (iso < start || iso > end) continue;
                    const key = iso + ':' + label.account.user;
                    
                    const slots = [];
                    for (let r = label.row; r < limit; r++) {
                        slots.push({ row: r, col, cell: cell(r, col) });
                    }
                    const items = slots.filter(slot => _matrixText(slot.cell)).map(slot => ({ text: _matrixText(slot.cell) }));
                    if (items.length) {
                        days[key] = items;
                    }
                }
            });
        });

        console.log(`\nTotal days with items in Octubre: ${Object.keys(days).length}`);
        let totalItems = 0;
        Object.keys(days).sort().forEach(k => {
            totalItems += days[k].length;
            console.log(`  ${k}: ${days[k].map(it => it.text).join(' // ')}`);
        });
        console.log(`Total items in Octubre: ${totalItems}`);
    })
    .catch(err => console.error(err));
