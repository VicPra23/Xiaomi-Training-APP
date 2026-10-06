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

// Fetch spreadsheet HTML to get all sheet IDs (gids) and titles
fetch('https://docs.google.com/spreadsheets/d/1qNAt27vAvk5FAw4yga1imi1TEjtb11yKFf1tL2oXNhk/edit?usp=sharing')
    .then(html => {
        // Find sheet metadata
        // In Google Sheets html, sheet names and gids appear in bootstrap data or sheetSwitcher
        const sheets = [];
        // Pattern: [gid, 0, "title"] or {"name":"...", "sheetId":...}
        const matches = html.matchAll(/\{\s*"name"\s*:\s*"([^"]+)"\s*,\s*"sheetId"\s*:\s*(\d+)/g);
        for (const m of matches) {
            sheets.push({ title: m[1], gid: m[2] });
        }
        if (sheets.length === 0) {
            // Alternative regex
            const regex2 = /\[(\d+),\d+,"([^"]+)"/g;
            for (const m of html.matchAll(regex2)) {
                sheets.push({ gid: m[1], title: m[2] });
            }
        }
        console.log(`Found ${sheets.length} sheets:`, sheets);
    })
    .catch(console.error);
