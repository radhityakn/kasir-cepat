import { useState } from 'react';
import {
  Store, User, Bell, Shield, Printer, ChevronRight, Moon, Sun,
  X, Check, MapPin, Phone, Eye, EyeOff, LogOut,
  Barcode, Wifi, WifiOff, Clock, Edit3, RotateCcw, Zap,
  Users, Copy, Trash2, KeyRound,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { useStoreRole } from '../context/StoreContext';
import { formatDateTime } from '../utils/format';

type ModalType =
  | 'store-info' | 'printer' | 'profile' | 'security'
  | 'notification' | 'scanner' | 'logout' | 'team' | null;

function Modal({ open, onClose, title, children }: {
  open: boolean; onClose: () => void; title: string; children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center p-0 md:p-4">
      <div
        className="bg-white dark:bg-gray-800 w-full md:max-w-md rounded-t-3xl md:rounded-2xl max-h-[90vh] overflow-y-auto"
        role="dialog" aria-modal="true" aria-labelledby="modal-title"
      >
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100 dark:border-gray-700">
          <h3 id="modal-title" className="text-base font-bold text-gray-900 dark:text-white">{title}</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            aria-label="Tutup"
          >
            <X size={16} className="text-gray-600 dark:text-gray-300" />
          </button>
        </div>
        <div className="px-6 py-4">{children}</div>
      </div>
    </div>
  );
}

function ToggleSwitch({ checked, onChange, label }: {
  checked: boolean; onChange: (v: boolean) => void; label: string;
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      role="switch" aria-checked={checked} aria-label={label}
      className={`w-12 h-6 rounded-full transition-all duration-300 relative flex-shrink-0 ${
        checked ? 'bg-brand' : 'bg-gray-200 dark:bg-gray-600'
      }`}
    >
      <div className={`w-5 h-5 bg-white rounded-full shadow-sm absolute top-0.5 transition-all duration-300 ${
        checked ? 'left-6' : 'left-0.5'
      }`} />
    </button>
  );
}

// ── Status config ────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  connected: {
    label: 'Terhubung',
    dot: 'bg-brand animate-pulse',
    badge: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
    icon: Wifi,
    iconClass: 'text-brand',
  },
  idle: {
    label: 'Tidak Aktif',
    dot: 'bg-yellow-400',
    badge: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400',
    icon: Clock,
    iconClass: 'text-yellow-500',
  },
  disconnected: {
    label: 'Tidak Terdeteksi',
    dot: 'bg-gray-300 dark:bg-gray-600',
    badge: 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400',
    icon: WifiOff,
    iconClass: 'text-gray-400',
  },
} as const;

