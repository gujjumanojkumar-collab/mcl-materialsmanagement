-- 01-setup.sql  MM machine and spares monitor: the shared table.
-- Paste ALL of this into the Supabase SQL Editor and press Run. Runs in one go.
-- One table holds every record. "kind" says what the row is:
--   machine, spare, fitted (spare fitted on a machine), order (purchase order),
--   setting (page settings: spare calculator, penalty terms, ABC cut-offs, domino links),
--   breakdown (a machine standing idle, with the cause).
-- "data" holds all the fields of the record. Rows are never deleted:
-- "Remove" on the page sets hidden = true.

create table if not exists public.mm_records (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  kind        text not null check (kind in ('machine', 'spare', 'fitted', 'order', 'setting', 'breakdown')),
  record_key  text not null default '',
  location    text not null default '',
  urgency     text not null default 'Medium' check (urgency in ('Low', 'Medium', 'High')),
  status      text not null default 'Open' check (status in ('Open', 'In progress', 'Resolved')),
  data        jsonb not null default '{}'::jsonb,
  hidden      boolean not null default false
);

create index if not exists mm_records_kind_idx on public.mm_records (kind, hidden);

alter table public.mm_records enable row level security;

drop policy if exists "mm_records read"   on public.mm_records;
drop policy if exists "mm_records add"    on public.mm_records;
drop policy if exists "mm_records change" on public.mm_records;

create policy "mm_records read"   on public.mm_records for select to anon, authenticated using (true);
create policy "mm_records add"    on public.mm_records for insert to anon, authenticated with check (true);
create policy "mm_records change" on public.mm_records for update to anon, authenticated using (true) with check (true);

grant select, insert, update on public.mm_records to anon, authenticated;
