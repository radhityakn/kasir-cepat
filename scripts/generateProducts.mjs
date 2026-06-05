import { readFileSync, writeFileSync } from 'fs';

const raw = JSON.parse(readFileSync('src/data/offlineProducts.json', 'utf-8'));

function getCategory(name) {
  const n = name.toLowerCase();
  if (/mie|noodle|goreng|sarimi|indomie|supermi|sedaap|bihun|nasi|beras|rice|roti|bread|biskuit|crackers/.test(n)) return 'Makanan';
  if (/susu|milk|teh|tea|kopi|coffee|jus|juice|air|water|aqua|pocari|sprite|cola|soda|yakult|yogurt|oat|mineral|fanta/.test(n)) return 'Minuman';
  if (/sambal|kecap|saos|sauce|bumbu|royco|masako|garam|salt|gula|sugar|minyak|oil|santan|coconut|margarin/.test(n)) return 'Bumbu';
  if (/chip|keripik|snack|kacang|nut|coklat|chocolate|permen|candy|oreo|tango|beng|wafer|pocky|cookie/.test(n)) return 'Snack';
  if (/rokok|gudang.garam|sampoerna|djarum|surya|mild|cigarette/.test(n)) return 'Rokok';
  if (/sabun|soap|shampoo|shampo|pasta.gigi|pepsodent|lifebuoy|sunsilk|pantene|deodorant|lotion|pewangi|molto|rinso|detergen|tissue/.test(n)) return 'Perawatan';
  return 'Lainnya';
}

function getEmoji(cat) {
  const map = { Makanan:'🍜', Minuman:'🥤', Bumbu:'🧂', Snack:'🍪', Rokok:'🚬', Perawatan:'🧴', Lainnya:'📦' };
  return map[cat] || '📦';
}

function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

function getPrice(cat) {
  const ranges = {
    Makanan: [3,20], Minuman: [3,15], Bumbu: [3,18], Snack: [5,18],
    Rokok: [22,35], Perawatan: [4,25], Lainnya: [5,40],
  };
  const [min, max] = ranges[cat] || [5, 30];
  return randInt(min, max) * 1000;
}

const products = raw.map((p, i) => {
  const cat = getCategory(p.name);
  const price = getPrice(cat);
  const costPrice = Math.floor(price * (randInt(60, 78) / 100));
  return {
    id: `p${i + 1}`,
    barcode: p.barcode,
    name: p.name,
    price,
    costPrice,
    category: cat,
    image: getEmoji(cat),
    stock: randInt(10, 150),
    sold: randInt(0, 200),
  };
});

// Stats
const cats = {};
products.forEach(p => { cats[p.category] = (cats[p.category] || 0) + 1; });
console.log('Categories:', cats);
console.log('Total:', products.length);

// Write as TypeScript
const lines = products.map(p => 
  `  { id: '${p.id}', barcode: '${p.barcode}', name: ${JSON.stringify(p.name)}, price: ${p.price}, costPrice: ${p.costPrice}, category: '${p.category}', image: '${p.image}', stock: ${p.stock}, sold: ${p.sold} },`
);

const ts = `import type { Product } from '../types';

export const categories = ['Semua', 'Makanan', 'Minuman', 'Bumbu', 'Snack', 'Rokok', 'Perawatan', 'Lainnya'];

/**
 * 931 produk Indonesia — data dari Open Food Facts (offline database)
 * Barcode asli prefix Indonesia (089/899)
 */
export const initialProducts: Product[] = [
${lines.join('\n')}
];

/** Generate barcode EAN-13 style dengan prefix 899 (Indonesia) */
export function generateBarcode(): string {
  const prefix = '899';
  const mid = String(Date.now()).slice(-7);
  const raw = prefix + mid;
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(raw[i]) * (i % 2 === 0 ? 1 : 3);
  }
  const check = (10 - (sum % 10)) % 10;
  return raw + check;
}

export const generateTransactions = () => {
  const methods: Array<'cash' | 'qris' | 'transfer' | 'card'> = ['cash', 'qris', 'transfer', 'card'];
  const customers = ['Budi Santoso', 'Siti Rahayu', 'Andi Wijaya', 'Dewi Lestari', 'Riko Pratama'];
  const transactions = [];

  for (let i = 0; i < 60; i++) {
    const date = new Date();
    date.setDate(date.getDate() - Math.floor(Math.random() * 30));
    date.setHours(Math.floor(Math.random() * 12) + 8, Math.floor(Math.random() * 60));

    const numItems = Math.floor(Math.random() * 4) + 1;
    const items = [];
    for (let j = 0; j < numItems; j++) {
      const product = initialProducts[Math.floor(Math.random() * initialProducts.length)];
      items.push({ product, quantity: Math.floor(Math.random() * 3) + 1 });
    }

    const total = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
    const discount = Math.random() > 0.7 ? Math.floor(total * 0.1) : 0;
    const grandTotal = total - discount;
    const method = methods[Math.floor(Math.random() * methods.length)];
    const amountPaid = method === 'cash' ? Math.ceil(grandTotal / 5000) * 5000 : grandTotal;

    transactions.push({
      id: \`TRX-\${String(i + 1).padStart(4, '0')}\`,
      items,
      total,
      discount,
      tax: 0,
      grandTotal,
      paymentMethod: method,
      amountPaid,
      change: amountPaid - grandTotal,
      cashier: 'Admin',
      date,
      status: 'completed',
      customer: Math.random() > 0.5 ? customers[Math.floor(Math.random() * customers.length)] : undefined,
    });
  }

  return transactions.sort((a, b) => b.date.getTime() - a.date.getTime());
};
`;

writeFileSync('src/data/products.ts', ts, 'utf-8');
console.log('Written to src/data/products.ts');
