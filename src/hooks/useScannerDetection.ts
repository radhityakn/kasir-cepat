import { useEffect, useRef, useState, useCallback } from 'react';

export interface ScannerDevice {
  /** Label yang ditampilkan — bisa di-edit manual */
  label: string;
  /** Status koneksi berdasarkan aktivitas terkini */
  status: 'connected' | 'idle' | 'disconnected';
  /** Waktu scan terakhir terdeteksi */
  lastSeen: Date | null;
  /** Total jumlah scan sejak app dibuka */
  scanCount: number;
  /** Rata-rata kecepatan (char/ms) dari sesi scan terakhir */
  avgSpeed: number | null;
}

const IDLE_TIMEOUT_MS   = 30_000;   // 30 detik tanpa scan → idle
const DISCONN_TIMEOUT_MS = 120_000; // 2 menit → disconnected

/**
 * Mendeteksi keberadaan & status barcode scanner fisik
 * berdasarkan pola keystroke: scanner sangat cepat (< 50ms/char).
 *
 * Browser tidak bisa membaca nama device HID tanpa Web HID API,
 * namun status, waktu, dan kecepatan bisa dipantau dari perilaku input.
 */
export function useScannerDetection() {
  const [device, setDevice] = useState<ScannerDevice>(() => {
    const saved = localStorage.getItem('scannerDevice');
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        ...parsed,
        lastSeen: parsed.lastSeen ? new Date(parsed.lastSeen) : null,
        status: 'disconnected', // mulai sebagai disconnected, update setelah cek
      };
    }
    return {
      label: 'Barcode Scanner',
      status: 'disconnected',
      lastSeen: null,
      scanCount: 0,
      avgSpeed: null,
    };
  });

  const bufferRef    = useRef('');
  const lastKeyRef   = useRef(0);
  const keystrokesRef = useRef<number[]>([]);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const disconnTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const persistDevice = useCallback((d: ScannerDevice) => {
    localStorage.setItem('scannerDevice', JSON.stringify(d));
  }, []);

  const markConnected = useCallback((avgSpeed: number) => {
    setDevice((prev) => {
      const next: ScannerDevice = {
        ...prev,
        status: 'connected',
        lastSeen: new Date(),
        scanCount: prev.scanCount + 1,
        avgSpeed,
      };
      persistDevice(next);
      return next;
    });

    // Reset idle timer
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    if (disconnTimerRef.current) clearTimeout(disconnTimerRef.current);

    idleTimerRef.current = setTimeout(() => {
      setDevice((prev) => {
        const next = { ...prev, status: 'idle' as const };
        persistDevice(next);
        return next;
      });
    }, IDLE_TIMEOUT_MS);

    disconnTimerRef.current = setTimeout(() => {
      setDevice((prev) => {
        const next = { ...prev, status: 'disconnected' as const };
        persistDevice(next);
        return next;
      });
    }, DISCONN_TIMEOUT_MS);
  }, [persistDevice]);

  const updateLabel = useCallback((label: string) => {
    setDevice((prev) => {
      const next = { ...prev, label };
      persistDevice(next);
      return next;
    });
  }, [persistDevice]);

  const resetDevice = useCallback(() => {
    const fresh: ScannerDevice = {
      label: 'Barcode Scanner',
      status: 'disconnected',
      lastSeen: null,
      scanCount: 0,
      avgSpeed: null,
    };
    setDevice(fresh);
    persistDevice(fresh);
  }, [persistDevice]);

  // Sinkronisasi status awal berdasarkan lastSeen tersimpan
  useEffect(() => {
    setDevice((prev) => {
      if (!prev.lastSeen) return prev;
      const elapsed = Date.now() - new Date(prev.lastSeen).getTime();
      let status: ScannerDevice['status'] = 'connected';
      if (elapsed > DISCONN_TIMEOUT_MS) status = 'disconnected';
      else if (elapsed > IDLE_TIMEOUT_MS) status = 'idle';
      return { ...prev, status };
    });
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      const isTypingField =
        (tag === 'input' || tag === 'textarea' || tag === 'select') &&
        !(e.target as HTMLElement).dataset.barcodeInput;
      if (isTypingField) return;

      const now = Date.now();
      const delta = now - lastKeyRef.current;
      lastKeyRef.current = now;

      if (delta > 500) {
        bufferRef.current = '';
        keystrokesRef.current = [];
      }

      if (e.key === 'Enter') {
        const code = bufferRef.current.trim();
        bufferRef.current = '';
        if (code.length >= 4 && keystrokesRef.current.length >= 3) {
          // Hitung rata-rata kecepatan dari sesi ini
          const deltas = keystrokesRef.current;
          const avg = deltas.reduce((a, b) => a + b, 0) / deltas.length;
          // Hanya anggap scanner jika rata-rata < 50ms per char
          if (avg < 50) {
            markConnected(Math.round(avg));
          }
        }
        keystrokesRef.current = [];
        return;
      }

      if (e.key.length === 1) {
        bufferRef.current += e.key;
        if (lastKeyRef.current > 0) {
          keystrokesRef.current.push(delta);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      if (disconnTimerRef.current) clearTimeout(disconnTimerRef.current);
    };
  }, [markConnected]);

  return { device, updateLabel, resetDevice };
}
