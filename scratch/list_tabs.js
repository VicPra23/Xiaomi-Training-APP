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

fetch('https://docs.google.com/spreadsheets/d/1qNAt27vAvk5FAw4yga1imi1TEjtb11yKFf1tL2oXNhk/edit?usp=sharing')
    .then(html => {
        // Look for: \"(\d+)\",\[\{\"1\":\[\[0,0,\"([^\"]+)\"
        const regex = /\\"(\d+)\\",\[\{\\"1\\":\[\[0,0,\\"([^\\"]+)\\"/g;
        let m;
        const list = [];
        while ((m = regex.exec(html)) !== null) {
            list.push({ gid: m[1], title: m[2] });
        }
        if (list.length === 0) {
            // Also try unescaped
            const regex2 = /"(\d+)",\[\{"1":\[\[0,0,"([^"]+)"/g;
            while ((m = regex2.exec(html)) !== null) {
                list.push({ gid: m[1], title: m[2] });
            }
        }
        console.log(`Found ${list.length} sheets:`, list);
    })
    .catch(console.error);
