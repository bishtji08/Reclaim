-- 001_create_users.sql
-- Initializes extensions, public.users table linked to auth.users via UUID, triggers and RLS

create schema if not exists extensions;
create extension if not exists postgis with schema extensions;
create extension if not exists pgcrypto with schema extensions;

set search_path = public, extensions;

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  name text not null check (char_length(name) between 2 and 100),
  role text not null default 'user' check (role in ('admin', 'finder', 'user')),
  phone text check (phone is null or char_length(phone) <= 32),
  avatar_url text,
  is_verified boolean not null default false,
  is_active boolean not null default true,
  auth_version integer not null default 0 check (auth_version >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists users_email_lower_key on public.users (lower(email));
create index if not exists users_role_idx on public.users (role);

-- Automatic synchronization triggers
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  user_name text;
  user_role text;
begin
  user_name := coalesce(
    nullif(trim(new.raw_user_meta_data->>'name'), ''),
    nullif(trim(new.raw_user_meta_data->>'full_name'), ''),
    split_part(coalesce(new.email, 'user@example.com'), '@', 1)
  );

  if length(user_name) < 2 then
    user_name := user_name || ' User';
  end if;

  user_role := coalesce(
    case
      when new.raw_app_meta_data->>'role' in ('admin', 'finder', 'user') then new.raw_app_meta_data->>'role'
      else null
    end,
    'user'
  );

  insert into public.users (id, email, name, role, phone, avatar_url, is_verified, is_active, created_at, updated_at)
  values (
    new.id,
    coalesce(new.email, ''),
    substring(user_name from 1 for 100),
    user_role,
    nullif(trim(new.raw_user_meta_data->>'phone'), ''),
    nullif(trim(new.raw_user_meta_data->>'avatar_url'), ''),
    coalesce(new.email_confirmed_at is not null, false),
    true,
    coalesce(new.created_at, now()),
    coalesce(new.updated_at, now())
  )
  on conflict (id) do update set
    email = excluded.email,
    is_verified = coalesce(new.email_confirmed_at is not null, public.users.is_verified),
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Secure role management trigger
create or replace function public.enforce_user_role_security()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (old.role is distinct from new.role) then
    if auth.uid() is not null then
      if not exists (
        select 1 from public.users
        where id = auth.uid() and role = 'admin' and is_active = true
      ) then
        raise exception 'Permission denied: only administrators can change user roles';
      end if;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists users_enforce_role_security on public.users;
create trigger users_enforce_role_security
  before update of role on public.users
  for each row execute function public.enforce_user_role_security();

create or replace function public.sync_role_to_auth()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (tg_op = 'UPDATE' and old.role is distinct from new.role) or (tg_op = 'INSERT') then
    update auth.users
    set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('role', new.role)
    where id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists users_sync_role_to_auth on public.users;
create trigger users_sync_role_to_auth
  after insert or update of role on public.users
  for each row execute function public.sync_role_to_auth();

alter table public.users enable row level security;

drop policy if exists "Users can view own profile or admins view all" on public.users;
create policy "Users can view own profile or admins view all"
  on public.users for select
  using (
    id = auth.uid() or exists (
      select 1 from public.users where id = auth.uid() and role in ('admin', 'finder')
    )
  );

drop policy if exists "Users can update own profile" on public.users;
create policy "Users can update own profile"
  on public.users for update
  using (id = auth.uid())
  with check (id = auth.uid());

drop policy if exists "Admins can manage all users" on public.users;
create policy "Admins can manage all users"
  on public.users for all
  using (exists (
    select 1 from public.users where id = auth.uid() and role = 'admin'
  ));
