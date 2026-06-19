-- ============================================================
-- KASIR CEPAT — Security & Schema Hardening
-- Migration: 001_security_hardening.sql
-- Jalankan di: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- ============================================
-- EXTENSIONS
-- ============================================
create extension if not exists "pgcrypto";

-- ============================================
-- ENUM TYPES
-- ============================================
do $$ begin
  create type member_role as enum ('owner', 'cashier');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type payment_method as enum ('tunai', 'qris', 'transfer', 'lainnya');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type transaction_status as enum ('completed', 'void');
exception when duplicate_object then null;
end $$;

-- ============================================
-- 1. STORES
-- ============================================
create table if not exists stores (
  id uuid primary key default gen_random_uuid(),
  nama text not null check (char_length(nama) between 2 and 100),
  alamat text,
  telepon text,
  owner_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================
-- 2. STORE MEMBERS
-- ============================================
create table if not exists store_members (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references stores(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role member_role not null,
  nama text not null check (char_length(nama) between 1 and 100),
  joined_at timestamptz not null default now(),
  unique (store_id, user_id)
);

-- ============================================
-- 3. STORE INVITES
-- ============================================
create table if not exists store_invites (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references stores(id) on delete cascade,
  code text not null unique check (char_length(code) = 8),
  created_by uuid not null references auth.users(id),
  expires_at timestamptz not null default (now() + interval '7 days'),
  used_at timestamptz,
  used_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

-- ============================================
-- 4. PRODUCTS
-- ============================================
create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references stores(id) on delete cascade,
  nama text not null check (char_length(nama) between 1 and 150),
  kategori text,
  harga_jual numeric(12,2) not null check (harga_jual >= 0),
  harga_modal numeric(12,2) not null default 0 check (harga_modal >= 0),
  stok integer not null default 0 check (stok >= 0),
  barcode text,
  gambar text,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (store_id, barcode)
);

-- ============================================
-- 5. TRANSACTIONS
-- ============================================
create sequence if not exists transaksi_seq;

create table if not exists transactions (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references stores(id) on delete cascade,
  cashier_id uuid not null references auth.users(id),
  nomor_transaksi text not null,
  subtotal numeric(12,2) not null check (subtotal >= 0),
  diskon_persen numeric(5,2) not null default 0 check (diskon_persen between 0 and 100),
  diskon_nominal numeric(12,2) not null default 0 check (diskon_nominal >= 0),
  pajak numeric(12,2) not null default 0 check (pajak >= 0),
  total numeric(12,2) not null check (total >= 0),
  metode_bayar payment_method not null,
  bayar numeric(12,2) not null check (bayar >= 0),
  kembalian numeric(12,2) not null default 0 check (kembalian >= 0),
  status transaction_status not null default 'completed',
  created_at timestamptz not null default now(),
  unique (store_id, nomor_transaksi),
  check (bayar >= total)
);

-- ============================================
-- 6. TRANSACTION ITEMS
-- ============================================
create table if not exists transaction_items (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null references transactions(id) on delete cascade,
  product_id uuid references products(id) on delete set null,
  nama_produk text not null,
  harga_satuan numeric(12,2) not null check (harga_satuan >= 0),
  qty integer not null check (qty > 0),
  subtotal numeric(12,2) not null check (subtotal >= 0),
  catatan text
);

-- ============================================
-- 7. USER SETTINGS
-- ============================================
create table if not exists user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  dark_mode boolean not null default false,
  notif_stok_rendah boolean not null default true,
  auto_print boolean not null default false,
  printer_config jsonb,
  updated_at timestamptz not null default now()
);

-- ============================================
-- 8. AUDIT LOG
-- ============================================
create table if not exists audit_log (
  id bigint generated always as identity primary key,
  store_id uuid references stores(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  action text not null,
  table_name text not null,
  record_id uuid,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz not null default now()
);

-- ============================================
-- 9. RATE LIMIT COUNTER (Opsi A — simple DB-based)
-- ============================================
create table if not exists rate_limit_counter (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  action_type text not null,  -- 'transaction' | 'product_write'
  created_at timestamptz not null default now()
);
create index if not exists idx_rate_limit_user_action on rate_limit_counter(user_id, action_type, created_at desc);

-- ============================================
-- TRIGGERS: auto-update updated_at
-- ============================================
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_stores_updated_at on stores;
create trigger trg_stores_updated_at
  before update on stores
  for each row execute function set_updated_at();

drop trigger if exists trg_products_updated_at on products;
create trigger trg_products_updated_at
  before update on products
  for each row execute function set_updated_at();

-- ============================================
-- INDEXES
-- ============================================
create index if not exists idx_store_members_user on store_members(user_id);
create index if not exists idx_store_members_store on store_members(store_id);

create index if not exists idx_products_store on products(store_id) where deleted_at is null;
create index if not exists idx_products_barcode on products(store_id, barcode);

create index if not exists idx_transactions_store on transactions(store_id);
create index if not exists idx_transactions_cashier on transactions(cashier_id);
create index if not exists idx_transactions_store_created on transactions(store_id, created_at desc);
create index if not exists idx_transactions_status on transactions(store_id, status);

create index if not exists idx_transaction_items_transaction on transaction_items(transaction_id);
create index if not exists idx_transaction_items_product on transaction_items(product_id);

create index if not exists idx_audit_log_store_created on audit_log(store_id, created_at desc);
create index if not exists idx_store_invites_code on store_invites(code) where used_at is null;

-- ============================================
-- RLS HELPER FUNCTIONS (security definer, stable)
-- ============================================
create or replace function get_my_store_id()
returns uuid
language sql
security definer
stable
as $$
  select store_id from store_members where user_id = auth.uid() order by joined_at desc limit 1;
$$;

create or replace function get_my_role()
returns member_role
language sql
security definer
stable
as $$
  select role from store_members where user_id = auth.uid() order by joined_at desc limit 1;
$$;

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
alter table stores enable row level security;
alter table store_members enable row level security;
alter table store_invites enable row level security;
alter table products enable row level security;
alter table transactions enable row level security;
alter table transaction_items enable row level security;
alter table user_settings enable row level security;
alter table audit_log enable row level security;

-- STORES
drop policy if exists "member can read own store" on stores;
create policy "member can read own store"
  on stores for select
  using (id = get_my_store_id());

drop policy if exists "owner can update own store" on stores;
create policy "owner can update own store"
  on stores for update
  using (owner_id = auth.uid());

-- STORE_MEMBERS
drop policy if exists "member can read team in own store" on store_members;
create policy "member can read team in own store"
  on store_members for select
  using (store_id = get_my_store_id());

drop policy if exists "owner can remove member" on store_members;
create policy "owner can remove member"
  on store_members for delete
  using (store_id = get_my_store_id() and get_my_role() = 'owner' and user_id != auth.uid());

-- STORE_INVITES
drop policy if exists "owner can manage invites" on store_invites;
create policy "owner can manage invites"
  on store_invites for all
  using (store_id = get_my_store_id() and get_my_role() = 'owner')
  with check (store_id = get_my_store_id() and get_my_role() = 'owner');

-- Kasir/siapapun yg login bisa baca invite by code (untuk join)
drop policy if exists "anyone can read invite by code" on store_invites;
create policy "anyone can read invite by code"
  on store_invites for select
  using (auth.uid() is not null);

-- PRODUCTS
drop policy if exists "member can read products" on products;
create policy "member can read products"
  on products for select
  using (store_id = get_my_store_id());

drop policy if exists "owner can insert products" on products;
create policy "owner can insert products"
  on products for insert
  with check (store_id = get_my_store_id() and get_my_role() = 'owner');

drop policy if exists "owner can update products" on products;
create policy "owner can update products"
  on products for update
  using (store_id = get_my_store_id() and get_my_role() = 'owner');

drop policy if exists "owner can delete products" on products;
create policy "owner can delete products"
  on products for delete
  using (store_id = get_my_store_id() and get_my_role() = 'owner');

-- TRANSACTIONS
drop policy if exists "owner can read all transactions" on transactions;
create policy "owner can read all transactions"
  on transactions for select
  using (store_id = get_my_store_id() and get_my_role() = 'owner');

drop policy if exists "cashier can read own transactions" on transactions;
create policy "cashier can read own transactions"
  on transactions for select
  using (store_id = get_my_store_id() and get_my_role() = 'cashier' and cashier_id = auth.uid());

-- TRANSACTION_ITEMS
drop policy if exists "can read items of accessible transactions" on transaction_items;
create policy "can read items of accessible transactions"
  on transaction_items for select
  using (transaction_id in (select id from transactions));

-- USER_SETTINGS
drop policy if exists "user can manage own settings" on user_settings;
create policy "user can manage own settings"
  on user_settings for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- AUDIT_LOG
drop policy if exists "owner can read audit log" on audit_log;
create policy "owner can read audit log"
  on audit_log for select
  using (store_id = get_my_store_id() and get_my_role() = 'owner');

-- ============================================
-- RPC: create_store_for_owner
-- ============================================
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
  if exists (select 1 from store_members where user_id = auth.uid()) then
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

-- ============================================
-- RPC: join_store_with_invite
-- ============================================
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
  if exists (select 1 from store_members where user_id = auth.uid()) then
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

-- ============================================
-- RPC: create_invite (saran tambahan — generate code server-side)
-- ============================================
create or replace function create_invite()
returns text
language plpgsql
security definer
as $$
declare
  v_store_id uuid;
  v_role member_role;
  v_code text;
begin
  select store_id, role into v_store_id, v_role
    from store_members where user_id = auth.uid()
    order by joined_at desc limit 1;

  if v_store_id is null or v_role != 'owner' then
    raise exception 'Hanya owner yang bisa membuat undangan';
  end if;

  -- Generate kode 8 karakter unik
  loop
    v_code := substr(md5(random()::text || clock_timestamp()::text), 1, 8);
    exit when not exists (select 1 from store_invites where code = v_code);
  end loop;

  insert into store_invites (store_id, code, created_by)
  values (v_store_id, v_code, auth.uid());

  return v_code;
end;
$$;

grant execute on function create_invite to authenticated;

-- ============================================
-- RPC: create_transaction (ATOMIC — inti dari atomicity)
-- ============================================
create or replace function create_transaction(
  p_items jsonb,
  p_metode_bayar payment_method,
  p_bayar numeric,
  p_diskon_persen numeric default 0
)
returns uuid
language plpgsql
security definer
as $$
declare
  v_store_id uuid;
  v_item jsonb;
  v_product record;
  v_subtotal numeric := 0;
  v_diskon_nominal numeric;
  v_total numeric;
  v_kembalian numeric;
  v_transaction_id uuid;
  v_nomor text;
  v_recent_count integer;
begin
  -- Lookup store
  select store_id into v_store_id from store_members where user_id = auth.uid();
  if v_store_id is null then
    raise exception 'User tidak tergabung di toko manapun';
  end if;

  -- Rate limit check (max 30 transactions per minute)
  select count(*) into v_recent_count
    from rate_limit_counter
    where user_id = auth.uid()
      and action_type = 'transaction'
      and created_at > now() - interval '1 minute';

  if v_recent_count >= 30 then
    raise exception 'Terlalu banyak transaksi. Coba lagi dalam 1 menit.';
  end if;

  -- Record rate limit hit
  insert into rate_limit_counter (user_id, action_type) values (auth.uid(), 'transaction');

  -- Validate items
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'Keranjang kosong';
  end if;

  if p_diskon_persen < 0 or p_diskon_persen > 100 then
    raise exception 'Diskon harus antara 0 dan 100 persen';
  end if;

  -- Lock & validate each product (prevents race condition on stock)
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    select * into v_product from products
      where id = (v_item->>'product_id')::uuid
        and store_id = v_store_id
        and deleted_at is null
      for update;

    if v_product is null then
      raise exception 'Produk tidak ditemukan: %', v_item->>'product_id';
    end if;

    if (v_item->>'qty')::integer <= 0 then
      raise exception 'Qty harus lebih dari 0 untuk produk %', v_product.nama;
    end if;

    if v_product.stok < (v_item->>'qty')::integer then
      raise exception 'Stok % tidak cukup (sisa %)', v_product.nama, v_product.stok;
    end if;

    v_subtotal := v_subtotal + (v_product.harga_jual * (v_item->>'qty')::integer);
  end loop;

  -- Calculate totals
  v_diskon_nominal := round(v_subtotal * p_diskon_persen / 100, 2);
  v_total := v_subtotal - v_diskon_nominal;

  if p_bayar < v_total then
    raise exception 'Pembayaran kurang dari total tagihan (total: %, bayar: %)', v_total, p_bayar;
  end if;

  v_kembalian := p_bayar - v_total;
  v_nomor := to_char(now(), 'YYYYMMDD') || '-' || lpad(nextval('transaksi_seq')::text, 5, '0');

  -- Insert transaction header
  insert into transactions (
    store_id, cashier_id, nomor_transaksi, subtotal,
    diskon_persen, diskon_nominal, pajak, total,
    metode_bayar, bayar, kembalian, status
  ) values (
    v_store_id, auth.uid(), v_nomor, v_subtotal,
    p_diskon_persen, v_diskon_nominal, 0, v_total,
    p_metode_bayar, p_bayar, v_kembalian, 'completed'
  ) returning id into v_transaction_id;

  -- Insert items & decrement stock
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    select * into v_product from products where id = (v_item->>'product_id')::uuid;

    insert into transaction_items (
      transaction_id, product_id, nama_produk, harga_satuan, qty, subtotal, catatan
    ) values (
      v_transaction_id, v_product.id, v_product.nama, v_product.harga_jual,
      (v_item->>'qty')::integer,
      v_product.harga_jual * (v_item->>'qty')::integer,
      v_item->>'catatan'
    );

    update products set stok = stok - (v_item->>'qty')::integer
      where id = v_product.id;
  end loop;

  -- Audit log
  insert into audit_log (store_id, user_id, action, table_name, record_id, new_data)
  values (v_store_id, auth.uid(), 'insert', 'transactions', v_transaction_id,
    jsonb_build_object('total', v_total, 'metode_bayar', p_metode_bayar::text, 'nomor', v_nomor));

  return v_transaction_id;
end;
$$;

grant execute on function create_transaction to authenticated;

-- ============================================
-- RPC: void_transaction
-- ============================================
create or replace function void_transaction(p_transaction_id uuid)
returns void
language plpgsql
security definer
as $$
declare
  v_store_id uuid;
  v_caller_store_id uuid;
  v_role member_role;
  v_item record;
  v_current_status transaction_status;
begin
  select store_id, status into v_store_id, v_current_status
    from transactions where id = p_transaction_id;

  if v_store_id is null then
    raise exception 'Transaksi tidak ditemukan';
  end if;

  select store_id, role into v_caller_store_id, v_role
    from store_members where user_id = auth.uid();

  if v_caller_store_id != v_store_id or v_role != 'owner' then
    raise exception 'Hanya owner yang boleh membatalkan transaksi';
  end if;

  if v_current_status = 'void' then
    raise exception 'Transaksi sudah dibatalkan sebelumnya';
  end if;

  -- Kembalikan stok
  for v_item in select * from transaction_items where transaction_id = p_transaction_id
  loop
    if v_item.product_id is not null then
      update products set stok = stok + v_item.qty where id = v_item.product_id;
    end if;
  end loop;

  update transactions set status = 'void' where id = p_transaction_id;

  -- Audit log
  insert into audit_log (store_id, user_id, action, table_name, record_id)
  values (v_store_id, auth.uid(), 'void', 'transactions', p_transaction_id);
end;
$$;

grant execute on function void_transaction to authenticated;

-- ============================================
-- AUDIT TRIGGER: products
-- ============================================
create or replace function audit_products_trigger()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into audit_log (store_id, user_id, action, table_name, record_id, old_data, new_data)
  values (
    coalesce(new.store_id, old.store_id),
    auth.uid(),
    lower(tg_op),
    'products',
    coalesce(new.id, old.id),
    case when tg_op != 'INSERT' then to_jsonb(old) else null end,
    case when tg_op != 'DELETE' then to_jsonb(new) else null end
  );
  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_audit_products on products;
create trigger trg_audit_products
  after insert or update or delete on products
  for each row execute function audit_products_trigger();

-- ============================================
-- CLEANUP: purge old rate_limit_counter rows (run periodically or via cron)
-- ============================================
create or replace function cleanup_rate_limit_counter()
returns void
language sql
security definer
as $$
  delete from rate_limit_counter where created_at < now() - interval '5 minutes';
$$;
