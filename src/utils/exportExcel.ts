import * as XLSX from 'xlsx';
import type { Transaction } from '../types';

interface StoreInfo {
  storeName: string;
  cashierName: string;
}

function formatDT(d: Date) {
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(d);
}

const PAYMENT_LABEL: Record<string, string> = {
  cash: 'Tunai', qris: 'QRIS', transfer: 'Transfer', card: 'Kartu',
};

/**
 * Buat workbook Excel dengan 3 sheet:
 * 1. Ringkasan   – statistik periode
 * 2. Transaksi   – daftar semua transaksi
 * 3. Detail Item – setiap baris item per transaksi
 */
export function buildWorkbook(
  transactions: Transaction[],
  store: StoreInfo,
  periodLabel: string,
): XLSX.WorkBook {
  const wb = XLSX.utils.book_new();

  // ── Helper: style header row ──────────────────────────────────────
  const headerStyle = {
    font: { bold: true, color: { rgb: 'FFFFFF' } },
    fill: { fgColor: { rgb: '00C853' } },
    alignment: { horizontal: 'center' },
  };

  // ── Sheet 1: Ringkasan ────────────────────────────────────────────
  const totalRevenue = transactions.reduce((s, t) => s + t.grandTotal, 0);
  const totalCOGS    = transactions.reduce((s, t) =>
    s + t.items.reduce((si, i) => si + (i.product.costPrice ?? 0) * i.quantity, 0), 0);
  const totalProfit  = totalRevenue - totalCOGS;
  const totalTx      = transactions.length;
  const totalItems   = transactions.reduce((s, t) =>
    s + t.items.reduce((si, i) => si + i.quantity, 0), 0);
  const margin       = totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(1) : '0.0';

  const summaryData = [
    ['Kasir Cepat — Laporan ' + periodLabel],
    ['Toko', store.storeName],
    ['Kasir', store.cashierName],
    ['Diekspor pada', formatDT(new Date())],
    [],
    ['Metrik', 'Nilai'],
    ['Total Pendapatan', totalRevenue],
    ['Total HPP (Modal)', totalCOGS],
    ['Laba Kotor', totalProfit],
    ['Margin (%)', Number(margin)],
    ['Jumlah Transaksi', totalTx],
    ['Total Item Terjual', totalItems],
  ];

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
  // Lebar kolom
  wsSummary['!cols'] = [{ wch: 24 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Ringkasan');

  // ── Sheet 2: Daftar Transaksi ─────────────────────────────────────
  const txHeaders = [
    'ID Transaksi', 'Tanggal & Waktu', 'Kasir', 'Metode Bayar',
    'Subtotal', 'Diskon', 'Grand Total', 'Dibayar', 'Kembalian', 'Jml Item',
  ];
  const txRows = transactions.map((t) => [
    t.id,
    formatDT(t.date),
    t.cashier,
    PAYMENT_LABEL[t.paymentMethod] ?? t.paymentMethod,
    t.total,
    t.discount,
    t.grandTotal,
    t.amountPaid,
    t.change,
    t.items.reduce((s, i) => s + i.quantity, 0),
  ]);

  const wsTx = XLSX.utils.aoa_to_sheet([txHeaders, ...txRows]);
  wsTx['!cols'] = [
    { wch: 18 }, { wch: 22 }, { wch: 12 }, { wch: 14 },
    { wch: 14 }, { wch: 10 }, { wch: 14 }, { wch: 14 }, { wch: 12 }, { wch: 10 },
  ];
  // Bold header row
  txHeaders.forEach((_, ci) => {
    const cell = XLSX.utils.encode_cell({ r: 0, c: ci });
    if (wsTx[cell]) wsTx[cell].s = headerStyle;
  });
  XLSX.utils.book_append_sheet(wb, wsTx, 'Transaksi');

  // ── Sheet 3: Detail Item ─────────────────────────────────────────
  const itemHeaders = [
    'ID Transaksi', 'Tanggal', 'Nama Produk', 'Barcode',
    'Qty', 'Harga Jual', 'Harga Modal', 'Subtotal', 'Laba',
  ];
  const itemRows: (string | number)[][] = [];
  transactions.forEach((t) => {
    t.items.forEach((item) => {
      const laba = (item.product.price - (item.product.costPrice ?? 0)) * item.quantity;
      itemRows.push([
        t.id,
        formatDT(t.date),
        item.product.name,
        item.product.barcode ?? '',
        item.quantity,
        item.product.price,
        item.product.costPrice ?? 0,
        item.product.price * item.quantity,
        laba,
      ]);
    });
  });

  const wsItems = XLSX.utils.aoa_to_sheet([itemHeaders, ...itemRows]);
  wsItems['!cols'] = [
    { wch: 18 }, { wch: 20 }, { wch: 22 }, { wch: 16 },
    { wch: 6 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 },
  ];
  itemHeaders.forEach((_, ci) => {
    const cell = XLSX.utils.encode_cell({ r: 0, c: ci });
    if (wsItems[cell]) wsItems[cell].s = headerStyle;
  });
  XLSX.utils.book_append_sheet(wb, wsItems, 'Detail Item');

  return wb;
}

/** Download file .xlsx langsung ke device */
export function downloadExcel(
  transactions: Transaction[],
  store: StoreInfo,
  periodLabel: string,
) {
  const wb = buildWorkbook(transactions, store, periodLabel);
  const date = new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
    .format(new Date()).replace(/ /g, '_');
  const filename = `Laporan_${store.storeName.replace(/\s+/g, '_')}_${periodLabel}_${date}.xlsx`;
  XLSX.writeFile(wb, filename);
}

/** Konversi workbook ke Blob untuk upload */
export function workbookToBlob(wb: XLSX.WorkBook): Blob {
  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return new Blob([buf], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}
