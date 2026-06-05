import { readFileSync } from 'fs';

const prodTs = readFileSync('src/data/products.ts', 'utf-8');

// Extract all product names in 'Lainnya' category
const regex = /name: ("[^"]+?"|'[^']+?'),\s*price: \d+,\s*costPrice: \d+,\s*category: 'Lainnya'/g;
const names = [];
let m;
while ((m = regex.exec(prodTs)) !== null) {
  names.push(JSON.parse(m[1]));
}

console.log(`Total 'Lainnya': ${names.length}\n`);

// Group by keyword patterns to find new categories
const groups = {
  'Sardine/Ikan': [], 'Susu/Dairy': [], 'Saus/Condiment': [], 'Mie/Pasta': [],
  'Snack2': [], 'Minuman2': [], 'Rokok2': [], 'Perawatan2': [],
  'Bumbu2': [], 'Makanan2': [], 'Baby/Anak': [], 'Obat/Kesehatan': [],
  'UNKNOWN': [],
};

names.forEach(n => {
  const l = n.toLowerCase();
  if (/sardine|ikan|tuna|salmon|crab|seafood|udang|laut/.test(l)) groups['Sardine/Ikan'].push(n);
  else if (/susu|milk|cream|keju|cheese|yogurt|butter|mentega/.test(l)) groups['Susu/Dairy'].push(n);
  else if (/saus|sauce|mayo|mustard|dressing|vinegar|cuka/.test(l)) groups['Saus/Condiment'].push(n);
  else if (/mie|mi |noodle|pasta|spaghetti|macaroni|bihun|kwetiau|laksa/.test(l)) groups['Mie/Pasta'].push(n);
  else if (/chip|keripik|cracker|crispy|krup|emping|stick|ring|puff|pop|corn|pretzel|snack/.test(l)) groups['Snack2'].push(n);
  else if (/drink|cola|fanta|lemon|soda|energy|vitamin|isotonic|sirup|syrup|squash|nectar|cordial/.test(l)) groups['Minuman2'].push(n);
  else if (/rokok|tobacco|nicot/.test(l)) groups['Rokok2'].push(n);
  else if (/sabun|soap|shampoo|conditioner|body|lotion|cream|perawat|facial|cleanser|moistur|parfum|cologne|deo/.test(l)) groups['Perawatan2'].push(n);
  else if (/bumbu|spice|herb|seasoning|rempah|lada|pepper|cabe|chili|curry|kari/.test(l)) groups['Bumbu2'].push(n);
  else if (/bread|roti|cake|kue|donat|muffin|croissant|bakery|jam|selai|nutella|peanut butter/.test(l)) groups['Makanan2'].push(n);
  else if (/baby|bayi|anak|kid|infant|formula|sufor|cereal/.test(l)) groups['Baby/Anak'].push(n);
  else if (/obat|medicine|vitamin|suplemen|supplement|health|antis|betadine|paracetamol/.test(l)) groups['Obat/Kesehatan'].push(n);
  else groups['UNKNOWN'].push(n);
});

Object.entries(groups).forEach(([k, v]) => {
  if (v.length > 0) {
    console.log(`\n=== ${k} (${v.length}) ===`);
    v.slice(0, 15).forEach(n => console.log('  ' + n));
    if (v.length > 15) console.log(`  ... +${v.length - 15} more`);
  }
});
