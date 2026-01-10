const https = require('https');
const { JSDOM } = require('jsdom');

async function fetchPage(url) {
    return new Promise((resolve, reject) => {
        https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(data));
        }).on('error', reject);
    });
}

async function scrapeFunkos() {
    const allProducts = [];

    for (let page = 1; page <= 4; page++) {
        console.log(`\n📄 Scraping page ${page}...`);
        const url = `https://www.funko.com.br/stranger-things?page=${page}`;
        const html = await fetchPage(url);
        const dom = new JSDOM(html);
        const doc = dom.window.document;

        // Find all product cards
        const productCards = doc.querySelectorAll('.product-item, .product-card, [data-product], .item-product, .shelf-item');

        if (productCards.length === 0) {
            // Try alternative selectors
            const allLinks = doc.querySelectorAll('a[href*="/produto/"], a[href*="/product/"]');
            console.log(`   Found ${allLinks.length} product links`);

            for (const link of allLinks) {
                const parent = link.closest('div, article, li');
                if (!parent) continue;

                const img = parent.querySelector('img');
                const title = link.textContent.trim() || img?.alt || '';
                const href = link.getAttribute('href');
                const priceEl = parent.querySelector('[class*="price"], .valor, .preco');

                if (title && title.toLowerCase().includes('stranger')) {
                    allProducts.push({
                        name: title,
                        description: `Boneco Funko Pop! Stranger Things - ${title}`,
                        price: 29.00,
                        category: 'stranger-things-funkos',
                        image_url: img?.src || img?.getAttribute('data-src') || '',
                        url: href ? (href.startsWith('http') ? href : `https://www.funko.com.br${href}`) : '',
                        active: 1
                    });
                }
            }
        } else {
            console.log(`   Found ${productCards.length} product cards`);

            for (const card of productCards) {
                const titleEl = card.querySelector('h2, h3, .product-name, .product-title, [class*="title"]');
                const imgEl = card.querySelector('img');
                const linkEl = card.querySelector('a');
                const priceEl = card.querySelector('[class*="price"], .valor, .preco');

                const title = titleEl?.textContent.trim() || imgEl?.alt || '';

                if (title) {
                    allProducts.push({
                        name: title,
                        description: `Boneco Funko Pop! Stranger Things - ${title}`,
                        price: 29.00,
                        category: 'stranger-things-funkos',
                        image_url: imgEl?.src || imgEl?.getAttribute('data-src') || '',
                        url: linkEl?.href || '',
                        active: 1
                    });
                }
            }
        }

        console.log(`   ✅ Extracted ${allProducts.length} products so far`);

        // Wait 1 second between requests
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log(`\n✅ Total products scraped: ${allProducts.length}`);
    return allProducts;
}

// Run scraper
scrapeFunkos()
    .then(products => {
        console.log('\n📦 Products:');
        console.log(JSON.stringify(products, null, 2));
    })
    .catch(err => {
        console.error('❌ Error:', err.message);
        process.exit(1);
    });
