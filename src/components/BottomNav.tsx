import { Link, useRouterState } from '@tanstack/react-router';
import { ShoppingCart, History, Package, LayoutDashboard, Settings, Users } from 'lucide-react';
import { useStoreRole } from '../hooks/useStoreRole';
import type { Role } from '../hooks/useStoreRole';
import type { LucideIcon } from 'lucide-react';

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  roles: Role[] | 'all';
}

const navItems: NavItem[] = [
  { to: '/',          label: 'Kasir',      icon: ShoppingCart,    roles: 'all' },
  { to: '/history',   label: 'Riwayat',    icon: History,         roles: ['owner'] },
  { to: '/products',  label: 'Produk',     icon: Package,         roles: ['owner'] },
  { to: '/dashboard', label: 'Laporan',    icon: LayoutDashboard, roles: ['owner'] },
  { to: '/team',      label: 'Tim',        icon: Users,           roles: ['owner'] },
  { to: '/settings',  label: 'Pengaturan', icon: Settings,        roles: 'all' },
];

export default function BottomNav() {
  const { role } = useStoreRole();
  const { location } = useRouterState();

  const visibleItems = navItems.filter(
    (item) => item.roles === 'all' || (role && item.roles.includes(role))
  );

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 z-40 transition-colors duration-300"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex">
        {visibleItems.map(({ to, label, icon: Icon }) => {
          const isActive =
            to === '/'
              ? location.pathname === '/'
              : location.pathname.startsWith(to);

          return (
            <Link
              key={to}
              to={to}
              className={`flex-1 flex flex-col items-center gap-1 py-3 transition-all duration-150 ${
                isActive ? 'text-brand' : 'text-gray-400 dark:text-gray-500'
              }`}
            >
              <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
