import { useState, useEffect } from 'react';
import { WifiOff, RefreshCw } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { db } from '../lib/db';
import { processQueue } from '../lib/syncEngine';

export default function SyncIndicator() {
  const online = useOnlineStatus();
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    const checkPending = async () => {
      const count = await db.syncQueue.count();
      setPendingCount(count);
    };

    checkPending();
    const interval = setInterval(checkPending, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleManualSync = async () => {
    if (!online || syncing) return;
    setSyncing(true);
    try {
      await processQueue();
      setPendingCount(await db.syncQueue.count());
    } finally {
      setSyncing(false);
    }
  };

  // Sembunyikan kalau online dan tidak ada antrian
  if (online && pendingCount === 0) return null;

  return (
    <div className="fixed bottom-20 md:bottom-4 right-4 z-50">
      <button
        onClick={handleManualSync}
        disabled={!online || syncing}
        className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium shadow-lg transition-all ${
          online
            ? 'bg-yellow-50 text-yellow-700 border border-yellow-200 hover:bg-yellow-100'
            : 'bg-red-50 text-red-600 border border-red-200'
        }`}
      >
        {online ? (
          <>
            <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
            {pendingCount > 0 ? `${pendingCount} menunggu sync` : 'Synced'}
          </>
        ) : (
          <>
            <WifiOff size={14} />
            Offline
            {pendingCount > 0 && ` · ${pendingCount} antrian`}
          </>
        )}
      </button>
    </div>
  );
}
