import { useState } from 'react';
import Sidebar from './components/Sidebar';
import BottomNav from './components/BottomNav';
import POSPage from './pages/POSPage';
import HistoryPage from './pages/HistoryPage';
import ProductsPage from './pages/ProductsPage';
import DashboardPage from './pages/DashboardPage';
import SettingsPage from './pages/SettingsPage';
import type { Page, Product, Transaction } from './types';
import { initialProducts, generateTransactions } from './data/products';
import { useApp } from './context/AppContext';
import { useAuth } from './context/AuthContext';
import { useStoreRole } from './context/StoreContext';
import { useProducts } from './hooks/useProducts';
import { useTransactions } from './hooks/useTransactions';

export default function App() {
  const { darkMode } = useApp();
  const { user } = useAuth();
  const { hasStore } = useStoreRole();

  // Supabase-backed data (online)
  const {
    products: supaProducts,
    loading: productsLoading,
    addProduct: supaAddProduct,
    updateProduct: supaUpdateProduct,
    deleteProduct: supaDeleteProduct,
  } = useProducts();

  const {
    transactions: supaTransactions,
    loading: transactionsLoading,
    addTransaction: supaAddTransaction,
  } = useTransactions();

  // Fallback to local data while Supabase loads or if no store yet
  const [localProducts] = useState<Product[]>(initialProducts);
  const [localTransactions] = useState<Transaction[]>(() => generateTransactions());

  // Determine data source: use Supabase if logged in + has store + data loaded
  const isOnline = !!user && hasStore;
  const products = isOnline && !productsLoading ? supaProducts : localProducts;
  const transactions = isOnline && !transactionsLoading ? supaTransactions : localTransactions;

  const [currentPage, setCurrentPage] = useState<Page>('dashboard');

  // ── Handlers that bridge props interface → Supabase hooks ──

  const handleTransactionComplete = async (transaction: Transaction) => {
    if (!isOnline) return;

    await supaAddTransaction({
      items: transaction.items,
      paymentMethod: transaction.paymentMethod,
      amountPaid: transaction.amountPaid,
      discountPercent: transaction.total > 0
        ? Math.round((transaction.discount / transaction.total) * 100)
        : 0,
    });
  };

  const handleAddProduct = async (product: Product) => {
    if (!isOnline) return;
    await supaAddProduct(product);
  };

  const handleUpdateProduct = async (product: Product) => {
    if (!isOnline) return;
    await supaUpdateProduct(product);
  };

  const handleDeleteProduct = async (id: string) => {
    if (!isOnline) return;
    await supaDeleteProduct(id);
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'pos':
        return <POSPage products={products} onTransactionComplete={handleTransactionComplete} onAddProduct={handleAddProduct} />;
      case 'history':
        return <HistoryPage transactions={transactions} />;
      case 'products':
        return (
          <ProductsPage
            products={products}
            onAddProduct={handleAddProduct}
            onUpdateProduct={handleUpdateProduct}
            onDeleteProduct={handleDeleteProduct}
          />
        );
      case 'dashboard':
        return <DashboardPage transactions={transactions} products={products} />;
      case 'settings':
        return <SettingsPage />;
      default:
        return null;
    }
  };

  return (
    <div className={`flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-900 transition-colors duration-300 ${darkMode ? 'dark' : ''}`}>
      <Sidebar currentPage={currentPage} onNavigate={setCurrentPage} />
      <main className="flex-1 overflow-y-auto">
        {renderPage()}
      </main>
      <BottomNav currentPage={currentPage} onNavigate={setCurrentPage} />
    </div>
  );
}
