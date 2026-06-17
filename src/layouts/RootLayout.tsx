import type { ReactNode } from 'react';
import { useApp } from '../context/AppContext';
import Sidebar from '../components/Sidebar';
import BottomNav from '../components/BottomNav';
import SyncIndicator from '../components/SyncIndicator';

export default function RootLayout({ children }: { children: ReactNode }) {
  const { darkMode } = useApp();

  return (
    <div
      className={`flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-900 transition-colors duration-300 ${
        darkMode ? 'dark' : ''
      }`}
    >
      <Sidebar />
      <main className="flex-1 overflow-y-auto">{children}</main>
      <BottomNav />
      <SyncIndicator />
    </div>
  );
}
