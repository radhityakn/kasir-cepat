-- ============================================================
-- KASIR CEPAT — Supabase Migration
-- Jalankan di: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- 1. Tabel Products
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  barcode text not null,
  name text not null,
  price bigint not null default 0,
  cost_price bigint not null default 0,
  category text not null default 'Lainnya',
  image text not null default '🍳',
  stock integer not null default 0,
  sold integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Index untuk performa
create index if not exists idx_products_user_id on public.products(user_id);
create unique index if not exists idx_products_barcode_user on public.products(user_id, barcode);

-- 2. Tabel Transactions
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  total bigint not null default 0,
  discount bigint not null default 0,
  tax bigint not null default 0,
  grand_total bigint not null default 0,
  payment_method text not null default 'cash',
  amount_paid bigint not null default 0,
  change bigint not null default 0,
  cashier text not null default '',
  customer text,
  status text not null default 'completed',
  created_at timestamptz not null default now()
);

create index if not exists idx_transactions_user_id on public.transactions(user_id);
create index if not exists idx_transactions_created_at on public.transactions(user_id, created_at desc);

-- 3. Tabel Transaction Items
create table if not exists public.transaction_items (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null references public.transactions(id) on delete cascade,
  product_id uuid not null,
  product_name text not null,
  product_image text not null default '🍳',
  product_price bigint not null default 0,
  product_cost_price bigint not null default 0,
  quantity integer not null default 1,
  notes text
);

create index if not exists idx_transaction_items_tx on public.transaction_items(transaction_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

-- Enable RLS
alter table public.products enable row level security;
alter table public.transactions enable row level security;
alter table public.transaction_items enable row level security;

-- Products: user hanya bisa CRUD miliknya sendiri
create policy "Users can view own products"
  on public.products for select
  using (auth.uid() = user_id);

create policy "Users can insert own products"
  on public.products for insert
  with check (auth.uid() = user_id);

create policy "Users can update own products"
  on public.products for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own products"
  on public.products for delete
  using (auth.uid() = user_id);

-- Transactions: user hanya bisa CRUD miliknya sendiri
create policy "Users can view own transactions"
  on public.transactions for select
  using (auth.uid() = user_id);

create policy "Users can insert own transactions"
  on public.transactions for insert
  with check (auth.uid() = user_id);

create policy "Users can update own transactions"
  on public.transactions for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own transactions"
  on public.transactions for delete
  using (auth.uid() = user_id);

-- Transaction Items: akses via join — user bisa lihat items dari transaksi miliknya
create policy "Users can view own transaction items"
  on public.transaction_items for select
  using (
    exists (
      select 1 from public.transactions t
      where t.id = transaction_id and t.user_id = auth.uid()
    )
  );

create policy "Users can insert own transaction items"
  on public.transaction_items for insert
  with check (
    exists (
      select 1 from public.transactions t
      where t.id = transaction_id and t.user_id = auth.uid()
    )
  );

-- ============================================================
-- AUTO-UPDATE updated_at
-- ============================================================

create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_updated_at
  before update on public.products
  for each row
  execute function public.handle_updated_at();
