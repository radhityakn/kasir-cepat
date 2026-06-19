import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useStoreRole } from '../context/StoreContext';
import type { Product } from '../types';

/**
 * Maps a Supabase products row to the app's Product interface.
 * Supabase column names (snake_case) → app field names (camelCase).
 */
function mapRowToProduct(row: Record<string, unknown>): Product {
  return {
    id: row.id as string,
    barcode: (row.barcode as string) ?? '',
    name: row.nama as string,
    price: Number(row.harga_jual),
    costPrice: Number(row.harga_modal),
    category: (row.kategori as string) ?? '',
    image: (row.gambar as string) ?? '🍳',
    stock: row.stok as number,
    sold: 0, // not tracked in DB, computed from transactions if needed
  };
}

export function useProducts() {
  const { user } = useAuth();
  const { storeId, isOwner } = useStoreRole();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── Fetch products ─────────────────────────────────────────
  const fetchProducts = useCallback(async () => {
    if (!user || !storeId) {
      setProducts([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const { data, error: fetchErr } = await supabase
      .from('products')
      .select('id, nama, kategori, harga_jual, harga_modal, stok, barcode, gambar')
      .eq('store_id', storeId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (fetchErr) {
      setError(fetchErr.message);
      setLoading(false);
      return;
    }

    setProducts((data ?? []).map((row) => mapRowToProduct(row as Record<string, unknown>)));
    setLoading(false);
  }, [user, storeId]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // ── Add product (owner only) ───────────────────────────────
  const addProduct = async (product: Omit<Product, 'id' | 'sold'>): Promise<{ error: string | null }> => {
    if (!storeId) return { error: 'Belum tergabung di toko' };
    if (!isOwner) return { error: 'Hanya owner yang bisa menambah produk' };

    // Client-side validation
    const nama = product.name.trim();
    if (!nama || nama.length > 150) {
      return { error: 'Nama produk wajib diisi (maks 150 karakter)' };
    }
    if (product.price < 0) {
      return { error: 'Harga jual tidak boleh negatif' };
    }
    if (product.costPrice < 0) {
      return { error: 'Harga modal tidak boleh negatif' };
    }
    if (product.stock < 0) {
      return { error: 'Stok tidak boleh negatif' };
    }

    const barcode = product.barcode?.trim().replace(/[^a-zA-Z0-9]/g, '') || null;

    const { error: insertErr } = await supabase.from('products').insert({
      store_id: storeId,
      nama,
      kategori: product.category?.trim() || null,
      harga_jual: product.price,
      harga_modal: product.costPrice,
      stok: product.stock,
      barcode,
      gambar: product.image || '🍳',
    });

    if (insertErr) {
      if (insertErr.code === '23505' && insertErr.message.includes('barcode')) {
        return { error: 'Barcode sudah digunakan produk lain di toko ini' };
      }
      return { error: insertErr.message };
    }

    await fetchProducts();
    return { error: null };
  };

  // ── Update product (owner only) ────────────────────────────
  const updateProduct = async (product: Product): Promise<{ error: string | null }> => {
    if (!storeId) return { error: 'Belum tergabung di toko' };
    if (!isOwner) return { error: 'Hanya owner yang bisa mengedit produk' };

    const nama = product.name.trim();
    if (!nama || nama.length > 150) {
      return { error: 'Nama produk wajib diisi (maks 150 karakter)' };
    }
    if (product.price < 0) {
      return { error: 'Harga jual tidak boleh negatif' };
    }
    if (product.costPrice < 0) {
      return { error: 'Harga modal tidak boleh negatif' };
    }
    if (product.stock < 0) {
      return { error: 'Stok tidak boleh negatif' };
    }

    const barcode = product.barcode?.trim().replace(/[^a-zA-Z0-9]/g, '') || null;

    const { error: updateErr } = await supabase
      .from('products')
      .update({
        nama,
        kategori: product.category?.trim() || null,
        harga_jual: product.price,
        harga_modal: product.costPrice,
        stok: product.stock,
        barcode,
        gambar: product.image || '🍳',
      })
      .eq('id', product.id)
      .eq('store_id', storeId);

    if (updateErr) {
      if (updateErr.code === '23505' && updateErr.message.includes('barcode')) {
        return { error: 'Barcode sudah digunakan produk lain di toko ini' };
      }
      return { error: updateErr.message };
    }

    await fetchProducts();
    return { error: null };
  };

  // ── Soft-delete product (owner only) ───────────────────────
  const deleteProduct = async (id: string): Promise<{ error: string | null }> => {
    if (!storeId) return { error: 'Belum tergabung di toko' };
    if (!isOwner) return { error: 'Hanya owner yang bisa menghapus produk' };

    const { error: delErr } = await supabase
      .from('products')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .eq('store_id', storeId);

    if (delErr) {
      return { error: delErr.message };
    }

    await fetchProducts();
    return { error: null };
  };

  return {
    products,
    loading,
    error,
    addProduct,
    updateProduct,
    deleteProduct,
    refetch: fetchProducts,
  };
}
