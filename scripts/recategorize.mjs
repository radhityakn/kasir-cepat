import { readFileSync, writeFileSync } from 'fs';

const offlineDB = JSON.parse(readFileSync('src/data/offlineProducts.json', 'utf-8'));

// ─── Category rules (order matters — first match wins) ──────────────────────
const rules = [
  // Susu Formula & Bayi
  ['Susu & Bayi', /bebelac|bebelove|s-?26|sgm|lactogen|frisian.flag|dancow|nutrilon|anmum|sustagen|promina|morinaga|vidoran|chil.?kid|my.?baby|nutribaby|switsal|prenagen/i],
  // Susu Cair & Keju
  ['Susu & Bayi', /ultra.milk|indomilk|greenfields|greenfield|cimory|diamond.milk|so.?nice|frisian|susu|milk|full.cream|yogurt|yoghurt|yakult|biokul|ff skm|fisian flag|real.good.sereal/i],
  // Keju
  ['Susu & Bayi', /keju|cheese|prochiz|meg keju|kraft|cheddar|mozzarella|wincheez/i],
  // Mie Instan
  ['Mie Instan', /indomie|mie.sedaap|sedaap|sarimi|supermi|pop.?mie|cup.?noodle|mi.goreng|mi.kuah|mi.gelas|fitmee|ramen|noodle|mie|mi .+instan|kwetiau|bihun|spaghetti|pasta|macaroni|carbonara|bolognese|laksa|wonhae|ramyun|nongshim|nouille|wow.spag/i],
  // Kopi
  ['Kopi', /kopi|coffee|nescafe|kopiko|kapal.api|luwak|torabika|indocafe|good.?day|top.coffee|abc.kopi|cappuccin|mocacin|latte|espresso|white.koffie|koffie|robusta|arabica|chococino|caffino|matchamu|alfamart.htg.coffe/i],
  // Teh
  ['Teh', /teh|tea|green.?tea|jasmine|oolong|sosro|pucuk.harum|fruit.tea|nuttea|tejahe/i],
  // Air Mineral & Air
  ['Minuman', /aqua|le.mineral|vit |pristine|cleo|ades|club.air|air.mineral|water|nestle.pure.life/i],
  // Minuman lain
  ['Minuman', /pocari|mizone|hydro|isotonic|ion.supply|sprite|fanta|coca.?cola|pepsi|soda|7up|schweppes|greensand|bintang|tebs|f&n|you.c1000|hemaviton|adem.sari|larutan|oronamin|kratingdaeng|extra.joss|m-?150|kukubima|kiranti|floridina|buavita|nutrisari|ale.ale|teh.botol|ultra.teh|pulpy|levite|vitafruit|c1000|marjan|sirup|syrup|squash|big.cola|big.lychee|cap.panda|amunizer|collagena|nipis.madu|grovy|fibe.mini|super.o2|mamaku|fit.fresh|ice.rasp|splash|bintang.lemon|glint|cocacola/i],
  // Minuman susu/coklat
  ['Minuman', /milo|ovaltine|energen|chocodrink|ultra.mimi|oatside/i],
  // Es Krim
  ['Minuman', /paddle.pop|feast|magnum.ice|walls|ice.cream/i],
  // Bumbu & Saus
  ['Bumbu & Saus', /sambal|kecap|saos|sauce|bumbu|racik|royco|masako|sajiku|indofood.bumbu|bango|abc.sam|abc.kecap|saus.tiram|saori|mayo|mayonais|mayumi|dressing|vinegar|cuka|lada|pepper|cabe|chili|mustard|thousand.island|saus.tomat|saus.cabe|dua.belibis|mentai|sambel.pecel|kobe|del.monte|koepoe|heinz|maestro/i],
  // Minyak Goreng & Mentega
  ['Minyak & Bahan Pokok', /minyak|oil|bimoli|filma|sania|tropical|fortune|sunco|hemart|blue.band|margarin|mentega/i],
  // Gula, Beras, Tepung, Santan, Oat, Garam
  ['Minyak & Bahan Pokok', /gula|sugar|gulaku|stevia|rose.?brand|beras|rice|tepung|flour|maizena|tapioka|segitiga.biru|bogasari|santan|coconut.cream|oat|oatmeal|quaker|fiber.creme|garam.konsumsi|madu|sarikurma/i],
  // Makanan Kaleng & Olahan
  ['Makanan Kaleng', /sarden|sardine|corned|abon|kaleng|canned|pronas|maya.sarden|abc.sarden|tuna.kaleng|benfarm|sosis|sozzis|nugget|karage|hot.?dog/i],
  // Biskuit & Wafer
  ['Biskuit & Wafer', /biskuit|wafer|oreo|tango|roma |hatari|khong.guan|good.?time|nabati|richeese|richoco|monde|better|marie|malkist|crackers|cream.biscuit|sari.gandum|arden|deka|slai|biskies|blackmond|wafello|saluut/i],
  // Cokelat & Permen
  ['Cokelat & Permen', /cokelat|coklat|chocolate|chocolat|cacao|cadbury|silverqueen|delfi|toblerone|kitkat|m&m|ferrero|choco.pie|permen|candy|lollipop|lolipop|mentos|yupi|xylitol|happydent|alpenliebe|big.babol|kopiko.candy|relaxa|kiss|gum|halls|frozz|chunky|maltitos|chic.choc|twister|tic.tic|kis |kalpa|beng.beng|choki|nyamnyam|chocolito|waku|lotte|strepsils|sprinkles/i],
  // Snack & Keripik
  ['Snack', /chitato|lays|doritos|pringles|qtela|taro|oishi|cheetos|stick|keripik|chips|emping|krupuk|krup|makaroni|pop.?corn|caramel.corn|garuda|dua.kelinci|kacang|peanut|pilus|momogi|japota|tos.tos|corn|ring|puff|french.fries|kentang|potato|usagi|potabee|piattos|roller.coaster|maitatos|happy.tos|cashew|rebo.kuaci|fitbar|soyjoy|granola|sereal|simba|koko.krunch|honey.star|nestum|gerry|naraya|doriyaki|konyaku|almond.cookie|gluten.free.cookie/i],
  // Roti & Kue
  ['Roti & Kue', /roti|bread|sari.roti|cake|kue|donat|muffin|croissant|bakery|pancake|haan|bolu|brownies|pie|aoka/i],
  // Jelly & Puding
  ['Snack', /jelly|jeli|agar|puding|pudding|nutrijell|inaco|nata.de.coco|wong.coco/i],
  // Makanan (sisa yang punya keyword makanan)
  ['Makanan', /nasi|ayam|chicken|sapi|beef|rendang|soto|rawon|opor|gulai|bakso|frozen|siomay|dimsum|dumpling|pangsit|lumpia|tempura|katsu|burger|pizza|kebab|martabak|topoki|mama.suka/i],
  // Rokok
  ['Rokok', /rokok|gudang.garam|sampoerna|djarum|surya|marlboro|esse|dunhill|magnum(?!.ice)|mild|cigarette|LA.bold/i],
  // Deterjen & Pembersih & Rumah Tangga
  ['Kebersihan', /deterjen|detergen|rinso|attack|daia|surf|so.?klin|sunlight|mama.lemon|wipol|bayclin|pemutih|pembersih|super.pell|karbol|mr.?muscle|pewangi|molto|downy|comfort|softener|tissue|tisu|paseo|nice|jolly|kapas|cotton|vape|autan|anti.nyamuk|hand.sanitizer/i],
  // Perawatan Tubuh
  ['Perawatan', /sabun|soap|shampoo|shampo|conditioner|body.wash|lotion|cream|facial|cleanser|moistur|parfum|cologne|deo|deodorant|lifebuoy|lux|dove|pantene|sunsilk|clear|head.shoulders|pepsodent|closeup|colgate|sensodyne|sensodine|ciptadent|formula|sikat.gigi|toothbrush|pasta.gigi|biore|hadalabo|bigen|marina|scarlet|enzim|ever.whaite|herborist/i],
  // Obat & Kesehatan
  ['Obat & Kesehatan', /obat|medicine|vitamin|suplemen|supplement|health|antis|betadine|paracetamol|bodrex|paramex|tolak.angin|tolakangin|antangin|redoxon|komix|woods|vicks|neurobion|sangobion|diapet|entrostop|promag|mixagrip|antimo|new.enzyplex|domperidon|fitkom|norit|cdr|bejo|sidola|hot.in|you.c1000.vitamin/i],
  // Pertanian & Benih
  ['Lainnya', /benih|bibit|seed|pupuk|tanaman|speed.gro|magic.grow|cabai.besar|terong|caisim|tomat/i],
  // Pet Food
  ['Lainnya', /whiskas|pedigree|me-o|meo|dog|cat.food|pet.food|kucing|anjing/i],
  // Makanan catchall
  ['Makanan', /makanan|food|lauk|masak|goreng|bakar|panggang|rebus|kuah|pedas|gurih|original|rasa/i],
  // Minuman catchall
  ['Minuman', /drink|minuman|botol|liter|ml$/i],
];

