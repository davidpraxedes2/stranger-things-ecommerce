const https = require('https');
const fs = require('fs');

async function fetchAllPages() {
    const allProducts = [];

    for (let page = 1; page <= 4; page++) {
        console.log(`\n📄 Fetching page ${page}...`);
        const url = `https://www.funko.com.br/stranger-things?page=${page}`;

        const html = await new Promise((resolve, reject) => {
            const options = {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                    'Accept-Language': 'pt-BR,pt;q=0.9',
                }
            };

            https.get(url, options, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => resolve(data));
            }).on('error', reject);
        });

        // Save for analysis
        fs.writeFileSync(`/tmp/funko_page${page}.html`, html);
        console.log(`   Saved to /tmp/funko_page${page}.html (${html.length} bytes)`);

        // Try multiple regex patterns to find products
        const patterns = [
            // Pattern 1: img tags with Stranger/Funko in alt
            /<img[^>]+src="([^"]+)"[^>]+alt="([^"]*(?:Stranger|Funko)[^"]*)"/gi,
            // Pattern 2: alt first
            /<img[^>]+alt="([^"]*(?:Stranger|Funko)[^"]*)"[^>]+src="([^"]+)"/gi,
            // Pattern 3: data-src
            /<img[^>]+data-src="([^"]+)"[^>]+alt="([^"]*(?:Stranger|Funko)[^"]*)"/gi,
            // Pattern 4: JSON in script tags
            /"name"\s*:\s*"([^"]*(?:Stranger|Funko)[^"]*)"/gi,
            // Pattern 5: product links
            /<a[^>]+href="([^"]*\/produto\/[^"]*stranger[^"]*)"[^>]*>([^<]*)</gi,
        ];

        for (const pattern of patterns) {
            let match;
            while ((match = pattern.exec(html)) !== null) {
                const product = {
                    name: match[2] || match[1] || 'Unknown',
                    image_url: match[1] || '',
                    url: match[1] || '',
                    price: 29.00,
                    category: 'stranger-things-funkos',
                    description: '',
                    active: 1
                };

                // Clean up name
                product.name = product.name.replace(/\s+/g, ' ').trim();

                if (product.name && product.name.length > 3) {
                    allProducts.push(product);
                }
            }
        }

        console.log(`   Found ${allProducts.length} products so far`);

        // Wait between requests
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Remove duplicates by name
    const unique = [];
    const seen = new Set();
    for (const p of allProducts) {
        if (!seen.has(p.name)) {
            seen.add(p.name);
            unique.push(p);
        }
    }

    console.log(`\n✅ Total unique products: ${unique.length}`);
    return unique;
}

fetchAllPages()
    .then(products => {
        fs.writeFileSync('/tmp/funkos_extracted.json', JSON.stringify(products, null, 2));
        console.log('\n📦 Products saved to /tmp/funkos_extracted.json');
        console.log('\nFirst 5 products:');
        products.slice(0, 5).forEach(p => console.log(`- ${p.name}`));
    })
    .catch(err => {
        console.error('❌ Error:', err.message);
        process.exit(1);
    });
