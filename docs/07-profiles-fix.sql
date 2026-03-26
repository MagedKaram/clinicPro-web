-- Clinic Queue — Profiles Fix (Phase 3.1)
-- Run this on your Supabase project SQL editor.
-- Adds a public.profiles table that auto-fills from auth.users on signup.
-- This ensures emails are persisted in the public schema and accessible via RLS.

begin;

-- 1) Profiles table (mirrors auth.users email safely in public schema)
create table if not exists public.profiles (
  id   uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  created_at timestamptz not null default now()
);

-- 2) RLS on profiles
alter table public.profiles enable row level security;

-- User can only read their own profile
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename  = 'profiles'
      and policyname = 'profiles_select_self'
  ) then
    execute $policy$
      create policy profiles_select_self
      on public.profiles
      for select
      to authenticated
      using (id = auth.uid());
    $policy$;
  end if;
end $$;

-- 3) Trigger: auto-insert profile when a new user confirms & signs in
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do update set email = excluded.email;
  return new;
end $$;

-- Fire on INSERT into auth.users (runs after email confirmation too)
do $$
begin
  if not exists (
    select 1 from pg_trigger
    where tgname = 'on_auth_user_created'
  ) then
    create trigger on_auth_user_created
    after insert on auth.users
    for each row execute function public.handle_new_user();
  end if;
end $$;

-- 4) Backfill existing auth users (safe, ignores conflicts)
insert into public.profiles (id, email)
select id, email from auth.users
on conflict (id) do update set email = excluded.email;

-- 5) Grant
grant usage on schema public to authenticated;
grant select on table public.profiles to authenticated;

commit;

-- NOTES:
-- After running this, every new signup will auto-create a profiles row.
-- The trigger fires on INSERT into auth.users, which happens when:
--   a) Email confirmation is disabled (instant)
--   b) Email confirmation is enabled (fires immediately on signup, BEFORE confirmation)
-- The email in profiles is updated if the user changes their email later.
