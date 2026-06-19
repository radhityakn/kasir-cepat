import { useState, useMemo } from 'react';
import { Search, Filter, ChevronDown, ChevronUp, Receipt, Archive, ClipboardCheck, AlertCircle } from 'lucide-react';
import type { Transaction } from '../types';
import { formatRupiah } from '../utils/format';
import { useStoreRole } from '../context/StoreContext';
import { useTransactions } from '../hooks/useTransactions';

interface HistoryPageProps {
  transactions: Transaction[];
}

const paymentLabels: Record<string, string> = {
  cash: 'Tunai',
  qris: 'QRIS',
  transfer: 'Transfer',
  card: 'Kartu',
};

const paymentColors: Record<string, string> = {
  cash: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  qris: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  transfer: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  card: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
};

type Tab = 'active' | 'archive';

function formatTrxLabel(date: Date): string {
  const d = new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }).format(date).replace(/ /g, '');
  const t = new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false }).format(date).replace(':', '.');
  return `TRX/${d}/${t}`;
}

function formatPeriod(start: string, end: string): string {
  const s = new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(start));
  const e = new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(end));
  return `${s} — ${e}`;
}

export default function HistoryPage({ transactions: _allTransactions }: HistoryPageProps) {
  const { isOwner, doRecap, recapHistory } = useStoreRole();
  const { activeTransactions, archivedTransactions } = useTransactions();

  const [tab, setTab] = useState<Tab>('active');
  const [search, setSearch] = useState('');
  const [filterMethod, setFilterMethod] = useState('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showFilter, setShowFilter] = useState(false);
  const [showRecapModal, setShowRecapModal] = useState(false);
  const [recapLoading, setRecapLoading] = useState(false);
  const [recapError, setRecapError] = useState<string | null>(null);

  // Use Supabase-split data if available, fallback to props
  const currentList = tab === 'active'
    ? (activeTransactions.length > 0 || archivedTransactions.length > 0 ? activeTransactions : _allTransactions)
    : archivedTransactions;

  const filtered = useMemo(() => {
    return currentList.filter((t) => {
      const matchSearch =
        t.id.toLowerCase().includes(search.toLowerCase()) ||
        (t.customer?.toLowerCase().includes(search.toLowerCase()) ?? false);
      const matchMethod = filterMethod === 'all' || t.paymentMethod === filterMethod;
      return matchSearch && matchMethod;
    });
  }, [currentList, search, filterMethod]);

  const totalRevenue = filtered.reduce((sum, t) => sum + t.grandTotal, 0);

  const handleRecap = async () => {
    setRecapLoading(true);
    setRecapError(null);
    const { error } = await doRecap();
    if (error) {
      setRecapError(error);
    } else {
      setShowRecapModal(false);
    }
    setRecapLoading(false);
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 px-4 pt-4 pb-0 border-b border-gray-100 dark:border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Riwayat Transaksi</h2>
            <p className="text-xs text-gray-400 dark:text-gray-500">{filtered.length} transaksi</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-400 dark:text-gray-500">
              {tab === 'active' ? 'Pemasukan Periode Ini' : 'Total Arsip'}
            </p>
            <p className="text-base font-bold text-brand">{formatRupiah(totalRevenue)}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-3">
          <button
            onClick={() => setTab('active')}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 text-sm font-semibold rounded-xl transition-all ${
              tab === 'active'
                ? 'bg-brand text-white shadow-sm'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
            }`}
          >
            <Receipt size={14} />
            Aktif
          </button>
          <button
            onClick={() => setTab('archive')}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 text-sm font-semibold rounded-xl transition-all ${
              tab === 'archive'
                ? 'bg-brand text-white shadow-sm'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
            }`}
          >
            <Archive size={14} />
            Arsip
            {recapHistory.length > 0 && (
              <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded-full">{recapHistory.length}</span>
            )}
          </button>
        </div>

        {/* Search + Filter (only on active tab or if archive has items) */}
        <div className="flex gap-2 pb-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Cari transaksi..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field pl-9"
            />
          </div>
          <button
            onClick={() => setShowFilter(!showFilter)}
            className={`flex items-center gap-1 px-3 py-2.5 rounded-xl text-sm font-medium border transition-all ${
              filterMethod !== 'all' || showFilter
                ? 'border-brand bg-primary-50 dark:bg-primary-900/20 text-brand'
                : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
            }`}
          >
            <Filter size={14} />
          </button>
        </div>

        {showFilter && (
          <div className="flex gap-2 pb-3 flex-wrap">
            {[
              { id: 'all', label: 'Semua' },
              { id: 'cash', label: 'Tunai' },
              { id: 'qris', label: 'QRIS' },
              { id: 'transfer', label: 'Transfer' },
              { id: 'card', label: 'Kartu' },
            ].map((method) => (
              <button
                key={method.id}
                onClick={() => setFilterMethod(method.id)}
                className={`text-xs font-medium px-3 py-1.5 rounded-full transition-all ${
                  filterMethod === method.id
                    ? 'bg-brand text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {method.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 pb-24 md:pb-4">

        {/* Recap button (owner only, active tab only) */}
        {tab === 'active' && isOwner && activeTransactions.length > 0 && (
          <button
            onClick={() => { setShowRecapModal(true); setRecapError(null); }}
            className="w-full mb-3 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-dashed border-brand/30 bg-primary-50/50 dark:bg-primary-900/10 text-brand font-semibold text-sm hover:border-brand/60 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-all"
          >
            <ClipboardCheck size={16} />
            Rekap {activeTransactions.length} Transaksi
          </button>
        )}

        {/* Archive: recap periods summary */}
        {tab === 'archive' && recapHistory.length > 0 && (
          <div className="mb-4 space-y-2">
            {recapHistory.map((recap) => (
              <div key={recap.id} className="card p-3 flex items-center gap-3">
                <div className="w-9 h-9 bg-gray-100 dark:bg-gray-700 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Archive size={16} className="text-gray-500 dark:text-gray-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-gray-800 dark:text-gray-100">
                    {formatPeriod(recap.periodStart, recap.periodEnd)}
                  </p>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500">
                    {recap.totalTransactions} transaksi
                  </p>
                </div>
                <p className="text-sm font-bold text-brand flex-shrink-0">
                  {formatRupiah(recap.totalRevenue)}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Transaction list */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48">
            <Receipt size={48} className="mb-3 text-gray-200 dark:text-gray-700" />
            <p className="text-sm text-gray-400 dark:text-gray-500">
              {tab === 'active' ? 'Belum ada transaksi di periode ini' : 'Tidak ada transaksi di arsip'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((transaction) => {
              const isExpanded = expandedId === transaction.id;
              return (
                <div key={transaction.id} className="card overflow-hidden">
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : transaction.id)}
                    className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    <div className="w-10 h-10 bg-primary-50 dark:bg-primary-900/20 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Receipt size={18} className="text-brand" />
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-gray-800 dark:text-gray-100">
                          {formatTrxLabel(transaction.date)}
                        </p>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${paymentColors[transaction.paymentMethod]}`}>
                          {paymentLabels[transaction.paymentMethod]}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                        {transaction.id.slice(0, 8)}…
                        {transaction.customer && ` · ${transaction.customer}`}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-bold text-gray-900 dark:text-white">{formatRupiah(transaction.grandTotal)}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">{transaction.items.length} item</p>
                    </div>
                    {isExpanded
                      ? <ChevronUp size={16} className="text-gray-400 dark:text-gray-500 ml-1" />
                      : <ChevronDown size={16} className="text-gray-400 dark:text-gray-500 ml-1" />
                    }
                  </button>

                  {isExpanded && (
                    <div className="px-4 pb-3 border-t border-gray-100 dark:border-gray-700">
                      <div className="space-y-2 pt-3">
                        {transaction.items.map((item, idx) => (
                          <div key={idx} className="flex justify-between items-center text-sm">
                            <div className="flex items-center gap-2">
                              <span className="text-base">{item.product.image}</span>
                              <span className="text-gray-700 dark:text-gray-300">{item.product.name}</span>
                            </div>
                            <div className="text-right">
                              <span className="text-gray-500 dark:text-gray-400 mr-2">x{item.quantity}</span>
                              <span className="font-semibold text-gray-800 dark:text-gray-100">
                                {formatRupiah(item.product.price * item.quantity)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="border-t border-gray-100 dark:border-gray-700 mt-3 pt-3 space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500 dark:text-gray-400">Subtotal</span>
                          <span className="text-gray-800 dark:text-gray-100">{formatRupiah(transaction.total)}</span>
                        </div>
                        {transaction.discount > 0 && (
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-500 dark:text-gray-400">Diskon</span>
                            <span className="text-red-500">-{formatRupiah(transaction.discount)}</span>
                          </div>
                        )}
                        <div className="flex justify-between text-sm font-bold border-t border-gray-100 dark:border-gray-700 pt-2 mt-2">
                          <span className="text-gray-900 dark:text-white">Total</span>
                          <span className="text-brand">{formatRupiah(transaction.grandTotal)}</span>
                        </div>
                        {transaction.paymentMethod === 'cash' && transaction.change > 0 && (
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-500 dark:text-gray-400">Kembalian</span>
                            <span className="text-gray-800 dark:text-gray-100">{formatRupiah(transaction.change)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Recap Confirmation Modal */}
      {showRecapModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-sm w-full p-6 space-y-4">
            <div className="text-center">
              <div className="w-14 h-14 bg-primary-50 dark:bg-primary-900/20 rounded-full flex items-center justify-center mx-auto mb-3">
                <ClipboardCheck size={28} className="text-brand" />
              </div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white">Rekap Transaksi?</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                Rekap <b>{activeTransactions.length} transaksi</b> dengan total{' '}
                <b className="text-brand">{formatRupiah(activeTransactions.reduce((s, t) => s + t.grandTotal, 0))}</b>.
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                Transaksi akan dipindahkan ke tab Arsip. Periode baru akan dimulai dari sekarang.
              </p>
            </div>

            {recapError && (
              <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-xl">
                <AlertCircle size={14} />
                {recapError}
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => setShowRecapModal(false)}
                className="btn-secondary flex-1"
                disabled={recapLoading}
              >
                Batal
              </button>
              <button
                onClick={handleRecap}
                disabled={recapLoading}
                className="btn-primary flex-1 disabled:opacity-50"
              >
                {recapLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Merekap...
                  </span>
                ) : (
                  'Konfirmasi Rekap'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
