import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { useScannerDetection } from '../hooks/useScannerDetection';
import type { ScannerDevice } from '../hooks/useScannerDetection';

interface AppSettings {
  storeName: string;
  cashierName: string;
  cashierPin: string;
  address: string;
  phone: string;
  notifLowStock: boolean;
  notifDailySummary: boolean;
  autoPrint: boolean;
  printerName: string;
}

interface AppContextType {
  darkMode: boolean;
  toggleDarkMode: () => void;
  settings: AppSettings;
  updateSettings: (partial: Partial<AppSettings>) => void;
  scanner: ScannerDevice;
  updateScannerLabel: (label: string) => void;
  resetScanner: () => void;
}

const defaultSettings: AppSettings = {
  storeName: 'Warung Bu Siti',
  cashierName: 'Admin',
  cashierPin: '1234',
  address: 'Jl. Merdeka No. 1, Jakarta',
  phone: '081234567890',
  notifLowStock: true,
  notifDailySummary: false,
  autoPrint: false,
  printerName: 'Default Printer',
};

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('darkMode') === 'true';
  });

  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem('appSettings');
    return saved ? { ...defaultSettings, ...JSON.parse(saved) } : defaultSettings;
  });

  const { device: scanner, updateLabel: updateScannerLabel, resetDevice: resetScanner } =
    useScannerDetection();

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('darkMode', String(darkMode));
  }, [darkMode]);

  useEffect(() => {
    localStorage.setItem('appSettings', JSON.stringify(settings));
  }, [settings]);

  const toggleDarkMode = () => setDarkMode((prev) => !prev);

  const updateSettings = (partial: Partial<AppSettings>) => {
    setSettings((prev) => ({ ...prev, ...partial }));
  };

  return (
    <AppContext.Provider
      value={{ darkMode, toggleDarkMode, settings, updateSettings, scanner, updateScannerLabel, resetScanner }}
    >
      {children}
    </AppContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
