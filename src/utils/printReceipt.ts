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
 * Bangun HTML struk 58mm/80mm yang siap dicetak.
 * Styling menggunakan CSS print-friendly: font monospace, no color, border char.
 */
export function buildReceiptHTML(tx: Transaction, store: StoreInfo): string {
  const lines = tx.items
    .map((item) => {
      const subtotal = item.product.price * item.quantity;
      const name = item.product.name.length > 20
        ? item.product.name.slice(0, 19) + '…'
        : item.product.name;
      return `
        <tr>
          <td colspan="3" style="padding-top:2px">${name}</td>
        </tr>
        <tr>
          <td style="padding-left:8px;color:#555">${item.quantity}x ${toRupiah(item.product.price)}</td>
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
      margin: 4mm 4mm;
      size: 80mm auto;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Courier New', Courier, monospace;
      font-size: 11px;
      color: #000;
      width: 72mm;
    }
    .center  { text-align: center; }
    .bold    { font-weight: bold; }
    .divider { border-top: 1px dashed #000; margin: 4px 0; }
    table    { width: 100%; border-collapse: collapse; }
    td       { vertical-align: top; font-size: 11px; padding: 1px 0; }
    .store-name { font-size: 14px; font-weight: bold; }
    .total-row td { font-size: 13px; font-weight: bold; padding-top: 4px; }
  </style>
</head>
<body>
  <div class="center">
    <div class="store-name">${store.storeName}</div>
    ${store.address ? `<div style="font-size:10px">${store.address}</div>` : ''}
    ${store.phone   ? `<div style="font-size:10px">Telp: ${store.phone}</div>` : ''}
  </div>

  <div class="divider"></div>

  <table>
    <tr><td>No</td><td style="text-align:right">${tx.id}</td></tr>
    <tr><td>Tanggal</td><td style="text-align:right">${formatDT(tx.date)}</td></tr>
    <tr><td>Kasir</td><td style="text-align:right">${store.cashierName}</td></tr>
    <tr><td>Pembayaran</td><td style="text-align:right">${PAYMENT_LABEL[tx.paymentMethod] ?? tx.paymentMethod}</td></tr>
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

  <div class="center" style="margin-top:6px;font-size:10px">
    <div>Terima kasih atas kunjungan Anda</div>
    <div style="margin-top:2px">Barang yang sudah dibeli</div>
    <div>tidak dapat dikembalikan</div>
    <div style="margin-top:6px;font-size:9px;color:#555">* Kasir Cepat *</div>
  </div>
</body>
</html>`;
}

/**
 * Cetak struk menggunakan browser Print API via iframe tersembunyi.
 * Browser akan membuka dialog print OS → user memilih printer yang terpasang.
 */
export function printReceipt(tx: Transaction, store: StoreInfo): void {
  const html = buildReceiptHTML(tx, store);

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
