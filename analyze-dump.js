const fs = require('fs');

const content = fs.readFileSync('gocase_curl.html', 'utf8');

// Regex to find image URLs
// Pattern: "prisma-render...png" or "https://...jpg"
// And associated names.
// The data seems to be in a big JS object.

// Strategy: Find all strings that look like Stranger Things product handles or names
// and try to find nearby image URLs.

// Or better, find blocks that look like product definitions.
// Looking at the grep output: "prisma-render...name...png"

const products = [];

// 1. Find all image URLs that might be relevant
const imageRegex = /(https?:\\u002F\\u002F[^"]+|prisma-render\\u002F[^"]+)/g;
let match;
const images = [];

while ((match = imageRegex.exec(content)) !== null) {
    let url = match[1].replace(/\\u002F/g, '/');
    if (!url.startsWith('http')) {
        url = 'https://gocase.com.br/' + url; // or cdn base
    }

    // Check if URL contains stranger things related keywords in the path
    if (url.toLowerCase().includes('stranger')) {
        images.push(url);
    }
}

console.log(`Found ${images.length} direct Stranger Things images.`);

// 2. Since grep didn't show Stranger in the first lines, let's search specifically for names
const nameRegex = /"([^"]*stranger[^"]*)"/gi;
const names = [];
while ((match = nameRegex.exec(content)) !== null) {
    if (match[1].length < 100) { // arbitrary limit to avoid huge chunks
        names.push(match[1]);
    }
}

console.log(`Found ${names.length} potential names.`);

// 3. Try to associate. Since we can't easily parse the minified Nuxt state without a real parser,
// we will output what we found and I will manually select valid ones or construct a list.

console.log('--- IMAGES ---');
images.slice(0, 20).forEach(i => console.log(i));

console.log('--- NAMES ---');
names.slice(0, 20).forEach(n => console.log(n));
