import { useEffect, useRef, useCallback } from 'react';

interface BarcodeScannerOptions {
  /** Dipanggil saat barcode berhasil terbaca */
  onScan: (barcode: string) => void;
  /** Panjang minimum barcode yang valid (default: 4) */
  minLength?: number;
  /** Jeda max antar-keystroke scanner dalam ms (default: 50ms) */
  scanDelay?: number;
  /** Aktif atau tidak (default: true) */
  enabled?: boolean;
}

/**
 * Hook untuk mendeteksi input dari barcode scanner fisik.
 *
 * Scanner bekerja seperti keyboard: mengetik karakter sangat cepat
 * (<50ms antar keystroke) lalu diakhiri dengan Enter.
 * Hook ini membedakan antara ketikan manusia (lambat) dan scanner (cepat).
 */
export function useBarcodeScanner({
  onScan,
  minLength = 4,
  scanDelay = 50,
  enabled = true,
}: BarcodeScannerOptions) {
  const bufferRef    = useRef('');
  const lastKeyRef   = useRef(0);
  const timeoutRef   = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flush = useCallback(() => {
    const code = bufferRef.current.trim();
    bufferRef.current = '';
    if (code.length >= minLength) {
      onScan(code);
    }
  }, [onScan, minLength]);

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Abaikan jika focus ada di dalam input/textarea/select
      // — kecuali jika itu adalah hidden scanner input kita sendiri
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      const isTypingField = (tag === 'input' || tag === 'textarea' || tag === 'select')
        && !(e.target as HTMLElement).dataset.barcodeInput;

      if (isTypingField) return;

      const now = Date.now();
      const delta = now - lastKeyRef.current;
      lastKeyRef.current = now;

      // Jika jeda terlalu lama, anggap mulai scan baru
      if (delta > 500 && bufferRef.current.length > 0) {
        bufferRef.current = '';
      }

      if (e.key === 'Enter') {
        // Commit barcode
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        flush();
        return;
      }

      // Hanya terima karakter printable (angka, huruf, tanda strip dll)
      if (e.key.length === 1) {
        // Scanner sangat cepat — jika delta > scanDelay & buffer kosong,
        // ini mungkin ketikan manual, tapi tetap kita kumpulkan dan
        // bedakan nanti berdasarkan kecepatan total
        bufferRef.current += e.key;

        // Reset timeout — jika tidak ada Enter setelah 200ms, flush juga
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
          // Hanya flush jika terasa seperti scan (rata2 cepat)
          const avgDelay = delta;
          if (avgDelay <= scanDelay * 2 && bufferRef.current.length >= minLength) {
            flush();
          } else {
            bufferRef.current = '';
          }
        }, 200);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [enabled, flush, minLength, scanDelay]);
}
