import { useNavigate } from '@tanstack/react-router';
import { useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { useStoreRole } from '../hooks/useStoreRole';
import { pullFromRemote } from '../lib/syncEngine';
import { Loader2 } from 'lucide-react';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const { isOnboarded, settingsLoading } = useApp();
  const { isLoading: storeLoading, hasStore } = useStoreRole();
  const navigate = useNavigate();
  const hasPulled = useRef(false);

  const loading = authLoading || settingsLoading || storeLoading;

  // Pull data dari Supabase ke IndexedDB saat login
  useEffect(() => {
    if (user && !hasPulled.current) {
      hasPulled.current = true;
      pullFromRemote(user.id).catch(console.error);
    }
  }, [user]);

  useEffect(() => {
    if (loading) return;

    if (!user) {
      navigate({ to: '/login' });
    } else if (!isOnboarded || !hasStore) {
      navigate({ to: '/onboarding' });
    }
  }, [user, loading, isOnboarded, hasStore, navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-900">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={32} className="animate-spin text-brand" />
          <p className="text-sm text-gray-400">Memuat...</p>
        </div>
      </div>
    );
  }

  if (!user || !isOnboarded || !hasStore) return null;

  return <>{children}</>;
}