function categorize(name) {
  for (const [cat, re] of rules) {
    if (re.test(name)) return cat;
  }
  return 'Lainnya';
}

function getEmoji(cat) {
  const map = {
    'Mie Instan': '🍜', 'Minuman': '🥤', 'Kopi': '☕', 'Teh': '🍵',
    'Susu & Bayi': '🍼', 'Bumbu & Saus': '🧂', 'Minyak & Bahan Pokok': '🌾',
    'Makanan Kaleng': '🥫', 'Biskuit & Wafer': '🍪', 'Cokelat & Permen': '🍫',
    'Snack': '🥔', 'Roti & Kue': '🍞', 'Makanan': '🍳', 'Rokok': '🚬',
    'Kebersihan': '🧹', 'Perawatan': '🧴', 'Obat & Kesehatan': '💊',
    'Pet Food': '🐾', 'Lainnya': '📦',
  };
  return map[cat] || '📦';
}

function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

function getPrice(cat) {
  const ranges = {
    'Mie Instan': [3,8], 'Minuman': [3,15], 'Kopi': [3,25], 'Teh': [3,10],
    'Susu & Bayi': [15,120], 'Bumbu & Saus': [3,20], 'Minyak & Bahan Pokok': [10,70],
    'Makanan Kaleng': [10,30], 'Biskuit & Wafer': [5,20], 'Cokelat & Permen': [3,30],
    'Snack': [5,18], 'Roti & Kue': [5,25], 'Makanan': [5,25], 'Rokok': [18,42],
    'Kebersihan': [5,40], 'Perawatan': [5,35], 'Obat & Kesehatan': [5,50],
    'Pet Food': [15,60], 'Lainnya': [5,30],
  };
  const [min, max] = ranges[cat] || [5, 30];
  return randInt(min, max) * 1000;
}

