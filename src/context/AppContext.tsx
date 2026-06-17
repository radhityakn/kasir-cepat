import { createContext, useContext, useEffect } from 'react';
import type { ReactNode } from 'react';
import { useScannerDetection } from '../hooks/useScannerDetection';
import type { ScannerDevice } from '../hooks/useScannerDetection';
import { useSettings } from '../hooks/useSettings';
import type { AppSettings } from '../hooks/useSettings';

interface AppContextType {
  darkMode: boolean;
  toggleDarkMode: () => void;
  settings: AppSettings;
  settingsLoading: boolean;
  updateSettings: (partial: Partial<AppSettings>) => void;
  isOnboarded: boolean;
  completeOnboarding: (data: Pick<AppSettings, 'storeName' | 'cashierName' | 'address' | 'phone'>) => Promise<void>;
  scanner: ScannerDevice;
  updateScannerLabel: (label: string) => void;
  resetScanner: () => void;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const {
    settings,
    isLoading: settingsLoading,
    isOnboarded,
    updateSettings: updateSettingsRemote,
  } = useSettings();

  const { device: scanner, updateLabel: updateScannerLabel, resetDevice: resetScanner } =
    useScannerDetection();

  // Sync dark mode class ke document
  useEffect(() => {
    if (settings.darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [settings.darkMode]);

  const toggleDarkMode = () => {
    updateSettingsRemote({ darkMode: !settings.darkMode }).catch(console.error);
  };

  const updateSettings = (partial: Partial<AppSettings>) => {
    updateSettingsRemote(partial).catch(console.error);
  };

  const completeOnboarding = async (data: Pick<AppSettings, 'storeName' | 'cashierName' | 'address' | 'phone'>) => {
    await updateSettingsRemote({ ...data, onboarded: true });
  };

  return (
    <AppContext.Provider
      value={{
        darkMode: settings.darkMode,
        toggleDarkMode,
        settings,
        settingsLoading,
        updateSettings,
        isOnboarded,
        completeOnboarding,
        scanner,
        updateScannerLabel,
        resetScanner,
      }}
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
