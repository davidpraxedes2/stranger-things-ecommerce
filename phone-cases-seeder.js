const phoneVariants = {
    blocks: [
        {
            name: "Marca do Celular",
            type: "select",
            options: ["Apple (iPhone)", "Samsung", "Motorola", "Xiaomi", "LG"]
        },
        {
            name: "Modelo do Aparelho",
            type: "dependent_select",
            parent: "Marca do Celular",
            options: {
                "Apple (iPhone)": [
                    "iPhone 15 Pro Max", "iPhone 15 Pro", "iPhone 15 Plus", "iPhone 15",
                    "iPhone 14 Pro Max", "iPhone 14 Pro", "iPhone 14 Plus", "iPhone 14",
                    "iPhone 13 Pro Max", "iPhone 13 Pro", "iPhone 13", "iPhone 13 Mini",
                    "iPhone 12 Pro Max", "iPhone 12 Pro", "iPhone 12", "iPhone 12 Mini",
                    "iPhone 11 Pro Max", "iPhone 11 Pro", "iPhone 11", "iPhone XR", "iPhone SE"
                ],
                "Samsung": [
                    "Galaxy S24 Ultra", "Galaxy S24+", "Galaxy S24",
                    "Galaxy S23 Ultra", "Galaxy S23+", "Galaxy S23", "Galaxy S23 FE",
                    "Galaxy S22 Ultra", "Galaxy S22+", "Galaxy S22",
                    "Galaxy A54 5G", "Galaxy A34 5G", "Galaxy M54 5G",
                    "Galaxy A14 5G", "Galaxy A04s", "Galaxy A24",
                    "Galaxy S21 FE", "Galaxy S21 Ultra", "Galaxy Note 20 Ultra"
                ],
                "Motorola": [
                    "Motorola Edge 40 Neo", "Motorola Edge 40", "Motorola Edge 30 Ultra",
                    "Moto G84 5G", "Moto G54 5G", "Moto G14",
                    "Moto G73 5G", "Moto G53 5G", "Moto G23", "Moto G13",
                    "Moto G52", "Moto G42", "Moto G22",
                    "Motorola Razr 40 Ultra", "Motorola Razr 40"
                ],
                "Xiaomi": [
                    "Redmi Note 13 Pro+", "Redmi Note 13 Pro", "Redmi Note 13",
                    "Redmi Note 12 Pro+", "Redmi Note 12 Pro", "Redmi Note 12",
                    "Poco X6 Pro", "Poco X6", "Poco M6 Pro",
                    "Poco F5 Pro", "Poco F5", "Poco X5 Pro",
                    "Xiaomi 13T", "Xiaomi 13", "Xiaomi 12",
                    "Redmi 13C", "Redmi 12", "Redmi 12C"
                ],
                "LG": [
                    "LG K62", "LG K62+", "LG K52",
                    "LG K41S", "LG K51S", "LG K61",
                    "LG K22", "LG K22+", "LG Velvet",
                    "LG G8S ThinQ", "LG G8X ThinQ"
                ]
            }
        }
    ]
};

