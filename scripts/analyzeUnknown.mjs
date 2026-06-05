import { readFileSync } from 'fs';

const prodTs = readFileSync('src/data/products.ts', 'utf-8');
const regex = /name: ("[^"]+?"|'[^']+?'),\s*price: \d+,\s*costPrice: \d+,\s*category: 'Lainnya'/g;
const names = [];
let m;
while ((m = regex.exec(prodTs)) !== null) {
  names.push(JSON.parse(m[1]));
}

// More granular categorization for UNKNOWN
const groups = {};
names.forEach(n => {
  const l = n.toLowerCase();
  
  // Already handled
  if (/sardine|ikan|tuna|salmon|crab|seafood|udang|laut|saus|sauce|mayo|dressing|vinegar|mie |mi |noodle|pasta|spaghetti|bihun|kwetiau|chip|keripik|cracker|crispy|krup|emping|stick|ring|puff|pop|corn|pretzel|snack|drink|cola|fanta|lemon|soda|energy|isotonic|sirup|syrup|sabun|soap|shampoo|conditioner|body|lotion|cream|facial|cleanser|parfum|deo|bumbu|spice|herb|seasoning|rempah|lada|pepper|cabe|chili|curry|bread|roti|cake|kue|donat|muffin|jam|selai|baby|bayi|anak|kid|infant|formula|cereal|obat|medicine|vitamin|suplemen|health|susu|milk|keju|cheese|yogurt|butter|mentega/.test(l)) return;
  
  let cat = 'UNKNOWN';
  if (/bebelac|bebelove|s-?26|sgm|lactogen|frisian|dancow|sufor|nutrilon|anmum|sustagen|promina/.test(l)) cat = 'Susu Formula';
  else if (/teh|tea|green.?tea|jasmine|olong/.test(l)) cat = 'Teh';
  else if (/kopi|coffee|nescafe|kopiko|kapal api|luwak|torabika|indocafe|abc.kopi|good.day|top.coffee/.test(l)) cat = 'Kopi';
  else if (/cokelat|coklat|chocolate|cacao|cadbury|silverqueen|delfi/.test(l)) cat = 'Cokelat';
  else if (/minyak|oil|goreng|bimoli|filma|sania|tropical|fortune/.test(l)) cat = 'Minyak';
  else if (/gula|sugar|gulaku|rose.?brand/.test(l)) cat = 'Gula';
  else if (/beras|rice|sania|anak.raja|rojolele|pandan.wangi/.test(l)) cat = 'Beras';
  else if (/deterjen|detergen|rinso|attack|daia|surf|so.?klin|sunlight|mama.lemon/.test(l)) cat = 'Deterjen';
  else if (/tissue|tisu|paseo|nice|jolly/.test(l)) cat = 'Tissue';
  else if (/rokok|djarum|sampoerna|gudang.garam|surya|marlboro|esse|magnum|LA|dunhill/.test(l)) cat = 'Rokok';
  else if (/indomie|mi.sedaap|sarimi|supermi|pop.?mie|cup.?noodle/.test(l)) cat = 'Mie Instan';
  else if (/aqua|vit|club|pristine|cleo|le.mineral|ades/.test(l)) cat = 'Air Mineral';
  else if (/nabati|richeese|ahh|richoco|roma|hatari|oreo|good.?time|better|sari.roti|monde/.test(l)) cat = 'Biskuit/Wafer';
  else if (/pocari|mizone|hydro|ion|isotonic/.test(l)) cat = 'Isotonik';
  else if (/so.?nice|frisian.flag|diamond|ultra|indomilk|greenfields|cimory/.test(l)) cat = 'Susu Cair';
  else if (/garuda|dua.kelinci|kacang|peanut/.test(l)) cat = 'Kacang';
  else if (/alfamart|indomaret/.test(l)) cat = 'Private Label';
  else if (/dog|cat|kucing|anjing|pet|whiskas|pedigree/.test(l)) cat = 'Pet Food';
  else if (/tepung|flour|maizena|tapioka/.test(l)) cat = 'Tepung';
  else if (/sarden|corned|abon|rendang|kaleng|canned/.test(l)) cat = 'Makanan Kaleng';
  
  if (!groups[cat]) groups[cat] = [];
  groups[cat].push(n);
});

Object.entries(groups)
  .sort((a, b) => b[1].length - a[1].length)
  .forEach(([k, v]) => {
    console.log(`\n${k} (${v.length}):`);
    v.slice(0, 8).forEach(n => console.log('  ' + n));
    if (v.length > 8) console.log(`  ... +${v.length - 8} more`);
  });
