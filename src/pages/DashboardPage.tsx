import { useMemo, useState } from 'react';
import {
  BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { TrendingUp, ShoppingBag, DollarSign, ArrowUpRight, ArrowDownRight, Minus, FileSpreadsheet } from 'lucide-react';
import type { Transaction, PeriodTab } from '../types';
import { formatRupiah } from '../utils/format';
import { useApp } from '../context/AppContext';
import { useStore } from '../context/StoreContext';
import ExportModal from '../components/ExportModal';

const PIE_COLORS = ['#00C853', '#4ade80', '#86efac', '#6ee7b7', '#bbf7d0'];

const formatShortRupiah = (value: number) => {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}jt`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}rb`;
  return String(value);
};

/** Hitung laba kotor dari sebuah transaksi */
function calcProfit(tx: Transaction): number {
  const revenue = tx.grandTotal;
  const cogs = tx.items.reduce(
    (sum, item) => sum + (item.product.costPrice ?? 0) * item.quantity,
    0
  );
  // Biaya modal dikurangi proporsional terhadap diskon
  const discountRatio = tx.total > 0 ? tx.grandTotal / tx.total : 1;
  return revenue - cogs * discountRatio;
}

/** Bandingkan dua angka dan kembalikan info perubahan */
function calcChange(curr: number, prev: number) {
  if (prev === 0) return { pct: null, up: true };
  const pct = ((curr - prev) / prev) * 100;
  return { pct, up: pct >= 0 };
}

const TABS: { id: PeriodTab; label: string }[] = [
  { id: 'daily',   label: 'Harian' },
  { id: 'weekly',  label: 'Mingguan' },
  { id: 'monthly', label: 'Bulanan' },
];

