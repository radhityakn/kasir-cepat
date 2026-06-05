import { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode, Html5QrcodeScannerState } from 'html5-qrcode';
import { X, Camera, SwitchCamera, Zap, ZapOff } from 'lucide-react';

interface CameraScannerProps {
  /** Dipanggil saat barcode berhasil terbaca */
  onScan: (barcode: string) => void;
  /** Tutup scanner */
  onClose: () => void;
}

export default function CameraScanner({ onScan, onClose }: CameraScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState('');
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [torch, setTorch] = useState(false);
  const lastScannedRef = useRef('');
  const cooldownRef = useRef(false);

  const handleScanSuccess = useCallback((decodedText: string) => {
    // Prevent double-scan
    if (cooldownRef.current || decodedText === lastScannedRef.current) return;
    cooldownRef.current = true;
    lastScannedRef.current = decodedText;

    onScan(decodedText);

    // Reset cooldown setelah 1.5 detik
    setTimeout(() => {
      cooldownRef.current = false;
      lastScannedRef.current = '';
    }, 1500);
  }, [onScan]);

  const startScanner = useCallback(async (facing: 'environment' | 'user') => {
    const elementId = 'camera-scanner-view';
    if (!document.getElementById(elementId)) return;

    try {
      // Stop existing scanner if running
      if (scannerRef.current) {
        const state = scannerRef.current.getState();
        if (state === Html5QrcodeScannerState.SCANNING || state === Html5QrcodeScannerState.PAUSED) {
          await scannerRef.current.stop();
        }
        scannerRef.current.clear();
      }

      const scanner = new Html5Qrcode(elementId);
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: facing },
        {
          fps: 10,
          qrbox: { width: 280, height: 120 },
          aspectRatio: 1.5,
          disableFlip: false,
        },
        handleScanSuccess,
        () => {} // ignore errors per frame
      );

      setIsReady(true);
      setError('');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('NotAllowedError') || msg.includes('Permission')) {
        setError('Izin kamera ditolak. Berikan izin akses kamera di browser Anda.');
      } else if (msg.includes('NotFoundError') || msg.includes('Requested device not found')) {
        setError('Kamera tidak ditemukan di perangkat ini.');
      } else {
        setError(`Gagal membuka kamera: ${msg}`);
      }
    }
  }, [handleScanSuccess]);

  useEffect(() => {
    startScanner(facingMode);

    return () => {
      if (scannerRef.current) {
        const state = scannerRef.current.getState();
        if (state === Html5QrcodeScannerState.SCANNING || state === Html5QrcodeScannerState.PAUSED) {
          scannerRef.current.stop().then(() => {
            scannerRef.current?.clear();
          }).catch(() => {});
        } else {
          scannerRef.current.clear();
        }
      }
    };
  }, [facingMode, startScanner]);

  const handleSwitchCamera = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
    setIsReady(false);
  };

  const handleToggleTorch = async () => {
    // Torch hanya tersedia di beberapa device
    try {
      const track = (scannerRef.current as any)?.getRunningTrackSettings?.()?.track;
      if (track && 'applyConstraints' in track) {
        await track.applyConstraints({ advanced: [{ torch: !torch }] });
        setTorch(!torch);
      }
    } catch {
      // torch not supported
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-black/80 z-10">
        <div className="flex items-center gap-2">
          <Camera size={18} className="text-brand" />
          <span className="text-white font-semibold text-sm">Scan Barcode</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleToggleTorch}
            className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
            aria-label="Toggle flash"
          >
            {torch ? <ZapOff size={16} className="text-yellow-300" /> : <Zap size={16} className="text-white" />}
          </button>
          <button
            onClick={handleSwitchCamera}
            className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
            aria-label="Switch camera"
          >
            <SwitchCamera size={16} className="text-white" />
          </button>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
            aria-label="Tutup"
          >
            <X size={18} className="text-white" />
          </button>
        </div>
      </div>

      {/* Camera viewport */}
      <div className="flex-1 relative overflow-hidden" ref={containerRef}>
        <div id="camera-scanner-view" className="w-full h-full" />

        {/* Scan guide overlay */}
        {isReady && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            {/* Darkened edges */}
            <div className="absolute inset-0 bg-black/40" />
            {/* Clear scanning area */}
            <div className="relative w-72 h-28 z-10">
              <div className="absolute inset-0 bg-transparent border-2 border-brand rounded-xl" style={{ boxShadow: '0 0 0 9999px rgba(0,0,0,0.4)' }} />
              {/* Corner markers */}
              <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-brand rounded-tl-lg" />
              <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-brand rounded-tr-lg" />
              <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-brand rounded-bl-lg" />
              <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-brand rounded-br-lg" />
              {/* Scan line animation */}
              <div className="absolute top-1 left-2 right-2 h-0.5 bg-brand/80 animate-pulse rounded-full" />
            </div>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900 px-6">
            <div className="text-center">
              <Camera size={48} className="text-gray-500 mx-auto mb-4" />
              <p className="text-white text-sm font-semibold mb-2">Tidak bisa membuka kamera</p>
              <p className="text-gray-400 text-xs mb-4">{error}</p>
              <button
                onClick={() => { setError(''); startScanner(facingMode); }}
                className="bg-brand text-white text-sm font-semibold px-4 py-2 rounded-xl"
              >
                Coba Lagi
              </button>
            </div>
          </div>
        )}

        {/* Loading */}
        {!isReady && !error && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
            <div className="text-center">
              <div className="w-10 h-10 border-3 border-brand border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-white text-sm">Membuka kamera...</p>
            </div>
          </div>
        )}
      </div>

      {/* Footer hint */}
      <div className="px-4 py-4 bg-black/80 text-center">
        <p className="text-gray-400 text-xs">
          Arahkan kamera ke barcode produk. Scan otomatis saat terdeteksi.
        </p>
      </div>
    </div>
  );
}
