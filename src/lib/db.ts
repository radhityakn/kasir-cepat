import Dexie from 'dexie';
import type { Table } from 'dexie';

export interface LocalProduct {
  id: string;
  userId: string;
  barcode: string;
  name: string;
  price: number;
  costPrice: number;
  category: string;
  image: string;
  stock: number;
  sold: number;
  updatedAt: string;
  _synced: boolean;
  _deleted: boolean;
}

export interface LocalTransaction {
  id: string;
  userId: string;
  items: LocalTransactionItem[];
  total: number;
  discount: number;
  tax: number;
  grandTotal: number;
  paymentMethod: string;
  amountPaid: number;
  change: number;
  cashier: string;
  customer?: string;
  status: string;
  createdAt: string;
  _synced: boolean;
}

export interface LocalTransactionItem {
  productId: string;
  productName: string;
  productImage: string;
  productPrice: number;
  productCostPrice: number;
  quantity: number;
  notes?: string;
}

export interface SyncQueue {
  id?: number;
  action: 'insert' | 'update' | 'delete';
  table: 'products' | 'transactions';
  recordId: string;
  payload: string;
  createdAt: string;
  retries: number;
}

class KasirDatabase extends Dexie {
  products!: Table<LocalProduct, string>;
  transactions!: Table<LocalTransaction, string>;
  syncQueue!: Table<SyncQueue, number>;

  constructor() {
    super('kasir-cepat-db');

    this.version(1).stores({
      products: 'id, userId, barcode, category, _synced',
      transactions: 'id, userId, createdAt, _synced',
      syncQueue: '++id, table, action, createdAt',
    });
  }
}

export const db = new KasirDatabase();
