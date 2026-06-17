import { useState } from 'react';
import { UserPlus, Copy, Check, Trash2, Users, Shield, ShoppingCart, X, Loader2 } from 'lucide-react';
import { useStoreRole } from '../hooks/useStoreRole';
import { formatDateTime } from '../utils/format';

export default function TeamPage() {
  const {
    membership,
    members,
    invites,
    isOwner,
    createInvite,
    removeMember,
    revokeInvite,
  } = useStoreRole();

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCreateInvite = async () => {
    setError('');
    setLoading(true);
    try {
      const code = await createInvite({ email: inviteEmail.trim() || undefined });
      setGeneratedCode(code);
      setInviteEmail('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal membuat undangan');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCode = async (code: string) => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm('Yakin ingin mengeluarkan anggota ini?')) return;
    try {
      await removeMember(memberId);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Gagal menghapus anggota');
    }
  };

  const handleRevokeInvite = async (inviteId: string) => {
    try {
      await revokeInvite(inviteId);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Gagal membatalkan undangan');
    }
  };

  if (!isOwner) {
    return (
      <div className="p-4 md:p-6 pb-24 md:pb-6">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Tim</h1>
        <div className="card p-6 text-center">
          <Users size={40} className="text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Kamu bergabung sebagai <span className="font-semibold text-brand">Kasir</span> di{' '}
            <span className="font-semibold">{membership?.storeName}</span>
          </p>
          <p className="text-xs text-gray-400 mt-2">Hanya pemilik toko yang bisa mengelola tim.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 pb-24 md:pb-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Tim Kasir</h1>
          <p className="text-sm text-gray-400">{membership?.storeName}</p>
        </div>
        <button
          onClick={() => { setShowInviteModal(true); setGeneratedCode(''); setError(''); }}
          className="btn-primary flex items-center gap-2 text-sm"
        >
          <UserPlus size={16} />
          Undang Kasir
        </button>
      </div>

      {/* Members list */}
      <div className="card overflow-hidden mb-6">
        <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-700">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            Anggota ({members.length})
          </p>
        </div>
        <div className="divide-y divide-gray-50 dark:divide-gray-700/50">
          {members.map((member) => (
            <div key={member.id} className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-semibold ${
                  member.role === 'owner' ? 'bg-gradient-to-br from-amber-400 to-amber-600' : 'bg-gradient-to-br from-blue-400 to-blue-600'
                }`}>
                  {member.displayName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{member.displayName}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {member.role === 'owner' ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-600 bg-amber-50 dark:bg-amber-900/20 px-1.5 py-0.5 rounded-md">
                        <Shield size={10} /> Owner
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-600 bg-blue-50 dark:bg-blue-900/20 px-1.5 py-0.5 rounded-md">
                        <ShoppingCart size={10} /> Kasir
                      </span>
                    )}
                  </div>
                </div>
              </div>
              {member.role === 'cashier' && (
                <button
                  onClick={() => handleRemoveMember(member.id)}
                  className="text-gray-300 hover:text-red-500 transition-colors p-1"
                  title="Keluarkan"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Pending invites */}
      {invites.length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-700">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Undangan Aktif ({invites.length})
            </p>
          </div>
          <div className="divide-y divide-gray-50 dark:divide-gray-700/50">
            {invites.map((invite) => (
              <div key={invite.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm font-mono font-semibold text-gray-800 dark:text-gray-100 tracking-wider">
                    {invite.inviteCode.toUpperCase()}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {invite.email ? `Untuk: ${invite.email}` : 'Kode umum'} · Berlaku sampai {formatDateTime(new Date(invite.expiresAt))}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleCopyCode(invite.inviteCode)}
                    className="text-gray-400 hover:text-brand p-1"
                    title="Copy kode"
                  >
                    <Copy size={14} />
                  </button>
                  <button
                    onClick={() => handleRevokeInvite(invite.id)}
                    className="text-gray-300 hover:text-red-500 p-1"
                    title="Batalkan"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Undang Kasir</h2>
              <button onClick={() => setShowInviteModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            {generatedCode ? (
              <div className="text-center space-y-4">
                <div className="w-14 h-14 bg-green-50 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto">
                  <Check size={24} className="text-green-500" />
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300">Berikan kode ini ke kasir yang ingin bergabung:</p>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4">
                  <p className="text-2xl font-mono font-bold text-gray-900 dark:text-white tracking-[0.2em]">
                    {generatedCode.toUpperCase()}
                  </p>
                </div>
                <button
                  onClick={() => handleCopyCode(generatedCode)}
                  className="btn-primary w-full flex items-center justify-center gap-2"
                >
                  {copied ? <><Check size={16} /> Tersalin!</> : <><Copy size={16} /> Salin Kode</>}
                </button>
                <p className="text-xs text-gray-400">Kode berlaku 7 hari</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5 block">
                    Email Kasir <span className="text-gray-300 text-[10px]">(opsional)</span>
                  </label>
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="kasir@email.com"
                    className="input-field"
                  />
                  <p className="text-[11px] text-gray-400 mt-1">Kosongkan untuk membuat kode undangan umum</p>
                </div>

                {error && <div className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-xl">{error}</div>}

                <button
                  onClick={handleCreateInvite}
                  disabled={loading}
                  className="btn-primary w-full flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : <><UserPlus size={16} /> Buat Undangan</>}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