// ─── Generate ──────────────────────────────────────────────────────────────
const products = offlineDB.map((p, i) => {
  const cat = categorize(p.name);
  const price = getPrice(cat);
  const costPrice = Math.floor(price * (randInt(60, 80) / 100));
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
const sorted = Object.entries(cats).sort((a, b) => b[1] - a[1]);
console.log('Categories:');
sorted.forEach(([k, v]) => console.log(`  ${k}: ${v}`));
console.log(`Total: ${products.length}`);

// Unique categories for the export
const allCats = ['Semua', ...sorted.map(([k]) => k)];
console.log('\nCategory list:', allCats);

// Write TypeScript
const lines = products.map(p =>
  `  { id: '${p.id}', barcode: '${p.barcode}', name: ${JSON.stringify(p.name)}, price: ${p.price}, costPrice: ${p.costPrice}, category: '${p.category}', image: '${p.image}', stock: ${p.stock}, sold: ${p.sold} },`
);

const ts = `import type { Product } from '../types';

export const categories = ${JSON.stringify(allCats)};

/**
 * 931 produk Indonesia — data dari Open Food Facts (offline database)
 * Barcode asli prefix Indonesia (089/899)
 * Dikategorikan otomatis berdasarkan nama produk
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
      status: 'completed' as const,
      customer: Math.random() > 0.5 ? customers[Math.floor(Math.random() * customers.length)] : undefined,
    });
  }

  return transactions.sort((a, b) => b.date.getTime() - a.date.getTime());
};
`;

writeFileSync('src/data/products.ts', ts, 'utf-8');
console.log('\n✅ Written to src/data/products.ts');
