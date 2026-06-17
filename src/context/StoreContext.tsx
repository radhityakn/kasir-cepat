import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import type { Product, Transaction } from '../types';
import { useProducts } from '../hooks/useProducts';
import { useTransactions } from '../hooks/useTransactions';

interface StoreContextType {
  products: Product[];
  transactions: Transaction[];
  isLoading: boolean;
  addProduct: (product: Product) => Promise<void>;
  updateProduct: (product: Product) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  addTransaction: (transaction: Transaction) => Promise<string>;
}

const StoreContext = createContext<StoreContextType | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const {
    products,
    isLoading: productsLoading,
    addProduct,
    updateProduct,
    deleteProduct,
  } = useProducts();

  const {
    transactions,
    isLoading: transactionsLoading,
    addTransaction,
  } = useTransactions();

  const isLoading = productsLoading || transactionsLoading;

  return (
    <StoreContext.Provider
      value={{
        products,
        transactions,
        isLoading,
        addProduct,
        updateProduct,
        deleteProduct,
        addTransaction,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}
