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

const MATRIX_CALENDAR = {
  accounts: { COORD: 'Victor', DAVID: 'David', TL: 'Francisco Javier', TM: 'Tomás', TB: 'Carles', TS: 'Fabio', TN: 'Hamza' }
};

const appUsers = [
  { user: "TB", name: "Carles" },
  { user: "Training Creator", name: "David" },
  { user: "TS", name: "Fabio" },
  { user: "TL", name: "Francisco Javier" },
  { user: "TN", name: "Hamza" },
  { user: "Training Manager", name: "Javier" },
  { user: "TM", name: "Tomás" },
  { user: "Training Coordinator", name: "Victor" }
];

function _matrixNorm(value) { return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase(); }
function _matrixAlias(value) { return String(value || '').trim().toUpperCase().replace(/^(TL|TM|TB|TS|TN)1$/, '$1'); }

function _matrixAccounts() {
  const map = {};
  Object.keys(MATRIX_CALENDAR.accounts).forEach(alias => {
    const name = _matrixNorm(MATRIX_CALENDAR.accounts[alias]);
    const candidates = appUsers.filter(u => _matrixNorm(u.user) === name || _matrixNorm(u.name) === name);
    if (candidates.length !== 1) console.error('Account match error for', alias, name);
    map[alias] = candidates[0];
  });
  return map;
}

// Fetch gviz json to get cell table
fetch('https://docs.google.com/spreadsheets/d/1qNAt27vAvk5FAw4yga1imi1TEjtb11yKFf1tL2oXNhk/gviz/tq?tqx=out:json&gid=1806480274')
    .then(text => {
        // gviz json starts with /*O_o*/\ngoogle.visualization.Query.setResponse(...);
        const match = text.match(/google\.visualization\.Query\.setResponse\(([\s\S]+)\);/);
        if (!match) {
            console.error('No match for gviz json');
            return;
        }
        const json = JSON.parse(match[1]);
        const table = json.table;
        console.log(`Cols: ${table.cols.length}, Rows: ${table.rows.length}`);
        
        // Build rows format matching sheets API rowData
        const rowData = table.rows.map(r => ({
            values: r.c ? r.c.map(c => ({
                formattedValue: c ? (c.f !== undefined ? String(c.f) : (c.v !== undefined ? String(c.v) : '')) : '',
                userEnteredValue: c && c.v !== undefined ? { stringValue: String(c.v) } : undefined
            })) : []
        }));

        const accounts = _matrixAccounts();
        const sheet = {
            properties: { title: 'Octubre W40 - W44', sheetId: 1806480274 },
            merges: [],
            data: [{ rowData: rowData }]
        };

        // Run current Code.gs _matrixIndex
        const rows = sheet.data[0].rowData;
        const cell = (r,c) => rows[r]?.values?.[c] || {};
        const value = (r,c) => String(cell(r,c).formattedValue ?? cell(r,c).userEnteredValue?.stringValue ?? '').trim();
        const headers = rows.map((_,r) => /\bW\s*\d{1,2}\b/i.test(value(r,1)) ? r : -1).filter(r => r >= 0);
        console.log('Headers found at rows:', headers);

        const days = {};
        const month = { month: 10, year: 2026 };
        const start = '2026-10-01', end = '2026-10-31';

        headers.forEach((header, h) => {
            const stop = headers[h + 1] ?? rows.length;
            console.log(`\n--- Week Header ${value(header, 1)} at row ${header} (stop: ${stop}) ---`);
            const labels = [];
            for (let r = header + 3; r < stop; r++) {
                const label = value(r,0);
                if (!label) continue;
                const alias = _matrixAlias(label);
                if (!accounts[alias]) console.log('Unknown trainer at row', r, ':', label);
                else labels.push({row:r, label:label, alias:alias, account:accounts[alias]});
            }
            console.log('Labels found:', labels.map(l => `${l.label} (r:${l.row}) -> ${l.account.user}`));

            // Check what dayNumber gives:
            for (let col = 1; col <= 7; col++) {
                const dRow = header + 2;
                const dn = value(dRow, col);
                console.log(`  Col ${col}: row ${dRow} has value "${dn}"`);
            }

            labels.forEach((label,i) => {
                let limit = labels[i+1]?.row ?? stop;
                for (let col = 1; col <= 7; col++) {
                    const dayNumber = Number(value(header + 2,col));
                    if (!Number.isInteger(dayNumber) || dayNumber < 1 || dayNumber > 31) continue;
                    const iso = month.year + '-' + String(month.month).padStart(2,'0') + '-' + String(dayNumber).padStart(2,'0');
                    if (iso < start || iso > end) continue;
                    const key = iso + ':' + label.account.user;
                    if (days[key]) {
                        console.error('DUPLICATE KEY:', key);
                    }
                    const slots = [];
                    for (let r = label.row; r < limit; r++) {
                        slots.push({ r, col, val: value(r, col) });
                    }
                    const items = slots.filter(s => s.val).map(s => s.val);
                    days[key] = items;
                }
            });
        });

        const allDates = new Set();
        let totalItems = 0;
        Object.entries(days).forEach(([k, items]) => {
            const [d, u] = k.split(':');
            allDates.add(d);
            totalItems += items.length;
            if (items.length) {
                console.log(`${k}: ${items.join(' | ')}`);
            }
        });
        console.log(`\nTotal dates in days: ${allDates.size}`);
        console.log(`Total items extracted: ${totalItems}`);
    })
    .catch(console.error);
