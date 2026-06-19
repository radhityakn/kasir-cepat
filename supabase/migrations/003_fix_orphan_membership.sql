-- ============================================================
-- KASIR CEPAT — Fix orphan membership (store deleted tapi member masih ada)
-- Migration: 003_fix_orphan_membership.sql
-- Jalankan di: Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. Hapus orphan rows yang ada sekarang
delete from store_members
  where store_id not in (select id from stores);

-- 2. Update RPC create_store_for_owner: auto-cleanup orphan sebelum cek
create or replace function create_store_for_owner(
  p_nama_toko text,
  p_nama_pemilik text,
  p_alamat text default null,
  p_telepon text default null
)
returns uuid
language plpgsql
security definer
as $$
declare
  v_store_id uuid;
begin
  -- Cleanup orphan: hapus membership yang store-nya sudah tidak ada
  delete from store_members
    where user_id = auth.uid()
      and store_id not in (select id from stores);

  -- Cek apakah masih punya membership valid
  if exists (select 1 from store_members sm join stores s on s.id = sm.store_id where sm.user_id = auth.uid()) then
    raise exception 'User sudah tergabung di sebuah toko';
  end if;

  insert into stores (nama, alamat, telepon, owner_id)
  values (p_nama_toko, p_alamat, p_telepon, auth.uid())
  returning id into v_store_id;

  insert into store_members (store_id, user_id, role, nama)
  values (v_store_id, auth.uid(), 'owner', p_nama_pemilik);

  return v_store_id;
end;
$$;

grant execute on function create_store_for_owner to authenticated;

-- 3. Update RPC join_store_with_invite juga: auto-cleanup orphan
create or replace function join_store_with_invite(
  p_code text,
  p_nama text
)
returns uuid
language plpgsql
security definer
as $$
declare
  v_invite record;
begin
  -- Cleanup orphan
  delete from store_members
    where user_id = auth.uid()
      and store_id not in (select id from stores);

  -- Cek apakah masih punya membership valid
  if exists (select 1 from store_members sm join stores s on s.id = sm.store_id where sm.user_id = auth.uid()) then
    raise exception 'User sudah tergabung di sebuah toko';
  end if;

  select * into v_invite from store_invites
    where code = p_code and used_at is null and expires_at > now()
    for update;

  if v_invite is null then
    raise exception 'Kode undangan tidak valid atau sudah kadaluarsa';
  end if;

  insert into store_members (store_id, user_id, role, nama)
  values (v_invite.store_id, auth.uid(), 'cashier', p_nama);

  update store_invites set used_at = now(), used_by = auth.uid()
    where id = v_invite.id;

  return v_invite.store_id;
end;
$$;

grant execute on function join_store_with_invite to authenticated;
