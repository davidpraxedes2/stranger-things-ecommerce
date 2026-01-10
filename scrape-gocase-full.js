const https = require('https');
const fs = require('fs');

const url = 'https://www.gocase.com.br/capinha-para-celular//?sorting=favorites&product_filter=capinha-para-celular&page=2&new=1';

const options = {
    headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
    }
};

https.get(url, options, (res) => {
    let data = '';
    console.log(`Status Code: ${res.statusCode}`);

    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
        fs.writeFileSync('gocase_dump.html', data);
        console.log('HTML saved to gocase_dump.html');

        // Analyze immediately
        const regex = /<img[^>]+src="([^"]+)"[^>]+alt="([^"]*Stranger[^"]*)"/gi;
        let match;
        const products = [];

        while ((match = regex.exec(data)) !== null) {
            products.push({
                image: match[1],
                name: match[2]
            });
        }

        // Try searching for JSON data
        const jsonRegex = /"productName":"([^"]*Stranger[^"]*)"/g;
        // This is harder to pair with images in raw regex, but let's see names
        let nameMatch;
        const names = [];
        while ((nameMatch = jsonRegex.exec(data)) !== null) {
            names.push(nameMatch[1]);
        }

        console.log(`Found ${products.length} products with images matching 'Stranger':`);
        products.forEach(p => console.log(`- ${p.name} | ${p.image}`));

        if (products.length === 0) {
            console.log(`Found ${names.length} names in potential JSON matching 'Stranger':`);
            names.forEach(n => console.log(`- ${n}`));
        }
    });
}).on('error', (err) => {
    console.error('Error:', err.message);
});
