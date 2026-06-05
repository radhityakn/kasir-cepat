export interface Product {
  id: string;
  /** Kode barcode / SKU unik — digunakan scanner untuk lookup produk */
  barcode: string;
  name: string;
  price: number;
  /** Harga modal/beli per unit */
  costPrice: number;
  category: string;
  image: string;
  stock: number;
  sold: number;
}

export interface CartItem {
  product: Product;
  quantity: number;
  notes?: string;
}

export interface Transaction {
  id: string;
  items: CartItem[];
  total: number;
  discount: number;
  tax: number;
  grandTotal: number;
  paymentMethod: 'cash' | 'qris' | 'transfer' | 'card';
  amountPaid: number;
  change: number;
  cashier: string;
  date: Date;
  status: 'completed' | 'pending' | 'cancelled';
  customer?: string;
}

export type Page = 'pos' | 'history' | 'products' | 'dashboard' | 'settings';
export type PeriodTab = 'daily' | 'weekly' | 'monthly';
