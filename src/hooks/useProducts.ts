import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { db } from '../lib/db';
import { enqueue, isOnline } from '../lib/syncEngine';
import { useAuth } from '../context/AuthContext';
import type { Product } from '../types';

function mapLocalToProduct(row: { id: string; barcode: string; name: string; price: number; costPrice: number; category: string; image: string; stock: number; sold: number }): Product {
  return {
    id: row.id,
    barcode: row.barcode,
    name: row.name,
    price: row.price,
    costPrice: row.costPrice,
    category: row.category,
    image: row.image,
    stock: row.stock,
    sold: row.sold,
  };
}

export function useProducts() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['products', user?.id],
    queryFn: async (): Promise<Product[]> => {
      if (await isOnline()) {
        try {
          const { data, error } = await supabase
            .from('products')
            .select('id, barcode, name, price, cost_price, category, image, stock, sold, updated_at')
            .order('created_at', { ascending: false });

          if (!error && data) {
            for (const row of data) {
              const p = row as Record<string, unknown>;
              await db.products.put({
                id: p.id as string,
                userId: user!.id,
                barcode: p.barcode as string,
                name: p.name as string,
                price: p.price as number,
                costPrice: p.cost_price as number,
                category: p.category as string,
                image: p.image as string,
                stock: p.stock as number,
                sold: p.sold as number,
                updatedAt: p.updated_at as string,
                _synced: true,
                _deleted: false,
              });
            }

            return data.map((row) => {
              const p = row as Record<string, unknown>;
              return mapLocalToProduct({
                id: p.id as string,
                barcode: p.barcode as string,
                name: p.name as string,
                price: p.price as number,
                costPrice: p.cost_price as number,
                category: p.category as string,
                image: p.image as string,
                stock: p.stock as number,
                sold: p.sold as number,
              });
            });
          }
        } catch {
          // Fallback ke IndexedDB
        }
      }

      // Offline atau error: baca dari IndexedDB
      const local = await db.products
        .where('userId')
        .equals(user!.id)
        .and((p) => !p._deleted)
        .reverse()
        .sortBy('updatedAt');

      return local.map(mapLocalToProduct);
    },
    enabled: !!user,
  });

  const addMutation = useMutation({
    mutationFn: async (product: Omit<Product, 'id'> & { id?: string }) => {
      const id = product.id || crypto.randomUUID();
      const now = new Date().toISOString();

      await db.products.put({
        id,
        userId: user!.id,
        barcode: product.barcode,
        name: product.name,
        price: product.price,
        costPrice: product.costPrice,
        category: product.category,
        image: product.image,
        stock: product.stock,
        sold: product.sold ?? 0,
        updatedAt: now,
        _synced: false,
        _deleted: false,
      });

      await enqueue('insert', 'products', id, {
        id,
        user_id: user!.id,
        barcode: product.barcode,
        name: product.name,
        price: product.price,
        cost_price: product.costPrice,
        category: product.category,
        image: product.image,
        stock: product.stock,
        sold: product.sold ?? 0,
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['products'] }),
  });

  const updateMutation = useMutation({
    mutationFn: async (product: Product) => {
      const now = new Date().toISOString();

      await db.products.update(product.id, {
        barcode: product.barcode,
        name: product.name,
        price: product.price,
        costPrice: product.costPrice,
        category: product.category,
        image: product.image,
        stock: product.stock,
        sold: product.sold,
        updatedAt: now,
        _synced: false,
      });

      await enqueue('update', 'products', product.id, {
        barcode: product.barcode,
        name: product.name,
        price: product.price,
        cost_price: product.costPrice,
        category: product.category,
        image: product.image,
        stock: product.stock,
        sold: product.sold,
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['products'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await db.products.update(id, { _deleted: true, _synced: false });
      await enqueue('delete', 'products', id, {});
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['products'] }),
  });

  return {
    products: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    addProduct: addMutation.mutateAsync,
    updateProduct: updateMutation.mutateAsync,
    deleteProduct: deleteMutation.mutateAsync,
  };
}
