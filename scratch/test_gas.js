const https = require('https');

const url = 'https://script.google.com/macros/s/AKfycbynyrqF9OKToO0MSaQbhS8VIaiBz_RnMYoDTWXqSAkNx9bJ5nX8_6OoK2-AQZ3P0uovug/exec?action=getWeekly&start=2026-10-01&end=2026-10-31';

function fetch(u) {
    return new Promise((resolve, reject) => {
        https.get(u, (res) => {
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                return fetch(res.headers.location).then(resolve).catch(reject);
            }
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(data));
        }).on('error', reject);
    });
}

fetch(url)
    .then(text => {
        try {
            const data = JSON.parse(text);
            console.log('Status:', data.status);
            console.log('Source:', data.source);
            if (data.status === 'success') {
                const dates = Object.keys(data.schedule || {});
                console.log('Dates count in schedule:', dates.length);
                let totalItems = 0;
                dates.forEach(d => {
                    Object.keys(data.schedule[d]).forEach(u => {
                        const items = data.schedule[d][u] || [];
                        totalItems += items.length;
                    });
                });
                console.log('Total activity items in schedule:', totalItems);
                console.log('Sample dates:', dates.slice(0, 5));
                console.log('Users in users array:', data.users);
            } else {
                console.log('Error data:', data);
            }
        } catch (e) {
            console.error('Failed to parse JSON:', text.slice(0, 500));
        }
    })
    .catch(err => console.error(err));
