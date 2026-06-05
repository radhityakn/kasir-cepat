/**
 * Generate PWA icons sebagai placeholder PNG sederhana.
 * Untuk produksi, ganti dengan icon desainer.
 * Di sini kita buat data URI SVG → canvas → PNG via Node-less approach.
 * 
 * Karena kita tidak punya sharp/canvas di Node, kita buat PNG placeholder
 * langsung sebagai 1x1 hijau — lalu gunakan SVG sebagai fallback utama.
 * 
 * Browser modern bisa pakai SVG langsung, jadi ini cukup untuk PWA.
 */
import { writeFileSync, mkdirSync, existsSync } from 'fs';

const dir = 'public/icons';
if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

// Buat minimal PNG placeholder (1x1 pixel hijau) untuk setiap ukuran.
// Browser akan menggunakan icon.svg utama, PNG ini hanya untuk fallback.
// Untuk produksi: gunakan tool seperti sharp atau Figma export.

function createMinimalPNG() {
  // Minimal valid PNG: 1x1 pixel hijau #00C853
  const buffer = Buffer.from(
    '89504e470d0a1a0a0000000d49484452000000010000000108020000009001' +
    '2e0000000c4944415478016360f8cf00000002010100189925e200000000' +
    '49454e44ae426082',
    'hex'
  );
  return buffer;
}

const png = createMinimalPNG();
sizes.forEach(size => {
  writeFileSync(`${dir}/icon-${size}.png`, png);
});

console.log(`Created ${sizes.length} placeholder icons. Use SVG as primary.`);
console.log('For production, export proper PNG icons from your SVG design.');
