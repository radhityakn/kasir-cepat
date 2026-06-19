import type { Transaction } from '../types';

interface StoreInfo {
  storeName: string;
  address: string;
  phone: string;
  cashierName: string;
}

/** Format angka ke Rupiah tanpa Intl (agar bekerja di konteks print iframe) */
function toRupiah(amount: number): string {
  return 'Rp ' + amount.toLocaleString('id-ID');
}

/** Format tanggal & waktu */
function formatDT(date: Date): string {
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(date);
}

const PAYMENT_LABEL: Record<string, string> = {
  cash: 'Tunai',
  qris: 'QRIS',
  transfer: 'Transfer Bank',
  card: 'Kartu Debit/Kredit',
};

/**
 * Ukuran kertas termal standar:
 * - 58mm (lebar printable ~48mm setelah margin)
 * - 80mm (lebar printable ~72mm setelah margin) ← default
 */
export type PaperWidth = '58mm' | '80mm';

/**
 * Bangun HTML struk yang sesuai ukuran kertas termal standar.
 * Default 80mm. Untuk 58mm, pass paperWidth='58mm'.
 */
export function buildReceiptHTML(tx: Transaction, store: StoreInfo, paperWidth: PaperWidth = '80mm'): string {
  const is58 = paperWidth === '58mm';
  const pageWidth = is58 ? '58mm' : '80mm';
  const bodyWidth = is58 ? '48mm' : '72mm';
  const fontSize = is58 ? '9px' : '11px';
  const storeNameSize = is58 ? '11px' : '14px';
  const totalSize = is58 ? '11px' : '13px';
  const subTextSize = is58 ? '8px' : '10px';
  const margin = is58 ? '2mm 3mm' : '4mm 4mm';
  const maxNameLen = is58 ? 14 : 20;

  const lines = tx.items
    .map((item) => {
      const subtotal = item.product.price * item.quantity;
      const name = item.product.name.length > maxNameLen
        ? item.product.name.slice(0, maxNameLen - 1) + '…'
        : item.product.name;
      return `
        <tr>
          <td colspan="3" style="padding-top:2px">${name}</td>
        </tr>
        <tr>
          <td style="padding-left:4px;color:#555;font-size:${subTextSize}">${item.quantity}x ${toRupiah(item.product.price)}</td>
          <td></td>
          <td style="text-align:right;white-space:nowrap">${toRupiah(subtotal)}</td>
        </tr>`;
    })
    .join('');

  const discountRow = tx.discount > 0
    ? `<tr><td colspan="2">Diskon</td><td style="text-align:right;color:#c00">-${toRupiah(tx.discount)}</td></tr>`
    : '';

  const changeRow = tx.paymentMethod === 'cash'
    ? `<tr><td colspan="2">Dibayar</td><td style="text-align:right">${toRupiah(tx.amountPaid)}</td></tr>
       <tr><td colspan="2"><b>Kembalian</b></td><td style="text-align:right"><b>${toRupiah(tx.change)}</b></td></tr>`
    : '';

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8"/>
  <title>Struk ${tx.id}</title>
  <style>
    @page {
      margin: ${margin};
      size: ${pageWidth} auto;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Courier New', Courier, monospace;
      font-size: ${fontSize};
      line-height: 1.3;
      color: #000;
      width: ${bodyWidth};
      -webkit-print-color-adjust: exact;
    }
    .center  { text-align: center; }
    .bold    { font-weight: bold; }
    .divider { border-top: 1px dashed #000; margin: 3px 0; }
    table    { width: 100%; border-collapse: collapse; }
    td       { vertical-align: top; font-size: ${fontSize}; padding: 1px 0; }
    .store-name { font-size: ${storeNameSize}; font-weight: bold; }
    .total-row td { font-size: ${totalSize}; font-weight: bold; padding-top: 3px; }
    @media print {
      html, body { width: ${bodyWidth}; }
    }
  </style>
</head>
<body>
  <div class="center">
    <div class="store-name">${store.storeName}</div>
    ${store.address ? `<div style="font-size:${subTextSize}">${store.address}</div>` : ''}
    ${store.phone   ? `<div style="font-size:${subTextSize}">Telp: ${store.phone}</div>` : ''}
  </div>

  <div class="divider"></div>

  <table>
    <tr><td>No</td><td style="text-align:right">${tx.id}</td></tr>
    <tr><td>Tanggal</td><td style="text-align:right">${formatDT(tx.date)}</td></tr>
    <tr><td>Kasir</td><td style="text-align:right">${store.cashierName}</td></tr>
    <tr><td>Bayar</td><td style="text-align:right">${PAYMENT_LABEL[tx.paymentMethod] ?? tx.paymentMethod}</td></tr>
  </table>

  <div class="divider"></div>

  <table>
    ${lines}
  </table>

  <div class="divider"></div>

  <table>
    <tr><td colspan="2">Subtotal</td><td style="text-align:right">${toRupiah(tx.total)}</td></tr>
    ${discountRow}
    <tr class="total-row">
      <td colspan="2">TOTAL</td>
      <td style="text-align:right">${toRupiah(tx.grandTotal)}</td>
    </tr>
    ${changeRow}
  </table>

  <div class="divider"></div>

  <div class="center" style="margin-top:4px;font-size:${subTextSize}">
    <div>Terima kasih atas kunjungan Anda</div>
    <div style="margin-top:2px">Barang yang sudah dibeli</div>
    <div>tidak dapat dikembalikan</div>
    <div style="margin-top:4px;font-size:${is58 ? '7px' : '9px'};color:#555">— Kasir Cepat —</div>
  </div>
</body>
</html>`;
}

/**
 * Cetak struk menggunakan browser Print API via iframe tersembunyi.
 * Browser akan membuka dialog print OS → user memilih printer yang terpasang.
 *
 * @param paperWidth - '58mm' atau '80mm' (default: '80mm')
 */
export function printReceipt(tx: Transaction, store: StoreInfo, paperWidth: PaperWidth = '80mm'): void {
  const html = buildReceiptHTML(tx, store, paperWidth);

  // Buat iframe tersembunyi
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.top = '-9999px';
  iframe.style.left = '-9999px';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = 'none';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) {
    document.body.removeChild(iframe);
    return;
  }

  doc.open();
  doc.write(html);
  doc.close();

  // Tunggu resource load, lalu print
  iframe.onload = () => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } finally {
      // Bersihkan iframe setelah dialog print ditutup
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 2000);
    }
  };
}
