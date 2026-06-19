import { createContext, useContext, useCallback, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

export type Role = 'owner' | 'cashier';

export interface StoreMembership {
  storeId: string;
  storeName: string;
  storeAlamat: string;
  storeTelepon: string;
  role: Role;
  nama: string;
}

export interface StoreMember {
  id: string;
  userId: string;
  role: Role;
  nama: string;
  joinedAt: string;
}

export interface StoreInvite {
  id: string;
  code: string;
  createdAt: string;
  expiresAt: string;
  usedAt: string | null;
}

interface StoreContextType {
  membership: StoreMembership | null;
  members: StoreMember[];
  invites: StoreInvite[];
  loading: boolean;
  hasStore: boolean;
  role: Role | null;
  storeId: string | null;
  isOwner: boolean;
  isCashier: boolean;
  createStore: (params: { namaToko: string; namaPemilik: string; alamat?: string; telepon?: string }) => Promise<{ storeId: string | null; error: string | null }>;
  joinStore: (params: { code: string; nama: string }) => Promise<{ storeId: string | null; error: string | null }>;
  createInvite: () => Promise<{ code: string | null; error: string | null }>;
  removeMember: (memberId: string) => Promise<{ error: string | null }>;
  refetch: () => Promise<void>;
}

const StoreContext = createContext<StoreContextType | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [membership, setMembership] = useState<StoreMembership | null>(null);
  const [members, setMembers] = useState<StoreMember[]>([]);
  const [invites, setInvites] = useState<StoreInvite[]>([]);
  const [loading, setLoading] = useState(true);

  // ── Fetch membership ───────────────────────────────────────
  const fetchMembership = useCallback(async () => {
    if (!user) {
      setMembership(null);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('store_members')
      .select('store_id, role, nama, stores(id, nama, alamat, telepon)')
      .eq('user_id', user.id)
      .order('joined_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      setMembership(null);
      setLoading(false);
      return;
    }

    const row = data as unknown as {
      store_id: string;
      role: Role;
      nama: string;
      stores: { id: string; nama: string; alamat: string; telepon: string };
    };

    setMembership({
      storeId: row.stores.id,
      storeName: row.stores.nama,
      storeAlamat: row.stores.alamat ?? '',
      storeTelepon: row.stores.telepon ?? '',
      role: row.role,
      nama: row.nama,
    });
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchMembership();
  }, [fetchMembership]);

  // ── Fetch members (owner only) ─────────────────────────────
  const fetchMembers = useCallback(async () => {
    if (!membership || membership.role !== 'owner') return;

    const { data } = await supabase
      .from('store_members')
      .select('id, user_id, role, nama, joined_at')
      .eq('store_id', membership.storeId)
      .order('joined_at', { ascending: true });

    if (data) {
      setMembers(
        (data as unknown as { id: string; user_id: string; role: Role; nama: string; joined_at: string }[]).map((m) => ({
          id: m.id,
          userId: m.user_id,
          role: m.role,
          nama: m.nama,
          joinedAt: m.joined_at,
        }))
      );
    }
  }, [membership]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  // ── Fetch invites (owner only) ─────────────────────────────
  const fetchInvites = useCallback(async () => {
    if (!membership || membership.role !== 'owner') return;

    const { data } = await supabase
      .from('store_invites')
      .select('id, code, created_at, expires_at, used_at')
      .eq('store_id', membership.storeId)
      .order('created_at', { ascending: false });

    if (data) {
      setInvites(
        (data as unknown as { id: string; code: string; created_at: string; expires_at: string; used_at: string | null }[]).map((i) => ({
          id: i.id,
          code: i.code,
          createdAt: i.created_at,
          expiresAt: i.expires_at,
          usedAt: i.used_at,
        }))
      );
    }
  }, [membership]);

  useEffect(() => {
    fetchInvites();
  }, [fetchInvites]);

  // ── Actions ────────────────────────────────────────────────

  const createStore = async (params: {
    namaToko: string;
    namaPemilik: string;
    alamat?: string;
    telepon?: string;
  }): Promise<{ storeId: string | null; error: string | null }> => {
    const { data, error } = await supabase.rpc('create_store_for_owner', {
      p_nama_toko: params.namaToko.trim(),
      p_nama_pemilik: params.namaPemilik.trim(),
      p_alamat: params.alamat?.trim() || null,
      p_telepon: params.telepon?.trim() || null,
    });

    if (error) {
      return { storeId: null, error: error.message };
    }

    await fetchMembership();
    return { storeId: data as string, error: null };
  };

  const joinStore = async (params: {
    code: string;
    nama: string;
  }): Promise<{ storeId: string | null; error: string | null }> => {
    const { data, error } = await supabase.rpc('join_store_with_invite', {
      p_code: params.code.trim(),
      p_nama: params.nama.trim(),
    });

    if (error) {
      if (error.message.includes('sudah tergabung')) {
        return { storeId: null, error: 'Kamu sudah tergabung di sebuah toko' };
      }
      if (error.message.includes('tidak valid') || error.message.includes('kadaluarsa')) {
        return { storeId: null, error: 'Kode undangan tidak valid atau sudah kadaluarsa' };
      }
      return { storeId: null, error: error.message };
    }

    await fetchMembership();
    return { storeId: data as string, error: null };
  };

  const createInvite = async (): Promise<{ code: string | null; error: string | null }> => {
    const { data, error } = await supabase.rpc('create_invite');

    if (error) {
      return { code: null, error: error.message };
    }

    await fetchInvites();
    return { code: data as string, error: null };
  };

  const removeMember = async (memberId: string): Promise<{ error: string | null }> => {
    const { error } = await supabase
      .from('store_members')
      .delete()
      .eq('id', memberId);

    if (error) {
      return { error: error.message };
    }

    await fetchMembers();
    return { error: null };
  };

  return (
    <StoreContext.Provider
      value={{
        membership,
        members,
        invites,
        loading,
        hasStore: !!membership,
        role: membership?.role ?? null,
        storeId: membership?.storeId ?? null,
        isOwner: membership?.role === 'owner',
        isCashier: membership?.role === 'cashier',
        createStore,
        joinStore,
        createInvite,
        removeMember,
        refetch: fetchMembership,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useStoreRole() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStoreRole must be used within StoreProvider');
  return ctx;
}
