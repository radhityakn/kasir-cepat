import { X, Printer } from 'lucide-react';
import type { Transaction } from '../types';
import { formatRupiah, formatDateTime } from '../utils/format';
import { printReceipt } from '../utils/printReceipt';
import { useApp } from '../context/AppContext';

interface ReceiptPreviewProps {
  transaction: Transaction;
  onClose: () => void;
}

const PAYMENT_LABEL: Record<string, string> = {
  cash: 'Tunai',
  qris: 'QRIS',
  transfer: 'Transfer Bank',
  card: 'Kartu Debit/Kredit',
};

export default function ReceiptPreview({ transaction: tx, onClose }: ReceiptPreviewProps) {
  const { settings } = useApp();

  const handlePrint = () => {
    printReceipt(tx, {
      storeName: settings.storeName,
      address: settings.address,
      phone: settings.phone,
      cashierName: settings.cashierName,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end md:items-center justify-center p-0 md:p-4">
      <div className="bg-white dark:bg-gray-800 w-full md:max-w-sm rounded-t-3xl md:rounded-2xl max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-100 dark:border-gray-700 flex-shrink-0">
          <div className="flex items-center gap-2">
            <Printer size={18} className="text-brand" />
            <h3 className="text-base font-bold text-gray-900 dark:text-white">Preview Struk</h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            aria-label="Tutup"
          >
            <X size={15} className="text-gray-600 dark:text-gray-300" />
          </button>
        </div>

        {/* Receipt paper */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <div
            className="bg-white border border-gray-200 rounded-xl mx-auto shadow-sm overflow-hidden"
            style={{ fontFamily: "'Courier New', Courier, monospace", maxWidth: '320px' }}
          >
            {/* Store header */}
            <div className="text-center px-4 pt-4 pb-3 border-b border-dashed border-gray-300">
              <p className="font-bold text-base text-gray-900">{settings.storeName}</p>
              {settings.address && (
                <p className="text-[11px] text-gray-500 mt-0.5 leading-tight">{settings.address}</p>
              )}
              {settings.phone && (
                <p className="text-[11px] text-gray-500">Telp: {settings.phone}</p>
              )}
            </div>

            {/* Transaction info */}
            <div className="px-4 py-2 border-b border-dashed border-gray-300 space-y-0.5">
              {[
                { label: 'No', value: tx.id },
                { label: 'Tanggal', value: formatDateTime(tx.date) },
                { label: 'Kasir', value: settings.cashierName },
                { label: 'Bayar', value: PAYMENT_LABEL[tx.paymentMethod] ?? tx.paymentMethod },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between text-[11px]">
                  <span className="text-gray-500">{label}</span>
                  <span className="text-gray-800 font-medium">{value}</span>
                </div>
              ))}
            </div>

            {/* Items */}
            <div className="px-4 py-2 border-b border-dashed border-gray-300 space-y-1.5">
              {tx.items.map((item, i) => (
                <div key={i}>
                  <p className="text-[11px] text-gray-800 font-medium leading-tight">{item.product.name}</p>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-gray-500 pl-2">
                      {item.quantity}x {formatRupiah(item.product.price)}
                    </span>
                    <span className="text-gray-800">{formatRupiah(item.product.price * item.quantity)}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="px-4 py-2 border-b border-dashed border-gray-300 space-y-0.5">
              <div className="flex justify-between text-[11px]">
                <span className="text-gray-500">Subtotal</span>
                <span>{formatRupiah(tx.total)}</span>
              </div>
              {tx.discount > 0 && (
                <div className="flex justify-between text-[11px]">
                  <span className="text-gray-500">Diskon</span>
                  <span className="text-red-500">-{formatRupiah(tx.discount)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-bold pt-1">
                <span>TOTAL</span>
                <span>{formatRupiah(tx.grandTotal)}</span>
              </div>
              {tx.paymentMethod === 'cash' && (
                <>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-gray-500">Dibayar</span>
                    <span>{formatRupiah(tx.amountPaid)}</span>
                  </div>
                  <div className="flex justify-between text-[11px] font-semibold">
                    <span>Kembalian</span>
                    <span>{formatRupiah(tx.change)}</span>
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="text-center px-4 py-3 text-[10px] text-gray-400 leading-relaxed">
              <p>Terima kasih atas kunjungan Anda</p>
              <p>Barang yang sudah dibeli tidak dapat dikembalikan</p>
              <p className="mt-1 text-gray-300">* Kasir Cepat *</p>
            </div>
          </div>

          {/* Print tip */}
          <p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-3 px-4">
            Dialog cetak akan membuka semua printer yang terpasang di perangkat Anda
          </p>
        </div>

        {/* Actions */}
        <div className="px-5 py-4 border-t border-gray-100 dark:border-gray-700 flex gap-2 flex-shrink-0">
          <button
            onClick={onClose}
            className="btn-secondary flex-1 py-2.5"
          >
            <X size={15} />
            Tutup
          </button>
          <button
            onClick={handlePrint}
            className="btn-primary flex-1 py-2.5"
          >
            <Printer size={15} />
            Cetak Struk
          </button>
        </div>
      </div>
    </div>
  );
}
