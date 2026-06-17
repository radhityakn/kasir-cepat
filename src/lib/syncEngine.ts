import { db } from './db';
import type { SyncQueue } from './db';
import { supabase } from './supabase';

const MAX_RETRIES = 5;

export async function isOnline(): Promise<boolean> {
  return navigator.onLine;
}

// Tambah item ke sync queue
export async function enqueue(
  action: SyncQueue['action'],
  table: SyncQueue['table'],
  recordId: string,
  payload: unknown
) {
  await db.syncQueue.add({
    action,
    table,
    recordId,
    payload: JSON.stringify(payload),
    createdAt: new Date().toISOString(),
    retries: 0,
  });

  // Coba sync langsung kalau online
  if (await isOnline()) {
    processQueue().catch(console.error);
  }
}

// Proses semua item di queue
export async function processQueue() {
  const items = await db.syncQueue.orderBy('createdAt').toArray();

  for (const item of items) {
    try {
      await processItem(item);
      // Berhasil — hapus dari queue & tandai record synced
      await db.syncQueue.delete(item.id!);
      await markSynced(item.table, item.recordId);
    } catch (err) {
      console.warn(`[Sync] Failed to process item ${item.id}:`, err);
      // Increment retry counter
      if (item.retries >= MAX_RETRIES) {
        console.error(`[Sync] Max retries reached for item ${item.id}, removing from queue`);
        await db.syncQueue.delete(item.id!);
      } else {
        await db.syncQueue.update(item.id!, { retries: item.retries + 1 });
      }
    }
  }
}

async function processItem(item: SyncQueue) {
  const payload = JSON.parse(item.payload);

  switch (item.table) {
    case 'products':
      await syncProduct(item.action, item.recordId, payload);
      break;
    case 'transactions':
      await syncTransaction(item.action, item.recordId, payload);
      break;
  }
}

async function syncProduct(action: string, recordId: string, payload: Record<string, unknown>) {
  if (action === 'insert') {
    const { error } = await supabase.from('products').insert(payload as never);
    if (error && error.code !== '23505') throw error; // Ignore duplicate
  } else if (action === 'update') {
    const { error } = await supabase
      .from('products')
      .update(payload as never)
      .eq('id', recordId);
    if (error) throw error;
  } else if (action === 'delete') {
    const { error } = await supabase.from('products').delete().eq('id', recordId);
    if (error) throw error;
  }
}

async function syncTransaction(action: string, recordId: string, payload: Record<string, unknown>) {
  if (action === 'insert') {
    const { items, ...txData } = payload as { items: Record<string, unknown>[]; [key: string]: unknown };

    // Insert transaction
    const { error: txError } = await supabase
      .from('transactions')
      .insert(txData as never);
    if (txError && txError.code !== '23505') throw txError;

    // Insert items
    if (items && items.length > 0) {
      const itemsWithTxId = items.map((item) => ({
        ...item,
        transaction_id: recordId,
      }));
      const { error: itemsError } = await supabase
        .from('transaction_items')
        .insert(itemsWithTxId as never[]);
      if (itemsError && itemsError.code !== '23505') throw itemsError;
    }
  }
  // Transactions biasanya tidak di-update/delete, tapi bisa ditambah kalau perlu
}

async function markSynced(table: 'products' | 'transactions', recordId: string) {
  if (table === 'products') {
    await db.products.update(recordId, { _synced: true });
  } else {
    await db.transactions.update(recordId, { _synced: true });
  }
}

// Full sync: tarik data dari Supabase ke lokal
export async function pullFromRemote(userId: string) {
  if (!(await isOnline())) return;

  try {
    // Pull products
    const { data: products } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });

    if (products) {
      for (const row of products) {
        const p = row as Record<string, unknown>;
        await db.products.put({
          id: p.id as string,
          userId,
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
    }

    // Pull transactions
    const { data: transactions } = await supabase
      .from('transactions')
      .select('*, transaction_items(*)')
      .order('created_at', { ascending: false });

    if (transactions) {
      for (const row of transactions) {
        const tx = row as Record<string, unknown>;
        const items = (tx.transaction_items as Record<string, unknown>[]) ?? [];

        await db.transactions.put({
          id: tx.id as string,
          userId,
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
    }
  } catch (err) {
    console.warn('[Sync] Pull from remote failed:', err);
  }
}
