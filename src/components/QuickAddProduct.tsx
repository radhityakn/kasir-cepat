import { useState } from 'react';
import { X, Barcode, Package, Check } from 'lucide-react';
import type { Product } from '../types';
import { categories } from '../data/products';
import { searchOfflineByBarcode } from '../services/productApi';

interface QuickAddProductProps {
  barcode: string;
  onAdd: (product: Product) => void;
  onCancel: () => void;
}

export default function QuickAddProduct({ barcode, onAdd, onCancel }: QuickAddProductProps) {
  // Cek di offline DB untuk pre-fill nama
  const offlineMatch = searchOfflineByBarcode(barcode);

  const [name, setName] = useState(offlineMatch?.name ?? '');
  const [price, setPrice] = useState(0);
  const [costPrice, setCostPrice] = useState(0);
  const [category, setCategory] = useState('Lainnya');
  const [stock, setStock] = useState(50);

  const handleSave = () => {
    if (!name.trim() || price <= 0) return;
    const product: Product = {
      id: `p${Date.now()}`,
      barcode,
      name: name.trim().toUpperCase(),
      price,
      costPrice,
      category,
      image: '📦',
      stock,
      sold: 0,
    };
    onAdd(product);
  };

  const filteredCategories = categories.filter((c) => c !== 'Semua');

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end md:items-center justify-center p-0 md:p-4">
      <div className="bg-white dark:bg-gray-800 w-full md:max-w-sm rounded-t-3xl md:rounded-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center">
              <Package size={16} className="text-orange-500" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">Produk Baru</h3>
              <p className="text-[10px] text-gray-400">Barcode tidak dikenal</p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            aria-label="Tutup"
          >
            <X size={15} className="text-gray-600 dark:text-gray-300" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* Barcode display */}
          <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
            <Barcode size={18} className="text-gray-400 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-400 dark:text-gray-500">Barcode terdeteksi</p>
              <p className="text-sm font-mono font-bold text-gray-900 dark:text-white">{barcode}</p>
            </div>
            {offlineMatch && (
              <span className="text-[9px] bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-semibold px-2 py-0.5 rounded-full flex-shrink-0">
                DB Match
              </span>
            )}
          </div>

          {offlineMatch && (
            <p className="text-xs text-blue-500 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-3 py-2 rounded-lg">
              💡 Ditemukan di database: <strong>{offlineMatch.name}</strong>
              {offlineMatch.brand && ` (${offlineMatch.brand})`}
            </p>
          )}

          {/* Nama */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
              Nama Produk *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nama produk..."
              className="input-field text-sm"
              autoFocus
            />
          </div>

          {/* Harga Jual & Modal */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
                Harga Jual *
              </label>
              <input
                type="number"
                inputMode="numeric"
                value={price || ''}
                onChange={(e) => setPrice(parseInt(e.target.value) || 0)}
                placeholder="0"
                className="input-field text-sm no-spinner"
                onKeyDown={(e) => { if (['-','+','e','E','.',','].includes(e.key)) e.preventDefault(); }}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
                Harga Modal
              </label>
              <input
                type="number"
                inputMode="numeric"
                value={costPrice || ''}
                onChange={(e) => setCostPrice(parseInt(e.target.value) || 0)}
                placeholder="0"
                className="input-field text-sm no-spinner"
                onKeyDown={(e) => { if (['-','+','e','E','.',','].includes(e.key)) e.preventDefault(); }}
              />
            </div>
          </div>

          {/* Kategori & Stok */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
                Kategori
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="input-field text-sm"
              >
                {filteredCategories.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
                Stok Awal
              </label>
              <input
                type="number"
                inputMode="numeric"
                value={stock || ''}
                onChange={(e) => setStock(parseInt(e.target.value) || 0)}
                placeholder="0"
                className="input-field text-sm no-spinner"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <button onClick={onCancel} className="btn-secondary flex-1 py-2.5 text-sm">
              Lewati
            </button>
            <button
              onClick={handleSave}
              disabled={!name.trim() || price <= 0}
              className="btn-primary flex-1 py-2.5 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Check size={15} />
              Tambah & Masukkan
            </button>
          </div>

          <p className="text-[10px] text-gray-400 dark:text-gray-500 text-center">
            Produk akan ditambahkan ke inventory dan langsung masuk keranjang
          </p>
        </div>
      </div>
    </div>
  );
}
