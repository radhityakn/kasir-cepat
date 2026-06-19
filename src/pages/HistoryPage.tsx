import { useState, useMemo } from 'react';
import { Search, Filter, ChevronDown, ChevronUp, Receipt } from 'lucide-react';
import type { Transaction } from '../types';
import { formatRupiah } from '../utils/format';

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

export default function HistoryPage({ transactions }: HistoryPageProps) {
  const [search, setSearch] = useState('');
  const [filterMethod, setFilterMethod] = useState('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showFilter, setShowFilter] = useState(false);

  const filtered = useMemo(() => {
    return transactions.filter((t) => {
      const matchSearch =
        t.id.toLowerCase().includes(search.toLowerCase()) ||
        (t.customer?.toLowerCase().includes(search.toLowerCase()) ?? false);
      const matchMethod = filterMethod === 'all' || t.paymentMethod === filterMethod;
      return matchSearch && matchMethod;
    });
  }, [transactions, search, filterMethod]);

  const totalRevenue = filtered.reduce((sum, t) => sum + t.grandTotal, 0);

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 px-4 pt-4 pb-3 border-b border-gray-100 dark:border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Riwayat Transaksi</h2>
            <p className="text-xs text-gray-400 dark:text-gray-500">{filtered.length} transaksi ditemukan</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-400 dark:text-gray-500">Total Pemasukan</p>
            <p className="text-base font-bold text-brand">{formatRupiah(totalRevenue)}</p>
          </div>
        </div>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Cari transaksi atau nama..."
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
            Filter
          </button>
        </div>

        {showFilter && (
          <div className="flex gap-2 mt-2 flex-wrap">
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

      {/* Transaction List */}
      <div className="flex-1 overflow-y-auto p-4 pb-24 md:pb-4">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64">
            <Receipt size={48} className="mb-3 text-gray-200 dark:text-gray-700" />
            <p className="text-sm text-gray-400 dark:text-gray-500">Tidak ada transaksi</p>
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
                          {`TRX/${new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }).format(transaction.date).replace(/ /g, '')}/${new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false }).format(transaction.date).replace(':', '.')}`}
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
    </div>
  );
}
