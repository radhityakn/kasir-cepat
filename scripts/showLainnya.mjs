import { readFileSync } from 'fs';
const ts = readFileSync('src/data/products.ts','utf-8');
const re = /name: ("[^"]+?"),.*?category: 'Lainnya'/g;
const items = [];
let m;
while ((m = re.exec(ts)) !== null) items.push(JSON.parse(m[1]));
console.log(`Lainnya: ${items.length}\n`);
items.forEach((n, i) => console.log(`${i+1}. ${n}`));
