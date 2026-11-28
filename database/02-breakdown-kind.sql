-- 02-breakdown-kind.sql  Lets the table hold breakdown-log rows (kind = 'breakdown').
-- Only needed if 01-setup.sql was run BEFORE this file existed. Safe to run more than once.
-- Paste ALL of this into the Supabase SQL Editor and press Run. No data is removed.
alter table public.mm_records drop constraint if exists mm_records_kind_check;
alter table public.mm_records add constraint mm_records_kind_check
  check (kind in ('machine', 'spare', 'fitted', 'order', 'setting', 'breakdown'));
