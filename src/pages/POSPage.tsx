import { useState, useMemo, useCallback, useRef } from 'react';
import { Search, Plus, Minus, Trash2, ShoppingBag, ChevronRight, X, Tag, Printer, Barcode, CheckCircle, AlertCircle, Camera } from 'lucide-react';
import type { Product, CartItem, Transaction } from '../types';
import { formatRupiah } from '../utils/format';
import { categories } from '../data/products';
import { useApp } from '../context/AppContext';
import { useStoreRole } from '../context/StoreContext';
import { printReceipt } from '../utils/printReceipt';
import ReceiptPreview from '../components/ReceiptPreview';
import { useBarcodeScanner } from '../hooks/useBarcodeScanner';
import CameraScanner from '../components/CameraScanner';
import QuickAddProduct from '../components/QuickAddProduct';

interface POSPageProps {
  products: Product[];
  onTransactionComplete: (transaction: Transaction) => void;
  onAddProduct: (product: Product) => void;
}

const paymentMethods = [
  { id: 'cash',     label: 'Tunai',    icon: '💵' },
  { id: 'qris',     label: 'QRIS',     icon: '📱' },
  { id: 'transfer', label: 'Transfer', icon: '🏦' },
  { id: 'card',     label: 'Kartu',    icon: '💳' },
] as const;

type PaymentStep = 'cart' | 'payment' | 'success';

