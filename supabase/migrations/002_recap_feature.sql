-- ============================================================
-- KASIR CEPAT — Fitur Rekap Transaksi
-- Migration: 002_recap_feature.sql
-- Jalankan di: Supabase Dashboard → SQL Editor
-- ============================================================

-- Tambah kolom last_recap_at di stores (nullable = belum pernah rekap)
alter table stores add column if not exists last_recap_at timestamptz;

-- Tabel rekap history (menyimpan setiap event rekap)
create table if not exists recap_history (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references stores(id) on delete cascade,
  recap_by uuid not null references auth.users(id),
  period_start timestamptz not null,
  period_end timestamptz not null,
  total_transactions integer not null default 0,
  total_revenue numeric(12,2) not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_recap_history_store on recap_history(store_id, created_at desc);

-- RLS untuk recap_history
alter table recap_history enable row level security;

drop policy if exists "member can read recap history" on recap_history;
create policy "member can read recap history"
  on recap_history for select
  using (store_id = get_my_store_id());

-- RPC: do_recap (hanya owner)
create or replace function do_recap()
returns uuid
language plpgsql
security definer
as $$
declare
  v_store_id uuid;
  v_role member_role;
  v_last_recap timestamptz;
  v_now timestamptz := now();
  v_tx_count integer;
  v_revenue numeric;
  v_recap_id uuid;
begin
  select store_id, role into v_store_id, v_role
    from store_members where user_id = auth.uid()
    order by joined_at desc limit 1;

  if v_store_id is null or v_role != 'owner' then
    raise exception 'Hanya owner yang bisa melakukan rekap';
  end if;

  -- Ambil last_recap_at (null = dari awal)
  select last_recap_at into v_last_recap from stores where id = v_store_id;

  -- Hitung transaksi di periode aktif
  select count(*), coalesce(sum(total), 0)
    into v_tx_count, v_revenue
    from transactions
    where store_id = v_store_id
      and status = 'completed'
      and (v_last_recap is null or created_at > v_last_recap);

  if v_tx_count = 0 then
    raise exception 'Tidak ada transaksi untuk direkap';
  end if;

  -- Simpan ke recap_history
  insert into recap_history (store_id, recap_by, period_start, period_end, total_transactions, total_revenue)
  values (
    v_store_id,
    auth.uid(),
    coalesce(v_last_recap, (select min(created_at) from transactions where store_id = v_store_id)),
    v_now,
    v_tx_count,
    v_revenue
  )
  returning id into v_recap_id;

  -- Update last_recap_at di stores
  update stores set last_recap_at = v_now where id = v_store_id;

  -- Audit log
  insert into audit_log (store_id, user_id, action, table_name, record_id, new_data)
  values (v_store_id, auth.uid(), 'recap', 'recap_history', v_recap_id,
    jsonb_build_object('transactions', v_tx_count, 'revenue', v_revenue, 'period_end', v_now));

  return v_recap_id;
end;
$$;

grant execute on function do_recap to authenticated;