export default function DashboardPage() {
  const { darkMode } = useApp();
  const { transactions } = useStore();
  const [period, setPeriod] = useState<PeriodTab>('daily');
  const [showExport, setShowExport] = useState(false);
  const today = new Date();

  // ── Recharts adaptive styles ──────────────────────────────────────
  const axisColor    = darkMode ? '#6b7280' : '#9ca3af';
  const gridColor    = darkMode ? '#374151' : '#f0f0f0';
  const tooltipStyle = darkMode
    ? { borderRadius: '12px', border: '1px solid #374151', fontSize: '12px', backgroundColor: '#1f2937', color: '#f9fafb' }
    : { borderRadius: '12px', border: '1px solid #f0f0f0', fontSize: '12px', backgroundColor: '#ffffff' };

  // ── Period bounds ─────────────────────────────────────────────────
  const bounds = useMemo(() => {
    const startOf = (d: Date, unit: 'day' | 'week' | 'month') => {
      const r = new Date(d);
      if (unit === 'day')   { r.setHours(0,0,0,0); return r; }
      if (unit === 'week')  { r.setDate(r.getDate() - r.getDay()); r.setHours(0,0,0,0); return r; }
      if (unit === 'month') { r.setDate(1); r.setHours(0,0,0,0); return r; }
      return r;
    };
    const prevStart = (d: Date, unit: 'day' | 'week' | 'month') => {
      const r = new Date(startOf(d, unit));
      if (unit === 'day')   r.setDate(r.getDate() - 1);
      if (unit === 'week')  r.setDate(r.getDate() - 7);
      if (unit === 'month') r.setMonth(r.getMonth() - 1);
      return r;
    };

    const unit = period === 'daily' ? 'day' : period === 'weekly' ? 'week' : 'month';
    const currStart = startOf(today, unit);
    const prevStartDate = prevStart(today, unit);
    const prevEnd = new Date(currStart); prevEnd.setMilliseconds(-1);

    return { currStart, prevStartDate, prevEnd };
  }, [period, today]);

  // ── Current & previous period transactions ────────────────────────
  const { currTxs, prevTxs } = useMemo(() => {
    const curr = transactions.filter(t => t.date >= bounds.currStart && t.date <= today);
    const prev = transactions.filter(t => t.date >= bounds.prevStartDate && t.date <= bounds.prevEnd);
    return { currTxs: curr, prevTxs: prev };
  }, [transactions, bounds, today]);

  // ── Summary numbers ───────────────────────────────────────────────
  const summary = useMemo(() => {
    const revenue  = currTxs.reduce((s, t) => s + t.grandTotal, 0);
    const cogs     = currTxs.reduce((s, t) => s + t.items.reduce((si, i) => si + (i.product.costPrice ?? 0) * i.quantity, 0), 0);
    const profit   = currTxs.reduce((s, t) => s + calcProfit(t), 0);
    const txCount  = currTxs.length;
    const margin   = revenue > 0 ? (profit / revenue) * 100 : 0;

    const prevRevenue = prevTxs.reduce((s, t) => s + t.grandTotal, 0);
    const prevProfit  = prevTxs.reduce((s, t) => s + calcProfit(t), 0);

    return {
      revenue, cogs, profit, txCount, margin,
      revenueChange: calcChange(revenue, prevRevenue),
      profitChange:  calcChange(profit, prevProfit),
    };
  }, [currTxs, prevTxs]);

  // ── Chart data ────────────────────────────────────────────────────
  const chartData = useMemo(() => {
    if (period === 'daily') {
      // Last 7 days
      return Array.from({ length: 7 }, (_, i) => {
        const d = new Date(today);
        d.setDate(d.getDate() - (6 - i));
        const dayTxs = transactions.filter(t => t.date.toDateString() === d.toDateString());
        const revenue = dayTxs.reduce((s, t) => s + t.grandTotal, 0);
        const profit  = dayTxs.reduce((s, t) => s + calcProfit(t), 0);
        return {
          label: new Intl.DateTimeFormat('id-ID', { weekday: 'short' }).format(d),
          revenue,
          profit,
        };
      });
    }

    if (period === 'weekly') {
      // Last 4 weeks
      return Array.from({ length: 4 }, (_, i) => {
        const weekEnd   = new Date(today);
        weekEnd.setDate(weekEnd.getDate() - i * 7);
        const weekStart = new Date(weekEnd);
        weekStart.setDate(weekEnd.getDate() - 6);
        weekStart.setHours(0, 0, 0, 0);
        weekEnd.setHours(23, 59, 59, 999);

        const wTxs    = transactions.filter(t => t.date >= weekStart && t.date <= weekEnd);
        const revenue = wTxs.reduce((s, t) => s + t.grandTotal, 0);
        const profit  = wTxs.reduce((s, t) => s + calcProfit(t), 0);
        return {
          label: `Mg ${4 - i}`,
          revenue,
          profit,
        };
      }).reverse();
    }

    // Monthly — last 6 months
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(today.getFullYear(), today.getMonth() - (5 - i), 1);
      const mStart = new Date(d.getFullYear(), d.getMonth(), 1);
      const mEnd   = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);

      const mTxs    = transactions.filter(t => t.date >= mStart && t.date <= mEnd);
      const revenue = mTxs.reduce((s, t) => s + t.grandTotal, 0);
      const profit  = mTxs.reduce((s, t) => s + calcProfit(t), 0);
      return {
        label: new Intl.DateTimeFormat('id-ID', { month: 'short' }).format(d),
        revenue,
        profit,
      };
    });
  }, [period, transactions, today]);

  // ── Payment breakdown (current period) ───────────────────────────
  const paymentData = useMemo(() => {
    const counts: Record<string, number> = {};
    currTxs.forEach(t => {
      counts[t.paymentMethod] = (counts[t.paymentMethod] || 0) + t.grandTotal;
    });
    const labels: Record<string, string> = { cash: 'Tunai', qris: 'QRIS', transfer: 'Transfer', card: 'Kartu' };
    return Object.entries(counts).map(([key, value]) => ({ name: labels[key] || key, value }));
  }, [currTxs]);

  // ── Top products by profit (current period) ───────────────────────
  const topByProfit = useMemo(() => {
    const map: Record<string, { name: string; image: string; profit: number; qty: number }> = {};
    currTxs.forEach(t => {
      t.items.forEach(item => {
        const key = item.product.id;
        if (!map[key]) map[key] = { name: item.product.name, image: item.product.image, profit: 0, qty: 0 };
        map[key].profit += (item.product.price - (item.product.costPrice ?? 0)) * item.quantity;
        map[key].qty    += item.quantity;
      });
    });
    return Object.values(map).sort((a, b) => b.profit - a.profit).slice(0, 5);
  }, [currTxs]);

  // ── Period label ──────────────────────────────────────────────────
  const periodLabel = useMemo(() => {
    if (period === 'daily')   return 'Hari ini';
    if (period === 'weekly')  return 'Minggu ini';
    return 'Bulan ini';
  }, [period]);

  const prevLabel = useMemo(() => {
    if (period === 'daily')   return 'kemarin';
    if (period === 'weekly')  return 'minggu lalu';
    return 'bulan lalu';
  }, [period]);

  function ChangeChip({ change }: { change: { pct: number | null; up: boolean } }) {
    if (change.pct === null) return <span className="text-[10px] text-gray-400">–</span>;
    const abs = Math.abs(change.pct).toFixed(1);
    if (change.pct === 0) return (
      <span className="flex items-center gap-0.5 text-[10px] text-gray-400">
        <Minus size={10} />{abs}%
      </span>
    );
    return change.up ? (
      <span className="flex items-center gap-0.5 text-[10px] font-semibold text-green-500">
        <ArrowUpRight size={11} />+{abs}%
      </span>
    ) : (
      <span className="flex items-center gap-0.5 text-[10px] font-semibold text-red-400">
        <ArrowDownRight size={11} />-{abs}%
      </span>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* ── Header + Period Tabs ── */}
      <div className="bg-white dark:bg-gray-800 px-4 pt-4 pb-0 border-b border-gray-100 dark:border-gray-700">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Laporan</h2>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
              {new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }).format(today)}
            </p>
          </div>
          {/* Export button */}
          <button
            onClick={() => setShowExport(true)}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl bg-primary-50 dark:bg-primary-900/20 text-brand hover:bg-primary-100 dark:hover:bg-primary-900/30 transition-colors"
          >
            <FileSpreadsheet size={14} />
            Export Excel
          </button>
        </div>
        {/* Period tabs */}
        <div className="flex gap-1">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setPeriod(tab.id)}
              className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-all ${
                period === tab.id
                  ? 'border-brand text-brand'
                  : 'border-transparent text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 pb-24 md:pb-6 space-y-4">

        {/* ── Summary Cards ── */}
        <div className="grid grid-cols-2 gap-3">
          {/* Pendapatan */}
          <div className="card p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                <DollarSign size={16} className="text-blue-600 dark:text-blue-400" />
              </div>
              <ChangeChip change={summary.revenueChange} />
            </div>
            <p className="text-base font-extrabold text-gray-900 dark:text-white leading-tight">
              {formatRupiah(summary.revenue)}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Pendapatan</p>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">{periodLabel} vs {prevLabel}</p>
          </div>

          {/* Keuntungan */}
          <div className="card p-4 border-brand/20 dark:border-brand/20">
            <div className="flex items-center justify-between mb-2">
              <div className="w-8 h-8 rounded-xl bg-green-50 dark:bg-green-900/20 flex items-center justify-center">
                <TrendingUp size={16} className="text-brand" />
              </div>
              <ChangeChip change={summary.profitChange} />
            </div>
            <p className="text-base font-extrabold text-brand leading-tight">
              {formatRupiah(summary.profit)}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Keuntungan</p>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">{periodLabel} vs {prevLabel}</p>
          </div>

          {/* Transaksi */}
          <div className="card p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center">
                <ShoppingBag size={16} className="text-purple-600 dark:text-purple-400" />
              </div>
            </div>
            <p className="text-base font-extrabold text-gray-900 dark:text-white leading-tight">
              {summary.txCount}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Transaksi</p>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">{periodLabel}</p>
          </div>

          {/* Margin — hidden */}
        </div>

        {/* ── Revenue vs Profit Bar Chart ── */}
        <div className="card p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100">
              Pendapatan &amp; Keuntungan
            </h3>
            <span className="text-xs text-gray-400 dark:text-gray-500">
              {period === 'daily' ? '7 hari' : period === 'weekly' ? '4 minggu' : '6 bulan'}
            </span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} margin={{ top: 4, right: 4, left: -16, bottom: 0 }} barGap={3}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: axisColor }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: axisColor }} axisLine={false} tickLine={false} tickFormatter={formatShortRupiah} />
              <Tooltip
                formatter={(value: number, name: string) => [
                  formatRupiah(value),
                  name === 'revenue' ? 'Pendapatan' : 'Keuntungan',
                ]}
                contentStyle={tooltipStyle}
              />
              <Legend
                formatter={(value) => (
                  <span className="text-xs" style={{ color: axisColor }}>
                    {value === 'revenue' ? 'Pendapatan' : 'Keuntungan'}
                  </span>
                )}
              />
              <Bar dataKey="revenue" fill="#93c5fd" radius={[4, 4, 0, 0]} maxBarSize={32} />
              <Bar dataKey="profit"  fill="#00C853" radius={[4, 4, 0, 0]} maxBarSize={32} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* ── Profit Trend Area ── */}
        <div className="card p-4">
          <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100 mb-4">
            Tren Keuntungan
          </h3>
          <ResponsiveContainer width="100%" height={150}>
            <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
              <defs>
                <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#00C853" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#00C853" stopOpacity={0}   />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: axisColor }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: axisColor }} axisLine={false} tickLine={false} tickFormatter={formatShortRupiah} />
              <Tooltip
                formatter={(value: number) => [formatRupiah(value), 'Keuntungan']}
                contentStyle={tooltipStyle}
              />
              <Area type="monotone" dataKey="profit" stroke="#00C853" strokeWidth={2.5} fill="url(#profitGrad)" dot={{ r: 3, fill: '#00C853' }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* ── Bottom Row ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Top Produk by Profit */}
          <div className="card p-4">
            <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100 mb-3">
              Produk Paling Untung
            </h3>
            {topByProfit.length === 0 ? (
              <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-4">Belum ada data</p>
            ) : (
              <div className="space-y-3">
                {topByProfit.map((product, i) => {
                  const maxProfit = topByProfit[0].profit;
                  const barWidth = maxProfit > 0 ? (product.profit / maxProfit) * 100 : 0;
                  return (
                    <div key={i}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold text-gray-300 dark:text-gray-600 w-4 flex-shrink-0">{i + 1}</span>
                        <span className="text-base">{product.image}</span>
                        <p className="text-xs font-semibold text-gray-800 dark:text-gray-100 flex-1 truncate">
                          {product.name}
                        </p>
                        <p className="text-xs font-bold text-brand flex-shrink-0">{formatRupiah(product.profit)}</p>
                      </div>
                      {/* progress bar */}
                      <div className="ml-6 h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-brand rounded-full transition-all duration-500"
                          style={{ width: `${barWidth}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Metode Pembayaran */}
          <div className="card p-4">
            <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100 mb-3">Metode Pembayaran</h3>
            {paymentData.length === 0 ? (
              <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-4">Belum ada data</p>
            ) : (
              <div className="flex items-center gap-4">
                <ResponsiveContainer width={110} height={110}>
                  <PieChart>
                    <Pie data={paymentData} cx="50%" cy="50%" innerRadius={28} outerRadius={50} paddingAngle={3} dataKey="value">
                      {paymentData.map((_, index) => (
                        <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => [formatRupiah(value)]} contentStyle={tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-2">
                  {paymentData.map((item, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                        <span className="text-xs text-gray-600 dark:text-gray-300">{item.name}</span>
                      </div>
                      <span className="text-xs font-semibold text-gray-800 dark:text-gray-100">
                        {formatShortRupiah(item.value)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Detail Breakdown Card ── */}
        <div className="card p-4">
          <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100 mb-4">
            Rincian {periodLabel === 'Hari ini' ? 'Hari Ini' : periodLabel}
          </h3>
          <div className="space-y-3">
            {[
              { label: 'Total Pendapatan',  value: summary.revenue,              color: 'text-blue-500'  },
              { label: 'Harga Modal (HPP)', value: summary.cogs,                 color: 'text-red-500'   },
              { label: 'Laba Kotor',        value: summary.profit,               color: 'text-brand'     },
              { label: 'Jumlah Transaksi',  value: `${summary.txCount} trx`,     color: 'text-purple-500', isText: true },
            ].map((row) => (
              <div key={row.label} className="flex items-center justify-between py-2 border-b border-gray-50 dark:border-gray-700/50 last:border-0">
                <span className="text-sm text-gray-600 dark:text-gray-300">{row.label}</span>
                <span className={`text-sm font-bold ${row.color}`}>
                  {row.isText ? row.value : formatRupiah(row.value as number)}
                </span>
              </div>
            ))}
          </div>

        </div>

      </div>

      {/* Export Modal */}
      {showExport && (
        <ExportModal
          transactions={currTxs}
          periodLabel={periodLabel}
          onClose={() => setShowExport(false)}
        />
      )}
    </div>
  );
}