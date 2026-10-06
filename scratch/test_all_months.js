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
  { gid: '278653691', title: 'Enero W1 - W5' },
  { gid: '2117553683', title: 'Febrero W5-W9' },
  { gid: '1925823593', title: 'Marzo W9-W14' },
  { gid: '1900489345', title: 'Abril W14 - W18' },
  { gid: '1429829060', title: 'Mayo W18 - W22' },
  { gid: '1244638454', title: 'Junio W23 - W27' },
  { gid: '186182084', title: 'Julio W27 - W31' },
  { gid: '884494823', title: 'Agosto W31 - W36' },
  { gid: '1825868107', title: 'Septiembre W36 - W40' },
  { gid: '1806480274', title: 'Octubre W40 - W44' },
  { gid: '966997057', title: 'Noviembre W44 - W49' },
  { gid: '1101996697', title: 'Diciembre W49 - W1' },
  { gid: '919646841', title: 'Enero 2027 W1 - W5' }
];

const MATRIX_CALENDAR = {
  accounts: { COORD: 'Victor', DAVID: 'David', TL: 'Francisco Javier', TM: 'Tomás', TB: 'Carles', TS: 'Fabio', TN: 'Hamza' }
};

function _matrixAlias(value) { return String(value || '').trim().toUpperCase().replace(/^(TL|TM|TB|TS|TN)1$/, '$1'); }

async function checkSheet(s) {
    try {
        const url = `https://docs.google.com/spreadsheets/d/1qNAt27vAvk5FAw4yga1imi1TEjtb11yKFf1tL2oXNhk/gviz/tq?tqx=out:csv&gid=${s.gid}`;
        const csv = await fetch(url);
        const lines = csv.split('\n');
        const labelsFound = new Set();
        const unknownLabels = new Set();
        const weekHeaders = [];
        lines.forEach((l, idx) => {
            const cells = l.split(',').map(c => c.replace(/"/g, '').trim());
            const col0 = cells[0];
            const col1 = cells[1];
            if (col1 && /\bW\s*\d{1,2}\b/i.test(col1)) {
                weekHeaders.push({ row: idx + 1, text: col1 });
            }
            if (col0) {
                labelsFound.add(col0);
                const alias = _matrixAlias(col0);
                if (!MATRIX_CALENDAR.accounts[alias]) {
                    unknownLabels.add(col0);
                }
            }
        });
        console.log(`\n=== Sheet: ${s.title} (Lines: ${lines.length}) ===`);
        console.log(`  Weeks:`, weekHeaders.map(w => `R${w.row}:${w.text}`).join(', '));
        console.log(`  All Col 0 labels:`, Array.from(labelsFound).join(', '));
        if (unknownLabels.size > 0) {
            console.log(`  ⚠️ UNKNOWN LABELS IN COL 0:`, Array.from(unknownLabels));
        } else {
            console.log(`  ✅ All labels recognized`);
        }
    } catch (e) {
        console.error(`Error loading sheet ${s.title}:`, e);
    }
}

async function run() {
    for (const s of sheets) {
        await checkSheet(s);
    }
}

run();
