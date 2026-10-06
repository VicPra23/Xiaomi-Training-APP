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
    const cells = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const c = line[i];
        if (c === '"') {
            if (inQuotes && line[i+1] === '"') { cur += '"'; i++; }
            else inQuotes = !inQuotes;
        } else if (c === ',' && !inQuotes) {
            cells.push(cur.trim());
            cur = '';
        } else {
            cur += c;
        }
    }
    cells.push(cur.trim());
    return cells;
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
    map[alias] = candidates[0];
  });
  return map;
}

const accounts = _matrixAccounts();

fetch('https://docs.google.com/spreadsheets/d/1qNAt27vAvk5FAw4yga1imi1TEjtb11yKFf1tL2oXNhk/gviz/tq?tqx=out:csv&gid=1806480274')
    .then(csv => {
        const lines = csv.split('\n');
        const rows = lines.map(parseCSVLine);
        const value = (r, c) => (rows[r] && rows[r][c] !== undefined) ? rows[r][c] : '';
        const headers = rows.map((_, r) => /\bW\s*\d{1,2}\b/i.test(value(r, 1)) ? r : -1).filter(r => r >= 0);

        console.log('Headers in October:', headers.map(h => `Row ${h+1}: ${value(h,1)}`));

        headers.forEach((header, h) => {
            const stop = headers[h + 1] ?? rows.length;
            const weekTitle = value(header, 1);
            console.log(`\nWeek ${weekTitle} (rows ${header+1}..${stop}):`);
            
            // Check day numbers at header + 2
            const daysAtPlus2 = [];
            for (let c = 1; c <= 7; c++) {
                const dn = Number(value(header + 2, c));
                if (Number.isInteger(dn) && dn >= 1 && dn <= 31) daysAtPlus2.push({ col: c, day: dn });
            }
            console.log(`  Days at header+2 (row ${header+3}):`, daysAtPlus2.map(d => `C${d.col}:${d.day}`).join(', ') || 'NONE');

            // Check day numbers at header + 1
            const daysAtPlus1 = [];
            for (let c = 1; c <= 7; c++) {
                const dn = Number(value(header + 1, c));
                if (Number.isInteger(dn) && dn >= 1 && dn <= 31) daysAtPlus1.push({ col: c, day: dn });
            }
            console.log(`  Days at header+1 (row ${header+2}):`, daysAtPlus1.map(d => `C${d.col}:${d.day}`).join(', ') || 'NONE');

            // Check trainers at r = header + 3..stop
            const labels = [];
            for (let r = header + 3; r < stop; r++) {
                const l = value(r, 0);
                if (l && accounts[_matrixAlias(l)]) labels.push(`Row ${r+1}:${l}`);
            }
            console.log(`  Trainers found (header+3..stop):`, labels.join(', '));
        });
    });
