const https = require('https');

const url = 'https://www.gocase.com.br/capinha-para-celular//?sorting=favorites&product_filter=capinha-para-celular&page=2&new=1';

https.get(url, (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
        // Simple regex to find product names/images
        // Looking for patterns common in VTEX or general e-commerce HTML
        // Assuming names might be in alt tags or title attributes

        const productNameRegex = /"productName":"([^"]+)"/g;
        const products = [];
        let match;

        // Try JSON-LD or script data first (common in VTEX)
        while ((match = productNameRegex.exec(data)) !== null) {
            if (match[1].toLowerCase().includes('stranger')) {
                products.push(match[1]);
            }
        }

        // Fallback: look for generic HTML content
        if (products.length === 0) {
            console.log('No JSON matches. Checking HTML text...');
            // <a ... title="Capinha...">
            const htmlRegex = /title="([^"]*Stranger[^"]*)"/gi;
            while ((match = htmlRegex.exec(data)) !== null) {
                products.push(match[1]);
            }
        }

        console.log(`Found ${products.length} Stranger Things products:`);
        products.forEach(p => console.log(p));

        // Extract images if possible (basic attempt)
        console.log('\nAnalyzing HTML structure for image scraping...');
        const imageRegex = /<img[^>]+src="([^"]+)"[^>]+alt="([^"]*Stranger[^"]*)"/gi;
        while ((match = imageRegex.exec(data)) !== null) {
            console.log(`Image: ${match[1]} - Alt: ${match[2]}`);
        }
    });
}).on('error', (err) => {
    console.error('Error:', err.message);
});
