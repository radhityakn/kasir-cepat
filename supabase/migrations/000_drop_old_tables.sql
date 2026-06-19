-- ============================================================
-- KASIR CEPAT — Drop semua tabel lama sebelum migration baru
-- Jalankan ini PERTAMA di Supabase SQL Editor, SEBELUM 001_security_hardening.sql
-- ============================================================

-- Drop star schema tables (dari percobaan sebelumnya)
drop table if exists public.fact_transaksi cascade;
drop table if exists public.dim_pembayaran cascade;
drop table if exists public.dim_waktu cascade;
drop table if exists public.dim_produk cascade;
drop table if exists public.dim_user cascade;
drop table if exists public.dim_toko cascade;

-- Drop rate limit counter (jika ada)
drop table if exists public.rate_limit_counter cascade;

-- Drop audit log (jika ada)
drop table if exists public.audit_log cascade;

-- Drop transaction tables
drop table if exists public.transaction_items cascade;
drop table if exists public.transactions cascade;

-- Drop product table
drop table if exists public.products cascade;

-- Drop store related tables
drop table if exists public.store_invites cascade;
drop table if exists public.store_members cascade;
drop table if exists public.stores cascade;

-- Drop user settings
drop table if exists public.user_settings cascade;

-- Drop old sequences
drop sequence if exists public.transaksi_seq;

-- Drop old enum types (jika ada dari percobaan sebelumnya)
drop type if exists public.member_role cascade;
drop type if exists public.payment_method cascade;
drop type if exists public.transaction_status cascade;

-- Drop old functions
drop function if exists public.get_my_store_id() cascade;
drop function if exists public.get_my_role() cascade;
drop function if exists public.create_store_for_owner(text, text, text, text) cascade;
drop function if exists public.join_store_with_invite(text, text) cascade;
drop function if exists public.create_invite() cascade;
drop function if exists public.create_transaction(jsonb, payment_method, numeric, numeric) cascade;
drop function if exists public.void_transaction(uuid) cascade;
drop function if exists public.set_updated_at() cascade;
drop function if exists public.audit_products_trigger() cascade;
drop function if exists public.cleanup_rate_limit_counter() cascade;
drop function if exists public.get_or_create_waktu(timestamptz) cascade;
drop function if exists public.sync_dim_toko() cascade;
drop function if exists public.sync_dim_user() cascade;
drop function if exists public.handle_dim_produk_updated_at() cascade;
drop function if exists public.handle_updated_at() cascade;

-- Done! Now run 001_security_hardening.sql
