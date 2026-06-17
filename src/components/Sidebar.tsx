import { Link, useRouterState } from '@tanstack/react-router';
import { ShoppingCart, History, Package, LayoutDashboard, Settings, Users } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useStoreRole } from '../hooks/useStoreRole';
import type { Role } from '../hooks/useStoreRole';
import type { LucideIcon } from 'lucide-react';

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  roles: Role[] | 'all'; // 'all' = semua role bisa lihat
}

const navItems: NavItem[] = [
  { to: '/',          label: 'Kasir',      icon: ShoppingCart,    roles: 'all' },
  { to: '/history',   label: 'Riwayat',    icon: History,         roles: ['owner'] },
  { to: '/products',  label: 'Produk',     icon: Package,         roles: ['owner'] },
  { to: '/dashboard', label: 'Laporan',    icon: LayoutDashboard, roles: ['owner'] },
  { to: '/team',      label: 'Tim',        icon: Users,           roles: ['owner'] },
  { to: '/settings',  label: 'Pengaturan', icon: Settings,        roles: 'all' },
];

export default function Sidebar() {
  const { settings } = useApp();
  const { role, membership } = useStoreRole();
  const { location } = useRouterState();

  const visibleItems = navItems.filter(
    (item) => item.roles === 'all' || (role && item.roles.includes(role))
  );

  return (
    <aside className="hidden md:flex flex-col w-64 bg-white dark:bg-gray-800 border-r border-gray-100 dark:border-gray-700 min-h-screen px-4 py-6 transition-colors duration-300">
      {/* Logo */}
      <div className="flex items-center gap-3 px-3 mb-8">
        <div className="w-10 h-10 bg-brand rounded-xl flex items-center justify-center shadow-sm flex-shrink-0">
          <span className="text-white font-bold text-lg">K</span>
        </div>
        <div>
          <h1 className="font-bold text-gray-900 dark:text-white text-base leading-tight truncate">
            {membership?.storeName || 'Kasir Cepat'}
          </h1>
          <p className="text-xs text-gray-400">Point of Sale</p>
        </div>
      </div>

      {/* Nav items */}
      <nav className="flex flex-col gap-1 flex-1">
        {visibleItems.map(({ to, label, icon: Icon }) => {
          const isActive =
            to === '/'
              ? location.pathname === '/'
              : location.pathname.startsWith(to);

          return (
            <Link
              key={to}
              to={to}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-150 w-full text-left ${
                isActive
                  ? 'bg-primary-50 text-brand dark:bg-primary-900/20'
                  : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Bottom user info */}
      <div className="mt-auto pt-4 border-t border-gray-100 dark:border-gray-700">
        <div className="flex items-center gap-3 px-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
            {(membership?.displayName || settings.cashierName || 'U').charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">
              {membership?.displayName || settings.cashierName}
            </p>
            <p className="text-xs text-gray-400 capitalize">{role || 'Kasir'}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
