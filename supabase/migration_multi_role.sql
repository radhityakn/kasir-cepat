-- ============================================================
-- KASIR CEPAT — Multi-Role / Multi-Kasir Migration
-- Jalankan di: Supabase Dashboard → SQL Editor → New Query
-- Name: multi_role_kasir
-- Description: Tabel stores, store_members, store_invites + update RLS
-- ============================================================

-- 1. Tabel Stores (toko)
create table if not exists public.stores (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text not null default '',
  phone text not null default '',
  owner_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_stores_owner on public.stores(owner_id);

-- 2. Tabel Store Members (relasi user ↔ store + role)
create table if not exists public.store_members (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'cashier' check (role in ('owner', 'cashier')),
  display_name text not null default '',
  joined_at timestamptz not null default now(),
  unique(store_id, user_id)
);

create index if not exists idx_store_members_user on public.store_members(user_id);
create index if not exists idx_store_members_store on public.store_members(store_id);

-- 3. Tabel Store Invites (undangan kasir)
create table if not exists public.store_invites (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  invite_code text not null unique default substr(md5(random()::text), 1, 8),
  email text, -- opsional: bisa invite via email spesifik atau kode umum
  role text not null default 'cashier' check (role in ('cashier')),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'expired')),
  invited_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '7 days')
);

create index if not exists idx_store_invites_code on public.store_invites(invite_code);
create index if not exists idx_store_invites_store on public.store_invites(store_id);

-- ============================================================
-- RLS untuk tabel baru
-- ============================================================

alter table public.stores enable row level security;
alter table public.store_members enable row level security;
alter table public.store_invites enable row level security;

-- Stores: user bisa lihat store yang dia jadi member
create policy "Members can view their store"
  on public.stores for select
  using (
    exists (
      select 1 from public.store_members sm
      where sm.store_id = id and sm.user_id = auth.uid()
    )
  );

create policy "Owner can insert store"
  on public.stores for insert
  with check (auth.uid() = owner_id);

create policy "Owner can update store"
  on public.stores for update
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create policy "Owner can delete store"
  on public.stores for delete
  using (auth.uid() = owner_id);

-- Store Members: bisa lihat members di store yang sama
create policy "Members can view store members"
  on public.store_members for select
  using (
    exists (
      select 1 from public.store_members my
      where my.store_id = store_members.store_id and my.user_id = auth.uid()
    )
  );

create policy "Owner can insert members"
  on public.store_members for insert
  with check (
    exists (
      select 1 from public.stores s
      where s.id = store_id and s.owner_id = auth.uid()
    )
    or user_id = auth.uid() -- user bisa insert diri sendiri saat join
  );

create policy "Owner can update members"
  on public.store_members for update
  using (
    exists (
      select 1 from public.stores s
      where s.id = store_id and s.owner_id = auth.uid()
    )
  );

create policy "Owner can delete members"
  on public.store_members for delete
  using (
    exists (
      select 1 from public.stores s
      where s.id = store_id and s.owner_id = auth.uid()
    )
  );

-- Store Invites: owner bisa CRUD, siapapun bisa lihat (untuk join via code)
create policy "Anyone can view invites by code"
  on public.store_invites for select
  using (true); -- invite code bersifat semi-public

create policy "Owner can insert invites"
  on public.store_invites for insert
  with check (
    exists (
      select 1 from public.stores s
      where s.id = store_id and s.owner_id = auth.uid()
    )
  );

create policy "Owner can update invites"
  on public.store_invites for update
  using (
    exists (
      select 1 from public.stores s
      where s.id = store_id and s.owner_id = auth.uid()
    )
    or auth.uid() is not null -- user yang join bisa update status
  );

create policy "Owner can delete invites"
  on public.store_invites for delete
  using (
    exists (
      select 1 from public.stores s
      where s.id = store_id and s.owner_id = auth.uid()
    )
  );