const designs = [
    { name: "Capinha Stranger Things - Classic Red Logo", image: "https://ik.imagekit.io/gocase/govinci/nfx-st-03/infiniteair-iphone13/mockup?stamp=prisma-render%2Fprod-v2%2Fpreviews%2Fnfx-st-03%2F9769%2Fstandard-iphone11%2F174160922597570820576144384044182.png&expires=yes" },
    { name: "Capinha Stranger Things - Friends Don't Lie", image: "https://ik.imagekit.io/gocase/govinci/nfx-st-14/infiniteair-iphone13/mockup?stamp=prisma-render%2Fprod-v2%2Fpreviews%2Fnfx-st-14%2F12356%2Fstandard-iphone11%2F17416121316516457012306804105089697.png&expires=yes" },
    { name: "Capinha Stranger Things - Hellfire Club Icon", image: "https://ik.imagekit.io/gocase/govinci/nfx-st-42/infiniteair-iphone13/mockup?stamp=prisma-render%2Fprod-v2%2Fpreviews%2Fnfx-st-37%2F14875%2Fstandard-iphone11%2F17622573938896887049065457470278095.png&expires=yes" },
    { name: "Capinha Stranger Things - Run Lights", image: "https://ik.imagekit.io/gocase/govinci/nfx-st-01/infiniteair-iphone13/mockup?stamp=prisma-render%2Fprod-v2%2Fpreviews%2Fnfx-st-01%2F9768%2Fstandard-iphone11%2F174160911984804530010510865344595222.png&expires=yes" },
    { name: "Capinha Stranger Things - Monster Hunters", image: "https://ik.imagekit.io/gocase/govinci/nfx-st-86/infiniteair-iphone13/mockup?stamp=prisma-render%2Fprod-v2%2Fpreviews%2Fst5-monster-hunters%2F129947%2Fstandard-iphone11%2F17635696736943247007101686725747569.png&expires=yes" },
    { name: "Capinha Stranger Things - Scoops Ahoy Steve", image: "https://ik.imagekit.io/gocase/govinci/nfx-st-79/infiniteair-iphone13/mockup?stamp=prisma-render%2Fprod-v2%2Fpreviews%2Fst5-steve-scoops-ahoy%2F126762%2Fstandard-iphone11%2F1761306590814816502039174389094921.png&expires=yes" },
    { name: "Capinha Stranger Things - 1987 Tape", image: "https://ik.imagekit.io/gocase/govinci/nfx-st-55/infiniteair-iphone13/mockup?stamp=prisma-render%2Fprod-v2%2Fpreviews%2Fst5-1987%2F121232%2Fstandard-iphone11%2F17600404182239742021116496070114432.png&expires=yes" },
    { name: "Capinha Stranger Things - Pixel Art Game", image: "https://ik.imagekit.io/gocase/govinci/nfx-st-50/infiniteair-iphone13/mockup?stamp=prisma-render%2Fprod-v2%2Fpreviews%2Fst5-pixel-art-game%2F125061%2Fantiimpactoslimair-iphone14%2F1760104109258312707235325077454576.png&expires=yes" },
    { name: "Capinha Stranger Things - The Upside Down Red", image: "https://ik.imagekit.io/gocase/govinci/nfx-st-84/infiniteair-iphone13/mockup?stamp=prisma-render%2Fprod-v2%2Fpreviews%2Fst5-inverso-case%2F129983%2Fstandard-iphone11%2F176357543960955380284653450056478.png&expires=yes" },
    { name: "Capinha Stranger Things - Demogorgon Anatomy", image: "https://ik.imagekit.io/gocase/govinci/nfx-st-54/infiniteair-iphone13/mockup?stamp=prisma-render%2Fprod-v2%2Fpreviews%2Fst5-anatomia-demogorgon%2F121317%2Fantiimpactoslimair-iphone14%2F1761937773329347408476895006336835.png&expires=yes" },
    { name: "Capinha Stranger Things - Paper Logo Collage", image: "https://ik.imagekit.io/gocase/govinci/nfx-st-47/infiniteair-iphone13/mockup?stamp=prisma-render%2Fprod-v2%2Fpreviews%2Fst5-paper-logo%2F121195%2Fstandard-iphone11%2F1757974630696925406827942788730481.png&expires=yes" },
    { name: "Capinha Stranger Things - Eleven Profile", image: "https://ik.imagekit.io/gocase/govinci/nfx-st-45/infiniteair-iphone13/mockup?stamp=prisma-render%2Fprod-v2%2Fpreviews%2Fnfx-st-36%2F14874%2Fstandard-iphone11%2F1743512461171500402011916322481072.png&expires=yes" }
];

async function seedStrangerCases(db) {
    console.log('📱 Creating Stranger Things phone cases...');
    const createdIds = [];

    for (const design of designs) {
        // Check if exists
        const existing = await new Promise((resolve, reject) => {
            db.get('SELECT id FROM products WHERE name = ?', [design.name], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });

        if (existing) {
            // Update variants just in case
            await new Promise((resolve, reject) => {
                db.run('UPDATE products SET price = 12.90, options_json = ? WHERE id = ?',
                    [JSON.stringify(phoneVariants), existing.id], (err) => {
                        if (err) reject(err);
                        else resolve();
                    });
            });
            createdIds.push(existing.id);
        } else {
            // Create new
            const id = await new Promise((resolve, reject) => {
                db.run('INSERT INTO products (name, description, price, category, image_url, stock, active, has_variants, options_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                    [
                        design.name,
                        `Capinha exclusiva ${design.name}. Proteção e estilo para seu celular. Escolha sua marca e modelo abaixo.`,
                        12.90,
                        'stranger-things',
                        design.image,
                        999,
                        1,
                        1, // has_variants
                        JSON.stringify(phoneVariants)
                    ],
                    function (err) {
                        if (err) reject(err);
                        else resolve(this.lastID);
                    }
                );
            });
            createdIds.push(id);
        }
    }

    console.log(`✅ ${createdIds.length} Phone cases processed.`);
    return createdIds;
}

module.exports = { seedStrangerCases };
