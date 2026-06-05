import { ShoppingCart, History, Package, LayoutDashboard, Settings } from 'lucide-react';
import type { Page } from '../types';

interface BottomNavProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
}

const navItems: { page: Page; label: string; icon: React.ComponentType<{ size?: number; strokeWidth?: number }> }[] = [
  { page: 'pos', label: 'Kasir', icon: ShoppingCart },
  { page: 'history', label: 'Riwayat', icon: History },
  { page: 'products', label: 'Produk', icon: Package },
  { page: 'dashboard', label: 'Laporan', icon: LayoutDashboard },
  { page: 'settings', label: 'Pengaturan', icon: Settings },
];

export default function BottomNav({ currentPage, onNavigate }: BottomNavProps) {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 z-40 transition-colors duration-300">
      <div className="flex">
        {navItems.map(({ page, label, icon: Icon }) => (
          <button
            key={page}
            onClick={() => onNavigate(page)}
            className={`flex-1 flex flex-col items-center gap-1 py-3 transition-all duration-150 ${
              currentPage === page
                ? 'text-brand'
                : 'text-gray-400 dark:text-gray-500'
            }`}
          >
            <Icon size={20} strokeWidth={currentPage === page ? 2.5 : 2} />
            <span className="text-[10px] font-medium">{label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
