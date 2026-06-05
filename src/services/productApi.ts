/**
 * Service untuk mengakses data produk Indonesia.
 * 
 * Data offline: 931 produk dari Open Food Facts (barcode prefix Indonesia 089/899)
 * API Online: Open Food Facts + api-products.alpha-projects.cloud (fallback)
 * 
 * Mode: Offline-first — cari di database lokal dulu, jika tidak ketemu baru ke API.
 */

import offlineDB from '../data/offlineProducts.json';

export interface ApiProduct {
  barcode: string;
  name: string;
  brand: string;
}

// ── Offline Database (931 produk Indonesia) ─────────────────────────────────
const offlineProducts: ApiProduct[] = offlineDB as ApiProduct[];

/**
 * Cari produk dari database offline berdasarkan nama (max 20 hasil)
 */
export function searchOfflineByName(query: string): ApiProduct[] {
  if (!query.trim()) return [];
  const q = query.toLowerCase();
  return offlineProducts
    .filter((p) => p.name.toLowerCase().includes(q) || p.brand.toLowerCase().includes(q))
    .slice(0, 20);
}

/**
 * Cari produk dari database offline berdasarkan barcode (exact match)
 */
export function searchOfflineByBarcode(barcode: string): ApiProduct | null {
  return offlineProducts.find((p) => p.barcode === barcode) ?? null;
}

/**
 * Get semua produk offline (untuk browsing)
 */
export function getAllOfflineProducts(): ApiProduct[] {
  return offlineProducts;
}

// ── Online API (Open Food Facts) ────────────────────────────────────────────

const OFF_BASE = 'https://id.openfoodfacts.org/api/v2';

/**
 * Cari produk dari Open Food Facts API (online, Indonesia)
 */
export async function searchOnlineByName(query: string): Promise<ApiProduct[]> {
  if (!query.trim()) return [];
  
  const url = `${OFF_BASE}/search?search_terms=${encodeURIComponent(query)}&countries_tags_en=indonesia&page_size=20&fields=code,product_name,brands`;
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`API error: ${res.status}`);

  const data = await res.json();
  if (!Array.isArray(data.products)) return [];

  return data.products
    .filter((p: { code?: string; product_name?: string }) => p.code && p.product_name)
    .map((p: { code: string; product_name: string; brands?: string }) => ({
      barcode: p.code,
      name: p.product_name.toUpperCase(),
      brand: p.brands ?? '',
    }));
}

/**
 * Lookup produk dari Open Food Facts by barcode (online)
 */
export async function searchOnlineByBarcode(barcode: string): Promise<ApiProduct | null> {
  if (!barcode.trim()) return null;

  const url = `${OFF_BASE}/product/${encodeURIComponent(barcode)}?fields=code,product_name,brands`;
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) return null;

  const data = await res.json();
  if (!data.product?.product_name) return null;

  return {
    barcode: data.product.code ?? barcode,
    name: data.product.product_name.toUpperCase(),
    brand: data.product.brands ?? '',
  };
}

/**
 * Unified search — offline dulu, jika kurang tambah dari online
 */
export async function searchProducts(query: string): Promise<ApiProduct[]> {
  // Offline first
  const offline = searchOfflineByName(query);
  
  // Jika offline sudah cukup (>= 5), return langsung
  if (offline.length >= 5) return offline;

  // Coba tambah dari online
  try {
    const online = await searchOnlineByName(query);
    // Merge, deduplicate by barcode
    const seen = new Set(offline.map((p) => p.barcode));
    const merged = [...offline];
    for (const p of online) {
      if (!seen.has(p.barcode)) {
        merged.push(p);
        seen.add(p.barcode);
      }
    }
    return merged.slice(0, 20);
  } catch {
    // API offline, return apa yang ada
    return offline;
  }
}

/**
 * Unified barcode lookup — offline dulu, jika tidak ketemu coba online
 */
export async function lookupBarcode(barcode: string): Promise<ApiProduct | null> {
  // Offline first
  const offline = searchOfflineByBarcode(barcode);
  if (offline) return offline;

  // Fallback ke online
  try {
    return await searchOnlineByBarcode(barcode);
  } catch {
    return null;
  }
}
