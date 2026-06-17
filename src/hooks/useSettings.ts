import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export interface AppSettings {
  storeName: string;
  cashierName: string;
  cashierPin: string;
  address: string;
  phone: string;
  notifLowStock: boolean;
  notifDailySummary: boolean;
  autoPrint: boolean;
  printerName: string;
  darkMode: boolean;
  onboarded: boolean;
}

interface DbSettingsRow {
  store_name: string;
  cashier_name: string;
  cashier_pin: string;
  address: string;
  phone: string;
  notif_low_stock: boolean;
  notif_daily_summary: boolean;
  auto_print: boolean;
  printer_name: string;
  dark_mode: boolean;
  onboarded: boolean;
}

const defaultSettings: AppSettings = {
  storeName: '',
  cashierName: '',
  cashierPin: '',
  address: '',
  phone: '',
  notifLowStock: true,
  notifDailySummary: false,
  autoPrint: false,
  printerName: 'Default Printer',
  darkMode: false,
  onboarded: false,
};

function mapFromDb(row: DbSettingsRow): AppSettings {
  return {
    storeName: row.store_name,
    cashierName: row.cashier_name,
    cashierPin: row.cashier_pin,
    address: row.address,
    phone: row.phone,
    notifLowStock: row.notif_low_stock,
    notifDailySummary: row.notif_daily_summary,
    autoPrint: row.auto_print,
    printerName: row.printer_name,
    darkMode: row.dark_mode,
    onboarded: row.onboarded,
  };
}

function mapToDb(settings: Partial<AppSettings>) {
  const mapped: Record<string, unknown> = {};
  if (settings.storeName !== undefined) mapped.store_name = settings.storeName;
  if (settings.cashierName !== undefined) mapped.cashier_name = settings.cashierName;
  if (settings.cashierPin !== undefined) mapped.cashier_pin = settings.cashierPin;
  if (settings.address !== undefined) mapped.address = settings.address;
  if (settings.phone !== undefined) mapped.phone = settings.phone;
  if (settings.notifLowStock !== undefined) mapped.notif_low_stock = settings.notifLowStock;
  if (settings.notifDailySummary !== undefined) mapped.notif_daily_summary = settings.notifDailySummary;
  if (settings.autoPrint !== undefined) mapped.auto_print = settings.autoPrint;
  if (settings.printerName !== undefined) mapped.printer_name = settings.printerName;
  if (settings.darkMode !== undefined) mapped.dark_mode = settings.darkMode;
  if (settings.onboarded !== undefined) mapped.onboarded = settings.onboarded;
  return mapped;
}

export function useSettings() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['settings', user?.id],
    queryFn: async (): Promise<AppSettings> => {
      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user!.id)
        .single();

      if (error && error.code === 'PGRST116') {
        // No row found — buat row baru
        const { data: newRow, error: insertErr } = await supabase
          .from('user_settings')
          .insert({ user_id: user!.id } as never)
          .select('*')
          .single();

        if (insertErr) throw insertErr;
        return mapFromDb(newRow as unknown as DbSettingsRow);
      }

      if (error) throw error;
      return mapFromDb(data as unknown as DbSettingsRow);
    },
    enabled: !!user,
  });

  const updateMutation = useMutation({
    mutationFn: async (partial: Partial<AppSettings>) => {
      const payload = mapToDb(partial);
      const { error } = await supabase
        .from('user_settings')
        .update(payload as never)
        .eq('user_id', user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    },
  });

  return {
    settings: query.data ?? defaultSettings,
    isLoading: query.isLoading,
    isOnboarded: query.data?.onboarded ?? false,
    updateSettings: updateMutation.mutateAsync,
  };
}
