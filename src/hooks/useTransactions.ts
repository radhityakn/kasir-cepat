import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { db } from '../lib/db';
import { enqueue, isOnline } from '../lib/syncEngine';
import { useAuth } from '../context/AuthContext';
import type { Transaction } from '../types';

export function useTransactions() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['transactions', user?.id],
    queryFn: async (): Promise<Transaction[]> => {
      if (await isOnline()) {
        try {
          const { data, error } = await supabase
            .from('transactions')
            .select('*, transaction_items(*)')
            .order('created_at', { ascending: false });

          if (!error && data) {
            // Cache ke IndexedDB
            for (const row of data) {
              const tx = row as Record<string, unknown>;
              const items = (tx.transaction_items as Record<string, unknown>[]) ?? [];
              await db.transactions.put({
                id: tx.id as string,
                userId: user!.id,
                items: items.map((item) => ({
                  productId: item.product_id as string,
                  productName: item.product_name as string,
                  productImage: item.product_image as string,
                  productPrice: item.product_price as number,
                  productCostPrice: item.product_cost_price as number,
                  quantity: item.quantity as number,
                  notes: item.notes as string | undefined,
                })),
                total: tx.total as number,
                discount: tx.discount as number,
                tax: tx.tax as number,
                grandTotal: tx.grand_total as number,
                paymentMethod: tx.payment_method as string,
                amountPaid: tx.amount_paid as number,
                change: tx.change as number,
                cashier: tx.cashier as string,
                customer: tx.customer as string | undefined,
                status: tx.status as string,
                createdAt: tx.created_at as string,
                _synced: true,
              });
            }

            return data.map((row) => {
              const tx = row as Record<string, unknown>;
              const items = (tx.transaction_items as Record<string, unknown>[]) ?? [];
              return {
                id: tx.id as string,
                items: items.map((item: Record<string, unknown>) => ({
                  product: {
                    id: item.product_id as string,
                    barcode: '',
                    name: item.product_name as string,
                    price: item.product_price as number,
                    costPrice: item.product_cost_price as number,
                    category: '',
                    image: item.product_image as string,
                    stock: 0,
                    sold: 0,
                  },
                  quantity: item.quantity as number,
                  notes: item.notes as string | undefined,
                })),
                total: tx.total as number,
                discount: tx.discount as number,
                tax: tx.tax as number,
                grandTotal: tx.grand_total as number,
                paymentMethod: tx.payment_method as Transaction['paymentMethod'],
                amountPaid: tx.amount_paid as number,
                change: tx.change as number,
                cashier: tx.cashier as string,
                date: new Date(tx.created_at as string),
                status: tx.status as Transaction['status'],
                customer: tx.customer as string | undefined,
              };
            });
          }
        } catch {
          // Fallback ke IndexedDB
        }
      }

      // Offline: baca dari IndexedDB
      const local = await db.transactions
        .where('userId')
        .equals(user!.id)
        .reverse()
        .sortBy('createdAt');

      return local.map((tx) => ({
        id: tx.id,
        items: tx.items.map((item) => ({
          product: {
            id: item.productId,
            barcode: '',
            name: item.productName,
            price: item.productPrice,
            costPrice: item.productCostPrice,
            category: '',
            image: item.productImage,
            stock: 0,
            sold: 0,
          },
          quantity: item.quantity,
          notes: item.notes,
        })),
        total: tx.total,
        discount: tx.discount,
        tax: tx.tax,
        grandTotal: tx.grandTotal,
        paymentMethod: tx.paymentMethod as Transaction['paymentMethod'],
        amountPaid: tx.amountPaid,
        change: tx.change,
        cashier: tx.cashier,
        date: new Date(tx.createdAt),
        status: tx.status as Transaction['status'],
        customer: tx.customer,
      }));
    },
    enabled: !!user,
  });

  const addMutation = useMutation({
    mutationFn: async (transaction: Transaction) => {
      const id = transaction.id || crypto.randomUUID();
      const now = new Date().toISOString();

      // Simpan ke IndexedDB (instant)
      await db.transactions.put({
        id,
        userId: user!.id,
        items: transaction.items.map((item) => ({
          productId: item.product.id,
          productName: item.product.name,
          productImage: item.product.image,
          productPrice: item.product.price,
          productCostPrice: item.product.costPrice ?? 0,
          quantity: item.quantity,
          notes: item.notes,
        })),
        total: transaction.total,
        discount: transaction.discount,
        tax: transaction.tax,
        grandTotal: transaction.grandTotal,
        paymentMethod: transaction.paymentMethod,
        amountPaid: transaction.amountPaid,
        change: transaction.change,
        cashier: transaction.cashier,
        customer: transaction.customer,
        status: transaction.status,
        createdAt: now,
        _synced: false,
      });

      // Update stok lokal
      for (const item of transaction.items) {
        const localProduct = await db.products.get(item.product.id);
        if (localProduct) {
          await db.products.update(item.product.id, {
            stock: Math.max(0, localProduct.stock - item.quantity),
            sold: localProduct.sold + item.quantity,
            _synced: false,
          });
        }
      }

      // Enqueue untuk sync ke Supabase
      await enqueue('insert', 'transactions', id, {
        id,
        user_id: user!.id,
        total: transaction.total,
        discount: transaction.discount,
        tax: transaction.tax,
        grand_total: transaction.grandTotal,
        payment_method: transaction.paymentMethod,
        amount_paid: transaction.amountPaid,
        change: transaction.change,
        cashier: transaction.cashier,
        customer: transaction.customer ?? null,
        status: transaction.status,
        created_at: now,
        items: transaction.items.map((item) => ({
          product_id: item.product.id,
          product_name: item.product.name,
          product_image: item.product.image,
          product_price: item.product.price,
          product_cost_price: item.product.costPrice ?? 0,
          quantity: item.quantity,
          notes: item.notes ?? null,
        })),
      });

      // Enqueue stok updates
      for (const item of transaction.items) {
        const localProduct = await db.products.get(item.product.id);
        if (localProduct) {
          await enqueue('update', 'products', item.product.id, {
            stock: localProduct.stock,
            sold: localProduct.sold,
          });
        }
      }

      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });

  return {
    transactions: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    addTransaction: addMutation.mutateAsync,
  };
}
