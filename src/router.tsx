import {
  createRouter,
  createRoute,
  createRootRoute,
  Outlet,
} from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/router-devtools';

import AuthGuard from './components/AuthGuard';
import RootLayout from './layouts/RootLayout';
import AuthPage from './pages/AuthPage';
import OnboardingPage from './pages/OnboardingPage';
import POSPage from './pages/POSPage';
import HistoryPage from './pages/HistoryPage';
import ProductsPage from './pages/ProductsPage';
import DashboardPage from './pages/DashboardPage';
import SettingsPage from './pages/SettingsPage';
import TeamPage from './pages/TeamPage';

// Root route — wrapper paling atas
const rootRoute = createRootRoute({
  component: () => (
    <>
      <Outlet />
      <TanStackRouterDevtools position="bottom-right" initialIsOpen={false} />
    </>
  ),
});

// Login route — tanpa layout & tanpa auth guard
const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  component: AuthPage,
});

// Onboarding route — setelah login, sebelum masuk app
const onboardingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/onboarding',
  component: OnboardingPage,
});

// App layout route — protected, semua child butuh login
const appLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'app',
  component: () => (
    <AuthGuard>
      <RootLayout>
        <Outlet />
      </RootLayout>
    </AuthGuard>
  ),
});

const posRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/',
  component: POSPage,
});

const historyRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/history',
  component: HistoryPage,
});

const productsRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/products',
  component: ProductsPage,
});

const dashboardRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/dashboard',
  component: DashboardPage,
});

const settingsRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/settings',
  component: SettingsPage,
});

const teamRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/team',
  component: TeamPage,
});

const routeTree = rootRoute.addChildren([
  loginRoute,
  onboardingRoute,
  appLayoutRoute.addChildren([
    posRoute,
    historyRoute,
    productsRoute,
    dashboardRoute,
    teamRoute,
    settingsRoute,
  ]),
]);

export const router = createRouter({ routeTree });

// Type-safe register
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