export default function POSPage({ products, onTransactionComplete, onAddProduct }: POSPageProps) {
  const { settings } = useApp();
  const { membership } = useStoreRole();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Semua');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discount, setDiscount] = useState(0);
  const [discountInput, setDiscountInput] = useState('');
  const [discountMode, setDiscountMode] = useState<'nominal' | 'percent'>('nominal');
  const [showDiscountInput, setShowDiscountInput] = useState(false);
  const [paymentStep, setPaymentStep] = useState<PaymentStep>('cart');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'qris' | 'transfer' | 'card'>('cash');
  const [amountPaid, setAmountPaid] = useState('');
  const [lastTransaction, setLastTransaction] = useState<Transaction | null>(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [unknownBarcode, setUnknownBarcode] = useState<string | null>(null);

  // ── Barcode scanner ──
  const [scanToast, setScanToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showScanFeedback = useCallback((type: 'success' | 'error', message: string) => {
    setScanToast({ type, message });
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setScanToast(null), 2000);
  }, []);

  const handleBarcodeScan = useCallback((barcode: string) => {
    if (paymentStep !== 'cart') return;
    const product = products.find((p) => p.barcode === barcode);
    if (!product) {
      showScanFeedback('error', `Tidak ditemukan: ${barcode}`);
      setUnknownBarcode(barcode);
      return;
    }
    setCart((prev) => {
      const existing = prev.find((i) => i.product.id === product.id);
      if (existing) {
        return prev.map((i) =>
          i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
    showScanFeedback('success', product.name);
  }, [products, paymentStep, showScanFeedback]);

  useBarcodeScanner({ onScan: handleBarcodeScan, enabled: paymentStep === 'cart', minLength: 4 });

  const handleCameraScan = useCallback((barcode: string) => {
    const product = products.find((p) => p.barcode === barcode);
    if (!product) {
      showScanFeedback('error', `Tidak ditemukan: ${barcode}`);
      setUnknownBarcode(barcode);
      setShowCamera(false);
      return;
    }
    setCart((prev) => {
      const existing = prev.find((i) => i.product.id === product.id);
      if (existing) {
        return prev.map((i) =>
          i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
    showScanFeedback('success', product.name);
    setShowCamera(false);
  }, [products, showScanFeedback]);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchCategory = selectedCategory === 'Semua' || p.category === selectedCategory;
      const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
      return matchCategory && matchSearch;
    });
  }, [products, search, selectedCategory]);

  const cartTotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const grandTotal = cartTotal - discount;
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.product.id === product.id);
      if (existing) {
        return prev.map((i) =>
          i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const updateQty = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((i) => (i.product.id === productId ? { ...i, quantity: i.quantity + delta } : i))
        .filter((i) => i.quantity > 0)
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((i) => i.product.id !== productId));
  };

  const handleApplyDiscount = () => {
    const num = parseInt(discountInput) || 0;
    const val = discountMode === 'percent'
      ? Math.round((num / 100) * cartTotal)
      : num;
    setDiscount(Math.min(val, cartTotal));
    setShowDiscountInput(false);
    setDiscountInput('');
  };

  const handlePayment = () => {
    const paid = paymentMethod === 'cash'
      ? parseInt(amountPaid.replace(/\D/g, '')) || 0
      : grandTotal;
    if (paymentMethod === 'cash' && paid < grandTotal) return;

    const transaction: Transaction = {
      id: `TRX-${Date.now()}`,
      items: cart,
      total: cartTotal,
      discount,
      tax: 0,
      grandTotal,
      paymentMethod,
      amountPaid: paid,
      change: paid - grandTotal,
      cashier: membership?.nama ?? settings.cashierName,
      date: new Date(),
      status: 'completed',
    };

    setLastTransaction(transaction);
    onTransactionComplete(transaction);
    setPaymentStep('success');

    // Auto-print jika diaktifkan di pengaturan
    if (settings.autoPrint) {
      setTimeout(() => {
        printReceipt(transaction, {
          storeName: membership?.storeName ?? settings.storeName,
          address: membership?.storeAlamat ?? settings.address,
          phone: membership?.storeTelepon ?? settings.phone,
          cashierName: membership?.nama ?? settings.cashierName,
        });
      }, 300);
    }
  };

  const handleNewTransaction = () => {
    setCart([]);
    setDiscount(0);
    setDiscountInput('');
    setDiscountMode('nominal');
    setAmountPaid('');
    setPaymentMethod('cash');
    setPaymentStep('cart');
    setLastTransaction(null);
    setShowReceipt(false);
  };

  const quickAmounts = [
    grandTotal,
    Math.ceil(grandTotal / 10000) * 10000,
    Math.ceil(grandTotal / 50000) * 50000,
    Math.ceil(grandTotal / 100000) * 100000,
  ].filter((v, i, arr) => arr.indexOf(v) === i && v >= grandTotal).slice(0, 4);

  return (
    <div className="flex flex-col md:flex-row h-full min-h-screen bg-gray-50 dark:bg-gray-900">

      {/* ── Scan Toast ── */}
      {scanToast && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-lg text-sm font-semibold transition-all duration-300 ${
          scanToast.type === 'success'
            ? 'bg-brand text-white'
            : 'bg-red-500 text-white'
        }`}>
          {scanToast.type === 'success'
            ? <CheckCircle size={16} />
            : <AlertCircle size={16} />
          }
          <span className="max-w-[200px] truncate">{scanToast.message}</span>
        </div>
      )}

      {/* ── Product Panel ── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="bg-white dark:bg-gray-800 px-4 pt-4 pb-3 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Kasir</h2>
              <p className="text-xs text-gray-400 dark:text-gray-500">Pilih produk untuk ditambahkan</p>
            </div>
            {/* Scanner indicator */}
            {paymentStep === 'cart' && (
              <div className="flex items-center gap-1.5 bg-primary-50 dark:bg-primary-900/20 text-brand px-3 py-1.5 rounded-full">
                <Barcode size={13} />
                <span className="text-xs font-semibold">Scanner Aktif</span>
                <span className="w-1.5 h-1.5 rounded-full bg-brand animate-pulse" />
              </div>
            )}
          </div>
          <div className="relative mb-3 flex gap-2">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Cari produk..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input-field pl-9"
              />
            </div>
            <button
              onClick={() => setShowCamera(true)}
              className="w-10 h-10 rounded-xl bg-brand flex items-center justify-center text-white hover:bg-brand-dark active:scale-95 transition-all flex-shrink-0 shadow-sm"
              aria-label="Scan barcode via kamera"
              title="Scan Kamera"
            >
              <Camera size={18} />
            </button>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
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

        <div className="flex-1 overflow-y-auto p-4 bg-gray-50 dark:bg-gray-900">
          {filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-gray-400 dark:text-gray-500">
              <ShoppingBag size={40} className="mb-2 opacity-30" />
              <p className="text-sm">Produk tidak ditemukan</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {filteredProducts.map((product) => {
                const inCart = cart.find((i) => i.product.id === product.id);
                return (
                  <button
                    key={product.id}
                    onClick={() => addToCart(product)}
                    className={`card p-3 text-left transition-all hover:shadow-md active:scale-95 relative ${
                      inCart ? 'ring-2 ring-brand ring-offset-1 dark:ring-offset-gray-900' : ''
                    }`}
                  >
                    {inCart && (
                      <span className="absolute top-2 right-2 w-5 h-5 bg-brand text-white text-xs font-bold rounded-full flex items-center justify-center">
                        {inCart.quantity}
                      </span>
                    )}
                    <div className="text-3xl mb-2 h-10 flex items-center">{product.image}</div>
                    <p className="text-xs font-semibold text-gray-800 dark:text-gray-100 leading-tight line-clamp-2 mb-1">
                      {product.name}
                    </p>
                    <p className="text-sm font-bold text-brand">{formatRupiah(product.price)}</p>
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">Stok: {product.stock}</p>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Cart Panel ── */}
      <div className="md:w-80 lg:w-96 bg-white dark:bg-gray-800 flex flex-col border-l border-gray-100 dark:border-gray-700 md:min-h-screen pb-20 md:pb-0">

        {/* CART STEP */}
        {paymentStep === 'cart' && (
          <>
            <div className="px-4 py-4 border-b border-gray-100 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-gray-900 dark:text-white text-base">Keranjang</h3>
                {cart.length > 0 && (
                  <button
                    onClick={() => setCart([])}
                    className="text-xs text-red-400 hover:text-red-600 flex items-center gap-1"
                  >
                    <Trash2 size={12} />
                    Kosongkan
                  </button>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-2">
              {cart.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48">
                  <ShoppingBag size={40} className="mb-2 text-gray-200 dark:text-gray-600" />
                  <p className="text-sm text-gray-400 dark:text-gray-500">Keranjang kosong</p>
                  <p className="text-xs text-gray-300 dark:text-gray-600 mt-1">Tambahkan produk dari daftar</p>
                </div>
              ) : (
                <div className="space-y-2 py-2">
                  {cart.map((item) => (
                    <div key={item.product.id} className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-gray-50 dark:bg-gray-700 rounded-lg flex items-center justify-center text-lg flex-shrink-0">
                        {item.product.image}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-800 dark:text-gray-100 truncate">{item.product.name}</p>
                        <p className="text-xs text-brand font-medium">{formatRupiah(item.product.price)}</p>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <button
                          onClick={() => updateQty(item.product.id, -1)}
                          className="w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center justify-center text-gray-600 dark:text-gray-300 transition-colors"
                          aria-label="Kurangi"
                        >
                          <Minus size={12} />
                        </button>
                        <span className="text-sm font-bold w-5 text-center text-gray-800 dark:text-gray-100">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQty(item.product.id, 1)}
                          className="w-6 h-6 rounded-full bg-primary-100 dark:bg-primary-900/30 hover:bg-primary-200 dark:hover:bg-primary-900/50 flex items-center justify-center text-brand transition-colors"
                          aria-label="Tambah"
                        >
                          <Plus size={12} />
                        </button>
                        <button
                          onClick={() => removeFromCart(item.product.id)}
                          className="w-6 h-6 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center justify-center text-gray-300 dark:text-gray-600 hover:text-red-400 transition-colors ml-1"
                          aria-label="Hapus"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {cart.length > 0 && (
              <div className="px-4 py-4 border-t border-gray-100 dark:border-gray-700 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Subtotal</span>
                  <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">{formatRupiah(cartTotal)}</span>
                </div>

                {showDiscountInput ? (
                  <div className="space-y-2">
                    {/* Tab toggle */}
                    <div className="flex bg-gray-100 dark:bg-gray-700 rounded-xl p-0.5">
                      {(['nominal', 'percent'] as const).map((mode) => (
                        <button
                          key={mode}
                          onClick={() => { setDiscountMode(mode); setDiscountInput(''); }}
                          className={`flex-1 text-xs font-semibold py-1.5 rounded-lg transition-all ${
                            discountMode === mode
                              ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                              : 'text-gray-500 dark:text-gray-400'
                          }`}
                        >
                          {mode === 'nominal' ? 'Nominal (Rp)' : 'Persentase (%)'}
                        </button>
                      ))}
                    </div>

                    {/* Quick percent picks */}
                    {discountMode === 'percent' && (
                      <div className="flex gap-1.5 flex-wrap">
                        {[5, 10, 15, 20, 25, 50].map((pct) => (
                          <button
                            key={pct}
                            onClick={() => setDiscountInput(String(pct))}
                            className={`text-xs font-semibold px-2.5 py-1 rounded-lg transition-all ${
                              discountInput === String(pct)
                                ? 'bg-brand text-white'
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                            }`}
                          >
                            {pct}%
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Input row */}
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <input
                          type="number"
                          inputMode="numeric"
                          min={0}
                          max={discountMode === 'percent' ? 100 : cartTotal}
                          placeholder={discountMode === 'percent' ? 'Masukkan %' : 'Masukkan nominal'}
                          value={discountInput}
                          onChange={(e) => {
                            const raw = e.target.value.replace(/[^0-9]/g, '');
                            const num = parseInt(raw) || 0;
                            const max = discountMode === 'percent' ? 100 : cartTotal;
                            setDiscountInput(num > max ? String(max) : raw);
                          }}
                          onKeyDown={(e) => {
                            if (['-', '+', 'e', 'E', '.', ','].includes(e.key)) e.preventDefault();
                          }}
                          className="input-field text-sm no-spinner pr-9"
                          autoFocus
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 dark:text-gray-500 pointer-events-none">
                          {discountMode === 'percent' ? '%' : 'Rp'}
                        </span>
                      </div>
                      <button onClick={handleApplyDiscount} className="btn-primary text-sm py-2 px-3">
                        OK
                      </button>
                      <button
                        onClick={() => { setShowDiscountInput(false); setDiscountInput(''); }}
                        className="btn-secondary text-sm py-2 px-3"
                      >
                        <X size={14} />
                      </button>
                    </div>

                    {/* Live preview */}
                    {discountInput !== '' && parseInt(discountInput) > 0 && (
                      <div className="flex justify-between text-xs px-1">
                        <span className="text-gray-400 dark:text-gray-500">
                          {discountMode === 'percent'
                            ? `${discountInput}% dari ${formatRupiah(cartTotal)}`
                            : 'Nominal diskon'}
                        </span>
                        <span className="font-semibold text-brand">
                          -{formatRupiah(
                            discountMode === 'percent'
                              ? Math.round((parseInt(discountInput) / 100) * cartTotal)
                              : parseInt(discountInput)
                          )}
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <button
                    onClick={() => setShowDiscountInput(true)}
                    className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-brand transition-colors"
                  >
                    <Tag size={14} />
                    {discount > 0 ? (
                      <span className="text-brand font-medium">Diskon: -{formatRupiah(discount)}</span>
                    ) : (
                      <span>Tambah diskon</span>
                    )}
                  </button>
                )}

                <div className="flex items-center justify-between border-t border-gray-100 dark:border-gray-700 pt-3">
                  <span className="text-base font-bold text-gray-900 dark:text-white">Total</span>
                  <span className="text-xl font-extrabold text-brand">{formatRupiah(grandTotal)}</span>
                </div>

                <button
                  onClick={() => setPaymentStep('payment')}
                  className="btn-primary w-full text-base py-3"
                >
                  Bayar Sekarang
                  <ChevronRight size={18} />
                </button>
              </div>
            )}
          </>
        )}

        {/* PAYMENT STEP */}
        {paymentStep === 'payment' && (
          <div className="flex flex-col h-full">
            <div className="px-4 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center gap-3">
              <button
                onClick={() => setPaymentStep('cart')}
                className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                aria-label="Kembali"
              >
                <ChevronRight size={16} className="rotate-180 text-gray-600 dark:text-gray-300" />
              </button>
              <h3 className="font-bold text-gray-900 dark:text-white">Pembayaran</h3>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
              <div className="card p-4 text-center bg-primary-50 dark:bg-primary-900/20 border-primary-100 dark:border-primary-900/30">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total yang harus dibayar</p>
                <p className="text-3xl font-extrabold text-brand">{formatRupiah(grandTotal)}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{cartCount} item</p>
              </div>

              <div>
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                  Metode Pembayaran
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {paymentMethods.map((method) => (
                    <button
                      key={method.id}
                      onClick={() => setPaymentMethod(method.id)}
                      className={`flex items-center gap-2 p-3 rounded-xl border-2 transition-all text-sm font-medium ${
                        paymentMethod === method.id
                          ? 'border-brand bg-primary-50 dark:bg-primary-900/20 text-brand'
                          : 'border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-300 hover:border-gray-200 dark:hover:border-gray-600'
                      }`}
                    >
                      <span className="text-xl">{method.icon}</span>
                      {method.label}
                    </button>
                  ))}
                </div>
              </div>

              {paymentMethod === 'cash' && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                    Uang Diterima
                  </p>
                  <input
                    type="number"
                    inputMode="numeric"
                    placeholder="Masukkan nominal..."
                    value={amountPaid}
                    onChange={(e) => setAmountPaid(e.target.value)}
                    onKeyDown={(e) => {
                      if (['-', '+', 'e', 'E', '.', ','].includes(e.key)) e.preventDefault();
                    }}
                    className="input-field no-spinner text-base font-semibold mb-2"
                  />
                  <div className="flex flex-wrap gap-2">
                    {quickAmounts.map((amount) => (
                      <button
                        key={amount}
                        onClick={() => setAmountPaid(String(amount))}
                        className="text-xs bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 font-medium px-3 py-1.5 rounded-lg transition-colors"
                      >
                        {formatRupiah(amount)}
                      </button>
                    ))}
                  </div>
                  {amountPaid && parseInt(amountPaid) >= grandTotal && (
                    <div className="mt-3 p-3 bg-primary-50 dark:bg-primary-900/20 rounded-xl">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-300">Kembalian</span>
                        <span className="font-bold text-brand">
                          {formatRupiah(parseInt(amountPaid) - grandTotal)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="px-4 py-4 border-t border-gray-100 dark:border-gray-700">
              <button
                onClick={handlePayment}
                disabled={paymentMethod === 'cash' && (parseInt(amountPaid.replace(/\D/g, '')) || 0) < grandTotal}
                className="btn-primary w-full text-base py-3 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Konfirmasi Pembayaran
              </button>
            </div>
          </div>
        )}

        {/* SUCCESS STEP */}
        {paymentStep === 'success' && lastTransaction && (
          <div className="flex flex-col h-full">
            <div className="flex-1 flex flex-col items-center justify-center px-6 py-8">
              <div className="w-20 h-20 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center mb-4">
                <span className="text-4xl">✅</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">Transaksi Berhasil!</h3>
              <p className="text-sm text-gray-400 dark:text-gray-500 mb-6">{lastTransaction.id}</p>

              <div className="w-full card p-4 space-y-3 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Total</span>
                  <span className="font-semibold text-gray-800 dark:text-gray-100">{formatRupiah(lastTransaction.total)}</span>
                </div>
                {lastTransaction.discount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Diskon</span>
                    <span className="font-semibold text-red-500">-{formatRupiah(lastTransaction.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm border-t border-gray-100 dark:border-gray-700 pt-3">
                  <span className="font-bold text-gray-900 dark:text-white">Grand Total</span>
                  <span className="font-extrabold text-brand">{formatRupiah(lastTransaction.grandTotal)}</span>
                </div>
                {lastTransaction.paymentMethod === 'cash' && (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500 dark:text-gray-400">Dibayar</span>
                      <span className="font-semibold text-gray-800 dark:text-gray-100">{formatRupiah(lastTransaction.amountPaid)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500 dark:text-gray-400">Kembalian</span>
                      <span className="font-semibold text-brand">{formatRupiah(lastTransaction.change)}</span>
                    </div>
                  </>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Pembayaran</span>
                  <span className="font-semibold text-gray-800 dark:text-gray-100 capitalize">
                    {paymentMethods.find((m) => m.id === lastTransaction.paymentMethod)?.label}
                  </span>
                </div>
              </div>
            </div>

            <div className="px-4 py-4 border-t border-gray-100 dark:border-gray-700 space-y-2">
              <button
                onClick={() => setShowReceipt(true)}
                className="btn-secondary w-full"
              >
                <Printer size={16} />
                Preview &amp; Cetak Struk
              </button>
              <button onClick={handleNewTransaction} className="btn-primary w-full text-base py-3">
                Transaksi Baru
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Receipt preview modal */}
      {showReceipt && lastTransaction && (
        <ReceiptPreview
          transaction={lastTransaction}
          onClose={() => setShowReceipt(false)}
        />
      )}

      {/* Camera scanner */}
      {showCamera && (
        <CameraScanner
          onScan={handleCameraScan}
          onClose={() => setShowCamera(false)}
        />
      )}

      {/* Quick add product for unknown barcode */}
      {unknownBarcode && (
        <QuickAddProduct
          barcode={unknownBarcode}
          onAdd={(product) => {
            onAddProduct(product);
            // Langsung masukkan ke keranjang
            setCart((prev) => [...prev, { product, quantity: 1 }]);
            showScanFeedback('success', `${product.name} ditambahkan!`);
            setUnknownBarcode(null);
          }}
          onCancel={() => setUnknownBarcode(null)}
        />
      )}
    </div>
  );
}
