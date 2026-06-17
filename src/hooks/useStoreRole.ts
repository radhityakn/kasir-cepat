import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export type Role = 'owner' | 'cashier';

export interface StoreMembership {
  storeId: string;
  storeName: string;
  storeAddress: string;
  storePhone: string;
  role: Role;
  displayName: string;
}

export interface StoreMember {
  id: string;
  userId: string;
  role: Role;
  displayName: string;
  joinedAt: string;
}

export interface StoreInvite {
  id: string;
  inviteCode: string;
  email: string | null;
  status: 'pending' | 'accepted' | 'expired';
  createdAt: string;
  expiresAt: string;
}

export function useStoreRole() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch membership user saat ini
  const membershipQuery = useQuery({
    queryKey: ['store-membership', user?.id],
    queryFn: async (): Promise<StoreMembership | null> => {
      const { data, error } = await supabase
        .from('store_members')
        .select('store_id, role, display_name, stores(id, name, address, phone)')
        .eq('user_id', user!.id)
        .limit(1)
        .single();

      if (error && error.code === 'PGRST116') return null; // No row
      if (error) throw error;

      const row = data as unknown as { store_id: string; role: string; display_name: string; stores: { id: string; name: string; address: string; phone: string } };
      return {
        storeId: row.stores.id,
        storeName: row.stores.name,
        storeAddress: row.stores.address,
        storePhone: row.stores.phone,
        role: row.role as Role,
        displayName: row.display_name,
      };
    },
    enabled: !!user,
  });

  // Fetch semua members di store (hanya berguna untuk owner)
  const membersQuery = useQuery({
    queryKey: ['store-members', membershipQuery.data?.storeId],
    queryFn: async (): Promise<StoreMember[]> => {
      const { data, error } = await supabase
        .from('store_members')
        .select('id, user_id, role, display_name, joined_at')
        .eq('store_id', membershipQuery.data!.storeId)
        .order('joined_at', { ascending: true });

      if (error) throw error;
      return ((data ?? []) as unknown as { id: string; user_id: string; role: string; display_name: string; joined_at: string }[]).map((m) => ({
        id: m.id,
        userId: m.user_id,
        role: m.role as Role,
        displayName: m.display_name,
        joinedAt: m.joined_at,
      }));
    },
    enabled: !!membershipQuery.data?.storeId && membershipQuery.data?.role === 'owner',
  });

  // Fetch invites (hanya owner)
  const invitesQuery = useQuery({
    queryKey: ['store-invites', membershipQuery.data?.storeId],
    queryFn: async (): Promise<StoreInvite[]> => {
      const { data, error } = await supabase
        .from('store_invites')
        .select('id, invite_code, email, status, created_at, expires_at')
        .eq('store_id', membershipQuery.data!.storeId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return ((data ?? []) as unknown as { id: string; invite_code: string; email: string | null; status: string; created_at: string; expires_at: string }[]).map((i) => ({
        id: i.id,
        inviteCode: i.invite_code,
        email: i.email,
        status: i.status as StoreInvite['status'],
        createdAt: i.created_at,
        expiresAt: i.expires_at,
      }));
    },
    enabled: !!membershipQuery.data?.storeId && membershipQuery.data?.role === 'owner',
  });

  // Buat store baru (saat onboarding owner)
  const createStoreMutation = useMutation({
    mutationFn: async (params: { storeName: string; address: string; phone: string; ownerName: string }) => {
      console.log('[createStore] Starting with user:', user!.id);

      // 1. Buat store
      const { data: store, error: storeError } = await supabase
        .from('stores')
        .insert({
          name: params.storeName,
          address: params.address,
          phone: params.phone,
          owner_id: user!.id,
        } as never)
        .select('id')
        .single();

      if (storeError) {
        console.error('[createStore] Store insert error:', JSON.stringify(storeError));
        throw new Error(`Store: ${storeError.message} (${storeError.code})`);
      }

      const storeId = (store as unknown as { id: string }).id;
      console.log('[createStore] Store created:', storeId);

      // 2. Tambah owner sebagai member
      const { error: memberError } = await supabase
        .from('store_members')
        .insert({
          store_id: storeId,
          user_id: user!.id,
          role: 'owner',
          display_name: params.ownerName,
        } as never);

      if (memberError) {
        console.error('[createStore] Member insert error:', JSON.stringify(memberError));
        throw new Error(`Member: ${memberError.message} (${memberError.code})`);
      }

      console.log('[createStore] Done successfully');
      return storeId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['store-membership'] });
    },
  });

  // Buat invite baru (owner only)
  const createInviteMutation = useMutation({
    mutationFn: async (params: { email?: string }) => {
      const { data, error } = await supabase
        .from('store_invites')
        .insert({
          store_id: membershipQuery.data!.storeId,
          email: params.email ?? null,
          invited_by: user!.id,
        } as never)
        .select('invite_code')
        .single();

      if (error) throw error;
      return (data as unknown as { invite_code: string }).invite_code;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['store-invites'] });
    },
  });

  // Join store via invite code (kasir)
  const joinStoreMutation = useMutation({
    mutationFn: async (params: { inviteCode: string; displayName: string }) => {
      // 1. Cari invite
      const { data: invite, error: findError } = await supabase
        .from('store_invites')
        .select('id, store_id, status, expires_at')
        .eq('invite_code', params.inviteCode)
        .single();

      if (findError) throw new Error('Kode undangan tidak ditemukan');

      const inv = invite as unknown as { id: string; store_id: string; status: string; expires_at: string };

      if (inv.status !== 'pending') throw new Error('Undangan sudah tidak berlaku');
      if (new Date(inv.expires_at) < new Date()) throw new Error('Undangan sudah kadaluarsa');

      // 2. Tambah user sebagai member
      const { error: joinError } = await supabase
        .from('store_members')
        .insert({
          store_id: inv.store_id,
          user_id: user!.id,
          role: 'cashier',
          display_name: params.displayName,
        } as never);

      if (joinError) {
        if (joinError.code === '23505') throw new Error('Kamu sudah bergabung di toko ini');
        throw joinError;
      }

      // 3. Update invite status
      await supabase
        .from('store_invites')
        .update({ status: 'accepted' } as never)
        .eq('id', inv.id);

      return inv.store_id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['store-membership'] });
    },
  });

  // Hapus member (owner only)
  const removeMemberMutation = useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await supabase
        .from('store_members')
        .delete()
        .eq('id', memberId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['store-members'] });
    },
  });

  // Revoke invite (owner only)
  const revokeInviteMutation = useMutation({
    mutationFn: async (inviteId: string) => {
      const { error } = await supabase
        .from('store_invites')
        .update({ status: 'expired' } as never)
        .eq('id', inviteId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['store-invites'] });
    },
  });

  return {
    // State
    membership: membershipQuery.data ?? null,
    members: membersQuery.data ?? [],
    invites: invitesQuery.data ?? [],
    isLoading: membershipQuery.isLoading,
    hasStore: !!membershipQuery.data,
    role: membershipQuery.data?.role ?? null,
    storeId: membershipQuery.data?.storeId ?? null,
    isOwner: membershipQuery.data?.role === 'owner',
    isCashier: membershipQuery.data?.role === 'cashier',

    // Actions
    createStore: createStoreMutation.mutateAsync,
    createInvite: createInviteMutation.mutateAsync,
    joinStore: joinStoreMutation.mutateAsync,
    removeMember: removeMemberMutation.mutateAsync,
    revokeInvite: revokeInviteMutation.mutateAsync,
  };
}
