-- Konta słuchaczy (#194): profil, zapisane trasy i historia opowieści, docs/17-konta.md.
-- Przeglądarka czyta i pisze te tabele sama (Supabase Auth + klucz anon), więc RLS
-- wpuszcza tylko właściciela wiersza (auth.uid()). Usunięcie konta kasuje wszystko kaskadą.

create table public.listener_profiles (
  user_id     uuid primary key references auth.users (id) on delete cascade,
  familiarity text,
  interests   text[] not null default '{}',
  story_style text,
  audience    text,
  context_ids text[] not null default '{}',  -- tło, które Sawa już wyjaśniła
  updated_at  timestamptz not null default now()
);

-- Zapisany plan przejażdżki: parametry zapytania do planera, żeby „Powtórz” liczyło ją od nowa
-- ze świeżymi odjazdami, i nazwy miejsc do listy „Moje trasy”.
create table public.saved_routes (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title       text not null,
  request     jsonb not null,               -- { origin, durationMin, rideEnd, travel }
  place_ids   text[] not null default '{}',
  place_names text[] not null default '{}',
  total_min   integer not null,
  created_at  timestamptz not null default now()
);

create index saved_routes_user_created_idx on public.saved_routes (user_id, created_at desc);

-- Wysłuchane opowieści: które fakty o którym miejscu i kiedy. Bez FK do places, bo reseed
-- miejsc nie może kasować historii słuchacza.
create table public.visits (
  id          bigint generated always as identity primary key,
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  place_id    text not null,
  place_name  text,
  fact_ids    text[] not null default '{}',
  context_ids text[] not null default '{}',
  heard_at    timestamptz not null default now()
);

create index visits_user_heard_idx on public.visits (user_id, heard_at desc);

alter table public.listener_profiles enable row level security;
alter table public.saved_routes enable row level security;
alter table public.visits enable row level security;

create policy "own profile" on public.listener_profiles
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "own routes" on public.saved_routes
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "own visits" on public.visits
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

revoke all on public.listener_profiles, public.saved_routes, public.visits from anon;
grant select, insert, update, delete on public.listener_profiles, public.saved_routes, public.visits
  to authenticated;

-- RODO: słuchacz sam usuwa konto. Klucz anon nie może kasować z auth.users, więc robi to ta
-- funkcja, zawsze tylko dla zalogowanego; profil, trasy i historia znikają kaskadą.
create function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'not signed in';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
