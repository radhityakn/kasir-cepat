import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Store, User, MapPin, Phone, ArrowRight, Loader2, UserPlus } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useStoreRole } from '../hooks/useStoreRole';

type OnboardingMode = 'choose' | 'create' | 'join';

export default function OnboardingPage() {
  const { completeOnboarding } = useApp();
  const { createStore, joinStore } = useStoreRole();
  const navigate = useNavigate();

  const [mode, setMode] = useState<OnboardingMode>('choose');
  const [storeName, setStoreName] = useState('');
  const [cashierName, setCashierName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // ── Owner: buat toko baru ──
  const handleCreateStore = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!storeName.trim()) { setError('Nama toko wajib diisi'); return; }
    if (!cashierName.trim()) { setError('Nama kamu wajib diisi'); return; }

    setLoading(true);
    try {
      await createStore({
        storeName: storeName.trim(),
        address: address.trim(),
        phone: phone.trim(),
        ownerName: cashierName.trim(),
      });
      await completeOnboarding({
        storeName: storeName.trim(),
        cashierName: cashierName.trim(),
        address: address.trim(),
        phone: phone.trim(),
      });
      navigate({ to: '/' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal membuat toko. Coba lagi.');
      setLoading(false);
    }
  };

  // ── Kasir: join toko via kode ──
  const handleJoinStore = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!inviteCode.trim()) { setError('Kode undangan wajib diisi'); return; }
    if (!cashierName.trim()) { setError('Nama kamu wajib diisi'); return; }

    setLoading(true);
    try {
      await joinStore({
        inviteCode: inviteCode.trim(),
        displayName: cashierName.trim(),
      });
      await completeOnboarding({
        storeName: '', // akan diisi dari store data
        cashierName: cashierName.trim(),
        address: '',
        phone: '',
      });
      navigate({ to: '/' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal bergabung. Coba lagi.');
      setLoading(false);
    }
  };

  // ── Pilih mode ──
  if (mode === 'choose') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-brand rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
              <Store size={28} className="text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Selamat Datang!</h1>
            <p className="text-sm text-gray-400 mt-2">Pilih cara kamu menggunakan Kasir Cepat</p>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => setMode('create')}
              className="card w-full p-5 flex items-center gap-4 hover:ring-2 hover:ring-brand/30 transition-all text-left"
            >
              <div className="w-12 h-12 rounded-xl bg-green-50 dark:bg-green-900/20 flex items-center justify-center flex-shrink-0">
                <Store size={22} className="text-green-600" />
              </div>
              <div>
                <p className="font-semibold text-gray-900 dark:text-white text-sm">Buat Toko Baru</p>
                <p className="text-xs text-gray-400 mt-0.5">Saya pemilik toko, mau kelola sendiri</p>
              </div>
            </button>

            <button
              onClick={() => setMode('join')}
              className="card w-full p-5 flex items-center gap-4 hover:ring-2 hover:ring-brand/30 transition-all text-left"
            >
              <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center flex-shrink-0">
                <UserPlus size={22} className="text-blue-600" />
              </div>
              <div>
                <p className="font-semibold text-gray-900 dark:text-white text-sm">Gabung ke Toko</p>
                <p className="text-xs text-gray-400 mt-0.5">Saya kasir, punya kode undangan dari pemilik</p>
              </div>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Form buat toko (owner) ──
  if (mode === 'create') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-brand rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
              <Store size={28} className="text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Buat Toko</h1>
            <p className="text-sm text-gray-400 mt-1">Isi informasi toko kamu</p>
          </div>

          <form onSubmit={handleCreateStore} className="card p-6 space-y-4">
            <div>
              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5 block">
                Nama Toko <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <Store size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="text" value={storeName} onChange={(e) => setStoreName(e.target.value)} placeholder="Misal: Warung Pak Joko" className="input-field pl-10" autoFocus />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5 block">
                Nama Kamu <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="text" value={cashierName} onChange={(e) => setCashierName(e.target.value)} placeholder="Nama pemilik" className="input-field pl-10" />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5 block">
                Alamat <span className="text-gray-300 text-[10px]">(opsional)</span>
              </label>
              <div className="relative">
                <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Jl. Merdeka No. 1" className="input-field pl-10" />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5 block">
                No. Telepon <span className="text-gray-300 text-[10px]">(opsional)</span>
              </label>
              <div className="relative">
                <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="081234567890" className="input-field pl-10" />
              </div>
            </div>

            {error && <div className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-xl">{error}</div>}

            <button type="submit" disabled={loading} className="btn-primary w-full py-3 text-base disabled:opacity-50 flex items-center justify-center gap-2">
              {loading ? <Loader2 size={18} className="animate-spin" /> : <><ArrowRight size={16} /> Buat Toko</>}
            </button>

            <button type="button" onClick={() => { setMode('choose'); setError(''); }} className="w-full text-center text-sm text-gray-400 hover:text-gray-600">
              ← Kembali
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ── Form join toko (kasir) ──
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <UserPlus size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Gabung ke Toko</h1>
          <p className="text-sm text-gray-400 mt-1">Masukkan kode undangan dari pemilik toko</p>
        </div>

        <form onSubmit={handleJoinStore} className="card p-6 space-y-4">
          <div>
            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5 block">
              Kode Undangan <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
              placeholder="Misal: A1B2C3D4"
              className="input-field text-center text-lg font-mono tracking-widest"
              maxLength={8}
              autoFocus
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5 block">
              Nama Kamu <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="text" value={cashierName} onChange={(e) => setCashierName(e.target.value)} placeholder="Nama kasir" className="input-field pl-10" />
            </div>
          </div>

          {error && <div className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-xl">{error}</div>}

          <button type="submit" disabled={loading} className="btn-primary w-full py-3 text-base disabled:opacity-50 flex items-center justify-center gap-2">
            {loading ? <Loader2 size={18} className="animate-spin" /> : <><UserPlus size={16} /> Gabung</>}
          </button>

          <button type="button" onClick={() => { setMode('choose'); setError(''); }} className="w-full text-center text-sm text-gray-400 hover:text-gray-600">
            ← Kembali
          </button>
        </form>
      </div>
    </div>
  );
}
