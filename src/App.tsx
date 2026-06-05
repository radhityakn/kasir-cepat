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

export default function App() {
  const { darkMode } = useApp();
  const [currentPage, setCurrentPage] = useState<Page>('pos');
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [transactions, setTransactions] = useState<Transaction[]>(() => generateTransactions());

  const handleTransactionComplete = (transaction: Transaction) => {
    setTransactions((prev) => [transaction, ...prev]);
    setProducts((prev) =>
      prev.map((p) => {
        const cartItem = transaction.items.find((i) => i.product.id === p.id);
        if (cartItem) {
          return {
            ...p,
            stock: Math.max(0, p.stock - cartItem.quantity),
            sold: p.sold + cartItem.quantity,
          };
        }
        return p;
      })
    );
  };

  const handleAddProduct = (product: Product) => {
    setProducts((prev) => [...prev, product]);
  };

  const handleUpdateProduct = (product: Product) => {
    setProducts((prev) => prev.map((p) => (p.id === product.id ? product : p)));
  };

  const handleDeleteProduct = (id: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== id));
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
