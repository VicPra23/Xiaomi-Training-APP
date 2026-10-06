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

async function run() {
    const allDays = {};
    let totalItems = 0;
    const errors = [];

    for (const sheetMeta of sheets) {
        if (sheetMeta.year !== 2026) continue;
        const url = `https://docs.google.com/spreadsheets/d/1qNAt27vAvk5FAw4yga1imi1TEjtb11yKFf1tL2oXNhk/gviz/tq?tqx=out:csv&gid=${sheetMeta.gid}`;
        const csv = await fetch(url);
        const lines = csv.split('\n');
        const rows = lines.map(parseCSVLine);
        const value = (r, c) => (rows[r] && rows[r][c] !== undefined) ? rows[r][c] : '';

        // Dynamic header detection: any row where Col 1 has W\d+
        const headers = rows.map((_, r) => /\bW\s*\d{1,2}\b/i.test(value(r, 1)) ? r : -1).filter(r => r >= 0);

        headers.forEach((header, h) => {
            const stop = headers[h + 1] ?? rows.length;
            const weekTitle = value(header, 1);

            // Dynamically find day row: check rows header+1, header+2, header+3
            let dayRow = -1;
            for (let r = header + 1; r <= header + 3 && r < stop; r++) {
                const nums = Array.from({length: 7}, (_, c) => Number(value(r, c + 1))).filter(n => Number.isInteger(n) && n >= 1 && n <= 31);
                if (nums.length >= 1) { // A week has at least 3-7 day numbers
                    dayRow = r;
                    break;
                }
            }

            if (dayRow === -1) {
                errors.push(`Could not find dayRow for ${sheetMeta.title} (${weekTitle}) at row ${header+1}`);
                return;
            }

            // Labels start after dayRow
            const labels = [];
            for (let r = dayRow + 1; r < stop; r++) {
                const label = value(r, 0);
                if (!label) continue;
                const alias = _matrixAlias(label);
                if (!accounts[alias]) continue; // safely ignore non-trainer headers/notes
                labels.push({ row: r, account: accounts[alias], label: label });
            }

            labels.forEach((label, i) => {
                let limit = labels[i + 1]?.row ?? stop;
                for (let col = 1; col <= 7; col++) {
                    const dayNumber = Number(value(dayRow, col));
                    if (!Number.isInteger(dayNumber) || dayNumber < 1 || dayNumber > 31) continue;
                    const iso = `2026-${String(sheetMeta.month).padStart(2, '0')}-${String(dayNumber).padStart(2, '0')}`;
                    const key = `${iso}:${label.account.user}`;
                    if (!allDays[key]) allDays[key] = [];
                    for (let r = label.row; r < limit; r++) {
                        const val = value(r, col);
                        if (val) {
                            allDays[key].push(val);
                            totalItems++;
                        }
                    }
                }
            });
        });
    }

    console.log(`\n=== RESULTS ===`);
    console.log(`Total days with entries: ${Object.keys(allDays).length}`);
    console.log(`Total activity items: ${totalItems}`);
    console.log(`Errors count: ${errors.length}`);
    if (errors.length) console.log('Errors:', errors);

    // Let's specifically inspect October
    const octKeys = Object.keys(allDays).filter(k => k.startsWith('2026-10-'));
    console.log(`October days count: ${octKeys.length}`);
    let octItems = 0;
    octKeys.forEach(k => {
        octItems += allDays[k].length;
    });
    console.log(`October total items: ${octItems}`);
    console.log(`Sample October 1..4:`);
    ['2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04'].forEach(d => {
        const matching = octKeys.filter(k => k.startsWith(d));
        console.log(`  ${d}:`, matching.map(k => `${k.split(':')[1]} (${allDays[k].length} items)`).join(', '));
    });
}

run().catch(console.error);
