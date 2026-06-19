import { useState } from 'react';
import { Store, Users, ArrowRight, KeyRound, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useStoreRole } from '../context/StoreContext';
import { validateStoreName, validatePersonName, validateInviteCode, sanitizeText, sanitizePhone } from '../lib/validation';

type Tab = 'owner' | 'cashier';

export default function OnboardingPage() {
  const { signOut, user } = useAuth();
  const { createStore, joinStore } = useStoreRole();
  const [tab, setTab] = useState<Tab>('owner');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Owner form state
  const [namaToko, setNamaToko] = useState('');
  const [namaPemilik, setNamaPemilik] = useState('');
  const [alamat, setAlamat] = useState('');
  const [telepon, setTelepon] = useState('');

  // Cashier form state
  const [inviteCode, setInviteCode] = useState('');
  const [namaKasir, setNamaKasir] = useState('');

  const handleCreateStore = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const storeCheck = validateStoreName(namaToko);
    if (!storeCheck.valid) { setError(storeCheck.error); return; }

    const nameCheck = validatePersonName(namaPemilik);
    if (!nameCheck.valid) { setError(nameCheck.error); return; }

    setLoading(true);
    const { error: err } = await createStore({
      namaToko: sanitizeText(namaToko),
      namaPemilik: sanitizeText(namaPemilik),
      alamat: sanitizeText(alamat) || undefined,
      telepon: sanitizePhone(telepon) || undefined,
    });

    if (err) setError(err);
    setLoading(false);
    // If success, useStoreRole will re-fetch membership → AuthGuard will redirect to app
  };

  const handleJoinStore = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const codeCheck = validateInviteCode(inviteCode);
    if (!codeCheck.valid) { setError(codeCheck.error); return; }

    const nameCheck = validatePersonName(namaKasir);
    if (!nameCheck.valid) { setError(nameCheck.error); return; }

    setLoading(true);
    const { error: err } = await joinStore({
      code: inviteCode.trim(),
      nama: sanitizeText(namaKasir),
    });

    if (err) setError(err);
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Selamat Datang!</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {user?.email} — Pilih cara untuk memulai
          </p>
        </div>

        {/* Card */}
        <div className="card p-6">
          {/* Tab toggle */}
          <div className="flex bg-gray-100 dark:bg-gray-700 rounded-xl p-1 mb-6">
            <button
              type="button"
              onClick={() => { setTab('owner'); setError(null); }}
              className={`flex-1 text-sm font-semibold py-2.5 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                tab === 'owner'
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              <Store size={14} />
              Buat Toko Baru
            </button>
            <button
              type="button"
              onClick={() => { setTab('cashier'); setError(null); }}
              className={`flex-1 text-sm font-semibold py-2.5 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                tab === 'cashier'
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              <Users size={14} />
              Gabung Toko
            </button>
          </div>

          {/* Owner Form */}
          {tab === 'owner' && (
            <form onSubmit={handleCreateStore} className="space-y-4">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                Buat toko baru dan jadi pemilik (owner). Nanti kamu bisa undang kasir.
              </p>

              <div>
                <label className="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide">
                  Nama Toko *
                </label>
                <input
                  type="text"
                  value={namaToko}
                  onChange={(e) => setNamaToko(e.target.value)}
                  placeholder="Warung Bu Siti"
                  className="input-field mt-1"
                  required
                  maxLength={100}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide">
                  Nama Pemilik *
                </label>
                <input
                  type="text"
                  value={namaPemilik}
                  onChange={(e) => setNamaPemilik(e.target.value)}
                  placeholder="Siti Nurhaliza"
                  className="input-field mt-1"
                  required
                  maxLength={100}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide">
                  Alamat
                </label>
                <input
                  type="text"
                  value={alamat}
                  onChange={(e) => setAlamat(e.target.value)}
                  placeholder="Jl. Pahlawan No. 5, Malang"
                  className="input-field mt-1"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide">
                  Telepon
                </label>
                <input
                  type="tel"
                  value={telepon}
                  onChange={(e) => setTelepon(e.target.value)}
                  placeholder="0341-7772345"
                  className="input-field mt-1"
                />
              </div>

              {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3">
                  <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full py-3 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Membuat toko...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <ArrowRight size={16} />
                    Buat Toko & Mulai
                  </span>
                )}
              </button>
            </form>
          )}

          {/* Cashier Form */}
          {tab === 'cashier' && (
            <form onSubmit={handleJoinStore} className="space-y-4">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                Minta kode undangan dari pemilik toko, lalu masukkan di bawah.
              </p>

              <div>
                <label className="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide">
                  Kode Undangan (8 karakter) *
                </label>
                <input
                  type="text"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.slice(0, 8))}
                  placeholder="a1b2c3d4"
                  className="input-field mt-1 font-mono text-center text-lg tracking-widest"
                  required
                  maxLength={8}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide">
                  Nama Kamu *
                </label>
                <input
                  type="text"
                  value={namaKasir}
                  onChange={(e) => setNamaKasir(e.target.value)}
                  placeholder="Ahmad Fauzi"
                  className="input-field mt-1"
                  required
                  maxLength={100}
                />
              </div>

              {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3">
                  <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full py-3 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Bergabung...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <KeyRound size={16} />
                    Gabung Toko
                  </span>
                )}
              </button>
            </form>
          )}
        </div>

        {/* Logout link */}
        <button
          onClick={signOut}
          className="flex items-center justify-center gap-1.5 text-sm text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 mt-4 mx-auto transition-colors"
        >
          <LogOut size={14} />
          Keluar dari akun
        </button>
      </div>
    </div>
  );
}