-- ============================================================
-- UPDATE RLS: products & transactions sekarang per-STORE, bukan per-user
-- ============================================================

-- Tambah kolom store_id ke products (nullable dulu untuk backward compat)
alter table public.products add column if not exists store_id uuid references public.stores(id) on delete cascade;
create index if not exists idx_products_store on public.products(store_id);

-- Tambah kolom store_id ke transactions
alter table public.transactions add column if not exists store_id uuid references public.stores(id) on delete cascade;
create index if not exists idx_transactions_store on public.transactions(store_id);

-- Drop old policies
drop policy if exists "Users can view own products" on public.products;
drop policy if exists "Users can insert own products" on public.products;
drop policy if exists "Users can update own products" on public.products;
drop policy if exists "Users can delete own products" on public.products;

drop policy if exists "Users can view own transactions" on public.transactions;
drop policy if exists "Users can insert own transactions" on public.transactions;
drop policy if exists "Users can update own transactions" on public.transactions;
drop policy if exists "Users can delete own transactions" on public.transactions;

-- New policies: berdasarkan store membership
create policy "Store members can view products"
  on public.products for select
  using (
    exists (
      select 1 from public.store_members sm
      where sm.store_id = products.store_id and sm.user_id = auth.uid()
    )
  );

create policy "Owner can insert products"
  on public.products for insert
  with check (
    exists (
      select 1 from public.store_members sm
      where sm.store_id = products.store_id and sm.user_id = auth.uid() and sm.role = 'owner'
    )
  );

create policy "Owner can update products"
  on public.products for update
  using (
    exists (
      select 1 from public.store_members sm
      where sm.store_id = products.store_id and sm.user_id = auth.uid() and sm.role = 'owner'
    )
  );

create policy "Owner can delete products"
  on public.products for delete
  using (
    exists (
      select 1 from public.store_members sm
      where sm.store_id = products.store_id and sm.user_id = auth.uid() and sm.role = 'owner'
    )
  );

-- Transactions: semua member bisa insert (kasir bisa transaksi), hanya owner bisa lihat semua
create policy "Store members can view transactions"
  on public.transactions for select
  using (
    exists (
      select 1 from public.store_members sm
      where sm.store_id = transactions.store_id and sm.user_id = auth.uid()
    )
  );

create policy "Store members can insert transactions"
  on public.transactions for insert
  with check (
    exists (
      select 1 from public.store_members sm
      where sm.store_id = transactions.store_id and sm.user_id = auth.uid()
    )
  );

create policy "Owner can update transactions"
  on public.transactions for update
  using (
    exists (
      select 1 from public.store_members sm
      where sm.store_id = transactions.store_id and sm.user_id = auth.uid() and sm.role = 'owner'
    )
  );

create policy "Owner can delete transactions"
  on public.transactions for delete
  using (
    exists (
      select 1 from public.store_members sm
      where sm.store_id = transactions.store_id and sm.user_id = auth.uid() and sm.role = 'owner'
    )
  );

-- Transaction items: akses via store membership (lewat transaction)
drop policy if exists "Users can view own transaction items" on public.transaction_items;
drop policy if exists "Users can insert own transaction items" on public.transaction_items;

create policy "Store members can view transaction items"
  on public.transaction_items for select
  using (
    exists (
      select 1 from public.transactions t
      join public.store_members sm on sm.store_id = t.store_id
      where t.id = transaction_items.transaction_id and sm.user_id = auth.uid()
    )
  );

create policy "Store members can insert transaction items"
  on public.transaction_items for insert
  with check (
    exists (
      select 1 from public.transactions t
      join public.store_members sm on sm.store_id = t.store_id
      where t.id = transaction_items.transaction_id and sm.user_id = auth.uid()
    )
  );

-- Auto-update timestamp untuk stores
create trigger set_stores_updated_at
  before update on public.stores
  for each row
  execute function public.handle_updated_at();
