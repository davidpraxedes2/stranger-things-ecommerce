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
    { name: "Capinha Stranger Things - Hellfire Club", image: "https://http2.mlstatic.com/D_NQ_NP_832626-MLB51347065998_092022-O.webp" },
    { name: "Capinha Stranger Things - Friends Don't Lie", image: "https://http2.mlstatic.com/D_NQ_NP_688648-MLB50066530635_052022-O.webp" },
    { name: "Capinha Stranger Things - Alphabets Lights", image: "https://http2.mlstatic.com/D_NQ_NP_956740-MLB43912666160_102020-O.webp" },
    { name: "Capinha Stranger Things - Eleven Powers", image: "https://down-br.img.susercontent.com/file/br-11134207-7qukw-lk7v6u1k7x8e35" },
    { name: "Capinha Stranger Things - Hawkins High School", image: "https://down-br.img.susercontent.com/file/br-11134207-7qukw-lk7v6u1k9buk96" },
    { name: "Capinha Stranger Things - Demogorgon Pattern", image: "https://img.elo7.com.br/product/original/3E66683/capinha-celular-stranger-things-samsung-galaxy-j7-prime-c1-capa-celular-stranger-things.jpg" },
    { name: "Capinha Stranger Things - Surfer Boy Pizza", image: "https://img.elo7.com.br/product/main/42D8E3B/capa-capinha-celular-stranger-things-personalizada-md01-capa-de-celular.jpg" },
    { name: "Capinha Stranger Things - Max & Eleven", image: "https://cf.shopee.com.br/file/d282438787f0b8d5a7d7f2e46d0a7a4a" },
    { name: "Capinha Stranger Things - Bike Ride", image: "https://cf.shopee.com.br/file/br-11134207-7r98o-lm0w6j7z8t5c09" },
    { name: "Capinha Stranger Things - Logo Classic", image: "https://cf.shopee.com.br/file/br-11134207-7r98c-ll2x0v2y7u0a7f" }
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
