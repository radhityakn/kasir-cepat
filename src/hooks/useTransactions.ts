import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useStoreRole } from '../context/StoreContext';
import type { Transaction, CartItem } from '../types';

/** Maps Supabase transaction row + items to app's Transaction interface */
function mapRowToTransaction(
  tx: Record<string, unknown>,
  items: Record<string, unknown>[]
): Transaction {
  return {
    id: tx.id as string,
    items: items.map((item) => {
      // harga_modal bisa dari join products, fallback ke 0
      const productData = item.products as Record<string, unknown> | null;
      const costPrice = productData ? Number(productData.harga_modal ?? 0) : 0;

      return {
        product: {
          id: (item.product_id as string) ?? '',
          barcode: '',
          name: item.nama_produk as string,
          price: Number(item.harga_satuan),
          costPrice,
          category: '',
          image: '🍳',
          stock: 0,
          sold: 0,
        },
        quantity: item.qty as number,
        notes: (item.catatan as string) ?? undefined,
      };
    }),
    total: Number(tx.subtotal),
    discount: Number(tx.diskon_nominal),
    tax: Number(tx.pajak),
    grandTotal: Number(tx.total),
    paymentMethod: mapPaymentMethod(tx.metode_bayar as string),
    amountPaid: Number(tx.bayar),
    change: Number(tx.kembalian),
    cashier: '',
    date: new Date(tx.created_at as string),
    status: (tx.status as string) === 'void' ? 'cancelled' : 'completed',
    customer: (tx.nomor_transaksi as string) ?? undefined,
  };
}

/** Map DB enum → app type */
function mapPaymentMethod(dbMethod: string): Transaction['paymentMethod'] {
  switch (dbMethod) {
    case 'tunai': return 'cash';
    case 'qris': return 'qris';
    case 'transfer': return 'transfer';
    default: return 'card';
  }
}

/** Map app type → DB enum */
function mapPaymentMethodToDb(appMethod: Transaction['paymentMethod']): string {
  switch (appMethod) {
    case 'cash': return 'tunai';
    case 'qris': return 'qris';
    case 'transfer': return 'transfer';
    case 'card': return 'lainnya';
  }
}

export function useTransactions() {
  const { user } = useAuth();
  const { storeId } = useStoreRole();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── Fetch transactions ─────────────────────────────────────
  const fetchTransactions = useCallback(async () => {
    if (!user || !storeId) {
      setTransactions([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const { data, error: fetchErr } = await supabase
      .from('transactions')
      .select('*, transaction_items(*, products(harga_modal))')
      .eq('store_id', storeId)
      .order('created_at', { ascending: false });

    if (fetchErr) {
      setError(fetchErr.message);
      setLoading(false);
      return;
    }

    const mapped = (data ?? []).map((row) => {
      const r = row as Record<string, unknown>;
      const items = (r.transaction_items as Record<string, unknown>[]) ?? [];
      return mapRowToTransaction(r, items);
    });

    setTransactions(mapped);
    setLoading(false);
  }, [user, storeId]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  // ── Create transaction via atomic RPC ──────────────────────
  const addTransaction = async (params: {
    items: CartItem[];
    paymentMethod: Transaction['paymentMethod'];
    amountPaid: number;
    discountPercent?: number;
  }): Promise<{ transactionId: string | null; error: string | null }> => {
    if (!storeId) {
      return { transactionId: null, error: 'Belum tergabung di toko' };
    }

    // Client-side validation
    if (!params.items.length) {
      return { transactionId: null, error: 'Keranjang kosong' };
    }

    for (const item of params.items) {
      if (item.quantity <= 0) {
        return { transactionId: null, error: `Qty harus lebih dari 0 untuk ${item.product.name}` };
      }
      if (item.quantity > item.product.stock) {
        return { transactionId: null, error: `Stok ${item.product.name} tidak cukup (sisa ${item.product.stock})` };
      }
    }

    const diskonPersen = params.discountPercent ?? 0;
    if (diskonPersen < 0 || diskonPersen > 100) {
      return { transactionId: null, error: 'Diskon harus antara 0-100%' };
    }

    // Build RPC payload
    const p_items = params.items.map((item) => ({
      product_id: item.product.id,
      qty: item.quantity,
      catatan: item.notes ?? null,
    }));

    const { data, error: rpcErr } = await supabase.rpc('create_transaction', {
      p_items: p_items,
      p_metode_bayar: mapPaymentMethodToDb(params.paymentMethod),
      p_bayar: params.amountPaid,
      p_diskon_persen: diskonPersen,
    });

    if (rpcErr) {
      // Translate known RPC exceptions to user-friendly Indonesian
      const msg = rpcErr.message;
      if (msg.includes('Stok') && msg.includes('tidak cukup')) {
        return { transactionId: null, error: msg };
      }
      if (msg.includes('Keranjang kosong')) {
        return { transactionId: null, error: 'Keranjang kosong' };
      }
      if (msg.includes('Pembayaran kurang')) {
        return { transactionId: null, error: 'Pembayaran kurang dari total tagihan' };
      }
      if (msg.includes('Terlalu banyak transaksi')) {
        return { transactionId: null, error: 'Terlalu banyak transaksi. Coba lagi dalam 1 menit.' };
      }
      if (msg.includes('Produk tidak ditemukan')) {
        return { transactionId: null, error: 'Salah satu produk tidak ditemukan atau sudah dihapus' };
      }
      return { transactionId: null, error: msg };
    }

    await fetchTransactions();
    return { transactionId: data as string, error: null };
  };

  // ── Void transaction via atomic RPC (owner only) ───────────
  const voidTransaction = async (transactionId: string): Promise<{ error: string | null }> => {
    if (!storeId) return { error: 'Belum tergabung di toko' };

    const { error: rpcErr } = await supabase.rpc('void_transaction', {
      p_transaction_id: transactionId,
    });

    if (rpcErr) {
      const msg = rpcErr.message;
      if (msg.includes('Hanya owner')) {
        return { error: 'Hanya owner yang boleh membatalkan transaksi' };
      }
      if (msg.includes('sudah dibatalkan')) {
        return { error: 'Transaksi sudah dibatalkan sebelumnya' };
      }
      if (msg.includes('tidak ditemukan')) {
        return { error: 'Transaksi tidak ditemukan' };
      }
      return { error: msg };
    }

    await fetchTransactions();
    return { error: null };
  };

  return {
    transactions,
    loading,
    error,
    addTransaction,
    voidTransaction,
    refetch: fetchTransactions,
  };
}
