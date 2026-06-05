import { useState } from 'react';
import {
  X, Download, Upload, FileSpreadsheet,
  CheckCircle, Loader, AlertCircle, ExternalLink, CloudUpload,
} from 'lucide-react';
import type { Transaction } from '../types';
import { downloadExcel, buildWorkbook, workbookToBlob } from '../utils/exportExcel';
import { useApp } from '../context/AppContext';

interface ExportModalProps {
  transactions: Transaction[];
  periodLabel: string;
  onClose: () => void;
}

type DriveStatus = 'idle' | 'signing-in' | 'uploading' | 'success' | 'error';

// ── Google Drive upload via gapi ─────────────────────────────────────────────
// CLIENT_ID dari Google Cloud Console (OAuth 2.0)
// Ganti dengan Client ID project Google Cloud Anda untuk produksi.
const GDRIVE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? '';
const GDRIVE_SCOPE     = 'https://www.googleapis.com/auth/drive.file';

declare global {
  interface Window {
    gapi: {
      load: (lib: string, cb: () => void) => void;
      auth2: {
        init: (cfg: object) => Promise<{
          signIn: () => Promise<{ getAuthResponse: () => { access_token: string } }>;
          currentUser: { get: () => { getAuthResponse: () => { access_token: string } } };
          isSignedIn: { get: () => boolean };
        }>;
      };
    };
    google: {
      accounts: {
        oauth2: {
          initTokenClient: (cfg: {
            client_id: string;
            scope: string;
            callback: (resp: { access_token?: string; error?: string }) => void;
          }) => { requestAccessToken: () => void };
        };
      };
    };
  }
}

async function uploadToDrive(
  blob: Blob,
  filename: string,
  accessToken: string,
): Promise<string> {
  const metadata = {
    name: filename,
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  };

  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  form.append('file', blob);

  const res = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink',
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: form,
    },
  );

  if (!res.ok) throw new Error(`Upload gagal: ${res.status} ${res.statusText}`);
  const data = await res.json();
  return data.webViewLink as string;
}

function loadGsiScript(): Promise<void> {
  return new Promise((resolve) => {
    if (document.getElementById('gsi-script')) { resolve(); return; }
    const s = document.createElement('script');
    s.id  = 'gsi-script';
    s.src = 'https://accounts.google.com/gsi/client';
    s.onload = () => resolve();
    document.head.appendChild(s);
  });
}