export default function SettingsPage() {
  const { darkMode, toggleDarkMode, settings, updateSettings, scanner, updateScannerLabel, resetScanner } = useApp();
  const { signOut } = useAuth();
  const { membership, members, invites, isOwner, createInvite, removeMember } = useStoreRole();
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // form states
  const [storeForm, setStoreForm]     = useState({ storeName: settings.storeName, address: settings.address, phone: settings.phone });
  const [profileForm, setProfileForm] = useState({ cashierName: settings.cashierName });
  const [securityForm, setSecurityForm] = useState({ currentPin: '', newPin: '', confirmPin: '' });
  const [printerForm, setPrinterForm] = useState({ printerName: settings.printerName, autoPrint: settings.autoPrint });
  const [scannerLabelEdit, setScannerLabelEdit] = useState(scanner.label);
  const [editingLabel, setEditingLabel] = useState(false);
  const [showPin, setShowPin]   = useState(false);
  const [pinError, setPinError] = useState('');
  const [pinSuccess, setPinSuccess] = useState(false);

  const openModal = (type: ModalType) => {
    setStoreForm({ storeName: settings.storeName, address: settings.address, phone: settings.phone });
    setProfileForm({ cashierName: settings.cashierName });
    setPrinterForm({ printerName: settings.printerName, autoPrint: settings.autoPrint });
    setScannerLabelEdit(scanner.label);
    setEditingLabel(false);
    setSecurityForm({ currentPin: '', newPin: '', confirmPin: '' });
    setPinError(''); setPinSuccess(false);
    setActiveModal(type);
  };
  const closeModal = () => setActiveModal(null);

  const handleSaveStore = () => {
    if (!storeForm.storeName.trim()) return;
    updateSettings({ storeName: storeForm.storeName.trim(), address: storeForm.address.trim(), phone: storeForm.phone.trim() });
    closeModal();
  };
  const handleSaveProfile = () => {
    if (!profileForm.cashierName.trim()) return;
    updateSettings({ cashierName: profileForm.cashierName.trim() });
    closeModal();
  };
  const handleSavePrinter = () => {
    updateSettings({ printerName: printerForm.printerName, autoPrint: printerForm.autoPrint });
    closeModal();
  };
  const handleChangePin = () => {
    setPinError('');
    if (securityForm.currentPin !== settings.cashierPin) { setPinError('PIN saat ini tidak sesuai.'); return; }
    if (securityForm.newPin.length < 4) { setPinError('PIN baru minimal 4 digit.'); return; }
    if (securityForm.newPin !== securityForm.confirmPin) { setPinError('Konfirmasi PIN tidak cocok.'); return; }
    updateSettings({ cashierPin: securityForm.newPin });
    setPinSuccess(true);
    setTimeout(() => { closeModal(); setPinSuccess(false); }, 1200);
  };
  const handleSaveScannerLabel = () => {
    if (scannerLabelEdit.trim()) { updateScannerLabel(scannerLabelEdit.trim()); }
    setEditingLabel(false);
  };

  const statusCfg = STATUS_CONFIG[scanner.status];

  const sections = [
    {
      title: 'Toko',
      items: [
        { icon: Store,   label: 'Informasi Toko',    desc: membership?.storeName ?? settings.storeName, modal: 'store-info' as ModalType },
        ...(isOwner ? [{ icon: Users, label: 'Tim & Undangan', desc: `${members.length} anggota`, modal: 'team' as ModalType }] : []),
        { icon: Printer, label: 'Pengaturan Printer', desc: settings.printerName, modal: 'printer' as ModalType },
      ],
    },
    {
      title: 'Akun',
      items: [
        { icon: User,   label: 'Profil Kasir', desc: settings.cashierName,  modal: 'profile'  as ModalType },
        { icon: Shield, label: 'Keamanan',     desc: 'Ubah PIN kasir',       modal: 'security' as ModalType },
      ],
    },
    {
      title: 'Aplikasi',
      items: [
        { icon: Bell, label: 'Notifikasi', desc: settings.notifLowStock || settings.notifDailySummary ? 'Aktif' : 'Nonaktif', modal: 'notification' as ModalType },
      ],
    },
  ];

  return (
    <div className="flex flex-col min-h-screen page-bg">
      {/* Header */}
      <div className="page-header px-4 pt-4 pb-4">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">Pengaturan</h2>
        <p className="text-xs text-gray-400 mt-0.5">Konfigurasi aplikasi kasir</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 pb-24 md:pb-6 space-y-4">

        {/* Profile Card */}
        <div className="card p-4 flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-2xl font-bold shadow-sm flex-shrink-0">
            {(membership?.nama ?? settings.cashierName).charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-gray-900 dark:text-white truncate">{membership?.storeName ?? settings.storeName}</p>
            <p className="text-xs text-gray-400 truncate">{membership?.storeAlamat || settings.address || 'Belum ada alamat'}</p>
            <div className="flex items-center gap-2 mt-1.5">
              <span className="text-[10px] bg-primary-50 text-brand font-semibold px-2 py-0.5 rounded-full dark:bg-primary-900/30">{membership?.nama ?? settings.cashierName}</span>
              <span className="text-[10px] bg-green-50 text-green-600 font-semibold px-2 py-0.5 rounded-full dark:bg-green-900/30 dark:text-green-400 capitalize">{membership?.role ?? 'Aktif'}</span>
            </div>
          </div>
        </div>

        {/* Dark mode */}
        <div className="card p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${darkMode ? 'bg-gray-700' : 'bg-yellow-50'}`}>
              {darkMode ? <Moon size={18} className="text-yellow-300" /> : <Sun size={18} className="text-yellow-500" />}
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">Mode Tampilan</p>
              <p className="text-xs text-gray-400">{darkMode ? 'Mode Gelap' : 'Mode Terang'}</p>
            </div>
          </div>
          <ToggleSwitch checked={darkMode} onChange={toggleDarkMode} label="Toggle dark mode" />
        </div>

        {/* ── Scanner Device Card ── */}
        <div className="card overflow-hidden">
          <div className="px-4 py-2 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Perangkat Scanner</p>
          </div>

          <button
            onClick={() => openModal('scanner')}
            className="w-full px-4 py-4 flex items-start gap-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors text-left"
          >
            {/* Scanner icon with status dot */}
            <div className="relative flex-shrink-0 mt-0.5">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                scanner.status === 'connected'
                  ? 'bg-green-50 dark:bg-green-900/20'
                  : scanner.status === 'idle'
                  ? 'bg-yellow-50 dark:bg-yellow-900/20'
                  : 'bg-gray-100 dark:bg-gray-700'
              }`}>
                <Barcode size={18} className={statusCfg.iconClass} />
              </div>
              {/* Status dot */}
              <span className={`absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white dark:border-gray-800 ${statusCfg.dot}`} />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-bold text-gray-800 dark:text-gray-100">{scanner.label}</p>
                <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${statusCfg.badge}`}>
                  <statusCfg.icon size={10} />
                  {statusCfg.label}
                </span>
              </div>

              {scanner.status === 'connected' && (
                <p className="text-xs text-brand mt-0.5 flex items-center gap-1">
                  <Zap size={11} />
                  Scanner aktif • {scanner.avgSpeed !== null ? `${scanner.avgSpeed}ms/char` : ''}
                </p>
              )}
              {scanner.status === 'idle' && scanner.lastSeen && (
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                  Terakhir aktif: {formatDateTime(scanner.lastSeen)}
                </p>
              )}
              {scanner.status === 'disconnected' && (
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                  {scanner.lastSeen
                    ? `Terakhir terdeteksi: ${formatDateTime(scanner.lastSeen)}`
                    : 'Belum pernah terdeteksi — scan barcode untuk mulai'}
                </p>
              )}

              {scanner.scanCount > 0 && (
                <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">
                  Total scan: {scanner.scanCount.toLocaleString('id-ID')} kali
                </p>
              )}
            </div>

            <ChevronRight size={16} className="text-gray-300 dark:text-gray-500 flex-shrink-0 mt-1" />
          </button>

          {/* How to connect hint jika belum pernah scan */}
          {scanner.status === 'disconnected' && scanner.scanCount === 0 && (
            <div className="mx-4 mb-4 px-3 py-2.5 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
              <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">Cara menghubungkan scanner:</p>
              <ol className="text-xs text-blue-500 dark:text-blue-400/80 mt-1 space-y-0.5 list-decimal list-inside">
                <li>Colokkan scanner USB ke komputer / pairing Bluetooth</li>
                <li>Buka halaman Kasir</li>
                <li>Arahkan scanner ke barcode produk manapun</li>
                <li>Scanner akan otomatis terdeteksi di sini</li>
              </ol>
            </div>
          )}
        </div>

        {/* Settings Sections */}
        {sections.map((section) => (
          <div key={section.title} className="card overflow-hidden">
            <div className="px-4 py-2 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">{section.title}</p>
            </div>
            <div className="divide-y divide-gray-50 dark:divide-gray-700">
              {section.items.map((item) => (
                <button
                  key={item.label}
                  onClick={() => openModal(item.modal)}
                  className="w-full px-4 py-3.5 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  <div className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                    <item.icon size={17} className="text-gray-500 dark:text-gray-400" />
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{item.label}</p>
                    <p className="text-xs text-gray-400 truncate">{item.desc}</p>
                  </div>
                  <ChevronRight size={16} className="text-gray-300 dark:text-gray-500 flex-shrink-0" />
                </button>
              ))}
            </div>
          </div>
        ))}

        {/* Logout */}
        <button
          onClick={() => openModal('logout')}
          className="card w-full px-4 py-3.5 flex items-center gap-3 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors"
        >
          <div className="w-9 h-9 rounded-xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
            <LogOut size={17} className="text-red-500" />
          </div>
          <p className="text-sm font-semibold text-red-500">Keluar</p>
        </button>

        {/* App Info */}
        <div className="card p-4 text-center">
          <div className="w-12 h-12 bg-brand rounded-2xl flex items-center justify-center text-white font-bold text-xl mx-auto mb-3 shadow-sm">K</div>
          <p className="font-bold text-gray-900 dark:text-white">Kasir Cepat</p>
          <p className="text-xs text-gray-400 mt-0.5">Versi 1.0.0</p>
          <p className="text-xs text-gray-300 dark:text-gray-500 mt-3">Aplikasi kasir modern untuk bisnis kecil dan menengah</p>
        </div>
      </div>

      {/* ── Modal: Scanner Device ── */}
      <Modal open={activeModal === 'scanner'} onClose={closeModal} title="Perangkat Scanner">
        <div className="space-y-4">
          {/* Status hero */}
          <div className={`rounded-2xl p-4 flex items-center gap-4 ${
            scanner.status === 'connected'     ? 'bg-green-50 dark:bg-green-900/20'
            : scanner.status === 'idle'        ? 'bg-yellow-50 dark:bg-yellow-900/20'
            : 'bg-gray-50 dark:bg-gray-700/50'
          }`}>
            <div className="relative flex-shrink-0">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
                scanner.status === 'connected' ? 'bg-white dark:bg-gray-800' : 'bg-white/70 dark:bg-gray-800/70'
              }`}>
                <Barcode size={28} className={statusCfg.iconClass} />
              </div>
              <span className={`absolute -top-1 -right-1 w-4 h-4 rounded-full border-2 border-white dark:border-gray-800 ${statusCfg.dot}`} />
            </div>
            <div className="flex-1 min-w-0">
              {editingLabel ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={scannerLabelEdit}
                    onChange={(e) => setScannerLabelEdit(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleSaveScannerLabel(); }}
                    autoFocus
                    className="input-field text-sm py-1.5 flex-1"
                  />
                  <button onClick={handleSaveScannerLabel} className="btn-primary py-1.5 px-3 text-sm">
                    <Check size={14} />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <p className="font-bold text-gray-900 dark:text-white truncate">{scanner.label}</p>
                  <button
                    onClick={() => setEditingLabel(true)}
                    className="text-gray-400 hover:text-brand transition-colors"
                    aria-label="Edit nama scanner"
                  >
                    <Edit3 size={13} />
                  </button>
                </div>
              )}
              <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full mt-1 ${statusCfg.badge}`}>
                <statusCfg.icon size={11} />
                {statusCfg.label}
              </span>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-3">
              <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">Total Scan</p>
              <p className="text-xl font-extrabold text-gray-900 dark:text-white">
                {scanner.scanCount.toLocaleString('id-ID')}
              </p>
              <p className="text-[10px] text-gray-400 mt-0.5">kali sejak dibuka</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-3">
              <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">Kecepatan</p>
              <p className="text-xl font-extrabold text-gray-900 dark:text-white">
                {scanner.avgSpeed !== null ? `${scanner.avgSpeed}ms` : '—'}
              </p>
              <p className="text-[10px] text-gray-400 mt-0.5">per karakter</p>
            </div>
          </div>

          {/* Last seen */}
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-3 flex items-center gap-3">
            <Clock size={16} className="text-gray-400 flex-shrink-0" />
            <div>
              <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">Terakhir Aktif</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                {scanner.lastSeen ? formatDateTime(scanner.lastSeen) : 'Belum pernah terdeteksi'}
              </p>
            </div>
          </div>

          {/* Connection guide */}
          {scanner.status !== 'connected' && (
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3">
              <p className="text-xs font-semibold text-blue-700 dark:text-blue-400 mb-2">Cara menghubungkan</p>
              <ol className="text-xs text-blue-600 dark:text-blue-400/80 space-y-1.5 list-decimal list-inside">
                <li>Pastikan scanner terhubung via USB atau Bluetooth</li>
                <li>Buka halaman Kasir (Scanner akan otomatis aktif)</li>
                <li>Scan barcode produk mana saja</li>
                <li>Status akan berubah menjadi <b>Terhubung</b></li>
              </ol>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <button
              onClick={() => { resetScanner(); closeModal(); }}
              className="btn-secondary flex-1 text-sm py-2.5"
            >
              <RotateCcw size={14} />
              Reset Data
            </button>
            <button onClick={closeModal} className="btn-primary flex-1 text-sm py-2.5">
              <Check size={14} />
              Selesai
            </button>
          </div>
        </div>
      </Modal>

      {/* ── Modal: Informasi Toko ── */}
      <Modal open={activeModal === 'store-info'} onClose={closeModal} title="Informasi Toko">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Nama Toko</label>
            <div className="relative">
              <Store size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="text" value={storeForm.storeName} onChange={(e) => setStoreForm({ ...storeForm, storeName: e.target.value })} placeholder="Nama toko..." className="input-field pl-9" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Alamat</label>
            <div className="relative">
              <MapPin size={15} className="absolute left-3 top-3.5 text-gray-400" />
              <textarea value={storeForm.address} onChange={(e) => setStoreForm({ ...storeForm, address: e.target.value })} placeholder="Alamat toko..." rows={2} className="input-field pl-9 resize-none" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">No. Telepon</label>
            <div className="relative">
              <Phone size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="tel" value={storeForm.phone} onChange={(e) => setStoreForm({ ...storeForm, phone: e.target.value })} placeholder="081234567890" className="input-field pl-9" />
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <button onClick={closeModal} className="btn-secondary flex-1">Batal</button>
            <button onClick={handleSaveStore} disabled={!storeForm.storeName.trim()} className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed">
              <Check size={16} />Simpan
            </button>
          </div>
        </div>
      </Modal>

      {/* ── Modal: Profil Kasir ── */}
      <Modal open={activeModal === 'profile'} onClose={closeModal} title="Profil Kasir">
        <div className="space-y-4">
          <div className="flex justify-center mb-2">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-3xl font-bold shadow-sm">
              {profileForm.cashierName.charAt(0).toUpperCase() || 'A'}
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Nama Kasir</label>
            <div className="relative">
              <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="text" value={profileForm.cashierName} onChange={(e) => setProfileForm({ cashierName: e.target.value })} placeholder="Nama kasir..." className="input-field pl-9" />
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <button onClick={closeModal} className="btn-secondary flex-1">Batal</button>
            <button onClick={handleSaveProfile} disabled={!profileForm.cashierName.trim()} className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed">
              <Check size={16} />Simpan
            </button>
          </div>
        </div>
      </Modal>

      {/* ── Modal: Keamanan / PIN ── */}
      <Modal open={activeModal === 'security'} onClose={closeModal} title="Ubah PIN">
        <div className="space-y-4">
          {pinSuccess ? (
            <div className="flex flex-col items-center py-6 gap-3">
              <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center">
                <Check size={28} className="text-green-600" />
              </div>
              <p className="font-semibold text-green-700 dark:text-green-400">PIN berhasil diubah!</p>
            </div>
          ) : (
            <>
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">PIN Saat Ini</label>
                <div className="relative">
                  <input type={showPin ? 'text' : 'password'} value={securityForm.currentPin} onChange={(e) => setSecurityForm({ ...securityForm, currentPin: e.target.value })} placeholder="Masukkan PIN lama..." maxLength={8} className="input-field pr-10" />
                  <button type="button" onClick={() => setShowPin(!showPin)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" aria-label={showPin ? 'Sembunyikan PIN' : 'Tampilkan PIN'}>
                    {showPin ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">PIN Baru</label>
                <input type={showPin ? 'text' : 'password'} value={securityForm.newPin} onChange={(e) => setSecurityForm({ ...securityForm, newPin: e.target.value })} placeholder="Min. 4 digit..." maxLength={8} className="input-field" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Konfirmasi PIN Baru</label>
                <input type={showPin ? 'text' : 'password'} value={securityForm.confirmPin} onChange={(e) => setSecurityForm({ ...securityForm, confirmPin: e.target.value })} placeholder="Ulangi PIN baru..." maxLength={8} className="input-field" />
              </div>
              {pinError && <p className="text-xs text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">{pinError}</p>}
              <div className="flex gap-2 pt-2">
                <button onClick={closeModal} className="btn-secondary flex-1">Batal</button>
                <button onClick={handleChangePin} className="btn-primary flex-1"><Shield size={16} />Ubah PIN</button>
              </div>
            </>
          )}
        </div>
      </Modal>

      {/* ── Modal: Printer ── */}
      <Modal open={activeModal === 'printer'} onClose={closeModal} title="Pengaturan Printer">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Nama Printer</label>
            <div className="relative">
              <Printer size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="text" value={printerForm.printerName} onChange={(e) => setPrinterForm({ ...printerForm, printerName: e.target.value })} placeholder="Nama printer..." className="input-field pl-9" />
            </div>
          </div>
          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
            <div>
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">Cetak Otomatis</p>
              <p className="text-xs text-gray-400">Langsung cetak setelah transaksi</p>
            </div>
            <ToggleSwitch checked={printerForm.autoPrint} onChange={(v) => setPrinterForm({ ...printerForm, autoPrint: v })} label="Cetak otomatis" />
          </div>
          <div className="flex gap-2 pt-2">
            <button onClick={closeModal} className="btn-secondary flex-1">Batal</button>
            <button onClick={handleSavePrinter} className="btn-primary flex-1"><Check size={16} />Simpan</button>
          </div>
        </div>
      </Modal>

      {/* ── Modal: Notifikasi ── */}
      <Modal open={activeModal === 'notification'} onClose={closeModal} title="Pengaturan Notifikasi">
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
            <div>
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">Stok Hampir Habis</p>
              <p className="text-xs text-gray-400">Notifikasi jika stok kurang dari 5</p>
            </div>
            <ToggleSwitch checked={settings.notifLowStock} onChange={(v) => updateSettings({ notifLowStock: v })} label="Notifikasi stok rendah" />
          </div>
          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
            <div>
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">Ringkasan Harian</p>
              <p className="text-xs text-gray-400">Laporan otomatis setiap hari</p>
            </div>
            <ToggleSwitch checked={settings.notifDailySummary} onChange={(v) => updateSettings({ notifDailySummary: v })} label="Ringkasan harian" />
          </div>
          <button onClick={closeModal} className="btn-primary w-full mt-2">Selesai</button>
        </div>
      </Modal>

      {/* ── Modal: Tim & Undangan (Owner only) ── */}
      <Modal open={activeModal === 'team'} onClose={closeModal} title="Tim & Undangan">
        <div className="space-y-4">
          {/* Members list */}
          <div>
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Anggota Toko</p>
            <div className="space-y-2">
              {members.map((m) => (
                <div key={m.id} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                  <div className="w-8 h-8 rounded-full bg-brand/10 flex items-center justify-center text-brand font-bold text-sm">
                    {m.nama.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">{m.nama}</p>
                    <p className="text-xs text-gray-400 capitalize">{m.role}</p>
                  </div>
                  {m.role === 'cashier' && (
                    <button
                      onClick={async () => { await removeMember(m.id); }}
                      className="text-red-400 hover:text-red-600 transition-colors p-1"
                      aria-label={`Hapus ${m.nama}`}
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Invites */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Kode Undangan</p>
              <button
                onClick={async () => {
                  setInviteLoading(true);
                  setInviteError(null);
                  const { error: err } = await createInvite();
                  if (err) setInviteError(err);
                  setInviteLoading(false);
                }}
                disabled={inviteLoading}
                className="text-xs font-semibold text-brand hover:text-brand-dark transition-colors flex items-center gap-1 disabled:opacity-50"
              >
                <KeyRound size={12} />
                {inviteLoading ? 'Membuat...' : 'Buat Baru'}
              </button>
            </div>

            {inviteError && (
              <p className="text-xs text-red-500 mb-2">{inviteError}</p>
            )}

            {invites.length === 0 ? (
              <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-3">Belum ada kode undangan</p>
            ) : (
              <div className="space-y-2">
                {invites.filter((i) => !i.usedAt).map((inv) => (
                  <div key={inv.id} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                    <code className="text-sm font-mono font-bold text-gray-800 dark:text-gray-100 flex-1 tracking-widest">
                      {inv.code}
                    </code>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(inv.code);
                        setCopiedCode(inv.code);
                        setTimeout(() => setCopiedCode(null), 2000);
                      }}
                      className="text-gray-400 hover:text-brand transition-colors p-1"
                      aria-label="Salin kode"
                    >
                      {copiedCode === inv.code ? <Check size={14} className="text-brand" /> : <Copy size={14} />}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button onClick={closeModal} className="btn-primary w-full mt-2">Selesai</button>
        </div>
      </Modal>

      {/* ── Modal: Logout ── */}
      <Modal open={activeModal === 'logout'} onClose={closeModal} title="Keluar">
        <div className="space-y-4">
          <div className="flex justify-center">
            <div className="w-14 h-14 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
              <LogOut size={24} className="text-red-500" />
            </div>
          </div>
          <p className="text-center text-sm text-gray-600 dark:text-gray-300">Yakin ingin keluar dari sesi kasir ini?</p>
          <div className="flex gap-2">
            <button onClick={closeModal} className="btn-secondary flex-1">Batal</button>
            <button
              onClick={async () => { closeModal(); await signOut(); }}
              className="flex-1 bg-red-500 hover:bg-red-600 text-white font-semibold py-2.5 px-5 rounded-xl active:scale-95 transition-all duration-150 flex items-center justify-center gap-2"
            >
              <LogOut size={16} />Keluar
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
