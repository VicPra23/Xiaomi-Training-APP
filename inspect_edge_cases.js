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

async function inspectError(gid, title, rowStart, rowEnd) {
    const url = `https://docs.google.com/spreadsheets/d/1qNAt27vAvk5FAw4yga1imi1TEjtb11yKFf1tL2oXNhk/gviz/tq?tqx=out:csv&gid=${gid}`;
    const csv = await fetch(url);
    const lines = csv.split('\n');
    console.log(`\n--- ${title} (rows ${rowStart}..${rowEnd}) ---`);
    for (let r = rowStart - 1; r < rowEnd && r < lines.length; r++) {
        const cells = parseCSVLine(lines[r]);
        console.log(`Row ${r+1}: ` + cells.map((c, i) => `[C${i}:${c.slice(0, 15)}]`).join(' '));
    }
}

async function run() {
    await inspectError('2117553683', 'Febrero W5', 1, 5);
    await inspectError('1925823593', 'Marzo W9', 1, 5);
    await inspectError('1925823593', 'Marzo W14', 94, 100);
    await inspectError('1244638454', 'Junio W27', 82, 88);
    await inspectError('884494823', 'Agosto W31', 1, 8);
    await inspectError('966997057', 'Noviembre W44', 1, 5);
}

run().catch(console.error);
