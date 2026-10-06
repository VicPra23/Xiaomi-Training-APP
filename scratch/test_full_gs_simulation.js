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
  { gid: '1101996697', title: 'Diciembre W49 - W1', month: 12, year: 2026 }
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

function _matrixIndexNew(sheetList, accounts, start, end) {
  const days = {};
  sheetList.forEach(sheet => {
    const month = { month: sheet.month, year: sheet.year };
    const rows = sheet.rows;
    const value = (r, c) => (rows[r] && rows[r][c] !== undefined) ? rows[r][c] : '';
    const headers = rows.map((_, r) => /\bW\s*\d{1,2}\b/i.test(value(r, 1)) ? r : -1).filter(r => r >= 0);

    headers.forEach((header, h) => {
      const stop = headers[h + 1] ?? rows.length;

      // Locate dayRow
      let dayRow = -1;
      for (let r = header + 1; r <= header + 3 && r < stop; r++) {
        const col0 = value(r, 0);
        if (_matrixAlias(col0) && accounts[_matrixAlias(col0)]) continue;
        const nums = Array.from({ length: 7 }, (_, c) => Number(value(r, c + 1))).filter(n => Number.isInteger(n) && n >= 1 && n <= 31);
        if (nums.length >= 1) {
          dayRow = r;
          break;
        }
      }
      if (dayRow === -1) return;

      const labels = [];
      for (let r = dayRow + 1; r < stop; r++) {
        const label = value(r, 0);
        if (!label) continue;
        const alias = _matrixAlias(label);
        if (!accounts[alias]) continue;
        labels.push({ row: r, account: accounts[alias], label: label });
      }

      labels.forEach((label, i) => {
        let limit = labels[i + 1]?.row ?? stop;
        // Strip trailing spacer rows
        if (i === labels.length - 1) {
          while (limit > label.row + 1 && !Array.from({ length: 7 }, (_, c) => value(limit - 1, c + 1)).some(Boolean)) limit--;
        }

        for (let col = 1; col <= 7; col++) {
          const dayNumber = Number(value(dayRow, col));
          if (!Number.isInteger(dayNumber) || dayNumber < 1 || dayNumber > 31) continue;
          const iso = month.year + '-' + String(month.month).padStart(2, '0') + '-' + String(dayNumber).padStart(2, '0');
          if (iso < start || iso > end) continue;
          const key = iso + ':' + label.account.user;
          if (days[key]) continue;

          const slots = [];
          for (let r = label.row; r < limit; r++) {
            const text = value(r, col);
            slots.push({ row: r, col: col, text: text });
          }
          days[key] = {
            date: iso,
            user: label.account.user,
            items: slots.filter(s => s.text).map(s => ({ text: s.text, category: 'otros' })),
            slots: slots
          };
        }
      });
    });
  });
  return { days: days, users: Object.values(accounts) };
}

async function run() {
  const sheetData = [];
  for (const s of sheets) {
    const url = `https://docs.google.com/spreadsheets/d/1qNAt27vAvk5FAw4yga1imi1TEjtb11yKFf1tL2oXNhk/gviz/tq?tqx=out:csv&gid=${s.gid}`;
    const csv = await fetch(url);
    const rows = csv.split('\n').map(parseCSVLine);
    sheetData.push({ ...s, rows: rows });
  }

  const result = _matrixIndexNew(sheetData, accounts, '2026-01-01', '2026-12-31');
  const schedule = {};
  let totalActs = 0;
  Object.values(result.days).forEach(d => {
    if (!schedule[d.date]) schedule[d.date] = {};
    schedule[d.date][d.user] = d.items;
    totalActs += d.items.length;
  });

  console.log('Total days:', Object.keys(schedule).length);
  console.log('Total activities:', totalActs);

  // Month-by-month breakdown
  for (let m = 1; m <= 12; m++) {
    const mStr = String(m).padStart(2, '0');
    const mDates = Object.keys(schedule).filter(d => d.startsWith(`2026-${mStr}-`));
    let mActs = 0;
    mDates.forEach(d => {
      Object.values(schedule[d]).forEach(arr => mActs += arr.length);
    });
    console.log(`Month ${mStr}: ${mDates.length} days, ${mActs} activities`);
  }
}

run().catch(console.error);
