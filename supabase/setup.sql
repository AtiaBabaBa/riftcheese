-- Riftcheese: cloud saving setup.
-- Run once in Supabase → SQL Editor → New query → paste → Run. Safe to run again.

-- One row per account holding that account's decks, matches and settings.
create table if not exists public.prep_data (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.prep_data enable row level security;

-- Each signed-in account can only see and change its own row.
drop policy if exists "prep_data own select" on public.prep_data;
drop policy if exists "prep_data own insert" on public.prep_data;
drop policy if exists "prep_data own update" on public.prep_data;
drop policy if exists "prep_data own delete" on public.prep_data;
create policy "prep_data own select" on public.prep_data for select to authenticated using (auth.uid() = user_id);
create policy "prep_data own insert" on public.prep_data for insert to authenticated with check (auth.uid() = user_id);
create policy "prep_data own update" on public.prep_data for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "prep_data own delete" on public.prep_data for delete to authenticated using (auth.uid() = user_id);

-- Private bucket for screenshots and replay files, 20 MB per file.
insert into storage.buckets (id, name, public, file_size_limit)
values ('shots', 'shots', false, 20971520)
on conflict (id) do update set public = false, file_size_limit = 20971520;

-- Files live under <account id>/...; each account can only reach its own folder.
drop policy if exists "shots own select" on storage.objects;
drop policy if exists "shots own insert" on storage.objects;
drop policy if exists "shots own update" on storage.objects;
drop policy if exists "shots own delete" on storage.objects;
create policy "shots own select" on storage.objects for select to authenticated using (bucket_id = 'shots' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "shots own insert" on storage.objects for insert to authenticated with check (bucket_id = 'shots' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "shots own update" on storage.objects for update to authenticated using (bucket_id = 'shots' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "shots own delete" on storage.objects for delete to authenticated using (bucket_id = 'shots' and (storage.foldername(name))[1] = auth.uid()::text);

-- Screenshot reading (supabase/functions/read-shot): how many screenshots each account had read per day,
-- so the function can cap it. No policies: accounts reach it only through count_shot_read().
create table if not exists public.shot_reads (
  user_id uuid not null references auth.users (id) on delete cascade,
  day     date not null default current_date,
  n       integer not null default 0,
  primary key (user_id, day)
);
alter table public.shot_reads enable row level security;

-- Adds one read for the signed-in account and returns today's total.
create or replace function public.count_shot_read() returns integer
language sql security definer set search_path = public as $$
  insert into public.shot_reads (user_id, day, n) values (auth.uid(), current_date, 1)
  on conflict (user_id, day) do update set n = public.shot_reads.n + 1
  returning n;
$$;
revoke all on function public.count_shot_read() from public, anon;
grant execute on function public.count_shot_read() to authenticated;
