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

const sheets = [
  { gid: '278653691', title: 'Enero W1 - W5', month: 1, year: 2026 },
  { gid: '2117553683', title: 'Febrero W5-W9', month: 2, year: 2026 },
  { gid: '1925823593', title: 'Marzo W9-W14', month: 3, year: 2026 },
  { gid: '1900489345', title: 'Abril W14 - W18', month: 4, year: 2026 },
  { gid: '1429829060', title: 'Mayo W18 - W22', month: 5, year: 2026 },
  { gid: '1244638454', title: 'Junio W23 - W27', month: 6, year: 2026 },
  { gid: '186182084', title: 'Julio W27 - W31', month: 7, year: 2026 },
  { gid: '884494823', title: 'Agosto W31 - W36', month: 8, year: 2026 },
  { gid: '1825868107', title: 'Septiembre W36 - W40', month: 9, year: 2026 },
  { gid: '1806480274', title: 'Octubre W40 - W44', month: 10, year: 2026 },
  { gid: '966997057', title: 'Noviembre W44 - W49', month: 11, year: 2026 },
  { gid: '1101996697', title: 'Diciembre W49 - W1', month: 12, year: 2026 },
  { gid: '919646841', title: 'Enero 2027 W1 - W5', month: 1, year: 2027 }
];

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

async function testAll() {
    const allDays = {};
    const errors = [];

    for (const sheetMeta of sheets) {
        if (sheetMeta.year !== 2026) continue;
        const url = `https://docs.google.com/spreadsheets/d/1qNAt27vAvk5FAw4yga1imi1TEjtb11yKFf1tL2oXNhk/gviz/tq?tqx=out:csv&gid=${sheetMeta.gid}`;
        const csv = await fetch(url);
        const lines = csv.split('\n');
        const rows = lines.map(parseCSVLine);
        const value = (r, c) => (rows[r] && rows[r][c] !== undefined) ? rows[r][c] : '';

        // Current headers detection
        const headers = rows.map((_, r) => /\bW\s*\d{1,2}\b/i.test(value(r, 1)) ? r : -1).filter(r => r >= 0);

        headers.forEach((header, h) => {
            const stop = headers[h + 1] ?? rows.length;
            const weekTitle = value(header, 1);

            // Check labels
            const labels = [];
            for (let r = header + 3; r < stop; r++) {
                const label = value(r, 0);
                if (!label) continue;
                const alias = _matrixAlias(label);
                if (!accounts[alias]) {
                    errors.push(`UNKNOWN_TRAINER in ${sheetMeta.title} (${weekTitle}, row ${r+1}): "${label}"`);
                } else {
                    labels.push({ row: r, account: accounts[alias], label: label });
                }
            }

            // Check day numbers with current Code.gs logic: value(header + 2, col)
            const daysFound = [];
            for (let col = 1; col <= 7; col++) {
                const dayNumber = Number(value(header + 2, col));
                if (Number.isInteger(dayNumber) && dayNumber >= 1 && dayNumber <= 31) {
                    daysFound.push({ col, dayNumber });
                }
            }
            if (daysFound.length === 0) {
                errors.push(`ZERO_DAYS found in ${sheetMeta.title} (${weekTitle}) at header+2 (row ${header + 3})! Contents: ${Array.from({length:7}, (_,c)=>value(header+2, c+1)).join(',')}`);
            }

            // Check if duplicate keys occur
            labels.forEach((label) => {
                daysFound.forEach(({ dayNumber }) => {
                    const iso = `2026-${String(sheetMeta.month).padStart(2,'0')}-${String(dayNumber).padStart(2,'0')}`;
                    const key = `${iso}:${label.account.user}`;
                    if (allDays[key]) {
                        errors.push(`AMBIGUOUS_CELL: Duplicate key ${key} in ${sheetMeta.title} (already in ${allDays[key]})`);
                    } else {
                        allDays[key] = sheetMeta.title;
                    }
                });
            });
        });
    }

    console.log(`\n=== TEST FINISHED ===`);
    console.log(`Total days indexed: ${Object.keys(allDays).length}`);
    console.log(`Errors encountered (${errors.length}):`);
    errors.forEach(e => console.log('  ❌ ' + e));
}

testAll().catch(console.error);
