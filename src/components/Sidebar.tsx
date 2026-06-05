import { ShoppingCart, History, Package, LayoutDashboard, Settings } from 'lucide-react';
import type { Page } from '../types';
import { useApp } from '../context/AppContext';

interface SidebarProps {
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

export default function Sidebar({ currentPage, onNavigate }: SidebarProps) {
  const { settings } = useApp();

  return (
    <aside className="hidden md:flex flex-col w-64 bg-white dark:bg-gray-800 border-r border-gray-100 dark:border-gray-700 min-h-screen px-4 py-6 transition-colors duration-300">
      {/* Logo */}
      <div className="flex items-center gap-3 px-3 mb-8">
        <div className="w-10 h-10 bg-brand rounded-xl flex items-center justify-center shadow-sm flex-shrink-0">
          <span className="text-white font-bold text-lg">K</span>
        </div>
        <div>
          <h1 className="font-bold text-gray-900 dark:text-white text-base leading-tight">Kasir Cepat</h1>
          <p className="text-xs text-gray-400">Point of Sale</p>
        </div>
      </div>

      {/* Nav items */}
      <nav className="flex flex-col gap-1 flex-1">
        {navItems.map(({ page, label, icon: Icon }) => (
          <button
            key={page}
            onClick={() => onNavigate(page)}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-150 w-full text-left ${
              currentPage === page
                ? 'bg-primary-50 text-brand dark:bg-primary-900/20'
                : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
          >
            <Icon size={20} strokeWidth={currentPage === page ? 2.5 : 2} />
            {label}
          </button>
        ))}
      </nav>

      {/* Bottom user info */}
      <div className="mt-auto pt-4 border-t border-gray-100 dark:border-gray-700">
        <div className="flex items-center gap-3 px-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
            {settings.cashierName.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">{settings.cashierName}</p>
            <p className="text-xs text-gray-400">Kasir</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