export default function ExportModal({ transactions, periodLabel, onClose }: ExportModalProps) {
  const { settings } = useApp();
  const [driveStatus, setDriveStatus] = useState<DriveStatus>('idle');
  const [driveLink, setDriveLink]     = useState('');
  const [driveError, setDriveError]   = useState('');

  const store = { storeName: settings.storeName, cashierName: settings.cashierName };

  const date = new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
    .format(new Date()).replace(/ /g, '_');
  const filename = `Laporan_${settings.storeName.replace(/\s+/g, '_')}_${periodLabel}_${date}.xlsx`;

  // ── Download lokal ──────────────────────────────────────────────────────────
  const handleDownload = () => {
    downloadExcel(transactions, store, periodLabel);
  };

  // ── Upload ke Google Drive ──────────────────────────────────────────────────
  const handleUploadDrive = async () => {
    if (!GDRIVE_CLIENT_ID) {
      setDriveError('Client ID Google belum dikonfigurasi. Lihat panduan di bawah.');
      setDriveStatus('error');
      return;
    }

    setDriveStatus('signing-in');
    setDriveError('');

    try {
      await loadGsiScript();

      const wb   = buildWorkbook(transactions, store, periodLabel);
      const blob = workbookToBlob(wb);

      // Minta access token via Google Identity Services
      const token = await new Promise<string>((resolve, reject) => {
        const client = window.google.accounts.oauth2.initTokenClient({
          client_id: GDRIVE_CLIENT_ID,
          scope: GDRIVE_SCOPE,
          callback: (resp) => {
            if (resp.error || !resp.access_token) {
              reject(new Error(resp.error ?? 'Gagal mendapatkan token'));
            } else {
              resolve(resp.access_token);
            }
          },
        });
        client.requestAccessToken();
      });

      setDriveStatus('uploading');
      const link = await uploadToDrive(blob, filename, token);
      setDriveLink(link);
      setDriveStatus('success');
    } catch (err) {
      setDriveError(err instanceof Error ? err.message : 'Terjadi kesalahan');
      setDriveStatus('error');
    }
  };

  const hasClientId = Boolean(GDRIVE_CLIENT_ID);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center p-0 md:p-4">
      <div className="bg-white dark:bg-gray-800 w-full md:max-w-md rounded-t-3xl md:rounded-2xl max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-2.5">
            <FileSpreadsheet size={20} className="text-brand" />
            <h3 className="text-base font-bold text-gray-900 dark:text-white">Export Laporan</h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            aria-label="Tutup"
          >
            <X size={15} className="text-gray-600 dark:text-gray-300" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* File info */}
          <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
            <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center flex-shrink-0">
              <FileSpreadsheet size={20} className="text-green-600 dark:text-green-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">{filename}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                {transactions.length} transaksi · 3 sheet (Ringkasan, Transaksi, Detail Item)
              </p>
            </div>
          </div>

          {/* ── Option 1: Download lokal ── */}
          <div className="card p-4">
            <div className="flex items-start gap-3 mb-3">
              <div className="w-9 h-9 bg-blue-50 dark:bg-blue-900/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <Download size={17} className="text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-800 dark:text-gray-100">Unduh ke Device</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                  Simpan file .xlsx langsung ke komputer atau smartphone Anda
                </p>
              </div>
            </div>
            <button onClick={handleDownload} className="btn-primary w-full py-2.5 text-sm">
              <Download size={15} />
              Unduh Excel (.xlsx)
            </button>
          </div>

          {/* ── Option 2: Upload ke Google Drive ── */}
          <div className="card p-4">
            <div className="flex items-start gap-3 mb-3">
              <div className="w-9 h-9 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <CloudUpload size={17} className="text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-800 dark:text-gray-100">Upload ke Google Drive</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                  Upload otomatis ke My Drive Google Anda
                </p>
              </div>
            </div>

            {/* Status area */}
            {driveStatus === 'idle' && (
              <button
                onClick={handleUploadDrive}
                disabled={!hasClientId}
                className="btn-primary w-full py-2.5 text-sm bg-yellow-500 hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Upload size={15} />
                {hasClientId ? 'Login Google & Upload' : 'Perlu Konfigurasi'}
              </button>
            )}

            {driveStatus === 'signing-in' && (
              <div className="flex items-center justify-center gap-2 py-3 text-sm text-gray-500 dark:text-gray-400">
                <Loader size={16} className="animate-spin" />
                Menunggu login Google...
              </div>
            )}

            {driveStatus === 'uploading' && (
              <div className="flex items-center justify-center gap-2 py-3 text-sm text-brand">
                <Loader size={16} className="animate-spin" />
                Mengupload ke Google Drive...
              </div>
            )}

            {driveStatus === 'success' && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-3 py-2 rounded-xl">
                  <CheckCircle size={15} />
                  File berhasil diupload!
                </div>
                {driveLink && (
                  <a
                    href={driveLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full py-2.5 text-sm font-semibold text-brand border border-brand rounded-xl hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"
                  >
                    <ExternalLink size={14} />
                    Buka di Google Drive
                  </a>
                )}
                <button
                  onClick={() => setDriveStatus('idle')}
                  className="btn-secondary w-full py-2 text-sm"
                >
                  Upload Ulang
                </button>
              </div>
            )}

            {driveStatus === 'error' && (
              <div className="space-y-2">
                <div className="flex items-start gap-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-xl">
                  <AlertCircle size={15} className="mt-0.5 flex-shrink-0" />
                  <span>{driveError}</span>
                </div>
                <button
                  onClick={() => setDriveStatus('idle')}
                  className="btn-secondary w-full py-2 text-sm"
                >
                  Coba Lagi
                </button>
              </div>
            )}

            {/* Setup guide jika belum ada Client ID */}
            {!hasClientId && (
              <details className="mt-3">
                <summary className="text-xs text-gray-400 dark:text-gray-500 cursor-pointer hover:text-gray-600 dark:hover:text-gray-300 select-none">
                  Cara setup Google Drive ▾
                </summary>
                <ol className="text-xs text-gray-500 dark:text-gray-400 mt-2 space-y-1.5 list-decimal list-inside bg-gray-50 dark:bg-gray-700/50 rounded-xl p-3">
                  <li>Buka <span className="font-mono">console.cloud.google.com</span></li>
                  <li>Buat project baru → Aktifkan <b>Google Drive API</b></li>
                  <li>Buat <b>OAuth 2.0 Client ID</b> (tipe: Web application)</li>
                  <li>Tambahkan <span className="font-mono">http://localhost:5173</span> ke Authorized origins</li>
                  <li>Salin Client ID lalu tambahkan ke file <span className="font-mono">.env</span>:</li>
                  <li className="font-mono text-[10px] bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded block ml-4">
                    VITE_GOOGLE_CLIENT_ID=your_client_id
                  </li>
                </ol>
              </details>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
