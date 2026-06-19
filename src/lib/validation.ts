/**
 * Validation & sanitization utilities for Kasir Cepat.
 * Defense-in-depth: these run client-side BEFORE data hits Supabase.
 * Database CHECK constraints are the final safety net.
 */

// ── Text sanitization ────────────────────────────────────────

/** Trim whitespace and strip HTML tags from text input */
export function sanitizeText(input: string): string {
  return input
    .trim()
    .replace(/<[^>]*>/g, '') // strip HTML tags
    .replace(/\s+/g, ' ');   // collapse multiple whitespace
}

/** Sanitize barcode: keep only alphanumeric characters */
export function sanitizeBarcode(input: string): string {
  return input.trim().replace(/[^a-zA-Z0-9]/g, '');
}

/** Sanitize phone number: keep digits, +, -, spaces, parentheses */
export function sanitizePhone(input: string): string {
  return input.trim().replace(/[^0-9+\-() ]/g, '');
}

// ── Numeric validation ───────────────────────────────────────

/** Parse a string/number to a non-negative number, returns null if invalid */
export function parseNonNegativeNumber(value: string | number): number | null {
  const cleaned = String(value).replace(/[^0-9.,]/g, '').replace(',', '.');
  const num = parseFloat(cleaned);
  if (isNaN(num) || num < 0) return null;
  return num;
}

/** Parse integer > 0, returns null if invalid */
export function parsePositiveInt(value: string | number): number | null {
  const num = parseInt(String(value), 10);
  if (isNaN(num) || num <= 0) return null;
  return num;
}

/** Parse integer >= 0, returns null if invalid */
export function parseNonNegativeInt(value: string | number): number | null {
  const num = parseInt(String(value), 10);
  if (isNaN(num) || num < 0) return null;
  return num;
}

// ── Specific field validators ────────────────────────────────

export interface ValidationResult {
  valid: boolean;
  error: string | null;
}

export function validateProductName(name: string): ValidationResult {
  const sanitized = sanitizeText(name);
  if (!sanitized) return { valid: false, error: 'Nama produk wajib diisi' };
  if (sanitized.length > 150) return { valid: false, error: 'Nama produk maks 150 karakter' };
  return { valid: true, error: null };
}

export function validateStoreName(name: string): ValidationResult {
  const sanitized = sanitizeText(name);
  if (sanitized.length < 2) return { valid: false, error: 'Nama toko minimal 2 karakter' };
  if (sanitized.length > 100) return { valid: false, error: 'Nama toko maks 100 karakter' };
  return { valid: true, error: null };
}

export function validatePersonName(name: string): ValidationResult {
  const sanitized = sanitizeText(name);
  if (!sanitized) return { valid: false, error: 'Nama wajib diisi' };
  if (sanitized.length > 100) return { valid: false, error: 'Nama maks 100 karakter' };
  return { valid: true, error: null };
}

export function validateEmail(email: string): ValidationResult {
  const trimmed = email.trim().toLowerCase();
  if (!trimmed) return { valid: false, error: 'Email wajib diisi' };
  // Basic email regex — not exhaustive, DB/Supabase will do final validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmed)) return { valid: false, error: 'Format email tidak valid' };
  return { valid: true, error: null };
}

export function validatePassword(password: string): ValidationResult {
  if (!password) return { valid: false, error: 'Password wajib diisi' };
  if (password.length < 6) return { valid: false, error: 'Password minimal 6 karakter' };
  return { valid: true, error: null };
}

export function validatePrice(value: string | number, fieldName: string = 'Harga'): ValidationResult {
  const num = parseNonNegativeNumber(value);
  if (num === null) return { valid: false, error: `${fieldName} harus berupa angka dan tidak boleh negatif` };
  return { valid: true, error: null };
}

export function validateStock(value: string | number): ValidationResult {
  const num = parseNonNegativeInt(value);
  if (num === null) return { valid: false, error: 'Stok harus berupa angka bulat dan tidak boleh negatif' };
  if (num > 999999) return { valid: false, error: 'Stok maks 999.999' };
  return { valid: true, error: null };
}

export function validateQty(value: string | number, maxStock?: number): ValidationResult {
  const num = parsePositiveInt(value);
  if (num === null) return { valid: false, error: 'Qty harus lebih dari 0' };
  if (num > 9999) return { valid: false, error: 'Qty maks 9.999 per item' };
  if (maxStock !== undefined && num > maxStock) {
    return { valid: false, error: `Stok tidak cukup (tersisa ${maxStock})` };
  }
  return { valid: true, error: null };
}

export function validateDiscount(percent: string | number): ValidationResult {
  const num = parseNonNegativeNumber(percent);
  if (num === null) return { valid: false, error: 'Diskon harus berupa angka' };
  if (num > 100) return { valid: false, error: 'Diskon maks 100%' };
  return { valid: true, error: null };
}

export function validateInviteCode(code: string): ValidationResult {
  const trimmed = code.trim();
  if (trimmed.length !== 8) return { valid: false, error: 'Kode undangan harus 8 karakter' };
  if (!/^[a-zA-Z0-9]+$/.test(trimmed)) return { valid: false, error: 'Kode undangan hanya boleh huruf dan angka' };
  return { valid: true, error: null };
}
