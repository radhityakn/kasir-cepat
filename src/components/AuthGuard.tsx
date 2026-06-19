import type { ReactNode } from 'react';
import { useAuth } from '../context/AuthContext';
import { useStoreRole } from '../context/StoreContext';
import AuthPage from '../pages/AuthPage';
import OnboardingPage from '../pages/OnboardingPage';

interface AuthGuardProps {
  children: ReactNode;
}

/**
 * AuthGuard — menentukan halaman mana yang ditampilkan berdasarkan state:
 * 1. Belum login → AuthPage
 * 2. Login tapi belum punya toko → OnboardingPage
 * 3. Login + punya toko → children (main app)
 */
export default function AuthGuard({ children }: AuthGuardProps) {
  const { user, loading: authLoading } = useAuth();
  const { hasStore, loading: storeLoading } = useStoreRole();

  // Loading state — tampilkan spinner sementara cek session/membership
  if (authLoading || (user && storeLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="w-10 h-10 border-3 border-gray-200 dark:border-gray-700 border-t-brand rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-400 dark:text-gray-500">Memuat...</p>
        </div>
      </div>
    );
  }

  // Not logged in → show auth page
  if (!user) {
    return <AuthPage />;
  }

  // Logged in but no store membership → show onboarding
  if (!hasStore) {
    return <OnboardingPage />;
  }

  // Logged in + has store → show main app
  return <>{children}</>;
}
