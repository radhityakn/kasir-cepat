import { useState } from 'react';
import { Search, Plus, Edit2, Trash2, Package, X, Barcode, RefreshCw } from 'lucide-react';
import type { Product } from '../types';
import { formatRupiah } from '../utils/format';
import { categories, generateBarcode } from '../data/products';

interface ProductsPageProps {
  products: Product[];
  onAddProduct: (product: Product) => void;
  onUpdateProduct: (product: Product) => void;
  onDeleteProduct: (id: string) => void;
}

const EMOJI_OPTIONS = ['🍳','🍜','🍚','🍗','🧋','🥑','🍊','☕','💧','🥔','🥜','🧆','🚬','🧼','🧴','🍕','🍔','🌮','🥗','🍰'];

const emptyForm = (): Omit<Product, 'id' | 'sold'> => ({
  barcode: generateBarcode(),
  name: '',
  price: 0,
  costPrice: 0,
  category: 'Makanan',
  image: '🍳',
  stock: 0,
});

export default function ProductsPage({ products, onAddProduct, onUpdateProduct, onDeleteProduct }: ProductsPageProps) {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Semua');
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [form, setForm] = useState<Omit<Product, 'id' | 'sold'>>(emptyForm());
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [barcodeError, setBarcodeError] = useState('');

  const filtered = products.filter((p) => {
    const matchCat   = selectedCategory === 'Semua' || p.category === selectedCategory;
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase())
      || p.barcode.includes(search);
    return matchCat && matchSearch;
  });

  const handleOpenAdd = () => {
    setEditingProduct(null);
    setForm(emptyForm());
    setBarcodeError('');
    setShowModal(true);
  };

  const handleOpenEdit = (product: Product) => {
    setEditingProduct(product);
    setForm({
      barcode: product.barcode,
      name: product.name,
      price: product.price,
      costPrice: product.costPrice,
      category: product.category,
      image: product.image,
      stock: product.stock,
    });
    setBarcodeError('');
    setShowModal(true);
  };

  const handleSave = () => {
    if (!form.name || form.price <= 0) return;

    // Cek duplikasi barcode
    const duplicate = products.find(
      (p) => p.barcode === form.barcode && p.id !== editingProduct?.id
    );
    if (duplicate) {
      setBarcodeError(`Barcode sudah digunakan oleh "${duplicate.name}"`);
      return;
    }

    if (editingProduct) {
      onUpdateProduct({ ...editingProduct, ...form });
    } else {
      onAddProduct({ ...form, id: `p${Date.now()}`, sold: 0 });
    }
    setShowModal(false);
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 px-4 pt-4 pb-3 border-b border-gray-100 dark:border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Produk</h2>
            <p className="text-xs text-gray-400 dark:text-gray-500">{products.length} total produk</p>
          </div>
          <button onClick={handleOpenAdd} className="btn-primary text-sm py-2 px-4">
            <Plus size={16} />
            Tambah
          </button>
        </div>

        <div className="relative mb-3">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Cari nama atau barcode..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field pl-9"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`whitespace-nowrap text-xs font-medium px-3 py-1.5 rounded-full transition-all ${
                selectedCategory === cat
                  ? 'bg-brand text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Product List */}
      <div className="flex-1 overflow-y-auto p-4 pb-24 md:pb-4">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64">
            <Package size={48} className="mb-3 text-gray-200 dark:text-gray-700" />
            <p className="text-sm text-gray-400 dark:text-gray-500">Tidak ada produk</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((product) => (
              <div key={product.id} className="card px-4 py-3 flex items-center gap-3">
                <div className="w-12 h-12 bg-gray-50 dark:bg-gray-700 rounded-xl flex items-center justify-center text-2xl flex-shrink-0">
                  {product.image}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-800 dark:text-gray-100 truncate">{product.name}</p>
                  {/* Barcode badge */}
                  <div className="flex items-center gap-1 mt-0.5">
                    <Barcode size={11} className="text-gray-300 dark:text-gray-600 flex-shrink-0" />
                    <span className="text-[10px] font-mono text-gray-400 dark:text-gray-500">{product.barcode}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-sm font-bold text-brand">{formatRupiah(product.price)}</span>
                    <span className="text-xs text-gray-400 dark:text-gray-500">{product.category}</span>
                    <span className="text-xs text-gray-400 dark:text-gray-500">Stok: {product.stock}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => handleOpenEdit(product)}
                    className="w-8 h-8 rounded-lg bg-gray-50 dark:bg-gray-700 hover:bg-primary-50 dark:hover:bg-primary-900/20 flex items-center justify-center text-gray-400 hover:text-brand transition-colors"
                    aria-label="Edit produk"
                  >
                    <Edit2 size={14} />
                  </button>
                  {deleteConfirm === product.id ? (
                    <div className="flex gap-1">
                      <button
                        onClick={() => { onDeleteProduct(product.id); setDeleteConfirm(null); }}
                        className="text-xs bg-red-500 text-white px-2 py-1 rounded-lg hover:bg-red-600"
                      >
                        Hapus
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(null)}
                        className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-1 rounded-lg"
                      >
                        Batal
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeleteConfirm(product.id)}
                      className="w-8 h-8 rounded-lg bg-gray-50 dark:bg-gray-700 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center justify-center text-gray-400 hover:text-red-500 transition-colors"
                      aria-label="Hapus produk"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Modal Tambah/Edit ── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center p-0 md:p-4">
          <div className="bg-white dark:bg-gray-800 w-full md:max-w-md rounded-t-3xl md:rounded-2xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                {editingProduct ? 'Edit Produk' : 'Tambah Produk'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-600"
                aria-label="Tutup"
              >
                <X size={16} className="text-gray-600 dark:text-gray-300" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Emoji picker */}
              <div>
                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2 block">
                  Ikon Produk
                </label>
                <div className="flex flex-wrap gap-2">
                  {EMOJI_OPTIONS.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => setForm({ ...form, image: emoji })}
                      className={`w-10 h-10 rounded-xl text-xl flex items-center justify-center transition-all ${
                        form.image === emoji
                          ? 'bg-primary-100 dark:bg-primary-900/30 ring-2 ring-brand scale-110'
                          : 'bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600'
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              {/* Barcode */}
              <div>
                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5 block">
                  Barcode / SKU
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Barcode size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      value={form.barcode}
                      onChange={(e) => {
                        setForm({ ...form, barcode: e.target.value.replace(/\s/g, '') });
                        setBarcodeError('');
                      }}
                      placeholder="Scan atau ketik kode..."
                      className="input-field pl-9 font-mono text-sm"
                      // data-barcode-input agar scanner tetap bisa mengisi field ini
                      data-barcode-input="true"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => { setForm({ ...form, barcode: generateBarcode() }); setBarcodeError(''); }}
                    className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-600 flex-shrink-0 transition-colors"
                    title="Generate barcode baru"
                    aria-label="Generate barcode otomatis"
                  >
                    <RefreshCw size={15} className="text-gray-500 dark:text-gray-400" />
                  </button>
                </div>
                {barcodeError && (
                  <p className="text-xs text-red-500 mt-1">{barcodeError}</p>
                )}
                <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">
                  Bisa scan langsung dengan barcode scanner ke kolom ini
                </p>
              </div>

              {/* Nama */}
              <div>
                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5 block">
                  Nama Produk
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Nama produk..."
                  className="input-field"
                />
              </div>

              {/* Harga Jual */}
              <div>
                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5 block">
                  Harga Jual (Rp)
                </label>
                <input
                  type="number"
                  value={form.price || ''}
                  onChange={(e) => setForm({ ...form, price: parseInt(e.target.value) || 0 })}
                  placeholder="0"
                  className="input-field no-spinner"
                />
              </div>

              {/* Harga Modal */}
              <div>
                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5 block">
                  Harga Modal (Rp)
                </label>
                <input
                  type="number"
                  value={form.costPrice || ''}
                  onChange={(e) => setForm({ ...form, costPrice: parseInt(e.target.value) || 0 })}
                  placeholder="0"
                  className="input-field no-spinner"
                />
                {form.price > 0 && form.costPrice > 0 && (
                  <p className="text-xs text-brand mt-1">
                    Margin: {formatRupiah(form.price - form.costPrice)} ({Math.round(((form.price - form.costPrice) / form.price) * 100)}%)
                  </p>
                )}
              </div>

              {/* Kategori */}
              <div>
                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5 block">
                  Kategori
                </label>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="input-field"
                >
                  {categories.filter((c) => c !== 'Semua').map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {/* Stok */}
              <div>
                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5 block">
                  Stok
                </label>
                <input
                  type="number"
                  value={form.stock || ''}
                  onChange={(e) => setForm({ ...form, stock: parseInt(e.target.value) || 0 })}
                  placeholder="0"
                  className="input-field no-spinner"
                />
              </div>

              <button
                onClick={handleSave}
                disabled={!form.name || form.price <= 0}
                className="btn-primary w-full py-3 text-base disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {editingProduct ? 'Simpan Perubahan' : 'Tambah Produk'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
